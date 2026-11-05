"""
Revenue sensitivity for micro-businesses. SESE 2023 (non-VAT population, survey estimates):
~76% below R50k, ~88% below R100k, ~98% below R500k annual turnover; median ~R14,400 for firms that
traded all 12 months. These bands are TEST bands, not Stats SA thresholds, and are not scoring
weights. Current behaviour is recorded as the baseline; known gaps are strict xfails so that a
future formula change must update them consciously.
"""
import dataclasses

import pytest

from core.assessment_engine import assess
from core.scoring import EvidencePackage
from tests.validation.test_evidence_handling import sme

TURNOVERS = [5_000, 10_000, 15_000, 25_000, 50_000, 75_000, 100_000, 250_000, 500_000]
BLANK = dict(overdraft_count=None, income_regularity=None, months_analysed=None,
             verifications={})


def rev_factor(revenue, **k):
    return assess(sme(revenue=float(revenue), **BLANK, **k)).breakdown["Revenue Tier"]


@pytest.mark.parametrize("years,inv", [(0, 0), (1, 3), (2, 10)])
def test_revenue_contribution_never_decreases_with_turnover(years, inv):
    pts = [rev_factor(r, years_active=years, total_invoices=inv, paid_on_time=inv,
                      unpaid_invoices=0)["contribution"] for r in TURNOVERS]
    assert pts == sorted(pts)


def test_revenue_distinguishes_adjacent_micro_turnovers_in_points():
    pts = [rev_factor(r)["contribution"] for r in TURNOVERS[:5]]
    assert len(set(pts)) == len(pts)


def test_revenue_factor_cannot_dominate_the_score():
    low = assess(sme(revenue=5_000.0, **BLANK))
    high = assess(sme(revenue=500_000.0, **BLANK))
    swing = high.score - low.score
    assert swing <= 0.25 * 100  # one factor must not move the score by more than a quarter


def test_revenue_cannot_rescue_a_business_with_all_invoices_unpaid():
    bad = assess(sme(revenue=500_000.0, total_invoices=10, paid_on_time=0, unpaid_invoices=10,
                     **BLANK))
    good = assess(sme(revenue=25_000.0, total_invoices=10, paid_on_time=10, unpaid_invoices=0,
                      **BLANK))
    assert good.viability_score > bad.viability_score


def test_baseline_revenue_scale_is_annual_and_linear_to_r500k():
    f = rev_factor(250_000.0)
    assert f["contribution"] == pytest.approx(f["max"] * 0.5, abs=0.1)
    assert rev_factor(1_000_000.0)["contribution"] == rev_factor(500_000.0)["contribution"]


def test_baseline_revenue_thresholds_are_the_same_in_every_stage():
    fracs = []
    for years, inv in [(1, 3), (2, 10), (4, 25)]:
        f = rev_factor(100_000.0, years_active=years, total_invoices=inv, paid_on_time=inv,
                       unpaid_invoices=0)
        fracs.append(round(f["contribution"] / f["max"], 3))
    assert len(set(fracs)) == 1  # same R100k = same share of the factor in Growth/Established


def test_baseline_idea_stage_ignores_revenue_entirely():
    f = rev_factor(100_000.0, years_active=0, total_invoices=0, paid_on_time=0, unpaid_invoices=0)
    assert f["applicable"] is False and f["contribution"] == 0.0


# ---- KNOWN GAPS (strict xfail): remove the marker when the revenue scale is redesigned ----------

@pytest.mark.xfail(strict=True, reason=(
    "Gap: ~76% of SESE businesses fall in the single '< R50k' label, so R5k and R25k look identical"))
def test_labels_distinguish_the_lower_micro_range():
    labels = {rev_factor(r)["label"].split(" (")[0] for r in (5_000, 15_000, 40_000)}
    assert len(labels) > 1


@pytest.mark.xfail(strict=True, reason=(
    "Gap: EvidencePackage has no trading-duration field, so a half-year trader's revenue cannot be "
    "annualised before comparison with a full-year benchmark such as the SESE R14,400 median"))
def test_revenue_can_be_adjusted_for_months_traded():
    names = {f.name for f in dataclasses.fields(EvidencePackage)}
    assert {"months_trading", "trading_months"} & names
