from decimal import Decimal

import pytest

from services.bank_statement_parser import parse_bank_statement


def make_statement(**overrides) -> bytes:
    values = {
        "avg_monthly_balance": "5200.00",
        "avg_monthly_income": "12500.00",
        "avg_monthly_expenses": "7500.00",
        "overdraft_count": "0",
        "income_regularity": "0.90",
        "months_analysed": "4",
        "parsed_revenue": "150000.00",
    }
    values.update(overrides)
    text = "\n".join(f"{key} = {value}" for key, value in values.items())
    return text.encode("utf-8")


def test_empty_content_returns_parse_failure():
    assert parse_bank_statement(b"") is None


def test_unrecognised_content_returns_parse_failure():
    assert parse_bank_statement(
        b"This document contains no recognised financial fields."
    ) is None


def test_incomplete_statement_does_not_receive_default_values():
    statement = b"avg_monthly_income = 12500.00"
    assert parse_bank_statement(statement) is None


def test_complete_statement_parses_all_signals():
    result = parse_bank_statement(make_statement())

    assert result is not None
    assert result.avg_monthly_balance == Decimal("5200.00")
    assert result.avg_monthly_income == Decimal("12500.00")
    assert result.avg_monthly_expenses == Decimal("7500.00")
    assert result.overdraft_count == 0
    assert result.income_regularity == pytest.approx(0.90)
    assert result.months_analysed == 4
    assert result.parsed_revenue == Decimal("150000.00")


@pytest.mark.parametrize(
    "overrides",
    [
        {"avg_monthly_balance": "not-a-number"},
        {"income_regularity": "1.5"},
        {"income_regularity": "-0.1"},
        {"months_analysed": "0"},
        {"overdraft_count": "-1"},
        {"avg_monthly_income": "-100.00"},
        {"parsed_revenue": "NaN"},
    ],
)
def test_invalid_signals_return_parse_failure(overrides):
    assert parse_bank_statement(make_statement(**overrides)) is None
