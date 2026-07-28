"""
core/assessment_engine.py

The Assessment Engine — context-aware business viability scoring.

Architecture:
  Decomposed pipeline following the Single Responsibility Principle:
  1. EvidenceValidator.validate(inp)       — validates ranges and contradictions
  2. ProfileInferenceService.detect(inp)    — determines Stage profile & unavailable factors (versioned)
  3. StrategyFactory.get_strategy(profile)  — resolves scoring weight strategy (versioned)
  4. ScoreCalculator.calculate(...)        — computes factor scores and dynamic rescaled maxima
  5. ConfidenceCalculator.calculate(inp)    — computes evidence depth confidence
  6. AssessmentBuilder.build(...)           — bundles and explains the result
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

    @property
    def raw_max(self) -> float:
        return (
            self.revenue_max + self.timeliness_max + self.age_max +
            self.unpaid_max  + self.industry_max   + self.market_max +
            self.compliance_max + self.intent_max  + self.founder_max
        )


# Strategy definitions — weights reflect what evidence matters most per profile

STRATEGIES: dict[BusinessProfile, WeightStrategy] = {

    BusinessProfile.IDEA: WeightStrategy(
        name           = "IdeaAssessmentStrategy",
        revenue_max    = 10,
        timeliness_max =  5,
        age_max        =  5,
        unpaid_max     =  3,
        industry_max   = 12,
        market_max     = 15,
        compliance_max = 20,
        intent_max     = 20,
        founder_max    = 20,
    ),

    BusinessProfile.STARTUP: WeightStrategy(
        name           = "StartupAssessmentStrategy",
        revenue_max    = 15,
        timeliness_max =  8,
        age_max        =  8,
        unpaid_max     =  5,
        industry_max   = 12,
        market_max     = 12,
        compliance_max = 22,
        intent_max     = 16,
        founder_max    = 17,
    ),

    BusinessProfile.GROWTH: WeightStrategy(
        name           = "GrowthAssessmentStrategy",
        revenue_max    = 20,
        timeliness_max = 18,
        age_max        = 10,
        unpaid_max     = 10,
        industry_max   = 10,
        market_max     = 10,
        compliance_max = 22,
        intent_max     = 10,
        founder_max    = 15,
    ),

    BusinessProfile.ESTABLISHED: WeightStrategy(
        name           = "EstablishedAssessmentStrategy",
        revenue_max    = 25,
        timeliness_max = 25,
        age_max        = 10,
        unpaid_max     = 12,
        industry_max   =  8,
        market_max     =  7,
        compliance_max = 20,
        intent_max     =  8,
        founder_max    = 10,
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
    score:               float
    decision:            str
    breakdown:           dict[str, dict]

    profile:             BusinessProfile
    strategy_name:       str
    profile_label:       str
    profile_description: str
    profile_reasoning:   list[str]
    confidence_score:    float
    inference_version:   str = "v1"
    strategy_version:    str = "v1"


# ── Profile Inference Result ──────────────────────────────────────────────────

@dataclass
class ProfileInferenceResult:
    profile:             BusinessProfile
    reasoning:           list[str]
    unavailable_factors: set[str]
    inference_version:   str = "v1"


# ── Profile Inference Service ──────────────────────────────────────────────────

class ProfileInferenceService:
    @staticmethod
    def detect(inp: EvidencePackage) -> ProfileInferenceResult:
        """
        Infer the business profile stage and flag factors that shouldn't exist.
        Evaluates rules sequentially (v1): Established -> Growth -> Startup -> Idea.
        """
        reasoning: list[str] = []
        cipc_verified = inp.verifications.get("cipc") == "approved"
        has_bank_statement = inp.months_analysed is not None

        # 1. ESTABLISHED
        if inp.years_active >= 3 or inp.total_invoices >= 20:
            if inp.years_active >= 3:
                reasoning.append(f"{inp.years_active} years of operation")
            if inp.total_invoices >= 20:
                reasoning.append(f"{inp.total_invoices} invoices on record")
            reasoning.append("Invoice and cashflow signals carry maximum weight")
            return ProfileInferenceResult(
                profile=BusinessProfile.ESTABLISHED,
                reasoning=reasoning,
                unavailable_factors=set(),
                inference_version="v1"
            )

        # 2. GROWTH
        if inp.years_active >= 1 and (inp.total_invoices > 0 or has_bank_statement):
            if inp.years_active >= 1:
                reasoning.append(f"{inp.years_active} year(s) of operation")
            if inp.total_invoices > 0:
                reasoning.append(f"{inp.total_invoices} invoice(s) submitted")
            if has_bank_statement:
                reasoning.append(f"Bank statement parsed ({inp.months_analysed} months)")
            reasoning.append("Invoice behaviour now weighted alongside founder signals")
            return ProfileInferenceResult(
                profile=BusinessProfile.GROWTH,
                reasoning=reasoning,
                unavailable_factors=set(),
                inference_version="v1"
            )

        # 3. STARTUP
        if cipc_verified or inp.years_active >= 1 or has_bank_statement:
            if cipc_verified:
                reasoning.append("CIPC registration verified")
            if inp.years_active >= 1:
                reasoning.append(f"{inp.years_active} year(s) of operation")
            if has_bank_statement:
                reasoning.append("Bank statement on file")
            reasoning.append("Compliance and intent documents are the primary evidence at this stage")
            return ProfileInferenceResult(
                profile=BusinessProfile.STARTUP,
                reasoning=reasoning,
                unavailable_factors=set(),
                inference_version="v1"
            )

        # 4. IDEA
        reasoning.append("No verified registration, trading history, or bank statement yet")
        reasoning.append("Founder capability and market opportunity are the primary assessment signals")
        return ProfileInferenceResult(
            profile=BusinessProfile.IDEA,
            reasoning=reasoning,
            unavailable_factors={"Revenue Tier", "Invoice Timeliness", "Unpaid Invoice Ratio"},
            inference_version="v1"
        )


# ── Strategy Factory ──────────────────────────────────────────────────────────

class StrategyFactory:
    @staticmethod
    def get_strategy(profile: BusinessProfile) -> tuple[WeightStrategy, str]:
        """
        Resolves the scoring weight strategy for the given stage profile.
        """
        return STRATEGIES[profile], "v1"


# ── Score Calculator ──────────────────────────────────────────────────────────

class ScoreCalculator:
    @staticmethod
    def calculate(inp: EvidencePackage, strategy: WeightStrategy, unavailable: set[str]) -> tuple[dict, float, float]:
        """
        Applies all applicable scoring factors, skipping unavailable ones.
        Returns (breakdown dict, raw score sum, applicable raw max sum).
        """
        breakdown: dict[str, dict] = {}
        raw = 0.0
        applicable_max = 0.0
        intel = get_market_intelligence(inp.industry, inp.province)

        # 1. Revenue Tier
        if "Revenue Tier" in unavailable:
            breakdown["Revenue Tier"] = {
                "value": None,
                "label": "Factor not applicable for this profile",
                "contribution": 0.0,
                "max": strategy.revenue_max,
                "applicable": False
            }
        else:
            applicable_max += strategy.revenue_max
            revenue_source = "parsed" if inp.months_analysed is not None else "self-reported"
            rev_ratio = min(inp.revenue / 500_000, 1.0)
            rev_pts   = round(_scale(rev_ratio, 0.0, 1.0, 0, strategy.revenue_max), 1)
            if inp.revenue >= 500_000:   rev_label = "≥ R500k"
            elif inp.revenue >= 200_000: rev_label = "R200k–R500k"
            elif inp.revenue >= 100_000: rev_label = "R100k–R200k"
            elif inp.revenue >= 50_000:  rev_label = "R50k–R100k"
            else:                        rev_label = "< R50k"

            raw += rev_pts
            breakdown["Revenue Tier"] = {
                "value": inp.revenue, "label": f"{rev_label} ({revenue_source})",
                "contribution": rev_pts, "max": strategy.revenue_max, "source": revenue_source,
                "applicable": True
            }

        # 2. Invoice Timeliness
        if "Invoice Timeliness" in unavailable:
            breakdown["Invoice Timeliness"] = {
                "value": None,
                "label": "Factor not applicable for this profile",
                "contribution": 0.0,
                "max": strategy.timeliness_max,
                "applicable": False
            }
        else:
            applicable_max += strategy.timeliness_max
            if inp.total_invoices == 0:
                time_pts   = round(strategy.timeliness_max * 0.5, 1)
                time_label = "No invoices yet"
                time_ratio = None
            else:
                time_ratio = inp.paid_on_time / inp.total_invoices
                if time_ratio >= 0.90:   frac = 1.00
                elif time_ratio >= 0.70: frac = 0.65
                elif time_ratio >= 0.50: frac = 0.35
                else:                    frac = 0.15
                time_pts   = round(strategy.timeliness_max * frac, 1)
                time_label = f"{time_ratio:.0%} on time"

            raw += time_pts
            breakdown["Invoice Timeliness"] = {
                "value": time_ratio, "label": time_label,
                "contribution": time_pts, "max": strategy.timeliness_max,
                "applicable": True
            }

        # 3. Business Age
        if "Business Age" in unavailable:
            breakdown["Business Age"] = {
                "value": None,
                "label": "Factor not applicable for this profile",
                "contribution": 0.0,
                "max": strategy.age_max,
                "applicable": False
            }
        else:
            applicable_max += strategy.age_max
            if inp.years_active >= 5:   age_frac, age_label = 1.00, f"{inp.years_active} years"
            elif inp.years_active >= 2: age_frac, age_label = 0.60, f"{inp.years_active} years"
            elif inp.years_active >= 1: age_frac, age_label = 0.30, f"{inp.years_active} year"
            else:                       age_frac, age_label = 0.10, "< 1 year"
            age_pts = round(strategy.age_max * age_frac, 1)

            raw += age_pts
            breakdown["Business Age"] = {
                "value": inp.years_active, "label": age_label,
                "contribution": age_pts, "max": strategy.age_max,
                "applicable": True
            }

        # 4. Unpaid Invoice Ratio
        if "Unpaid Invoice Ratio" in unavailable:
            breakdown["Unpaid Invoice Ratio"] = {
                "value": None,
                "label": "Factor not applicable for this profile",
                "contribution": 0.0,
                "max": strategy.unpaid_max,
                "applicable": False
            }
        else:
            applicable_max += strategy.unpaid_max
            if inp.total_invoices == 0:
                unpaid_pts   = round(strategy.unpaid_max * 0.5, 1)
                unpaid_label = "No invoices"
                unpaid_ratio = None
            else:
                unpaid_ratio = inp.unpaid_invoices / inp.total_invoices
                if unpaid_ratio <= 0.05:   unpaid_frac = 1.00
                elif unpaid_ratio <= 0.15: unpaid_frac = 0.60
                elif unpaid_ratio <= 0.30: unpaid_frac = 0.30
                else:                      unpaid_frac = 0.00
                unpaid_pts   = round(strategy.unpaid_max * unpaid_frac, 1)
                unpaid_label = f"{unpaid_ratio:.0%} unpaid"

            raw += unpaid_pts
            breakdown["Unpaid Invoice Ratio"] = {
                "value": unpaid_ratio, "label": unpaid_label,
                "contribution": unpaid_pts, "max": strategy.unpaid_max,
                "applicable": True
            }

        # 5. Industry Risk
        if "Industry Risk" in unavailable:
            breakdown["Industry Risk"] = {
                "value": None,
                "label": "Factor not applicable for this profile",
                "contribution": 0.0,
                "max": strategy.industry_max,
                "applicable": False
            }
        else:
            applicable_max += strategy.industry_max
            survival     = sector_survival_score(inp.industry)
            industry_pts = round(_scale(survival, 0.38, 0.72, strategy.industry_max * 0.3, strategy.industry_max), 1)

            raw += industry_pts
            breakdown["Industry Risk"] = {
                "value": survival, "label": intel["survival_label"],
                "contribution": industry_pts, "max": strategy.industry_max,
                "sector_survival_rate": survival,
                "applicable": True
            }

        # 6. Market Viability
        if "Market Viability" in unavailable:
            breakdown["Market Viability"] = {
                "value": None,
                "label": "Factor not applicable for this profile",
                "contribution": 0.0,
                "max": strategy.market_max,
                "applicable": False
            }
        else:
            applicable_max += strategy.market_max
            if inp.province:
                mkt_score    = province_market_score(inp.province, inp.industry)
                market_pts   = round(_scale(mkt_score, 0.30, 1.00, strategy.market_max * 0.3, strategy.market_max), 1)
                market_label = intel["market_label"]
                market_note  = None
            else:
                mkt_score, market_pts = None, round(strategy.market_max * 0.5, 1)
                market_label = "Province not specified — neutral score applied"
                market_note  = "Add your province to improve this factor"

            raw += market_pts
            breakdown["Market Viability"] = {
                "value": mkt_score, "label": market_label,
                "contribution": market_pts, "max": strategy.market_max,
                "province": inp.province, "note": market_note,
                "applicable": True
            }

        # 7. Compliance Documents
        if "Compliance Documents" in unavailable:
            breakdown["Compliance Documents"] = {
                "value": None,
                "label": "Factor not applicable for this profile",
                "contribution": 0.0,
                "max": strategy.compliance_max,
                "applicable": False
            }
        else:
            applicable_max += strategy.compliance_max
            comp_pts          = 0
            verified_compliance: list[str] = []
            missing_compliance:  list[str] = []

            comp_scale = strategy.compliance_max / MAX_COMPLIANCE_POINTS

            for doc_type, base_pts in COMPLIANCE_POINTS.items():
                if inp.verifications.get(doc_type) == "approved":
                    comp_pts += round(base_pts * comp_scale, 1)
                    verified_compliance.append(doc_type)
                else:
                    missing_compliance.append(doc_type)

            bs_bonus, bs_bonus_detail = 0.0, []
            if inp.months_analysed is not None:
                bonus_scale = strategy.compliance_max / MAX_COMPLIANCE_POINTS
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

            comp_pts = round(min(comp_pts + bs_bonus, strategy.compliance_max), 1)
            raw += comp_pts
            breakdown["Compliance Documents"] = {
                "value": comp_pts,
                "label": f"{len(verified_compliance)} of {len(COMPLIANCE_POINTS)} compliance docs verified",
                "contribution": comp_pts, "max": strategy.compliance_max,
                "verified": verified_compliance, "missing": missing_compliance,
                "bank_statement_parsed":  inp.months_analysed is not None,
                "bank_statement_quality": bs_bonus_detail or None,
                "applicable": True
            }

        # 8. Intent Documents
        if "Intent Documents" in unavailable:
            breakdown["Intent Documents"] = {
                "value": None,
                "label": "Factor not applicable for this profile",
                "contribution": 0.0,
                "max": strategy.intent_max,
                "applicable": False
            }
        else:
            applicable_max += strategy.intent_max
            intent_pts        = 0.0
            verified_intent:  list[str] = []
            missing_intent:   list[str] = []
            intent_notes:     list[str] = []
            intent_scale = strategy.intent_max / MAX_INTENT_POINTS

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

            intent_pts = round(min(intent_pts, strategy.intent_max), 1)
            raw += intent_pts
            breakdown["Intent Documents"] = {
                "value": intent_pts,
                "label": (
                    f"{len(verified_intent)} of {len(INTENT_BASE_POINTS)} intent docs verified"
                    if verified_intent else "No intent documents submitted"
                ),
                "contribution": intent_pts, "max": strategy.intent_max,
                "verified": verified_intent, "missing": missing_intent,
                "notes": intent_notes or None,
                "applicable": True
            }

        # 9. Founder Signal
        if "Founder Signal" in unavailable:
            breakdown["Founder Signal"] = {
                "value": None,
                "label": "Factor not applicable for this profile",
                "contribution": 0.0,
                "max": strategy.founder_max,
                "applicable": False
            }
        else:
            applicable_max += strategy.founder_max
            founder_pts    = 0.0
            founder_detail: list[str] = []
            founder_scale  = strategy.founder_max / MAX_FOUNDER_POINTS

            if inp.founder is None:
                founder_label = "Founder profile not yet completed"
                founder_note  = "Complete your founder profile to earn up to {:.0f} pts".format(strategy.founder_max)
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

                founder_pts   = round(min(founder_pts, strategy.founder_max), 1)
                founder_label = (
                    f"Founder profile: {founder_pts:.1f}/{strategy.founder_max} pts"
                    if founder_detail else "Founder profile submitted — no scoreable signals yet"
                )
                founder_note  = None

            raw += founder_pts
            breakdown["Founder Signal"] = {
                "value":        founder_pts,
                "label":        founder_label,
                "contribution": founder_pts,
                "max":          strategy.founder_max,
                "detail":       founder_detail or None,
                "note":         founder_note,
                "applicable": True
            }

        return breakdown, raw, applicable_max


# ── Confidence Calculator ─────────────────────────────────────────────────────

class ConfidenceCalculator:
    @staticmethod
    def calculate(inp: EvidencePackage) -> float:
        """
        Computes an evidence-depth confidence score (0–100%).
        """
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

        # Note: 90%+ is effectively maximum confidence in practice as most businesses
        # will not have every single document and intent verified simultaneously.
        return round(min(max(conf, 10.0), 100.0), 1)


# ── Assessment Builder ────────────────────────────────────────────────────────

class AssessmentBuilder:
    @staticmethod
    def build(
        score: float,
        decision: str,
        breakdown: dict,
        profile_res: ProfileInferenceResult,
        strategy: WeightStrategy,
        strategy_ver: str,
        confidence: float,
        validation_warnings: list[str]
    ) -> AssessmentResult:
        """
        Assembles all computed components into an AssessmentResult and attaches audit metadata.
        """
        raw_score = breakdown.pop("_assessment_raw", score)
        applicable_max = breakdown.pop("_assessment_applicable_max", strategy.raw_max)

        # Attach profile metadata to breakdown
        breakdown["_assessment"] = {
            "profile":            profile_res.profile.value,
            "profile_label":      PROFILE_LABELS[profile_res.profile],
            "strategy":           strategy.name,
            "raw_score":          raw_score,
            "raw_max":            applicable_max,
            "reasoning":          profile_res.reasoning,
            "confidence_score":   confidence,
            "warnings":           validation_warnings,
            "inference_version":  profile_res.inference_version,
            "strategy_version":   strategy_ver,
        }

        return AssessmentResult(
            score              = score,
            decision           = decision,
            breakdown          = breakdown,
            profile            = profile_res.profile,
            strategy_name      = strategy.name,
            profile_label      = PROFILE_LABELS[profile_res.profile],
            profile_description= PROFILE_DESCRIPTIONS[profile_res.profile],
            profile_reasoning  = profile_res.reasoning,
            confidence_score   = confidence,
            inference_version  = profile_res.inference_version,
            strategy_version   = strategy_ver,
        )


# ── Main Entry Point ──────────────────────────────────────────────────────────

def assess(inp: EvidencePackage) -> AssessmentResult:
    """
    Main entry point for the Assessment Engine.
    Orchestrates the modularized assessment pipeline.
    """
    # 1. Validate inputs
    val_res = EvidenceValidator.validate(inp)
    if not val_res.is_valid:
        raise ValueError(f"Evidence validation failed: {', '.join(val_res.errors)}")

    # 2. Stage detection / profile inference
    profile_res = ProfileInferenceService.detect(inp)

    # 3. Strategy Factory
    strategy, strategy_ver = StrategyFactory.get_strategy(profile_res.profile)

    # 4. Score Calculation
    breakdown, raw_score, applicable_max = ScoreCalculator.calculate(inp, strategy, profile_res.unavailable_factors)

    # Guard against division by zero
    if applicable_max == 0:
        applicable_max = strategy.raw_max

    # 5. Confidence Calculation
    confidence = ConfidenceCalculator.calculate(inp)

    # 6. Rescale & Determine Decision
    score = round(min(max((raw_score / applicable_max) * 100, 0), 100), 1)
    decision = determine_decision(score)

    # Pass temp values for metadata building
    breakdown["_assessment_raw"] = raw_score
    breakdown["_assessment_applicable_max"] = applicable_max

    # 7. Build result
    return AssessmentBuilder.build(
        score=score,
        decision=decision,
        breakdown=breakdown,
        profile_res=profile_res,
        strategy=strategy,
        strategy_ver=strategy_ver,
        confidence=confidence,
        validation_warnings=val_res.warnings
    )


# ── Backward Compatibility Wrappers ──────────────────────────────────────────

def infer_profile(inp: EvidencePackage) -> tuple[BusinessProfile, list[str]]:
    res = ProfileInferenceService.detect(inp)
    return res.profile, res.reasoning


def select_strategy(profile: BusinessProfile) -> WeightStrategy:
    strategy, _ = StrategyFactory.get_strategy(profile)
    return strategy

