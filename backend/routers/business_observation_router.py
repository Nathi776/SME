"""
routers/business_observation_router.py

API endpoints for longitudinal SME business observations.
"""

from datetime import datetime
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session

from database import get_db
from models.business_observation import BusinessObservation
from models.sme import SME
from models.user import User
from services.auth_service import get_current_user
from services.business_observation_service import (
    create_current_business_observation,
    get_business_observations,
    get_latest_business_observation,
)


router = APIRouter(
    prefix="/business-observations",
    tags=["Business Observations"],
)


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class BusinessObservationCreate(BaseModel):
    """
    Information that cannot reliably be inferred from the SME database.

    Most business-state fields are deliberately NOT accepted here.
    They are captured directly from the current SME/invoice records.
    """

    source: str = "system"
    still_operating: bool | None = None
    additional_data: dict | None = None


class BusinessObservationResponse(BaseModel):
    id: int
    sme_id: int
    observed_at: datetime
    source: str

    still_operating: bool | None
    years_active: int | None

    revenue: Decimal | None
    avg_monthly_balance: Decimal | None
    avg_monthly_income: Decimal | None
    avg_monthly_expenses: Decimal | None

    total_invoices: int | None
    paid_on_time: int | None
    unpaid_invoices: int | None

    overdraft_count: int | None
    income_regularity: Decimal | None
    months_analysed: int | None
    parsed_revenue: Decimal | None

    industry: str | None
    province: str | None
    business_city: str | None

    additional_data: dict | None

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Access control
# ---------------------------------------------------------------------------

def check_sme_access(
    current_user: User,
    sme: SME,
):
    """
    SMEs may access their own observations.

    Lenders and admins may access observations for any SME.
    """

    if current_user.role in {"admin", "lender"}:
        return

    if sme.user_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="Unauthorized",
        )


def get_sme_or_404(
    sme_id: int,
    db: Session,
) -> SME:
    sme = (
        db.query(SME)
        .filter(SME.id == sme_id)
        .first()
    )

    if not sme:
        raise HTTPException(
            status_code=404,
            detail="SME not found",
        )

    return sme


# ---------------------------------------------------------------------------
# Create observation
# ---------------------------------------------------------------------------

@router.post(
    "/{sme_id}",
    response_model=BusinessObservationResponse,
)
def create_observation(
    sme_id: int,
    observation_data: BusinessObservationCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Capture the SME's current business state.

    This creates a new immutable point-in-time observation.
    """

    sme = get_sme_or_404(sme_id, db)

    check_sme_access(
        current_user,
        sme,
    )

    observation = create_current_business_observation(
        db=db,
        sme=sme,
        source=observation_data.source,
        still_operating=observation_data.still_operating,
        additional_data=observation_data.additional_data,
    )

    return observation


# ---------------------------------------------------------------------------
# Get observation history
# ---------------------------------------------------------------------------

@router.get(
    "/{sme_id}",
    response_model=list[BusinessObservationResponse],
)
def get_observation_history(
    sme_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Return all observations for an SME in chronological order.
    """

    sme = get_sme_or_404(sme_id, db)

    check_sme_access(
        current_user,
        sme,
    )

    return get_business_observations(
        db=db,
        sme_id=sme_id,
    )


# ---------------------------------------------------------------------------
# Get latest observation
# ---------------------------------------------------------------------------

@router.get(
    "/{sme_id}/latest",
    response_model=BusinessObservationResponse,
)
def get_latest_observation(
    sme_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Return the most recent observation for an SME.
    """

    sme = get_sme_or_404(sme_id, db)

    check_sme_access(
        current_user,
        sme,
    )

    observation = get_latest_business_observation(
        db=db,
        sme_id=sme_id,
    )

    if not observation:
        raise HTTPException(
            status_code=404,
            detail="No business observations found for this SME",
        )

    return observation