"""Test D - province and sector neutrality. Both are unvalidated context (SESE 2023 shows large provincial
differences in business counts, which is not evidence about viability)."""
import pytest
from core.assessment_engine import assess
from ._sese import pkg

PROVINCES = ["Gauteng", "Limpopo", "KwaZulu-Natal", "Western Cape"]
SECTORS = ["Retail", "Construction", "Agriculture", "Technology", "Hospitality"]


def test_province_does_not_change_score_viability_or_decision():
    r = [assess(pkg(province=p)) for p in PROVINCES]
    assert len({(a.score, a.viability_score, a.decision) for a in r}) == 1


def test_sector_does_not_change_score_viability_or_decision():
    r = [assess(pkg(industry=s)) for s in SECTORS]
    assert len({(a.score, a.viability_score, a.decision) for a in r}) == 1


@pytest.mark.parametrize("revenue", [10_000, 100_000, 500_000])
def test_neutrality_holds_across_the_revenue_range(revenue):
    r = [assess(pkg(province=p, industry=s, revenue=revenue)).score for p in PROVINCES for s in SECTORS]
    assert max(r) == min(r)


def test_province_is_still_reported_as_context():
    a = assess(pkg(province="Limpopo"))
    assert "Limpopo" in str(a.breakdown)


def test_unknown_province_is_not_penalised():
    assert assess(pkg(province=None)).score == assess(pkg(province="Gauteng")).score
