"""
Validation of how the assessment engine treats missing, contradictory and irrelevant evidence.

Tests marked xfail(strict=True) record KNOWN GAPS found in the validation sprint. They are expected
to fail today; when the engine is changed to fix a gap the test starts passing, strict mode makes
the run fail, and the marker should then be removed. See VALIDATION_REPORT.md.
"""
import random

import pytest

from core.assessment_engine import assess
from core.scoring import EvidencePackage, FounderSignalInput


def sme(**k) -> EvidencePackage:
    d = dict(
        revenue=150000.0, years_active=2, industry="Technology",
        total_invoices=10, paid_on_time=8, unpaid_invoices=2,
        verifications={"cipc": "approved", "bank_statement": "approved"},
        overdraft_count=0, income_regularity=0.85, months_analysed=6, province="Gauteng",
        founder=FounderSignalInput(years_industry_experience=3, highest_qualification="diploma",
                                   prior_business_owner=False, trade_association_member=False,
                                   reference_provided=True),
    )
    d.update(k)
    return EvidencePackage(**d)


NO_BANK = dict(overdraft_count=None, income_regularity=None, months_analysed=None,
               verifications={"cipc": "approved"})


# ---- behaviour that holds today -------------------------------------------------------------

def test_small_irrelevant_input_noise_does_not_move_the_score_much():
    random.seed(7)
    scores = [assess(sme(revenue=150000 * (1 + random.uniform(-0.01, 0.01)))).score for _ in range(200)]
    assert max(scores) - min(scores) < 1.0


def test_paying_invoices_late_scores_below_having_no_invoice_history():
    late = assess(sme(total_invoices=10, paid_on_time=0, unpaid_invoices=10)).score
    none = assess(sme(total_invoices=0, paid_on_time=0, unpaid_invoices=0)).score
    assert late < none


def test_a_weak_founder_never_scores_above_an_unknown_founder():
    weak = FounderSignalInput(0, "none", False, False, False)
    assert assess(sme(founder=weak)).score <= assess(sme(founder=None)).score


def test_more_verified_documents_never_lower_evidence_confidence():
    bare = assess(sme(verifications={}, overdraft_count=None, income_regularity=None, months_analysed=None))
    full = assess(sme())
    assert full.confidence_score >= bare.confidence_score


# ---- known gaps (see VALIDATION_REPORT.md) --------------------------------------------------

@pytest.mark.xfail(strict=True, reason="GAP 1: province alone changes the funding decision")
def test_province_alone_does_not_change_the_decision():
    flips = 0
    for rev in range(20000, 400001, 10000):
        for yrs in (1, 2, 3):
            a = assess(sme(revenue=float(rev), years_active=yrs, province="Gauteng")).decision
            b = assess(sme(revenue=float(rev), years_active=yrs, province="Northern Cape")).decision
            flips += a != b
    assert flips == 0


@pytest.mark.xfail(strict=True, reason="GAP 2: a missing bank statement is scored the same as a rejected one")
def test_missing_evidence_is_treated_differently_from_negative_evidence():
    missing = assess(sme(**NO_BANK)).score
    rejected = assess(sme(verifications={"cipc": "approved", "bank_statement": "rejected"})).score
    assert missing != rejected


@pytest.mark.xfail(strict=True, reason="GAP 3: terrible bank behaviour scores higher than submitting no statement")
def test_poor_bank_behaviour_does_not_beat_no_bank_evidence():
    poor = assess(sme(overdraft_count=8, income_regularity=0.2)).score
    missing = assess(sme(**NO_BANK)).score
    assert poor <= missing


@pytest.mark.xfail(strict=True, reason="GAP 4: declared revenue is never cross-checked against bank evidence")
def test_inflating_declared_revenue_does_not_raise_the_score_without_support():
    honest = assess(sme(revenue=150000.0)).score
    inflated = assess(sme(revenue=1_500_000.0)).score
    assert inflated <= honest + 1.0


@pytest.mark.xfail(strict=True, reason="GAP 5: lack of CIPC registration flips an otherwise sound informal seller to Declined")
def test_informal_business_with_consistent_bank_income_is_not_declined_for_lack_of_registration():
    informal = assess(sme(verifications={"bank_statement": "approved"}, years_active=3, income_regularity=0.9))
    assert informal.decision != "Declined"


@pytest.mark.xfail(strict=True, reason="GAP 6: overdraft count above 2 has no further effect")
def test_more_overdrafts_keep_lowering_the_score():
    s2 = assess(sme(overdraft_count=2)).score
    s5 = assess(sme(overdraft_count=5)).score
    s10 = assess(sme(overdraft_count=10)).score
    assert s2 > s5 > s10
