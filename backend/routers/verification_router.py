"""
routers/verification_router.py — Component 4 update.

Changes:
- CIPC upload now triggers cipc_service.verify() immediately.
- If live API confirms the company: verification auto-approved,
  cipc fields written to SME record, score factor awarded instantly.
- If API unavailable or not configured: document queued for manual
  admin review as before, but registration number is pre-stored on
  the SME so admin panel can display it without re-reading the PDF.
- cipc_registration_number is now a required Form field when
  doc_type == "cipc" so the number is captured at upload time.
"""
from __future__ import annotations

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
from services import cipc_service
from limiter import limiter

router = APIRouter(prefix="/verifications", tags=["Verifications"])

VALID_DOC_TYPES = {
    # Compliance — scored
    "cipc", "bank_statement", "tax_clearance", "registration_docs",
    # Intent — scored
    "letter_of_intent", "supplier_quote", "lease_agreement",
    # Supporting — stored only
    "financial_statements", "vat_certificate", "director_id",
    "bee_certificate", "income_statement", "shareholder_docs",
    "sars_compliance", "proof_of_address", "proof_of_bank_account",
}


# ── Helpers ───────────────────────────────────────────────────────────────────

def _apply_bank_statement_signals(sme: SME, pdf_bytes: bytes) -> dict:
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
        "parsed":             True,
        "months_analysed":    signals.months_analysed,
        "avg_monthly_income": signals.avg_monthly_income,
        "avg_monthly_balance":signals.avg_monthly_balance,
        "overdraft_count":    signals.overdraft_count,
        "income_regularity":  signals.income_regularity,
        "parsed_revenue":     signals.parsed_revenue,
    }


def _apply_cipc_verification(
    sme: SME,
    ver: Verification,
    registration_number: str,
    db: Session,
) -> dict:
    """
    Run CIPC verification and mutate both sme and ver in place.
    Returns a response dict summarising the outcome.
    Caller must commit the session.
    """
    result = cipc_service.verify(registration_number, sme.name)

    # Always store the registration number on the SME record
    sme.cipc_registration_number = result.registration_number

    if result.verified is False:
        # Hard failure — number is invalid or company not found
        ver.status         = "rejected"
        ver.reviewed_at    = datetime.utcnow()
        ver.reviewer_notes = result.error or "CIPC verification failed"
        return {
            "cipc_verified":         False,
            "auto_approved":         False,
            "registration_number":   result.registration_number,
            "source":                result.source,
            "message":               result.error or "Registration number not found in CIPC registry.",
        }

    if result.verified is True and result.auto_approved:
        # Live API confirmed — auto-approve the verification
        ver.status         = "approved"
        ver.reviewed_at    = datetime.utcnow()
        ver.reviewer_notes = f"Auto-verified via CIPC API. Status: {result.status}"

        sme.cipc_verified_at   = datetime.utcnow()
        sme.cipc_company_name  = result.company_name
        sme.cipc_status        = result.status

        response = {
            "cipc_verified":       True,
            "auto_approved":       True,
            "registration_number": result.registration_number,
            "company_name":        result.company_name,
            "status":              result.status,
            "registration_date":   result.reg_date,
            "source":              result.source,
            "message": (
                "CIPC registration confirmed automatically. "
                "Verification approved and score updated."
            ),
        }
        if result.error:   # name mismatch warning
            response["warning"] = result.error
        return response

    # verified=None — manual review needed
    # Registration number is stored; admin sees it in the review panel
    ver.status = "pending"
    return {
        "cipc_verified":         None,
        "auto_approved":         False,
        "registration_number":   result.registration_number,
        "source":                result.source,
        "message": (
            "CIPC registration number stored. "
            "Automatic verification is not available — "
            "your document has been queued for manual admin review."
        ),
        "error": result.error,
    }


# ── Schemas ───────────────────────────────────────────────────────────────────

class VerificationOut(BaseModel):
    id:                     int
    doc_type:               str
    document_url:           Optional[str]
    status:                 str
    submitted_at:           datetime
    reviewed_at:            Optional[datetime]
    reviewer_notes:         Optional[str]
    sme_id:                 Optional[int]
    lender_id:              Optional[int]
    loi_counterparty_known: Optional[bool] = None

    class Config:
        orm_mode = True


class ReviewPayload(BaseModel):
    reviewer_notes:         Optional[str]  = None
    loi_counterparty_known: Optional[bool] = None


