"""
routers/verification_router.py

Changes in this version:
- POST /submit now accepts a real file upload (multipart/form-data)
- When doc_type == "bank_statement", the PDF is parsed immediately and
  signals are written to the sme record — no admin action needed for parsing
- All other endpoints unchanged
"""

from __future__ import annotations

import uuid
import os
from datetime import datetime
from typing import Optional, List

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models.lender import Lender
from models.sme import SME
from models.user import User
from models.verification import Verification
from services.auth_service import get_current_user
from services.bank_statement_parser import parse_bank_statement
from services.storage_service import save_uploaded_file
from limiter import limiter

router = APIRouter(prefix="/verifications", tags=["Verifications"])



def _apply_bank_statement_signals(sme: SME, pdf_bytes: bytes) -> dict:
    """
    Parse the PDF and write signals onto the SME record.
    Returns a dict describing what was found (for the API response).
    If parsing fails, SME record is unchanged and we return a warning.
    """
    signals = parse_bank_statement(pdf_bytes)
    if signals is None:
        return {
            "parsed": False,
            "warning": (
                "Bank statement could not be parsed automatically. "
                "Your document has been saved and will be reviewed manually. "
                "Ensure it is a text-based PDF (not a scan)."
            ),
        }

    sme.bs_avg_monthly_balance  = signals.avg_monthly_balance
    sme.bs_avg_monthly_income   = signals.avg_monthly_income
    sme.bs_avg_monthly_expenses = signals.avg_monthly_expenses
    sme.bs_overdraft_count      = signals.overdraft_count
    sme.bs_income_regularity    = signals.income_regularity
    sme.bs_months_analysed      = signals.months_analysed
    sme.bs_parsed_revenue       = signals.parsed_revenue

    return {
        "parsed": True,
        "months_analysed":      signals.months_analysed,
        "avg_monthly_income":   signals.avg_monthly_income,
        "avg_monthly_balance":  signals.avg_monthly_balance,
        "overdraft_count":      signals.overdraft_count,
        "income_regularity":    signals.income_regularity,
        "parsed_revenue":       signals.parsed_revenue,
    }


# ── Schemas ───────────────────────────────────────────────────────────────────

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


class ReviewPayload(BaseModel):
    reviewer_notes: Optional[str] = None


# ── SME / Lender endpoints ────────────────────────────────────────────────────

@router.post("/submit")
@limiter.limit("10/minute")
async def submit_verification(
    request: Request,
    doc_type: str = Form(..., description="Document type: cipc | bank_statement | tax_clearance | registration_docs"),
    file: UploadFile = File(..., description="PDF or image of the document"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Upload a verification document.

    For bank_statement uploads:
    - PDF is parsed immediately for cashflow signals
    - Signals are written to the SME record and used in the next score calculation
    - Document is saved with status "pending" for admin review as normal

    For all other doc types:
    - File is saved, status set to "pending" for admin review
    """
    if current_user.role not in {"sme", "lender"}:
        raise HTTPException(status_code=403, detail="Only SMEs or Lenders can submit verification documents")

    # Save file securely
    pdf_bytes, document_url = save_uploaded_file(file)

    ver = Verification(
        doc_type=doc_type,
        document_url=document_url,
        status="pending",
        submitted_at=datetime.utcnow(),
    )

    parse_result: dict | None = None

    if current_user.role == "sme":
        sme = db.query(SME).filter(SME.user_id == current_user.id).first()
        if not sme:
            raise HTTPException(status_code=404, detail="SME profile not found")
        ver.sme_id = sme.id

        # Parse bank statements immediately — no admin action needed for signal extraction
        if doc_type == "bank_statement":
            if not file.filename or not file.filename.lower().endswith(".pdf"):
                raise HTTPException(
                    status_code=400,
                    detail="Bank statements must be uploaded as PDF files."
                )
            parse_result = _apply_bank_statement_signals(sme, pdf_bytes)

    else:
        lender = db.query(Lender).filter(Lender.user_id == current_user.id).first()
        if not lender:
            raise HTTPException(status_code=404, detail="Lender profile not found")
        ver.lender_id = lender.id

    db.add(ver)
    db.commit()
    db.refresh(ver)

    response = {
        "id":           ver.id,
        "doc_type":     ver.doc_type,
        "document_url": ver.document_url,
        "status":       ver.status,
        "submitted_at": ver.submitted_at,
        "sme_id":       ver.sme_id,
        "lender_id":    ver.lender_id,
    }
    if parse_result is not None:
        response["bank_statement_parsing"] = parse_result

    return response


@router.get("/my", response_model=List[VerificationOut])
def list_my_verifications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role == "sme":
        sme = db.query(SME).filter(SME.user_id == current_user.id).first()
        if not sme:
            raise HTTPException(status_code=404, detail="SME profile not found")
        return db.query(Verification).filter(Verification.sme_id == sme.id).all()

    elif current_user.role == "lender":
        lender = db.query(Lender).filter(Lender.user_id == current_user.id).first()
        if not lender:
            raise HTTPException(status_code=404, detail="Lender profile not found")
        return db.query(Verification).filter(Verification.lender_id == lender.id).all()

    raise HTTPException(status_code=403, detail="Unauthorized")


# ── Admin endpoints ───────────────────────────────────────────────────────────

@router.get("/pending", response_model=List[VerificationOut])
def list_pending_verifications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can view pending verifications")
    return db.query(Verification).filter(Verification.status == "pending").all()


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
