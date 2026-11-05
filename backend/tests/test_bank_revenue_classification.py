from datetime import date
from decimal import Decimal as D

import pytest

from services.deposit_classifier import (
    ClassifiedTransaction, DepositCategory as C, ReviewStatus, Transaction, apply_review,
    classify_deposit, classify_deposits,
)
from services.revenue_normalisation import months_between, normalise_revenue

J = date(2026, 1, 15)


def tx(desc, amt="1000", d=J):
    return Transaction(d, desc, D(amt))


@pytest.mark.parametrize("desc,expected", [
    ("YOCO SETTLEMENT 0412", C.CUSTOMER_SALE),
    ("SnapScan payout", C.CUSTOMER_SALE),
    ("INV 20344 Mokoena Traders", C.CUSTOMER_SALE),
    ("Customer payment - Thabo", C.CUSTOMER_SALE),
    ("CAPITEC LOAN DISBURSEMENT", C.LOAN),
    ("Credit advance", C.LOAN),
    ("Owner capital injection", C.OWNER_CONTRIBUTION),
    ("DIRECTOR LOAN ACCOUNT", C.OWNER_CONTRIBUTION),
    ("Transfer from savings", C.INTERNAL_TRANSFER),
    ("Between accounts", C.INTERNAL_TRANSFER),
    ("REFUND - supplier", C.REFUND_REVERSAL),
    ("Payment reversal", C.REFUND_REVERSAL),
    ("MR J DLAMINI", C.UNKNOWN),
    ("", C.UNKNOWN),
])
def test_categories(desc, expected):
    assert classify_deposit(tx(desc)).category is expected


def test_unknown_never_counts_as_revenue_and_needs_review():
    r = classify_deposit(tx("MR J DLAMINI"))
    assert not r.counts_as_revenue and r.review_status is ReviewStatus.NEEDS_REVIEW


def test_conflicting_signals_are_not_guessed():
    r = classify_deposit(tx("LOAN REPAYMENT INVOICE 123"))
    assert r.category is C.UNKNOWN and r.source == "conflict" and not r.counts_as_revenue


def test_non_sale_wins_only_when_no_sale_signal():
    assert classify_deposit(tx("Refund")).category is C.REFUND_REVERSAL
    assert classify_deposit(tx("Refund INV 55")).category is C.UNKNOWN


def test_debits_and_zero_are_not_deposits():
    assert classify_deposit(tx("INV 1", "-50")) is None
    assert classify_deposit(tx("INV 1", "0")) is None
    assert len(classify_deposits([tx("INV 1"), tx("rent", "-900")])) == 1


def test_each_record_keeps_its_audit_fields():
    r = classify_deposit(tx("Yoco settlement"))
    assert (r.transaction.date, r.transaction.description, r.transaction.amount) == (J, "Yoco settlement", D(1000))
    assert 0 < r.confidence <= 1 and r.source.startswith("rule:") and r.review_status is ReviewStatus.AUTO


def test_manual_review_overrides_and_is_attributed():
    r = apply_review(classify_deposit(tx("MR J DLAMINI")), C.CUSTOMER_SALE, "ops@neptech")
    assert r.counts_as_revenue and r.source == "manual:ops@neptech" and r.review_status is ReviewStatus.REVIEWED
    with pytest.raises(ValueError):
        apply_review(r, C.LOAN, " ")


# ---- period normalisation -----------------------------------------------------------------------

def test_months_between_full_calendar_months_and_partial():
    assert months_between(date(2026, 1, 1), date(2026, 4, 30)) == 4.0
    assert months_between(date(2026, 1, 1), date(2026, 12, 31)) == 12.0
    assert months_between(date(2026, 1, 10), date(2026, 2, 8)) == pytest.approx(0.99, abs=0.02)
    with pytest.raises(ValueError):
        months_between(date(2026, 2, 1), date(2026, 1, 1))


