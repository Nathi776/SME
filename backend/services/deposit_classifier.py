"""
Rule-based classification of bank-statement deposits (credits).

Purpose: decide what each deposit *is* before any revenue figure is calculated. Only customer sales
count as revenue. An unknown deposit never becomes revenue; it is flagged for review. This module is
pure (no database, no I/O) and is NOT yet wired into scoring. See docs/BANK_REVENUE_CLASSIFICATION_SPEC.md.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, replace
from datetime import date
from decimal import Decimal
from enum import Enum

CLASSIFIER_VERSION = "rules-v2"
MIN_SALE_CONFIDENCE = 0.70   # a sale rule below this would not count (no such rule today)
LOW_CONFIDENCE_BELOW = 0.80  # revenue resting on rules below this is reported as low confidence


class DepositCategory(str, Enum):
    CUSTOMER_SALE = "customer_sale"
    LOAN = "loan"
    OWNER_CONTRIBUTION = "owner_contribution"
    INTERNAL_TRANSFER = "internal_transfer"
    REFUND_REVERSAL = "refund_reversal"
    UNKNOWN = "unknown"


class ReviewStatus(str, Enum):
    AUTO = "auto"                    # classified by a rule, no human involved
    NEEDS_REVIEW = "needs_review"    # unknown or conflicting; excluded from revenue until reviewed
    REVIEWED = "reviewed"            # a person set or confirmed the category


@dataclass(frozen=True)
class Transaction:
    date: date
    description: str
    amount: Decimal  # positive = credit (deposit), negative = debit


@dataclass(frozen=True)
class ClassifiedTransaction:
    transaction: Transaction
    category: DepositCategory
    confidence: float
    source: str            # "rule:<id>", "conflict", "default", or "manual:<reviewer>"
    review_status: ReviewStatus

    @property
    def counts_as_revenue(self) -> bool:
        return (self.category is DepositCategory.CUSTOMER_SALE
                and self.confidence >= MIN_SALE_CONFIDENCE
                and self.review_status is not ReviewStatus.NEEDS_REVIEW)


# (rule id, category, confidence, pattern). Matching is on upper-cased, whitespace-collapsed text.
_RULES: list[tuple[str, DepositCategory, float, re.Pattern]] = [
    (rid, cat, conf, re.compile(pat)) for rid, cat, conf, pat in [
        ("loan.keyword", DepositCategory.LOAN, 0.90,
         r"\b(LOAN|CREDIT ADVANCE|CASH ADVANCE|MICROLOAN|MICRO LOAN|FINANCE ADVANCE|OVERDRAFT FACILITY|"
         r"LENDER|DISBURSEMENT)\b"),
        # Owner money needs a PAIRED phrase (who + what). A bare OWNER/DIRECTOR word is only a weak signal
        # (it can be part of a customer's name) and is handled separately as _WEAK_OWNER.
        ("owner.strong", DepositCategory.OWNER_CONTRIBUTION, 0.90,
         r"\b((OWNER|DIRECTOR|SHAREHOLDER|MEMBER)'?S? (CAPITAL|CONTRIBUTION|FUNDING|INJECTION|LOAN|"
         r"INVESTMENT|DEPOSIT)|CAPITAL (INJECTION|CONTRIBUTION)|DRAWINGS? REPAY|PERSONAL (ACC|ACCOUNT)|"
         r"OWN CONTRIBUTION)\b"),
        ("transfer.keyword", DepositCategory.INTERNAL_TRANSFER, 0.90,
         r"\b(OWN ACC(OUNT)?|INTER[- ]?ACC(OUNT)?|BETWEEN ACC(OUNT)?S?|SAVINGS? TRANSFER|TRANSFER FROM "
         r"(SAVINGS?|CURRENT|CHEQUE|CREDIT CARD)|TFR FROM (SAV|CUR|CHQ)|ACCOUNT TRANSFER|IB TRANSFER FROM "
         r"(SAV|CUR))\b"),
        ("refund.keyword", DepositCategory.REFUND_REVERSAL, 0.90,
         r"\b(REFUND|REVERSAL|REVERSED|RETURNED|CHARGEBACK|CHARGE BACK|UNPAID DEBIT|REBATE|RTD)\b"),
        ("sale.processor", DepositCategory.CUSTOMER_SALE, 0.90,
         r"\b(YOCO|SNAPSCAN|ZAPPER|PAYFAST|PAYSTACK|PEACH PAYMENTS|IKHOKHA|SUMUP|CARD SETTLEMENT|"
         r"POS SETTLEMENT|MERCHANT SETTLEMENT)\b"),
        # A bare SALE/SALES word is NOT evidence of customer revenue ("SALE OF EQUIPMENT" is an asset
        # disposal). An invoice reference is.
        ("sale.invoice", DepositCategory.CUSTOMER_SALE, 0.90,
         r"\b(INV|INVOICE|INV(OICE)? ?(NO|#)?\s?\d+)\b"),
        ("sale.customer", DepositCategory.CUSTOMER_SALE, 0.75,
         r"\b(CUSTOMER|CLIENT|PAYMENT FROM|PMT FROM|PAYMENT RECEIVED)\b"),
    ]
]
# A bare owner-related word anywhere in the description. Never decides a category on its own.
_WEAK_OWNER = re.compile(r"\b(OWNER|DIRECTOR|SHAREHOLDER|MEMBER)'?S?\b")
STRONG_SALE_CONFIDENCE = 0.90  # an invoice reference or payment processor can resolve a weak owner word
_NON_SALE = {DepositCategory.LOAN, DepositCategory.OWNER_CONTRIBUTION,
             DepositCategory.INTERNAL_TRANSFER, DepositCategory.REFUND_REVERSAL}


_NON_SALE_PRECEDENCE = [DepositCategory.OWNER_CONTRIBUTION, DepositCategory.INTERNAL_TRANSFER,
                        DepositCategory.LOAN, DepositCategory.REFUND_REVERSAL]


def _norm(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "").upper()).strip()


def classify_deposit(tx: Transaction) -> ClassifiedTransaction | None:
    """Classify one credit. Returns None for debits and zero amounts (not deposits)."""
    if tx.amount <= 0:
        return None
    text = _norm(tx.description)
    hits = [(rid, cat, conf) for rid, cat, conf, pat in _RULES if pat.search(text)]
    if not hits:
        src = "ambiguous:owner-word" if _WEAK_OWNER.search(text) else "default"
        return ClassifiedTransaction(tx, DepositCategory.UNKNOWN, 0.0, src, ReviewStatus.NEEDS_REVIEW)

    cats = {cat for _, cat, _ in hits}
    non_sale = [h for h in hits if h[1] in _NON_SALE]
    sale = [h for h in hits if h[1] is DepositCategory.CUSTOMER_SALE]
    if not non_sale and _WEAK_OWNER.search(text) and not any(h[2] >= STRONG_SALE_CONFIDENCE for h in sale):
        # e.g. "OWNER STORES PAYMENT": a customer's name or the owner's own money; do not guess either way
        return ClassifiedTransaction(tx, DepositCategory.UNKNOWN, 0.0, "ambiguous:owner-word",
                                     ReviewStatus.NEEDS_REVIEW)
    if non_sale and sale:
        # e.g. "LOAN REPAYMENT INVOICE": sale vs not-sale is the question that matters, so do not guess.
        return ClassifiedTransaction(tx, DepositCategory.UNKNOWN, 0.0, "conflict", ReviewStatus.NEEDS_REVIEW)
    if non_sale:
        # Several non-sale readings (e.g. "DIRECTOR LOAN ACCOUNT"): all are excluded from revenue, so
        # choose the most specific label by a fixed precedence.
        rid, cat, conf = min(non_sale, key=lambda h: _NON_SALE_PRECEDENCE.index(h[1]))
    else:
        rid, cat, conf = max(sale, key=lambda h: h[2])
    return ClassifiedTransaction(tx, cat, conf, f"rule:{rid}", ReviewStatus.AUTO)


def classify_deposits(transactions: list[Transaction]) -> list[ClassifiedTransaction]:
    return [c for c in (classify_deposit(t) for t in transactions) if c is not None]


def apply_review(item: ClassifiedTransaction, category: DepositCategory, reviewer: str) -> ClassifiedTransaction:
    """A person's decision overrides the rules and is recorded as such."""
    if not reviewer or not reviewer.strip():
        raise ValueError("reviewer is required for a manual classification")
    return replace(item, category=category, confidence=1.0, source=f"manual:{reviewer.strip()}",
                   review_status=ReviewStatus.REVIEWED)
