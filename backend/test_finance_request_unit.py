import pytest
from decimal import Decimal
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from database import Base
from models.user import User
from models.sme import SME
from models.invoice import Invoice
from models.credit_score import CreditScore
from models.finance_request import FinanceRequest
from models.verification import Verification
from services.finance_service import (
    calculate_fee_rate,
    calculate_eligible_amount,
    create_finance_request,
)

# Set up in-memory database for testing
engine = create_engine("sqlite:///:memory:")
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="function")
def db():
    # Create the tables
    Base.metadata.create_all(bind=engine)
    db_session = TestingSessionLocal()
    try:
        yield db_session
    finally:
        db_session.close()
        Base.metadata.drop_all(bind=engine)


def test_calculate_fee_rate():
    # Aligned with 50/75 boundaries:
    # Score 0-50: 8%
    assert calculate_fee_rate(None) == Decimal("0.08")
    assert calculate_fee_rate(30) == Decimal("0.08")
    assert calculate_fee_rate(49) == Decimal("0.08")
    # Score 50-75: 5%
    assert calculate_fee_rate(50) == Decimal("0.05")
    assert calculate_fee_rate(60) == Decimal("0.05")
    assert calculate_fee_rate(74) == Decimal("0.05")
    # Score 75-85: 2.5%
    assert calculate_fee_rate(75) == Decimal("0.025")
    assert calculate_fee_rate(80) == Decimal("0.025")
    assert calculate_fee_rate(84) == Decimal("0.025")
    # Score 85+: 1.5%
    assert calculate_fee_rate(85) == Decimal("0.015")
    assert calculate_fee_rate(95) == Decimal("0.015")


def test_calculate_eligible_amount():
    # Score 0-50: 60%
    assert calculate_eligible_amount(10000, None) == Decimal("6000.00")
    assert calculate_eligible_amount(10000, 30) == Decimal("6000.00")
    # Score 50-75: 70%
    assert calculate_eligible_amount(10000, 50) == Decimal("7000.00")
    # Score 75-85: 80%
    assert calculate_eligible_amount(10000, 75) == Decimal("8000.00")
    # Score 85+: 90%
    assert calculate_eligible_amount(10000, 85) == Decimal("9000.00")


def test_create_finance_request_invoice_backed(db):
    # Seed user and SME
    user = User(username="test_sme", email="sme@test.com", hashed_password="pw", role="sme")
    db.add(user)
    db.commit()

    sme = SME(name="Test SME", industry="Technology", revenue=Decimal("300000"), years_active=3, user_id=user.id)
    db.add(sme)
    db.commit()

    # Score SME (Score = 60 -> Review band)
    score = CreditScore(sme_id=sme.id, score=60.0)
    db.add(score)
    db.commit()

    # Add unpaid invoice
    invoice = Invoice(sme_id=sme.id, client_name="Client A", amount=Decimal("20000"), status="pending")
    db.add(invoice)
    db.commit()

    # Apply for invoice-backed finance (Request 14000 ZAR, which is exactly eligible amount 70% of 20000)
    req = create_finance_request(
        db=db,
        sme_id=sme.id,
        amount=14000,
        invoice_id=invoice.id,
        purpose_of_funding="Inventory",
    )

    assert req.request_type == "invoice_backed"
    assert req.invoice_id == invoice.id
    assert req.amount_requested == Decimal("14000")
    assert req.fee_rate == Decimal("0.05") # 5% for score 60
    assert req.status == "pending"
    assert req.credit_score_id == score.id


def test_create_finance_request_pre_invoice_no_score(db):
    user = User(username="test_sme", email="sme@test.com", hashed_password="pw", role="sme")
    db.add(user)
    db.commit()

    sme = SME(name="Test SME", industry="Technology", revenue=Decimal("300000"), years_active=3, user_id=user.id)
    db.add(sme)
    db.commit()

    # Try applying without a score
    with pytest.raises(ValueError, match="A credit score is required before applying for pre-invoice funding"):
        create_finance_request(
            db=db,
            sme_id=sme.id,
            amount=10000,
            invoice_id=None,
        )


def test_create_finance_request_pre_invoice_low_score(db):
    user = User(username="test_sme", email="sme@test.com", hashed_password="pw", role="sme")
    db.add(user)
    db.commit()

    sme = SME(name="Test SME", industry="Technology", revenue=Decimal("300000"), years_active=3, user_id=user.id)
    db.add(sme)
    db.commit()

    # Seed a low score (< 50)
    score = CreditScore(sme_id=sme.id, score=45.0)
    db.add(score)
    db.commit()

    # Try applying with a low score
    with pytest.raises(ValueError, match="does not meet the minimum threshold for pre-invoice funding"):
        create_finance_request(
            db=db,
            sme_id=sme.id,
            amount=10000,
            invoice_id=None,
        )


def test_create_finance_request_pre_invoice_success_and_capping(db):
    user = User(username="test_sme", email="sme@test.com", hashed_password="pw", role="sme")
    db.add(user)
    db.commit()

    sme = SME(name="Test SME", industry="Technology", revenue=Decimal("300000"), years_active=3, user_id=user.id)
    db.add(sme)
    db.commit()

    # Seed a good score (80 -> Eligible amount is 80% of requested amount, fee rate 2.5%)
    score = CreditScore(sme_id=sme.id, score=80.0)
    db.add(score)
    db.commit()

    # Request 10000 ZAR. Since 80 < 85, eligible is 80% (8000 ZAR).
    # Since requested (10000) > eligible (8000), it should be auto-capped to 8000 ZAR.
    req = create_finance_request(
        db=db,
        sme_id=sme.id,
        amount=10000,
        invoice_id=None,
        purpose_of_funding="Working Capital",
    )

    assert req.request_type == "pre_invoice"
    assert req.invoice_id is None
    assert req.amount_requested == Decimal("8000") # Auto-capped
    assert req.fee_rate == Decimal("0.025") # 2.5% for score 80
    assert req.status == "pending"
    assert req.credit_score_id == score.id
