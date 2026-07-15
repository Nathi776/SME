import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import sys
from pathlib import Path

# Add backend directory to path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from database import Base, get_db
from main import app
from models.user import User
from models.sme import SME
from models.api_key import APIKey
from services.auth_service import hash_password

# Setup Test Database (local SQLite for unit tests)
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_api_v1.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(scope="module", autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    
    # Create test users
    admin = User(username="admin_test", email="admin_test@example.com", hashed_password=hash_password("AdminPass123"), role="admin")
    sme_user = User(username="sme_test", email="sme_test@example.com", hashed_password=hash_password("SmePass123"), role="sme")
    db.add(admin)
    db.add(sme_user)
    db.commit()
    
    # Create SME profile
    sme = SME(
        name="Thabo Nkosi Engineering (Pty) Ltd",
        industry="Manufacturing",
        revenue=300000,
        years_active=3,
        province="KwaZulu-Natal",
        cipc_registration_number="2019/045321/07",
        user_id=sme_user.id
    )
    db.add(sme)
    db.commit()
    
    db.close()
    yield
    Base.metadata.drop_all(bind=engine)

client = TestClient(app)

def test_api_keys_workflow():
    # 1. Login as admin to generate JWT token
    login_res = client.post("/auth/login", json={
        "email": "admin_test@example.com",
        "password": "AdminPass123"
    })
    assert login_res.status_code == 200
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Generate API Key
    gen_res = client.post("/api/v1/keys/generate", json={
        "name": "Nedbank Integration",
        "consumer_type": "lender"
    }, headers=headers)
    assert gen_res.status_code == 200
    data = gen_res.json()
    assert "api_key" in data
    raw_key = data["api_key"]
    assert data["name"] == "Nedbank Integration"
    assert data["consumer_type"] == "lender"

    # 3. Retrieve all API keys via admin list route
    list_res = client.get("/admin/api-keys", headers=headers)
    assert list_res.status_code == 200
    keys_list = list_res.json()
    assert len(keys_list) >= 1
    generated_key = next(k for k in keys_list if k["name"] == "Nedbank Integration")
    assert generated_key["is_active"] is True
    assert generated_key["consumer_type"] == "lender"

    # 4. Use API Key to fetch SME score
    api_headers = {"X-API-Key": raw_key}
    score_res = client.get("/api/v1/sme/2019/045321/07/score", headers=api_headers)
    assert score_res.status_code == 200
    score_data = score_res.json()
    assert score_data["registration_number"] == "2019/045321/07"
    assert score_data["company_name"] == "Thabo Nkosi Engineering (Pty) Ltd"
    assert "score" in score_data
    assert "decision" in score_data

    # 5. Use API Key to query market viability
    mkt_res = client.get("/api/v1/market/viability?industry=Technology&province=Gauteng", headers=api_headers)
    assert mkt_res.status_code == 200
    mkt_data = mkt_res.json()
    assert mkt_data["industry"] == "Technology"
    assert mkt_data["province"] == "Gauteng"
    assert mkt_data["sector_survival_rate"] == 0.72

    # 6. Retrieve platform stats
    stats_res = client.get("/api/v1/platform/stats", headers=api_headers)
    assert stats_res.status_code == 200
    stats_data = stats_res.json()
    assert "total_smes_assessed" in stats_data
    assert "score_distribution" in stats_data

    # 7. Try fetching score with invalid API key
    bad_res = client.get("/api/v1/sme/2019/045321/07/score", headers={"X-API-Key": "invalid_key"})
    assert bad_res.status_code == 401

    # 8. Revoke the API Key
    revoke_res = client.delete(f"/admin/api-keys/{generated_key['id']}", headers=headers)
    assert revoke_res.status_code == 200

    # 9. Verify the revoked API key returns 401
    revoked_res = client.get("/api/v1/sme/2019/045321/07/score", headers=api_headers)
    assert revoked_res.status_code == 401
