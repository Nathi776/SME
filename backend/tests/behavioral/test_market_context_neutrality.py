"""
Province and sector are contextual information until validated against outcomes.
Otherwise identical businesses must receive identical scores and decisions.
"""
import pytest

from core.assessment_engine import assess
from tests.validation.test_evidence_handling import sme, NO_BANK

PROVINCES = ["Gauteng", "Limpopo", "KwaZulu-Natal", "Western Cape", "Eastern Cape", None]
SECTORS = ["Technology", "Retail", "Agriculture", "Construction", "Hospitality"]


@pytest.mark.parametrize("kwargs", [dict(), NO_BANK, dict(revenue=14400.0, years_active=1)])
def test_province_does_not_change_scores_or_decision(kwargs):
    results = [assess(sme(province=p, **kwargs)) for p in PROVINCES]
    ref = results[0]
    for r in results[1:]:
        assert r.score == ref.score
        assert r.viability_score == ref.viability_score
        assert r.decision == ref.decision
        assert r.confidence_score == ref.confidence_score


def test_sector_does_not_change_viability_or_decision():
    results = [assess(sme(industry=s)) for s in SECTORS]
    ref = results[0]
    for r in results[1:]:
        assert r.viability_score == ref.viability_score
        assert r.score == ref.score
        assert r.decision == ref.decision


def test_context_factors_carry_no_points():
    r = assess(sme())
    for name in ("Industry Risk", "Market Viability"):
        f = r.breakdown[name]
        assert f["contribution"] == 0.0 and f["max"] == 0.0
        assert f["contextual"] is True and f["applicable"] is False
