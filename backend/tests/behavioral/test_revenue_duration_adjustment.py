"""
Specification tests for duration handling of revenue (analysis stage; production scoring unchanged).

`annualise()` below is the PROPOSED rule, kept in the test file as an executable spec. It is not
used by the engine. Principles: keep reported revenue and its period; never treat a short trading
period as a full year; never infer months_trading from registration date; do not penalise youth;
an annualised figure is a run rate, not actual annual revenue.
"""
from dataclasses import dataclass

import pytest

from core.assessment_engine import assess
from tests.validation.test_evidence_handling import sme

MIN_RELIABLE_MONTHS = 3  # proposed: shorter periods are too noisy to annualise


@dataclass(frozen=True)
class Annualised:
    reported_revenue: float
    revenue_period_months: int | None
    months_trading: int | None
    annualised_revenue: float | None
    basis: str  # "actual_12_months" | "run_rate" | "not_reliable"


def annualise(reported_revenue, revenue_period_months, months_trading):
    if revenue_period_months is None or months_trading is None or revenue_period_months <= 0:
        return Annualised(reported_revenue, revenue_period_months, months_trading, None, "not_reliable")
    if revenue_period_months > months_trading:  # cannot report more months than traded
        return Annualised(reported_revenue, revenue_period_months, months_trading, None, "not_reliable")
    if revenue_period_months == 12:
        return Annualised(reported_revenue, 12, months_trading, reported_revenue, "actual_12_months")
    if revenue_period_months < MIN_RELIABLE_MONTHS:
        return Annualised(reported_revenue, revenue_period_months, months_trading, None, "not_reliable")
    return Annualised(reported_revenue, revenue_period_months, months_trading,
                      reported_revenue * 12 / revenue_period_months, "run_rate")


def test_six_months_of_r12000_is_a_r24000_run_rate_not_actual_revenue():
    a = annualise(12_000, 6, 6)
    assert a.annualised_revenue == 24_000
    assert a.basis == "run_rate"
    assert a.reported_revenue == 12_000 and a.revenue_period_months == 6  # originals preserved


def test_twelve_month_figure_is_used_as_actual():
    assert annualise(14_400, 12, 30).basis == "actual_12_months"
    assert annualise(14_400, 12, 30).annualised_revenue == 14_400


def test_unknown_duration_is_not_assumed_to_be_a_full_year():
    assert annualise(14_400, None, None).annualised_revenue is None
    assert annualise(14_400, 12, None).annualised_revenue is None


def test_period_longer_than_trading_history_is_rejected_as_unreliable():
    assert annualise(30_000, 12, 6).basis == "not_reliable"


def test_very_short_periods_are_not_annualised():
    assert annualise(2_000, 1, 1).annualised_revenue is None


def test_young_business_run_rate_matches_an_older_business_with_same_pace():
    young = annualise(7_200, 6, 6).annualised_revenue
    older = annualise(14_400, 12, 24).annualised_revenue
    assert young == older  # R14,400 pace either way: youth alone is not penalised


def test_annualisation_does_not_depend_on_registration_age_inputs():
    # months_trading is supplied, never derived from years_active
    assert annualise(7_200, 6, 6).annualised_revenue == annualise(7_200, 6, 6).annualised_revenue
    assert sme().months_trading is None and sme(years_active=5).months_trading is None


def test_supplying_duration_fields_does_not_change_scores_today():
    base = assess(sme())
    with_fields = assess(sme(months_trading=18, revenue_period_months=12))
    assert (base.score, base.viability_score, base.decision) == \
           (with_fields.score, with_fields.viability_score, with_fields.decision)
