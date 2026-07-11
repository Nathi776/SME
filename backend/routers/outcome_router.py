from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, ConfigDict, Field
from decimal import Decimal
from datetime import datetime

from database import get_db
from models.user import User
from models.sme import SME
from models.sme_outcome import SmeOutcome
from services.auth_service import get_current_user
from services.outcome_service import update_checkin, compute_followed_recommendations

router = APIRouter(prefix="/outcomes", tags=["Outcomes"])


# ── Pydantic Schemas ──────────────────────────────────────────────────────────

class CheckinSubmit(BaseModel):
    interval: int = Field(..., description="Check-in interval in days (90, 180, 365)")
    still_operating: bool
    revenue: Decimal = Field(..., ge=0)
    loan_repaid: bool


class FollowedRecommendation(BaseModel):
    category: str
    action: str
    doc_type: str | None
    impact_pts: float
    impact_score: float
    followed: bool


class SmeOutcomeResponse(BaseModel):
    id: int
    finance_request_id: int
    sme_id: int
    score_at_funding: float
    amount: Decimal
    outstanding_recommendations: list[dict]
    outcome_status: str
    check_in_90_due_at: datetime | None
    check_in_180_due_at: datetime | None
    check_in_365_due_at: datetime | None
    created_at: datetime
    updated_at: datetime

    checkin_90_completed: bool
    checkin_90_date: datetime | None
    checkin_90_still_operating: bool | None
    checkin_90_revenue: Decimal | None
    checkin_90_loan_repaid: bool | None

    checkin_180_completed: bool
    checkin_180_date: datetime | None
    checkin_180_still_operating: bool | None
    checkin_180_revenue: Decimal | None
    checkin_180_loan_repaid: bool | None

    checkin_365_completed: bool
    checkin_365_date: datetime | None
    checkin_365_still_operating: bool | None
    checkin_365_revenue: Decimal | None
    checkin_365_loan_repaid: bool | None

    followed_recommendations: list[FollowedRecommendation] = []

    model_config = ConfigDict(from_attributes=True)


class SectorBreakdown(BaseModel):
    repayment_rate: float
    survival_rate: float
    avg_score_at_funding: float
    total_deals: int


class ProvinceBreakdown(BaseModel):
    repayment_rate: float
    survival_rate: float
    avg_score_at_funding: float
    total_deals: int


