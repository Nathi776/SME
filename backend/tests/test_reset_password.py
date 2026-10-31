import sys
import reset_password as rp
from models.user import User
from services.auth_service import verify_password


def test_looks_hashed():
    assert rp.looks_hashed("$2b$12$" + "a" * 53) is True
    assert rp.looks_hashed("plaintext") is False and rp.looks_hashed(None) is False


def test_reset_makes_login_work(api, monkeypatch, capsys):
    user = api.make_user("sme", password="OldPassword1")
    monkeypatch.setattr(rp, "SessionLocal", api.Session)
    answers = iter(["BrandNewPass9", "BrandNewPass9"])
    monkeypatch.setattr(rp.getpass, "getpass", lambda *_: next(answers))
    monkeypatch.setattr(sys, "argv", ["reset_password.py", user.email])
    assert rp.main() == 0
    db = api.Session()
    stored = db.query(User).filter(User.id == user.id).one().hashed_password
    assert verify_password("BrandNewPass9", stored) and not verify_password("OldPassword1", stored)
    r = api.client.post("/auth/login", json={"username": user.username, "password": "BrandNewPass9"})
    assert r.status_code == 200


def test_list_never_prints_hashes(api, monkeypatch, capsys):
    api.make_user("sme", password="Whatever123")
    monkeypatch.setattr(rp, "SessionLocal", api.Session)
    monkeypatch.setattr(sys, "argv", ["reset_password.py", "--list"])
    assert rp.main() == 0
    out = capsys.readouterr().out
    assert "ok (bcrypt hash)" in out and "$2" not in out


def test_unknown_account_and_short_password(api, monkeypatch, capsys):
    user = api.make_user("sme")
    monkeypatch.setattr(rp, "SessionLocal", api.Session)
    monkeypatch.setattr(sys, "argv", ["reset_password.py", "nobody@x.com"])
    assert rp.main() == 1
    monkeypatch.setattr(rp.getpass, "getpass", lambda *_: "short")
    monkeypatch.setattr(sys, "argv", ["reset_password.py", user.email])
    assert rp.main() == 1
