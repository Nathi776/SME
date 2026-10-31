from datetime import datetime
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse, RedirectResponse
from sqlalchemy.orm import Session
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field
from database import get_db
from models.invoice import Invoice
from models.sme import SME
from models.user import User
from models.lender import Lender
from services.storage_service import InvalidUpload, resolve_document, save_uploaded_file
from services.auth_service import get_current_user
from services.finance_service import (
    mark_finance_request_paid,
    mark_invoice_paid as set_invoice_paid,
)

router = APIRouter(prefix="/invoices", tags=["Invoices"])

# ---------- Pydantic Schemas ----------
class InvoiceCreate(BaseModel):
    client_name: str
    description: str | None = None
    amount: Decimal = Field(..., ge=0)
    invoice_number: str | None = None
    issue_date: datetime | None = None
    due_date: datetime | None = None
    currency: str | None = "ZAR"
    customer_company: str | None = None
    contact_person: str | None = None
    email: str | None = None
    phone: str | None = None
    customer_industry: str | None = None
    payment_terms: int | None = None

class InvoiceUpdate(BaseModel):
    client_name: str | None = None
    description: str | None = None
    amount: Decimal | None = Field(default=None, ge=0)
    status: str | None = None
    invoice_number: str | None = None
    issue_date: datetime | None = None
    due_date: datetime | None = None
    currency: str | None = None
    customer_company: str | None = None
    contact_person: str | None = None
    email: str | None = None
    phone: str | None = None
    customer_industry: str | None = None
    payment_terms: int | None = None

    model_config = ConfigDict(from_attributes=True)


def _mark_related_finance_requests_paid(db: Session, invoice: Invoice) -> None:
    for finance_request in invoice.finance_requests:
        # Only mark related finance requests as paid when they have been funded.
        if finance_request.status == "funded":
            mark_finance_request_paid(db, finance_request.id)

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
        invoice_number=request.invoice_number,
        issue_date=request.issue_date,
        due_date=request.due_date,
        currency=request.currency or "ZAR",
        customer_company=request.customer_company,
        contact_person=request.contact_person,
        email=request.email,
        phone=request.phone,
        customer_industry=request.customer_industry,
        payment_terms=request.payment_terms,
        status="pending"
    )
    db.add(invoice)
    db.commit()
    db.refresh(invoice)
    # Return the created invoice object so frontend receives full invoice details
    return {"message": "Invoice created successfully", "invoice": invoice}

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

    updates = request.model_dump(exclude_unset=True)
    requested_status = updates.pop("status", None)
    mark_related_finance_requests_paid = (
        requested_status is not None
        and requested_status.lower() == "paid"
    )

    for key, value in updates.items():
        setattr(invoice, key, value)

    if requested_status is not None:
        if requested_status.lower() == "paid":
            set_invoice_paid(invoice)
        else:
            invoice.status = requested_status
            invoice.paid_at = None

    db.commit()
    db.refresh(invoice)

    if mark_related_finance_requests_paid:
        _mark_related_finance_requests_paid(db, invoice)

    return {"message": "Invoice updated successfully", "invoice": invoice}

# ---------- Mark Invoice Paid ----------
@router.put("/{invoice_id}/paid")
def mark_invoice_paid(
    invoice_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    sme = db.query(SME).filter(SME.id == invoice.sme_id).first()
    if not sme or sme.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only update your own invoices")

    set_invoice_paid(invoice)
    db.commit()
    db.refresh(invoice)

    _mark_related_finance_requests_paid(db, invoice)

    return {"message": "Invoice marked as paid successfully", "invoice": invoice}

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



# ---------- Invoice PDF (private storage) ----------
MAX_INVOICE_PDF_BYTES = 10 * 1024 * 1024


def _own_invoice_or_404(db: Session, invoice_id: int, user: User) -> Invoice:
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    sme = db.query(SME).filter(SME.user_id == user.id).first() if user.role == "sme" else None
    if not invoice or not sme or invoice.sme_id != sme.id:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return invoice


@router.post("/{invoice_id}/pdf")
def upload_invoice_pdf(
    invoice_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Attach (or replace) the invoice PDF. Only the owning business can do this."""
    invoice = _own_invoice_or_404(db, invoice_id, current_user)
    if not (file.filename or "").lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Invoices must be uploaded as PDF files.")
    file.file.seek(0, 2)
    size = file.file.tell()
    file.file.seek(0)
    if size > MAX_INVOICE_PDF_BYTES:
        raise HTTPException(status_code=413, detail="File too large (max 10 MB).")
    try:
        _, reference = save_uploaded_file(file)
    except InvalidUpload as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    invoice.pdf_url = reference
    db.commit()
    return {"id": invoice.id, "has_pdf": True, "pdf_path": f"/invoices/{invoice.id}/pdf"}


@router.get("/{invoice_id}/pdf")
def download_invoice_pdf(
    invoice_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """The owner, an admin, or a lender with a live request on this invoice."""
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    allowed = False
    if invoice:
        if current_user.role == "admin":
            allowed = True
        elif current_user.role == "sme":
            sme = db.query(SME).filter(SME.user_id == current_user.id).first()
            allowed = sme is not None and invoice.sme_id == sme.id
        elif current_user.role == "lender":
            lender = db.query(Lender).filter(Lender.user_id == current_user.id).first()
            allowed = lender is not None and any(
                r.status in {"pending", "info_requested", "approved", "funded", "paid"}
                and r.lender_id in (None, lender.id)
                for r in invoice.finance_requests
            )
    if not allowed:
        raise HTTPException(status_code=404, detail="Invoice not found")
    access = resolve_document(invoice.pdf_url)
    if access is None:
        raise HTTPException(status_code=404, detail="No PDF is attached to this invoice")
    if access.kind == "redirect":
        return RedirectResponse(access.location, status_code=307)
    return FileResponse(access.location, filename=access.filename, content_disposition_type="attachment")
