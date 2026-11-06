"""
Audit finding F1: the stored snapshot's revenue_source must agree with the Revenue Tier factor.
Previously the snapshot keyed off the verification id alone, so an approved statement without parsed
revenue/months produced 'verified_bank_statement' while the engine scored it as 'self-reported'.
"""
import pytest

from core.assessment_engine import assess, revenue_evidence_source
from services.scoring_service import _build_assessment_snapshot_data
from tests.validation.test_evidence_handling import sme

CASES = [
    # (verifications, months_analysed, verification_id, expected engine source)
    ({"cipc": "approved"}, None, None, "self-reported"),                       # no statement
    ({"bank_statement": "pending"}, 6, None, "self-reported"),                 # pending only
    ({"bank_statement": "rejected"}, 6, None, "self-reported"),
    ({"bank_statement": "approved"}, None, 77, "self-reported"),               # F1: approved, nothing parsed
    ({"bank_statement": "approved"}, 6, 77, "parsed"),                         # genuinely parsed
]


@pytest.mark.parametrize("vers,months,vid,expected", CASES)
def test_snapshot_and_breakdown_never_disagree(vers, months, vid, expected):
    inp = sme(verifications=vers, months_analysed=months, bank_statement_verification_id=vid,
              revenue=80_000.0)
    result = assess(inp)
    snap = _build_assessment_snapshot_data(inp, result)
    assert revenue_evidence_source(inp) == expected
    assert result.breakdown["Revenue Tier"]["source"] == expected
    snap_value = snap["input_snapshot"]["revenue_source"] if "input_snapshot" in snap else snap["revenue_source"]
    assert snap_value == ("verified_bank_statement" if expected == "parsed" else "declared")


def test_verification_id_is_still_recorded_independently_of_the_revenue_label():
    inp = sme(verifications={"bank_statement": "approved"}, months_analysed=None,
              bank_statement_verification_id=77, revenue=80_000.0)
    snap = _build_assessment_snapshot_data(inp, assess(inp))
    inner = snap["input_snapshot"] if "input_snapshot" in snap else snap
    assert inner["bank_statement_verification_id"] == 77
