"""
routers/assessment_evaluation_router.py

API endpoints for evaluating what happened after an SME assessment.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models.assessment_snapshot import AssessmentSnapshot
from models.sme import SME
from models.user import User
from services.assessment_evaluation_service import (
    get_assessment_evaluation,
    get_model_calibration,
)
from services.auth_service import get_current_user


router = APIRouter(
    prefix="/assessment-evaluations",
    tags=["Assessment Evaluations"],
)


def check_sme_access(current_user: User, sme: SME):
    """Allow owners, lenders, and admins to view evaluations."""
    if current_user.role in {"admin", "lender"}:
        return

    if sme.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Unauthorized")


def get_snapshot_or_404(snapshot_id: int, db: Session) -> AssessmentSnapshot:
    snapshot = (
        db.query(AssessmentSnapshot)
        .filter(AssessmentSnapshot.id == snapshot_id)
        .first()
    )

    if snapshot is None:
        raise HTTPException(
            status_code=404,
            detail="Assessment snapshot not found",
        )

    return snapshot


@router.get("/calibration/summary")
def model_calibration(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Realised 12-month outcomes by strategy version and score band."""
    if current_user.role not in {"admin", "lender"}:
        raise HTTPException(status_code=403, detail="Unauthorized")
    return get_model_calibration(db)


@router.get("/{snapshot_id}")
def evaluate_assessment(
    snapshot_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Evaluate what happened after a specific assessment."""
    snapshot = get_snapshot_or_404(snapshot_id, db)

    sme = db.query(SME).filter(SME.id == snapshot.sme_id).first()
    if sme is None:
        raise HTTPException(status_code=404, detail="SME not found")

    check_sme_access(current_user, sme)

    evaluation = get_assessment_evaluation(db, snapshot_id)
    if evaluation is None:
        raise HTTPException(
            status_code=404,
            detail="Assessment evaluation not found",
        )

    return evaluation
