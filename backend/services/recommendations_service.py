"""
services/recommendations_service.py

Transforms a ScoringResult breakdown into a prioritised action plan.

Design principles:
  1. Every recommendation maps to a specific, actionable step.
  2. Every recommendation states the exact score impact (pts gained).
  3. Recommendations are sorted by impact — highest gain first.
  4. Recommendations are grouped by category so the SME sees a
     coherent plan, not a random list.
  5. The projected score is computed assuming all recommendations
     are followed — giving the SME a clear target to aim for.
  6. This service never calls the database. It works purely from
     the ScoringResult breakdown dict. This keeps it fast, testable,
     and decoupled from the DB layer.

Output contract: RecommendationPlan dataclass
"""

from __future__ import annotations
from dataclasses import dataclass, field
from typing import Literal

from core.assessment_engine import AssessmentResult

# ── Types ─────────────────────────────────────────────────────────────────────

Category = Literal[
    "Compliance Documents",
    "Intent Documents",
    "Founder Profile",
    "Business Performance",
    "Market Position",
]

@dataclass
class Recommendation:
    category:       Category
    action:         str          # What to do — specific and imperative
    reason:         str          # Why this matters — one sentence
    impact_pts:     float        # Raw pts gained (pre-rescaling)
    impact_score:   float        # Rescaled score impact (0–100 scale)
    difficulty:     Literal["Easy", "Medium", "Hard"]
    time_estimate:  str          # e.g. "1–2 days", "1 week"
    doc_type:       str | None   # If upload required, the doc_type key
    priority:       int          # 1 = highest (computed from impact)


@dataclass
class FactorStatus:
    factor:       str
    current_pts:  float
    max_pts:      float
    pct:          float          # current / max as 0–100
    status:       Literal["Strong", "Moderate", "Weak", "Missing"]
    gap_pts:      float          # max - current


@dataclass
class RecommendationPlan:
    current_score:      float
    projected_score:    float    # if all recommendations followed
    decision:           str      # current decision
    projected_decision: str      # after all recommendations
    recommendations:    list[Recommendation]
    factor_statuses:    list[FactorStatus]
    summary:            str      # one-sentence coaching message
    raw_max:            float    # exposed for frontend rescaling checks


# ── Constants ─────────────────────────────────────────────────────────────────

RAW_MAX = 140.0   # must stay in sync with core/scoring.py

# Human-readable labels for document types
DOC_LABELS = {
    "cipc":             "CIPC Registration Certificate",
    "bank_statement":   "Bank Statement (6 months)",
    "tax_clearance":    "SARS Tax Clearance Certificate",
    "registration_docs":"Supporting Registration Documents",
    "letter_of_intent": "Letter of Intent",
    "supplier_quote":   "Supplier Quote",
    "lease_agreement":  "Lease Agreement",
}

DIFFICULTY_MAP = {
    "cipc":             ("Medium", "3–5 days"),
    "bank_statement":   ("Easy",   "1–2 days"),
    "tax_clearance":    ("Medium", "1–2 weeks"),
    "registration_docs":("Easy",   "1–2 days"),
    "letter_of_intent": ("Hard",   "1–4 weeks"),
    "supplier_quote":   ("Medium", "1–2 weeks"),
    "lease_agreement":  ("Hard",   "2–4 weeks"),
}


# ── Helpers ───────────────────────────────────────────────────────────────────

def _rescale(raw_pts: float) -> float:
    """Convert raw pts gain to rescaled score impact."""
    return round((raw_pts / RAW_MAX) * 100, 1)


def _factor_status(current: float, maximum: float) -> Literal["Strong", "Moderate", "Weak", "Missing"]:
    if maximum == 0:
        return "Strong"
    pct = current / maximum
    if pct >= 0.80: return "Strong"
    if pct >= 0.50: return "Moderate"
    if pct  > 0.00: return "Weak"
    return "Missing"


def _determine_decision(score: float) -> str:
    if score >= 75: return "Approved"
    if score >= 50: return "Review"
    return "Declined"


