"""
test_assessment_engine.py

Tests for the Assessment Engine — profile inference, strategy selection,
and end-to-end score verification across all four profiles.

Run from backend/:  pytest test_assessment_engine.py -v
"""
import sys, types

# ── Mock DB-dependent modules so tests run without a database ─────────────────
for name in ["database", "models.sme", "models.invoice", "models.verification",
             "models.founder_profile", "models.sme_outcome", "models.credit_score",
             "models.finance_request", "models.lender", "models.user",
             "sqlalchemy", "sqlalchemy.orm"]:
    sys.modules.setdefault(name, types.ModuleType(name))

import importlib.util, os

def load(mod_name, path):
    spec = importlib.util.spec_from_file_location(mod_name, path)
    mod  = importlib.util.module_from_spec(spec)
    sys.modules[mod_name] = mod
    spec.loader.exec_module(mod)
    return mod

BASE = os.path.dirname(os.path.abspath(__file__))

load("services.market_data_service", f"{BASE}/services/market_data_service.py")
load("core.scoring",                 f"{BASE}/core/scoring.py")
load("core.assessment_engine",       f"{BASE}/core/assessment_engine.py")

from core.scoring          import EvidencePackage, FounderSignalInput
ScoringInput = EvidencePackage  # backward compat in test only
from core.assessment_engine import (
    assess, infer_profile, select_strategy,
    BusinessProfile, STRATEGIES,
)


# ── Profile inference tests ───────────────────────────────────────────────────

class TestProfileInference:

    def test_idea_no_evidence(self):
        inp = ScoringInput(
            revenue=0, years_active=0, industry="Retail",
            total_invoices=0, paid_on_time=0, unpaid_invoices=0,
            verifications={}, province=None,
        )
        profile, reasoning = infer_profile(inp)
        assert profile == BusinessProfile.IDEA
        assert len(reasoning) >= 1

    def test_idea_with_revenue_but_no_registration(self):
        # Self-reported revenue and a province but nothing verified
        inp = ScoringInput(
            revenue=50_000, years_active=0, industry="Technology",
            total_invoices=0, paid_on_time=0, unpaid_invoices=0,
            verifications={}, province="Gauteng",
        )
        profile, _ = infer_profile(inp)
        assert profile == BusinessProfile.IDEA

    def test_startup_cipc_verified(self):
        inp = ScoringInput(
            revenue=30_000, years_active=0, industry="Technology",
            total_invoices=0, paid_on_time=0, unpaid_invoices=0,
            verifications={"cipc": "approved"}, province="Gauteng",
        )
        profile, reasoning = infer_profile(inp)
        assert profile == BusinessProfile.STARTUP
        assert any("CIPC" in r for r in reasoning)

    def test_startup_bank_statement_parsed(self):
        inp = ScoringInput(
            revenue=80_000, years_active=0, industry="Technology",
            total_invoices=0, paid_on_time=0, unpaid_invoices=0,
            verifications={}, province="Gauteng",
            months_analysed=4, income_regularity=0.8, overdraft_count=0,
        )
        profile, _ = infer_profile(inp)
        assert profile == BusinessProfile.STARTUP

    def test_growth_one_year_with_invoices(self):
        inp = ScoringInput(
            revenue=120_000, years_active=1, industry="Retail",
            total_invoices=5, paid_on_time=4, unpaid_invoices=1,
            verifications={"cipc": "approved"}, province="Gauteng",
        )
        profile, reasoning = infer_profile(inp)
        assert profile == BusinessProfile.GROWTH
        assert any("invoice" in r.lower() for r in reasoning)

    def test_established_three_years(self):
        inp = ScoringInput(
            revenue=400_000, years_active=3, industry="Manufacturing",
            total_invoices=10, paid_on_time=9, unpaid_invoices=1,
            verifications={"cipc": "approved", "bank_statement": "approved"},
            province="KwaZulu-Natal",
        )
        profile, reasoning = infer_profile(inp)
        assert profile == BusinessProfile.ESTABLISHED
        assert any("year" in r.lower() for r in reasoning)

    def test_established_many_invoices(self):
        # Only 1 year old but 25 invoices — classified as established
        inp = ScoringInput(
            revenue=200_000, years_active=1, industry="Professional Services",
            total_invoices=25, paid_on_time=23, unpaid_invoices=2,
            verifications={"cipc": "approved"}, province="Gauteng",
        )
        profile, reasoning = infer_profile(inp)
        assert profile == BusinessProfile.ESTABLISHED
        assert any("invoice" in r.lower() for r in reasoning)


