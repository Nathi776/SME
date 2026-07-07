"""
core/scoring.py — Single authoritative scoring engine. Track B update.

Changes in this version:
  - Founder Signal: new factor (max 15 pts) drawing from FounderProfile
  - RAW_MAX: 125 → 140
  - ScoringInput gains: founder_signal (FounderSignalInput dataclass)

Factor weights (raw pts, rescaled to 100):
  Revenue tier             25
  Invoice timeliness       20
  Business age             10
  Unpaid invoice ratio     10
  Industry Risk            10
  Market Viability         10
  Compliance Documents     25
  Intent Documents         15
  Founder Signal           15  ← new
  ────────────────────────────
  RAW_MAX                 140
"""

from __future__ import annotations
from dataclasses import dataclass, field

from services.market_data_service import (
    sector_survival_score,
    province_market_score,
    get_market_intelligence,
)

RAW_MAX = 140.0

COMPLIANCE_POINTS: dict[str, int] = {
    "cipc":               10,
    "bank_statement":      8,
    "tax_clearance":       5,
    "registration_docs":   2,
}
MAX_COMPLIANCE_POINTS = 25

INTENT_BASE_POINTS: dict[str, int] = {
    "letter_of_intent": 8,
    "supplier_quote":   4,
    "lease_agreement":  3,
}
LOI_KNOWN_COUNTERPARTY_BONUS = 4
MAX_INTENT_POINTS = 15

MAX_FOUNDER_POINTS = 15

# Qualification levels — ordered lowest to highest
QUALIFICATION_LEVELS = {
    "none":         0,
    "matric":       1,
    "certificate":  2,
    "diploma":      2,
    "degree":       4,
    "postgraduate": 4,
}


# ── Founder signal input ──────────────────────────────────────────────────────
@dataclass
class FounderSignalInput:
    """
    Built by scoring_service from the FounderProfile record.
    All fields optional — absent = not yet collected.
    """
    years_industry_experience: int   | None = None
    highest_qualification:     str   | None = None
    prior_business_owner:      bool  | None = None
    trade_association_member:  bool  | None = None
    reference_provided:        bool  | None = None  # True if reference_name is populated


# ── Main scoring input ────────────────────────────────────────────────────────
@dataclass
class ScoringInput:
    revenue:       float
    years_active:  int
    industry:      str

    total_invoices:  int
    paid_on_time:    int
    unpaid_invoices: int

    verifications:      dict[str, str]   = field(default_factory=dict)
    intent_doc_details: dict[str, dict]  = field(default_factory=dict)

    # Bank statement signals
    overdraft_count:   int   | None = None
    income_regularity: float | None = None
    months_analysed:   int   | None = None

    # Location
    province: str | None = None

    # Founder signals — None when FounderProfile not yet created
    founder: FounderSignalInput | None = None


# ── Output ────────────────────────────────────────────────────────────────────
@dataclass
class ScoringResult:
    score:     float
    decision:  str
    breakdown: dict[str, dict]


