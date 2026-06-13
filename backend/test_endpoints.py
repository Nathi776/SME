import uuid
import sys
from pathlib import Path

import pytest
import requests

sys.path.insert(0, str(Path(__file__).resolve().parent))

from database import SessionLocal
from models.user import User
from models.sme import SME
from models.lender import Lender
from models.invoice import Invoice
from models.credit_score import CreditScore
from models.finance_request import FinanceRequest
from models.verification import Verification
from services.auth_service import hash_password

BASE_URL = "http://127.0.0.1:8000"


@pytest.fixture(scope="module")
def token():
    """Register a new unique test user and return an auth token."""
    unique = uuid.uuid4().hex[:8]
    username = f"testuser_{unique}"
    email = f"{username}@example.com"
    password = "Test@123"

    # Register
    reg = requests.post(f"{BASE_URL}/auth/register", json={
        "username": username,
        "email": email,
        "password": password,
        "role": "sme",
    })
    assert reg.status_code in {200, 201}

    # Login
    login = requests.post(f"{BASE_URL}/auth/login", json={
        "username": username,
        "password": password,
    })
    assert login.status_code == 200
    data = login.json()
    assert "access_token" in data
    return data["access_token"]


@pytest.fixture(scope="module")
def sme_id(token):
    headers = {"Authorization": f"Bearer {token}"}
    payload = {"name": "TechGrow SME", "industry": "Tech", "revenue": 500000, "years_active": 5}
    res = requests.post(f"{BASE_URL}/smes/", json=payload, headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "id" in data
    return data["id"]


@pytest.fixture(scope="module")
def invoice_id(token, sme_id):
    headers = {"Authorization": f"Bearer {token}"}
    payload = {"client_name": "Client A", "description": "Services rendered", "amount": 10000}
    res = requests.post(f"{BASE_URL}/invoices/", json=payload, headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "invoice" in data and "id" in data["invoice"]
    return data["invoice"]["id"]


@pytest.fixture(scope="module")
def lender_token():
    unique = uuid.uuid4().hex[:8]
    username = f"lender_{unique}"
    email = f"{username}@example.com"
    password = "Test@123"

    reg = requests.post(f"{BASE_URL}/auth/register", json={
        "username": username,
        "email": email,
        "password": password,
        "role": "lender",
    })
    assert reg.status_code in {200, 201}

    login = requests.post(f"{BASE_URL}/auth/login", json={
        "username": username,
        "password": password,
    })
    assert login.status_code == 200
    token = login.json()["access_token"]

    headers = {"Authorization": f"Bearer {token}"}
    profile = {
        "organization_name": "Test Capital",
        "contact_email": email,
        "phone": "0123456789",
        "max_lending_amount": 1000000,
        "min_credit_score": 50,
    }
    lender_res = requests.post(f"{BASE_URL}/lenders/register", json=profile, headers=headers)
    assert lender_res.status_code == 200

    return token


@pytest.fixture(scope="module")
def admin_token():
    unique = uuid.uuid4().hex[:8]
    username = f"admin_{unique}"
    email = f"{username}@example.com"
    password = "Test@123"

    db = SessionLocal()
    try:
        user = User(username=username, email=email, hashed_password=hash_password(password), role="admin")
        db.add(user)
        db.commit()
        db.refresh(user)
    finally:
        db.close()

    login = requests.post(f"{BASE_URL}/auth/login", json={
        "username": username,
        "password": password,
    })
    assert login.status_code == 200
    return login.json()["access_token"]


def test_credit_score_generation(sme_id, token):
    headers = {"Authorization": f"Bearer {token}"}
    res = requests.post(f"{BASE_URL}/credit-scores/calculate/{sme_id}", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "score" in data


def test_credit_score_history_and_latest(sme_id, token):
    headers = {"Authorization": f"Bearer {token}"}
    history = requests.get(f"{BASE_URL}/credit-scores/history/{sme_id}", headers=headers)
    assert history.status_code == 200
    history_data = history.json()
    assert isinstance(history_data, list)
    assert len(history_data) >= 1

    latest = requests.get(f"{BASE_URL}/credit-scores/latest/{sme_id}", headers=headers)
    assert latest.status_code == 200
    latest_data = latest.json()
    assert latest_data["sme_id"] == sme_id
    assert "latest_score" in latest_data


def test_credit_score_details_endpoint(sme_id, token):
    headers = {"Authorization": f"Bearer {token}"}
    res = requests.get(f"{BASE_URL}/credit-scores/details/{sme_id}", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "score" in data
    assert "breakdown" in data
    assert isinstance(data["breakdown"], dict)


def test_verification_submission_and_admin_review(token, lender_token, admin_token):
    sme_headers = {"Authorization": f"Bearer {token}"}
    lender_headers = {"Authorization": f"Bearer {lender_token}"}
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    sme_submit = requests.post(f"{BASE_URL}/verifications/submit", json={
        "doc_type": "cipc",
        "document_url": "https://example.com/cipc.pdf",
    }, headers=sme_headers)
    assert sme_submit.status_code == 200
    sme_verification = sme_submit.json()
    assert sme_verification["status"] == "pending"
    assert sme_verification["sme_id"] is not None

    lender_submit = requests.post(f"{BASE_URL}/verifications/submit", json={
        "doc_type": "financial_license",
        "document_url": "https://example.com/license.pdf",
    }, headers=lender_headers)
    assert lender_submit.status_code == 200
    lender_verification = lender_submit.json()
    assert lender_verification["status"] == "pending"
    assert lender_verification["lender_id"] is not None

    my_sme = requests.get(f"{BASE_URL}/verifications/my", headers=sme_headers)
    assert my_sme.status_code == 200
    assert any(item["id"] == sme_verification["id"] for item in my_sme.json())

    my_lender = requests.get(f"{BASE_URL}/verifications/my", headers=lender_headers)
    assert my_lender.status_code == 200
    assert any(item["id"] == lender_verification["id"] for item in my_lender.json())

    pending = requests.get(f"{BASE_URL}/verifications/pending", headers=admin_headers)
    assert pending.status_code == 200
    pending_items = pending.json()
    pending_ids = {item["id"] for item in pending_items}
    assert sme_verification["id"] in pending_ids
    assert lender_verification["id"] in pending_ids

    approved = requests.put(
        f"{BASE_URL}/verifications/approve/{sme_verification['id']}",
        json={"reviewer_notes": "Looks good"},
        headers=admin_headers,
    )
    assert approved.status_code == 200
    assert approved.json()["status"] == "approved"

    rejected = requests.put(
        f"{BASE_URL}/verifications/reject/{lender_verification['id']}",
        json={"reviewer_notes": "Missing page 2"},
        headers=admin_headers,
    )
    assert rejected.status_code == 200
    assert rejected.json()["status"] == "rejected"


def test_finance_request_apply(token, invoice_id):
    headers = {"Authorization": f"Bearer {token}"}
    payload = {"invoice_id": invoice_id, "amount": 5000}
    res = requests.post(f"{BASE_URL}/finance/apply", json=payload, headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "request_id" in data
    assert data.get("status") in {"pending", "approved", "funded", "paid", "closed", "completed", "rejected"}


def test_finance_request_repayment_lifecycle(token, lender_token):
    sme_headers = {"Authorization": f"Bearer {token}"}
    lender_headers = {"Authorization": f"Bearer {lender_token}"}

    invoice_res = requests.post(
        f"{BASE_URL}/invoices/",
        json={"client_name": "Lifecycle Client", "description": "Lifecycle test", "amount": 12000},
        headers=sme_headers,
    )
    assert invoice_res.status_code == 200
    invoice = invoice_res.json()["invoice"]
    invoice_id = invoice["id"]

    apply_res = requests.post(
        f"{BASE_URL}/finance/apply",
        json={"invoice_id": invoice_id, "amount": 6000},
        headers=sme_headers,
    )
    assert apply_res.status_code == 200
    request_id = apply_res.json()["request_id"]

    approve_res = requests.put(
        f"{BASE_URL}/finance/approve/{request_id}",
        json={"approved_amount": 5500},
        headers=lender_headers,
    )
    assert approve_res.status_code == 200
    assert approve_res.json()["status"] == "approved"

    funded_res = requests.put(f"{BASE_URL}/finance/funded/{request_id}", headers=lender_headers)
    assert funded_res.status_code == 200
    assert funded_res.json()["status"] == "funded"

    paid_invoice_res = requests.put(f"{BASE_URL}/invoices/{invoice_id}/paid", headers=sme_headers)
    assert paid_invoice_res.status_code == 200

    invoice_list_res = requests.get(f"{BASE_URL}/invoices/", headers=sme_headers)
    assert invoice_list_res.status_code == 200
    paid_invoice = next(item for item in invoice_list_res.json() if item["id"] == invoice_id)
    assert paid_invoice["status"] == "paid"

    reqs_res = requests.get(f"{BASE_URL}/finance/requests/{invoice['sme_id']}", headers=sme_headers)
    assert reqs_res.status_code == 200
    req_after_payment = next(item for item in reqs_res.json() if item["id"] == request_id)
    assert req_after_payment["status"] == "paid"

    closed_res = requests.put(f"{BASE_URL}/finance/closed/{request_id}", headers=lender_headers)
    assert closed_res.status_code == 200
    assert closed_res.json()["status"] == "closed"

