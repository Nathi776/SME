"""
tests/behavioral/test_sensitivity.py

Verifies single-factor sensitivity (perturbation tests) and asserts that weights
behave in a stage-dependent manner across the 4 strategies (Idea, Startup, Growth, Established).
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

def get_baseline_growth_sme() -> EvidencePackage:
    return EvidencePackage(
        revenue=100000.0,
        years_active=2,
        industry="Technology",
        total_invoices=10,
        paid_on_time=8,
        unpaid_invoices=2,
        verifications={"cipc": "approved"},  # Start without bank statement to test bank statement addition
        overdraft_count=None,
        income_regularity=None,
        months_analysed=None,
        province="Gauteng",
        founder=FounderSignalInput(
            years_industry_experience=5,
            highest_qualification="diploma",
            prior_business_owner=False,
            trade_association_member=False,
            reference_provided=True
        )
    )

def test_single_factor_sensitivity():
    """Generates an empirical sensitivity map for a baseline Growth SME and prints it."""
    base_sme = get_baseline_growth_sme()
    base_res = assess(base_sme)
    baseline_score = base_res.score
    
    perturbations = []
    
    # 1. Revenue: R100k -> R110k (no tier change, so should be 0 or small, let's check. Actually tier boundary is at R100k, so let's test R99k -> R101k to see the tier jump)
    sme_rev = get_baseline_growth_sme()
    sme_rev.revenue = 99000.0
    score_rev_baseline = assess(sme_rev).score
    sme_rev.revenue = 110000.0
    score_rev_perturbed = assess(sme_rev).score
    perturbations.append(("Revenue (R99k -> R110k)", score_rev_baseline, score_rev_perturbed))
    
    # 2. Founder Experience: 5 -> 6 years
    sme_fexp = get_baseline_growth_sme()
    sme_fexp.founder.years_industry_experience = 5
    score_f_base = assess(sme_fexp).score
    sme_fexp.founder.years_industry_experience = 6
    score_f_pert = assess(sme_fexp).score
    perturbations.append(("Founder Experience (5 -> 6 yrs)", score_f_base, score_f_pert))
    
    # 3. CIPC: missing -> verified
    sme_cipc = get_baseline_growth_sme()
    sme_cipc.verifications = {}
    score_c_base = assess(sme_cipc).score
    sme_cipc.verifications = {"cipc": "approved"}
    score_c_pert = assess(sme_cipc).score
    perturbations.append(("CIPC Verification (no -> yes)", score_c_base, score_c_pert))
    
    # 4. Bank Statement: missing -> verified
    sme_bank = get_baseline_growth_sme()
    sme_bank.verifications = {"cipc": "approved"}
    score_b_base = assess(sme_bank).score
    sme_bank.verifications = {"cipc": "approved", "bank_statement": "approved"}
    sme_bank.months_analysed = 6
    sme_bank.income_regularity = 0.85
    sme_bank.overdraft_count = 0
    score_b_pert = assess(sme_bank).score
    perturbations.append(("Bank Statement (no -> yes)", score_b_base, score_b_pert))
    
    # 5. LOI: missing -> verified
    sme_loi = get_baseline_growth_sme()
    sme_loi.verifications = {"cipc": "approved"}
    score_l_base = assess(sme_loi).score
    sme_loi.verifications = {"cipc": "approved", "letter_of_intent": "approved"}
    sme_loi.intent_doc_details = {"letter_of_intent": {"status": "approved", "loi_counterparty_known": True}}
    score_l_pert = assess(sme_loi).score
    perturbations.append(("LOI counterparty known (no -> yes)", score_l_base, score_l_pert))
    
    # 6. Province: Gauteng -> Limpopo
    sme_prov = get_baseline_growth_sme()
    sme_prov.province = "Gauteng"
    score_p_base = assess(sme_prov).score
    sme_prov.province = "Limpopo"
    score_p_pert = assess(sme_prov).score
    perturbations.append(("Province (Gauteng -> Limpopo)", score_p_base, score_p_pert))
    
    print("\n------------------------------------------------------")
    print("SENSITIVITY PERTURBATION MAP (Growth Stage SME)")
    print(f"{'Factor Perturbation':<35} | {'Baseline':<8} | {'Modified':<8} | {'Delta Score':<11}")
    print("------------------------------------------------------")
    for name, base, pert in perturbations:
        delta = pert - base
        sign = "+" if delta >= 0 else ""
        print(f"{name:<35} | {base:<8.1f} | {pert:<8.1f} | {sign}{delta:<10.2f}")
    print("------------------------------------------------------\n")


def test_relative_sensitivity_across_stages():
    """Verifies that factor sensitivity is correctly stage-dependent."""
    # Define baseline templates for the 4 stages
    
    # 1. IDEA: no revenue, no age, no invoices, no verifications
    idea_sme = EvidencePackage(
        revenue=0.0, years_active=0, industry="Technology",
        total_invoices=0, paid_on_time=0, unpaid_invoices=0,
        verifications={}, province="Gauteng",
        founder=FounderSignalInput(years_industry_experience=1, highest_qualification="matric")
    )
    
    # 2. STARTUP: CIPC approved, early trading (R30k), 0 age, 0 invoices
    startup_sme = EvidencePackage(
        revenue=30000.0, years_active=0, industry="Technology",
        total_invoices=0, paid_on_time=0, unpaid_invoices=0,
        verifications={"cipc": "approved"}, province="Gauteng",
        founder=FounderSignalInput(years_industry_experience=1, highest_qualification="matric")
    )
    
    # 3. GROWTH: registered, 1 year, 10 invoices, bank statement
    growth_sme = EvidencePackage(
        revenue=120000.0, years_active=1, industry="Technology",
        total_invoices=10, paid_on_time=8, unpaid_invoices=2,
        verifications={"cipc": "approved", "bank_statement": "approved"}, province="Gauteng",
        months_analysed=6, income_regularity=0.8, overdraft_count=0,
        founder=FounderSignalInput(years_industry_experience=1, highest_qualification="matric")
    )
    
    # 4. ESTABLISHED: registered, 3 years, 20 invoices, bank statement, tax clearance
    established_sme = EvidencePackage(
        revenue=400000.0, years_active=3, industry="Technology",
        total_invoices=20, paid_on_time=16, unpaid_invoices=4,
        verifications={"cipc": "approved", "bank_statement": "approved", "tax_clearance": "approved"}, province="Gauteng",
        months_analysed=6, income_regularity=0.8, overdraft_count=0,
        founder=FounderSignalInput(years_industry_experience=1, highest_qualification="matric")
    )
    
    # --- TEST 1: Founder Experience Improvement (+5 years) ---
    # We expect the delta to be highest at Idea stage and lowest at Established stage
    idea_base = assess(idea_sme).score
    idea_sme.founder.years_industry_experience = 6
    idea_delta = assess(idea_sme).score - idea_base
    
    startup_base = assess(startup_sme).score
    startup_sme.founder.years_industry_experience = 6
    startup_delta = assess(startup_sme).score - startup_base
    
    growth_base = assess(growth_sme).score
    growth_sme.founder.years_industry_experience = 6
    growth_delta = assess(growth_sme).score - growth_base
    
    est_base = assess(established_sme).score
    established_sme.founder.years_industry_experience = 6
    est_delta = assess(established_sme).score - est_base
    
    print("\n------------------------------------------------------")
    print("RELATIVE SENSITIVITY ACROSS STAGES")
    print("------------------------------------------------------")
    print(f"Founder Experience Improvement (+5 yrs) Delta:")
    print(f"  Idea:        +{idea_delta:.2f}")
    print(f"  Startup:     +{startup_delta:.2f}")
    print(f"  Growth:      +{growth_delta:.2f}")
    print(f"  Established: +{est_delta:.2f}")
    
    assert idea_delta >= startup_delta >= growth_delta >= est_delta, \
        f"Founder delta monotonicity violated across stages: {idea_delta} >= {startup_delta} >= {growth_delta} >= {est_delta}"

    # --- TEST 2: Invoice Timeliness Improvement (50% -> 100%) ---
    # We expect the timeliness delta to be highest at Established and 0/lowest at Idea
    # Reset objects
    idea_sme.founder.years_industry_experience = 1
    startup_sme.founder.years_industry_experience = 1
    growth_sme.founder.years_industry_experience = 1
    established_sme.founder.years_industry_experience = 1
    
    # Established timeliness change
    established_sme.paid_on_time = 10
    established_sme.unpaid_invoices = 10  # 50% timeliness
    est_base_time = assess(established_sme).score
    established_sme.paid_on_time = 20
    established_sme.unpaid_invoices = 0   # 100% timeliness
    est_time_delta = assess(established_sme).score - est_base_time
    
    # Growth timeliness change
    growth_sme.paid_on_time = 5
    growth_sme.unpaid_invoices = 5      # 50%
    growth_base_time = assess(growth_sme).score
    growth_sme.paid_on_time = 10
    growth_sme.unpaid_invoices = 0       # 100%
    growth_time_delta = assess(growth_sme).score - growth_base_time
    
    # Idea timeliness change (Idea has total_invoices = 0, and timeliness is unavailable factor, so delta must be 0!)
    idea_base_time = assess(idea_sme).score
    idea_sme.paid_on_time = 10
    idea_sme.unpaid_invoices = 0
    idea_time_delta = assess(idea_sme).score - idea_base_time
    
    print("------------------------------------------------------")
    print(f"Invoice Timeliness Improvement (50% -> 100%) Delta:")
    print(f"  Idea:        +{idea_time_delta:.2f}")
    print(f"  Growth:      +{growth_time_delta:.2f}")
    print(f"  Established: +{est_time_delta:.2f}")
    print("------------------------------------------------------\n")
    
    assert est_time_delta >= growth_time_delta >= idea_time_delta, \
        f"Invoice timeliness stage sensitivity violated: {est_time_delta} >= {growth_time_delta} >= {idea_time_delta}"
    assert idea_time_delta == 0.0, "Idea stage timeliness delta should be exactly 0 (unavailable factor)"
