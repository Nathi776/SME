from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db
from models.user import User
from models.lender import Lender
from models.sme import SME
from models.credit_score import CreditScore
from models.finance_request import FinanceRequest
from services.auth_service import get_current_user
from typing import List

router = APIRouter(prefix="/lenders", tags=["Lenders"])

# ========== Pydantic Schemas ==========

class LenderCreate(BaseModel):
    organization_name: str
    contact_email: str
    phone: str | None = None
    max_lending_amount: float = 1000000
    min_credit_score: int = 40

class LenderUpdate(BaseModel):
    organization_name: str | None = None
    contact_email: str | None = None
    phone: str | None = None
    max_lending_amount: float | None = None
    min_credit_score: int | None = None

class LenderResponse(BaseModel):
    id: int
    user_id: int
    organization_name: str
    contact_email: str
    phone: str | None
    max_lending_amount: float
    min_credit_score: int

    class Config:
        from_attributes = True

class SMEFinanceView(BaseModel):
    sme_id: int
    company_name: str
    industry: str
    revenue: float
    credit_score: int | None
    risk_level: str | None
    pending_finance_requests: int

    class Config:
        from_attributes = True

# ========== CRUD Endpoints ==========

@router.post("/register", response_model=LenderResponse)
def register_lender(
    request: LenderCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Register as a lender."""
    # Check if user already has a lender profile
    existing = db.query(Lender).filter(Lender.user_id == current_user.id).first()
    if existing:
        raise HTTPException(status_code=400, detail="User already has a lender profile")
    
    new_lender = Lender(
        user_id=current_user.id,
        organization_name=request.organization_name,
        contact_email=request.contact_email,
        phone=request.phone,
        max_lending_amount=request.max_lending_amount,
        min_credit_score=request.min_credit_score
    )
    db.add(new_lender)
    current_user.role = "lender"
    db.commit()
    db.refresh(new_lender)
    return new_lender

@router.get("/me", response_model=LenderResponse)
def get_lender_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current lender's profile."""
    lender = db.query(Lender).filter(Lender.user_id == current_user.id).first()
    if not lender:
        raise HTTPException(status_code=404, detail="Lender profile not found")
    return lender

@router.put("/me", response_model=LenderResponse)
def update_lender_profile(
    request: LenderUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update current lender's profile."""
    lender = db.query(Lender).filter(Lender.user_id == current_user.id).first()
    if not lender:
        raise HTTPException(status_code=404, detail="Lender profile not found")
    
    for key, value in request.dict(exclude_unset=True).items():
        setattr(lender, key, value)
    
    db.commit()
    db.refresh(lender)
    return lender

@router.get("/available-smes")
def get_available_smes(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get list of SMEs available for financing (with credit scores)."""
    if current_user.role != "lender":
        raise HTTPException(status_code=403, detail="Only lenders can view SMEs")
    
    smes = db.query(SME).all()
    result = []
    
    for sme in smes:
        latest_score = (
            db.query(CreditScore)
            .filter(CreditScore.sme_id == sme.id)
            .order_by(CreditScore.created_at.desc())
            .first()
        )
        
        pending_requests = (
            db.query(FinanceRequest)
            .filter(FinanceRequest.sme_id == sme.id, FinanceRequest.status == "pending")
            .count()
        )
        
        result.append({
            "sme_id": sme.id,
            "company_name": sme.name,
            "industry": sme.industry,
            "revenue": sme.revenue,
            "credit_score": latest_score.score if latest_score else None,
            "risk_level": latest_score.rating if latest_score else None,
            "pending_finance_requests": pending_requests
        })
    
    return result

@router.get("/{lender_id}", response_model=LenderResponse)
def get_lender(lender_id: int, db: Session = Depends(get_db)):
    """Get lender details by ID."""
    lender = db.query(Lender).filter(Lender.id == lender_id).first()
    if not lender:
        raise HTTPException(status_code=404, detail="Lender not found")
    return lender
