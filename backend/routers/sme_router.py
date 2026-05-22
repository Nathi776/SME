from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from decimal import Decimal
from datetime import datetime

from models.sme import SME
from models.user import User

from models.credit_score import CreditScore
from models.finance_request import FinanceRequest
from models.invoice import Invoice

from pydantic import BaseModel, ConfigDict, Field
from typing import List
from services.auth_service import get_current_user
from services.scoring_service import calculate_credit_score
from services.finance_service import calculate_eligible_amount


router = APIRouter(
    prefix="/smes",
    tags=["SMEs"]
)

# ---------- Pydantic Schemas ----------
class SMEBase(BaseModel):
    name: str
    industry: str
    revenue: Decimal = Field(..., ge=0)

class SMECreated(SMEBase):
    id: int

    model_config = ConfigDict(from_attributes=True)


class DashboardInvoiceItem(BaseModel):
    id: int
    client_name: str
    amount: Decimal
    status: str | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DashboardFinanceRequestItem(BaseModel):
    id: int
    invoice_id: int
    invoice_client_name: str | None
    amount_requested: Decimal
    approved_amount: Decimal | None
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DashboardActivityItem(BaseModel):
    kind: str
    text: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class DashboardResponse(BaseModel):
    sme_id: int
    sme_name: str
    industry: str
    revenue: Decimal
    username: str
    invoice_count: int
    outstanding_balance: Decimal
    credit_score: int | None
    finance_requests: int
    funded_amount: Decimal
    eligible_amount: Decimal
    requested_amount: Decimal
    approved_amount: Decimal
    recent_invoices: list[DashboardInvoiceItem]
    recent_finance_requests: list[DashboardFinanceRequestItem]
    recent_activity: list[DashboardActivityItem]

    model_config = ConfigDict(from_attributes=True)

# ---------- CRUD Endpoints ----------

