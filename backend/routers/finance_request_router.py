from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from services.finance_service import create_finance_request, get_finance_requests, approve_finance_request

router = APIRouter(prefix="/finance", tags=["Finance Requests"])

@router.post("/apply")
def apply_for_finance(sme_id: int, amount: float, purpose: str, db: Session = Depends(get_db)):
    try:
        request = create_finance_request(db, sme_id, amount, purpose)
        return {"message": "Finance request submitted", "request_id": request.id}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/requests/{sme_id}")
def list_finance_requests(sme_id: int, db: Session = Depends(get_db)):
    return get_finance_requests(db, sme_id)

@router.put("/approve/{request_id}")
def approve_request(request_id: int, db: Session = Depends(get_db)):
    try:
        req = approve_finance_request(db, request_id)
        return {"message": "Finance request approved", "status": req.status}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
