"""Test B - evidence ladder. SESE 2023: 71% keep no financial records, 13% keep informal records.
Evidence quality should move Evidence Confidence; absence of evidence must not be treated as
negative evidence, and weak evidence must not outrank strong evidence."""
import pytest
from core.assessment_engine import assess
from ._sese import pkg, NO_BANK

INV = dict(total_invoices=10, paid_on_time=9, unpaid_invoices=1)
NO_INV = dict(total_invoices=0, paid_on_time=0, unpaid_invoices=0)


def rungs():
    return {
        "invoices+bank": pkg(**INV),
        "invoices only": pkg(verifications={}, **INV, **NO_BANK),
        "bank only": pkg(**NO_INV),
        "declaration only": pkg(verifications={}, **NO_INV, **NO_BANK),
    }


def test_confidence_orders_by_evidence_quality():
    c = {k: assess(v).confidence_score for k, v in rungs().items()}
    assert c["invoices+bank"] >= c["invoices only"] >= c["declaration only"]
    assert c["invoices+bank"] >= c["bank only"] >= c["declaration only"]


def test_declaration_only_is_assessed_not_rejected_outright():
    a = assess(rungs()["declaration only"])
    assert a.score > 0 and a.confidence_score > 0


def test_declaration_only_cannot_be_approved():
    assert assess(rungs()["declaration only"]).decision != "Approved"


def test_missing_evidence_is_not_scored_below_rejected_evidence():
    rejected = assess(pkg(verifications={"bank_statement": "rejected"}, **NO_BANK)).score
    missing = assess(pkg(verifications={}, **NO_BANK)).score
    assert missing >= rejected


@pytest.mark.xfail(strict=True, reason="GAP: no input channel for informal sales/expenditure records "
                   "(13% of SESE businesses keep them); they cannot raise confidence today")
def test_informal_records_are_recognised_as_evidence():
    import dataclasses
    assert "informal_records" in {f.name for f in dataclasses.fields(type(pkg()))}


@pytest.mark.xfail(strict=True, reason="GAP 3: poor bank evidence (irregular income, overdrafts) does not "
                   "move the viability score, so it can look no worse than having no bank evidence")
def test_poor_bank_evidence_is_not_equal_to_no_bank_evidence():
    poor = assess(pkg(income_regularity=0.2, overdraft_count=8)).viability_score
    none = assess(pkg(verifications={}, **NO_BANK)).viability_score
    assert poor != none
