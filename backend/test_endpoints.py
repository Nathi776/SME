import requests

BASE_URL = "http://127.0.0.1:8000"

# -------------------------------
# 1️⃣ Register a new user
# -------------------------------
def test_register():
    url = f"{BASE_URL}/auth/register"
    payload = {
        "username": "testuser",
        "email": "testuser@example.com",
        "password": "Test@123"
    }
    response = requests.post(url, json=payload)
    print("REGISTER:", response.status_code, response.json())

# -------------------------------
# 2️⃣ Login user to get token
# -------------------------------
def test_login():
    url = f"{BASE_URL}/auth/login"
    payload = {
        "username": "testuser",
        "password": "Test@123"
    }
    response = requests.post(url, json=payload)
    print("LOGIN:", response.status_code, response.json())
    if response.status_code == 200:
        return response.json().get("access_token")
    return None

# -------------------------------
# 3️⃣ Add SME Profile
# -------------------------------
def test_add_sme(token):
    url = f"{BASE_URL}/sme/create"
    payload = {
        "name": "TechGrow SME",
        "revenue": 500000,
        "years_active": 5
    }
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.post(url, params=payload, headers=headers)
    print("ADD SME:", response.status_code, response.json())

# -------------------------------
# 4️⃣ Upload Invoice
# -------------------------------
def test_upload_invoice(token):
    url = f"{BASE_URL}/invoices/upload"
    payload = {
        "sme_id": 1,
        "amount": 10000,
        "due_days": 30
    }
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.post(url, params=payload, headers=headers)
    print("UPLOAD INVOICE:", response.status_code, response.json())

# -------------------------------
# 5️⃣ Predict Credit Score (ML)
# -------------------------------
def test_credit_score(token):
    url = f"{BASE_URL}/credit-score/calculate"
    payload = {
        "sme_id": 1,
        "revenue": 500000,
        "late_payments": 2,
        "years_active": 5
    }
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.post(url, params=payload, headers=headers)
    print("CREDIT SCORE:", response.status_code, response.json())

# -------------------------------
# 6️⃣ Request Financing
# -------------------------------
def test_finance_request(token):
    url = f"{BASE_URL}/finance/apply"
    payload = {
        "sme_id": 1,
        "amount": 20000,
        "purpose": "Purchase new equipment"
    }
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.post(url, params=payload, headers=headers)
    print("FINANCE REQUEST:", response.status_code, response.json())

# -------------------------------
# Run all tests in order
# -------------------------------
if __name__ == "__main__":
    test_register()
    token = test_login()
    if token:
        print(f"\n✅ Logged in successfully! Token acquired.\n")
        test_add_sme(token)
        test_upload_invoice(token)
        test_credit_score(token)
        test_finance_request(token)
    else:
        print("❌ Login failed, skipping SME/invoice/finance tests.")
