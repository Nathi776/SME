"""
core/assessment_engine.py

The Assessment Engine — context-aware business viability scoring.

Architecture:
  1. EvidenceValidator.validate(inp)  — validates ranges and detects contradictions
  2. infer_profile(inp)               — determines BusinessProfile from available evidence
  3. select_strategy(profile)         — returns the WeightStrategy for that profile
  4. assess(inp)                      — full pipeline: validate → infer → select → score → explain

This module wraps core/scoring.py. All factor logic lives in scoring.py.
The engine only changes the weights applied to each factor based on profile.

Backward compatibility:
  AssessmentResult is a superset of ScoringResult.
  scoring_service.py continues to call calculate_score() for legacy paths.
  All new paths call assess() which returns AssessmentResult.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum

from core.scoring import (
    ScoringInput,
    EvidencePackage,
    EvidenceValidator,
    FounderSignalInput,
    COMPLIANCE_POINTS,
    INTENT_BASE_POINTS,
    LOI_KNOWN_COUNTERPARTY_BONUS,
    MAX_COMPLIANCE_POINTS,
    MAX_INTENT_POINTS,
    MAX_FOUNDER_POINTS,
    QUALIFICATION_LEVELS,
    determine_decision,
    _scale,
)
from services.market_data_service import (
    sector_survival_score,
    province_market_score,
    get_market_intelligence,
)


# ── Business profiles ─────────────────────────────────────────────────────────

class BusinessProfile(str, Enum):
    IDEA        = "idea"
    STARTUP     = "startup"
    GROWTH      = "growth"
    ESTABLISHED = "established"


PROFILE_LABELS = {
    BusinessProfile.IDEA:        "Idea Stage",
    BusinessProfile.STARTUP:     "Early Startup",
    BusinessProfile.GROWTH:      "Growing Business",
    BusinessProfile.ESTABLISHED: "Established Business",
}

PROFILE_DESCRIPTIONS = {
    BusinessProfile.IDEA: (
        "This business exists as an idea or very early concept. "
        "Assessment is weighted heavily toward founder capability and market opportunity "
        "since little operational evidence exists yet."
    ),
    BusinessProfile.STARTUP: (
        "This business has been formally registered and is in its first year. "
        "Assessment balances founder signals, compliance depth, and intent documents — "
        "the evidence available to a business before meaningful trading history."
    ),
    BusinessProfile.GROWTH: (
        "This business has begun trading and is building a track record. "
        "Invoice behaviour and cashflow signals now carry meaningful weight "
        "alongside founder and market signals."
    ),
    BusinessProfile.ESTABLISHED: (
        "This business has a demonstrable trading history. "
        "Invoice behaviour, compliance depth, and verified cashflow dominate the assessment — "
        "the same signals that traditional lenders use, now scored with richer context."
    ),
}


# ── Weight strategies ─────────────────────────────────────────────────────────

@dataclass
class WeightStrategy:
    """
    Defines the maximum points for each factor.
    All nine factors exist in every strategy — only the weights shift.
    RAW_MAX is the sum of all factor maxima for this strategy.
    """
    name:              str
    revenue_max:       float
    timeliness_max:    float
    age_max:           float
    unpaid_max:        float
    industry_max:      float
    market_max:        float
    compliance_max:    float
    intent_max:        float
    founder_max:       float
    applicable_factors:   set[str] = field(default_factory=set)
    unavailable_factors:  set[str] = field(default_factory=set)

    @property
    def raw_max(self) -> float:
        return (
            self.revenue_max + self.timeliness_max + self.age_max +
            self.unpaid_max  + self.industry_max   + self.market_max +
            self.compliance_max + self.intent_max  + self.founder_max
        )

    def applicable_raw_max(self) -> float:
        total = 0.0
        if "Revenue Tier" not in self.unavailable_factors:          total += self.revenue_max
        if "Invoice Timeliness" not in self.unavailable_factors:    total += self.timeliness_max
        if "Business Age" not in self.unavailable_factors:          total += self.age_max
        if "Unpaid Invoice Ratio" not in self.unavailable_factors:  total += self.unpaid_max
        if "Industry Risk" not in self.unavailable_factors:         total += self.industry_max
        if "Market Viability" not in self.unavailable_factors:       total += self.market_max
        if "Compliance Documents" not in self.unavailable_factors:   total += self.compliance_max
        if "Intent Documents" not in self.unavailable_factors:       total += self.intent_max
        if "Founder Signal" not in self.unavailable_factors:         total += self.founder_max
        return total


# Strategy definitions — weights reflect what evidence matters most per profile

STRATEGIES: dict[BusinessProfile, WeightStrategy] = {

    BusinessProfile.IDEA: WeightStrategy(
        name                = "IdeaAssessmentStrategy",
        revenue_max         = 10,
        timeliness_max      =  5,
        age_max             =  5,
        unpaid_max          =  3,
        industry_max        = 12,
        market_max          = 15,
        compliance_max      = 20,
        intent_max          = 20,
        founder_max         = 20,
        applicable_factors  = {"Business Age", "Industry Risk", "Market Viability", "Compliance Documents", "Intent Documents", "Founder Signal"},
        unavailable_factors = {"Revenue Tier", "Invoice Timeliness", "Unpaid Invoice Ratio"},
    ),

    BusinessProfile.STARTUP: WeightStrategy(
        name                = "StartupAssessmentStrategy",
        revenue_max         = 15,
        timeliness_max      =  8,
        age_max             =  8,
        unpaid_max          =  5,
        industry_max        = 12,
        market_max          = 12,
        compliance_max      = 22,
        intent_max          = 16,
        founder_max         = 17,
        applicable_factors  = {"Revenue Tier", "Invoice Timeliness", "Business Age", "Unpaid Invoice Ratio", "Industry Risk", "Market Viability", "Compliance Documents", "Intent Documents", "Founder Signal"},
        unavailable_factors = set(),
    ),

    BusinessProfile.GROWTH: WeightStrategy(
        name                = "GrowthAssessmentStrategy",
        revenue_max         = 20,
        timeliness_max      = 18,
        age_max             = 10,
        unpaid_max          = 10,
        industry_max        = 10,
        market_max          = 10,
        compliance_max      = 22,
        intent_max          = 10,
        founder_max         = 15,
        applicable_factors  = {"Revenue Tier", "Invoice Timeliness", "Business Age", "Unpaid Invoice Ratio", "Industry Risk", "Market Viability", "Compliance Documents", "Intent Documents", "Founder Signal"},
        unavailable_factors = set(),
    ),

    BusinessProfile.ESTABLISHED: WeightStrategy(
        name                = "EstablishedAssessmentStrategy",
        revenue_max         = 25,
        timeliness_max      = 25,
        age_max             = 10,
        unpaid_max          = 12,
        industry_max        =  8,
        market_max          =  7,
        compliance_max      = 20,
        intent_max          =  8,
        founder_max         = 10,
        applicable_factors  = {"Revenue Tier", "Invoice Timeliness", "Business Age", "Unpaid Invoice Ratio", "Industry Risk", "Market Viability", "Compliance Documents", "Intent Documents", "Founder Signal"},
        unavailable_factors = set(),
    ),
}


# ── Output dataclass ──────────────────────────────────────────────────────────

@dataclass
class AssessmentResult:
    """
    Full output of the Assessment Engine.
    Superset of ScoringResult — all existing code that reads .score,
    .decision, .breakdown continues to work unchanged.
    """
    # Core score fields (same as ScoringResult)
    score:     float
    decision:  str
    breakdown: dict[str, dict]

    # Assessment Engine additions
    profile:           BusinessProfile
    strategy_name:     str
    profile_label:     str
    profile_description: str
    profile_reasoning: list[str]   # why this profile was inferred
    confidence_score:  float       # computed from evidence depth


# ── Profile inference ─────────────────────────────────────────────────────────

def infer_profile(inp: EvidencePackage) -> tuple[BusinessProfile, list[str]]:
    """
    Infer the business profile from available evidence.
    Returns (profile, reasoning) — reasoning explains the inference
    in plain language for the score breakdown.

    Inference rules (evaluated in order — first match wins):

    ESTABLISHED: years_active >= 3 OR total_invoices >= 20
    GROWTH:      years_active >= 1 AND total_invoices > 0
                 OR bank statement parsed (months_analysed is not None) AND years_active >= 1
    STARTUP:     CIPC verified OR years_active >= 1 OR bank statement exists
    IDEA:        everything else
    """
    reasoning: list[str] = []
    cipc_verified = inp.verifications.get("cipc") == "approved"
    has_bank_statement = inp.months_analysed is not None

    # ESTABLISHED
    if inp.years_active >= 3 or inp.total_invoices >= 20:
        if inp.years_active >= 3:
            reasoning.append(f"{inp.years_active} years of operation")
        if inp.total_invoices >= 20:
            reasoning.append(f"{inp.total_invoices} invoices on record")
        reasoning.append("Invoice and cashflow signals carry maximum weight")
        return BusinessProfile.ESTABLISHED, reasoning

    # GROWTH
    if inp.years_active >= 1 and (inp.total_invoices > 0 or has_bank_statement):
        if inp.years_active >= 1:
            reasoning.append(f"{inp.years_active} year(s) of operation")
        if inp.total_invoices > 0:
            reasoning.append(f"{inp.total_invoices} invoice(s) submitted")
        if has_bank_statement:
            reasoning.append(f"Bank statement parsed ({inp.months_analysed} months)")
        reasoning.append("Invoice behaviour now weighted alongside founder signals")
        return BusinessProfile.GROWTH, reasoning

    # STARTUP
    if cipc_verified or inp.years_active >= 1 or has_bank_statement:
        if cipc_verified:
            reasoning.append("CIPC registration verified")
        if inp.years_active >= 1:
            reasoning.append(f"{inp.years_active} year(s) of operation")
        if has_bank_statement:
            reasoning.append("Bank statement on file")
        reasoning.append("Compliance and intent documents are the primary evidence at this stage")
        return BusinessProfile.STARTUP, reasoning

    # IDEA
    reasoning.append("No verified registration, trading history, or bank statement yet")
    reasoning.append("Founder capability and market opportunity are the primary assessment signals")
    return BusinessProfile.IDEA, reasoning


# ── Strategy selection ────────────────────────────────────────────────────────

def select_strategy(profile: BusinessProfile) -> WeightStrategy:
    return STRATEGIES[profile]


# ── Core assessment function ──────────────────────────────────────────────────

def assess(inp: EvidencePackage) -> AssessmentResult:
    """
    Main entry point for the Assessment Engine.

    Pipeline:
      1. Validate evidence package inputs
      2. Infer business profile from evidence
      3. Select weight strategy for that profile
      4. Score all 9 factors (filtering out unavailable factors)
      5. Compute evidence-depth confidence score
      6. Rescale to 0–100 against applicable raw maximum
      7. Return AssessmentResult with full explainability
    """
    # 1. Validation
    val_res = EvidenceValidator.validate(inp)
    if not val_res.is_valid:
        raise ValueError(f"Evidence validation failed: {', '.join(val_res.errors)}")

    # 2. Profile inference
    profile, reasoning = infer_profile(inp)
    strategy = select_strategy(profile)
    breakdown, raw = _apply_strategy(inp, strategy)

    applicable_max = strategy.applicable_raw_max()
    score    = round(min(max((raw / applicable_max) * 100, 0), 100), 1)
    decision = determine_decision(score)

    # ── Confidence score calculation ──────────────────────────────────────────
    conf = 10.0  # Base confidence

    # Compliance docs verified (max +45%)
    if inp.verifications.get("cipc") == "approved":
        conf += 15.0
    if inp.verifications.get("bank_statement") == "approved" or inp.months_analysed is not None:
        conf += 15.0
    if inp.verifications.get("tax_clearance") == "approved":
        conf += 10.0
    if inp.verifications.get("registration_docs") == "approved":
        conf += 5.0

    # Data freshness (max +25%)
    if inp.months_analysed is not None:
        if inp.months_analysed >= 6:
            conf += 25.0
        elif inp.months_analysed >= 3:
            conf += 15.0
        else:
            conf += 5.0

    # Founder profile completeness (max +10%)
    if inp.founder is not None:
        conf += 10.0

    # Intent docs verified (max +10%)
    intent_approved_count = 0
    for doc_type in ["letter_of_intent", "supplier_quote", "lease_agreement"]:
        details = inp.intent_doc_details.get(doc_type, {})
        status = details.get("status") or inp.verifications.get(doc_type)
        if status == "approved":
            intent_approved_count += 1
    if intent_approved_count >= 2:
        conf += 10.0
    elif intent_approved_count == 1:
        conf += 5.0

    confidence_score = round(min(max(conf, 10.0), 100.0), 1)

    # Attach profile metadata to breakdown
    breakdown["_assessment"] = {
        "profile":          profile.value,
        "profile_label":    PROFILE_LABELS[profile],
        "strategy":         strategy.name,
        "raw_score":        raw,
        "raw_max":          applicable_max,
        "reasoning":        reasoning,
        "confidence_score": confidence_score,
        "warnings":         val_res.warnings,
    }

    return AssessmentResult(
        score              = score,
        decision           = decision,
        breakdown          = breakdown,
        profile            = profile,
        strategy_name      = strategy.name,
        profile_label      = PROFILE_LABELS[profile],
        profile_description= PROFILE_DESCRIPTIONS[profile],
        profile_reasoning  = reasoning,
        confidence_score   = confidence_score,
    )


# ── Factor scoring with strategy weights ─────────────────────────────────────

def _apply_strategy(inp: EvidencePackage, s: WeightStrategy) -> tuple[dict, float]:
    """
    Apply all applicable factors using the given strategy's weights.
    Returns (breakdown dict, raw score).
    """
    breakdown: dict[str, dict] = {}
    raw = 0.0

    # 1. Revenue Tier
    if "Revenue Tier" in s.unavailable_factors:
        breakdown["Revenue Tier"] = {
            "value": None,
            "label": "Factor not applicable for this profile",
            "contribution": 0.0,
            "max": s.revenue_max,
            "applicable": False
        }
    else:
        revenue_source = "parsed" if inp.months_analysed is not None else "self-reported"
        rev_ratio = min(inp.revenue / 500_000, 1.0)
        rev_pts   = round(_scale(rev_ratio, 0.0, 1.0, 0, s.revenue_max), 1)
        if inp.revenue >= 500_000:   rev_label = "≥ R500k"
        elif inp.revenue >= 200_000: rev_label = "R200k–R500k"
        elif inp.revenue >= 100_000: rev_label = "R100k–R200k"
        elif inp.revenue >= 50_000:  rev_label = "R50k–R100k"
        else:                        rev_label = "< R50k"

        raw += rev_pts
        breakdown["Revenue Tier"] = {
            "value": inp.revenue, "label": f"{rev_label} ({revenue_source})",
            "contribution": rev_pts, "max": s.revenue_max, "source": revenue_source,
            "applicable": True
        }

    # 2. Invoice Timeliness
    if "Invoice Timeliness" in s.unavailable_factors:
        breakdown["Invoice Timeliness"] = {
            "value": None,
            "label": "Factor not applicable for this profile",
            "contribution": 0.0,
            "max": s.timeliness_max,
            "applicable": False
        }
    else:
        if inp.total_invoices == 0:
            time_pts   = round(s.timeliness_max * 0.5, 1)
            time_label = "No invoices yet"
            time_ratio = None
        else:
            time_ratio = inp.paid_on_time / inp.total_invoices
            if time_ratio >= 0.90:   frac = 1.00
            elif time_ratio >= 0.70: frac = 0.65
            elif time_ratio >= 0.50: frac = 0.35
            else:                    frac = 0.15
            time_pts   = round(s.timeliness_max * frac, 1)
            time_label = f"{time_ratio:.0%} on time"

        raw += time_pts
        breakdown["Invoice Timeliness"] = {
            "value": time_ratio, "label": time_label,
            "contribution": time_pts, "max": s.timeliness_max,
            "applicable": True
        }

    # 3. Business Age
    if "Business Age" in s.unavailable_factors:
        breakdown["Business Age"] = {
            "value": None,
            "label": "Factor not applicable for this profile",
            "contribution": 0.0,
            "max": s.age_max,
            "applicable": False
        }
    else:
        if inp.years_active >= 5:   age_frac, age_label = 1.00, f"{inp.years_active} years"
        elif inp.years_active >= 2: age_frac, age_label = 0.60, f"{inp.years_active} years"
        elif inp.years_active >= 1: age_frac, age_label = 0.30, f"{inp.years_active} year"
        else:                       age_frac, age_label = 0.10, "< 1 year"
        age_pts = round(s.age_max * age_frac, 1)

        raw += age_pts
        breakdown["Business Age"] = {
            "value": inp.years_active, "label": age_label,
            "contribution": age_pts, "max": s.age_max,
            "applicable": True
        }

    # 4. Unpaid Invoice Ratio
    if "Unpaid Invoice Ratio" in s.unavailable_factors:
        breakdown["Unpaid Invoice Ratio"] = {
            "value": None,
            "label": "Factor not applicable for this profile",
            "contribution": 0.0,
            "max": s.unpaid_max,
            "applicable": False
        }
    else:
        if inp.total_invoices == 0:
            unpaid_pts   = round(s.unpaid_max * 0.5, 1)
            unpaid_label = "No invoices"
            unpaid_ratio = None
        else:
            unpaid_ratio = inp.unpaid_invoices / inp.total_invoices
            if unpaid_ratio <= 0.05:   unpaid_frac = 1.00
            elif unpaid_ratio <= 0.15: unpaid_frac = 0.60
            elif unpaid_ratio <= 0.30: unpaid_frac = 0.30
            else:                      unpaid_frac = 0.00
            unpaid_pts   = round(s.unpaid_max * unpaid_frac, 1)
            unpaid_label = f"{unpaid_ratio:.0%} unpaid"

        raw += unpaid_pts
        breakdown["Unpaid Invoice Ratio"] = {
            "value": unpaid_ratio, "label": unpaid_label,
            "contribution": unpaid_pts, "max": s.unpaid_max,
            "applicable": True
        }

    # 5. Industry Risk
    if "Industry Risk" in s.unavailable_factors:
        breakdown["Industry Risk"] = {
            "value": None,
            "label": "Factor not applicable for this profile",
            "contribution": 0.0,
            "max": s.industry_max,
            "applicable": False
        }
    else:
        survival     = sector_survival_score(inp.industry)
        industry_pts = round(_scale(survival, 0.38, 0.72, s.industry_max * 0.3, s.industry_max), 1)
        intel        = get_market_intelligence(inp.industry, inp.province)

        raw += industry_pts
        breakdown["Industry Risk"] = {
            "value": survival, "label": intel["survival_label"],
            "contribution": industry_pts, "max": s.industry_max,
            "sector_survival_rate": survival,
            "applicable": True
        }

    # 6. Market Viability
    if "Market Viability" in s.unavailable_factors:
        breakdown["Market Viability"] = {
            "value": None,
            "label": "Factor not applicable for this profile",
            "contribution": 0.0,
            "max": s.market_max,
            "applicable": False
        }
    else:
        if inp.province:
            mkt_score    = province_market_score(inp.province, inp.industry)
            market_pts   = round(_scale(mkt_score, 0.30, 1.00, s.market_max * 0.3, s.market_max), 1)
            market_label = intel["market_label"]
            market_note  = None
        else:
            mkt_score, market_pts = None, round(s.market_max * 0.5, 1)
            market_label = "Province not specified — neutral score applied"
            market_note  = "Add your province to improve this factor"

        raw += market_pts
        breakdown["Market Viability"] = {
            "value": mkt_score, "label": market_label,
            "contribution": market_pts, "max": s.market_max,
            "province": inp.province, "note": market_note,
            "applicable": True
        }

    # 7. Compliance Documents
    if "Compliance Documents" in s.unavailable_factors:
        breakdown["Compliance Documents"] = {
            "value": None,
            "label": "Factor not applicable for this profile",
            "contribution": 0.0,
            "max": s.compliance_max,
            "applicable": False
        }
    else:
        comp_pts          = 0
        verified_compliance: list[str] = []
        missing_compliance:  list[str] = []

        comp_scale = s.compliance_max / MAX_COMPLIANCE_POINTS

        for doc_type, base_pts in COMPLIANCE_POINTS.items():
            if inp.verifications.get(doc_type) == "approved":
                comp_pts += round(base_pts * comp_scale, 1)
                verified_compliance.append(doc_type)
            else:
                missing_compliance.append(doc_type)

        bs_bonus, bs_bonus_detail = 0.0, []
        if inp.months_analysed is not None:
            bonus_scale = s.compliance_max / MAX_COMPLIANCE_POINTS
            if inp.months_analysed >= 6:
                bs_bonus += 2 * bonus_scale
                bs_bonus_detail.append(f"{inp.months_analysed} months of history")
            elif inp.months_analysed >= 3:
                bs_bonus += 1 * bonus_scale
                bs_bonus_detail.append(f"{inp.months_analysed} months of history")
            if inp.income_regularity is not None:
                if inp.income_regularity >= 0.80:
                    bs_bonus += 2 * bonus_scale
                    bs_bonus_detail.append("consistent income pattern")
                elif inp.income_regularity >= 0.60:
                    bs_bonus += 1 * bonus_scale
                    bs_bonus_detail.append("moderate income consistency")
            if inp.overdraft_count:
                bs_bonus -= min(inp.overdraft_count, 2) * bonus_scale
                bs_bonus_detail.append(f"{inp.overdraft_count} overdraft month(s) detected")

        comp_pts = round(min(comp_pts + bs_bonus, s.compliance_max), 1)
        raw += comp_pts
        breakdown["Compliance Documents"] = {
            "value": comp_pts,
            "label": f"{len(verified_compliance)} of {len(COMPLIANCE_POINTS)} compliance docs verified",
            "contribution": comp_pts, "max": s.compliance_max,
            "verified": verified_compliance, "missing": missing_compliance,
            "bank_statement_parsed":  inp.months_analysed is not None,
            "bank_statement_quality": bs_bonus_detail or None,
            "applicable": True
        }

    # 8. Intent Documents
    if "Intent Documents" in s.unavailable_factors:
        breakdown["Intent Documents"] = {
            "value": None,
            "label": "Factor not applicable for this profile",
            "contribution": 0.0,
            "max": s.intent_max,
            "applicable": False
        }
    else:
        intent_pts        = 0.0
        verified_intent:  list[str] = []
        missing_intent:   list[str] = []
        intent_notes:     list[str] = []
        intent_scale = s.intent_max / MAX_INTENT_POINTS

        for doc_type, base_pts in INTENT_BASE_POINTS.items():
            details = inp.intent_doc_details.get(doc_type, {})
            status  = details.get("status") or inp.verifications.get(doc_type)
            if status == "approved":
                pts = base_pts * intent_scale
                verified_intent.append(doc_type)
                if doc_type == "letter_of_intent":
                    known = details.get("loi_counterparty_known")
                    if known is True:
                        pts += LOI_KNOWN_COUNTERPARTY_BONUS * intent_scale
                        intent_notes.append(f"LOI from recognised counterparty (+{round(LOI_KNOWN_COUNTERPARTY_BONUS * intent_scale, 1)} pts)")
                    elif known is False:
                        intent_notes.append("LOI counterparty not verified — base points only")
                    else:
                        intent_notes.append("LOI counterparty not yet reviewed by admin")
                intent_pts += pts
            else:
                missing_intent.append(doc_type)

        intent_pts = round(min(intent_pts, s.intent_max), 1)
        raw += intent_pts
        breakdown["Intent Documents"] = {
            "value": intent_pts,
            "label": (
                f"{len(verified_intent)} of {len(INTENT_BASE_POINTS)} intent docs verified"
                if verified_intent else "No intent documents submitted"
            ),
            "contribution": intent_pts, "max": s.intent_max,
            "verified": verified_intent, "missing": missing_intent,
            "notes": intent_notes or None,
            "applicable": True
        }

    # 9. Founder Signal
    if "Founder Signal" in s.unavailable_factors:
        breakdown["Founder Signal"] = {
            "value": None,
            "label": "Factor not applicable for this profile",
            "contribution": 0.0,
            "max": s.founder_max,
            "applicable": False
        }
    else:
        founder_pts    = 0.0
        founder_detail: list[str] = []
        founder_scale  = s.founder_max / MAX_FOUNDER_POINTS

        if inp.founder is None:
            founder_label = "Founder profile not yet completed"
            founder_note  = "Complete your founder profile to earn up to {:.0f} pts".format(s.founder_max)
        else:
            f = inp.founder
            exp = f.years_industry_experience
            if exp is not None:
                if exp >= 5:   founder_pts += 5 * founder_scale; founder_detail.append(f"{exp} years industry experience")
                elif exp >= 2: founder_pts += 3 * founder_scale; founder_detail.append(f"{exp} years industry experience")
                elif exp >= 1: founder_pts += 1 * founder_scale; founder_detail.append(f"{exp} year industry experience")

            qual     = (f.highest_qualification or "").lower().strip()
            qual_raw = QUALIFICATION_LEVELS.get(qual, 0)
            if qual_raw > 0:
                founder_pts += qual_raw * founder_scale
                founder_detail.append(f"{f.highest_qualification} qualification")

            if f.prior_business_owner is True:
                founder_pts += 3 * founder_scale; founder_detail.append("prior business ownership")
            if f.trade_association_member is True:
                founder_pts += 2 * founder_scale; founder_detail.append("trade association member")
            if f.reference_provided is True:
                founder_pts += 1 * founder_scale; founder_detail.append("business reference provided")

            founder_pts   = round(min(founder_pts, s.founder_max), 1)
            founder_label = (
                f"Founder profile: {founder_pts:.1f}/{s.founder_max} pts"
                if founder_detail else "Founder profile submitted — no scoreable signals yet"
            )
            founder_note  = None

        raw += founder_pts
        breakdown["Founder Signal"] = {
            "value":        founder_pts,
            "label":        founder_label,
            "contribution": founder_pts,
            "max":          s.founder_max,
            "detail":       founder_detail or None,
            "note":         founder_note,
            "applicable": True
        }

    return breakdown, raw
