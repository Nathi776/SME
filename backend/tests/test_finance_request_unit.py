import pytest
from decimal import Decimal
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from database import Base
from models import User, SME, Invoice, CreditScore, FinanceRequest, Verification, FounderProfile, Lender, SmeOutcome
from services.finance_service import (
    calculate_fee_rate,
    calculate_eligible_amount,
    create_finance_request,
)
from datetime import datetime, timedelta, timezone



# ── In-memory database ────────────────────────────────────────────────────────

engine = create_engine("sqlite:///:memory:")
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db():
    Base.metadata.create_all(bind=engine)
    db_session = TestingSessionLocal()
    try:
        yield db_session
    finally:
        db_session.close()
        Base.metadata.drop_all(bind=engine)


# ── Seed helpers ──────────────────────────────────────────────────────────────

def _seed_user_and_sme(
    db,
    revenue=Decimal("100000"),
    years_active=1,
    industry="Retail",
    province="Gauteng",
):
    """Create a test user and an SME linked to that user."""

    user = User(
        username=f"test_user_{id(db)}",
        email=f"test_user_{id(db)}@example.com",
        hashed_password="test_password",
        role="sme",
    )
    db.add(user)
    db.flush()

    sme = SME(
        name="Test SME",
        industry=industry,
        revenue=revenue,
        years_active=years_active,
        province=province,
        user_id=user.id,
    )
    db.add(sme)
    db.flush()

    return sme



def _add_verifications(db, sme, *doc_types):
    """Add verification documents that have been approved."""
    for doc_type in doc_types:
        verification = Verification(
            sme_id=sme.id,
            doc_type=doc_type,
            status="approved",
        )
        db.add(verification)

    db.flush()






def _add_paid_invoices(db, sme, count, amount=Decimal("10000")):
    """Add invoices paid on time to the SME."""
    now = datetime.now(timezone.utc)
    due_date = now - timedelta(days=10)
    paid_at = now - timedelta(days=15)

    for i in range(count):
        inv = Invoice(
            sme_id=sme.id,
            client_name=f"Client {i + 1}",
            amount=amount,
            status="paid",
            issue_date=now - timedelta(days=45),
            due_date=due_date,
            paid_at=paid_at,
        )
        db.add(inv)

    db.flush()



# ── Pure-function tests (no DB, no engine) ────────────────────────────────────

def test_calculate_fee_rate():
    # Score < 50  → 8%
    assert calculate_fee_rate(None) == Decimal("0.08")
    assert calculate_fee_rate(30)   == Decimal("0.08")
    assert calculate_fee_rate(49)   == Decimal("0.08")
    # Score 50–74 → 5%
    assert calculate_fee_rate(50)   == Decimal("0.05")
    assert calculate_fee_rate(60)   == Decimal("0.05")
    assert calculate_fee_rate(74)   == Decimal("0.05")
    # Score 75–84 → 2.5%
    assert calculate_fee_rate(75)   == Decimal("0.025")
    assert calculate_fee_rate(80)   == Decimal("0.025")
    assert calculate_fee_rate(84)   == Decimal("0.025")
    # Score 85+   → 1.5%
    assert calculate_fee_rate(85)   == Decimal("0.015")
    assert calculate_fee_rate(95)   == Decimal("0.015")


def test_calculate_eligible_amount():
    # Score < 50  → 60%
    assert calculate_eligible_amount(10000, None) == Decimal("6000.00")
    assert calculate_eligible_amount(10000, 30)   == Decimal("6000.00")
    # Score 50–74 → 70%
    assert calculate_eligible_amount(10000, 50)   == Decimal("7000.00")
    # Score 75–84 → 80%
    assert calculate_eligible_amount(10000, 75)   == Decimal("8000.00")
    # Score 85+   → 90%
    assert calculate_eligible_amount(10000, 85)   == Decimal("9000.00")


# ── Integration tests (live Assessment Engine) ────────────────────────────────
#
# The finance service calls score_sme(sme, db) internally — it ignores any
# legacy CreditScore rows and runs the live engine every time.
# Each test below seeds an SME whose evidence is calibrated to land in the
# score band the test is exercising.
#
# Score bands & expected live scores:
#
#   test_invoice_backed           → 50–74 band (fee 5%, eligible 70%)
#     Revenue R200k + all 4 compliance docs + 5 paid invoices
#     → GROWTH profile → score ≈ 60–62  ✅
#
#   test_pre_invoice_no_score     → score < 50 (Declined band)
#     Bare SME: no verifications, no invoices, R300k revenue, 3 years
#     → ESTABLISHED profile → score ≈ 40  ✅
#
#   test_pre_invoice_success_and_capping → 75–84 band (fee 2.5%, eligible 80%)
#     Revenue R350k + all 4 compliance docs + 10 paid invoices + Gauteng
#     → ESTABLISHED profile → score ≈ 76  ✅


