from datetime import datetime, timezone
from typing import Literal, Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from database import get_db
from models.sme import SME
from models.credit_score import CreditScore
from models.api_key import APIKey
from services.scoring_service import score_sme
from services.recommendations_service import generate_plan
from services.market_data_service import get_market_intelligence
from services.api_key_service import get_api_key_from_header, generate_api_key
from services.auth_service import get_current_user
from models.user import User

router = APIRouter(prefix="/api/v1", tags=["External API v1"])

# Request Schema for generating API Key
class KeyGenerateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    consumer_type: Literal["lender", "government", "corporate", "developer"]

@router.get("/sme/score")
def get_sme_score(
    registration_number: str,
    api_key: APIKey = Depends(get_api_key_from_header),
    db: Session = Depends(get_db)
):
    """
    Submit a company registration number and get back the platform's intelligence on that SME.
    """
    sme = db.query(SME).filter(SME.cipc_registration_number == registration_number).first()
    if not sme:
        raise HTTPException(
            status_code=404,
            detail={"error": "SME not found", "registration_number": registration_number}
        )


    # Call scoring engine
    result = score_sme(sme, db)
    # Generate recommendations coaching plan
    plan = generate_plan(result.breakdown, result.score)

    # Format score_components as snake_case
    score_components = {}
    for factor_name, component_data in result.breakdown.items():
        key = factor_name.lower().replace(" ", "_")
        score_components[key] = {
            "contribution": float(component_data.get("contribution", 0)),
            "max": int(component_data.get("max", 0)),
            "label": str(component_data.get("label", ""))
        }

    # Format top gaps from recommendations
    top_gaps = []
    for rec in plan.recommendations:
        top_gaps.append({
            "factor": rec.category,
            "gap_pts": float(rec.impact_pts),
            "action": rec.action
        })

    return {
        "registration_number": registration_number,
        "company_name": sme.name,
        "industry": sme.industry,
        "province": sme.province,
        "score": round(result.score, 1),
        "decision": result.decision,
        "score_components": score_components,
        "projected_score": round(plan.projected_score, 1),
        "projected_decision": plan.projected_decision,
        "top_gaps": top_gaps,
        "cipc_verified": sme.cipc_verified_at is not None,
        "assessed_at": datetime.utcnow().isoformat() + "Z"
    }

@router.get("/market/viability")
def get_market_viability(
    industry: str,
    province: Optional[str] = None,
    api_key: APIKey = Depends(get_api_key_from_header)
):
    """
    Query sector + province viability without needing an SME record.
    """
    try:
        intel = get_market_intelligence(industry, province)
    except Exception as e:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid query parameters: {str(e)}"
        )

    survival = intel.get("sector_survival_rate", 0.50)
    market = intel.get("province_market_score")

    # Combined viability formula
    if market is not None:
        combined_viability = round(survival * 0.6 + market * 0.4, 3)
    else:
        combined_viability = round(survival, 3)

    if combined_viability >= 0.70:
        viability_label = "Strong opportunity"
    elif combined_viability >= 0.55:
        viability_label = "Viable with planning"
    elif combined_viability >= 0.40:
        viability_label = "Challenging — proceed carefully"
    else:
        viability_label = "High risk — thorough research recommended"

    return {
        "industry": industry,
        "province": province,
        "sector_survival_rate": float(survival),
        "province_market_score": float(market) if market is not None else None,
        "combined_viability": float(combined_viability),
        "viability_label": viability_label,
        "survival_label": intel.get("survival_label", ""),
        "market_label": intel.get("market_label", "Province not specified")
    }

@router.get("/platform/stats")
def get_platform_stats(
    api_key: APIKey = Depends(get_api_key_from_header),
    db: Session = Depends(get_db)
):
    """
    High-level platform statistics for integration dashboards.
    """
    smes_with_scores = db.query(SME).join(CreditScore).all()
    total_smes_assessed = len(smes_with_scores)

    scores = []
    for sme in smes_with_scores:
        if sme.credit_scores:
            latest_score_obj = max(sme.credit_scores, key=lambda cs: cs.created_at or datetime.min)
            scores.append(latest_score_obj.score)

    avg_score = round(sum(scores) / len(scores), 1) if scores else 0.0

    approved = sum(1 for s in scores if s >= 75)
    review = sum(1 for s in scores if s >= 50 and s < 75)
    declined = sum(1 for s in scores if s < 50)

    distinct_industries = [r[0] for r in db.query(SME.industry).distinct().all() if r[0]]
    distinct_provinces = [r[0] for r in db.query(SME.province).distinct().all() if r[0]]

    return {
        "total_smes_assessed": total_smes_assessed,
        "score_distribution": {
            "approved": approved,
            "review": review,
            "declined": declined
        },
        "avg_score": avg_score,
        "sectors_covered": sorted(distinct_industries),
        "provinces_covered": sorted(distinct_provinces),
        "platform_version": "1.0.0"
    }

@router.post("/keys/generate")
def generate_new_api_key(
    req: KeyGenerateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generate a new API key (Admin only).
    """
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can generate API keys"
        )

    raw_key, key_hash = generate_api_key()

    new_key = APIKey(
        key_hash=key_hash,
        key_prefix=raw_key[:12],
        name=req.name,
        consumer_type=req.consumer_type,
        is_active=True,
        created_by_user_id=current_user.id
    )
    db.add(new_key)
    db.commit()
    db.refresh(new_key)

    return {
        "message": "API key generated. Store this key securely — it will not be shown again.",
        "api_key": raw_key,
        "name": new_key.name,
        "consumer_type": new_key.consumer_type
    }
