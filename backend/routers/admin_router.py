from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models.api_key import APIKey
from services.auth_service import get_current_user
from models.user import User
from models.lender import Lender
from config import get_settings
settings = get_settings()
from core.time_utils import utc_now

router = APIRouter(prefix="/admin", tags=["Admin API Keys"])

@router.get("/api-keys")
def list_api_keys(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get all generated API keys (Admin only).
    """
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can view API keys"
        )

    keys = db.query(APIKey).order_by(APIKey.created_at.desc()).all()
    return [
        {
            "id": k.id,
            "name": k.name,
            "consumer_type": k.consumer_type,
            "created_at": k.created_at.isoformat() + "Z" if k.created_at else None,
            "last_used_at": k.last_used_at.isoformat() + "Z" if k.last_used_at else None,
            "is_active": k.is_active
        }
        for k in keys
    ]

@router.delete("/api-keys/{key_id}")
def revoke_api_key(
    key_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Revoke a generated API key (Admin only).
    """
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can revoke API keys"
        )

    key_record = db.query(APIKey).filter(APIKey.id == key_id).first()
    if not key_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API key not found"
        )

    key_record.is_active = False
    db.commit()
    return {"message": "API key revoked successfully"}


# ── Lender approval ───────────────────────────────────────────────────────────

def _require_admin(user: User):
    if user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admins only")


def _lender_row(l: Lender) -> dict:
    return {
        "id": l.id,
        "user_id": l.user_id,
        "organization_name": l.organization_name,
        "contact_email": l.contact_email,
        "approval_status": l.approval_status,
        "email_verified": bool(l.user and l.user.email_verified_at),
        "approved_at": l.approved_at.isoformat() + "Z" if l.approved_at else None,
    }


def _set_lender_status(db: Session, lender_id: int, admin: User, new_status: str) -> dict:
    _require_admin(admin)
    lender = db.query(Lender).filter(Lender.id == lender_id).first()
    if not lender:
        raise HTTPException(status_code=404, detail="Lender not found")
    if new_status == "approved":
        if settings.require_verified_email_for_lenders and not (lender.user and lender.user.email_verified_at):
            raise HTTPException(status_code=400, detail="Lender's email address is not verified")
        lender.approved_at = utc_now()
        lender.approved_by_user_id = admin.id
    lender.approval_status = new_status
    db.commit()
    db.refresh(lender)
    return _lender_row(lender)


@router.get("/lenders")
def list_lenders(
    approval_status: str | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    _require_admin(current_user)
    q = db.query(Lender)
    if approval_status:
        q = q.filter(Lender.approval_status == approval_status)
    return [_lender_row(l) for l in q.order_by(Lender.id).all()]


@router.put("/lenders/{lender_id}/approve")
def approve_lender(lender_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return _set_lender_status(db, lender_id, current_user, "approved")


@router.put("/lenders/{lender_id}/reject")
def reject_lender(lender_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return _set_lender_status(db, lender_id, current_user, "rejected")


@router.put("/lenders/{lender_id}/suspend")
def suspend_lender(lender_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return _set_lender_status(db, lender_id, current_user, "suspended")
