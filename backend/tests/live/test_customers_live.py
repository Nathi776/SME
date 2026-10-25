import uuid
import sys
from pathlib import Path
import pytest
import requests

sys.path.insert(0, str(Path(__file__).resolve().parent))

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


def test_get_customers_api(token, sme_id):
    headers = {"Authorization": f"Bearer {token}"}
    
    # Call customer endpoint
    res = requests.get(f"{BASE_URL}/customers/", headers=headers)
    assert res.status_code == 200
    data = res.json()
    
    assert "stats" in data
    assert "customers" in data
    
    stats = data["stats"]
    assert stats["total_customers"] == 32
    assert stats["active_customers"] == 26
    assert float(stats["outstanding_amount"]) == 420000.00
    assert stats["avg_payment_days"] == 28
    
    customers = data["customers"]
    assert len(customers) >= 32
    
    # Check one of the primary seeded customers
    abc_cust = next((c for c in customers if "ABC Manufacturing" in c["company_name"]), None)
    assert abc_cust is not None
    assert abc_cust["contact_person"] == "John Smith"
    assert abc_cust["email"] == "john@abc.co.za"
    assert abc_cust["industry"] == "Manufacturing"
    assert abc_cust["risk_level"] == "Low Risk"
    assert abc_cust["invoices_count"] == 8
    assert len(abc_cust["invoices"]) == 8

def test_update_customer_api(token, sme_id):
    headers = {"Authorization": f"Bearer {token}"}
    
    # Modify customer contact information
    update_payload = {
        "contact_person": "Johnathan Smith",
        "phone": "+27 82 000 9999",
        "email": "john.new@abc.co.za"
    }
    
    res = requests.put(f"{BASE_URL}/customers/ABC Manufacturing (Pty) Ltd", json=update_payload, headers=headers)
    assert res.status_code == 200
    
    # Get customers list and verify the change
    res2 = requests.get(f"{BASE_URL}/customers/", headers=headers)
    assert res2.status_code == 200
    customers = res2.json()["customers"]
    
    abc_cust = next((c for c in customers if "ABC Manufacturing" in c["company_name"]), None)
    assert abc_cust is not None
    assert abc_cust["contact_person"] == "Johnathan Smith"
    assert abc_cust["phone"] == "+27 82 000 9999"
    assert abc_cust["email"] == "john.new@abc.co.za"
