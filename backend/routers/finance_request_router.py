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
    get_awaiting_info_requests,
    request_more_information,
    respond_to_information_request,
    get_request_messages,
)
from services.scoring_service import calculate_assessment

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


class InfoMessage(BaseModel):
    message: str = Field(..., min_length=5, max_length=1000)


class FinanceRequestResponse(BaseModel):
    id: int
    sme_id: int
    invoice_id: int | None          # nullable — pre-invoice requests have no invoice
    assessment_snapshot_id: int | None = None
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
    rejection_reason: str | None = None

    model_config = ConfigDict(from_attributes=True)


class RejectBody(BaseModel):
    reason: str | None = Field(default=None, max_length=1000)


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
    Get the fee rate and advance rate based on a current assessment.
    """
    from models.sme import SME

    if current_user.role == "sme":
        sme = db.query(SME).filter(SME.user_id == current_user.id).first()
        if not sme:
            raise HTTPException(status_code=404, detail="SME profile not found")
        target_sme_id = sme.id
    else:
        if sme_id is None:
            raise HTTPException(status_code=400, detail="sme_id is required for non-SME users")
        target_sme_id = sme_id

    target_sme = db.query(SME).filter(SME.id == target_sme_id).first()
    if not target_sme:
        raise HTTPException(status_code=404, detail="SME profile not found")

    assessment_result, _ = calculate_assessment(target_sme, db)
    score_value = int(assessment_result.score)

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


@router.get("/awaiting-info")
def get_awaiting_info(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Requests this lender has asked a question about and is waiting on."""
    if current_user.role != "lender":
        raise HTTPException(status_code=403, detail="Only lenders can view this list")

    from models.lender import Lender
    lender = db.query(Lender).filter(Lender.user_id == current_user.id).first()
    if not lender:
        raise HTTPException(status_code=404, detail="Lender profile not found")
    return get_awaiting_info_requests(db, lender.id)


def _notify(to: str | None, subject: str, body: str) -> None:
    """Best-effort email: a mail failure must never block or undo the action."""
    if not to:
        return
    try:
        from services.email_service import send_email
        send_email(to, subject, body)
    except Exception:  # noqa: BLE001  (not configured, SMTP down, ...)
        import logging
        logging.getLogger(__name__).warning("Notification email not sent", exc_info=True)


@router.post("/{request_id}/request-info", response_model=FinanceRequestResponse)
def request_info(
    request_id: int,
    payload: InfoMessage,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Lender asks the SME for more information before deciding."""
    if current_user.role != "lender":
        raise HTTPException(status_code=403, detail="Only lenders can request information")

    from models.lender import Lender
    from models.sme import SME
    lender = db.query(Lender).filter(Lender.user_id == current_user.id).first()
    if not lender:
        raise HTTPException(status_code=404, detail="Lender profile not found")

    try:
        req = request_more_information(db, request_id, lender.id, current_user.id, payload.message)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    sme = db.query(SME).filter(SME.id == req.sme_id).first()
    owner = db.query(User).filter(User.id == sme.user_id).first() if sme else None
    _notify(
        owner.email if owner else None,
        "A lender needs more information about your funding request",
        f"{lender.organization_name} has asked a question about your funding request:\n\n"
        f"{payload.message.strip()}\n\nPlease sign in and reply to continue the review.",
    )
    return req


@router.post("/{request_id}/respond", response_model=FinanceRequestResponse)
def respond_to_info_request(
    request_id: int,
    payload: InfoMessage,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """SME answers a lender's question; the request returns to the lender's queue."""
    if current_user.role != "sme":
        raise HTTPException(status_code=403, detail="Only the business owner can respond")

    from models.lender import Lender
    from models.sme import SME
    req = db.query(FinanceRequest).filter(FinanceRequest.id == request_id).first()
    sme = db.query(SME).filter(SME.user_id == current_user.id).first()
    if req is None or sme is None or req.sme_id != sme.id:
        raise HTTPException(status_code=404, detail="Finance request not found")

    try:
        req = respond_to_information_request(db, request_id, current_user.id, payload.message)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    lender = db.query(Lender).filter(Lender.id == req.lender_id).first()
    _notify(
        lender.contact_email if lender else None,
        f"{sme.name} replied to your question",
        f"{sme.name} answered your question about their funding request:\n\n"
        f"{payload.message.strip()}\n\nThe request is back in your pending list.",
    )
    return req


@router.get("/{request_id}/messages")
def get_messages(
    request_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """The question-and-answer thread: the business owner, the lender on it, or an admin."""
    from models.lender import Lender
    from models.sme import SME
    req = db.query(FinanceRequest).filter(FinanceRequest.id == request_id).first()
    if req is None:
        raise HTTPException(status_code=404, detail="Finance request not found")

    allowed = current_user.role == "admin"
    if current_user.role == "sme":
        sme = db.query(SME).filter(SME.user_id == current_user.id).first()
        allowed = sme is not None and sme.id == req.sme_id
    elif current_user.role == "lender":
        lender = db.query(Lender).filter(Lender.user_id == current_user.id).first()
        allowed = lender is not None and req.lender_id == lender.id
    if not allowed:
        raise HTTPException(status_code=404, detail="Finance request not found")

    return [
        {"id": m.id, "author_role": m.author_role, "kind": m.kind,
         "message": m.message, "created_at": m.created_at}
        for m in get_request_messages(db, request_id)
    ]


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
    body: RejectBody | None = None,
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
        return reject_finance_request(db, request_id, lender.id, body.reason if body else None)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


def _require_deal_owner(db: Session, request_id: int, user: User) -> None:
    """A lender may only move requests they approved; admins may move any.

    Missing requests fall through so the service raises its usual "not found".
    """
    if user.role == "admin":
        return
    from models.lender import Lender
    lender = db.query(Lender).filter(Lender.user_id == user.id).first()
    req = db.query(FinanceRequest).filter(FinanceRequest.id == request_id).first()
    if req is not None and (lender is None or req.lender_id != lender.id):
        raise HTTPException(status_code=403, detail="You can only update requests you approved")


@router.put("/funded/{request_id}", response_model=FinanceRequestResponse)
def mark_request_funded(
    request_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in {"lender", "admin"}:
        raise HTTPException(status_code=403, detail="Only lenders or admins can mark requests as funded")

    _require_deal_owner(db, request_id, current_user)
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

    _require_deal_owner(db, request_id, current_user)
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

    _require_deal_owner(db, request_id, current_user)
    try:
        return mark_finance_request_closed(db, request_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
