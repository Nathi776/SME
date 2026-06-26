"""
core/scoring.py — Single authoritative scoring engine.

Changes in this version:
- ScoringInput gains three optional bank statement fields:
    overdraft_count, income_regularity, months_analysed
- Revenue tier now uses verified (parsed) revenue when available —
  the scoring service passes this in; the engine just uses whatever
  revenue value it receives
- Verification Depth factor now awards a bonus when a bank statement
  has been parsed (signals extracted), separate from admin approval
- Bank statement quality bonus (up to 5 pts) added inside the
  Verification Depth factor when parsed signals are present

Factor weights (max points):
  Revenue tier          25 pts  ← uses parsed revenue if available
  Invoice timeliness    20 pts
  Business age          10 pts
  Unpaid invoice ratio  10 pts
  Industry risk         10 pts
  Verification depth    25 pts  ← includes bank statement quality bonus
  ─────────────────────────────
  Total possible       100 pts

Decision thresholds:
  ≥ 75  → Approved
  ≥ 50  → Review
  < 50  → Declined
"""

from __future__ import annotations
from dataclasses import dataclass, field
from typing import Literal

# ---------------------------------------------------------------------------
# Industry risk mapping
# ---------------------------------------------------------------------------
INDUSTRY_RISK: dict[str, Literal["low", "medium", "high"]] = {
    "Technology":               "low",
    "Professional Services":    "low",
    "Healthcare":               "low",
    "Manufacturing":            "medium",
    "Retail":                   "medium",
    "Food & Beverage":          "medium",
    "Agriculture":              "medium",
    "Transport & Logistics":    "high",
    "Construction":             "high",
    "Other":                    "medium",
}

# Verification documents and their score contributions (status == "approved")
VERIFICATION_POINTS: dict[str, int] = {
    "cipc":               10,
    "bank_statement":      8,
    "tax_clearance":       5,
    "registration_docs":   2,
}
MAX_VERIFICATION_POINTS = 25


# ---------------------------------------------------------------------------
# Input dataclass
# ---------------------------------------------------------------------------
@dataclass
class ScoringInput:
    # Business signals
    revenue: float          # Parsed from bank statement if available, else self-reported
    years_active: int
    industry: str

    # Invoice signals
    total_invoices: int
    paid_on_time: int
    unpaid_invoices: int

    # Verification signals
    verifications: dict[str, str] = field(default_factory=dict)

    # Bank statement signals — None when no statement has been parsed yet
    overdraft_count:   int   | None = None   # months with negative closing balance
    income_regularity: float | None = None   # 0.0 (chaotic) → 1.0 (consistent)
    months_analysed:   int   | None = None   # how many months were parsed


# ---------------------------------------------------------------------------
# Output dataclass
# ---------------------------------------------------------------------------
@dataclass
class ScoringResult:
    score: float
    decision: str
    breakdown: dict[str, dict]


