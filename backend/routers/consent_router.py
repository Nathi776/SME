"""
routers/consent_router.py

Lets a signed-in user see, grant and withdraw consent for optional data uses.
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models.data_consent import DataConsent
from models.user import User
from services.auth_service import get_current_user
from services.consent_service import (
    CONSENT_POLICY_VERSION,
    PURPOSES,
    UnknownPurpose,
    latest_consent,
    record_consent,
)

router = APIRouter(prefix="/consent", tags=["Consent"])


class ConsentChoice(BaseModel):
    granted: bool


def _state(db: Session, user: User, purpose: str) -> dict:
    row = latest_consent(db, user.id, purpose)
    return {
        "purpose": purpose,
        "description": PURPOSES[purpose],
        "granted": bool(row and row.granted),
        "decided": row is not None,
        "policy_version": row.policy_version if row else None,
        "recorded_at": row.recorded_at if row else None,
        "current_policy_version": CONSENT_POLICY_VERSION,
    }


@router.get("/policy")
def consent_policy():
    """The exact wording shown to users, with its version. No sign-in needed."""
    return {
        "policy_version": CONSENT_POLICY_VERSION,
        "purposes": [{"purpose": k, "description": v} for k, v in PURPOSES.items()],
    }


@router.get("")
def my_consents(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return {"consents": [_state(db, current_user, p) for p in PURPOSES]}


@router.get("/history")
def my_consent_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    rows = (
        db.query(DataConsent)
        .filter(DataConsent.user_id == current_user.id)
        .order_by(DataConsent.id.asc())
        .all()
    )
    return [
        {
            "purpose": r.purpose,
            "granted": r.granted,
            "policy_version": r.policy_version,
            "source": r.source,
            "recorded_at": r.recorded_at,
        }
        for r in rows
    ]


@router.put("/{purpose}")
def set_consent(
    purpose: str,
    choice: ConsentChoice,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        record_consent(db, current_user.id, purpose, choice.granted, source="portal")
    except UnknownPurpose:
        raise HTTPException(status_code=404, detail="Unknown consent purpose")
    return _state(db, current_user, purpose)