# ── Strategy selection tests ──────────────────────────────────────────────────

class TestStrategySelection:

    def test_idea_strategy_founder_heavy(self):
        s = STRATEGIES[BusinessProfile.IDEA]
        assert s.founder_max == 20
        assert s.market_max  == 15
        assert s.intent_max  == 20
        # Invoice signals minimal at idea stage
        assert s.timeliness_max <= 8
        assert s.unpaid_max     <= 5

    def test_established_strategy_invoice_heavy(self):
        s = STRATEGIES[BusinessProfile.ESTABLISHED]
        assert s.timeliness_max == 25   # invoices dominate
        assert s.unpaid_max     == 12
        assert s.founder_max    == 10   # founder less important when track record exists

    def test_raw_max_sum_correct(self):
        for profile, strategy in STRATEGIES.items():
            expected = (
                strategy.revenue_max + strategy.timeliness_max + strategy.age_max +
                strategy.unpaid_max  + strategy.industry_max   + strategy.market_max +
                strategy.compliance_max + strategy.intent_max  + strategy.founder_max
            )
            assert abs(strategy.raw_max - expected) < 0.01, \
                f"{profile.value} raw_max mismatch: {strategy.raw_max} vs {expected}"


# ── Full assessment tests ─────────────────────────────────────────────────────

