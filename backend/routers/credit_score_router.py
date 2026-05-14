from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models.credit_score import CreditScore
from models.sme import SME
from models.invoice import Invoice
from datetime import datetime
from decimal import Decimal
from models.user import User
from services.auth_service import get_current_user

router = APIRouter(prefix="/credit-scores", tags=["Credit Scoring"])

# ---------- Helper Function ----------
def calculate_score(revenue: Decimal | float | int, years_active: int, unpaid_invoices: int) -> float:
    """
    Simple rule-based credit scoring algorithm.
    Adjust logic later for ML integration.
    """
    revenue = Decimal(str(revenue))
    base_score = 50
    revenue_boost = min(revenue / Decimal("100000"), Decimal("30"))  # max +30 points
    stability_boost = min(years_active * 2, 10)  # max +10 points
    penalty = unpaid_invoices * 2  # -2 points per unpaid invoice

    score = base_score + revenue_boost + stability_boost - penalty
    return float(max(Decimal("0"), min(score, Decimal("100"))))  # Clamp between 0 and 100

# ---------- Calculate Credit Score ----------
@router.post("/calculate/{sme_id}")
def generate_credit_score(sme_id: int, db: Session = Depends(get_db)):
    sme = db.query(SME).filter(SME.id == sme_id).first()
    if not sme:
        raise HTTPException(status_code=404, detail="SME not found")

    invoices = db.query(Invoice).filter(Invoice.sme_id == sme_id).all()
    unpaid_invoices = sum(1 for i in invoices if i.status != "paid")

    score = calculate_score(sme.revenue, sme.years_active, unpaid_invoices)

    new_score = CreditScore(sme_id=sme.id, score=score, created_at=datetime.utcnow())
    db.add(new_score)
    db.commit()
    db.refresh(new_score)

    return {
        "message": "Credit score calculated successfully",
        "sme_id": sme_id,
        "score": new_score.score
    }

# ---------- Get SME Credit Score History ----------
@router.get("/sme/{sme_id}")
def get_credit_scores_by_sme(
    sme_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in {"admin", "lender"}:
        sme = db.query(SME).filter(SME.user_id == current_user.id).first()
        if not sme or sme.id != sme_id:
            raise HTTPException(status_code=403, detail="Unauthorized")

    scores = db.query(CreditScore).filter(CreditScore.sme_id == sme_id).order_by(CreditScore.created_at.desc()).all()
    if not scores:
        return []  # Return empty list instead of 404
    return scores

@router.get("/history/{sme_id}")
def get_credit_history(sme_id: int, db: Session = Depends(get_db)):
    scores = db.query(CreditScore).filter(CreditScore.sme_id == sme_id).all()
    if not scores:
        raise HTTPException(status_code=404, detail="No credit scores found for this SME")
    return scores

# ---------- Get Latest Credit Score ----------
@router.get("/latest/{sme_id}")
def get_latest_credit_score(sme_id: int, db: Session = Depends(get_db)):
    score = (
        db.query(CreditScore)
        .filter(CreditScore.sme_id == sme_id)
        .order_by(CreditScore.created_at.desc())
        .first()
    )
    if not score:
        raise HTTPException(status_code=404, detail="No credit score found for this SME")
    return {"sme_id": sme_id, "latest_score": score.score, "created_at": score.created_at}
