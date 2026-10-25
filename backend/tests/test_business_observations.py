from datetime import datetime, timezone
from decimal import Decimal

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from database import Base
from models import Invoice, SME, User
from services.business_observation_service import build_current_observation_data
from services.scoring_service import build_evidence_package


engine = create_engine("sqlite:///:memory:")
TestingSessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)


@pytest.fixture(scope="function")
def db():
    Base.metadata.create_all(bind=engine)
    db_session = TestingSessionLocal()
    try:
        yield db_session
    finally:
        db_session.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture
def sme(db):
    user = User(
        username="observation_test_user",
        email="observation_test@example.com",
        hashed_password="pw",
        role="sme",
    )
    db.add(user)
    db.flush()

    business = SME(
        name="Observation Test SME",
        industry="Technology",
        revenue=Decimal("300000"),
        years_active=3,
        user_id=user.id,
    )
    db.add(business)
    db.commit()
    return business


@pytest.fixture
def invoice_factory(db):
    def create_invoice(**overrides):
        invoice = Invoice(
            sme_id=overrides.pop("sme_id"),
            client_name="Test Client",
            amount=Decimal("10000"),
            **{"status": "pending", **overrides},
        )
        db.add(invoice)
        return invoice

    return create_invoice


def test_paid_invoice_counts_as_on_time(db, sme, invoice_factory):
    invoice_factory(
        sme_id=sme.id,
        status="paid",
        due_date=datetime(2026, 9, 30, tzinfo=timezone.utc),
        paid_at=datetime(2026, 9, 28, tzinfo=timezone.utc),
    )
    db.commit()

    data = build_current_observation_data(sme, db)

    assert data["paid_on_time"] == 1


def test_late_paid_invoice_does_not_count_as_on_time(db, sme, invoice_factory):
    invoice_factory(
        sme_id=sme.id,
        status="paid",
        due_date=datetime(2026, 9, 30, tzinfo=timezone.utc),
        paid_at=datetime(2026, 10, 3, tzinfo=timezone.utc),
    )
    db.commit()

    data = build_current_observation_data(sme, db)

    assert data["paid_on_time"] == 0


def test_paid_invoice_without_paid_at_is_unknown(db, sme, invoice_factory):
    invoice_factory(
        sme_id=sme.id,
        status="paid",
        due_date=datetime(2026, 9, 30, tzinfo=timezone.utc),
        paid_at=None,
    )
    db.commit()

    data = build_current_observation_data(sme, db)

    assert data["paid_on_time"] == 0


def test_scoring_uses_payment_timestamp_for_on_time_count(db, sme, invoice_factory):
    invoice_factory(
        sme_id=sme.id,
        status="paid",
        due_date=datetime(2026, 9, 30, tzinfo=timezone.utc),
        paid_at=datetime(2026, 10, 3, tzinfo=timezone.utc),
    )
    db.commit()

    evidence = build_evidence_package(sme, db)

    assert evidence.paid_on_time == 0
