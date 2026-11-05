"""Test A - informality fairness. SESE 2023: 92% of surveyed (non-VAT) businesses have neither
income-tax nor CIPC registration, so registration status must not drive the viability score."""
import pytest
from core.assessment_engine import assess
from ._sese import pkg, NO_TRADING

CIPC = {"bank_statement": "approved", "cipc": "approved"}
INFORMAL = {"bank_statement": "approved"}


def test_informal_with_consistent_trading_evidence_gets_viability_credit():
    trading = assess(pkg(verifications=INFORMAL)).viability_score
    nothing = assess(pkg(verifications=INFORMAL, **NO_TRADING)).viability_score
    assert trading > nothing


def test_no_cipc_registration_is_not_a_viability_deduction():
    assert assess(pkg(verifications=INFORMAL)).viability_score == assess(pkg(verifications=CIPC)).viability_score


@pytest.mark.parametrize("status", [None, "pending", "missing"])
def test_no_tax_or_registration_document_is_not_a_viability_deduction(status):
    v = dict(INFORMAL)
    if status:
        v["tax_clearance"] = status
    assert assess(pkg(verifications=v)).viability_score == assess(pkg(verifications=CIPC)).viability_score


def test_registration_alone_does_not_produce_a_high_viability_score():
    a = assess(pkg(verifications={"cipc": "approved", "tax_clearance": "approved"}, **NO_TRADING))
    assert a.viability_score < 40 and a.decision != "Approved"


@pytest.mark.xfail(strict=True, reason="RESIDUAL GAP: viability is equal, but missing CIPC earns only half "
                   "compliance credit in Funding Readiness (46.4 vs 50.2), enough to cross the Review line")
def test_informal_business_is_not_declined_where_equivalent_registered_one_is_not():
    inf, reg = assess(pkg(verifications=INFORMAL)), assess(pkg(verifications=CIPC))
    assert inf.decision == reg.decision


def test_registration_may_raise_confidence_but_never_lowers_it():
    assert assess(pkg(verifications=CIPC)).confidence_score >= assess(pkg(verifications=INFORMAL)).confidence_score
