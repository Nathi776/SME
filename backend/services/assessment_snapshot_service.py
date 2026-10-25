from datetime import datetime, timezone

from sqlalchemy.orm import Session

from models.assessment_snapshot import AssessmentSnapshot


def create_assessment_snapshot(
    db: Session,
    *,
    sme_id: int,
    business_observation_id: int | None = None,
    profile: str,
    score: float,
    decision: str,
    strategy_version: str | None = None,
    inference_version: str | None = None,
    evidence_depth: float | None = None,
    viability_score: float | None = None,
    input_snapshot: dict | None = None,
    factor_breakdown: dict | None = None,
    market_context: dict | None = None,
    recommendations: list | None = None,
    notes: str | None = None,
) -> AssessmentSnapshot:

    snapshot = AssessmentSnapshot(
        sme_id=sme_id,
        business_observation_id=business_observation_id,
        assessed_at=datetime.now(timezone.utc),

        profile=profile,

        strategy_version=strategy_version,
        inference_version=inference_version,

        score=score,
        decision=decision,

        evidence_depth=evidence_depth,
        viability_score=viability_score,

        input_snapshot=input_snapshot,
        factor_breakdown=factor_breakdown,
        market_context=market_context,
        recommendations=recommendations,

        notes=notes,
    )

    db.add(snapshot)
    db.commit()
    db.refresh(snapshot)

    return snapshot