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


# Index used when no province is supplied. A design choice, not a statistic.
UNSPECIFIED_PROVINCE_INDEX = 0.52


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
        base = UNSPECIFIED_PROVINCE_INDEX
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
        "data_version": MARKET_DATA_VERSION,
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


# ── Data provenance and versioning ───────────────────────────────────────────
# Every assessment records MARKET_DATA_VERSION and the fingerprint below, so a
# stored score can always be tied to the exact tables that produced it.
#
# HOW TO CHANGE THE DATA
#   1. Edit a table above.
#   2. Bump MARKET_DATA_VERSION and update its TABLE_PROVENANCE entry.
#   3. Update the pinned fingerprint in tests/test_market_data_versioning.py.
# The test fails if a table changes without those steps, so data can never
# change silently.

MARKET_DATA_VERSION = "2026.10.1"

# Aggregates built by data_pipeline/build_wbes_benchmarks.py from licensed World
# Bank Enterprise Survey microdata. CONTEXT ONLY: nothing here feeds a score.
def _load_wbes_benchmarks() -> dict:
    import json
    from pathlib import Path

    path = Path(__file__).resolve().parent.parent / "data" / "wbes_sa_2020_benchmarks.json"
    return json.loads(path.read_text(encoding="utf-8"))


WBES_SA_2020_BENCHMARKS: dict = _load_wbes_benchmarks()


def wbes_benchmark(measure: str, size_band: str | None = None, sector: str | None = None):
    """One benchmark cell ({n, value, ...}); value is None when suppressed (n < 30)."""
    if size_band and sector:
        raise ValueError("choose size_band or sector, not both")
    t = WBES_SA_2020_BENCHMARKS
    cell = (t["by_size_band"][size_band] if size_band
            else t["by_sector"][sector] if sector else t["overall"])
    return cell[measure]

# `basis` says what kind of evidence stands behind a table:
#   published_statistic   directly from a published statistical release
#   informed_index        an index scaled by hand using published statistics
#   cited_benchmark       values attributed to cited reports (not re-checked)
#   expert_judgement      analyst judgement with no published source
#   taxonomy              name matching, not a statistic
#   design_default        a modelling choice
#   derived_from_microdata  aggregates computed by us from licensed survey microdata
# `independently_verified` is True only once someone has checked the values
# against the original publication. None are verified yet.
# `public_note` may be shown to API users; `review_note` is internal.
TABLE_PROVENANCE: dict[str, dict] = {
    "sector_survival_rates": {
        "basis": "cited_benchmark",
        "cited_sources": [
            "SEDA SME Quarterly Update 2023",
            "World Bank / IFC (cited as 'Doing Business 2024')",
        ],
        "as_of": "2023",
        "independently_verified": False,
        "public_note": (
            "Share of businesses surviving past 36 months, by sector. Values are "
            "attributed to the cited reports and have not been independently re-checked."
        ),
        "review_note": (
            "Check each value against the original publication. The World Bank "
            "discontinued Doing Business in 2021, so a '2024' edition cannot be the "
            "source: find the real source or relabel this table 'expert_judgement'. "
            "The Enterprise Survey 2020 files were checked and cannot replace it (no usable "
            "closure outcome); the Gauteng 2019->2020 link has only 12 closures."
        ),
    },
    "province_economic_index": {
        "basis": "informed_index",
        "cited_sources": [
            "Stats SA GDP by province 2023/2024",
            "Stats SA Mbalo Brief, October 2025",
        ],
        "as_of": "2025-10",
        "independently_verified": False,
        "public_note": (
            "Relative economic-activity index (Gauteng = 1.0), informed by Stats SA "
            "provincial GDP and growth. It is not a direct GDP ratio."
        ),
        "review_note": (
            "The scaling from GDP share to index is undocumented (e.g. KwaZulu-Natal "
            "is ~16% of GDP vs Gauteng ~33% but is indexed at 0.67). Document the method."
        ),
    },
    "industry_province_adjustments": {
        "basis": "expert_judgement",
        "cited_sources": [],
        "as_of": "2025-10",
        "independently_verified": False,
        "public_note": "Industry-by-province multipliers set by analyst judgement; no published source.",
        "review_note": "Replace with estimates from microdata when licensed data is available.",
    },
    "wbes_sa_2020_benchmarks": {
        "basis": "derived_from_microdata",
        "cited_sources": ["World Bank Enterprise Surveys, South Africa 2020 (1,097 firms)"],
        "as_of": "2020",
        "independently_verified": False,
        "public_note": (
            "Weighted context benchmarks (finance access, audit status, firm age, sales per "
            "employee) for formal firms with 5+ employees in four provinces, surveyed mostly "
            "after the COVID-19 outbreak. Not representative of micro or informal businesses. "
            "Cells under 30 firms are suppressed. Context only: not used in any score."
        ),
        "review_note": (
            "Data-use terms accepted at registration have not been checked against shipping "
            "derived tables. Rebuild with data_pipeline/build_wbes_benchmarks.py. Cannot supply "
            "survival rates: the panel's non-interviewed firms are mostly unreachable, not closed."
        ),
    },
    "industry_aliases": {
        "basis": "taxonomy",
        "cited_sources": [],
        "as_of": "2025-10",
        "independently_verified": False,
        "public_note": "Maps free-text industry names to canonical sectors.",
        "review_note": "",
    },
    "province_aliases": {
        "basis": "taxonomy",
        "cited_sources": [],
        "as_of": "2025-10",
        "independently_verified": False,
        "public_note": "Maps province spellings to canonical names.",
        "review_note": "",
    },
    "unspecified_province_index": {
        "basis": "design_default",
        "cited_sources": [],
        "as_of": "2025-10",
        "independently_verified": False,
        "public_note": "Neutral index applied when no province is given.",
        "review_note": "",
    },
}

