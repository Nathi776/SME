"""
services/market_data_service.py

Static market intelligence layer for South Africa.
Data sources:
  - Stats SA: Quarterly Labour Force Survey, GDP by province (2023/2024)
  - Stats SA: Mbalo Brief October 2025 — provincial GDP growth rates
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


# ── Industry name aliases ─────────────────────────────────────────────────────
# Normalises free-text industry entries to canonical category names.
# Keys are strip().lower() — values are canonical names matching SECTOR_SURVIVAL_RATES.
# Two founders describing the same business must receive the same market score.

INDUSTRY_ALIASES: dict[str, str] = {
    # Technology
    "technology":           "Technology",
    "tech":                 "Technology",
    "it":                   "Technology",
    "information technology": "Technology",
    "software":             "Technology",
    "saas":                 "Technology",
    "fintech":              "Technology",
    "e-commerce":           "Technology",
    "ecommerce":            "Technology",

    # Professional Services
    "professional services": "Professional Services",
    "consulting":           "Professional Services",
    "consultancy":          "Professional Services",
    "legal":                "Professional Services",
    "law":                  "Professional Services",
    "accounting":           "Professional Services",
    "audit":                "Professional Services",
    "security":             "Professional Services",   # SA: private security — large SME sector
    "security company":     "Professional Services",

    # Healthcare
    "healthcare":           "Healthcare",
    "health care":          "Healthcare",
    "medical":              "Healthcare",
    "pharmacy":             "Healthcare",
    "clinic":               "Healthcare",

    # Retail
    "retail":               "Retail",
    "shop":                 "Retail",
    "store":                "Retail",
    "spaza":                "Retail",   # SA: informal convenience store
    "spaza shop":           "Retail",
    "tuck shop":            "Retail",   # SA: small informal retail outlet
    "hawker":               "Retail",   # SA: street vendor / informal trader
    "general dealer":       "Retail",

    # Food & Beverage
    "food":                 "Food & Beverage",
    "food and beverage":    "Food & Beverage",
    "f&b":                  "Food & Beverage",
    "restaurant":           "Food & Beverage",
    "cafe":                 "Food & Beverage",
    "catering":             "Food & Beverage",
    "tavern":               "Food & Beverage",   # SA: informal liquor and food establishment
    "shebeen":              "Food & Beverage",   # SA: informal bar / tavern
    "fast food":            "Food & Beverage",
    "bakery":               "Food & Beverage",

    # Agriculture
    "agriculture":          "Agriculture",
    "farming":              "Agriculture",
    "farm":                 "Agriculture",
    "agri":                 "Agriculture",

    # Manufacturing
    "manufacturing":        "Manufacturing",
    "factory":              "Manufacturing",
    "production":           "Manufacturing",
    "panel beating":        "Manufacturing",   # SA: auto body repair — common SME sector
    "auto repair":          "Manufacturing",
    "welding":              "Manufacturing",

    # Transport & Logistics
    "transport":            "Transport & Logistics",
    "logistics":            "Transport & Logistics",
    "transport & logistics": "Transport & Logistics",
    "courier":              "Transport & Logistics",
    "delivery":             "Transport & Logistics",
    "taxi":                 "Transport & Logistics",   # SA: minibus taxi operators

    # Construction
    "construction":         "Construction",
    "building":             "Construction",
    "contractor":           "Construction",
    "civil engineering":    "Construction",
}



def normalize_industry(industry: str | None) -> str:
    if not industry or not industry.strip():
        return "Other"

    key = industry.strip().casefold()

    # Recognize canonical industry names directly.
    for category in SECTOR_SURVIVAL_RATES:
        if category.casefold() == key:
            return category

    # Resolve aliases to their canonical categories.
    return INDUSTRY_ALIASES.get(key, "Other")



PROVINCE_ALIASES: dict[str, str] = {
    "gauteng": "Gauteng",
    "western cape": "Western Cape",
    "kwazulu-natal": "KwaZulu-Natal",
    "kwazulu natal": "KwaZulu-Natal",
    "kzn": "KwaZulu-Natal",
    "mpumalanga": "Mpumalanga",
    "free state": "Free State",
    "eastern cape": "Eastern Cape",
    "north west": "North West",
    "northwest": "North West",
    "limpopo": "Limpopo",
    "northern cape": "Northern Cape",
}


def normalize_province(province: str | None) -> str | None:
    """Normalize a South African province name for consistent lookups."""
    if not province or not province.strip():
        return None
    key = province.strip().lower()
    return PROVINCE_ALIASES.get(key)


# ── Province economic activity index ─────────────────────────────────────────
# Based on: Stats SA GDP by Province 2023/2024, Mbalo Brief October 2025
# Definition: relative economic activity level of the province
# Scale: 0.0 = minimal formal economic activity; 1.0 = highest activity (Gauteng)
# These are relative indices, not absolute GDP figures.
#
# Mbalo Brief 2025 corrections applied (from Stats SA Mbalo Brief, Oct 2025):
#   Western Cape:  0.82 → 0.84  (+0.7% growth, 14.2% of GDP)
#   KwaZulu-Natal: 0.65 → 0.67  (+0.4% growth, 16.1% of GDP)
#   Limpopo:       0.36 → 0.44  (+0.9% growth — fastest growing province)
#   Eastern Cape:  0.44 → 0.40  (−0.2% growth — structural decline)
#   North West:    0.42 → 0.38  (−0.1% growth — mining dependency)
#   Northern Cape: 0.30 → 0.28  (−0.1% growth — smallest economy)

PROVINCE_ECONOMIC_INDEX: dict[str, float] = {
    "Gauteng":            1.00,   # ~33.2% of SA GDP, Johannesburg + Pretoria economic hub
    "Western Cape":       0.84,   # Cape Town tech and tourism hub — updated Mbalo Brief 2025
    "KwaZulu-Natal":      0.67,   # Durban port, manufacturing, sugar — updated Mbalo Brief 2025
    "Mpumalanga":         0.52,   # Mining and energy, Eskom proximity
    "Free State":         0.40,   # Agriculture and mining, lower urban density
    "Eastern Cape":       0.40,   # Port Elizabeth automotive — structural decline, Mbalo Brief 2025
    "North West":         0.38,   # Mining dependent, Rustenburg — updated Mbalo Brief 2025
    "Limpopo":            0.44,   # Fastest growing (+0.9%) — updated Mbalo Brief 2025
    "Northern Cape":      0.28,   # Largest by area, smallest economy — updated Mbalo Brief 2025
}


# ── Industry–province interaction adjustments ─────────────────────────────────
# Some industries perform differently in specific provinces due to local conditions.
# Format: (industry, province) → multiplier applied to the base province index.
# Only specify notable deviations — default multiplier is 1.0.
# Keys must use canonical industry names (post-normalization).

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
    Normalises the industry name before lookup so that 'IT', 'tech',
    and 'Technology' all return the same score.
    """
    industry = normalize_industry(industry)
    return SECTOR_SURVIVAL_RATES.get(industry, SECTOR_SURVIVAL_RATES["Other"])


