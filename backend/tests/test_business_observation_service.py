
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest

from models.business_observation import BusinessObservation
from models.invoice import Invoice
from models.sme import SME
from models.verification import Verification
from services.business_observation_service import build_current_observation_data


def make_sme():
    return SimpleNamespace(
        id=1,
        years_active=2,
        revenue=Decimal("10000.00"),
        # Legacy metrics deliberately contain conflicting values.
        bs_parsed_revenue=Decimal("99999.00"),
        bs_avg_monthly_balance=Decimal("99999.00"),
        bs_avg_monthly_income=Decimal("99999.00"),
        bs_avg_monthly_expenses=Decimal("99999.00"),
        bs_overdraft_count=99,
        bs_income_regularity=Decimal("0.99"),
        bs_months_analysed=99,
        industry="Retail",
        province="Gauteng",
        business_city="Pretoria",
    )


def make_verification(status, submitted_at, verification_id, **metrics):
    defaults = {
        "bs_avg_monthly_balance": Decimal("15000.00"),
        "bs_avg_monthly_income": Decimal("30000.00"),
        "bs_avg_monthly_expenses": Decimal("20000.00"),
        "bs_overdraft_count": 2,
        "bs_income_regularity": Decimal("0.85"),
        "bs_months_analysed": 6,
        "bs_parsed_revenue": Decimal("25000.00"),
    }
    defaults.update(metrics)

    return SimpleNamespace(
        id=verification_id,
        sme_id=1,
        doc_type="bank_statement",
        status=status,
        submitted_at=submitted_at,
        **defaults,
    )


def make_db(verification_records):
    db = MagicMock()

    def query_side_effect(model):
        query = MagicMock()

        if model is Invoice:
            query.filter.return_value.all.return_value = []
        elif model is Verification:
            query.filter.return_value.all.return_value = verification_records
        else:
            raise AssertionError(f"Unexpected model queried: {model}")

        return query

    db.query.side_effect = query_side_effect
    return db


def test_approved_latest_statement_supplies_observation_metrics():
    submitted_at = datetime(2026, 1, 1, tzinfo=timezone.utc)
    db = make_db([make_verification("approved", submitted_at, 1)])

    data = build_current_observation_data(make_sme(), db)

    assert data["revenue"] == 25000.0
    assert data["parsed_revenue"] == 25000.0
    assert data["avg_monthly_balance"] == 15000.0
    assert data["avg_monthly_income"] == 30000.0
    assert data["avg_monthly_expenses"] == 20000.0
    assert data["overdraft_count"] == 2
    assert data["income_regularity"] == 0.85
    assert data["months_analysed"] == 6


@pytest.mark.parametrize("status", ["pending", "rejected"])
def test_unapproved_latest_statement_excludes_bank_metrics(status):
    submitted_at = datetime(2026, 1, 1, tzinfo=timezone.utc)
    db = make_db([make_verification(status, submitted_at, 1)])

    data = build_current_observation_data(make_sme(), db)

    assert data["revenue"] == 10000.0
    assert data["parsed_revenue"] is None
    assert data["avg_monthly_balance"] is None
    assert data["avg_monthly_income"] is None
    assert data["avg_monthly_expenses"] is None
    assert data["overdraft_count"] is None
    assert data["income_regularity"] is None
    assert data["months_analysed"] is None


def test_no_bank_statement_excludes_legacy_bank_metrics():
    db = make_db([])

    data = build_current_observation_data(make_sme(), db)

    assert data["revenue"] == 10000.0
    assert data["parsed_revenue"] is None
    assert data["avg_monthly_balance"] is None
    assert data["avg_monthly_income"] is None
    assert data["avg_monthly_expenses"] is None
    assert data["overdraft_count"] is None
    assert data["income_regularity"] is None
    assert data["months_analysed"] is None


def test_latest_pending_statement_overrides_older_approval():
    older = datetime(2026, 1, 1, tzinfo=timezone.utc)
    newer = older + timedelta(days=1)

    db = make_db([
        make_verification("approved", older, 1),
        make_verification("pending", newer, 2),
    ])

    data = build_current_observation_data(make_sme(), db)

    assert data["revenue"] == 10000.0
    assert data["parsed_revenue"] is None
    assert data["overdraft_count"] is None
    assert data["income_regularity"] is None
    assert data["months_analysed"] is None


def test_approved_but_unparsed_statement_falls_back_to_sme_revenue():
    submitted_at = datetime(2026, 1, 1, tzinfo=timezone.utc)
    db = make_db([
        make_verification(
            "approved",
            submitted_at,
            1,
            bs_parsed_revenue=None,
            bs_avg_monthly_balance=None,
            bs_avg_monthly_income=None,
            bs_avg_monthly_expenses=None,
            bs_overdraft_count=None,
            bs_income_regularity=None,
            bs_months_analysed=None,
        )
    ])

    data = build_current_observation_data(make_sme(), db)

    assert data["revenue"] == 10000.0
    assert data["parsed_revenue"] is None
    assert data["avg_monthly_balance"] is None
    assert data["avg_monthly_income"] is None
    assert data["avg_monthly_expenses"] is None
    assert data["overdraft_count"] is None
    assert data["income_regularity"] is None
    assert data["months_analysed"] is None
