"""
tests/behavioral/test_stability.py

Verifies engine behavior and score differences at known boundary thresholds
(revenue tiers, business age thresholds, invoice counts, and decision limits).
"""
import sys
import os

# Setup path to import backend packages
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

import pytest
from core.scoring import EvidencePackage, FounderSignalInput
from core.assessment_engine import assess, BusinessProfile

def get_base_sme() -> EvidencePackage:
    return EvidencePackage(
        revenue=120000.0,
        years_active=2,
        industry="Technology",
        total_invoices=10,
        paid_on_time=8,
        unpaid_invoices=2,
        verifications={"cipc": "approved", "bank_statement": "approved"},
        overdraft_count=0,
        income_regularity=0.85,
        months_analysed=6,
        province="Gauteng",
        founder=FounderSignalInput(
            years_industry_experience=5,
            highest_qualification="diploma",
            prior_business_owner=False,
            trade_association_member=False,
            reference_provided=True
        )
    )

def test_revenue_tier_discontinuities():
    """Tests score continuity and label shifts across all revenue tier boundaries."""
    sme = get_base_sme()
    
    # 1. R50k boundary
    sme.revenue = 49999.0
    res_under = assess(sme)
    sme.revenue = 50000.0
    res_exact = assess(sme)
    sme.revenue = 50001.0
    res_over = assess(sme)
    
    assert "< R50k" in res_under.breakdown["Revenue Tier"]["label"]
    assert "R50k–R100k" in res_exact.breakdown["Revenue Tier"]["label"]
    assert "R50k–R100k" in res_over.breakdown["Revenue Tier"]["label"]
    # Score should transition continuously (difference should be very small, e.g. < 0.1 score points)
    assert abs(res_exact.score - res_under.score) < 0.1

    # 2. R100k boundary
    sme.revenue = 99999.0
    res_under = assess(sme)
    sme.revenue = 100000.0
    res_exact = assess(sme)
    sme.revenue = 100001.0
    res_over = assess(sme)
    
    assert "R50k–R100k" in res_under.breakdown["Revenue Tier"]["label"]
    assert "R100k–R200k" in res_exact.breakdown["Revenue Tier"]["label"]
    assert "R100k–R200k" in res_over.breakdown["Revenue Tier"]["label"]
    assert abs(res_exact.score - res_under.score) < 0.1

    # 3. R200k boundary
    sme.revenue = 199999.0
    res_under = assess(sme)
    sme.revenue = 200000.0
    res_exact = assess(sme)
    sme.revenue = 200001.0
    res_over = assess(sme)
    
    assert "R100k–R200k" in res_under.breakdown["Revenue Tier"]["label"]
    assert "R200k–R500k" in res_exact.breakdown["Revenue Tier"]["label"]
    assert "R200k–R500k" in res_over.breakdown["Revenue Tier"]["label"]
    assert abs(res_exact.score - res_under.score) < 0.1

    # 4. R500k boundary
    sme.revenue = 499999.0
    res_under = assess(sme)
    sme.revenue = 500000.0
    res_exact = assess(sme)
    sme.revenue = 500001.0
    res_over = assess(sme)
    
    assert "R200k–R500k" in res_under.breakdown["Revenue Tier"]["label"]
    assert "≥ R500k" in res_exact.breakdown["Revenue Tier"]["label"]
    assert "≥ R500k" in res_over.breakdown["Revenue Tier"]["label"]
    assert abs(res_exact.score - res_under.score) < 0.1


def test_invoice_count_profile_boundaries():
    """Tests the transition from Growth to Established when crossing 19 to 20 invoices."""
    sme = get_base_sme()
    sme.years_active = 1  # growth stage age
    
    # 19 invoices -> Growth
    sme.total_invoices = 19
    sme.paid_on_time = 17
    sme.unpaid_invoices = 2
    res_19 = assess(sme)
    assert res_19.profile == BusinessProfile.GROWTH
    
    # 20 invoices -> Established
    sme.total_invoices = 20
    sme.paid_on_time = 18
    sme.unpaid_invoices = 2
    res_20 = assess(sme)
    assert res_20.profile == BusinessProfile.ESTABLISHED


def test_business_age_profile_boundaries():
    """Tests profile and score shifts when transitioning across years active limits."""
    sme = get_base_sme()
    sme.total_invoices = 5
    sme.paid_on_time = 4
    sme.unpaid_invoices = 1
    
    # 2.99 years active -> Growth
    sme.years_active = 2  # Integer field
    res_2 = assess(sme)
    assert res_2.profile == BusinessProfile.GROWTH
    
    # 3.00 years active -> Established
    sme.years_active = 3
    res_3 = assess(sme)
    assert res_3.profile == BusinessProfile.ESTABLISHED


def test_decision_thresholds():
    """Tests that final decisions respect exact boundaries (<50.0 = Declined, 50.0-74.9 = Review, >=75.0 = Approved)."""
    sme = get_base_sme()
    
    # We will adjust parameters to get scores right at the boundary
    # Test Review vs Approved boundary (75.0)
    # R500k rev (25), 100% timeliness (20), 5 years active (10), 0% unpaid (10), technology (10), gauteng (10), full compliance (25) = 110 raw.
    # Total RAW_MAX for Established is 120. 110 / 120 * 100 = 91.6 (Approved).
    # Let's verify decisions are mapping correctly
    
    # We can programmatically check score to decision mapping:
    from core.scoring import determine_decision
    assert determine_decision(75.0) == "Approved"
    assert determine_decision(74.9) == "Review"
    assert determine_decision(50.0) == "Review"
    assert determine_decision(49.9) == "Declined"