def province_market_score(province: str, industry: str) -> float:
    """
    Returns a 0.0–1.0 market opportunity score for a province + industry.
    Normalizes province and industry names before lookup.
    Applies industry-province adjustments and clamps the result to [0.0, 1.0].
    """
    normalized_industry = normalize_industry(industry)
    normalized_province = normalize_province(province)
    if normalized_province is None:
        base = 0.52
        adjustment = 1.0
    else:
        base = PROVINCE_ECONOMIC_INDEX[normalized_province]
        adjustment = INDUSTRY_PROVINCE_ADJUSTMENTS.get(
            (normalized_industry, normalized_province),
            1.0,
        )
    return min(base * adjustment, 1.0)


def get_market_intelligence(
    industry: str,
    province: str | None,
) -> dict:
    """
    Returns market signals for scoring and explainability.
    Uses canonical industry and province names for calculations.
    Preserves the supplied province in the returned response.
    """
    normalized_industry = normalize_industry(industry)
    normalized_province = normalize_province(province)
    survival = sector_survival_score(normalized_industry)
    market = (
        province_market_score(normalized_province, normalized_industry)
        if normalized_province
        else None
    )

    return {
        "sector_survival_rate": survival,
        "province_market_score": market,
        "province": province,
        "industry": normalized_industry,
        "survival_label": _survival_label(survival),
        "market_label": (
            _market_label(market)
            if market is not None
            else "Province not specified"
        ),
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