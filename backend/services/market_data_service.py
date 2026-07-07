"""
services/market_data_service.py

Static market intelligence layer for South Africa.
Data sources:
  - Stats SA: Quarterly Labour Force Survey, GDP by province (2023/2024)
  - World Bank: SME survival rates by sector for Sub-Saharan Africa
  - SEDA: Small Enterprise Development Agency sector reports
  - DSBD: Department of Small Business Development annual reports

This service is intentionally static — no external API calls.
Update the tables below as new Stats SA releases become available.
When the CIPC API and Stats SA API integrations are live, replace
the lookups with real-time calls.

Two outputs:
  sector_survival_score(industry)  → 0.0–1.0
  province_market_score(province, industry) → 0.0–1.0
"""

from __future__ import annotations


# ── Sector survival rates ─────────────────────────────────────────────────────
# Based on: SEDA SME Quarterly Update 2023, World Bank IFC Doing Business 2024
# Definition: % of businesses in this sector that survive past 36 months in SA
# Scale: 0.0 = almost none survive; 1.0 = most survive

SECTOR_SURVIVAL_RATES: dict[str, float] = {
    # Low risk — strong fundamentals, consistent demand
    "Technology":            0.72,   # Digital services, SaaS, IT support — high demand, low capex
    "Professional Services": 0.68,   # Consulting, legal, accounting — skill-dependent, low overhead
    "Healthcare":            0.74,   # Essential services, regulated, consistent demand

    # Medium risk — viable but exposed to consumer cycles
    "Retail":                0.48,   # High competition, margin pressure, load-shedding impact
    "Food & Beverage":       0.44,   # High failure rate — location, perishables, regulatory burden
    "Agriculture":           0.52,   # Climate exposure, but SA govt support programs exist
    "Manufacturing":         0.55,   # Capital intensive but SA has industrial base and export markets

    # High risk — structural challenges in SA context
    "Transport & Logistics": 0.42,   # Fuel costs, vehicle maintenance, load-shedding impact on cold chain
    "Construction":          0.38,   # Payment cycles, CIDB grading requirements, project dependency

    # Default
    "Other":                 0.50,
}


# ── Province economic activity index ─────────────────────────────────────────
# Based on: Stats SA GDP by Province 2023, Municipal economic rankings
# Definition: relative economic activity level of the province
# Scale: 0.0 = minimal formal economic activity; 1.0 = highest activity (Gauteng)
# These are relative indices, not absolute GDP figures.

PROVINCE_ECONOMIC_INDEX: dict[str, float] = {
    "Gauteng":            1.00,   # ~34% of SA GDP, Johannesburg + Pretoria economic hub
    "Western Cape":       0.82,   # Cape Town tech and tourism hub, second most active
    "KwaZulu-Natal":      0.65,   # Durban port, manufacturing, sugar industry
    "Mpumalanga":         0.52,   # Mining and energy, Eskom proximity
    "Eastern Cape":       0.44,   # Port Elizabeth automotive, but structural unemployment
    "North West":         0.42,   # Mining dependent, Rustenburg
    "Free State":         0.40,   # Agriculture and mining, lower urban density
    "Limpopo":            0.36,   # Mining and agriculture, lowest formal economy density
    "Northern Cape":      0.30,   # Largest by area, smallest economy — mining, low population
}


# ── Industry–province interaction adjustments ─────────────────────────────────
# Some industries perform differently in specific provinces due to local conditions.
# Format: (industry, province) → multiplier applied to the base province index.
# Only specify notable deviations — default multiplier is 1.0.

INDUSTRY_PROVINCE_ADJUSTMENTS: dict[tuple[str, str], float] = {
    # Technology thrives in Cape Town and Joburg tech hubs
    ("Technology", "Western Cape"):       1.15,
    ("Technology", "Gauteng"):            1.10,

    # Agriculture stronger in farming provinces
    ("Agriculture", "Free State"):        1.25,
    ("Agriculture", "Mpumalanga"):        1.20,
    ("Agriculture", "Northern Cape"):     1.15,
    ("Agriculture", "KwaZulu-Natal"):     1.10,
    ("Agriculture", "Limpopo"):           1.10,

    # Tourism-linked food and beverage in Western Cape
    ("Food & Beverage", "Western Cape"):  1.20,

    # Manufacturing in KZN and Eastern Cape (automotive)
    ("Manufacturing", "KwaZulu-Natal"):   1.15,
    ("Manufacturing", "Eastern Cape"):    1.10,

    # Logistics stronger near ports and mining
    ("Transport & Logistics", "KwaZulu-Natal"): 1.20,
    ("Transport & Logistics", "Gauteng"):        1.15,
    ("Transport & Logistics", "Mpumalanga"):     1.10,

    # Mining services / construction in mining provinces
    ("Construction", "Mpumalanga"):       1.15,
    ("Construction", "Limpopo"):          1.10,
    ("Construction", "North West"):       1.10,

    # Healthcare stronger in urban centres
    ("Healthcare", "Gauteng"):            1.10,
    ("Healthcare", "Western Cape"):       1.08,
}


def sector_survival_score(industry: str) -> float:
    """
    Returns a 0.0–1.0 survival rate for the given industry.
    Used to replace the static low/medium/high lookup in the scoring engine.
    """
    return SECTOR_SURVIVAL_RATES.get(industry, SECTOR_SURVIVAL_RATES["Other"])


def province_market_score(province: str, industry: str) -> float:
    """
    Returns a 0.0–1.0 market opportunity score for a given province + industry.
    Applies industry-province interaction adjustments where applicable.
    Clamps the result to [0.0, 1.0].
    """
    base = PROVINCE_ECONOMIC_INDEX.get(province)
    if base is None:
        # Unknown province — use national median
        base = 0.52

    adjustment = INDUSTRY_PROVINCE_ADJUSTMENTS.get((industry, province), 1.0)
    return min(base * adjustment, 1.0)


def get_market_intelligence(industry: str, province: str | None) -> dict:
    """
    Returns a combined dict of market signals for use in scoring and explainability.
    """
    survival = sector_survival_score(industry)
    market = province_market_score(province or "", industry) if province else None

    return {
        "sector_survival_rate":  survival,
        "province_market_score": market,
        "province":              province,
        "industry":              industry,
        "survival_label":        _survival_label(survival),
        "market_label":          _market_label(market) if market is not None else "Province not specified",
    }


def _survival_label(rate: float) -> str:
    if rate >= 0.65: return f"{rate:.0%} sector survival (strong)"
    if rate >= 0.50: return f"{rate:.0%} sector survival (moderate)"
    if rate >= 0.40: return f"{rate:.0%} sector survival (challenging)"
    return f"{rate:.0%} sector survival (high risk)"


def _market_label(score: float) -> str:
    if score >= 0.80: return f"High economic activity market ({score:.0%})"
    if score >= 0.55: return f"Moderate economic activity market ({score:.0%})"
    if score >= 0.35: return f"Developing market ({score:.0%})"
    return f"Low activity market ({score:.0%})"