class OutcomeAnalyticsResponse(BaseModel):
    repayment_rate: float
    survival_rate: float
    avg_score_at_funding: float
    total_deals: int
    breakdown_by_sector: dict[str, SectorBreakdown]
    breakdown_by_province: dict[str, ProvinceBreakdown]


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/analytics", response_model=OutcomeAnalyticsResponse)
def get_outcome_analytics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Retrieve platform-wide outcome analytics.
    Only accessible by lenders or admins.
    """
    if current_user.role not in {"lender", "admin"}:
        raise HTTPException(status_code=403, detail="Not authorized to view analytics")

    outcomes = db.query(SmeOutcome).all()
    total = len(outcomes)

    if total == 0:
        return OutcomeAnalyticsResponse(
            repayment_rate=0.0,
            survival_rate=0.0,
            avg_score_at_funding=0.0,
            total_deals=0,
            breakdown_by_sector={},
            breakdown_by_province={},
        )

    repaid_count = sum(1 for o in outcomes if o.outcome_status == "repaid")

    # Survival count: still operating in check-ins (if any completed, check latest. Else count as surviving)
    survived_count = 0
    for o in outcomes:
        still_operating = True
        if o.checkin_365_completed:
            still_operating = o.checkin_365_still_operating
        elif o.checkin_180_completed:
            still_operating = o.checkin_180_still_operating
        elif o.checkin_90_completed:
            still_operating = o.checkin_90_still_operating

        if still_operating is not False:
            survived_count += 1

    avg_score = sum(o.score_at_funding for o in outcomes) / total

    # Breakdown by sector (industry)
    sector_data = {}
    for o in outcomes:
        sector = o.sme.industry or "Unknown"
        if sector not in sector_data:
            sector_data[sector] = []
        sector_data[sector].append(o)

    breakdown_by_sector = {}
    for sector, s_outcomes in sector_data.items():
        s_total = len(s_outcomes)
        s_repaid = sum(1 for o in s_outcomes if o.outcome_status == "repaid")

        s_survived = 0
        for o in s_outcomes:
            still_op = True
            if o.checkin_365_completed:
                still_op = o.checkin_365_still_operating
            elif o.checkin_180_completed:
                still_op = o.checkin_180_still_operating
            elif o.checkin_90_completed:
                still_op = o.checkin_90_still_operating
            if still_op is not False:
                s_survived += 1

        breakdown_by_sector[sector] = SectorBreakdown(
            repayment_rate=float(s_repaid) / s_total,
            survival_rate=float(s_survived) / s_total,
            avg_score_at_funding=sum(o.score_at_funding for o in s_outcomes) / s_total,
            total_deals=s_total,
        )

    # Breakdown by province
    province_data = {}
    for o in outcomes:
        province = o.sme.province or "Unknown"
        if province not in province_data:
            province_data[province] = []
        province_data[province].append(o)

    breakdown_by_province = {}
    for province, p_outcomes in province_data.items():
        p_total = len(p_outcomes)
        p_repaid = sum(1 for o in p_outcomes if o.outcome_status == "repaid")

        p_survived = 0
        for o in p_outcomes:
            still_op = True
            if o.checkin_365_completed:
                still_op = o.checkin_365_still_operating
            elif o.checkin_180_completed:
                still_op = o.checkin_180_still_operating
            elif o.checkin_90_completed:
                still_op = o.checkin_90_still_operating
            if still_op is not False:
                p_survived += 1

        breakdown_by_province[province] = ProvinceBreakdown(
            repayment_rate=float(p_repaid) / p_total,
            survival_rate=float(p_survived) / p_total,
            avg_score_at_funding=sum(o.score_at_funding for o in p_outcomes) / p_total,
            total_deals=p_total,
        )

    return OutcomeAnalyticsResponse(
        repayment_rate=float(repaid_count) / total,
        survival_rate=float(survived_count) / total,
        avg_score_at_funding=avg_score,
        total_deals=total,
        breakdown_by_sector=breakdown_by_sector,
        breakdown_by_province=breakdown_by_province,
    )


@router.get("/history", response_model=list[SmeOutcomeResponse])
def get_outcome_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Retrieve outcome history.
    - SMEs see their own outcome history.
    - Lenders and Admins see all outcome records in the system.
    """
    if current_user.role == "sme":
        sme = db.query(SME).filter(SME.user_id == current_user.id).first()
        if not sme:
            raise HTTPException(status_code=404, detail="SME profile not found")
        outcomes = db.query(SmeOutcome).filter(SmeOutcome.sme_id == sme.id).all()
    elif current_user.role in {"lender", "admin"}:
        outcomes = db.query(SmeOutcome).all()
    else:
        raise HTTPException(status_code=403, detail="Not authorized to view outcomes")

    # Populate dynamic followed recommendations for each outcome
    response_list = []
    for o in outcomes:
        followed = compute_followed_recommendations(db, o)
        item = SmeOutcomeResponse.model_validate(o)
        item.followed_recommendations = [FollowedRecommendation(**r) for r in followed]
        response_list.append(item)

    return response_list


@router.post("/{outcome_id}/checkin", response_model=SmeOutcomeResponse)
def submit_checkin(
    outcome_id: int,
    checkin_data: CheckinSubmit,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Submit a check-in for an outcome record at 90, 180, or 365 days.
    - SMEs can check in on their own outcomes.
    - Admins can check in on any outcome.
    """
    outcome = db.query(SmeOutcome).filter(SmeOutcome.id == outcome_id).first()
    if not outcome:
        raise HTTPException(status_code=404, detail="Outcome record not found")

    # Authorize SME: must own the business linked to the outcome
    if current_user.role == "sme":
        sme = db.query(SME).filter(SME.user_id == current_user.id).first()
        if not sme or outcome.sme_id != sme.id:
            raise HTTPException(status_code=403, detail="Not authorized to update this outcome")
    elif current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only SMEs or Admins can submit check-ins")

    try:
        updated = update_checkin(
            db=db,
            outcome_id=outcome_id,
            interval=checkin_data.interval,
            still_operating=checkin_data.still_operating,
            revenue=checkin_data.revenue,
            loan_repaid=checkin_data.loan_repaid,
        )
        followed = compute_followed_recommendations(db, updated)
        resp = SmeOutcomeResponse.model_validate(updated)
        resp.followed_recommendations = [FollowedRecommendation(**r) for r in followed]
        return resp
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
