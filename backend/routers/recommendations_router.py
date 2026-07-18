"""
routers/recommendations_router.py

Single endpoint: GET /recommendations/
Returns a personalised, prioritised action plan for the logged-in SME.

The plan is generated live from the current score breakdown —
no separate table needed. Every time the SME's data changes and
they recalculate their score, the recommendations update automatically.
"""
from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models.user import User
from models.sme import SME
from services.auth_service import get_current_user
from services.scoring_service import score_sme
from services.recommendations_service import RecommendationEngine

router = APIRouter(prefix="/recommendations", tags=["Recommendations"])


@router.get("/")
def get_recommendations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Returns a live personalised recommendation plan for the logged-in SME.

    The plan includes:
    - Current score and decision
    - Projected score if all recommendations are followed
    - Prioritised list of actions with exact score impact per action
    - Factor-by-factor status (Strong / Moderate / Weak / Missing)
    - One-sentence coaching summary
    """
    if current_user.role != "sme":
        raise HTTPException(
            status_code=403,
            detail="Only SMEs can view recommendations"
        )

    sme = db.query(SME).filter(SME.user_id == current_user.id).first()
    if not sme:
        raise HTTPException(status_code=404, detail="SME profile not found")

    # Score is always recalculated live — no stale data
    result = score_sme(sme, db)
    plan   = RecommendationEngine.generate(result)

    return {
        "current_score":      plan.current_score,
        "projected_score":    plan.projected_score,
        "decision":           plan.decision,
        "projected_decision": plan.projected_decision,
        "summary":            plan.summary,
        "raw_max":            plan.raw_max,

        "factor_statuses": [
            {
                "factor":      fs.factor,
                "current_pts": fs.current_pts,
                "max_pts":     fs.max_pts,
                "pct":         fs.pct,
                "status":      fs.status,
                "gap_pts":     fs.gap_pts,
            }
            for fs in plan.factor_statuses
        ],

        "recommendations": [
            {
                "priority":      rec.priority,
                "category":      rec.category,
                "action":        rec.action,
                "reason":        rec.reason,
                "impact_pts":    rec.impact_pts,
                "impact_score":  rec.impact_score,
                "difficulty":    rec.difficulty,
                "time_estimate": rec.time_estimate,
                "doc_type":      rec.doc_type,
            }
            for rec in plan.recommendations
        ],
    }