# ── SME / Lender endpoints ────────────────────────────────────────────────────

@router.post("/submit")
@limiter.limit("10/minute")
async def submit_verification(
    request: Request,
    doc_type: str = Form(..., description=(
        "Compliance: cipc | bank_statement | tax_clearance | registration_docs. "
        "Intent: letter_of_intent | supplier_quote | lease_agreement."
    )),
    file: UploadFile = File(...),
    # Required when doc_type == "cipc"; optional otherwise
    cipc_registration_number: Optional[str] = Form(
        default=None,
        description="SA company registration number (YYYY/NNNNNN/NN). Required for CIPC uploads.",
    ),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in {"sme", "lender"}:
        raise HTTPException(status_code=403, detail="Only SMEs or Lenders can submit verification documents")

    if doc_type not in VALID_DOC_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown document type '{doc_type}'. Valid types: {sorted(VALID_DOC_TYPES)}"
        )

    if doc_type == "cipc" and not cipc_registration_number:
        raise HTTPException(
            status_code=400,
            detail="cipc_registration_number is required when uploading a CIPC certificate.",
        )

    pdf_bytes, document_url = save_uploaded_file(file)

    ver = Verification(
        doc_type=doc_type,
        document_url=document_url,
        status="pending",
        submitted_at=datetime.utcnow(),
    )

    parse_result:  dict | None = None
    cipc_result:   dict | None = None

    if current_user.role == "sme":
        sme = db.query(SME).filter(SME.user_id == current_user.id).first()
        if not sme:
            raise HTTPException(status_code=404, detail="SME profile not found")
        ver.sme_id = sme.id

        if doc_type == "bank_statement":
            if not file.filename or not file.filename.lower().endswith(".pdf"):
                raise HTTPException(status_code=400, detail="Bank statements must be uploaded as PDF files.")
            parse_result = _apply_bank_statement_signals(sme, pdf_bytes)

        elif doc_type == "cipc":
            db.add(ver)
            db.flush()   # give ver an id before mutating
            cipc_result = _apply_cipc_verification(sme, ver, cipc_registration_number, db)

    else:
        lender = db.query(Lender).filter(Lender.user_id == current_user.id).first()
        if not lender:
            raise HTTPException(status_code=404, detail="Lender profile not found")
        ver.lender_id = lender.id

    if ver.id is None:
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

    if cipc_result is not None:
        response["cipc_verification"] = cipc_result

    if doc_type in {"letter_of_intent", "supplier_quote", "lease_agreement"}:
        response["intent_doc_hint"] = (
            "Document submitted for admin review. Once approved, it will contribute "
            "to your Intent Documents score factor."
        )

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

    ver.status         = "approved"
    ver.reviewed_at    = datetime.utcnow()
    ver.reviewer_notes = payload.reviewer_notes

    # When admin manually approves a CIPC, record the verified timestamp on the SME
    if ver.doc_type == "cipc" and ver.sme_id:
        sme = db.query(SME).filter(SME.id == ver.sme_id).first()
        if sme and not sme.cipc_verified_at:
            sme.cipc_verified_at = datetime.utcnow()
            sme.cipc_status      = "In Business (manual review)"

    # LOI counterparty flag
    if ver.doc_type == "letter_of_intent" and payload.loi_counterparty_known is not None:
        ver.loi_counterparty_known = payload.loi_counterparty_known

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

    ver.status         = "rejected"
    ver.reviewed_at    = datetime.utcnow()
    ver.reviewer_notes = payload.reviewer_notes
    db.commit()
    db.refresh(ver)
    return ver


# ── CIPC status endpoint (for SME dashboard display) ─────────────────────────

@router.get("/cipc-status")
def get_cipc_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Returns the current CIPC verification state for the logged-in SME.
    Used by the SME dashboard to show CIPC status without re-fetching all verifications.
    """
    if current_user.role != "sme":
        raise HTTPException(status_code=403, detail="Only SMEs can check CIPC status")

    sme = db.query(SME).filter(SME.user_id == current_user.id).first()
    if not sme:
        raise HTTPException(status_code=404, detail="SME profile not found")

    return {
        "cipc_registration_number": sme.cipc_registration_number,
        "cipc_verified_at":         sme.cipc_verified_at,
        "cipc_company_name":        sme.cipc_company_name,
        "cipc_status":              sme.cipc_status,
        "is_verified":              sme.cipc_verified_at is not None,
    }
