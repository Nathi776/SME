from decimal import Decimal

from sqlalchemy.orm import Session
from datetime import datetime
from models.finance_request import FinanceRequest
from models.sme import SME
from models.invoice import Invoice
from models.credit_score import CreditScore
from models.lender import Lender
from config import get_settings


PLATFORM_FEE_RATE = get_settings().platform_fee_rate


def _to_decimal(value: Decimal | float | int) -> Decimal:
    if isinstance(value, Decimal):
        return value
    return Decimal(str(value))


def calculate_fee_rate(credit_score: int | None) -> Decimal:
    """
    Fee rate based on credit score.
    Score 0–50:  8%    (high risk / declined band)
    Score 50–75: 5%    (review band)
    Score 75–85: 2.5%  (approved, standard)
    Score 85+:   1.5%  (approved, strong)
    Aligned with decision thresholds in core/scoring.py.
    """
    if credit_score is None:
        return Decimal("0.08")
    if credit_score < 50:
        return Decimal("0.08")
    elif credit_score < 75:
        return Decimal("0.05")
    elif credit_score < 85:
        return Decimal("0.025")
    else:
        return Decimal("0.015")


def calculate_eligible_amount(
    base_amount: Decimal | float | int,
    credit_score: int | None,
) -> Decimal:
    """
    Eligible financing amount as a % of the base amount.
    For invoice-backed requests, base_amount = invoice amount.
    For pre-invoice requests,    base_amount = requested amount (capped by this fn).
    """
    base_amount = _to_decimal(base_amount)
    if credit_score is None or credit_score < 50:
        return base_amount * Decimal("0.60")
    elif credit_score < 75:
        return base_amount * Decimal("0.70")
    elif credit_score < 85:
        return base_amount * Decimal("0.80")
    else:
        return base_amount * Decimal("0.90")


def create_finance_request(
    db: Session,
    sme_id: int,
    amount: Decimal | float | int,
    invoice_id: int | None = None,          # None → pre-invoice request
    purpose_of_funding: str | None = None,
    preferred_payout_date: datetime | None = None,
    additional_notes: str | None = None,
):
    """
    Create a financing request.

    Two paths:
    - invoice_id provided → invoice-backed (traditional)
    - invoice_id is None  → pre-invoice (scored on business signals only)
    """
    amount = _to_decimal(amount)

    sme = db.query(SME).filter(SME.id == sme_id).first()
    if not sme:
        raise ValueError("SME not found")

    # Latest credit score — required for both paths
    latest_score = (
        db.query(CreditScore)
        .filter(CreditScore.sme_id == sme_id)
        .order_by(CreditScore.created_at.desc())
        .first()
    )
    score_value = int(latest_score.score) if latest_score else None

    # ── Invoice-backed path ──────────────────────────────────────────────────
    if invoice_id is not None:
        invoice = db.query(Invoice).filter(
            Invoice.id == invoice_id,
            Invoice.sme_id == sme_id,
        ).first()

        if not invoice:
            raise ValueError("Invoice not found or does not belong to this SME")
        if invoice.status == "paid":
            raise ValueError("Cannot finance a paid invoice")

        fee_rate = calculate_fee_rate(score_value)
        eligible_amount = calculate_eligible_amount(invoice.amount, score_value)

        if amount > invoice.amount:
            raise ValueError("Requested amount cannot exceed invoice amount")
        if amount > eligible_amount:
            raise ValueError("Requested amount exceeds eligible financing amount")

        request = FinanceRequest(
            sme_id=sme_id,
            invoice_id=invoice_id,
            request_type="invoice_backed",
            amount_requested=amount,
            approved_amount=None,
            fee_rate=fee_rate,
            purpose_of_funding=purpose_of_funding,
            preferred_payout_date=preferred_payout_date,
            additional_notes=additional_notes,
            status="pending",
            credit_score_id=latest_score.id if latest_score else None,
        )

    # ── Pre-invoice path ─────────────────────────────────────────────────────
    else:
        # Pre-invoice requests need at least a Review-band score to proceed.
        # A Declined SME (score < 50) cannot access pre-invoice funding.
        if score_value is None:
            raise ValueError(
                "A credit score is required before applying for pre-invoice funding. "
                "Please complete your profile and generate a score first."
            )
        if score_value < 50:
            raise ValueError(
                f"Your current credit score ({score_value}) does not meet the minimum "
                "threshold for pre-invoice funding. Improve your score by verifying "
                "your documents and updating your business profile."
            )

        fee_rate = calculate_fee_rate(score_value)
        # For pre-invoice, eligible amount is a % of what they asked for —
        # effectively capping how much can be approved against a pure score.
        eligible_amount = calculate_eligible_amount(amount, score_value)

        if amount > eligible_amount:
            # Auto-cap rather than reject — lender still sees the real eligible amount
            amount = eligible_amount

        request = FinanceRequest(
            sme_id=sme_id,
            invoice_id=None,
            request_type="pre_invoice",
            amount_requested=amount,
            approved_amount=None,
            fee_rate=fee_rate,
            purpose_of_funding=purpose_of_funding,
            preferred_payout_date=preferred_payout_date,
            additional_notes=additional_notes,
            status="pending",
            credit_score_id=latest_score.id if latest_score else None,
        )

    db.add(request)
    db.commit()
    db.refresh(request)
    return request


