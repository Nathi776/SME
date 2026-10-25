"""
services/assessment_evaluation_service.py

Evaluates what happened after an AssessmentSnapshot.

This service deliberately does NOT claim that the assessment caused
the observed outcome or that the score is predictive.
"""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal

from sqlalchemy.orm import Session

from models.assessment_snapshot import AssessmentSnapshot
from models.business_observation import BusinessObservation
from models.finance_request import FinanceRequest
from models.sme_outcome import SmeOutcome


def _decimal_to_float(value):
    """Convert Decimal values to JSON-safe floats."""
    if value is None:
        return None

    if isinstance(value, Decimal):
        return float(value)

    return float(value)


def _percentage_change(baseline, current):
    """Calculate percentage change, or None when unavailable."""
    if baseline is None or current is None:
        return None

    baseline = float(baseline)
    current = float(current)

    if baseline == 0:
        return None

    return ((current - baseline) / baseline) * 100.0


def _days_between(earlier: datetime, later: datetime) -> int:
    """Return elapsed calendar days between two timestamps."""
    return max(0, (later - earlier).days)


def get_subsequent_observations(
    db: Session,
    *,
    sme_id: int,
    observed_after: datetime,
) -> list[BusinessObservation]:
    """Return observations recorded after an assessment chronologically."""
    return (
        db.query(BusinessObservation)
        .filter(
            BusinessObservation.sme_id == sme_id,
            BusinessObservation.observed_at > observed_after,
        )
        .order_by(BusinessObservation.observed_at.asc())
        .all()
    )


def get_assessment_evaluation(
    db: Session,
    snapshot_id: int,
) -> dict | None:
    """Evaluate one assessment against later observations and any outcome."""
    snapshot = (
        db.query(AssessmentSnapshot)
        .filter(AssessmentSnapshot.id == snapshot_id)
        .first()
    )

    if snapshot is None:
        return None

    observations = get_subsequent_observations(
        db,
        sme_id=snapshot.sme_id,
        observed_after=snapshot.assessed_at,
    )

    finance_requests = (
        db.query(FinanceRequest)
        .filter(FinanceRequest.assessment_snapshot_id == snapshot.id)
        .order_by(FinanceRequest.created_at.asc())
        .all()
    )
    outcome = next(
        (
            finance_request.outcome
            for finance_request in finance_requests
            if finance_request.outcome is not None
        ),
        None,
    )

    baseline_observation = None
    if snapshot.business_observation_id is not None:
        baseline_observation = (
            db.query(BusinessObservation)
            .filter(BusinessObservation.id == snapshot.business_observation_id)
            .first()
        )

    if baseline_observation is not None:
        baseline_revenue = baseline_observation.revenue
    elif snapshot.input_snapshot:
        baseline_revenue = snapshot.input_snapshot.get("revenue")
    else:
        baseline_revenue = None

    observation_results = []
    for observation in observations:
        observation_results.append(
            {
                "observation_id": observation.id,
                "observed_at": observation.observed_at,
                "days_after_assessment": _days_between(
                    snapshot.assessed_at,
                    observation.observed_at,
                ),
                "source": observation.source,
                "still_operating": observation.still_operating,
                "revenue": _decimal_to_float(observation.revenue),
                "revenue_change_percent": _percentage_change(
                    baseline_revenue,
                    observation.revenue,
                ),
                "total_invoices": observation.total_invoices,
                "paid_on_time": observation.paid_on_time,
                "unpaid_invoices": observation.unpaid_invoices,
                "years_active": observation.years_active,
                "overdraft_count": observation.overdraft_count,
                "income_regularity": _decimal_to_float(
                    observation.income_regularity,
                ),
            }
        )

    def nearest_observation(target_days: int):
        eligible = [
            observation
            for observation in observation_results
            if observation["days_after_assessment"] >= target_days
        ]
        return eligible[0] if eligible else None

    outcome_result = None
    if outcome is not None:
        outcome_result = {
            "outcome_id": outcome.id,
            "finance_request_id": outcome.finance_request_id,
            "amount": _decimal_to_float(outcome.amount),
            "outcome_status": outcome.outcome_status,
            "checkin_90": {
                "completed": outcome.checkin_90_completed,
                "date": outcome.checkin_90_date,
                "still_operating": outcome.checkin_90_still_operating,
                "revenue": _decimal_to_float(outcome.checkin_90_revenue),
                "loan_repaid": outcome.checkin_90_loan_repaid,
            },
            "checkin_180": {
                "completed": outcome.checkin_180_completed,
                "date": outcome.checkin_180_date,
                "still_operating": outcome.checkin_180_still_operating,
                "revenue": _decimal_to_float(outcome.checkin_180_revenue),
                "loan_repaid": outcome.checkin_180_loan_repaid,
            },
            "checkin_365": {
                "completed": outcome.checkin_365_completed,
                "date": outcome.checkin_365_date,
                "still_operating": outcome.checkin_365_still_operating,
                "revenue": _decimal_to_float(outcome.checkin_365_revenue),
                "loan_repaid": outcome.checkin_365_loan_repaid,
            },
        }

    return {
        "assessment": {
            "snapshot_id": snapshot.id,
            "sme_id": snapshot.sme_id,
            "assessed_at": snapshot.assessed_at,
            "profile": snapshot.profile,
            "score": snapshot.score,
            "decision": snapshot.decision,
            "strategy_version": snapshot.strategy_version,
            "inference_version": snapshot.inference_version,
            "evidence_depth": snapshot.evidence_depth,
            "business_observation_id": snapshot.business_observation_id,
        },
        "baseline": {
            "observation_id": (
                baseline_observation.id if baseline_observation else None
            ),
            "observed_at": (
                baseline_observation.observed_at
                if baseline_observation
                else None
            ),
            "revenue": _decimal_to_float(baseline_revenue),
        },
        "observations": observation_results,
        "milestones": {
            "day_90_or_later": nearest_observation(90),
            "day_180_or_later": nearest_observation(180),
            "day_365_or_later": nearest_observation(365),
        },
        "finance_outcome": outcome_result,
    }


