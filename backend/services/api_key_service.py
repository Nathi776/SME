import secrets
from datetime import datetime
from fastapi import Header, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
from models.api_key import APIKey
from services.auth_service import pwd_context

def generate_api_key() -> tuple[str, str]:
    """
    Generate a random 40-character key using secrets.token_urlsafe(30)
    and hash it with bcrypt using passlib's pwd_context.
    Returns (raw_key, hashed_key).
    """
    raw_key = secrets.token_urlsafe(30)
    hashed_key = pwd_context.hash(raw_key)
    return raw_key, hashed_key

def verify_api_key(raw_key: str, db: Session) -> APIKey | None:
    """
    Query all active API keys from the DB.
    Compare the raw key with each stored key_hash using pwd_context.verify.
    If a match is found, update last_used_at and return the APIKey record.
    If no match is found, return None.
    """
    active_keys = db.query(APIKey).filter(APIKey.is_active == True).all()
    for key_record in active_keys:
        try:
            if pwd_context.verify(raw_key, key_record.key_hash):
                key_record.last_used_at = datetime.utcnow()
                db.commit()
                db.refresh(key_record)
                return key_record
        except Exception:
            continue
    return None

def get_api_key_from_header(
    api_key: str = Header(..., alias="X-API-Key"),
    db: Session = Depends(get_db)
) -> APIKey:
    """
    FastAPI dependency to extract and verify the API key from the X-API-Key header.
    Raises a 401 HTTPException if the key is missing, invalid, or inactive.
    """
    key_record = verify_api_key(api_key, db)
    if key_record is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or inactive API key"
        )
    return key_record