def get_finance_requests(db: Session, sme_id: int):
    return db.query(FinanceRequest).filter(FinanceRequest.sme_id == sme_id).all()


def get_pending_finance_requests(db: Session, lender_id: int = None):
    query = db.query(FinanceRequest).filter(FinanceRequest.status == "pending")
    if lender_id:
        query = query.filter(FinanceRequest.lender_id == lender_id)
    return query.all()


def approve_finance_request(
    db: Session,
    request_id: int,
    lender_id: int,
    approved_amount: Decimal | float | int,
):
    approved_amount = _to_decimal(approved_amount)
    req = db.query(FinanceRequest).filter(FinanceRequest.id == request_id).first()
    if not req:
        raise ValueError("Finance request not found")
    if req.status != "pending":
        raise ValueError(f"Cannot approve request with status: {req.status}")
    if approved_amount > req.amount_requested:
        raise ValueError("Approved amount cannot exceed requested amount")

    lender = db.query(Lender).filter(Lender.id == lender_id).first()
    if not lender:
        raise ValueError("Lender not found")

    platform_fee = approved_amount * PLATFORM_FEE_RATE
    net_amount = approved_amount - platform_fee

    req.lender_id = lender_id
    req.approved_amount = approved_amount
    req.platform_fee = platform_fee
    req.net_amount = net_amount
    req.status = "approved"
    req.approved_at = datetime.utcnow()

    db.commit()
    db.refresh(req)
    return req


def reject_finance_request(db: Session, request_id: int, lender_id: int):
    req = db.query(FinanceRequest).filter(FinanceRequest.id == request_id).first()
    if not req:
        raise ValueError("Finance request not found")
    if req.status != "pending":
        raise ValueError(f"Cannot reject request with status: {req.status}")

    req.lender_id = lender_id
    req.status = "rejected"
    req.approved_at = datetime.utcnow()

    db.commit()
    db.refresh(req)
    return req


def mark_finance_request_funded(db: Session, request_id: int):
    req = db.query(FinanceRequest).filter(FinanceRequest.id == request_id).first()
    if not req:
        raise ValueError("Finance request not found")
    if req.status != "approved":
        raise ValueError("Only approved requests can be marked as funded")

    req.status = "funded"
    db.commit()
    db.refresh(req)
    return req


def mark_finance_request_paid(db: Session, request_id: int):
    req = db.query(FinanceRequest).filter(FinanceRequest.id == request_id).first()
    if not req:
        raise ValueError("Finance request not found")
    if req.status != "funded":
        raise ValueError("Only funded requests can be marked as paid")

    # Only update invoice status if this was an invoice-backed request
    if req.invoice:
        req.invoice.status = "paid"

    req.status = "paid"
    db.commit()
    db.refresh(req)
    return req


def mark_finance_request_closed(db: Session, request_id: int):
    req = db.query(FinanceRequest).filter(FinanceRequest.id == request_id).first()
    if not req:
        raise ValueError("Finance request not found")
    if req.status != "paid":
        raise ValueError("Only paid requests can be closed")

    req.status = "closed"
    db.commit()
    db.refresh(req)
    return req


def mark_finance_request_completed(db: Session, request_id: int):
    """Backward-compatible alias."""
    return mark_finance_request_paid(db, request_id)
