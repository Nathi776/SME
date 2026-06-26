from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, ConfigDict, Field
from decimal import Decimal
from datetime import datetime

from database import get_db
from models.user import User
from models.finance_request import FinanceRequest
from services.auth_service import get_current_user
from services.finance_service import (
    create_finance_request,
    get_finance_requests,
    get_pending_finance_requests,
    approve_finance_request,
    reject_finance_request,
    calculate_fee_rate,
    calculate_eligible_amount,
    mark_finance_request_funded,
    mark_finance_request_paid,
    mark_finance_request_closed,
)

router = APIRouter(prefix="/finance", tags=["Finance Requests"])


# ── Pydantic Schemas ──────────────────────────────────────────────────────────

class FinanceRequestCreate(BaseModel):
    """
    invoice_id is now optional.
    - Provided  → invoice-backed request (traditional path)
    - Omitted   → pre-invoice request (scored on business signals)
    """
    invoice_id: int | None = None
    amount: Decimal = Field(..., ge=0)
    purpose_of_funding: str | None = None
    preferred_payout_date: datetime | None = None
    additional_notes: str | None = None


class FinanceRequestApprove(BaseModel):
    approved_amount: Decimal = Field(..., ge=0)


class FinanceRequestResponse(BaseModel):
    id: int
    sme_id: int
    invoice_id: int | None          # nullable — pre-invoice requests have no invoice
    request_type: str               # "invoice_backed" | "pre_invoice"
    amount_requested: Decimal
    approved_amount: Decimal | None
    fee_rate: Decimal
    status: str
    lender_id: int | None
    created_at: datetime
    approved_at: datetime | None
    purpose_of_funding: str | None = None
    preferred_payout_date: datetime | None = None
    additional_notes: str | None = None

    model_config = ConfigDict(from_attributes=True)


class FinanceRequestOut(BaseModel):
    id: int
    amount_requested: Decimal
    approved_amount: Decimal | None
    platform_fee: Decimal
    net_amount: Decimal
    status: str
    request_type: str

    model_config = ConfigDict(from_attributes=True)


# ── SME Endpoints ─────────────────────────────────────────────────────────────

@router.get("/pricing-parameters")
def get_pricing_parameters(
    sme_id: int | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get the fee rate and advance rate based on the credit score.
    """
    from models.sme import SME
    from models.credit_score import CreditScore

    if current_user.role == "sme":
        sme = db.query(SME).filter(SME.user_id == current_user.id).first()
        if not sme:
            raise HTTPException(status_code=404, detail="SME profile not found")
        target_sme_id = sme.id
    else:
        if sme_id is None:
            raise HTTPException(status_code=400, detail="sme_id is required for non-SME users")
        target_sme_id = sme_id

    latest_score = (
        db.query(CreditScore)
        .filter(CreditScore.sme_id == target_sme_id)
        .order_by(CreditScore.created_at.desc())
        .first()
    )
    score_value = int(latest_score.score) if latest_score else None

    fee_rate = calculate_fee_rate(score_value)
    advance_rate = calculate_eligible_amount(1.0, score_value)

    return {
        "sme_id": target_sme_id,
        "credit_score": score_value,
        "fee_rate": float(fee_rate),
        "advance_rate": float(advance_rate),
    }


@router.post("/apply")
def apply_for_finance(
    request: FinanceRequestCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Apply for financing.
    - With invoice_id  → invoice-backed financing
    - Without invoice_id → pre-invoice financing (requires score ≥ 50)
    """
    if current_user.role != "sme":
        raise HTTPException(status_code=403, detail="Only SMEs can apply for finance")

    from models.sme import SME
    sme = db.query(SME).filter(SME.user_id == current_user.id).first()
    if not sme:
        raise HTTPException(status_code=404, detail="SME profile not found")

    try:
        finance_req = create_finance_request(
            db,
            sme.id,
            request.amount,
            invoice_id=request.invoice_id,
            purpose_of_funding=request.purpose_of_funding,
            preferred_payout_date=request.preferred_payout_date,
            additional_notes=request.additional_notes,
        )
        return {
            "message": "Finance request submitted",
            "request_id": finance_req.id,
            "request_type": finance_req.request_type,
            "fee_rate": finance_req.fee_rate,
            "status": finance_req.status,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/requests/{sme_id}")
def list_finance_requests(
    sme_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from models.sme import SME
    if current_user.role == "sme":
        sme = db.query(SME).filter(SME.user_id == current_user.id).first()
        if not sme or sme.id != sme_id:
            raise HTTPException(status_code=403, detail="You can only view your own requests")

    if current_user.role not in {"sme", "lender", "admin"}:
        raise HTTPException(status_code=403, detail="Unauthorized to view finance requests")

    return get_finance_requests(db, sme_id)


# ── Lender Endpoints ──────────────────────────────────────────────────────────

@router.get("/pending")
def get_pending_requests(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != "lender":
        raise HTTPException(status_code=403, detail="Only lenders can view pending requests")

    from models.lender import Lender
    lender = db.query(Lender).filter(Lender.user_id == current_user.id).first()
    if not lender:
        raise HTTPException(status_code=404, detail="Lender profile not found")

    return get_pending_finance_requests(db, lender.id)


@router.put("/approve/{request_id}", response_model=FinanceRequestResponse)
def approve_request(
    request_id: int,
    approval: FinanceRequestApprove,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != "lender":
        raise HTTPException(status_code=403, detail="Only lenders can approve requests")

    from models.lender import Lender
    lender = db.query(Lender).filter(Lender.user_id == current_user.id).first()
    if not lender:
        raise HTTPException(status_code=404, detail="Lender profile not found")

    try:
        return approve_finance_request(db, request_id, lender.id, approval.approved_amount)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/reject/{request_id}", response_model=FinanceRequestResponse)
def reject_request(
    request_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != "lender":
        raise HTTPException(status_code=403, detail="Only lenders can reject requests")

    from models.lender import Lender
    lender = db.query(Lender).filter(Lender.user_id == current_user.id).first()
    if not lender:
        raise HTTPException(status_code=404, detail="Lender profile not found")

    try:
        return reject_finance_request(db, request_id, lender.id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/funded/{request_id}", response_model=FinanceRequestResponse)
def mark_request_funded(
    request_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in {"lender", "admin"}:
        raise HTTPException(status_code=403, detail="Only lenders or admins can mark requests as funded")

    try:
        return mark_finance_request_funded(db, request_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/paid/{request_id}", response_model=FinanceRequestResponse)
def mark_request_paid(
    request_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in {"lender", "admin"}:
        raise HTTPException(status_code=403, detail="Only lenders or admins can mark requests as paid")

    try:
        return mark_finance_request_paid(db, request_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/closed/{request_id}", response_model=FinanceRequestResponse)
def mark_request_closed(
    request_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in {"lender", "admin"}:
        raise HTTPException(status_code=403, detail="Only lenders or admins can close requests")

    try:
        return mark_finance_request_closed(db, request_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