def four_month_statement(extra=()):
    rows = [tx("INV 1 sale", "20000", date(2026, 1, 20)), tx("Yoco settlement", "30000", date(2026, 3, 5)),
            tx("Capitec loan", "40000", date(2026, 2, 2)), tx("Owner capital injection", "10000", date(2026, 2, 3)),
            tx("Transfer from savings", "5000", date(2026, 4, 1)), tx("Refund", "700", date(2026, 4, 9))]
    return classify_deposits(rows + list(extra))


def test_spec_example_50000_over_4_months_is_12500_and_150000_run_rate():
    o = normalise_revenue(four_month_statement(), date(2026, 1, 1), date(2026, 4, 30))
    assert o.observed_customer_revenue == D("50000.00")
    assert o.total_deposits == D("105700.00")  # loans, owner money, transfers, refunds are NOT revenue
    assert o.months_covered == 4.0 and o.monthly_average == D("12500.00")
    assert o.annualised_run_rate == D("150000.00") and o.basis == "run_rate"
    assert o.excluded_by_category["loan"] == D("40000.00")
    assert o.excluded_by_category["owner_contribution"] == D("10000.00")
    assert not o.review_required


def test_observed_and_annualised_figures_are_distinct():
    o = normalise_revenue(four_month_statement(), date(2026, 1, 1), date(2026, 4, 30))
    assert o.annualised_run_rate != o.observed_customer_revenue


def test_unknown_deposits_are_excluded_and_flag_review():
    o = normalise_revenue(four_month_statement([tx("MR J DLAMINI", "2000", date(2026, 3, 3))]),
                          date(2026, 1, 1), date(2026, 4, 30))
    assert o.observed_customer_revenue == D("50000.00") and o.unresolved_deposits == D("2000.00")
    assert o.review_required and o.needs_review_count == 1


def test_review_moves_unknown_into_revenue_and_tracks_reviewed_amount():
    items = four_month_statement([tx("MR J DLAMINI", "2000", date(2026, 3, 3))])
    items = [apply_review(i, C.CUSTOMER_SALE, "ops") if i.category is C.UNKNOWN else i for i in items]
    o = normalise_revenue(items, date(2026, 1, 1), date(2026, 4, 30))
    assert o.observed_customer_revenue == D("52000.00") and o.reviewed_customer_revenue == D("2000.00")
    assert not o.review_required


def test_too_much_unclassified_value_withholds_the_estimate():
    items = classify_deposits([tx("INV 1", "10000", date(2026, 1, 5)),
                               tx("MR X", "9000", date(2026, 2, 5))])
    o = normalise_revenue(items, date(2026, 1, 1), date(2026, 4, 30))
    assert o.basis == "not_reliable" and o.annualised_run_rate is None


def test_short_period_is_not_annualised():
    o = normalise_revenue(classify_deposits([tx("INV 1", "5000", date(2026, 1, 5))]),
                          date(2026, 1, 1), date(2026, 2, 28))
    assert o.basis == "not_reliable" and o.annualised_run_rate is None and o.observed_customer_revenue == D("5000.00")


def test_twelve_month_statement_reports_observed_not_run_rate():
    o = normalise_revenue(classify_deposits([tx("INV 1", "14400", date(2026, 6, 5))]),
                          date(2026, 1, 1), date(2026, 12, 31))
    assert o.basis == "observed_12_months" and o.annualised_run_rate == D("14400.00")


def test_transactions_outside_the_period_are_ignored_and_reported():
    o = normalise_revenue(classify_deposits([tx("INV 1", "1000", date(2025, 12, 31)),
                                             tx("INV 2", "2000", date(2026, 2, 1))]),
                          date(2026, 1, 1), date(2026, 3, 31))
    assert o.observed_customer_revenue == D("2000.00") and o.out_of_period_count == 1


def test_low_confidence_revenue_is_reported():
    o = normalise_revenue(classify_deposits([tx("Customer payment", "3000", date(2026, 1, 5)),
                                             tx("Yoco", "1000", date(2026, 1, 6))]),
                          date(2026, 1, 1), date(2026, 3, 31))
    assert o.low_confidence_revenue == D("3000.00")


def test_module_is_not_wired_into_scoring():
    import inspect
    from services import scoring_service
    assert "deposit_classifier" not in inspect.getsource(scoring_service)