# ---------------------------------------------------------------------------
# Core engine
# ---------------------------------------------------------------------------
def calculate_score(inp: ScoringInput) -> ScoringResult:
    breakdown: dict[str, dict] = {}

    # 1. Revenue tier (25 pts)
    revenue_source = "parsed" if inp.months_analysed is not None else "self-reported"
    if inp.revenue >= 500_000:
        rev_pts, rev_label = 25, "≥ R500k"
    elif inp.revenue >= 200_000:
        rev_pts, rev_label = 18, "R200k–R500k"
    elif inp.revenue >= 100_000:
        rev_pts, rev_label = 12, "R100k–R200k"
    elif inp.revenue >= 50_000:
        rev_pts, rev_label =  7, "R50k–R100k"
    else:
        rev_pts, rev_label =  3, "< R50k"

    breakdown["Revenue Tier"] = {
        "value":        inp.revenue,
        "label":        f"{rev_label} ({revenue_source})",
        "contribution": rev_pts,
        "max":          25,
        "source":       revenue_source,
    }

    # 2. Invoice timeliness (20 pts)
    if inp.total_invoices == 0:
        time_pts, time_label, time_ratio = 10, "No invoices yet", None
    else:
        time_ratio = inp.paid_on_time / inp.total_invoices
        if time_ratio >= 0.90:
            time_pts, time_label = 20, f"{time_ratio:.0%} on time"
        elif time_ratio >= 0.70:
            time_pts, time_label = 13, f"{time_ratio:.0%} on time"
        elif time_ratio >= 0.50:
            time_pts, time_label =  7, f"{time_ratio:.0%} on time"
        else:
            time_pts, time_label =  3, f"{time_ratio:.0%} on time"

    breakdown["Invoice Timeliness"] = {
        "value": time_ratio, "label": time_label,
        "contribution": time_pts, "max": 20,
    }

    # 3. Business age (10 pts)
    if inp.years_active >= 5:
        age_pts, age_label = 10, f"{inp.years_active} years"
    elif inp.years_active >= 2:
        age_pts, age_label =  6, f"{inp.years_active} years"
    elif inp.years_active >= 1:
        age_pts, age_label =  3, f"{inp.years_active} year"
    else:
        age_pts, age_label =  1, "< 1 year"

    breakdown["Business Age"] = {
        "value": inp.years_active, "label": age_label,
        "contribution": age_pts, "max": 10,
    }

    # 4. Unpaid invoice ratio (10 pts)
    if inp.total_invoices == 0:
        unpaid_pts, unpaid_label, unpaid_ratio = 5, "No invoices", None
    else:
        unpaid_ratio = inp.unpaid_invoices / inp.total_invoices
        if unpaid_ratio <= 0.05:   unpaid_pts = 10
        elif unpaid_ratio <= 0.15: unpaid_pts = 6
        elif unpaid_ratio <= 0.30: unpaid_pts = 3
        else:                      unpaid_pts = 0
        unpaid_label = f"{unpaid_ratio:.0%} unpaid"

    breakdown["Unpaid Invoice Ratio"] = {
        "value": unpaid_ratio, "label": unpaid_label,
        "contribution": unpaid_pts, "max": 10,
    }

    # 5. Industry risk (10 pts)
    risk_level   = INDUSTRY_RISK.get(inp.industry, "medium")
    industry_pts = {"low": 10, "medium": 6, "high": 3}[risk_level]

    breakdown["Industry Risk"] = {
        "value": inp.industry,
        "label": f"{inp.industry} ({risk_level} risk)",
        "contribution": industry_pts, "max": 10,
    }

    # 6. Verification depth (25 pts)
    #    Base: approved documents
    #    Bonus: bank statement quality signals (up to 5 extra pts within the cap)
    ver_pts       = 0
    verified_docs: list[str] = []
    missing_docs:  list[str] = []

    for doc_type, points in VERIFICATION_POINTS.items():
        status = inp.verifications.get(doc_type)
        if status == "approved":
            ver_pts += points
            verified_docs.append(doc_type)
        else:
            missing_docs.append(doc_type)

    # Bank statement quality bonus — awarded when signals were parsed,
    # regardless of admin approval status (parsing happens on upload)
    bs_bonus = 0
    bs_bonus_detail: list[str] = []

    if inp.months_analysed is not None:
        # Reward depth of history
        if inp.months_analysed >= 6:
            bs_bonus += 2
            bs_bonus_detail.append(f"{inp.months_analysed} months of history")
        elif inp.months_analysed >= 3:
            bs_bonus += 1
            bs_bonus_detail.append(f"{inp.months_analysed} months of history")

        # Reward income consistency
        if inp.income_regularity is not None:
            if inp.income_regularity >= 0.80:
                bs_bonus += 2
                bs_bonus_detail.append("consistent income pattern")
            elif inp.income_regularity >= 0.60:
                bs_bonus += 1
                bs_bonus_detail.append("moderate income consistency")

        # Penalise overdraft behaviour
        if inp.overdraft_count is not None and inp.overdraft_count > 0:
            penalty = min(inp.overdraft_count, 2)
            bs_bonus -= penalty
            bs_bonus_detail.append(f"{inp.overdraft_count} overdraft month(s) detected")

    ver_pts = min(ver_pts + bs_bonus, MAX_VERIFICATION_POINTS)

    breakdown["Verification Depth"] = {
        "value":        ver_pts,
        "label":        f"{len(verified_docs)} of {len(VERIFICATION_POINTS)} documents verified",
        "contribution": ver_pts,
        "max":          MAX_VERIFICATION_POINTS,
        "verified":     verified_docs,
        "missing":      missing_docs,
        "bank_statement_parsed": inp.months_analysed is not None,
        "bank_statement_quality": bs_bonus_detail if bs_bonus_detail else None,
    }

    # ── Final score ───────────────────────────────────────────────────────────
    total  = rev_pts + time_pts + age_pts + unpaid_pts + industry_pts + ver_pts
    score  = float(min(max(total, 0), 100))
    return ScoringResult(score=score, decision=determine_decision(score), breakdown=breakdown)


def determine_decision(score: float) -> str:
    if score >= 75:  return "Approved"
    if score >= 50:  return "Review"
    return "Declined"