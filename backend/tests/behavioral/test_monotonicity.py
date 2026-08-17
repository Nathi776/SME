"""
tests/behavioral/test_monotonicity.py

Verifies monotonic scoring behavior for individual factors under a constant strategy,
and checks correct system-level transitions across profile boundaries.
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

def get_base_growth_sme() -> EvidencePackage:
    return EvidencePackage(
        revenue=150000.0,
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
            years_industry_experience=3,
            highest_qualification="diploma",
            prior_business_owner=False,
            trade_association_member=False,
            reference_provided=True
        )
    )

# --- 1. FACTOR-LEVEL MONOTONICITY ---

def test_revenue_monotonicity():
    """Holding profile constant, increasing revenue must not decrease score."""
    sme = get_base_growth_sme()
    
    revenues = [0.0, 45000.0, 90000.0, 150000.0, 300000.0, 1000000.0]
    scores = []
    
    for rev in revenues:
        sme.revenue = rev
        res = assess(sme)
        assert res.profile == BusinessProfile.GROWTH, "Profile must remain Growth for this test"
        scores.append(res.score)
        
    # Check that scores never decrease
    for i in range(len(scores) - 1):
        assert scores[i+1] >= scores[i], f"Revenue monotonicity violated: R{revenues[i+1]} scored {scores[i+1]} which is less than R{revenues[i]} scoring {scores[i]}"

def test_founder_experience_monotonicity():
    """Holding profile constant, increasing founder experience must not decrease score."""
    sme = get_base_growth_sme()
    
    experiences = [0, 1, 2, 5, 10, 20]
    scores = []
    
    for exp in experiences:
        sme.founder.years_industry_experience = exp
        res = assess(sme)
        assert res.profile == BusinessProfile.GROWTH
        scores.append(res.score)
        
    for i in range(len(scores) - 1):
        assert scores[i+1] >= scores[i], f"Founder experience monotonicity violated: {experiences[i+1]} years scored {scores[i+1]} vs {experiences[i]} years scoring {scores[i]}"

def test_invoice_timeliness_monotonicity():
    """Holding profile constant, increasing paid-on-time ratio must not decrease score."""
    sme = get_base_growth_sme()
    sme.total_invoices = 10
    
    # 0% on time -> 50% -> 80% -> 100%
    timeliness_cases = [(0, 10), (5, 5), (8, 2), (10, 0)]  # (paid_on_time, unpaid_invoices)
    scores = []
    
    for paid, unpaid in timeliness_cases:
        sme.paid_on_time = paid
        sme.unpaid_invoices = unpaid
        res = assess(sme)
        assert res.profile == BusinessProfile.GROWTH
        scores.append(res.score)
        
    for i in range(len(scores) - 1):
        assert scores[i+1] >= scores[i], f"Invoice timeliness monotonicity violated: {timeliness_cases[i+1]} scored {scores[i+1]} vs {timeliness_cases[i]} scoring {scores[i]}"

def test_compliance_depth_monotonicity():
    """Holding profile constant, adding verified compliance documents must not decrease score."""
    sme = get_base_growth_sme()
    
    # Progression of verified documents
    docs_stages = [
        {},
        {"cipc": "approved"},
        {"cipc": "approved", "bank_statement": "approved"},
        {"cipc": "approved", "bank_statement": "approved", "tax_clearance": "approved"},
        {"cipc": "approved", "bank_statement": "approved", "tax_clearance": "approved", "registration_docs": "approved"}
    ]
    scores = []
    
    for docs in docs_stages:
        sme.verifications = docs
        res = assess(sme)
        assert res.profile == BusinessProfile.GROWTH
        scores.append(res.score)
        
    for i in range(len(scores) - 1):
        assert scores[i+1] >= scores[i], f"Compliance depth monotonicity violated: docs {docs_stages[i+1]} scored {scores[i+1]} vs {docs_stages[i]} scoring {scores[i]}"


# --- 2. SYSTEM-LEVEL TRANSITIONS ---

def test_system_level_profile_boundaries():
    """Crossing the 1.0 years_active boundary shifts profile/strategy correctly without scoring chaos."""
    sme = get_base_growth_sme()
    sme.verifications = {"cipc": "approved", "bank_statement": "approved"}
    sme.total_invoices = 5
    sme.paid_on_time = 4
    sme.unpaid_invoices = 1
    
    # Under 1 year active, should be Startup
    sme.years_active = 0
    res_under = assess(sme)
    assert res_under.profile == BusinessProfile.STARTUP
    
    # Exactly 1 year active, should transition to Growth
    sme.years_active = 1
    res_exact = assess(sme)
    assert res_exact.profile == BusinessProfile.GROWTH
    
    # Assert that the score transition is reasonable (score doesn't drop off a cliff due to weight shifts)
    # The shift represents different strategy weights but stays in a sensible band (e.g. difference is less than 20 pts)
    diff = abs(res_exact.score - res_under.score)
    assert diff <= 20.0, f"Discontinuous score jump on Startup -> Growth transition: Startup score = {res_under.score}, Growth score = {res_exact.score} (diff = {diff:.2f})"
