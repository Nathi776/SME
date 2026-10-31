"""Login hardening and database-backed email verification codes."""
import importlib.util
import pathlib
from datetime import timedelta
from types import SimpleNamespace

import pytest
from sqlalchemy import create_engine, text

from core.time_utils import utc_now
from models.email_verification import EmailVerificationCode
from models.user import User
from routers import auth_router
from services.auth_service import verify_password, hash_password


@pytest.fixture()
def sent(monkeypatch):
    """Capture codes instead of sending email."""
    box = []
    monkeypatch.setattr(auth_router, "_send_verification_code",
                        lambda user, channel, code: box.append(code))
    return box


def _send(api, user):
    return api.client.post("/auth/send-verification",
                           json={"email": user.email, "channels": ["email"]})


def _verify(api, user, code):
    return api.client.post("/auth/verify",
                           json={"email": user.email, "channel": "email", "code": code})


# ── Passwords ────────────────────────────────────────────────────────────────

def test_plaintext_stored_password_is_never_accepted():
    assert verify_password("Secret123", "Secret123") is False
    assert verify_password("Secret123", hash_password("Secret123")) is True
    assert verify_password("x", "") is False


def test_login_unknown_and_wrong_password_look_identical(api):
    user = api.make_user("sme")
    wrong = api.client.post("/auth/login", json={"username": user.username, "password": "Nope12345"})
    unknown = api.client.post("/auth/login", json={"username": "ghost", "password": "Nope12345"})
    assert wrong.status_code == unknown.status_code == 401
    assert wrong.json() == unknown.json()


def test_legacy_plaintext_row_is_locked_out_at_login(api):
    db = api.Session()
    db.add(User(username="legacy", email="l@t.com", hashed_password="Plain1234", role="sme"))
    db.commit()
    db.close()
    r = api.client.post("/auth/login", json={"username": "legacy", "password": "Plain1234"})
    assert r.status_code == 401


def test_migration_025_hashes_plaintext_rows_and_keeps_hashed_ones():
    path = pathlib.Path(__file__).parents[1] / "alembic/versions/025_hash_legacy_plaintext_passwords.py"
    spec = importlib.util.spec_from_file_location("m025", path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)

    engine = create_engine("sqlite://")
    good = hash_password("AlreadyHashed1")
    with engine.begin() as conn:
        conn.execute(text("CREATE TABLE users (id INTEGER PRIMARY KEY, hashed_password TEXT)"))
        conn.execute(text("INSERT INTO users VALUES (1, 'Plain1234'), (2, :g)"), {"g": good})
        mod.op = SimpleNamespace(get_bind=lambda: conn)
        mod.upgrade()
        rows = dict(conn.execute(text("SELECT id, hashed_password FROM users")).fetchall())

    assert rows[2] == good                                    # untouched
    assert rows[1] != "Plain1234" and verify_password("Plain1234", rows[1])


# ── Verification codes ───────────────────────────────────────────────────────

def test_code_is_stored_hashed_never_plaintext(api, sent):
    user = api.make_user("sme")
    assert _send(api, user).status_code == 200
    db = api.Session()
    row = db.query(EmailVerificationCode).one()
    assert sent[0] not in row.code_hash and len(row.code_hash) == 64
    db.close()


def test_correct_code_verifies_once_and_is_single_use(api, sent):
    user = api.make_user("sme")
    _send(api, user)
    assert _verify(api, user, sent[0]).status_code == 200

    db = api.Session()
    assert db.query(User).get(user.id).email_verified_at is not None
    assert db.query(EmailVerificationCode).count() == 0
    db.close()
    assert _verify(api, user, sent[0]).status_code == 400          # replay fails


def test_wrong_codes_burn_the_code_after_max_attempts(api, sent):
    user = api.make_user("sme")
    _send(api, user)
    good = sent[0]
    wrong = "000000" if good != "000000" else "111111"
    for _ in range(auth_router.VERIFICATION_MAX_ATTEMPTS):
        assert _verify(api, user, wrong).status_code == 400
    assert _verify(api, user, good).status_code == 400              # now burned


def test_expired_code_is_rejected(api, sent):
    user = api.make_user("sme")
    _send(api, user)
    db = api.Session()
    row = db.query(EmailVerificationCode).one()
    row.expires_at = utc_now() - timedelta(seconds=1)
    db.commit()
    db.close()
    assert _verify(api, user, sent[0]).status_code == 400


def test_resend_within_cooldown_does_not_issue_a_new_code(api, sent):
    user = api.make_user("sme")
    _send(api, user)
    _send(api, user)
    assert len(sent) == 1


def test_send_response_does_not_reveal_whether_account_exists(api, sent):
    user = api.make_user("sme")
    real = _send(api, user)
    ghost = api.client.post("/auth/send-verification",
                            json={"email": "nobody@t.com", "channels": ["email"]})
    assert real.status_code == ghost.status_code == 200
    assert real.json() == ghost.json()
    assert len(sent) == 1                                           # only the real user


# ---- email case ---------------------------------------------------------------------------
def test_login_by_email_ignores_case(api):
    user = api.make_user("sme", password="Password123", username="casey")
    from models.user import User
    db = api.Session()
    db.query(User).filter(User.id == user.id).update({"email": "Casey@Example.com"})  # legacy mixed-case row
    db.commit()
    for typed in ("casey@example.com", "CASEY@EXAMPLE.COM", " Casey@Example.com "):
        r = api.client.post("/auth/login", json={"email": typed, "password": "Password123"})
        assert r.status_code == 200, typed
    assert api.client.post("/auth/login", json={"email": "casey@example.com", "password": "wrong"}).status_code == 401


def test_register_stores_lowercase_and_rejects_case_variant_duplicates(api):
    body = {"username": "newperson", "password": "Password123", "email": "New.Person@Example.com", "role": "sme"}
    assert api.client.post("/auth/register", json=body).status_code in (200, 201)
    from models.user import User
    assert api.Session().query(User).filter_by(username="newperson").one().email == "new.person@example.com"
    again = {**body, "username": "another", "email": "NEW.PERSON@example.com"}
    assert api.client.post("/auth/register", json=again).status_code == 400
