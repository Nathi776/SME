"""
services/scoring_service.py

Updated to use the Assessment Engine as the primary scoring path.
The legacy calculate_score() path is preserved for backward compatibility
but assess() is now the authoritative entry point.
"""
from __future__ import annotations
from datetime import datetime, timezone
from sqlalchemy.orm import Session

from models.invoice import Invoice
from models.verification import Verification
from models.sme import SME
from models.founder_profile import FounderProfile
from core.scoring import EvidencePackage, FounderSignalInput, INTENT_BASE_POINTS
from core.assessment_engine import AssessmentResult, assess

from services.assessment_snapshot_service import create_assessment_snapshot
from services.business_observation_service import create_current_business_observation
from services.market_data_service import normalize_industry

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

    def _verification_sort_key(v: Verification):
        return (v.submitted_at is not None, v.submitted_at, v.id or 0)

    verifications_sorted = sorted(verifications, key=_verification_sort_key)

    ver_map: dict[str, str] = {}
    for v in verifications_sorted:
        ver_map[v.doc_type] = v.status

    bank_statement_verification = next(
        (
            v for v in reversed(verifications_sorted)
            if v.doc_type == "bank_statement"
        ),
        None,
    )

    bank_statement_approved = (
        bank_statement_verification is not None
        and bank_statement_verification.status == "approved"
    )

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
        province=sme.province or None,
        founder=founder,
    )


# Backward compatibility alias
build_scoring_input = build_evidence_package


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
        },
    }


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
        input_snapshot=snapshot_data["input_snapshot"],
        factor_breakdown=result.breakdown,
        market_context=snapshot_data["market_context"],
        recommendations=None,
    )

    result.assessment_snapshot_id = snapshot.id
    return result, observation.id, snapshot.id
