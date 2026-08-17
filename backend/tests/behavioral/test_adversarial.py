"""
tests/behavioral/test_adversarial.py

Tests adversarial cases, distinguishing between:
1. Mathematically impossible/invalid inputs (which must raise ValueError or fail validation)
2. Valid but unusual/contradictory inputs (which must pass validation but raise warnings)
"""
import sys
import os

# Setup path to import backend packages
BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

import pytest
from core.scoring import EvidencePackage, FounderSignalInput, EvidenceValidator
from core.assessment_engine import assess, BusinessProfile

def get_base_sme() -> EvidencePackage:
    return EvidencePackage(
        revenue=100000.0,
        years_active=2,
        industry="Technology",
        total_invoices=10,
        paid_on_time=8,
        unpaid_invoices=2,
        verifications={"cipc": "approved"},
        province="Gauteng"
    )

# --- 1. MATHEMATICALLY IMPOSSIBLE INPUTS (Must Fail Validation) ---

def test_negative_values_fail():
    """Assert that negative ranges fail evidence validation."""
    sme = get_base_sme()
    
    # Negative revenue
    sme.revenue = -100.0
    assert not EvidenceValidator.validate(sme).is_valid
    
    # Negative years active
    sme.revenue = 100000.0
    sme.years_active = -1
    assert not EvidenceValidator.validate(sme).is_valid
    
    # Negative invoices
    sme.years_active = 2
    sme.total_invoices = -5
    assert not EvidenceValidator.validate(sme).is_valid

def test_invoice_arithmetic_contradictions_fail():
    """Assert that impossible paid/unpaid invoice counts fail validation."""
    sme = get_base_sme()
    sme.total_invoices = 20
    
    # Paid exceeds total
    sme.paid_on_time = 25
    sme.unpaid_invoices = 0
    assert not EvidenceValidator.validate(sme).is_valid
    
    # Unpaid exceeds total
    sme.paid_on_time = 0
    sme.unpaid_invoices = 21
    assert not EvidenceValidator.validate(sme).is_valid
    
    # Sum exceeds total
    sme.paid_on_time = 19
    sme.unpaid_invoices = 2
    assert not EvidenceValidator.validate(sme).is_valid

def test_invalid_bank_statement_signals_fail():
    """Assert that invalid income regularity or overdraft values fail validation."""
    sme = get_base_sme()
    sme.months_analysed = 6
    sme.overdraft_count = 0
    
    # Regularity too high
    sme.income_regularity = 1.05
    assert not EvidenceValidator.validate(sme).is_valid
    
    # Regularity too low
    sme.income_regularity = -0.1
    assert not EvidenceValidator.validate(sme).is_valid
    
    # Negative overdrafts
    sme.income_regularity = 0.8
    sme.overdraft_count = -1
    assert not EvidenceValidator.validate(sme).is_valid


# --- 2. VALID BUT UNUSUAL/CONTRADICTORY INPUTS (Must Pass & Warn) ---

def test_high_revenue_no_invoices():
    """R150 Million revenue with 0 years active & no invoices is valid but triggers a warning."""
    sme = EvidencePackage(
        revenue=150000000.0,
        years_active=0,
        industry="Technology",
        total_invoices=0,
        paid_on_time=0,
        unpaid_invoices=0,
        verifications={},
        province="Gauteng"
    )
    
    val = EvidenceValidator.validate(sme)
    assert val.is_valid, f"High revenue no invoices should be valid but failed: {val.errors}"
    
    res = assess(sme)
    assert any("revenue" in w.lower() for w in res.breakdown.get("_assessment", {}).get("warnings", [])), \
        "Expected high revenue warning was not triggered"

def test_dormant_old_business():
    """5 years active business with R0 revenue and 0 invoices is valid but scores low."""
    sme = EvidencePackage(
        revenue=0.0,
        years_active=5,
        industry="Retail",
        total_invoices=0,
        paid_on_time=0,
        unpaid_invoices=0,
        verifications={},
        province="Gauteng"
    )
    
    val = EvidenceValidator.validate(sme)
    assert val.is_valid
    
    res = assess(sme)
    assert res.score < 50.0
    assert res.decision == "Declined"

def test_long_founder_experience_young_business():
    """Founder with 25 years experience starting a 3 month old business is valid."""
    sme = EvidencePackage(
        revenue=10000.0,
        years_active=0,
        industry="Retail",
        total_invoices=0,
        paid_on_time=0,
        unpaid_invoices=0,
        verifications={"cipc": "approved"},
        province="Gauteng",
        founder=FounderSignalInput(
            years_industry_experience=25,
            highest_qualification="degree",
            prior_business_owner=True,
            trade_association_member=True,
            reference_provided=True
        )
    )
    
    val = EvidenceValidator.validate(sme)
    assert val.is_valid
    
    res = assess(sme)
    assert res.profile == BusinessProfile.STARTUP
    assert res.breakdown["Founder Signal"]["contribution"] > 0
