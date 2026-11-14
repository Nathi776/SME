"""
services/scoring_service.py

Updated to use the Assessment Engine as the primary scoring path.
The legacy calculate_score() path is preserved for backward compatibility
but assess() is now the authoritative entry point.
"""
from __future__ import annotations
import logging
from datetime import datetime, timezone
from sqlalchemy.orm import Session

from models.invoice import Invoice
from models.verification import Verification
from models.sme import SME
from models.founder_profile import FounderProfile
from core.scoring import EvidencePackage, FounderSignalInput, INTENT_BASE_POINTS
from core.assessment_engine import AssessmentResult, assess, revenue_evidence_source

from services.assessment_snapshot_service import create_assessment_snapshot
from services.business_observation_service import create_current_business_observation
from services.market_data_service import market_data_summary, normalize_industry
from services.evidence_records import EVIDENCE_SCHEMA_VERSION, EvidenceConfig, build_evidence_records
from services.evidence_selection import evidence_timestamps, select_bank_statement_evidence, sort_verifications

logger = logging.getLogger(__name__)

def build_evidence_package(sme: SME, db: Session) -> EvidencePackage:
    """
    Pull all signals for an SME from the database and return an EvidencePackage.
    """
    # ── Invoice signals ───────────────────────────────────────────────────────
    invoices = db.query(Invoice).filter(Invoice.sme_id == sme.id).all()
    total_invoices  = len(invoices)
    unpaid_invoices = sum(1 for i in invoices if i.status != "paid")
    paid_on_time = 0

    for invoice in invoices:
        if (
            (invoice.status or "").lower() == "paid"
            and invoice.paid_at is not None
            and invoice.due_date is not None
        ):
            paid_at = invoice.paid_at
            due_date = invoice.due_date

            if paid_at.tzinfo is None:
                paid_at = paid_at.replace(tzinfo=timezone.utc)

            if due_date.tzinfo is None:
                due_date = due_date.replace(tzinfo=timezone.utc)

            if paid_at <= due_date:
                paid_on_time += 1

    # ── Verification signals ──────────────────────────────────────────────────
    verifications = (
        db.query(Verification)
        .filter(Verification.sme_id == sme.id)
        .all()
    )

    verifications_sorted = sort_verifications(verifications)

    ver_map: dict[str, str] = {}
    for v in verifications_sorted:
        ver_map[v.doc_type] = v.status

    bank_evidence = select_bank_statement_evidence(verifications)
    bank_statement_verification = bank_evidence.approved
    bank_statement_approved = bank_statement_verification is not None

    # The engine reads verifications["bank_statement"] to award compliance
    # points, infer the stage and label revenue. It must describe the
    # statement whose metrics are in use, not a newer unreviewed upload.
    if bank_statement_approved:
        ver_map["bank_statement"] = "approved"

    # ── Intent document details ───────────────────────────────────────────────
    intent_doc_details: dict[str, dict] = {}
    for doc_type in INTENT_BASE_POINTS:
        matching = [v for v in verifications if v.doc_type == doc_type]
        if matching:
            latest = sorted(matching, key=lambda x: x.submitted_at)[-1]
            intent_doc_details[doc_type] = {
                "status":                latest.status,
                "loi_counterparty_known": latest.loi_counterparty_known,
            }

    # ── Revenue ───────────────────────────────────────────────────────────────
    
    # Revenue
    # Use parsed revenue only from the latest approved bank statement.
    if (
        bank_statement_approved
        and bank_statement_verification.bs_parsed_revenue is not None
    ):
        revenue = float(bank_statement_verification.bs_parsed_revenue)
    else:
        revenue = float(sme.revenue or 0)

    # Bank statement signals
    # Never use legacy SME metrics as authoritative evidence.
    if bank_statement_approved:
        overdraft_count = (
            int(bank_statement_verification.bs_overdraft_count)
            if bank_statement_verification.bs_overdraft_count is not None
            else None
        )

        income_regularity = (
            float(bank_statement_verification.bs_income_regularity)
            if bank_statement_verification.bs_income_regularity is not None
            else None
        )

        months_analysed = (
            int(bank_statement_verification.bs_months_analysed)
            if bank_statement_verification.bs_months_analysed is not None
            else None
        )
    else:
        overdraft_count = None
        income_regularity = None
        months_analysed = None


    # ── Founder signals ───────────────────────────────────────────────────────
    fp = db.query(FounderProfile).filter(FounderProfile.sme_id == sme.id).first()
    founder = None
    if fp is not None:
        founder = FounderSignalInput(
            years_industry_experience = fp.years_industry_experience,
            highest_qualification     = fp.highest_qualification,
            prior_business_owner      = fp.prior_business_owner,
            trade_association_member  = fp.trade_association_member,
            reference_provided        = bool(fp.reference_name) if fp.reference_name else None,
        )

    return EvidencePackage(
        revenue=revenue,
        years_active=int(sme.years_active or 0),
        industry=normalize_industry(sme.industry),
        total_invoices=total_invoices,
        paid_on_time=paid_on_time,
        unpaid_invoices=unpaid_invoices,
        verifications=ver_map,
        intent_doc_details=intent_doc_details,
        overdraft_count=overdraft_count,
        income_regularity=income_regularity,
        months_analysed=months_analysed,
        bank_statement_verification_id=bank_evidence.verification_id,
        bank_statement_newer_pending=bank_evidence.newer_unreviewed,
        province=sme.province or None,
        founder=founder,
    )


# Backward compatibility alias
build_scoring_input = build_evidence_package


