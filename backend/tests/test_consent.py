"""Consent for model-improvement use: opt-in, append-only, and enforced."""
from decimal import Decimal

from models import SME
from services.assessment_evaluation_service import get_model_calibration
from services.consent_service import (
    CONSENT_POLICY_VERSION,
    PURPOSE_MODEL_IMPROVEMENT,
    consenting_user_ids,
    has_consent,
    record_consent,
)
from services.outcome_service import create_outcome, update_checkin
from tests.test_outcome_labels_and_linkage import _funded_request  # noqa: F401  (helper)

P = PURPOSE_MODEL_IMPROVEMENT


def _state(api, headers):
    return api.client.get("/consent", headers=headers).json()["consents"][0]


def test_default_is_no_consent_and_undecided(api):
    user = api.make_user("sme")
    s = _state(api, api.login(user))
    assert s["granted"] is False and s["decided"] is False
    assert s["recorded_at"] is None and s["current_policy_version"] == CONSENT_POLICY_VERSION


def test_policy_text_is_public_and_versioned(api):
    r = api.client.get("/consent/policy")
    assert r.status_code == 200
    body = r.json()
    assert body["policy_version"] == CONSENT_POLICY_VERSION
    text = body["purposes"][0]["description"]
    assert "withdraw" in text and "optional" in text


def test_requires_sign_in_and_rejects_unknown_purpose(api):
    assert api.client.get("/consent").status_code == 401
    assert api.client.put(f"/consent/{P}", json={"granted": True}).status_code == 401
    h = api.login(api.make_user("sme"))
    assert api.client.put("/consent/marketing", headers=h, json={"granted": True}).status_code == 404


def test_grant_withdraw_regrant_keeps_full_history(api):
    h = api.login(api.make_user("sme"))
    for choice in (True, False, True):
        assert api.client.put(f"/consent/{P}", headers=h, json={"granted": choice}).status_code == 200
    assert _state(api, h)["granted"] is True
    hist = api.client.get("/consent/history", headers=h).json()
    assert [r["granted"] for r in hist] == [True, False, True]
    assert all(r["policy_version"] == CONSENT_POLICY_VERSION and r["source"] == "portal" for r in hist)


def test_users_cannot_see_or_change_each_others_consent(api):
    a, b = api.make_user("sme"), api.make_user("sme")
    api.client.put(f"/consent/{P}", headers=api.login(a), json={"granted": True})
    assert _state(api, api.login(b))["granted"] is False
    assert api.client.get("/consent/history", headers=api.login(b)).json() == []


def _register(api, **extra):
    name = f"reg_{len(extra)}_{id(extra) % 9999}"
    body = {"username": name, "email": f"{name}@t.com", "password": "Password123", **extra}
    r = api.client.post("/auth/register", json=body)
    assert r.status_code in (200, 201), r.text
    return r.json()["id"]


def test_registration_records_explicit_choice_only(api):
    db = api.Session()
    granted = _register(api, consent_model_improvement=True)
    declined = _register(api, consent_model_improvement=False, role="lender")
    not_asked = _register(api, role="sme", username="plain_user_x", email="plain@t.com")

    assert has_consent(db, granted, P) is True
    assert has_consent(db, declined, P) is False
    from services.consent_service import latest_consent
    assert latest_consent(db, declined, P) is not None        # declined is recorded
    assert latest_consent(db, not_asked, P) is None           # never asked: no record
    assert latest_consent(db, granted, P).source == "registration"
    db.close()


def test_consenting_user_ids_uses_latest_decision(api):
    a, b, c = (api.make_user("sme") for _ in range(3))
    db = api.Session()
    record_consent(db, a.id, P, True, "portal")
    record_consent(db, b.id, P, True, "portal")
    record_consent(db, b.id, P, False, "portal")      # withdrawn
    assert consenting_user_ids(db, P) == {a.id}        # c never decided
    db.close()


def _labelled_outcome(db, name, score):
    from tests.test_outcome_labels_and_linkage import _sme
    sme = _sme(db, name=name)
    req, _ = _funded_request(db, sme, snapshot_score=score, version="v1")
    outcome = create_outcome(db, req.id)
    db.commit()
    update_checkin(db, outcome.id, 365, True, 1000, True)
    return sme


def test_calibration_excludes_without_consent_and_honours_withdrawal(api):
    db = api.Session()
    yes = _labelled_outcome(db, "Yes", 72.0)
    no = _labelled_outcome(db, "No", 75.0)
    later_withdrawn = _labelled_outcome(db, "Later", 78.0)

    record_consent(db, yes.user_id, P, True, "portal")
    record_consent(db, later_withdrawn.user_id, P, True, "portal")

    report = get_model_calibration(db)
    assert report["labelled_outcomes"] == 2
    assert report["excluded_without_consent"] == 1

    record_consent(db, later_withdrawn.user_id, P, False, "portal")   # withdraw
    report = get_model_calibration(db)
    assert report["labelled_outcomes"] == 1
    assert report["excluded_without_consent"] == 2
    db.close()