def test_create_finance_request_invoice_backed(db):
    """
    Invoice-backed request: SME in Review band (score 50–74).
    Requested R12 000 against a R20 000 invoice.
    Eligible = 70% × R20 000 = R14 000 → request fits exactly.
    Expected fee rate: 5%.
    """
    # Seed an SME that the live engine will score in the 50–74 band.
    # Revenue=200k + 4 compliance docs + 5 paid invoices → GROWTH profile → ~60
    sme = _seed_user_and_sme(db, revenue=Decimal("200000"), years_active=1)
    _add_verifications(db, sme, "cipc", "tax_clearance", "bank_statement", "registration_docs")
    _add_paid_invoices(db, sme, count=5)
    db.commit()

    # Add the invoice to finance
    invoice = Invoice(
        sme_id=sme.id,
        client_name="Client A",
        amount=Decimal("20000"),
        status="pending",
    )
    db.add(invoice)
    db.commit()

    req = create_finance_request(
        db=db,
        sme_id=sme.id,
        amount=Decimal("14000"),
        invoice_id=invoice.id,
        purpose_of_funding="Inventory",
    )

    # Live score ≈ 60 → 50–74 band
    live_score = int(req.fee_rate == Decimal("0.05"))  # True only if score is 50–74
    assert req.request_type   == "invoice_backed"
    assert req.invoice_id     == invoice.id
    assert req.amount_requested == Decimal("14000")
    assert req.fee_rate       == Decimal("0.05"),   \
        f"Expected 5% fee (score 50–74), got {req.fee_rate}. " \
        f"Check seed data — live engine may have scored outside 50–74 band."
    assert req.status         == "pending"
    assert req.assessment_snapshot_id is not None


def test_create_finance_request_pre_invoice_no_score(db):
    """
    Pre-invoice request with no verifications.
    Bare SME scores below 50 → Declined band → engine raises ValueError.
    Error message must mention the live score and the threshold.
    """
    # Bare SME: no compliance docs, no invoices → ~40 (Declined)
    sme = _seed_user_and_sme(db, revenue=Decimal("300000"), years_active=3)
    db.commit()

    with pytest.raises(ValueError, match="does not meet the minimum threshold"):
        create_finance_request(
            db=db,
            sme_id=sme.id,
            amount=Decimal("10000"),
            invoice_id=None,
        )


def test_create_finance_request_pre_invoice_low_score(db):
    """
    Pre-invoice request with some verifications but score still < 50.
    Only CIPC — not enough to pass the threshold.
    """
    sme = _seed_user_and_sme(db, revenue=Decimal("100000"), years_active=1)
    _add_verifications(db, sme, "cipc")
    db.commit()

    with pytest.raises(ValueError, match="does not meet the minimum threshold"):
        create_finance_request(
            db=db,
            sme_id=sme.id,
            amount=Decimal("10000"),
            invoice_id=None,
        )


def test_create_finance_request_pre_invoice_success_and_capping(db):
    """
    Pre-invoice request: SME in 75–84 band (score ≈ 76).
    Request R10 000. Eligible = 80% × R10 000 = R8 000.
    Since requested > eligible, amount is auto-capped to R8 000.
    Expected fee rate: 2.5%.
    """
    # Revenue=350k + 4 compliance docs + 10 paid invoices + Gauteng → ~76
    sme = _seed_user_and_sme(
        db,
        revenue=Decimal("350000"),
        years_active=3,
        province="Gauteng",
    )
    _add_verifications(
        db,
        sme,
        "cipc",
        "tax_clearance",
        "bank_statement",
        "registration_docs",
    )

    db.add(
        Verification(
            sme_id=sme.id,
            doc_type="letter_of_intent",
            status="approved",
            loi_counterparty_known=True,
        )
    )

    _add_paid_invoices(db, sme, count=10)
    db.commit()


 

    req = create_finance_request(
        db=db,
        sme_id=sme.id,
        amount=Decimal("10000"),
        invoice_id=None,
        purpose_of_funding="Working Capital",
    )

    assert req.request_type     == "pre_invoice"
    assert req.invoice_id       is None
    assert req.amount_requested == Decimal("8000"), \
        f"Expected auto-cap to R8 000 (80% of R10 000 for score 75–84), got {req.amount_requested}. " \
        f"Live engine may have scored outside 75–84 band."
    assert req.fee_rate         == Decimal("0.025"), \
        f"Expected 2.5% fee (score 75–84), got {req.fee_rate}."
    assert req.status           == "pending"
    assert req.assessment_snapshot_id is not None