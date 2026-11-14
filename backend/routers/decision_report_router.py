"""
routers/decision_report_router.py

Read-only plain-language explanation of a stored assessment. The business and a lender see the SAME
report. Access: the business owner, an admin, or an approved lender with a legitimate relationship to
the business. Nothing here recalculates or stores anything.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models.assessment_snapshot import AssessmentSnapshot
from models.sme import SME
from models.user import User
from services.auth_service import get_current_user
from services.decision_report import build_decision_report
from services.lender_access import can_view_sme

router = APIRouter(prefix="/decision-reports", tags=["Decision Reports"])


def _authorise(db: Session, user: User, sme_id: int) -> None:
    sme = db.query(SME).filter(SME.id == sme_id).first()
    if sme is None:
        raise HTTPException(status_code=404, detail="Assessment not found")
    if user.role == "admin":
        return
    if user.role == "lender":
        if not can_view_sme(db, user, sme_id):
            raise HTTPException(status_code=404, detail="Assessment not found")
        return
    if sme.user_id != user.id:
        raise HTTPException(status_code=403, detail="Unauthorized")


@router.get("/sme/{sme_id}/latest")
def latest_report(sme_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    _authorise(db, current_user, sme_id)
    snap = (db.query(AssessmentSnapshot).filter(AssessmentSnapshot.sme_id == sme_id)
            .order_by(AssessmentSnapshot.assessed_at.desc(), AssessmentSnapshot.id.desc()).first())
    if snap is None:
        raise HTTPException(status_code=404, detail="No assessment has been run for this business yet")
    return build_decision_report(snap)


@router.get("/{snapshot_id}")
def report_for_snapshot(snapshot_id: int, current_user: User = Depends(get_current_user),
                        db: Session = Depends(get_db)):
    snap = db.query(AssessmentSnapshot).filter(AssessmentSnapshot.id == snapshot_id).first()
    if snap is None:
        raise HTTPException(status_code=404, detail="Assessment not found")
    _authorise(db, current_user, snap.sme_id)
    return build_decision_report(snap)
