import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from database import Base, get_db
from main import app
from limiter import limiter
from models.user import User
from models.sme import SME
from models.invoice import Invoice
from models.credit_score import CreditScore
from models.finance_request import FinanceRequest
from models.verification import Verification
from models.lender import Lender
import uuid

# Disable rate limiting for tests
limiter.enabled = False

import os

# Set up clean temporary database file for API tests
TEST_DB_FILE = "test_api_tmp.db"
TEST_DB_URL = f"sqlite:///./{TEST_DB_FILE}"
engine = create_engine(TEST_DB_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="module", autouse=True)
def setup_db():
    # Remove existing DB file if any
    if os.path.exists(TEST_DB_FILE):
        try:
            os.remove(TEST_DB_FILE)
        except Exception:
            pass
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)
    if os.path.exists(TEST_DB_FILE):
        try:
            os.remove(TEST_DB_FILE)
        except Exception:
            pass

# Override get_db dependency
def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)


def test_auth_and_sme_flow():
    # 1. Register User (SME)
    unique_suffix = uuid.uuid4().hex[:6]
    sme_username = f"sme_{unique_suffix}"
    sme_email = f"sme_{unique_suffix}@test.com"
    
    reg_response = client.post("/auth/register", json={
        "username": sme_username,
        "email": sme_email,
        "password": "Password123",
        "role": "sme"
    })
    assert reg_response.status_code in {200, 201}
    
    # 2. Login User (SME)
    login_response = client.post("/auth/login", json={
        "username": sme_username,
        "password": "Password123"
    })
    assert login_response.status_code == 200
    token = login_response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 3. Create SME Profile
    profile_response = client.post("/smes/", json={
        "name": "Test Company",
        "industry": "Technology",
        "revenue": 600000.0,
        "years_active": 5
    }, headers=headers)
    assert profile_response.status_code == 200
    sme_id = profile_response.json()["id"]
    
    # 4. Create Invoice
    invoice_response = client.post("/invoices/", json={
        "client_name": "Client X",
        "amount": 50000.0,
        "description": "Software services"
    }, headers=headers)
    assert invoice_response.status_code == 200
    invoice_id = invoice_response.json()["invoice"]["id"]

    # 5. Calculate Credit Score (scoring calculation test)
    score_response = client.post(f"/credit-scores/calculate/{sme_id}", headers=headers)
    assert score_response.status_code == 200
    score_data = score_response.json()
    assert "score" in score_data
    score_value = score_data["score"]

    # 6. Apply for Finance: Invoice-backed path
    # Calculate expected max eligible amount based on score
    # Score 0-50: 60%, 50-75: 70%, 75-85: 80%, 85+: 90%
    if score_value < 50:
        max_eligible = 50000.0 * 0.6
    elif score_value < 75:
        max_eligible = 50000.0 * 0.7
    elif score_value < 85:
        max_eligible = 50000.0 * 0.8
    else:
        max_eligible = 50000.0 * 0.9

    finance_response = client.post("/finance/apply", json={
        "invoice_id": invoice_id,
        "amount": max_eligible,
        "purpose_of_funding": "Inventory acquisition"
    }, headers=headers)
    assert finance_response.status_code == 200
    assert finance_response.json()["status"] == "pending"

    # 7. Apply for Finance: Pre-invoice path (Requires score >= 50)
    if score_value >= 50:
        pre_invoice_response = client.post("/finance/apply", json={
            "invoice_id": None,
            "amount": 10000.0,
            "purpose_of_funding": "Pre-invoice operations"
        }, headers=headers)
        assert pre_invoice_response.status_code == 200
        assert pre_invoice_response.json()["status"] == "pending"
    else:
        # Should raise error for low credit score
        pre_invoice_response = client.post("/finance/apply", json={
            "invoice_id": None,
            "amount": 10000.0,
            "purpose_of_funding": "Pre-invoice operations"
        }, headers=headers)
        assert pre_invoice_response.status_code == 400

    # 8. Upload Verification Document (multipart upload)
    upload_file_content = b"PDF mock content for CIPC document"
    upload_response = client.post(
        "/verifications/submit",
        data={"doc_type": "cipc"},
        files={"file": ("cipc.pdf", upload_file_content, "application/pdf")},
        headers=headers
    )
    assert upload_response.status_code == 200
    assert upload_response.json()["status"] == "pending"
    assert upload_response.json()["doc_type"] == "cipc"
