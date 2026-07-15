from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models.api_key import APIKey
from services.auth_service import get_current_user
from models.user import User

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
