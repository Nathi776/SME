"""
services/scoring_service.py — DB adapter for the scoring engine.

Changes in this version:
- build_scoring_input now reads bs_parsed_revenue, bs_overdraft_count,
  and bs_income_regularity from the SME record when available.
- Self-reported revenue is used only as a fallback when no bank statement
  has been parsed yet.
"""

from __future__ import annotations

from datetime import datetime, timezone
from sqlalchemy.orm import Session

from models.invoice import Invoice
from models.verification import Verification
from models.sme import SME
from core.scoring import ScoringInput, ScoringResult, calculate_score


def build_scoring_input(sme: SME, db: Session) -> ScoringInput:
    """
    Pull all signals for an SME from the database and return a ScoringInput.
    """
    # ── Invoice signals ───────────────────────────────────────────────────────
    invoices: list[Invoice] = (
        db.query(Invoice).filter(Invoice.sme_id == sme.id).all()
    )
    total_invoices  = len(invoices)
    unpaid_invoices = sum(1 for inv in invoices if inv.status != "paid")
    paid_on_time    = sum(
        1
        for inv in invoices
        if inv.status == "paid"
        and inv.due_date is not None
        and inv.due_date.replace(tzinfo=timezone.utc)
            >= inv.created_at.replace(tzinfo=timezone.utc)
    )

    # ── Verification signals ──────────────────────────────────────────────────
    verifications: list[Verification] = (
        db.query(Verification)
        .filter(Verification.sme_id == sme.id)
        .all()
    )
    # Latest status per doc_type (handles resubmissions)
    ver_map: dict[str, str] = {}
    for v in sorted(verifications, key=lambda x: x.submitted_at):
        ver_map[v.doc_type] = v.status

    # ── Revenue: parsed > self-reported ──────────────────────────────────────
    # If a bank statement has been successfully parsed, use that revenue figure.
    # It reflects actual cashflow, not what the SME typed at registration.
    if sme.bs_parsed_revenue is not None:
        revenue = float(sme.bs_parsed_revenue)
    else:
        revenue = float(sme.revenue or 0)

    # ── Bank statement bonus signals ──────────────────────────────────────────
    overdraft_count    = int(sme.bs_overdraft_count)    if sme.bs_overdraft_count    is not None else None
    income_regularity  = float(sme.bs_income_regularity) if sme.bs_income_regularity  is not None else None
    months_analysed    = int(sme.bs_months_analysed)    if sme.bs_months_analysed    is not None else None

    return ScoringInput(
        revenue=revenue,
        years_active=int(sme.years_active or 0),
        industry=sme.industry or "Other",
        total_invoices=total_invoices,
        paid_on_time=paid_on_time,
        unpaid_invoices=unpaid_invoices,
        verifications=ver_map,
        # Bank statement bonus fields (None when not yet parsed)
        overdraft_count=overdraft_count,
        income_regularity=income_regularity,
        months_analysed=months_analysed,
    )


def score_sme(sme: SME, db: Session) -> ScoringResult:
    """Entry point for the router. Returns a full ScoringResult."""
    inp = build_scoring_input(sme, db)
    return calculate_score(inp)
