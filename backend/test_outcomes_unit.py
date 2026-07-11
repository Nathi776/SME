import pytest
from decimal import Decimal
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from database import Base
from models import (
    User,
    SME,
    Invoice,
    CreditScore,
    FinanceRequest,
    Verification,
    FounderProfile,
    Lender,
    SmeOutcome,
)
from services.finance_service import create_finance_request, approve_finance_request, mark_finance_request_funded
from services.outcome_service import create_outcome, update_checkin, compute_followed_recommendations
from services.scoring_service import score_sme

# Set up in-memory database for testing
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


def test_outcome_tracking_flow(db):
    # 1. Seed user and SME
    user = User(username="test_sme", email="sme@test.com", hashed_password="pw", role="sme")
    db.add(user)
    db.commit()

    sme = SME(
        name="Test SME",
        industry="Technology",
        revenue=Decimal("300000"),
        years_active=3,
        user_id=user.id,
    )
    db.add(sme)
    db.commit()

    # Seed a credit score (e.g. 60)
    score = CreditScore(sme_id=sme.id, score=60.0)
    db.add(score)
    db.commit()

    # Add unpaid invoice
    invoice = Invoice(
        sme_id=sme.id, client_name="Client A", amount=Decimal("20000"), status="pending"
    )
    db.add(invoice)
    db.commit()

    # Apply for finance
    req = create_finance_request(
        db=db,
        sme_id=sme.id,
        amount=14000,
        invoice_id=invoice.id,
    )
    assert req.status == "pending"

    # Add a lender and approve
    lender_user = User(
        username="lender", email="lender@test.com", hashed_password="pw", role="lender"
    )
    db.add(lender_user)
    db.commit()
    lender = Lender(
        user_id=lender_user.id,
        organization_name="Lender Org",
        contact_email="lender@test.com",
        max_lending_amount=100000,
    )
    db.add(lender)
    db.commit()

    req = approve_finance_request(db, req.id, lender.id, 14000)
    assert req.status == "approved"

    # Funding request should trigger outcome creation
    req = mark_finance_request_funded(db, req.id)
    assert req.status == "funded"

    # Check SmeOutcome created
    outcome = db.query(SmeOutcome).filter(SmeOutcome.finance_request_id == req.id).first()
    assert outcome is not None
    assert outcome.outcome_status == "pending"
    assert outcome.check_in_90_due_at is not None
    assert outcome.check_in_180_due_at is not None
    assert outcome.check_in_365_due_at is not None
    
    # Calculate score live to check snapshot correctness
    expected_score = score_sme(sme, db).score
    assert outcome.score_at_funding == expected_score
    assert outcome.amount == Decimal("14000")
    assert len(outcome.outstanding_recommendations) > 0

    # Ensure cipc and bank_statement are in outstanding recommendations
    doc_types = [r.get("doc_type") for r in outcome.outstanding_recommendations]
    assert "cipc" in doc_types
    assert "bank_statement" in doc_types

    # Ensure outcomes relationship is accessible on SME and FinanceRequest
    assert len(sme.outcomes) == 1
    assert req.outcome == outcome

    # Test followed recommendations: initially nothing is followed
    followed_init = compute_followed_recommendations(db, outcome)
    assert len(followed_init) == len(outcome.outstanding_recommendations)
    for r in followed_init:
        assert r["followed"] is False

    # Upload and verify CIPC document (i.e. follow the CIPC recommendation)
    sme.cipc_registration_number = "123/456"
    sme.cipc_company_name = "Tech Corp"
    sme.cipc_status = "In Business"
    # Also add a verification record to simulate verification process
    ver = Verification(sme_id=sme.id, doc_type="cipc", status="approved")
    db.add(ver)
    db.commit()

    # Now compute followed recommendations: cipc should be followed!
    followed_after = compute_followed_recommendations(db, outcome)
    cipc_rec = next(r for r in followed_after if r["doc_type"] == "cipc")
    assert cipc_rec["followed"] is True

    # Bank statement (since we haven't uploaded it) should still be False
    bs_rec = next(r for r in followed_after if r["doc_type"] == "bank_statement")
    assert bs_rec["followed"] is False

    # Test check-in submissions
    updated_90 = update_checkin(db, outcome.id, 90, True, 320000, False)
    assert updated_90.checkin_90_completed is True
    assert updated_90.checkin_90_still_operating is True
    assert updated_90.checkin_90_revenue == Decimal("320000")
    assert updated_90.checkin_90_loan_repaid is False
    assert updated_90.outcome_status == "active"

    # Test status change to active (still not repaid) on check-in 180
    updated_180 = update_checkin(db, outcome.id, 180, True, 350000, False)
    assert updated_180.outcome_status == "active"

    # Test status change to repaid on check-in 365
    updated_365 = update_checkin(db, outcome.id, 365, True, 400000, True)
    assert updated_365.outcome_status == "repaid"

    # Invalid check-in interval should raise exception
    with pytest.raises(ValueError, match="Invalid check-in interval"):
        update_checkin(db, outcome.id, 100, True, 320000, False)


