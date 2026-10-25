"""
services/business_observation_service.py

Creates timestamped observations of an SME's business state.

BusinessObservation is deliberately separate from:
- AssessmentSnapshot: what the assessment engine believed at a point in time
- SmeOutcome: what happened after a funded finance request

This service records the observable business state itself.
"""

from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy.orm import Session

from models.business_observation import BusinessObservation
from models.invoice import Invoice
from models.sme import SME
from models.verification import Verification
from services.evidence_selection import select_bank_statement_evidence


def _as_float(value):
    """
    Convert SQLAlchemy Decimal/Numeric values into JSON-safe floats.
    Preserve None as None.
    """
    if value is None:
        return None

    if isinstance(value, Decimal):
        return float(value)

    return float(value)


def build_current_observation_data(
    sme: SME,
    db: Session,
) -> dict:
    """
    Build an observation payload from the SME's current database state.

    This function does not write anything to the database.
    """

    invoices = (
        db.query(Invoice)
        .filter(Invoice.sme_id == sme.id)
        .all()
    )

    total_invoices = len(invoices)

    unpaid_invoices = sum(
        1
        for invoice in invoices
        if (invoice.status or "").lower() != "paid"
    )

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

    
    # Retrieve bank-statement evidence for this SME.
    verifications = (
        db.query(Verification)
        .filter(Verification.sme_id == sme.id)
        .all()
    )

    # Same selection rule as scoring (services/evidence_selection.py).
    bank_evidence = select_bank_statement_evidence(verifications)
    bank = bank_evidence.approved

    # Never use legacy SME bank-statement metrics as authoritative data.
    observed_revenue = (
        bank.bs_parsed_revenue
        if bank is not None and bank.bs_parsed_revenue is not None
        else sme.revenue
    )


    return {
        "years_active": sme.years_active,
        "revenue": _as_float(observed_revenue),

        "avg_monthly_balance": _as_float(
            bank.bs_avg_monthly_balance if bank is not None else None
        ),
        "avg_monthly_income": _as_float(
            bank.bs_avg_monthly_income if bank is not None else None
        ),
        "avg_monthly_expenses": _as_float(
            bank.bs_avg_monthly_expenses if bank is not None else None
        ),

        "total_invoices": total_invoices,
        "paid_on_time": paid_on_time,
        "unpaid_invoices": unpaid_invoices,

        
        "overdraft_count": (
            bank.bs_overdraft_count if bank is not None else None
        ),
        "income_regularity": _as_float(
            bank.bs_income_regularity if bank is not None else None
        ),
        "months_analysed": (
            bank.bs_months_analysed if bank is not None else None
        ),
        "parsed_revenue": _as_float(
            bank.bs_parsed_revenue if bank is not None else None
        ),


        "bank_statement_verification_id": bank_evidence.verification_id,

        "industry": sme.industry,
        "province": sme.province,
        "business_city": sme.business_city,
    }


def create_current_business_observation(
    db: Session,
    sme: SME,
    *,
    source: str = "system",
    still_operating: bool | None = None,
    additional_data: dict | None = None,
) -> BusinessObservation:
    """
    Create and persist a timestamped observation of the SME's
    current business state.

    The state is read from the current SME/invoice records at the
    time this function is called.
    """

    data = build_current_observation_data(sme, db)

    observation = BusinessObservation(
        sme_id=sme.id,
        observed_at=datetime.now(timezone.utc),
        source=source,

        still_operating=still_operating,
        years_active=data["years_active"],

        revenue=data["revenue"],
        avg_monthly_balance=data["avg_monthly_balance"],
        avg_monthly_income=data["avg_monthly_income"],
        avg_monthly_expenses=data["avg_monthly_expenses"],

        total_invoices=data["total_invoices"],
        paid_on_time=data["paid_on_time"],
        unpaid_invoices=data["unpaid_invoices"],

        overdraft_count=data["overdraft_count"],
        income_regularity=data["income_regularity"],
        months_analysed=data["months_analysed"],
        parsed_revenue=data["parsed_revenue"],
        bank_statement_verification_id=data["bank_statement_verification_id"],

        industry=data["industry"],
        province=data["province"],
        business_city=data["business_city"],

        additional_data=additional_data,
    )

    db.add(observation)
    db.commit()
    db.refresh(observation)

    return observation


def get_business_observations(
    db: Session,
    sme_id: int,
) -> list[BusinessObservation]:
    """
    Return all observations for an SME in chronological order.
    """

    return (
        db.query(BusinessObservation)
        .filter(BusinessObservation.sme_id == sme_id)
        .order_by(BusinessObservation.observed_at.asc())
        .all()
    )


def get_latest_business_observation(
    db: Session,
    sme_id: int,
) -> BusinessObservation | None:
    """
    Return the most recent observation for an SME.
    """

    return (
        db.query(BusinessObservation)
        .filter(BusinessObservation.sme_id == sme_id)
        .order_by(BusinessObservation.observed_at.desc())
        .first()
    )