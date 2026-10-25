import sys
import importlib

# If another test module has installed SQLAlchemy mocks,
# remove those mocks so the real SQLAlchemy package can load.
for module_name in ("sqlalchemy.orm", "sqlalchemy"):
    module = sys.modules.get(module_name)
    if module is not None and not hasattr(module, "Session" if module_name.endswith(".orm") else "create_engine"):
        sys.modules.pop(module_name, None)


import sqlalchemy
import sqlalchemy.orm
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest

from services.scoring_service import build_evidence_package
from models.verification import Verification
from models.invoice import Invoice
from models.founder_profile import FounderProfile


def make_sme():
    return SimpleNamespace(
        id=1,
        revenue=Decimal("10000.00"),
        bs_parsed_revenue=Decimal("25000.00"),
        bs_overdraft_count=2,
        bs_income_regularity=Decimal("0.85"),
        bs_months_analysed=6,
        years_active=2,
        industry="Retail",
        province="Gauteng",
    )



def make_verification(status, submitted_at, verification_id):
    return SimpleNamespace(
        id=verification_id,
        doc_type="bank_statement",
        status=status,
        submitted_at=submitted_at,
        loi_counterparty_known=None,

        # Metrics belong to this specific verification.
        bs_avg_monthly_balance=Decimal("15000.00"),
        bs_avg_monthly_income=Decimal("30000.00"),
        bs_avg_monthly_expenses=Decimal("20000.00"),
        bs_overdraft_count=2,
        bs_income_regularity=Decimal("0.85"),
        bs_months_analysed=6,
        bs_parsed_revenue=Decimal("25000.00"),
    )



def make_db(verification_records):
    db = MagicMock()

    def query_side_effect(model):
        query = MagicMock()

        if model is Invoice:
            query.filter.return_value.all.return_value = []
        elif model is Verification:
            query.filter.return_value.all.return_value = verification_records
        elif model is FounderProfile:
            query.filter.return_value.first.return_value = None
        else:
            raise AssertionError(f"Unexpected model queried: {model}")

        return query

    db.query.side_effect = query_side_effect
    return db


@pytest.mark.parametrize("status", ["pending", "rejected"])
def test_unapproved_bank_statement_metrics_are_excluded(status):
    submitted_at = datetime(2026, 1, 1, tzinfo=timezone.utc)
    db = make_db([make_verification(status, submitted_at, 1)])

    evidence = build_evidence_package(make_sme(), db)

    assert evidence.revenue == 10000.0
    assert evidence.overdraft_count is None
    assert evidence.income_regularity is None
    assert evidence.months_analysed is None
    assert evidence.verifications["bank_statement"] == status


def test_approved_bank_statement_metrics_are_included():
    submitted_at = datetime(2026, 1, 1, tzinfo=timezone.utc)
    db = make_db([
        make_verification("approved", submitted_at, 1)
    ])

    evidence = build_evidence_package(make_sme(), db)

    assert evidence.revenue == 25000.0
    assert evidence.overdraft_count == 2
    assert evidence.income_regularity == 0.85
    assert evidence.months_analysed == 6
    assert evidence.verifications["bank_statement"] == "approved"


def test_missing_bank_verification_excludes_stored_bank_metrics():
    db = make_db([])

    evidence = build_evidence_package(make_sme(), db)

    assert evidence.revenue == 10000.0
    assert evidence.overdraft_count is None
    assert evidence.income_regularity is None
    assert evidence.months_analysed is None
    assert "bank_statement" not in evidence.verifications


def test_latest_pending_verification_overrides_older_approval():
    older = datetime(2026, 1, 1, tzinfo=timezone.utc)
    newer = older + timedelta(days=1)

    db = make_db([
        make_verification("approved", older, 1),
        make_verification("pending", newer, 2),
    ])

    evidence = build_evidence_package(make_sme(), db)

    assert evidence.verifications["bank_statement"] == "pending"
    assert evidence.revenue == 10000.0
    assert evidence.overdraft_count is None
    assert evidence.income_regularity is None
    assert evidence.months_analysed is None
