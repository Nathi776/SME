import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from database import Base, get_db
from main import app
from limiter import limiter
from models.user import User
from models.sme import SME
from models.credit_score import CreditScore
from models.founder_profile import FounderProfile
from models.sme_outcome import SmeOutcome
from models.finance_request import FinanceRequest
from models.lender import Lender
import uuid
import os

# Disable rate limiting for tests
limiter.enabled = False

TEST_DB_FILE = "test_intel_tmp.db"
TEST_DB_URL = f"sqlite:///./{TEST_DB_FILE}"
engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

@pytest.fixture(scope="module", autouse=True)
def setup_db():
    if os.path.exists(TEST_DB_FILE):
        try:
            os.remove(TEST_DB_FILE)
        except Exception:
            pass
    Base.metadata.create_all(bind=engine)
    app.dependency_overrides[get_db] = override_get_db
    yield
    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=engine)
    if os.path.exists(TEST_DB_FILE):
        try:
            os.remove(TEST_DB_FILE)
        except Exception:
            pass

client = TestClient(app)

def test_public_business_assessment():
    res = client.get("/public/business-assessment?industry=Technology&province=Gauteng")
    assert res.status_code == 200
    data = res.json()
    assert data["industry"] == "Technology"
    assert data["province"] == "Gauteng"
    assert "viability_score" in data
    assert "viability_label" in data
    assert "top_risks" in data
    assert "encouragements" in data

    res = client.get("/public/business-assessment?industry=Food%20%26%20Beverage&province=Limpopo")
    assert res.status_code == 200
    data = res.json()
    assert data["viability_label"] == "Challenging — proceed carefully"

def test_lender_intelligence_endpoints():
    # 1. Register a lender user via API
    unique = uuid.uuid4().hex[:6]
    lender_username = f"lender_{unique}"
    lender_email = f"lender_{unique}@example.com"
    lender_pass = "Password123"

    reg_res = client.post("/auth/register", json={
        "username": lender_username,
        "email": lender_email,
        "password": lender_pass,
        "role": "lender"
    })
    assert reg_res.status_code in {200, 201}

    # Retrieve created user id from DB
    db = TestingSessionLocal()
    user = db.query(User).filter(User.username == lender_username).first()
    assert user is not None
    assert user.role == "lender"

    # Create Lender profile
    lender = Lender(
        user_id=user.id,
        organization_name="Test Lending Corp",
        contact_email="contact@testlending.com",
        max_lending_amount=1000000.0,
        min_credit_score=50
    )
    db.add(lender)
    db.commit()

    # Create an SME
    sme = SME(
        name="Test Tech Inc",
        industry="Technology",
        province="Gauteng",
        revenue=120000.0,
        years_active=2,
        user_id=user.id
    )
    db.add(sme)
    db.commit()

    # Add CreditScore for SME
    score = CreditScore(
        sme_id=sme.id,
        score=65.5
    )
    db.add(score)
    db.commit()

    # Add Founder Profile
    fp = FounderProfile(
        sme_id=sme.id,
        years_industry_experience=4,
        highest_qualification="degree",
        prior_business_owner=True,
        trade_association_name="SACCI",
        reference_name="John Ref"
    )
    db.add(fp)
    db.commit()

    # Add Finance Request
    req = FinanceRequest(
        amount_requested=100000.00,
        approved_amount=80000.00,
        platform_fee=2400.00,
        status="funded",
        sme_id=sme.id
    )
    db.add(req)
    db.commit()

    # Add SmeOutcome
    outcome = SmeOutcome(
        finance_request_id=req.id,
        sme_id=sme.id,
        score_at_funding=65.5,
        amount=80000.00,
        outcome_status="repaid"
    )
    db.add(outcome)
    db.commit()
    
    sme_id = sme.id
    db.close()

    # Login via API
    login_res = client.post("/auth/login", json={
        "username": lender_username,
        "password": lender_pass
    })
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Test GET /lenders/portfolio-analytics
    analytics_res = client.get("/lenders/portfolio-analytics", headers=headers)
    assert analytics_res.status_code == 200
    analytics_data = analytics_res.json()
    assert analytics_data["applications"]["total"] == 1
    assert analytics_data["applications"]["funded"] == 1
    assert analytics_data["financials"]["total_financed"] == 80000.00
    assert analytics_data["financials"]["total_fees"] == 2400.00
    assert analytics_data["scores"]["average"] == 65.5
    assert analytics_data["scores"]["distribution"]["Review (50-74)"] == 1
    assert analytics_data["outcomes"]["repayment_rate"] == 100.0

    # Test GET /lenders/sme-intelligence/{sme_id}
    intel_res = client.get(f"/lenders/sme-intelligence/{sme_id}", headers=headers)
    assert intel_res.status_code == 200
    intel_data = intel_res.json()
    assert intel_data["sme"]["name"] == "Test Tech Inc"
    assert intel_data["sme"]["cipc_verified"] is False
    assert intel_data["score"]["current"] == 44.7
    assert intel_data["founder"]["years_experience"] == 4
    assert intel_data["founder"]["highest_qualification"] == "degree"
    assert len(intel_data["recommendations"]["top_3_actions"]) > 0
    assert intel_data["score_history"][0]["score"] == 65.5
    assert len(intel_data["outcomes"]) == 1