def scores_summary(result) -> dict:
    """The three distinct outputs, named for what they measure."""
    return {
        "viability_score": result.viability_score,
        "funding_readiness_score": result.funding_readiness_score,
        "evidence_confidence": result.evidence_confidence,
    }


def score_sme(sme: SME, db: Session) -> AssessmentResult:
    """
    Calculate and persist a point-in-time assessment event.
    """
    result, _, _ = create_assessment_for_sme(sme, db)
    return result


def calculate_assessment(
    sme: SME,
    db: Session,
) -> tuple[AssessmentResult, EvidencePackage]:
    """
    Calculate an assessment and return the evidence used by the engine.
    """
    inp = build_evidence_package(sme, db)
    result = assess(inp)
    return result, inp


def _build_assessment_snapshot_data(inp, result: AssessmentResult) -> dict:
    input_snapshot = {
        "revenue": inp.revenue,
        # Declared vs verified: lets reviewers see what the revenue figure rests on.
        # Derived from the same rule the Revenue Tier factor uses, so snapshot and breakdown always agree.
        "revenue_source": (
            "verified_bank_statement"
            if revenue_evidence_source(inp) == "parsed"
            else "declared"
        ),
        "years_active": inp.years_active,
        "industry": inp.industry,
        "total_invoices": inp.total_invoices,
        "paid_on_time": inp.paid_on_time,
        "unpaid_invoices": inp.unpaid_invoices,
        "verifications": dict(inp.verifications),
        "intent_doc_details": dict(inp.intent_doc_details),
        "overdraft_count": inp.overdraft_count,
        "income_regularity": inp.income_regularity,
        "months_analysed": inp.months_analysed,
        # Provenance: the verification record the bank signals came from.
        "bank_statement_verification_id": inp.bank_statement_verification_id,
        "bank_statement_newer_pending": inp.bank_statement_newer_pending,
        "province": inp.province,
    }

    if inp.founder is not None:
        input_snapshot["founder"] = {
            "years_industry_experience": inp.founder.years_industry_experience,
            "highest_qualification": inp.founder.highest_qualification,
            "prior_business_owner": inp.founder.prior_business_owner,
            "trade_association_member": inp.founder.trade_association_member,
            "reference_provided": inp.founder.reference_provided,
        }
    else:
        input_snapshot["founder"] = None

    return {
        "input_snapshot": input_snapshot,
        "market_context": {
            "industry": result.breakdown.get("Industry Risk"),
            "market": result.breakdown.get("Market Viability"),
            # Which market tables produced the two factors above.
            "market_data": market_data_summary(),
        },
    }


def _stored_evidence_block(sme, inp, result: AssessmentResult, verifications, bank_evidence) -> dict:
    """
    Per-factor evidence records for the snapshot (docs/EVIDENCE_RECORD_DESIGN.md). Informational: no
    score reads it, and a failure here must NEVER block or change an assessment, so errors are recorded
    in the block instead of raised. The rules version and settings used are stored with the records, so
    a stored record can always be traced to the provisional bands that produced it.
    """
    cfg = EvidenceConfig()
    block = {
        "schema_version": EVIDENCE_SCHEMA_VERSION,
        "config_version": cfg.version,
        "config": {
            "revenue_conflict_tolerance": cfg.revenue_conflict_tolerance,
            "stale_after_days": cfg.stale_after_days,
            "bands": {c.value: b.value for c, b in cfg.bands.items()},
        },
        "built_at": datetime.now(timezone.utc).isoformat(),
    }
    try:
        block["records"] = build_evidence_records(
            inp, result.breakdown, verifications, bank_evidence, config=cfg,
            as_of=datetime.now(timezone.utc),
            declared_revenue=float(sme.revenue) if sme.revenue is not None else None,
            # Not available until the extractor and transaction review are wired in; stated, not guessed.
            extraction_reconciled=None, transactions_reviewed=None)
    except Exception as exc:  # noqa: BLE001 - never let evidence description break an assessment
        logger.warning("evidence record build failed for sme %s", getattr(sme, "id", None), exc_info=True)
        block["records"] = None
        block["error"] = f"{type(exc).__name__}: {exc}"[:200]
    return block


def create_assessment_for_sme(
    sme: SME,
    db: Session,
) -> tuple[AssessmentResult, int, int]:
    """
    Create one observation and one assessment snapshot for the same event.

    Returns the assessment result, observation ID, and snapshot ID.
    """
    observation = create_current_business_observation(
        db=db,
        sme=sme,
        source="assessment",
    )

    result, inp = calculate_assessment(sme, db)
    snapshot_data = _build_assessment_snapshot_data(inp, result)
    # When the evidence was submitted and reviewed (audit F5). Informational only; no score uses it.
    sme_verifications = db.query(Verification).filter(Verification.sme_id == sme.id).all()
    bank_evidence = select_bank_statement_evidence(sme_verifications)
    snapshot_data["input_snapshot"]["evidence_timestamps"] = evidence_timestamps(
        sme_verifications, bank_evidence)
    snapshot_data["input_snapshot"]["evidence"] = _stored_evidence_block(
        sme, inp, result, sme_verifications, bank_evidence)

    snapshot = create_assessment_snapshot(
        db=db,
        sme_id=sme.id,
        business_observation_id=observation.id,
        profile=result.profile.value,
        score=result.score,
        decision=result.decision,
        strategy_version=result.strategy_version,
        inference_version=result.inference_version,
        evidence_depth=result.confidence_score,
        viability_score=result.viability_score,
        input_snapshot=snapshot_data["input_snapshot"],
        factor_breakdown=result.breakdown,
        market_context=snapshot_data["market_context"],
        recommendations=None,
    )

    result.assessment_snapshot_id = snapshot.id
    return result, observation.id, snapshot.id
