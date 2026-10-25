"""Shared fixture: the real app on an isolated SQLite database."""
import os
import uuid
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import models  # noqa: F401  (register every table)
from database import Base, get_db
from limiter import limiter
from main import app
from models.user import User
from services.auth_service import hash_password

limiter.enabled = False


@pytest.fixture()
def api(monkeypatch, tmp_path):
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine, autoflush=False)

    def override():
        db = Session()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override
    monkeypatch.setenv("PERSISTENT_UPLOAD_DIR", str(tmp_path / "uploads"))

    def make_user(role="sme", password="Password123", username=None):
        db = Session()
        name = username or f"{role}_{uuid.uuid4().hex[:6]}"
        u = User(username=name, email=f"{name}@t.com",
                 hashed_password=hash_password(password), role=role)
        db.add(u)
        db.commit()
        uid = u.id
        db.close()
        return SimpleNamespace(id=uid, username=name, email=f"{name}@t.com", password=password)

    client = TestClient(app)

    def login(user):
        r = client.post("/auth/login", json={"username": user.username, "password": user.password})
        assert r.status_code == 200, r.text
        return {"Authorization": f"Bearer {r.json()['access_token']}"}

    yield SimpleNamespace(client=client, Session=Session, make_user=make_user,
                          login=login, upload_dir=tmp_path / "uploads")
    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=engine)
    engine.dispose()