# ✅ Create SME
@router.post("/", response_model=SMECreated)
def create_sme(
    sme: SMEBase,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == current_user.id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found. Cannot link SME.")

    existing_sme = db.query(SME).filter(SME.user_id == current_user.id).first()
    if existing_sme:
        raise HTTPException(status_code=400, detail="SME profile already exists for this user")

    new_sme = SME(
        name=sme.name,
        industry=sme.industry,
        revenue=sme.revenue,
        user_id=current_user.id
    )
    db.add(new_sme)
    db.flush()

    initial_score = calculate_credit_score(new_sme.revenue, new_sme.years_active, 0)
    db.add(
        CreditScore(
            sme_id=new_sme.id,
            score=initial_score,
            created_at=datetime.utcnow(),
        )
    )

    db.commit()
    db.refresh(new_sme)
    return new_sme


# ✅ Dashboad
@router.get("/dashboard", response_model=DashboardResponse)
def sme_dashboard(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    sme = db.query(SME).filter(SME.user_id == current_user.id).first()

    if not sme:
        raise HTTPException(status_code=404, detail="SME profile not found")

    invoices = (
        db.query(Invoice)
        .filter(Invoice.sme_id == sme.id)
        .order_by(Invoice.created_at.desc())
        .all()
    )
    finance_requests = (
        db.query(FinanceRequest)
        .filter(FinanceRequest.sme_id == sme.id)
        .order_by(FinanceRequest.created_at.desc())
        .all()
    )

    outstanding_balance = sum(
        (i.amount for i in invoices if (i.status or "").lower() != "paid"),
        Decimal("0.00"),
    )

    latest_score = (
        db.query(CreditScore)
        .filter(CreditScore.sme_id == sme.id)
        .order_by(CreditScore.created_at.desc())
        .first()
    )

    score_value = int(round(latest_score.score)) if latest_score else None
    requested_amount = sum((request.amount_requested for request in finance_requests), Decimal("0.00"))
    approved_amount = sum(
        (request.approved_amount for request in finance_requests if request.approved_amount is not None),
        Decimal("0.00"),
    )
    funded_amount = sum(
        (
            request.approved_amount
            for request in finance_requests
            if request.approved_amount is not None and request.status in {"approved", "paid"}
        ),
        Decimal("0.00"),
    )
    eligible_amount = sum(
        (
            calculate_eligible_amount(invoice.amount, score_value)
            for invoice in invoices
            if (invoice.status or "").lower() != "paid"
        ),
        Decimal("0.00"),
    )

    recent_invoices = [
        DashboardInvoiceItem(
            id=invoice.id,
            client_name=invoice.client_name,
            amount=invoice.amount,
            status=invoice.status,
            created_at=invoice.created_at,
        )
        for invoice in invoices[:4]
    ]

    recent_finance_requests = [
        DashboardFinanceRequestItem(
            id=request.id,
            invoice_id=request.invoice_id,
            invoice_client_name=request.invoice.client_name if request.invoice else None,
            amount_requested=request.amount_requested,
            approved_amount=request.approved_amount,
            status=request.status,
            created_at=request.created_at,
        )
        for request in finance_requests[:4]
    ]

    activity_items: list[DashboardActivityItem] = []
    for invoice in invoices[:2]:
        if (invoice.status or "").lower() == "paid":
            activity_text = f"Invoice {invoice.client_name} marked paid"
        else:
            activity_text = f"New invoice {invoice.client_name} uploaded"
        activity_items.append(
            DashboardActivityItem(
                kind="invoice",
                text=activity_text,
                created_at=invoice.created_at,
            )
        )

    for request in finance_requests[:2]:
        label = request.invoice.client_name if request.invoice else f"Invoice #{request.invoice_id}"
        if request.status == "approved":
            activity_text = f"Finance request for {label} was approved"
        elif request.status == "rejected":
            activity_text = f"Finance request for {label} was rejected"
        elif request.status == "paid":
            activity_text = f"Finance request for {label} was paid"
        else:
            activity_text = f"Finance request for {label} was submitted"
        activity_items.append(
            DashboardActivityItem(
                kind="finance_request",
                text=activity_text,
                created_at=request.created_at,
            )
        )

    if latest_score:
        activity_items.append(
            DashboardActivityItem(
                kind="credit_score",
                text=f"Credit score updated to {score_value}",
                created_at=latest_score.created_at,
            )
        )

    recent_activity = sorted(activity_items, key=lambda item: item.created_at, reverse=True)[:4]

    return {
        "sme_id": sme.id,
        "sme_name": sme.name,
        "industry": sme.industry,
        "revenue": sme.revenue,
        "username": current_user.username,
        "invoice_count": len(invoices),
        "outstanding_balance": outstanding_balance,
        "credit_score": score_value,
        "finance_requests": len(finance_requests),
        "funded_amount": funded_amount,
        "eligible_amount": eligible_amount,
        "requested_amount": requested_amount,
        "approved_amount": approved_amount,
        "recent_invoices": recent_invoices,
        "recent_finance_requests": recent_finance_requests,
        "recent_activity": recent_activity,
    }



# ✅ Get all SMEs
@router.get("/", response_model=List[SMECreated])
def get_all_smes(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role not in {"admin", "lender"}:
        raise HTTPException(status_code=403, detail="Unauthorized")

    smes = db.query(SME).all()
    return smes


# ✅ Get SME by ID
@router.get("/{sme_id}", response_model=SMECreated)
def get_sme(
    sme_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    sme = db.query(SME).filter(SME.id == sme_id).first()
    if not sme:
        raise HTTPException(status_code=404, detail="SME not found.")

    if current_user.role not in {"admin", "lender"} and sme.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Unauthorized")
    return sme


# ✅ Update SME
@router.put("/{sme_id}", response_model=SMECreated)
def update_sme(
    sme_id: int,
    updated_sme: SMEBase,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    sme = db.query(SME).filter(SME.id == sme_id).first()
    if not sme:
        raise HTTPException(status_code=404, detail="SME not found.")

    if sme.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only update your own SME profile")

    sme.name = updated_sme.name
    sme.industry = updated_sme.industry
    sme.revenue = updated_sme.revenue
    db.commit()
    db.refresh(sme)
    return sme


# ✅ Delete SME
@router.delete("/{sme_id}")
def delete_sme(
    sme_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    sme = db.query(SME).filter(SME.id == sme_id).first()
    if not sme:
        raise HTTPException(status_code=404, detail="SME not found.")

    if sme.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only delete your own SME profile")

    db.delete(sme)
    db.commit()
    return {"message": f"SME with ID {sme_id} deleted successfully."}