def test_analytics_calculation(db):
    # Setup multiple outcomes with different statuses, sectors, and provinces
    user1 = User(username="sme_opt", email="sme1@test.com", hashed_password="pw", role="sme")
    user2 = User(username="sme_farm", email="sme2@test.com", hashed_password="pw", role="sme")
    db.add_all([user1, user2])
    db.commit()

    sme1 = SME(name="Tech SME", industry="Technology", province="Gauteng", revenue=Decimal("300000"), user_id=user1.id)
    sme2 = SME(name="Agri SME", industry="Agriculture", province="Limpopo", revenue=Decimal("150000"), user_id=user2.id)
    db.add_all([sme1, sme2])
    db.commit()

    # Credit scores
    cs1 = CreditScore(sme_id=sme1.id, score=70.0)
    cs2 = CreditScore(sme_id=sme2.id, score=80.0)
    db.add_all([cs1, cs2])
    db.commit()

    # Invoices
    inv1 = Invoice(sme_id=sme1.id, client_name="Client1", amount=Decimal("20000"), status="pending")
    inv2 = Invoice(sme_id=sme2.id, client_name="Client2", amount=Decimal("15000"), status="pending")
    db.add_all([inv1, inv2])
    db.commit()

    # Requests
    req1 = create_finance_request(db, sme_id=sme1.id, amount=10000, invoice_id=inv1.id)
    req2 = create_finance_request(db, sme_id=sme2.id, amount=10000, invoice_id=inv2.id)
    db.commit()

    # Lender
    lender_user = User(username="lender2", email="lender2@test.com", hashed_password="pw", role="lender")
    db.add(lender_user)
    db.commit()
    lender = Lender(user_id=lender_user.id, organization_name="Lender2", contact_email="lender2@test.com", max_lending_amount=100000)
    db.add(lender)
    db.commit()

    req1 = approve_finance_request(db, req1.id, lender.id, 10000)
    req2 = approve_finance_request(db, req2.id, lender.id, 10000)
    db.commit()

    req1 = mark_finance_request_funded(db, req1.id)
    req2 = mark_finance_request_funded(db, req2.id)
    db.commit()

    # Check outcomes
    o1 = db.query(SmeOutcome).filter(SmeOutcome.finance_request_id == req1.id).first()
    o2 = db.query(SmeOutcome).filter(SmeOutcome.finance_request_id == req2.id).first()
    assert o1 is not None
    assert o2 is not None

    # Update one to repaid, one to defaulted
    o1 = update_checkin(db, o1.id, 90, True, 320000, True)
    o2 = update_checkin(db, o2.id, 90, False, 10000, False)

    assert o1.outcome_status == "repaid"
    assert o2.outcome_status == "defaulted"

