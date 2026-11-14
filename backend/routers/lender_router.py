from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field
from database import get_db
from models.user import User
from models.lender import Lender
from models.sme import SME
from models.credit_score import CreditScore
from models.finance_request import FinanceRequest
from services.auth_service import get_current_user, get_current_user_allow_pending_lender
from services.lender_access import can_view_sme, lender_for_user, related_requests, visible_sme_ids
from typing import List
from models.sme_outcome import SmeOutcome
from models.founder_profile import FounderProfile
from services.scoring_service import calculate_assessment
from services.recommendations_service import generate_plan
from core.scoring import determine_decision

router = APIRouter(prefix="/lenders", tags=["Lenders"])

# ========== Pydantic Schemas ==========

class LenderCreate(BaseModel):
    organization_name: str
    contact_email: str
    phone: str | None = None
    max_lending_amount: Decimal = Field(default=Decimal("1000000.00"), ge=0)
    min_credit_score: int = 40

class LenderUpdate(BaseModel):
    organization_name: str | None = None
    contact_email: str | None = None
    phone: str | None = None
    max_lending_amount: Decimal | None = Field(default=None, ge=0)
    min_credit_score: int | None = None

class LenderResponse(BaseModel):
    id: int
    user_id: int
    organization_name: str
    contact_email: str
    phone: str | None
    max_lending_amount: Decimal
    min_credit_score: int
    approval_status: str = "pending"  # read-only: set only by an administrator

    model_config = ConfigDict(from_attributes=True)

class SMEFinanceView(BaseModel):
    sme_id: int
    company_name: str
    industry: str
    revenue: Decimal
    credit_score: int | None
    risk_level: str | None
    pending_finance_requests: int

    model_config = ConfigDict(from_attributes=True)


def get_risk_level(score: int | None) -> str | None:
    if score is None:
        return None
    if score < 40:
        return "High"
    if score < 60:
        return "Medium"
    return "Low"

# ========== CRUD Endpoints ==========

@router.post("/register", response_model=LenderResponse)
def register_lender(
    request: LenderCreate,
    current_user: User = Depends(get_current_user_allow_pending_lender),
    db: Session = Depends(get_db)
):
    """
    Create the lender profile for an account that registered with the lender role. The profile starts
    as "pending": it gives NO access to business data until an administrator approves it.
    """
    # Never change anyone's role here. An SME or admin account must not turn itself into a lender.
    if current_user.role != "lender":
        raise HTTPException(status_code=403, detail="Register a separate account with the lender role")
    # Check if user already has a lender profile
    existing = db.query(Lender).filter(Lender.user_id == current_user.id).first()
    if existing:
        raise HTTPException(status_code=400, detail="User already has a lender profile")
    
    new_lender = Lender(
        user_id=current_user.id,
        organization_name=request.organization_name,
        contact_email=request.contact_email,
        phone=request.phone,
        max_lending_amount=request.max_lending_amount,
        min_credit_score=request.min_credit_score,
        approval_status="pending",
    )
    db.add(new_lender)
    db.commit()
    db.refresh(new_lender)
    return new_lender

@router.get("/me", response_model=LenderResponse)
def get_lender_profile(
    current_user: User = Depends(get_current_user_allow_pending_lender),
    db: Session = Depends(get_db)
):
    """Get current lender's profile."""
    lender = db.query(Lender).filter(Lender.user_id == current_user.id).first()
    if not lender:
        raise HTTPException(status_code=404, detail="Lender profile not found")
    return lender

@router.put("/me", response_model=LenderResponse)
def update_lender_profile(
    request: LenderUpdate,
    current_user: User = Depends(get_current_user_allow_pending_lender),
    db: Session = Depends(get_db)
):
    """Update current lender's profile."""
    lender = db.query(Lender).filter(Lender.user_id == current_user.id).first()
    if not lender:
        raise HTTPException(status_code=404, detail="Lender profile not found")
    
    for key, value in request.model_dump(exclude_unset=True).items():
        setattr(lender, key, value)
    
    db.commit()
    db.refresh(lender)
    return lender

