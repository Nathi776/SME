"""
routers/founder_router.py

Endpoints for creating and updating the founder profile.

The founder profile is created once during or after registration,
and can be updated at any time from the SME dashboard.
Every update triggers a score recalculation.
"""
from __future__ import annotations

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session

from database import get_db
from models.user import User
from models.sme import SME
from models.credit_score import CreditScore
from models.founder_profile import FounderProfile
from services.auth_service import get_current_user
from services.scoring_service import score_sme

router = APIRouter(prefix="/founder", tags=["Founder Profile"])

VALID_QUALIFICATIONS = {"none", "matric", "certificate", "diploma", "degree", "postgraduate"}


# ── Schemas ───────────────────────────────────────────────────────────────────

class FounderProfileIn(BaseModel):
    # Identity
    id_number: Optional[str] = None

    # Employment & experience
    prior_employer:            Optional[str]  = None
    prior_job_title:           Optional[str]  = None
    prior_industry:            Optional[str]  = None
    years_industry_experience: Optional[int]  = None
    prior_business_owner:      Optional[bool] = None
    prior_business_name:       Optional[str]  = None

    # Education
    highest_qualification: Optional[str] = None   # must be in VALID_QUALIFICATIONS
    field_of_study:        Optional[str] = None

    # Network & references
    trade_association_member: Optional[bool] = None
    trade_association_name:   Optional[str]  = None
    reference_name:           Optional[str]  = None
    reference_company:        Optional[str]  = None
    reference_phone:          Optional[str]  = None


class FounderProfileOut(FounderProfileIn):
    id:         int
    sme_id:     int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _get_sme_for_user(current_user: User, db: Session) -> SME:
    sme = db.query(SME).filter(SME.user_id == current_user.id).first()
    if not sme:
        raise HTTPException(status_code=404, detail="SME profile not found")
    return sme


def _validate_qualification(qual: Optional[str]) -> None:
    if qual is not None and qual.lower() not in VALID_QUALIFICATIONS:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid qualification '{qual}'. Must be one of: {sorted(VALID_QUALIFICATIONS)}"
        )


def _apply_fields(fp: FounderProfile, data: FounderProfileIn) -> None:
    """Apply all fields from the input schema to the model instance."""
    for field_name, value in data.model_dump(exclude_unset=False).items():
        if hasattr(fp, field_name):
            setattr(fp, field_name, value)
    fp.updated_at = datetime.utcnow()


def _recalculate_score(sme: SME, db: Session) -> float:
    result = score_sme(sme, db)
    db.add(CreditScore(sme_id=sme.id, score=result.score, created_at=datetime.utcnow()))
    return result.score


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/", response_model=FounderProfileOut, status_code=201)
def create_founder_profile(
    data: FounderProfileIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Create the founder profile for the logged-in SME.
    Triggers a score recalculation immediately.
    Returns 409 if a profile already exists (use PUT to update).
    """
    if current_user.role != "sme":
        raise HTTPException(status_code=403, detail="Only SMEs can create a founder profile")

    sme = _get_sme_for_user(current_user, db)
    _validate_qualification(data.highest_qualification)

    existing = db.query(FounderProfile).filter(FounderProfile.sme_id == sme.id).first()
    if existing:
        raise HTTPException(
            status_code=409,
            detail="Founder profile already exists. Use PUT /founder to update it."
        )

    fp = FounderProfile(sme_id=sme.id, created_at=datetime.utcnow())
    _apply_fields(fp, data)
    db.add(fp)
    db.flush()

    new_score = _recalculate_score(sme, db)
    db.commit()
    db.refresh(fp)

    return fp


@router.get("/", response_model=FounderProfileOut)
def get_founder_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return the founder profile for the logged-in SME."""
    if current_user.role != "sme":
        raise HTTPException(status_code=403, detail="Only SMEs can view their founder profile")

    sme = _get_sme_for_user(current_user, db)
    fp  = db.query(FounderProfile).filter(FounderProfile.sme_id == sme.id).first()
    if not fp:
        raise HTTPException(
            status_code=404,
            detail="Founder profile not yet created. POST /founder to create it."
        )
    return fp


@router.put("/", response_model=FounderProfileOut)
def update_founder_profile(
    data: FounderProfileIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Update the founder profile.
    Creates one if it doesn't exist yet (upsert behaviour).
    Triggers a score recalculation on every update.
    """
    if current_user.role != "sme":
        raise HTTPException(status_code=403, detail="Only SMEs can update a founder profile")

    sme = _get_sme_for_user(current_user, db)
    _validate_qualification(data.highest_qualification)

    fp = db.query(FounderProfile).filter(FounderProfile.sme_id == sme.id).first()
    if not fp:
        fp = FounderProfile(sme_id=sme.id, created_at=datetime.utcnow())
        db.add(fp)
        db.flush()

    _apply_fields(fp, data)
    new_score = _recalculate_score(sme, db)
    db.commit()
    db.refresh(fp)

    return fp


@router.get("/score-preview")
def preview_founder_score(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Returns what the Founder Signal factor currently contributes to the score,
    plus what the SME could earn by completing missing fields.
    Used by the score improvement guidance panel.
    """
    if current_user.role != "sme":
        raise HTTPException(status_code=403, detail="Only SMEs can preview their founder score")

    sme = _get_sme_for_user(current_user, db)
    fp  = db.query(FounderProfile).filter(FounderProfile.sme_id == sme.id).first()

    result      = score_sme(sme, db)
    founder_bd  = result.breakdown.get("Founder Signal", {})

    potential_gains = []
    if fp is None or (fp.years_industry_experience or 0) < 5:
        potential_gains.append({
            "action": "Add 5+ years of industry experience",
            "potential_pts": 5,
        })
    if fp is None or not fp.highest_qualification or fp.highest_qualification == "none":
        potential_gains.append({
            "action": "Add your highest qualification (degree/diploma)",
            "potential_pts": 4,
        })
    if fp is None or not fp.prior_business_owner:
        potential_gains.append({
            "action": "Indicate prior business ownership",
            "potential_pts": 3,
        })
    if fp is None or not fp.trade_association_member:
        potential_gains.append({
            "action": "Add trade association membership",
            "potential_pts": 2,
        })
    if fp is None or not fp.reference_name:
        potential_gains.append({
            "action": "Add a business reference",
            "potential_pts": 1,
        })

    return {
        "current_founder_contribution": founder_bd.get("contribution", 0),
        "max_founder_pts":              15,
        "current_total_score":          result.score,
        "potential_gains":              potential_gains,
        "founder_detail":               founder_bd.get("detail"),
    }