# ── Engine ────────────────────────────────────────────────────────────────────
def calculate_score(inp: ScoringInput) -> ScoringResult:
    breakdown: dict[str, dict] = {}
    raw = 0.0

    # 1. Revenue tier (25 pts) ─────────────────────────────────────────────────
    revenue_source = "parsed" if inp.months_analysed is not None else "self-reported"
    if inp.revenue >= 500_000:   rev_pts, rev_label = 25, "≥ R500k"
    elif inp.revenue >= 200_000: rev_pts, rev_label = 18, "R200k–R500k"
    elif inp.revenue >= 100_000: rev_pts, rev_label = 12, "R100k–R200k"
    elif inp.revenue >= 50_000:  rev_pts, rev_label =  7, "R50k–R100k"
    else:                        rev_pts, rev_label =  3, "< R50k"

    raw += rev_pts
    breakdown["Revenue Tier"] = {
        "value": inp.revenue, "label": f"{rev_label} ({revenue_source})",
        "contribution": rev_pts, "max": 25, "source": revenue_source,
    }

    # 2. Invoice timeliness (20 pts) ───────────────────────────────────────────
    if inp.total_invoices == 0:
        time_pts, time_label, time_ratio = 10, "No invoices yet", None
    else:
        time_ratio = inp.paid_on_time / inp.total_invoices
        if time_ratio >= 0.90:   time_pts, time_label = 20, f"{time_ratio:.0%} on time"
        elif time_ratio >= 0.70: time_pts, time_label = 13, f"{time_ratio:.0%} on time"
        elif time_ratio >= 0.50: time_pts, time_label =  7, f"{time_ratio:.0%} on time"
        else:                    time_pts, time_label =  3, f"{time_ratio:.0%} on time"

    raw += time_pts
    breakdown["Invoice Timeliness"] = {
        "value": time_ratio, "label": time_label,
        "contribution": time_pts, "max": 20,
    }

    # 3. Business age (10 pts) ─────────────────────────────────────────────────
    if inp.years_active >= 5:   age_pts, age_label = 10, f"{inp.years_active} years"
    elif inp.years_active >= 2: age_pts, age_label =  6, f"{inp.years_active} years"
    elif inp.years_active >= 1: age_pts, age_label =  3, f"{inp.years_active} year"
    else:                       age_pts, age_label =  1, "< 1 year"

    raw += age_pts
    breakdown["Business Age"] = {
        "value": inp.years_active, "label": age_label,
        "contribution": age_pts, "max": 10,
    }

    # 4. Unpaid invoice ratio (10 pts) ─────────────────────────────────────────
    if inp.total_invoices == 0:
        unpaid_pts, unpaid_label, unpaid_ratio = 5, "No invoices", None
    else:
        unpaid_ratio = inp.unpaid_invoices / inp.total_invoices
        if unpaid_ratio <= 0.05:   unpaid_pts = 10
        elif unpaid_ratio <= 0.15: unpaid_pts = 6
        elif unpaid_ratio <= 0.30: unpaid_pts = 3
        else:                      unpaid_pts = 0
        unpaid_label = f"{unpaid_ratio:.0%} unpaid"

    raw += unpaid_pts
    breakdown["Unpaid Invoice Ratio"] = {
        "value": unpaid_ratio, "label": unpaid_label,
        "contribution": unpaid_pts, "max": 10,
    }

    # 5. Industry Risk (10 pts) ────────────────────────────────────────────────
    survival = sector_survival_score(inp.industry)
    industry_pts = round(_scale(survival, 0.38, 0.72, 3, 10), 1)
    intel = get_market_intelligence(inp.industry, inp.province)

    raw += industry_pts
    breakdown["Industry Risk"] = {
        "value": survival,
        "label": intel["survival_label"],
        "contribution": industry_pts,
        "max": 10,
        "sector_survival_rate": survival,
    }

    # 6. Market Viability (10 pts) ─────────────────────────────────────────────
    if inp.province:
        mkt_score  = province_market_score(inp.province, inp.industry)
        market_pts = round(_scale(mkt_score, 0.30, 1.00, 3, 10), 1)
        market_label = intel["market_label"]
        market_note  = None
    else:
        mkt_score, market_pts = None, 5.0
        market_label = "Province not specified — neutral score applied"
        market_note  = "Add your province to improve this factor"

    raw += market_pts
    breakdown["Market Viability"] = {
        "value": mkt_score, "label": market_label,
        "contribution": market_pts, "max": 10,
        "province": inp.province, "note": market_note,
    }

    # 7. Compliance Documents (25 pts) ─────────────────────────────────────────
    comp_pts = 0
    verified_compliance: list[str] = []
    missing_compliance:  list[str] = []

    for doc_type, points in COMPLIANCE_POINTS.items():
        if inp.verifications.get(doc_type) == "approved":
            comp_pts += points
            verified_compliance.append(doc_type)
        else:
            missing_compliance.append(doc_type)

    bs_bonus, bs_bonus_detail = 0, []
    if inp.months_analysed is not None:
        if inp.months_analysed >= 6:   bs_bonus += 2; bs_bonus_detail.append(f"{inp.months_analysed} months of history")
        elif inp.months_analysed >= 3: bs_bonus += 1; bs_bonus_detail.append(f"{inp.months_analysed} months of history")
        if inp.income_regularity is not None:
            if inp.income_regularity >= 0.80:   bs_bonus += 2; bs_bonus_detail.append("consistent income pattern")
            elif inp.income_regularity >= 0.60: bs_bonus += 1; bs_bonus_detail.append("moderate income consistency")
        if inp.overdraft_count:
            penalty = min(inp.overdraft_count, 2)
            bs_bonus -= penalty
            bs_bonus_detail.append(f"{inp.overdraft_count} overdraft month(s) detected")

    comp_pts = min(comp_pts + bs_bonus, MAX_COMPLIANCE_POINTS)
    raw += comp_pts
    breakdown["Compliance Documents"] = {
        "value": comp_pts,
        "label": f"{len(verified_compliance)} of {len(COMPLIANCE_POINTS)} compliance docs verified",
        "contribution": comp_pts, "max": MAX_COMPLIANCE_POINTS,
        "verified": verified_compliance, "missing": missing_compliance,
        "bank_statement_parsed":  inp.months_analysed is not None,
        "bank_statement_quality": bs_bonus_detail or None,
    }

    # 8. Intent Documents (15 pts) ─────────────────────────────────────────────
    intent_pts = 0
    verified_intent: list[str] = []
    missing_intent:  list[str] = []
    intent_notes:    list[str] = []

    for doc_type, base_pts in INTENT_BASE_POINTS.items():
        details = inp.intent_doc_details.get(doc_type, {})
        status  = details.get("status") or inp.verifications.get(doc_type)
        if status == "approved":
            pts = base_pts
            verified_intent.append(doc_type)
            if doc_type == "letter_of_intent":
                known = details.get("loi_counterparty_known")
                if known is True:
                    pts += LOI_KNOWN_COUNTERPARTY_BONUS
                    intent_notes.append(f"LOI from recognised counterparty (+{LOI_KNOWN_COUNTERPARTY_BONUS} pts)")
                elif known is False:
                    intent_notes.append("LOI counterparty not verified — base points only")
                else:
                    intent_notes.append("LOI counterparty not yet reviewed by admin")
            intent_pts += pts
        else:
            missing_intent.append(doc_type)

    intent_pts = min(intent_pts, MAX_INTENT_POINTS)
    raw += intent_pts
    breakdown["Intent Documents"] = {
        "value": intent_pts,
        "label": (
            f"{len(verified_intent)} of {len(INTENT_BASE_POINTS)} intent docs verified"
            if verified_intent else "No intent documents submitted"
        ),
        "contribution": intent_pts, "max": MAX_INTENT_POINTS,
        "verified": verified_intent, "missing": missing_intent,
        "notes": intent_notes or None,
    }

    # 9. Founder Signal (15 pts) — NEW ────────────────────────────────────────
    founder_pts  = 0
    founder_detail: list[str] = []

    if inp.founder is None:
        # Profile not yet created — neutral 0 pts, but clearly labelled
        founder_label = "Founder profile not yet completed"
        founder_note  = "Complete your founder profile to earn up to 15 pts"
    else:
        f = inp.founder

        # Experience (max 5 pts)
        exp = f.years_industry_experience
        if exp is not None:
            if exp >= 5:
                founder_pts += 5; founder_detail.append(f"{exp} years industry experience")
            elif exp >= 2:
                founder_pts += 3; founder_detail.append(f"{exp} years industry experience")
            elif exp >= 1:
                founder_pts += 1; founder_detail.append(f"{exp} year industry experience")

        # Qualification (max 4 pts)
        qual = (f.highest_qualification or "").lower().strip()
        qual_pts = QUALIFICATION_LEVELS.get(qual, 0)
        if qual_pts > 0:
            founder_pts += qual_pts
            founder_detail.append(f"{f.highest_qualification} qualification")

        # Prior business ownership (3 pts)
        if f.prior_business_owner is True:
            founder_pts += 3; founder_detail.append("prior business ownership")

        # Network / reference (3 pts)
        if f.trade_association_member is True:
            founder_pts += 2; founder_detail.append("trade association member")
        if f.reference_provided is True:
            founder_pts += 1; founder_detail.append("business reference provided")

        founder_pts  = min(founder_pts, MAX_FOUNDER_POINTS)
        founder_label = (
            f"Founder profile: {founder_pts}/{MAX_FOUNDER_POINTS} pts"
            if founder_detail else "Founder profile submitted — no scoreable signals yet"
        )
        founder_note  = None

    raw += founder_pts
    breakdown["Founder Signal"] = {
        "value":        founder_pts,
        "label":        founder_label,
        "contribution": founder_pts,
        "max":          MAX_FOUNDER_POINTS,
        "detail":       founder_detail or None,
        "note":         founder_note,
    }

    # ── Rescale → 0–100 ───────────────────────────────────────────────────────
    score = round(min(max((raw / RAW_MAX) * 100, 0), 100), 1)
    return ScoringResult(score=score, decision=determine_decision(score), breakdown=breakdown)


def determine_decision(score: float) -> str:
    if score >= 75: return "Approved"
    if score >= 50: return "Review"
    return "Declined"


def _scale(value, low_val, high_val, low_pts, high_pts):
    if value <= low_val:  return low_pts
    if value >= high_val: return high_pts
    return low_pts + (value - low_val) / (high_val - low_val) * (high_pts - low_pts)