MIN_RELIABLE_SAMPLE = 30


def get_model_calibration(db: Session, band_width: int = 20) -> dict:
    """
    Compare initial assessments with realised 12-month outcomes.

    Only outcomes whose 365-day labels exist are used. Results are grouped by
    strategy version and score band so a new model version can be compared
    with the previous one. Small groups are flagged rather than hidden; this
    reports association, not proof that the score causes the outcome.
    """
    rows = (
        db.query(SmeOutcome, FinanceRequest)
        .join(FinanceRequest, FinanceRequest.id == SmeOutcome.finance_request_id)
        .filter(SmeOutcome.y1_survived_12m.isnot(None))
        .all()
    )

    groups: dict[tuple[str, int], dict] = {}
    for outcome, request in rows:
        snapshot = request.assessment_snapshot
        score = snapshot.score if snapshot is not None else outcome.score_at_funding
        version = (snapshot.strategy_version if snapshot is not None else None) or "unknown"
        band = int(score // band_width) * band_width
        g = groups.setdefault(
            (version, band),
            {"n": 0, "survived": 0, "defaulted": 0, "default_known": 0},
        )
        g["n"] += 1
        g["survived"] += 1 if outcome.y1_survived_12m else 0
        if outcome.y5_defaulted is not None:
            g["default_known"] += 1
            g["defaulted"] += 1 if outcome.y5_defaulted else 0

    result = []
    for (version, band), g in sorted(groups.items()):
        result.append({
            "strategy_version": version,
            "score_band": f"{band}-{band + band_width - 1}",
            "n": g["n"],
            "survival_rate_12m": g["survived"] / g["n"],
            "default_rate_12m": (
                g["defaulted"] / g["default_known"] if g["default_known"] else None
            ),
            "sufficient_sample": g["n"] >= MIN_RELIABLE_SAMPLE,
        })

    return {
        "labelled_outcomes": len(rows),
        "min_reliable_sample": MIN_RELIABLE_SAMPLE,
        "groups": result,
    }