# ── Main function ─────────────────────────────────────────────────────────────

def generate_plan(
    breakdown: dict[str, dict],
    current_score: float,
) -> RecommendationPlan:
    """
    Generate a personalised recommendation plan from a score breakdown.

    Args:
        breakdown:     The `breakdown` dict from ScoringResult
        current_score: The rescaled 0–100 score

    Returns:
        RecommendationPlan with prioritised, actionable recommendations
    """
    recommendations: list[Recommendation] = []
    factor_statuses: list[FactorStatus]   = []
    total_possible_gain_raw = 0.0

    # ── Analyse each factor ───────────────────────────────────────────────────

    # 1. Revenue Tier
    rev = breakdown.get("Revenue Tier", {})
    rev_current = rev.get("contribution", 0)
    rev_max     = rev.get("max", 25)
    rev_gap     = rev_max - rev_current
    factor_statuses.append(FactorStatus(
        "Revenue Tier", rev_current, rev_max,
        round(rev_current / rev_max * 100) if rev_max else 0, _factor_status(rev_current, rev_max), rev_gap
    ))
    if rev_gap > 0 and rev.get("source") == "self-reported":
        recommendations.append(Recommendation(
            category="Compliance Documents",
            action="Upload 6 months of bank statements to verify your revenue",
            reason=(
                "Your revenue is currently self-reported. Verified bank statement "
                "revenue replaces self-declared figures and unlocks the full revenue score."
            ),
            impact_pts=rev_gap,
            impact_score=_rescale(rev_gap),
            difficulty="Easy",
            time_estimate="1–2 days",
            doc_type="bank_statement",
            priority=0,
        ))
        total_possible_gain_raw += rev_gap

    # 2. Invoice Timeliness
    inv = breakdown.get("Invoice Timeliness", {})
    inv_current = inv.get("contribution", 0)
    inv_max     = inv.get("max", 20)
    inv_gap     = inv_max - inv_current
    factor_statuses.append(FactorStatus(
        "Invoice Timeliness", inv_current, inv_max,
        round(inv_current / inv_max * 100) if inv_max else 0, _factor_status(inv_current, inv_max), inv_gap
    ))
    if inv_gap > 0 and inv.get("value") is not None:
        # Has invoices but timeliness is poor
        recommendations.append(Recommendation(
            category="Business Performance",
            action="Improve invoice collection — follow up on overdue invoices promptly",
            reason=(
                f"Your current on-time payment rate is below 90%. "
                "Consistently collecting payments on time is one of the strongest "
                "signals of business financial health."
            ),
            impact_pts=inv_gap,
            impact_score=_rescale(inv_gap),
            difficulty="Hard",
            time_estimate="1–3 months",
            doc_type=None,
            priority=0,
        ))
        total_possible_gain_raw += inv_gap

    # 3. Business Age — not actionable (time-based), show status only
    age = breakdown.get("Business Age", {})
    age_current = age.get("contribution", 0)
    age_max     = age.get("max", 10)
    factor_statuses.append(FactorStatus(
        "Business Age", age_current, age_max,
        round(age_current / age_max * 100) if age_max else 0, _factor_status(age_current, age_max),
        age_max - age_current
    ))
    # No recommendation — time cannot be accelerated

    # 4. Unpaid Invoice Ratio
    unp = breakdown.get("Unpaid Invoice Ratio", {})
    unp_current = unp.get("contribution", 0)
    unp_max     = unp.get("max", 10)
    unp_gap     = unp_max - unp_current
    factor_statuses.append(FactorStatus(
        "Unpaid Invoice Ratio", unp_current, unp_max,
        round(unp_current / unp_max * 100) if unp_max else 0, _factor_status(unp_current, unp_max), unp_gap
    ))
    if unp_gap > 0 and unp.get("value") is not None and float(unp.get("value", 0)) > 0.05:
        recommendations.append(Recommendation(
            category="Business Performance",
            action="Reduce your unpaid invoice ratio below 5% of total invoices",
            reason=(
                "A high proportion of unpaid invoices signals cash flow risk. "
                "Lenders weigh this heavily when assessing repayment likelihood."
            ),
            impact_pts=unp_gap,
            impact_score=_rescale(unp_gap),
            difficulty="Hard",
            time_estimate="1–3 months",
            doc_type=None,
            priority=0,
        ))
        total_possible_gain_raw += unp_gap

    # 5. Industry Risk — not directly actionable
    ind = breakdown.get("Industry Risk", {})
    ind_current = ind.get("contribution", 0)
    ind_max     = ind.get("max", 10)
    factor_statuses.append(FactorStatus(
        "Industry Risk", ind_current, ind_max,
        round(ind_current / ind_max * 100) if ind_max else 0, _factor_status(ind_current, ind_max),
        ind_max - ind_current
    ))

    # 6. Market Viability
    mkt = breakdown.get("Market Viability", {})
    mkt_current = mkt.get("contribution", 0)
    mkt_max     = mkt.get("max", 10)
    mkt_gap     = mkt_max - mkt_current
    factor_statuses.append(FactorStatus(
        "Market Viability", mkt_current, mkt_max,
        round(mkt_current / mkt_max * 100) if mkt_max else 0, _factor_status(mkt_current, mkt_max), mkt_gap
    ))
    if mkt.get("province") is None:
        # Province not set — easy win
        recommendations.append(Recommendation(
            category="Market Position",
            action="Add your province in your business profile settings",
            reason=(
                "Your province is not set. Province data feeds the Market Viability "
                "factor and can add up to 10 points depending on your location and sector."
            ),
            impact_pts=5.0,   # gain from neutral (5) to likely value
            impact_score=_rescale(5.0),
            difficulty="Easy",
            time_estimate="5 minutes",
            doc_type=None,
            priority=0,
        ))
        total_possible_gain_raw += 5.0

    # 7. Compliance Documents
    comp = breakdown.get("Compliance Documents", {})
    comp_current = comp.get("contribution", 0)
    comp_max     = comp.get("max", 25)
    comp_gap     = comp_max - comp_current
    factor_statuses.append(FactorStatus(
        "Compliance Documents", comp_current, comp_max,
        round(comp_current / comp_max * 100) if comp_max else 0, _factor_status(comp_current, comp_max), comp_gap
    ))

    missing_docs: list[str] = comp.get("missing", [])
    for doc_type in missing_docs:
        from core.scoring import COMPLIANCE_POINTS
        pts = COMPLIANCE_POINTS.get(doc_type, 0)
        if pts == 0:
            continue
        diff, time_est = DIFFICULTY_MAP.get(doc_type, ("Medium", "1–2 weeks"))
        recommendations.append(Recommendation(
            category="Compliance Documents",
            action=f"Upload and verify your {DOC_LABELS.get(doc_type, doc_type)}",
            reason=_compliance_reason(doc_type),
            impact_pts=float(pts),
            impact_score=_rescale(float(pts)),
            difficulty=diff,
            time_estimate=time_est,
            doc_type=doc_type,
            priority=0,
        ))
        total_possible_gain_raw += pts

    # 8. Intent Documents
    intent = breakdown.get("Intent Documents", {})
    intent_current = intent.get("contribution", 0)
    intent_max     = intent.get("max", 15)
    intent_gap     = intent_max - intent_current
    factor_statuses.append(FactorStatus(
        "Intent Documents", intent_current, intent_max,
        round(intent_current / intent_max * 100) if intent_max else 0, _factor_status(intent_current, intent_max), intent_gap
    ))

    missing_intent: list[str] = intent.get("missing", [])
    from core.scoring import INTENT_BASE_POINTS, LOI_KNOWN_COUNTERPARTY_BONUS
    for doc_type in missing_intent:
        base_pts = INTENT_BASE_POINTS.get(doc_type, 0)
        if base_pts == 0:
            continue
        # LOI earns more with known counterparty
        max_pts = base_pts + (LOI_KNOWN_COUNTERPARTY_BONUS if doc_type == "letter_of_intent" else 0)
        diff, time_est = DIFFICULTY_MAP.get(doc_type, ("Hard", "2–4 weeks"))
        recommendations.append(Recommendation(
            category="Intent Documents",
            action=f"Obtain and upload a {DOC_LABELS.get(doc_type, doc_type)}",
            reason=_intent_reason(doc_type),
            impact_pts=float(max_pts),
            impact_score=_rescale(float(max_pts)),
            difficulty=diff,
            time_estimate=time_est,
            doc_type=doc_type,
            priority=0,
        ))
        total_possible_gain_raw += max_pts

    # 9. Founder Signal
    founder = breakdown.get("Founder Signal", {})
    founder_current = founder.get("contribution", 0)
    founder_max     = founder.get("max", 15)
    founder_gap     = founder_max - founder_current
    factor_statuses.append(FactorStatus(
        "Founder Signal", founder_current, founder_max,
        round(founder_current / founder_max * 100) if founder_max else 0,
        _factor_status(founder_current, founder_max), founder_gap
    ))

    if founder.get("note") and "not yet completed" in founder.get("note", ""):
        # Profile doesn't exist at all
        recommendations.append(Recommendation(
            category="Founder Profile",
            action="Complete your Founder Profile (experience, education, references)",
            reason=(
                "Your founder profile is empty. Completing it can add up to 15 points "
                "by demonstrating your industry experience, qualifications, and network."
            ),
            impact_pts=float(founder_gap),
            impact_score=_rescale(float(founder_gap)),
            difficulty="Easy",
            time_estimate="15–20 minutes",
            doc_type=None,
            priority=0,
        ))
        total_possible_gain_raw += founder_gap
    elif founder_gap > 0:
        # Profile exists but incomplete — give targeted advice
        _add_founder_gap_recommendations(
            recommendations, founder, founder_gap, total_possible_gain_raw
        )
        total_possible_gain_raw += founder_gap

    # ── Sort by impact descending, assign priority ────────────────────────────
    recommendations.sort(key=lambda r: r.impact_pts, reverse=True)
    for i, rec in enumerate(recommendations):
        rec.priority = i + 1

    # ── Projected score ───────────────────────────────────────────────────────
    projected_raw   = min((current_score / 100) * RAW_MAX + total_possible_gain_raw, RAW_MAX)
    projected_score = round(min((projected_raw / RAW_MAX) * 100, 100), 1)

    return RecommendationPlan(
        current_score=current_score,
        projected_score=projected_score,
        decision=_determine_decision(current_score),
        projected_decision=_determine_decision(projected_score),
        recommendations=recommendations,
        factor_statuses=factor_statuses,
        summary=_generate_summary(current_score, projected_score, recommendations),
        raw_max=RAW_MAX,
    )


