from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
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
    mark_finance_request_paid,
    calculate_fee_rate,
    calculate_eligible_amount
)

router = APIRouter(prefix="/finance", tags=["Finance Requests"])

# ========== Pydantic Schemas ==========

class FinanceRequestCreate(BaseModel):
    invoice_id: int
    amount: float

class FinanceRequestApprove(BaseModel):
    approved_amount: float

class FinanceRequestResponse(BaseModel):
    id: int
    sme_id: int
    amount_requested: float
    approved_amount: float | None
    fee_rate: float
    status: str
    lender_id: int | None
    created_at: datetime
    approved_at: datetime | None

    class Config:
        from_attributes = True

# ========== SME Endpoints ==========

@router.post("/apply")
def apply_for_finance(
    request: FinanceRequestCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Apply for invoice financing."""
    if current_user.role != "sme":
        raise HTTPException(status_code=403, detail="Only SMEs can apply for finance")
    
    from models.sme import SME
    sme = db.query(SME).filter(SME.user_id == current_user.id).first()
    if not sme:
        raise HTTPException(status_code=404, detail="SME profile not found")
    
    try:
        finance_req = create_finance_request(db, sme.id, request.amount, request.invoice_id)
        return {
            "message": "Finance request submitted",
            "request_id": finance_req.id,
            "fee_rate": finance_req.fee_rate,
            "status": finance_req.status
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/requests/{sme_id}")
def list_finance_requests(
    sme_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get finance requests for an SME."""
    from models.sme import SME
    
    # Verify ownership or admin/lender access
    if current_user.role == "sme":
        sme = db.query(SME).filter(SME.user_id == current_user.id).first()
        if not sme or sme.id != sme_id:
            raise HTTPException(status_code=403, detail="You can only view your own requests")
    
    return get_finance_requests(db, sme_id)

@router.get("/requests/{sme_id}")
def list_sme_finance_requests(sme_id: int, db: Session = Depends(get_db)):
    """Get finance requests for a specific SME."""
    return get_finance_requests(db, sme_id)

# ========== Lender Endpoints ==========

@router.get("/pending")
def get_pending_requests(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get pending finance requests for lender review."""
    if current_user.role != "lender":
        raise HTTPException(status_code=403, detail="Only lenders can view pending requests")
    
    from models.lender import Lender
    lender = db.query(Lender).filter(Lender.user_id == current_user.id).first()
    if not lender:
        raise HTTPException(status_code=404, detail="Lender profile not found")
    
    return get_pending_finance_requests(db)

@router.put("/approve/{request_id}", response_model=FinanceRequestResponse)
def approve_request(
    request_id: int,
    approval: FinanceRequestApprove,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Approve a finance request."""
    if current_user.role != "lender":
        raise HTTPException(status_code=403, detail="Only lenders can approve requests")
    
    from models.lender import Lender
    lender = db.query(Lender).filter(Lender.user_id == current_user.id).first()
    if not lender:
        raise HTTPException(status_code=404, detail="Lender profile not found")
    
    try:
        req = approve_finance_request(db, request_id, lender.id, approval.approved_amount)
        return req
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.put("/reject/{request_id}", response_model=FinanceRequestResponse)
def reject_request(
    request_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Reject a finance request."""
    if current_user.role != "lender":
        raise HTTPException(status_code=403, detail="Only lenders can reject requests")
    
    from models.lender import Lender
    lender = db.query(Lender).filter(Lender.user_id == current_user.id).first()
    if not lender:
        raise HTTPException(status_code=404, detail="Lender profile not found")
    
    try:
        req = reject_finance_request(db, request_id, lender.id)
        return req
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
