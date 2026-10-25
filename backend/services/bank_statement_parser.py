from dataclasses import dataclass
from decimal import Decimal, InvalidOperation
import re


@dataclass
class BankStatementSignals:
    avg_monthly_balance: Decimal
    avg_monthly_income: Decimal
    avg_monthly_expenses: Decimal
    overdraft_count: int
    income_regularity: float
    months_analysed: int
    parsed_revenue: Decimal


REQUIRED_FIELDS = (
    "avg_monthly_balance",
    "avg_monthly_income",
    "avg_monthly_expenses",
    "overdraft_count",
    "income_regularity",
    "months_analysed",
    "parsed_revenue",
)

NUMBER_PATTERN = r"[+-]?(?:\d+(?:\.\d*)?|\.\d+)"


def parse_bank_statement(pdf_bytes: bytes) -> BankStatementSignals | None:
    """
    Extract the application's recognised financial fields from decoded text.

    This is a text-pattern parser, not a general PDF extraction or
    bank-statement authenticity verification system. Missing or invalid
    signals cause parsing to fail rather than being replaced with defaults.
    """
    if not isinstance(pdf_bytes, bytes) or not pdf_bytes:
        return None

    try:
        text = pdf_bytes.decode("utf-8", errors="ignore")
        values = {}

        for field in REQUIRED_FIELDS:
            match = re.search(
                rf"(?<!\w){re.escape(field)}\s*[:=]\s*({NUMBER_PATTERN})(?![\w.])",
                text,
            )
            if match is None:
                return None
            values[field] = match.group(1)

        balance = Decimal(values["avg_monthly_balance"])
        income = Decimal(values["avg_monthly_income"])
        expenses = Decimal(values["avg_monthly_expenses"])
        revenue = Decimal(values["parsed_revenue"])
        regularity = Decimal(values["income_regularity"])

        # Reject NaN and infinity before performing range checks.
        if not all(
            value.is_finite()
            for value in (balance, income, expenses, revenue, regularity)
        ):
            return None

        # Financial totals and revenue cannot be negative.
        if income < 0 or expenses < 0 or revenue < 0:
            return None

        if not Decimal("0") <= regularity <= Decimal("1"):
            return None

        overdraft_value = Decimal(values["overdraft_count"])
        months_value = Decimal(values["months_analysed"])

        # Counts and duration must be whole numbers.
        if overdraft_value != overdraft_value.to_integral_value():
            return None
        if months_value != months_value.to_integral_value():
            return None

        overdraft_count = int(overdraft_value)
        months_analysed = int(months_value)

        if overdraft_count < 0 or months_analysed <= 0:
            return None

        return BankStatementSignals(
            avg_monthly_balance=balance,
            avg_monthly_income=income,
            avg_monthly_expenses=expenses,
            overdraft_count=overdraft_count,
            income_regularity=float(regularity),
            months_analysed=months_analysed,
            parsed_revenue=revenue,
        )

    except (ValueError, InvalidOperation, TypeError, OverflowError):
        return None
