from fastapi import APIRouter
from services.market_data_service import (
    sector_survival_score,
    province_market_score,
    PROVINCE_ECONOMIC_INDEX,
    INDUSTRY_PROVINCE_ADJUSTMENTS,
)

router = APIRouter(prefix="/public", tags=["Public"])

# Static lookup table for industry-specific South Africa risks
INDUSTRY_RISKS = {
    "Construction": [
        "Construction sector is highly vulnerable to payment delays from clients and public sector bodies.",
        "Disruptions from local business forums (often referred to as construction mafia) can stall projects."
    ],
    "Retail": [
        "Retail margins are thin and highly sensitive to consumer spending drops and inflation.",
        "High security costs are required to protect physical stock from theft."
    ],
    "Manufacturing": [
        "Manufacturing operations require high, reliable energy supply — load-shedding significantly raises costs via generator fuel.",
        "Vulnerable to import competition and logistics delays at local ports."
    ],
    "Technology": [
        "High competition for qualified software developers and tech talent drives up payroll costs.",
        "Risk of rapid obsolescence requires continuous reinvestment in product development."
    ],
    "Healthcare": [
        "Subject to heavy regulation and licensing requirements (e.g. HPCSA or pharmacy council registrations).",
        "Vulnerable to slow medical aid payment cycles, creating cashflow gaps."
    ],
    "Agriculture": [
        "Exposed to climate risk, droughts, and disease outbreaks which can decimate seasonal yields.",
        "Vulnerable to fluctuating global commodity prices and rising input costs (fertilizer, fuel)."
    ],
    "Transport & Logistics": [
        "High fuel cost volatility impacts pricing and reduces operating margins.",
        "Cargo theft, vehicle wear-and-tear, and delays at key corridors (e.g. Durban port) increase operational risk."
    ],
    "Food & Beverage": [
        "High perishability of inventory leads to waste if demand drops even slightly.",
        "Thin operating margins make businesses highly sensitive to food price inflation."
    ],
    "Professional Services": [
        "Highly dependent on key personnel; losing key specialists can immediately affect client retention.",
        "Revenue is tied to billable hours, limiting scalability without hiring additional staff."
    ],
    "Other": [
        "General operational risks, including high utility costs and overheads.",
        "Increasing domestic competition and low economic growth pressure sales margins."
    ]
}

# Static lookup table for industry-specific South Africa encouragements
INDUSTRY_ENCOURAGEMENTS = {
    "Construction": "Consistent infrastructure and building demand keeps this sector active.",
    "Retail": "Direct customer relationships and cash sales provide immediate liquidity.",
    "Manufacturing": "Opportunity for value-addition and job creation is highly supported in South Africa.",
    "Technology": "High scalability potential with very low initial capital expenditure requirements.",
    "Healthcare": "Essential service nature provides defensive revenue during economic downturns.",
    "Agriculture": "Critical sector for food security with strong export potential and government backing.",
    "Transport & Logistics": "Logistics is the backbone of trade, with constant demand for moving goods.",
    "Food & Beverage": "Your sector shows consistent demand — people always need food",
    "Professional Services": "Low overhead costs allow for high early-stage profitability.",
    "Other": "Niche markets often have less competition and higher margin potential."
}

def get_survival_label(rate: float) -> str:
    pct = int(rate * 100)
    return f"{pct}% of similar businesses survive 3 years"

def get_market_label(score: float, province: str) -> str:
    if score >= 0.80:
        return f"High economic activity market — strong regional hub"
    elif score >= 0.55:
        return f"Moderate economic activity market — established regional hub"
    elif score >= 0.35:
        return f"Developing market — lower economic activity"
    else:
        return f"Low activity market — limited formal economic activity in {province}"

@router.get("/business-assessment")
def get_business_assessment(industry: str, province: str):
    # 1. Survival score
    survival = sector_survival_score(industry)
    
    # 2. Province market score
    market = province_market_score(province, industry)
    
    # 3. Viability score: (survival * 0.6 + market * 0.4) * 100, rounded to 1 decimal
    viability_score = round((survival * 0.6 + market * 0.4) * 100, 1)
    
    # 4. Viability label
    if viability_score >= 70:
        viability_label = "Strong opportunity"
    elif viability_score >= 55:
        viability_label = "Viable with planning"
    elif viability_score >= 40:
        viability_label = "Challenging — proceed carefully"
    else:
        viability_label = "High risk — thorough research recommended"
        
    # 5. Risks
    top_risks = []
    # Industry specific risks
    top_risks.extend(INDUSTRY_RISKS.get(industry, ["General business risk in the selected sector."]))
    
    # Province economic index check
    prov_idx = PROVINCE_ECONOMIC_INDEX.get(province, 0.52)
    if prov_idx < 0.45:
        top_risks.append("Limpopo has lower formal economic activity than major urban centres" if province == "Limpopo" else f"{province} has lower formal economic activity than major urban centres")
    
    # Survival rate check
    if survival < 0.45:
        top_risks.append(f"{industry} has a high failure rate nationally — thin margins, high competition")
        
    # No notable advantage check
    adj = INDUSTRY_PROVINCE_ADJUSTMENTS.get((industry, province), 1.0)
    if adj <= 1.0:
        top_risks.append(f"No notable market advantage for this sector in {province}")
        
    # 6. Encouragements
    encouragements = []
    # Add default industry encouragement
    if industry in INDUSTRY_ENCOURAGEMENTS:
        encouragements.append(INDUSTRY_ENCOURAGEMENTS[industry])
        
    # Rules-based encouragements
    if survival >= 0.60:
        encouragements.append("Strong sector fundamentals — most businesses in this industry survive")
    if prov_idx >= 0.70:
        encouragements.append(f"{province} has high economic activity — strong market opportunity")
    if adj > 1.0:
        encouragements.append(f"This sector performs particularly well in {province}")
        
    # 7. Next step CTA
    next_step = "Register your business and complete a full funding readiness assessment to see your personalised score."
    
    return {
        "industry": industry,
        "province": province,
        "viability_score": viability_score,
        "viability_label": viability_label,
        "sector_survival_rate": survival,
        "survival_label": get_survival_label(survival),
        "province_market_score": market,
        "market_label": get_market_label(market, province),
        "top_risks": top_risks,
        "encouragements": encouragements,
        "next_step": next_step
    }
