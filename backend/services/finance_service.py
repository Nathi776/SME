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
    Calculate fee rate based on credit score.
    Score 0-40: 8% fee (high risk)
    Score 40-60: 5% fee (medium risk)
    Score 60-80: 3% fee (low risk)
    Score 80+: 1.5% fee (very low risk)
    """
    if credit_score is None:
        return Decimal("0.08")  # Default high risk if no score
    
    if credit_score < 40:
        return Decimal("0.08")
    elif credit_score < 60:
        return Decimal("0.05")
    elif credit_score < 80:
        return Decimal("0.03")
    else:
        return Decimal("0.015")

def calculate_eligible_amount(invoice_amount: Decimal | float | int, credit_score: int | None) -> Decimal:
    """
    Calculate eligible financing amount based on invoice and credit score.
    Base: 80% of invoice
    Adjustments based on score:
    - Score < 40: 60%
    - Score 40-60: 70%
    - Score 60-80: 80%
    - Score 80+: 90%
    """
    invoice_amount = _to_decimal(invoice_amount)
    if credit_score is None or credit_score < 40:
        return invoice_amount * Decimal("0.60")
    elif credit_score < 60:
        return invoice_amount * Decimal("0.70")
    elif credit_score < 80:
        return invoice_amount * Decimal("0.80")
    else:
        return invoice_amount * Decimal("0.90")

def create_finance_request(db: Session, sme_id: int, amount: Decimal | float | int, invoice_id: int):
    """Create a new financing request."""
    amount = _to_decimal(amount)
    sme = db.query(SME).filter(SME.id == sme_id).first()
    if not sme:
        raise ValueError("SME not found")
    
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id, Invoice.sme_id == sme_id).first()
    if not invoice:
        raise ValueError("Invoice not found or does not belong to this SME")
    
    if invoice.status == "paid":
        raise ValueError("Cannot finance a paid invoice")
    
    # Get latest credit score
    latest_score = (
        db.query(CreditScore)
        .filter(CreditScore.sme_id == sme_id)
        .order_by(CreditScore.created_at.desc())
        .first()
    )
    
    score_value = latest_score.score if latest_score else None
    fee_rate = calculate_fee_rate(score_value)
    eligible_amount = calculate_eligible_amount(invoice.amount, score_value)

    if amount > invoice.amount:
        raise ValueError("Requested amount cannot exceed invoice amount")

    if amount > eligible_amount:
        raise ValueError("Requested amount exceeds eligible financing amount")
    
    request = FinanceRequest(
        sme_id=sme_id,
        invoice_id=invoice_id,
        amount_requested=amount,
        approved_amount=None,
        fee_rate=fee_rate,
        status="pending",
        credit_score_id=latest_score.id if latest_score else None
    )
    db.add(request)
    db.commit()
    db.refresh(request)
    return request

def get_finance_requests(db: Session, sme_id: int):
    """Retrieve all finance requests for a specific SME."""
    return db.query(FinanceRequest).filter(FinanceRequest.sme_id == sme_id).all()

def get_pending_finance_requests(db: Session, lender_id: int = None):
    """Get pending finance requests for a lender to review."""
    query = db.query(FinanceRequest).filter(FinanceRequest.status == "pending")
    if lender_id:
        query = query.filter(FinanceRequest.lender_id == lender_id)
    return query.all()

def approve_finance_request(db: Session, request_id: int, lender_id: int, approved_amount: Decimal | float | int):
    """Approve a finance request by a lender."""
    approved_amount = _to_decimal(approved_amount)
    req = db.query(FinanceRequest).filter(FinanceRequest.id == request_id).first()
    if not req:
        raise ValueError("Finance request not found")
    
    if req.status != "pending":
        raise ValueError(f"Cannot approve request with status: {req.status}")
    
    # Validate approved amount doesn't exceed requested
    if approved_amount > req.amount_requested:
        raise ValueError("Approved amount cannot exceed requested amount")
    
    # Verify lender exists
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
    """Reject a finance request."""
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
    """Mark an approved finance request as funded by the lender."""
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
    """Mark a funded finance request as paid when the invoice is settled by the client."""
    req = db.query(FinanceRequest).filter(FinanceRequest.id == request_id).first()
    if not req:
        raise ValueError("Finance request not found")

    if req.status != "funded":
        raise ValueError("Only funded requests can be marked as paid")

    if req.invoice:
        req.invoice.status = "paid"

    req.status = "paid"
    db.commit()
    db.refresh(req)
    return req


def mark_finance_request_closed(db: Session, request_id: int):
    """Mark a paid finance request as closed to finalize the lifecycle."""
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
    """Backward-compatible alias for legacy code paths now mapped to paid."""
    return mark_finance_request_paid(db, request_id)
