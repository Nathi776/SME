"""
services/scoring_service.py — DB adapter. Track B update.

Change: builds FounderSignalInput from the FounderProfile record
when it exists, passes None otherwise (engine handles gracefully).
"""
from __future__ import annotations
from datetime import datetime, timezone
from sqlalchemy.orm import Session

from models.invoice import Invoice
from models.verification import Verification
from models.sme import SME
from models.founder_profile import FounderProfile
from core.scoring import (
    ScoringInput, ScoringResult, FounderSignalInput,
    calculate_score, INTENT_BASE_POINTS,
)


def build_scoring_input(sme: SME, db: Session) -> ScoringInput:
    # ── Invoice signals ───────────────────────────────────────────────────────
    invoices = db.query(Invoice).filter(Invoice.sme_id == sme.id).all()
    total_invoices  = len(invoices)
    unpaid_invoices = sum(1 for i in invoices if i.status != "paid")
    paid_on_time    = sum(
        1 for i in invoices
        if i.status == "paid" and i.due_date is not None
        and i.due_date.replace(tzinfo=timezone.utc)
            >= i.created_at.replace(tzinfo=timezone.utc)
    )

    # ── Verification signals ──────────────────────────────────────────────────
    verifications = db.query(Verification).filter(Verification.sme_id == sme.id).all()
    ver_map: dict[str, str] = {}
    for v in sorted(verifications, key=lambda x: x.submitted_at):
        ver_map[v.doc_type] = v.status

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

    # ── Revenue: parsed > self-reported ──────────────────────────────────────
    revenue = float(sme.bs_parsed_revenue) if sme.bs_parsed_revenue is not None \
              else float(sme.revenue or 0)

    # ── Bank statement signals ────────────────────────────────────────────────
    overdraft_count   = int(sme.bs_overdraft_count)     if sme.bs_overdraft_count   is not None else None
    income_regularity = float(sme.bs_income_regularity) if sme.bs_income_regularity is not None else None
    months_analysed   = int(sme.bs_months_analysed)     if sme.bs_months_analysed   is not None else None

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

    return ScoringInput(
        revenue=revenue,
        years_active=int(sme.years_active or 0),
        industry=sme.industry or "Other",
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


def score_sme(sme: SME, db: Session) -> ScoringResult:
    return calculate_score(build_scoring_input(sme, db))