@router.get("/available-smes")
def get_available_smes(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get list of SMEs available for financing (with credit scores)."""
    if current_user.role != "lender":
        raise HTTPException(status_code=403, detail="Only lenders can view SMEs")
    
    # Only businesses with a request open to the pool or assigned to this lender, never the whole platform.
    lender = lender_for_user(db, current_user)
    ids = visible_sme_ids(db, lender) if lender else set()
    smes = db.query(SME).filter(SME.id.in_(ids)).all() if ids else []
    result = []
    
    for sme in smes:
        latest_score = (
            db.query(CreditScore)
            .filter(CreditScore.sme_id == sme.id)
            .order_by(CreditScore.created_at.desc())
            .first()
        )
        
        pending_requests = (
            db.query(FinanceRequest)
            .filter(FinanceRequest.sme_id == sme.id, FinanceRequest.status == "pending")
            .count()
        )
        
        result.append({
            "sme_id": sme.id,
            "company_name": sme.name,
            "industry": sme.industry,
            "province": sme.province,
            "revenue": sme.revenue,
            "credit_score": latest_score.score if latest_score else None,
            "risk_level": get_risk_level(latest_score.score if latest_score else None),
            "pending_finance_requests": pending_requests
        })
    
    return result


@router.get("/portfolio-analytics")
def get_portfolio_analytics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Portfolio analytics. A lender sees only its own pipeline and the businesses it may see; an admin
    sees the whole platform. (Previously every lender saw every lender's deals and the platform's fees.)
    """
    if current_user.role not in ["lender", "admin"]:
        raise HTTPException(status_code=403, detail="Unauthorized access")

    is_admin = current_user.role == "admin"
    lender = None if is_admin else lender_for_user(db, current_user)
    if not is_admin and lender is None:
        raise HTTPException(status_code=404, detail="Lender profile not found")

    def reqs():
        return db.query(FinanceRequest) if is_admin else related_requests(db, lender)
    
    # 1. applications
    total_apps = reqs().count()
    approved_apps = reqs().filter(FinanceRequest.status == "approved").count()
    funded_apps = reqs().filter(FinanceRequest.status == "funded").count()
    pending_apps = reqs().filter(FinanceRequest.status == "pending").count()
    rejected_apps = reqs().filter(FinanceRequest.status == "rejected").count()
    awaiting_info_apps = reqs().filter(FinanceRequest.status == "info_requested").count()

    # 2. financials
    financials_query = reqs().filter(
        FinanceRequest.status.in_(["funded", "paid", "closed"])
    ).all()
    total_financed = float(sum(r.approved_amount or 0 for r in financials_query))
    total_fees = float(sum(r.platform_fee or 0 for r in financials_query))

    # 3. scores
    if is_admin:
        smes = db.query(SME).all()
    else:
        ids = visible_sme_ids(db, lender)
        smes = db.query(SME).filter(SME.id.in_(ids)).all() if ids else []
    scores = []
    distribution = {
        "Declined (<50)": 0,
        "Review (50-74)": 0,
        "Approved (75+)": 0,
        "Unscored": 0
    }
    for s in smes:
        latest_score = db.query(CreditScore).filter(
            CreditScore.sme_id == s.id
        ).order_by(CreditScore.created_at.desc()).first()
        if latest_score is not None:
            scores.append(latest_score.score)
            if latest_score.score < 50:
                distribution["Declined (<50)"] += 1
            elif latest_score.score < 75:
                distribution["Review (50-74)"] += 1
            else:
                distribution["Approved (75+)"] += 1
        else:
            distribution["Unscored"] += 1

    avg_score = round(sum(scores) / len(scores), 1) if scores else 0.0

    # 4. concentration
    by_sector = {}
    by_province = {}
    for s in smes:
        sector = s.industry or "Other"
        by_sector[sector] = by_sector.get(sector, 0) + 1
        
        prov = s.province or "Unknown"
        by_province[prov] = by_province.get(prov, 0) + 1

    # 5. outcomes
    if is_admin:
        all_outcomes = db.query(SmeOutcome).all()
    else:
        own = [r.id for r in db.query(FinanceRequest).filter(FinanceRequest.lender_id == lender.id).all()]
        all_outcomes = db.query(SmeOutcome).filter(SmeOutcome.finance_request_id.in_(own)).all() if own else []
    pending_out = sum(1 for o in all_outcomes if o.outcome_status == "pending")
    active_out = sum(1 for o in all_outcomes if o.outcome_status == "active")
    repaid_out = sum(1 for o in all_outcomes if o.outcome_status == "repaid")
    defaulted_out = sum(1 for o in all_outcomes if o.outcome_status == "defaulted")
    
    total_denom = repaid_out + defaulted_out + active_out
    repayment_rate = round((repaid_out / total_denom) * 100, 1) if total_denom > 0 else None

    return {
        "applications": {
            "total": total_apps,
            "approved": approved_apps,
            "funded": funded_apps,
            "pending": pending_apps,
            "rejected": rejected_apps,
            "awaiting_info": awaiting_info_apps
        },
        "financials": {
            "total_financed": total_financed,
            "total_fees": total_fees
        },
        "scores": {
            "average": avg_score,
            "distribution": distribution
        },
        "concentration": {
            "by_sector": by_sector,
            "by_province": by_province
        },
        "outcomes": {
            "pending": pending_out,
            "active": active_out,
            "repaid": repaid_out,
            "defaulted": defaulted_out,
            "repayment_rate": repayment_rate
        }
    }

@router.get("/sme-intelligence/{sme_id}")
def get_sme_intelligence(
    sme_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve in-depth credit intelligence for a specific SME."""
    if current_user.role not in ["lender", "admin"]:
        raise HTTPException(status_code=403, detail="Unauthorized access")

    sme = db.query(SME).filter(SME.id == sme_id).first()
    if not sme or not can_view_sme(db, current_user, sme_id):
        # Same answer for "does not exist" and "not yours to see": no probing of other businesses.
        raise HTTPException(status_code=404, detail="SME not found")

    # Live score and breakdown (read-only)
    # Read-only: a lender viewing a business must not write snapshots or observations.
    result, _ = calculate_assessment(sme, db)
    
    # Call generate_plan for recommendations and take the first 3
    plan = generate_plan(result.breakdown, result.score)
    top_3 = [
        {
            "action": rec.action,
            "impact_score": rec.impact_score,
            "difficulty": rec.difficulty
        }
        for rec in plan.recommendations[:3]
    ]

    # Query FounderProfile by sme_id
    fp = db.query(FounderProfile).filter(FounderProfile.sme_id == sme_id).first()
    founder_data = None
    if fp is not None:
        founder_data = {
            "years_experience": fp.years_industry_experience,
            "highest_qualification": fp.highest_qualification,
            "prior_business_owner": fp.prior_business_owner,
            "trade_association": fp.trade_association_name,
            "reference_provided": bool(fp.reference_name) if fp.reference_name else False
        }

    # Query CreditScore ordered by created_at desc, limit 10
    history = (
        db.query(CreditScore)
        .filter(CreditScore.sme_id == sme_id)
        .order_by(CreditScore.created_at.desc())
        .limit(10)
        .all()
    )
    score_history = [
        {
            "score": h.score,
            "created_at": h.created_at.isoformat()
        }
        for h in reversed(history)  # Chronological order for Line Chart
    ]

    # Query SmeOutcome by sme_id
    outcomes_query = db.query(SmeOutcome).filter(SmeOutcome.sme_id == sme_id).all()
    outcomes_data = [
        {
            "id": o.id,
            "finance_request_id": o.finance_request_id,
            "outcome_status": o.outcome_status,
            "score_at_funding": o.score_at_funding,
            "amount": float(o.amount),
            "created_at": o.created_at.isoformat()
        }
        for o in outcomes_query
    ]

    # Real evidence status per document type: the latest approved record wins, and a newer
    # pending upload is flagged but never replaces it (same rule the scoring engine uses).
    from models.verification import Verification
    from services.evidence_selection import sort_verifications

    by_type: dict = {}
    for v in sort_verifications(db.query(Verification).filter(Verification.sme_id == sme_id).all()):
        by_type.setdefault(v.doc_type, []).append(v)
    documents = []
    for doc_type, records in sorted(by_type.items()):
        newest = records[-1]
        approved = next((r for r in reversed(records) if r.status == "approved"), None)
        shown = approved or newest
        documents.append({
            "doc_type": doc_type,
            "status": shown.status,
            "reviewed_at": shown.reviewed_at.isoformat() if shown.reviewed_at else None,
            "newer_pending": bool(approved and newest is not approved and newest.status == "pending"),
        })

    return {
        "evidence": {
            "documents": documents,
            "funding_readiness": result.score,
            "viability_score": result.viability_score,
            "evidence_confidence": result.confidence_score,
        },
        "sme": {
            "id": sme.id,
            "name": sme.name,
            "industry": sme.industry,
            "province": sme.province,
            "business_city": sme.business_city,
            "revenue": float(sme.revenue),
            "years_active": sme.years_active,
            "cipc_verified": sme.cipc_verified_at is not None
        },
        "score": {
            "current": result.score,
            "decision": result.decision,
            "breakdown": result.breakdown
        },
        "founder": founder_data,
        "recommendations": {
            "projected_score": plan.projected_score,
            "projected_decision": plan.projected_decision,
            "top_3_actions": top_3
        },
        "score_history": score_history,
        "outcomes": outcomes_data
    }

@router.get("/{lender_id}", response_model=LenderResponse)
def get_lender(
    lender_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Lender details (contact email, phone, lending limits): the lender themself or an admin only."""
    lender = db.query(Lender).filter(Lender.id == lender_id).first()
    if not lender:
        raise HTTPException(status_code=404, detail="Lender not found")
    if current_user.role != "admin" and lender.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Unauthorized access")
    return lender

