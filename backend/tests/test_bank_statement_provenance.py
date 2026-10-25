"""
Provenance + review-workflow tests for bank-statement evidence.

Unit tests cover the shared selection rule; the integration test drives the
real router against SQLite to prove that:
  * unapproved metrics never reach the SME record,
  * approval mirrors metrics and the assessment records the verification ID,
  * already-reviewed records cannot be re-reviewed.
"""
import io
import os
import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from services.evidence_selection import select_bank_statement_evidence


def _v(vid, status, when, doc_type="bank_statement"):
    return SimpleNamespace(id=vid, doc_type=doc_type, status=status, submitted_at=when)


T0 = datetime(2026, 1, 1, tzinfo=timezone.utc)


def test_selection_returns_verification_id_for_approved_latest():
    ev = select_bank_statement_evidence([_v(1, "approved", T0)])
    assert ev.verification_id == 1


def test_newer_pending_or_rejected_does_not_displace_older_approved():
    for status in ("pending", "rejected"):
        ev = select_bank_statement_evidence(
            [_v(1, "approved", T0), _v(2, status, T0 + timedelta(days=1))]
        )
        assert ev.governing.id == 2
        assert ev.verification_id == 1
        assert ev.newer_unreviewed is True


def test_latest_approved_wins_among_several_approved():
    ev = select_bank_statement_evidence(
        [_v(1, "approved", T0), _v(2, "approved", T0 + timedelta(days=1))]
    )
    assert ev.verification_id == 2 and ev.newer_unreviewed is False


def test_only_unapproved_statements_yield_no_evidence():
    ev = select_bank_statement_evidence([_v(1, "pending", T0)])
    assert ev.verification_id is None and ev.newer_unreviewed is False


def test_selection_ignores_other_doc_types_and_missing_timestamps():
    ev = select_bank_statement_evidence(
        [_v(5, "approved", None), _v(9, "approved", T0, doc_type="cipc")]
    )
    assert ev.verification_id == 5


def test_selection_empty():
    ev = select_bank_statement_evidence([])
    assert ev.governing is None and ev.verification_id is None


# ── Integration ──────────────────────────────────────────────────────────────

from database import Base, get_db  # noqa: E402
from limiter import limiter  # noqa: E402
from main import app  # noqa: E402
from models.sme import SME  # noqa: E402
from models.user import User  # noqa: E402
from models.verification import Verification  # noqa: E402
from routers import verification_router  # noqa: E402
from services.auth_service import hash_password  # noqa: E402
from services.scoring_service import create_assessment_for_sme  # noqa: E402
from models.assessment_snapshot import AssessmentSnapshot  # noqa: E402
from models.business_observation import BusinessObservation  # noqa: E402

limiter.enabled = False

DB_FILE = "test_provenance_tmp.db"
engine = None
Session = None


def _override_db():
    db = Session()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture()
def env(monkeypatch, tmp_path):
    global engine, Session
    if os.path.exists(DB_FILE):
        os.remove(DB_FILE)
    engine = create_engine(f"sqlite:///./{DB_FILE}", connect_args={"check_same_thread": False})
    Session = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)
    app.dependency_overrides[get_db] = _override_db

    # Keep uploads out of the repo and make parsing deterministic.
    monkeypatch.setattr(
        verification_router, "save_uploaded_file",
        lambda f: (f.file.read(), str(tmp_path / "doc.pdf")),
    )
    signals = SimpleNamespace(
        avg_monthly_balance=Decimal("15000"), avg_monthly_income=Decimal("30000"),
        avg_monthly_expenses=Decimal("20000"), overdraft_count=1,
        income_regularity=Decimal("0.9"), months_analysed=6,
        parsed_revenue=Decimal("180000"),
    )
    monkeypatch.setattr(verification_router, "parse_bank_statement", lambda b: signals)

    db = Session()
    suffix = uuid.uuid4().hex[:6]
    for name, role in ((f"sme_{suffix}", "sme"), (f"adm_{suffix}", "admin")):
        db.add(User(username=name, email=f"{name}@t.com",
                    hashed_password=hash_password("Password123"), role=role))
    db.commit()
    sme_user = db.query(User).filter(User.role == "sme").one()
    sme = SME(user_id=sme_user.id, name="Acme", revenue=Decimal("10000"),
              years_active=2, industry="Retail", province="Gauteng")
    db.add(sme)
    db.commit()
    yield SimpleNamespace(client=TestClient(app), db=db, suffix=suffix, sme_id=sme.id)
    db.close()
    app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=engine)
    engine.dispose()
    if os.path.exists(DB_FILE):
        os.remove(DB_FILE)