# ── Reason generators ─────────────────────────────────────────────────────────

def _compliance_reason(doc_type: str) -> str:
    reasons = {
        "cipc": (
            "CIPC registration is the single highest-value compliance document (+10 pts). "
            "It proves your business is legally registered and operating formally."
        ),
        "bank_statement": (
            "Bank statements are parsed automatically to extract cashflow signals. "
            "They replace self-reported revenue with verified figures and earn +8 pts when approved."
        ),
        "tax_clearance": (
            "A SARS Tax Clearance Certificate proves your business is tax-compliant (+5 pts). "
            "Lenders treat this as a strong indicator of operational maturity."
        ),
        "registration_docs": (
            "Supporting registration documents (address, banking details, VAT number) "
            "complete the compliance picture and add +2 pts."
        ),
    }
    return reasons.get(doc_type, "This document improves your compliance score.")


def _intent_reason(doc_type: str) -> str:
    reasons = {
        "letter_of_intent": (
            "A Letter of Intent proves that a real buyer intends to purchase from you — "
            "worth up to 12 pts. If the counterparty is a known company, you earn a bonus +4 pts."
        ),
        "supplier_quote": (
            "A supplier quote shows you have an active supply chain and are ready to operate. "
            "Worth +4 pts and signals business readiness to lenders."
        ),
        "lease_agreement": (
            "A signed lease agreement proves you have physical premises and are committed to "
            "operating. Worth +3 pts as a credibility signal."
        ),
    }
    return reasons.get(doc_type, "This document demonstrates business intent to lenders.")


