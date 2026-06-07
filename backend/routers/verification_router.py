from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

from database import get_db
from services.auth_service import get_current_user
from models.user import User
from models.verification import Verification
from models.sme import SME
from models.lender import Lender

router = APIRouter(prefix="/verifications", tags=["Verifications"])


class VerificationCreate(BaseModel):
    doc_type: str = Field(..., description="Document type identifier")
    document_url: Optional[str] = None


class VerificationOut(BaseModel):
    id: int
    doc_type: str
    document_url: Optional[str]
    status: str
    submitted_at: datetime
    reviewed_at: Optional[datetime]
    reviewer_notes: Optional[str]
    sme_id: Optional[int]
    lender_id: Optional[int]

    class Config:
        orm_mode = True


@router.post("/submit", response_model=VerificationOut)
def submit_verification(
    payload: VerificationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Upload a verification document for the current user (SME or Lender)."""
    if current_user.role not in {"sme", "lender"}:
        raise HTTPException(status_code=403, detail="Only SMEs or Lenders can submit verification documents")

    ver = Verification(doc_type=payload.doc_type, document_url=payload.document_url, status="pending")

    if current_user.role == "sme":
        sme = db.query(SME).filter(SME.user_id == current_user.id).first()
        if not sme:
            raise HTTPException(status_code=404, detail="SME profile not found")
        ver.sme_id = sme.id
    else:
        lender = db.query(Lender).filter(Lender.user_id == current_user.id).first()
        if not lender:
            raise HTTPException(status_code=404, detail="Lender profile not found")
        ver.lender_id = lender.id

    db.add(ver)
    db.commit()
    db.refresh(ver)
    return ver


@router.get("/my", response_model=List[VerificationOut])
def list_my_verifications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role == "sme":
        sme = db.query(SME).filter(SME.user_id == current_user.id).first()
        if not sme:
            raise HTTPException(status_code=404, detail="SME profile not found")
        items = db.query(Verification).filter(Verification.sme_id == sme.id).all()
    elif current_user.role == "lender":
        lender = db.query(Lender).filter(Lender.user_id == current_user.id).first()
        if not lender:
            raise HTTPException(status_code=404, detail="Lender profile not found")
        items = db.query(Verification).filter(Verification.lender_id == lender.id).all()
    else:
        raise HTTPException(status_code=403, detail="Unauthorized")

    return items


@router.get("/pending", response_model=List[VerificationOut])
def list_pending_verifications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can view pending verifications")
    return db.query(Verification).filter(Verification.status == "pending").all()


class ReviewPayload(BaseModel):
    reviewer_notes: Optional[str] = None


@router.put("/approve/{verification_id}", response_model=VerificationOut)
def approve_verification(
    verification_id: int,
    payload: ReviewPayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can approve verifications")

    ver = db.query(Verification).filter(Verification.id == verification_id).first()
    if not ver:
        raise HTTPException(status_code=404, detail="Verification not found")

    ver.status = "approved"
    ver.reviewed_at = datetime.utcnow()
    ver.reviewer_notes = payload.reviewer_notes
    db.commit()
    db.refresh(ver)
    return ver


@router.put("/reject/{verification_id}", response_model=VerificationOut)
def reject_verification(
    verification_id: int,
    payload: ReviewPayload,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can reject verifications")

    ver = db.query(Verification).filter(Verification.id == verification_id).first()
    if not ver:
        raise HTTPException(status_code=404, detail="Verification not found")

    ver.status = "rejected"
    ver.reviewed_at = datetime.utcnow()
    ver.reviewer_notes = payload.reviewer_notes
    db.commit()
    db.refresh(ver)
    return ver
