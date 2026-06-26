"""
routers/credit_score_router.py

All endpoints unchanged from the frontend's perspective.
Internally, every score now flows through core/scoring.py via scoring_service.
"""

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from datetime import datetime
from limiter import limiter

from database import get_db
from models.credit_score import CreditScore
from models.sme import SME
from models.user import User
from services.auth_service import get_current_user
from services.scoring_service import score_sme
from core.scoring import determine_decision

router = APIRouter(prefix="/credit-scores", tags=["Credit Scoring"])


def check_sme_access(current_user: User, sme_id: int, db: Session):
    if current_user.role not in {"admin", "lender"}:
        sme = db.query(SME).filter(SME.user_id == current_user.id).first()
        if not sme or sme.id != sme_id:
            raise HTTPException(status_code=403, detail="Unauthorized")


def _get_sme_or_404(sme_id: int, db: Session) -> SME:
    sme = db.query(SME).filter(SME.id == sme_id).first()
    if not sme:
        raise HTTPException(status_code=404, detail="SME not found")
    return sme


# ---------- Calculate & persist a new credit score ----------
@router.post("/calculate/{sme_id}")
@limiter.limit("5/minute")
def generate_credit_score(
    request: Request,
    sme_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    check_sme_access(current_user, sme_id, db)
    sme = _get_sme_or_404(sme_id, db)

    result = score_sme(sme, db)

    new_score = CreditScore(
        sme_id=sme.id,
        score=result.score,
        created_at=datetime.utcnow(),
    )
    db.add(new_score)
    db.commit()
    db.refresh(new_score)

    return {
        "message": "Credit score calculated successfully",
        "sme_id": sme_id,
        "score": new_score.score,
        "decision": result.decision,
    }


# ---------- Get credit score history ----------
@router.get("/sme/{sme_id}")
def get_credit_scores_by_sme(
    sme_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    check_sme_access(current_user, sme_id, db)
    scores = (
        db.query(CreditScore)
        .filter(CreditScore.sme_id == sme_id)
        .order_by(CreditScore.created_at.desc())
        .all()
    )
    return scores  # empty list is fine


@router.get("/history/{sme_id}")
def get_credit_history(
    sme_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    check_sme_access(current_user, sme_id, db)
    scores = db.query(CreditScore).filter(CreditScore.sme_id == sme_id).all()
    if not scores:
        raise HTTPException(status_code=404, detail="No credit scores found for this SME")
    return scores


# ---------- Latest score ----------
@router.get("/latest/{sme_id}")
def get_latest_credit_score(
    sme_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    check_sme_access(current_user, sme_id, db)
    score = (
        db.query(CreditScore)
        .filter(CreditScore.sme_id == sme_id)
        .order_by(CreditScore.created_at.desc())
        .first()
    )
    if not score:
        raise HTTPException(status_code=404, detail="No credit score found for this SME")
    return {"sme_id": sme_id, "latest_score": score.score, "created_at": score.created_at}


# ---------- Decision ----------
@router.get("/decision/{sme_id}")
def get_credit_decision(
    sme_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    check_sme_access(current_user, sme_id, db)
    score = (
        db.query(CreditScore)
        .filter(CreditScore.sme_id == sme_id)
        .order_by(CreditScore.created_at.desc())
        .first()
    )
    if not score:
        raise HTTPException(status_code=404, detail="No credit score found for this SME")
    return {
        "sme_id": sme_id,
        "latest_score": score.score,
        "decision": determine_decision(score.score),
    }


# ---------- Score details with full breakdown ----------
@router.get("/details/{sme_id}")
def get_credit_score_details(
    sme_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Returns a live score recalculated from current data plus a full
    per-factor breakdown for explainability. Does NOT persist a new score.
    """
    check_sme_access(current_user, sme_id, db)
    sme = _get_sme_or_404(sme_id, db)

    result = score_sme(sme, db)

    return {
        "sme_id": sme_id,
        "score": result.score,
        "decision": result.decision,
        "breakdown": result.breakdown,
    }