def _add_founder_gap_recommendations(
    recommendations: list[Recommendation],
    founder_bd: dict,
    gap: float,
    running_total: float,
) -> None:
    """Add targeted founder gap recommendations when profile exists but is incomplete."""
    detail = founder_bd.get("detail") or []

    if not any("experience" in d for d in detail):
        recommendations.append(Recommendation(
            category="Founder Profile",
            action="Add your years of industry experience to your Founder Profile",
            reason="Industry experience is worth up to 5 pts and is one of the strongest founder signals.",
            impact_pts=5.0,
            impact_score=_rescale(5.0),
            difficulty="Easy",
            time_estimate="5 minutes",
            doc_type=None,
            priority=0,
        ))

    if not any("qualification" in d for d in detail):
        recommendations.append(Recommendation(
            category="Founder Profile",
            action="Add your highest qualification (degree, diploma, or certificate)",
            reason="Formal qualifications earn up to 4 pts and signal execution capability to lenders.",
            impact_pts=4.0,
            impact_score=_rescale(4.0),
            difficulty="Easy",
            time_estimate="5 minutes",
            doc_type=None,
            priority=0,
        ))

    if not any("business ownership" in d for d in detail):
        recommendations.append(Recommendation(
            category="Founder Profile",
            action="Indicate whether you have previously owned a business",
            reason="Prior business ownership adds 3 pts — it signals entrepreneurial resilience.",
            impact_pts=3.0,
            impact_score=_rescale(3.0),
            difficulty="Easy",
            time_estimate="2 minutes",
            doc_type=None,
            priority=0,
        ))

    if not any("association" in d for d in detail):
        recommendations.append(Recommendation(
            category="Founder Profile",
            action="Add your trade association membership (SACCI, NAFCOC, Master Builders SA, etc.)",
            reason="Association membership is social capital — it adds 2 pts and signals sector credibility.",
            impact_pts=2.0,
            impact_score=_rescale(2.0),
            difficulty="Easy",
            time_estimate="5 minutes",
            doc_type=None,
            priority=0,
        ))

    if not any("reference" in d for d in detail):
        recommendations.append(Recommendation(
            category="Founder Profile",
            action="Add a business reference contact to your Founder Profile",
            reason="A business reference adds 1 pt and increases trust in your network.",
            impact_pts=1.0,
            impact_score=_rescale(1.0),
            difficulty="Easy",
            time_estimate="2 minutes",
            doc_type=None,
            priority=0,
        ))


def _generate_summary(
    current: float,
    projected: float,
    recommendations: list[Recommendation],
) -> str:
    gain = projected - current
    current_band = _determine_decision(current)
    projected_band = _determine_decision(projected)

    if gain <= 0:
        return "Your profile is fully optimised. Focus on growing your business and improving invoice performance."

    if current_band == projected_band:
        return (
            f"By completing {len(recommendations)} action{'s' if len(recommendations) != 1 else ''}, "
            f"you could improve your score by {gain:.1f} points — "
            f"strengthening your position in the {current_band} band."
        )

    return (
        f"You are currently {current_band}. "
        f"By completing {len(recommendations)} action{'s' if len(recommendations) != 1 else ''}, "
        f"your score could reach {projected:.1f} — moving you into the {projected_band} band."
    )


class RecommendationEngine:
    @staticmethod
    def generate(result: AssessmentResult) -> RecommendationPlan:
        """
        Generate a RecommendationPlan from an AssessmentResult.
        Provides a clean, type-safe architectural boundary.
        """
        return generate_plan(result.breakdown, result.score)

