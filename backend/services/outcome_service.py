from decimal import Decimal
from datetime import datetime
from sqlalchemy.orm import Session
from models.sme_outcome import SmeOutcome
from models.finance_request import FinanceRequest
from models.sme import SME
from services.scoring_service import score_sme
from services.recommendations_service import generate_plan


def create_outcome(db: Session, finance_request_id: int) -> SmeOutcome:
    """
    Snapshots the credit score and outstanding recommendations at the moment
    of funding and creates an SmeOutcome record.
    """
    # 1. Retrieve the finance request
    req = db.query(FinanceRequest).filter(FinanceRequest.id == finance_request_id).first()
    if not req:
        raise ValueError("Finance request not found")

    # 2. Retrieve the SME and compute score and plan
    sme = req.sme
    if not sme:
        raise ValueError("SME not found for the finance request")

    score_res = score_sme(sme, db)
    plan = generate_plan(score_res.breakdown, score_res.score)

    # 3. Build outstanding recommendations list for snapshotting
    outstanding = []
    for r in plan.recommendations:
        outstanding.append({
            "category": r.category,
            "action": r.action,
            "reason": r.reason,
            "impact_pts": float(r.impact_pts),
            "impact_score": float(r.impact_score),
            "difficulty": r.difficulty,
            "time_estimate": r.time_estimate,
            "doc_type": r.doc_type,
            "priority": int(r.priority),
        })

    # 4. Create and save SmeOutcome
    outcome = SmeOutcome(
        finance_request_id=finance_request_id,
        sme_id=sme.id,
        score_at_funding=float(score_res.score),
        amount=req.approved_amount or req.amount_requested,
        outstanding_recommendations=outstanding,
    )

    db.add(outcome)
    db.commit()
    db.refresh(outcome)
    return outcome


def update_checkin(
    db: Session,
    outcome_id: int,
    interval: int,
    still_operating: bool,
    revenue: Decimal | float,
    loan_repaid: bool,
) -> SmeOutcome:
    """
    Updates the operational and repayment status at a given interval (90, 180, 365).
    """
    outcome = db.query(SmeOutcome).filter(SmeOutcome.id == outcome_id).first()
    if not outcome:
        raise ValueError("Outcome record not found")

    if interval == 90:
        outcome.checkin_90_completed = True
        outcome.checkin_90_date = datetime.utcnow()
        outcome.checkin_90_still_operating = still_operating
        outcome.checkin_90_revenue = Decimal(str(revenue))
        outcome.checkin_90_loan_repaid = loan_repaid
    elif interval == 180:
        outcome.checkin_180_completed = True
        outcome.checkin_180_date = datetime.utcnow()
        outcome.checkin_180_still_operating = still_operating
        outcome.checkin_180_revenue = Decimal(str(revenue))
        outcome.checkin_180_loan_repaid = loan_repaid
    elif interval == 365:
        outcome.checkin_365_completed = True
        outcome.checkin_365_date = datetime.utcnow()
        outcome.checkin_365_still_operating = still_operating
        outcome.checkin_365_revenue = Decimal(str(revenue))
        outcome.checkin_365_loan_repaid = loan_repaid
    else:
        raise ValueError("Invalid check-in interval. Must be 90, 180, or 365")

    db.commit()
    db.refresh(outcome)
    return outcome


def compute_followed_recommendations(db: Session, outcome: SmeOutcome) -> list[dict]:
    """
    Computes which of the snapshot outstanding recommendations have since been
    completed by checking the SME's current outstanding recommendations.
    """
    sme = outcome.sme
    if not sme:
        return []

    # Recalculate current score and plan dynamically
    score_res = score_sme(sme, db)
    current_plan = generate_plan(score_res.breakdown, score_res.score)
    current_recs = current_plan.recommendations

    result = []
    for r in outcome.outstanding_recommendations:
        # Check if the snapshotted recommendation is still outstanding
        is_outstanding = False
        for curr in current_recs:
            if r.get("doc_type") is not None and curr.doc_type == r.get("doc_type"):
                is_outstanding = True
                break
            elif r.get("doc_type") is None and curr.action == r.get("action"):
                is_outstanding = True
                break

        result.append({
            "category": r.get("category"),
            "action": r.get("action"),
            "doc_type": r.get("doc_type"),
            "impact_pts": r.get("impact_pts"),
            "impact_score": r.get("impact_score"),
            "followed": not is_outstanding,
        })

    return result