STALE_AFTER_MONTHS = 12


def _canonical_tables() -> dict:
    return {
        "sector_survival_rates": SECTOR_SURVIVAL_RATES,
        "province_economic_index": PROVINCE_ECONOMIC_INDEX,
        "industry_province_adjustments": {
            f"{industry}|{province}": value
            for (industry, province), value in INDUSTRY_PROVINCE_ADJUSTMENTS.items()
        },
        "wbes_sa_2020_benchmarks": WBES_SA_2020_BENCHMARKS,
        "industry_aliases": INDUSTRY_ALIASES,
        "province_aliases": PROVINCE_ALIASES,
        "unspecified_province_index": UNSPECIFIED_PROVINCE_INDEX,
    }


def market_data_fingerprint() -> str:
    """Short hash of every table's contents; changes whenever any value does."""
    import hashlib
    import json

    canonical = json.dumps(_canonical_tables(), sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()[:16]


def _period_end(as_of: str):
    from datetime import date
    import calendar

    parts = as_of.split("-")
    year = int(parts[0])
    month = int(parts[1]) if len(parts) > 1 else 12
    return date(year, month, calendar.monthrange(year, month)[1])


def is_stale(as_of: str, today=None) -> bool:
    """True when the data period ended more than STALE_AFTER_MONTHS ago."""
    from datetime import date

    today = today or date.today()
    end = _period_end(as_of)
    months = (today.year - end.year) * 12 + (today.month - end.month)
    return months > STALE_AFTER_MONTHS


def market_data_summary() -> dict:
    """Compact identifier stored with every assessment."""
    return {"version": MARKET_DATA_VERSION, "fingerprint": market_data_fingerprint()}


def market_data_sources(today=None) -> dict:
    """Public description of where each table comes from and how reliable it is."""
    tables = {}
    for name, info in TABLE_PROVENANCE.items():
        tables[name] = {
            "basis": info["basis"],
            "cited_sources": list(info["cited_sources"]),
            "as_of": info["as_of"],
            "independently_verified": info["independently_verified"],
            "stale": is_stale(info["as_of"], today),
            "note": info["public_note"],
        }
    return {**market_data_summary(), "tables": tables}
