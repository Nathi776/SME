from sqlalchemy.orm import Session
from models.finance_request import FinanceRequest
from models.sme import SME
from models.invoice import Invoice

def create_finance_request(db: Session, sme_id: int, amount: float, purpose: str):
    """Create a new financing request."""
    sme = db.query(SME).filter(SME.id == sme_id).first()
    if not sme:
        raise ValueError("SME not found")

    request = FinanceRequest(sme_id=sme_id, amount=amount, purpose=purpose, status="Pending")
    db.add(request)
    db.commit()
    db.refresh(request)
    return request

def get_finance_requests(db: Session, sme_id: int):
    """Retrieve all finance requests for a specific SME."""
    return db.query(FinanceRequest).filter(FinanceRequest.sme_id == sme_id).all()

def approve_finance_request(db: Session, request_id: int):
    """Approve a finance request."""
    req = db.query(FinanceRequest).filter(FinanceRequest.id == request_id).first()
    if not req:
        raise ValueError("Finance request not found")

    req.status = "Approved"
    db.commit()
    return req
