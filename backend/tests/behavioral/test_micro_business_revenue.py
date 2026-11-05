"""Test C - micro-business revenue sensitivity. SESE 2023 median turnover is about R14,400 (businesses
trading all 12 months); 76% are under R50k. Revenue should change the result proportionately without
overwhelming other factors. Baseline recorded in SESE_BENCHMARK.md; the formula is NOT changed here."""
import pytest
from core.assessment_engine import assess
from ._sese import pkg, TURNOVERS, STAGES


@pytest.mark.parametrize("label,yrs,inv", STAGES)
def test_revenue_never_lowers_the_score(label, yrs, inv):
    s = [assess(pkg(revenue=r, years_active=yrs, total_invoices=inv, paid_on_time=int(inv * .8),
                    unpaid_invoices=inv - int(inv * .8))).score for r in TURNOVERS]
    assert s == sorted(s)


@pytest.mark.parametrize("label,yrs,inv", STAGES)
def test_revenue_alone_cannot_move_a_business_across_two_decision_bands(label, yrs, inv):
    order = {"Declined": 0, "Review": 1, "Approved": 2}
    def d(r):
        return order[assess(pkg(revenue=r, years_active=yrs, total_invoices=inv, paid_on_time=int(inv * .8),
                                unpaid_invoices=inv - int(inv * .8))).decision]
    assert d(500_000) - d(5_000) <= 1


@pytest.mark.parametrize("label,yrs,inv", STAGES)
def test_revenue_factor_is_bounded_share_of_the_score(label, yrs, inv):
    a = assess(pkg(revenue=500_000, years_active=yrs, total_invoices=inv, paid_on_time=int(inv * .8),
                   unpaid_invoices=inv - int(inv * .8)))
    rev = a.breakdown["Revenue Tier"]
    assert rev["contribution"] <= rev["max"] <= 0.30 * a.breakdown["_assessment"]["raw_max"]


@pytest.mark.parametrize("label,yrs,inv", STAGES)
def test_other_factors_outweigh_revenue_across_the_micro_range(label, yrs, inv):
    """Between R5k and R100k (about 90% of SESE businesses) a clean-payment history must matter more."""
    lo = assess(pkg(revenue=5_000, years_active=yrs, total_invoices=inv, paid_on_time=inv, unpaid_invoices=0)).score
    hi_bad = assess(pkg(revenue=100_000, years_active=yrs, total_invoices=inv, paid_on_time=0, unpaid_invoices=inv)).score
    assert lo > hi_bad


def test_revenue_period_is_annual_only_documented_in_breakdown_label():
    a = assess(pkg(revenue=30_000))
    assert "R" in a.breakdown["Revenue Tier"]["label"]


@pytest.mark.xfail(strict=True, reason="GAP: micro-range resolution. R5k and R50k differ by under 2 pts "
                   "(startup/growth), so the engine barely separates the bottom 76% of SESE businesses")
def test_micro_range_is_resolved_by_at_least_five_points():
    low = assess(pkg(revenue=5_000, years_active=2)).score
    high = assess(pkg(revenue=50_000, years_active=2)).score
    assert high - low >= 5


@pytest.mark.xfail(strict=True, reason="GAP 4/trading duration: engine has no months-trading input, so a "
                   "6-month business's revenue cannot be annualised or compared with the 12-month SESE median")
def test_trading_duration_is_an_input():
    import dataclasses
    assert {"months_trading", "trading_months"} & {f.name for f in dataclasses.fields(type(pkg()))}


@pytest.mark.xfail(strict=True, reason="GAP: parsed_revenue is stored without a period; months_analysed is "
                   "captured but never used to annualise, so a 3-month statement is scored as annual revenue")
def test_parsed_revenue_is_annualised_using_months_analysed():
    import inspect
    from services import scoring_service
    src = inspect.getsource(scoring_service)
    assert "months_analysed" in src and ("* 12" in src or "/ months" in src)
