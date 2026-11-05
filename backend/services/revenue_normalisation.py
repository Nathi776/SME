"""
Turns classified deposits plus the statement coverage period into a revenue observation that keeps
observed figures and estimates apart. Pure functions; NOT wired into scoring.

Concepts (never merge them):
  total_deposits               every credit in the period, whatever it is
  observed_customer_revenue    credits classified as customer sales (rules and/or review)
  reviewed_customer_revenue    the part of that a person confirmed
  annualised_run_rate          an ESTIMATE (observed x 12 / months covered), never actual annual revenue
"""
from __future__ import annotations

import calendar
from dataclasses import dataclass, field
from datetime import date
from decimal import Decimal

from services.deposit_classifier import (
    LOW_CONFIDENCE_BELOW, ClassifiedTransaction, DepositCategory, ReviewStatus,
)

MIN_MONTHS_TO_ANNUALISE = 3
MAX_UNRESOLVED_SHARE = Decimal("0.25")  # unknown deposits above this share of all deposits: no estimate
TWELVE_MONTH_TOLERANCE = (11.5, 12.5)
_DAYS_PER_MONTH = 30.4375


@dataclass(frozen=True)
class RevenueObservation:
    period_start: date
    period_end: date
    months_covered: float
    total_deposits: Decimal
    observed_customer_revenue: Decimal
    reviewed_customer_revenue: Decimal
    excluded_by_category: dict[str, Decimal]
    unresolved_deposits: Decimal           # unknown/conflicting, excluded from revenue
    needs_review_count: int
    out_of_period_count: int
    low_confidence_revenue: Decimal        # revenue resting on rules below LOW_CONFIDENCE_BELOW
    monthly_average: Decimal | None
    annualised_run_rate: Decimal | None
    basis: str                             # "observed_12_months" | "run_rate" | "not_reliable"
    review_required: bool
    notes: list[str] = field(default_factory=list)


def months_between(start: date, end: date) -> float:
    """Whole calendar months when the period spans full months, otherwise days / 30.4375."""
    if end < start:
        raise ValueError("period_end is before period_start")
    month_end = calendar.monthrange(end.year, end.month)[1]
    if start.day == 1 and end.day == month_end:
        return float((end.year - start.year) * 12 + end.month - start.month + 1)
    return round(((end - start).days + 1) / _DAYS_PER_MONTH, 2)


def _q(x: Decimal) -> Decimal:
    return x.quantize(Decimal("0.01"))


def normalise_revenue(classified: list[ClassifiedTransaction], period_start: date,
                      period_end: date) -> RevenueObservation:
    months = months_between(period_start, period_end)
    zero = Decimal("0")
    total = observed = reviewed = unresolved = low_conf = zero
    excluded: dict[str, Decimal] = {c.value: zero for c in DepositCategory
                                    if c not in (DepositCategory.CUSTOMER_SALE, DepositCategory.UNKNOWN)}
    needs_review = out_of_period = 0

    for c in classified:
        if not (period_start <= c.transaction.date <= period_end):
            out_of_period += 1
            continue
        amt = c.transaction.amount
        total += amt
        if c.counts_as_revenue:
            observed += amt
            if c.review_status is ReviewStatus.REVIEWED:
                reviewed += amt
            elif c.confidence < LOW_CONFIDENCE_BELOW:
                low_conf += amt
        elif c.category in (DepositCategory.UNKNOWN, DepositCategory.CUSTOMER_SALE):
            unresolved += amt
            needs_review += 1
        else:
            excluded[c.category.value] += amt

    notes: list[str] = []
    if out_of_period:
        notes.append(f"{out_of_period} transaction(s) fell outside the statement period and were ignored")
    if needs_review:
        notes.append(f"{needs_review} deposit(s) could not be classified; excluded from revenue until reviewed")
    if low_conf:
        notes.append("part of the revenue rests on lower-confidence rules")

    unresolved_share = (unresolved / total) if total > 0 else zero
    monthly = _q(observed / Decimal(str(months))) if months > 0 else None

    if months < MIN_MONTHS_TO_ANNUALISE:
        basis, annual = "not_reliable", None
        notes.append(f"period under {MIN_MONTHS_TO_ANNUALISE} months: no annual estimate")
    elif unresolved_share > MAX_UNRESOLVED_SHARE:
        basis, annual = "not_reliable", None
        notes.append("too much of the deposit value is unclassified to estimate annual revenue")
    elif TWELVE_MONTH_TOLERANCE[0] <= months <= TWELVE_MONTH_TOLERANCE[1]:
        basis, annual = "observed_12_months", _q(observed)
    else:
        basis, annual = "run_rate", _q(observed * Decimal("12") / Decimal(str(months)))

    return RevenueObservation(
        period_start=period_start, period_end=period_end, months_covered=months,
        total_deposits=_q(total), observed_customer_revenue=_q(observed),
        reviewed_customer_revenue=_q(reviewed),
        excluded_by_category={k: _q(v) for k, v in excluded.items()},
        unresolved_deposits=_q(unresolved), needs_review_count=needs_review,
        out_of_period_count=out_of_period, low_confidence_revenue=_q(low_conf),
        monthly_average=monthly, annualised_run_rate=annual, basis=basis,
        review_required=bool(needs_review), notes=notes)