def _login(env, role):
    r = env.client.post("/auth/login", json={
        "username": f"{'sme' if role == 'sme' else 'adm'}_{env.suffix}",
        "password": "Password123"})
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


def _upload(env, headers, name="statement.pdf", content=b"%PDF-1.4 x"):
    return env.client.post(
        "/verifications/submit", headers=headers,
        data={"doc_type": "bank_statement"},
        files={"file": (name, io.BytesIO(content), "application/pdf")},
    )


def test_unapproved_upload_does_not_touch_sme_record(env):
    sme_h = _login(env, "sme")
    assert _upload(env, sme_h).status_code == 200
    sme = env.db.query(SME).filter(SME.id == env.sme_id).one()
    env.db.refresh(sme)
    assert sme.bs_parsed_revenue is None
    assert sme.bs_overdraft_count is None


def test_non_pdf_bank_statement_rejected_before_storage(env, monkeypatch):
    saved = []
    monkeypatch.setattr(verification_router, "save_uploaded_file",
                        lambda f: saved.append(1) or (b"", "x"))
    r = _upload(env, _login(env, "sme"), name="statement.exe")
    assert r.status_code == 400
    assert saved == []


def test_oversize_upload_rejected(env, monkeypatch):
    monkeypatch.setattr(verification_router, "MAX_UPLOAD_BYTES", 10)
    r = _upload(env, _login(env, "sme"), content=b"x" * 50)
    assert r.status_code == 413


def test_approval_mirrors_metrics_and_assessment_records_verification_id(env):
    sme_h, adm_h = _login(env, "sme"), _login(env, "admin")
    vid = _upload(env, sme_h).json()["id"]

    # Before approval: assessment must not use or cite the statement.
    sme = env.db.query(SME).filter(SME.id == env.sme_id).one()
    _, obs_id, snap_id = create_assessment_for_sme(sme, env.db)
    snap = env.db.query(AssessmentSnapshot).get(snap_id)
    assert snap.input_snapshot["bank_statement_verification_id"] is None
    assert snap.input_snapshot["revenue_source"] == "declared"

    assert env.client.put(f"/verifications/approve/{vid}", headers=adm_h,
                          json={}).status_code == 200

    env.db.expire_all()
    sme = env.db.query(SME).filter(SME.id == env.sme_id).one()
    assert sme.bs_parsed_revenue == Decimal("180000")

    _, obs_id, snap_id = create_assessment_for_sme(sme, env.db)
    snap = env.db.query(AssessmentSnapshot).get(snap_id)
    obs = env.db.query(BusinessObservation).get(obs_id)
    assert snap.input_snapshot["bank_statement_verification_id"] == vid
    assert snap.input_snapshot["revenue_source"] == "verified_bank_statement"
    assert snap.input_snapshot["revenue"] == 180000.0
    assert obs.bank_statement_verification_id == vid


def test_reviewed_verification_cannot_be_reviewed_again(env):
    sme_h, adm_h = _login(env, "sme"), _login(env, "admin")
    vid = _upload(env, sme_h).json()["id"]
    assert env.client.put(f"/verifications/reject/{vid}", headers=adm_h,
                          json={}).status_code == 200
    assert env.client.put(f"/verifications/approve/{vid}", headers=adm_h,
                          json={}).status_code == 409

