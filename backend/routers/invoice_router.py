from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db
from models.invoice import Invoice
from models.sme import SME

router = APIRouter(prefix="/invoices", tags=["Invoices"])

# ---------- Pydantic Schemas ----------
class InvoiceCreate(BaseModel):
    sme_id: int
    client_name: str
    amount: float
    due_date: str

class InvoiceUpdate(BaseModel):
    client_name: str | None = None
    amount: float | None = None
    status: str | None = None

# ---------- Create Invoice ----------
@router.post("/")
def create_invoice(request: InvoiceCreate, db: Session = Depends(get_db)):
    sme = db.query(SME).filter(SME.id == request.sme_id).first()
    if not sme:
        raise HTTPException(status_code=404, detail="SME not found")

    invoice = Invoice(
        sme_id=request.sme_id,
        client_name=request.client_name,
        amount=request.amount,
        due_date=request.due_date
    )
    db.add(invoice)
    db.commit()
    db.refresh(invoice)
    return {"message": "Invoice created successfully", "invoice": invoice.id}

# ---------- Get All Invoices ----------
@router.get("/")
def get_all_invoices(db: Session = Depends(get_db)):
    return db.query(Invoice).all()

# ---------- Get Invoices by SME ----------
@router.get("/sme/{sme_id}")
def get_invoices_by_sme(sme_id: int, db: Session = Depends(get_db)):
    invoices = db.query(Invoice).filter(Invoice.sme_id == sme_id).all()
    if not invoices:
        raise HTTPException(status_code=404, detail="No invoices found for this SME")
    return invoices

# ---------- Update Invoice ----------
@router.put("/{invoice_id}")
def update_invoice(invoice_id: int, request: InvoiceUpdate, db: Session = Depends(get_db)):
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    for key, value in request.dict(exclude_unset=True).items():
        setattr(invoice, key, value)
    db.commit()
    db.refresh(invoice)
    return {"message": "Invoice updated successfully", "invoice": invoice}

# ---------- Delete Invoice ----------
@router.delete("/{invoice_id}")
def delete_invoice(invoice_id: int, db: Session = Depends(get_db)):
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    db.delete(invoice)
    db.commit()
    return {"message": "Invoice deleted successfully"}