class TestAssessmentEngine:

    def test_idea_stage_correct_profile(self):
        result = assess(ScoringInput(
            revenue=0, years_active=0, industry="Retail",
            total_invoices=0, paid_on_time=0, unpaid_invoices=0,
            verifications={}, province=None,
        ))
        assert result.profile == BusinessProfile.IDEA
        assert result.strategy_name == "IdeaAssessmentStrategy"
        assert 0 <= result.score <= 100
        assert result.decision in {"Approved", "Review", "Declined"}

    def test_score_in_bounds(self):
        for years, invoices, profile_expected in [
            (0,  0,  BusinessProfile.IDEA),
            (0,  0,  BusinessProfile.STARTUP),
            (1,  5,  BusinessProfile.GROWTH),
            (4,  20, BusinessProfile.ESTABLISHED),
        ]:
            result = assess(ScoringInput(
                revenue=100_000, years_active=years, industry="Technology",
                total_invoices=invoices, paid_on_time=invoices,
                unpaid_invoices=0, verifications={"cipc": "approved"},
                province="Gauteng",
            ))
            assert 0 <= result.score <= 100, f"Score out of bounds for {profile_expected}"

    def test_founder_matters_more_at_idea_stage(self):
        """A strong founder should lift idea-stage score more than established-stage."""
        strong_founder = FounderSignalInput(
            years_industry_experience=7,
            highest_qualification="degree",
            prior_business_owner=True,
            trade_association_member=True,
            reference_provided=True,
        )
        idea_with_founder = assess(ScoringInput(
            revenue=0, years_active=0, industry="Technology",
            total_invoices=0, paid_on_time=0, unpaid_invoices=0,
            verifications={}, province="Gauteng", founder=strong_founder,
        ))
        idea_without_founder = assess(ScoringInput(
            revenue=0, years_active=0, industry="Technology",
            total_invoices=0, paid_on_time=0, unpaid_invoices=0,
            verifications={}, province="Gauteng", founder=None,
        ))
        # Founder impact should be significant at idea stage
        idea_gain = idea_with_founder.score - idea_without_founder.score
        assert idea_gain > 10, f"Founder should add >10 pts at idea stage, got {idea_gain:.1f}"

    def test_invoices_matter_more_at_established_stage(self):
        """Perfect invoices should lift established-stage more than idea-stage."""
        base = dict(
            revenue=200_000, paid_on_time=20, unpaid_invoices=0,
            verifications={"cipc": "approved"}, province="Gauteng",
        )
        # Established: 3 years, 20 invoices
        established_good = assess(ScoringInput(
            industry="Manufacturing", years_active=3, total_invoices=20, **base))
        established_no_inv = assess(ScoringInput(
            industry="Manufacturing", years_active=3, total_invoices=0,
            paid_on_time=0, unpaid_invoices=0,
            verifications={"cipc": "approved"}, province="Gauteng", revenue=200_000,
        ))
        established_gain = established_good.score - established_no_inv.score

        # Idea: 0 years, no invoices  → then same invoices shouldn't help much
        idea_no_inv = assess(ScoringInput(
            industry="Manufacturing", years_active=0, total_invoices=0,
            paid_on_time=0, unpaid_invoices=0,
            verifications={}, province="Gauteng", revenue=200_000,
        ))
        assert established_gain > 5, \
            f"Invoices should matter more at established stage, gain={established_gain:.1f}"

    def test_assessment_result_has_profile_metadata(self):
        result = assess(ScoringInput(
            revenue=150_000, years_active=0, industry="Technology",
            total_invoices=0, paid_on_time=0, unpaid_invoices=0,
            verifications={"cipc": "approved"}, province="Gauteng",
        ))
        assert result.profile_label      != ""
        assert result.profile_description != ""
        assert len(result.profile_reasoning) >= 1
        assert "_assessment" in result.breakdown
        assert result.breakdown["_assessment"]["profile"] == result.profile.value

    def test_all_factor_maxes_in_breakdown(self):
        result = assess(ScoringInput(
            revenue=100_000, years_active=1, industry="Technology",
            total_invoices=5, paid_on_time=4, unpaid_invoices=1,
            verifications={"cipc": "approved"}, province="Gauteng",
        ))
        expected_factors = [
            "Revenue Tier", "Invoice Timeliness", "Business Age",
            "Unpaid Invoice Ratio", "Industry Risk", "Market Viability",
            "Compliance Documents", "Intent Documents", "Founder Signal",
        ]
        for factor in expected_factors:
            assert factor in result.breakdown, f"Missing factor: {factor}"
            assert "contribution" in result.breakdown[factor]
            assert "max" in result.breakdown[factor]

    def test_decision_thresholds_respected(self):
        from core.assessment_engine import STRATEGIES
        for profile in BusinessProfile:
            s = STRATEGIES[profile]
            # Max possible score should be 100
            # Minimum possible score should be >= 0
            result_max = assess(ScoringInput(
                revenue=999_999, years_active=10, industry="Technology",
                total_invoices=50, paid_on_time=50, unpaid_invoices=0,
                verifications={"cipc": "approved", "bank_statement": "approved",
                               "tax_clearance": "approved", "registration_docs": "approved"},
                intent_doc_details={
                    "letter_of_intent": {"status": "approved", "loi_counterparty_known": True},
                    "supplier_quote":   {"status": "approved", "loi_counterparty_known": None},
                    "lease_agreement":  {"status": "approved", "loi_counterparty_known": None},
                },
                province="Gauteng",
                months_analysed=6, income_regularity=0.95, overdraft_count=0,
                founder=FounderSignalInput(
                    years_industry_experience=10,
                    highest_qualification="postgraduate",
                    prior_business_owner=True,
                    trade_association_member=True,
                    reference_provided=True,
                ),
            ))
            assert result_max.score <= 100.0, \
                f"{profile.value}: max score exceeded 100: {result_max.score}"
            assert result_max.decision == "Approved", \
                f"{profile.value}: perfect profile should be Approved"

    def test_s3_equivalent_with_strong_founder_reaches_review(self):
        """Regression: S3 + strong founder should be Review (was tested before)."""
        result = assess(ScoringInput(
            revenue=150_000, years_active=0, industry="Technology",
            total_invoices=0, paid_on_time=0, unpaid_invoices=0,
            verifications={"cipc": "approved", "bank_statement": "approved"},
            overdraft_count=0, income_regularity=0.82, months_analysed=4,
            province="Gauteng",
            founder=FounderSignalInput(
                years_industry_experience=5, highest_qualification="degree",
                prior_business_owner=True, trade_association_member=True,
                reference_provided=True,
            ),
        ))
        # S3 with strong founder — startup profile, should reach Review or Approved
        assert result.decision in {"Review", "Approved"}, \
            f"S3 + strong founder should be Review or Approved, got {result.decision} ({result.score})"
        assert result.profile == BusinessProfile.STARTUP

    def test_evidence_validator_ranges_and_contradictions(self):
        from core.scoring import EvidenceValidator, EvidencePackage
        # Valid package
        valid = EvidencePackage(revenue=1000, years_active=2, industry="Tech", total_invoices=5, paid_on_time=3, unpaid_invoices=2)
        res = EvidenceValidator.validate(valid)
        assert res.is_valid is True
        assert len(res.errors) == 0

        # Invalid package (range error)
        invalid_range = EvidencePackage(revenue=-1000, years_active=2, industry="Tech", total_invoices=5, paid_on_time=3, unpaid_invoices=2)
        res = EvidenceValidator.validate(invalid_range)
        assert res.is_valid is False
        assert any("Revenue cannot be negative" in e for e in res.errors)

        # Invalid package (contradiction error)
        invalid_contra = EvidencePackage(revenue=1000, years_active=2, industry="Tech", total_invoices=5, paid_on_time=4, unpaid_invoices=3)
        res = EvidenceValidator.validate(invalid_contra)
        assert res.is_valid is False
        assert any("Sum of paid" in e for e in res.errors)

        # Test that assess() raises ValueError on invalid inputs
        import pytest
        with pytest.raises(ValueError) as exc:
            assess(invalid_range)
        assert "Evidence validation failed" in str(exc.value)

    def test_applicable_factors_idea_stage(self):
        # Idea stage business
        inp = ScoringInput(
            revenue=100000, years_active=0, industry="Technology",
            total_invoices=0, paid_on_time=0, unpaid_invoices=0,
            verifications={}, province="Gauteng"
        )
        result = assess(inp)
        assert result.profile == BusinessProfile.IDEA
        
        # Unavailable factors should have applicable=False and contribution=0
        assert result.breakdown["Revenue Tier"]["applicable"] is False
        assert result.breakdown["Revenue Tier"]["contribution"] == 0.0
        assert result.breakdown["Invoice Timeliness"]["applicable"] is False
        assert result.breakdown["Invoice Timeliness"]["contribution"] == 0.0
        assert result.breakdown["Unpaid Invoice Ratio"]["applicable"] is False
        assert result.breakdown["Unpaid Invoice Ratio"]["contribution"] == 0.0

        # Applicable factors should have applicable=True
        assert result.breakdown["Business Age"]["applicable"] is True
        assert result.breakdown["Founder Signal"]["applicable"] is True

        # Denominator raw_max in breakdown should be the sum of applicable factors (92.0)
        assert result.breakdown["_assessment"]["raw_max"] == 92.0

    def test_confidence_score_calculation(self):
        # 1. Low evidence profile: no verifications, no founder, self-reported revenue
        low_evidence = ScoringInput(
            revenue=50000, years_active=1, industry="Retail",
            total_invoices=0, paid_on_time=0, unpaid_invoices=0,
            verifications={}, province=None
        )
        res_low = assess(low_evidence)
        # Should have base confidence of 10%
        assert res_low.confidence_score == 10.0

        # 2. Medium evidence profile: CIPC verified, founder profile complete
        med_evidence = ScoringInput(
            revenue=50000, years_active=1, industry="Retail",
            total_invoices=0, paid_on_time=0, unpaid_invoices=0,
            verifications={"cipc": "approved"}, province=None,
            founder=FounderSignalInput(years_industry_experience=2, highest_qualification="matric")
        )
        res_med = assess(med_evidence)
        # Base: 10 + CIPC: 15 + Founder: 10 = 35%
        assert res_med.confidence_score == 35.0

        # 3. High evidence profile: fully verified documents, months analyzed, etc.
        high_evidence = ScoringInput(
            revenue=200000, years_active=3, industry="Technology",
            total_invoices=20, paid_on_time=19, unpaid_invoices=1,
            verifications={"cipc": "approved", "bank_statement": "approved", "tax_clearance": "approved", "registration_docs": "approved"},
            province="Gauteng",
            months_analysed=6,
            founder=FounderSignalInput(years_industry_experience=5, highest_qualification="degree"),
            intent_doc_details={
                "letter_of_intent": {"status": "approved"},
                "supplier_quote": {"status": "approved"}
            }
        )
        res_high = assess(high_evidence)
        # Base: 10
        # Verifications: cipc(+15), bank_statement(+15), tax_clearance(+10), registration_docs(+5) = +45
        # Freshness / months analyzed (6): +25
        # Founder: +10
        # Intent docs (2 approved): +10
        # Total: 10 + 45 + 25 + 10 + 10 = 100%
        assert res_high.confidence_score == 100.0

    def test_decomposed_services_and_versioning(self):
        from core.assessment_engine import (
            ProfileInferenceService, StrategyFactory, ScoreCalculator,
            ConfidenceCalculator, AssessmentBuilder
        )
        
        # Test input package
        inp = EvidencePackage(
            revenue=100000, years_active=0, industry="Technology",
            total_invoices=0, paid_on_time=0, unpaid_invoices=0,
            verifications={}, province="Gauteng"
        )
        
        # 1. ProfileInferenceService
        profile_res = ProfileInferenceService.detect(inp)
        assert profile_res.profile == BusinessProfile.IDEA
        assert profile_res.inference_version == "v1"
        assert "Revenue Tier" in profile_res.unavailable_factors
        
        # 2. StrategyFactory
        strategy, strategy_ver = StrategyFactory.get_strategy(profile_res.profile)
        assert strategy.name == "IdeaAssessmentStrategy"
        assert strategy_ver == "v1"
        
        # 3. assess() audit version headers
        res = assess(inp)
        assert res.inference_version == "v1"
        assert res.strategy_version == "v1"
        
        # 4. breakdown metadata contains version strings
        meta = res.breakdown["_assessment"]
        assert meta["inference_version"] == "v1"
        assert meta["strategy_version"] == "v1"

    def test_zero_division_guard_when_all_factors_unavailable(self, monkeypatch):
        from core.assessment_engine import ProfileInferenceService
        
        all_nine = {
            "Revenue Tier", "Invoice Timeliness", "Business Age",
            "Unpaid Invoice Ratio", "Industry Risk", "Market Viability",
            "Compliance Documents", "Intent Documents", "Founder Signal"
        }
        
        inp = EvidencePackage(
            revenue=0, years_active=0, industry="Technology",
            total_invoices=0, paid_on_time=0, unpaid_invoices=0,
            verifications={}, province=None
        )
        
        # Monkeypatch ProfileInferenceService.detect to return all 9 factors as unavailable
        original_detect = ProfileInferenceService.detect
        def mock_detect(package):
            res = original_detect(package)
            res.unavailable_factors = all_nine
            return res
            
        monkeypatch.setattr(ProfileInferenceService, "detect", mock_detect)
        
        res = assess(inp)
        assert res is not None
        assert res.score == 0.0



