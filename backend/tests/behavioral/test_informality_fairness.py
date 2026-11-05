"""
SESE 2023 (non-VAT population): ~92% have no income-tax or CIPC registration. Informality must
not be penalised automatically; registration alone must not make a business look viable.
Survey statistics are NOT scoring weights; these tests check behaviour only.
"""
import pytest

from core.assessment_engine import assess
from tests.validation.test_evidence_handling import sme, NO_BANK

TRADING = dict(years_active=2, total_invoices=10, paid_on_time=9, unpaid_invoices=1)


def informal(**k):
    base = dict(TRADING, overdraft_count=None, income_regularity=None, months_analysed=None,
                verifications={})
    base.update(k)
    return sme(**base)


def test_missing_cipc_does_not_change_viability():
    registered = assess(sme(**TRADING, verifications={"cipc": "approved"},
                            overdraft_count=None, income_regularity=None, months_analysed=None))
    unregistered = assess(informal())
    assert unregistered.viability_score == registered.viability_score


def test_missing_tax_registration_does_not_change_viability():
    with_tax = assess(informal(verifications={"tax_clearance": "approved"}))
    without = assess(informal())
    assert without.viability_score == with_tax.viability_score


def test_informal_business_with_consistent_sales_earns_viability_credit():
    r = assess(informal(revenue=60000.0))
    assert r.breakdown["Revenue Tier"]["contribution"] > 0
    assert r.breakdown["Invoice Timeliness"]["contribution"] > 0
    assert r.viability_score > assess(informal(revenue=0.0, total_invoices=0, paid_on_time=0,
                                              unpaid_invoices=0, years_active=0)).viability_score


def test_missing_documents_are_treated_better_than_rejected_documents():
    missing = assess(informal()).score
    rejected = assess(informal(verifications={"cipc": "rejected", "tax_clearance": "rejected"})).score
    assert missing > rejected


def test_registration_without_trading_evidence_is_not_highly_viable():
    r = assess(sme(revenue=0.0, years_active=0, total_invoices=0, paid_on_time=0, unpaid_invoices=0,
                   verifications={"cipc": "approved", "tax_clearance": "approved",
                                  "registration_docs": "approved"},
                   overdraft_count=None, income_regularity=None, months_analysed=None))
    assert r.viability_score < 50
    assert r.decision != "Approved"


def test_informal_trading_business_outscores_registered_non_trading_business():
    trading = assess(informal(revenue=60000.0))
    shell = assess(sme(revenue=0.0, years_active=0, total_invoices=0, paid_on_time=0,
                       unpaid_invoices=0, verifications={"cipc": "approved"},
                       overdraft_count=None, income_regularity=None, months_analysed=None))
    assert trading.viability_score > shell.viability_score
