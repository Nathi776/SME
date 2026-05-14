from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field
from database import get_db
from models.invoice import Invoice
from models.sme import SME
from models.user import User
from services.auth_service import get_current_user

router = APIRouter(prefix="/invoices", tags=["Invoices"])

# ---------- Pydantic Schemas ----------
class InvoiceCreate(BaseModel):
    client_name: str
    description: str | None = None
    amount: Decimal = Field(..., ge=0)

class InvoiceUpdate(BaseModel):
    client_name: str | None = None
    amount: Decimal | None = Field(default=None, ge=0)
    status: str | None = None

    model_config = ConfigDict(from_attributes=True)

# ---------- Create Invoice ----------
@router.post("/")
def create_invoice(
    request: InvoiceCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role != "sme":
        raise HTTPException(status_code=403, detail="Only SMEs can create invoices")

    sme = db.query(SME).filter(SME.user_id == current_user.id).first()
    if not sme:
        raise HTTPException(status_code=404, detail="SME profile not found")

    invoice = Invoice(
        sme_id=sme.id,
        client_name=request.client_name,
        amount=request.amount,
        description=request.description,
        status="pending"
    )
    db.add(invoice)
    db.commit()
    db.refresh(invoice)
    return {"message": "Invoice created successfully", "invoice": invoice.id}

# ---------- Get All Invoices ----------
@router.get("/")
def get_all_invoices(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role == "sme":
        sme = db.query(SME).filter(SME.user_id == current_user.id).first()
        if not sme:
            raise HTTPException(status_code=404, detail="SME profile not found")
        return db.query(Invoice).filter(Invoice.sme_id == sme.id).all()

    if current_user.role in {"lender", "admin"}:
        return db.query(Invoice).all()

    raise HTTPException(status_code=403, detail="Unauthorized")

# ---------- Get Invoices by SME ----------
@router.get("/sme/{sme_id}")
def get_invoices_by_sme(
    sme_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if current_user.role == "sme":
        sme = db.query(SME).filter(SME.user_id == current_user.id).first()
        if not sme or sme.id != sme_id:
            raise HTTPException(status_code=403, detail="You can only view your own invoices")
    elif current_user.role not in {"lender", "admin"}:
        raise HTTPException(status_code=403, detail="Unauthorized")

    invoices = db.query(Invoice).filter(Invoice.sme_id == sme_id).all()
    return invoices

# ---------- Update Invoice ----------
@router.put("/{invoice_id}")
def update_invoice(
    invoice_id: int,
    request: InvoiceUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    sme = db.query(SME).filter(SME.id == invoice.sme_id).first()
    if not sme or sme.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only update your own invoices")

    for key, value in request.model_dump(exclude_unset=True).items():
        setattr(invoice, key, value)
    db.commit()
    db.refresh(invoice)
    return {"message": "Invoice updated successfully", "invoice": invoice}

# ---------- Delete Invoice ----------
@router.delete("/{invoice_id}")
def delete_invoice(
    invoice_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    sme = db.query(SME).filter(SME.id == invoice.sme_id).first()
    if not sme or sme.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only delete your own invoices")

    db.delete(invoice)
    db.commit()
    return {"message": "Invoice deleted successfully"}
