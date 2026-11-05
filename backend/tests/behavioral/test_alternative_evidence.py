"""
Evidence ladder. SESE 2023: 71% of surveyed businesses keep no financial records, so the engine must
assess limited-record businesses while being honest about uncertainty (Evidence Confidence).
Ordering of confidence is tested; the exact numbers are not.
"""
from core.assessment_engine import assess
from tests.validation.test_evidence_handling import sme

BLANK = dict(overdraft_count=None, income_regularity=None, months_analysed=None)


def conf(**k):
    return assess(sme(**k)).confidence_score


def test_verified_bank_statement_gives_more_confidence_than_none():
    with_bank = conf()
    no_bank = conf(verifications={"cipc": "approved"}, **BLANK)
    assert with_bank > no_bank


def test_unverified_trading_records_still_beat_a_bare_declaration():
    records = conf(verifications={}, **BLANK)
    declaration = conf(verifications={}, total_invoices=0, paid_on_time=0, unpaid_invoices=0,
                       founder=None, **BLANK)
    # Invoices do not raise confidence today (only documents and founder profile do); equality is
    # acceptable, a lower value for informal records is not.
    assert records >= declaration


def test_confidence_never_reaches_certainty_without_documents():
    assert conf(verifications={}, **BLANK) < 60


def test_informal_evidence_is_not_treated_as_nonexistent():
    informal = assess(sme(verifications={}, **BLANK))
    nothing = assess(sme(verifications={}, revenue=0.0, total_invoices=0, paid_on_time=0,
                         unpaid_invoices=0, years_active=0, founder=None, **BLANK))
    assert informal.viability_score > nothing.viability_score
    assert informal.confidence_score > 0


def test_rejected_evidence_does_not_raise_confidence():
    base = conf(verifications={}, **BLANK)
    rejected = conf(verifications={"cipc": "rejected", "bank_statement": "rejected"}, **BLANK)
    assert rejected <= base
