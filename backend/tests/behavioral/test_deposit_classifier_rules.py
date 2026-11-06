"""
Conservative-rules table for services/deposit_classifier.py (rules-v2).
Principles: a single keyword never establishes revenue or owner money; ambiguity goes to review;
nothing here may weaken the exclusion of loans, owner capital, transfers and refunds.
Refund policy is still OPEN (see docs/BANK_REVENUE_CLASSIFICATION_SPEC.md); these tests only pin that a
refund is never counted as customer revenue.
"""
from datetime import date
from decimal import Decimal

import pytest

from services.deposit_classifier import CLASSIFIER_VERSION, DepositCategory as C, ReviewStatus as R, classify_deposit

REVENUE, EXCLUDED, REVIEW = "revenue", "excluded", "review"


def outcome(desc):
    c = classify_deposit(__import__("services.deposit_classifier", fromlist=["Transaction"]).Transaction(
        date(2026, 1, 15), desc, Decimal("1000")))
    if c.counts_as_revenue:
        return REVENUE, c
    return (REVIEW if c.review_status is R.NEEDS_REVIEW else EXCLUDED), c


CASES = [
    # the two demonstrated errors, and the cases named in the decision
    ("SALE OF EQUIPMENT", REVIEW),
    ("PAYMENT FROM OWNER STORES", REVIEW),
    ("OWNER STORES PAYMENT", REVIEW),
    ("OWNER'S MARKET PAYMENT", REVIEW),
    ("OWNER CAPITAL INJECTION", EXCLUDED),
    ("PAYMENT FOR INVOICE 1024", REVENUE),
    ("SALE INVOICE PAYMENT", REVENUE),
    # a bare SALE word never makes revenue
    ("SALE", REVIEW),
    ("SALE OF VEHICLE", REVIEW),
    ("SALES", REVIEW),
    # invoice context resolves a customer name containing an owner word
    ("INV 20491 OWNER STORES", REVENUE),
    ("INVOICE 1024 DIRECTOR HARDWARE", REVENUE),
    # existing exclusions are preserved
    ("OWNER CONTRIBUTION", EXCLUDED),
    ("DIRECTOR LOAN ACCOUNT", EXCLUDED),
    ("SHAREHOLDER'S FUNDING", EXCLUDED),
    ("BUSINESS LOAN DISBURSEMENT", EXCLUDED),
    ("TRANSFER FROM SAVINGS", EXCLUDED),
    ("INTER ACCOUNT TRANSFER", EXCLUDED),
    ("REFUND - SUPPLIER", EXCLUDED),
    # ambiguity and unknowns go to review
    ("LOAN REPAYMENT INVOICE", REVIEW),
    ("CUSTOMER REFUND", REVIEW),
    ("CASH DEPOSIT 88213", REVIEW),
    ("", REVIEW),
    # clear customer payments still count
    ("PAYMENT FROM ABC TRADERS", REVENUE),
    ("YOCO CARD SETTLEMENT", REVENUE),
]


@pytest.mark.parametrize("desc,expected", CASES)
def test_rule_table(desc, expected):
    assert outcome(desc)[0] == expected


def test_weak_owner_word_alone_never_decides_a_category():
    for desc in ("OWNER STORES PAYMENT", "DIRECTOR HARDWARE", "MEMBER'S MARKET", "SHAREHOLDER CAFE"):
        got, c = outcome(desc)
        assert got == REVIEW and c.category is C.UNKNOWN and c.source == "ambiguous:owner-word"


def test_a_refund_is_never_customer_revenue():
    for desc in ("CUSTOMER REFUND", "REFUND", "PAYMENT REVERSAL", "CHARGEBACK"):
        assert outcome(desc)[0] != REVENUE


def test_debits_are_still_ignored_so_customer_refunds_paid_out_are_not_netted():
    """Known open policy item: refunds paid OUT (debits) do not yet reduce revenue."""
    from services.deposit_classifier import Transaction
    assert classify_deposit(Transaction(date(2026, 1, 15), "CUSTOMER REFUND", Decimal("-500"))) is None


def test_rules_version_is_bumped():
    assert CLASSIFIER_VERSION == "rules-v2"
