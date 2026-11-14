"""Decision explanation report: what it says, what it must never say, and that it changes nothing."""
import json
from datetime import datetime
from types import SimpleNamespace

import pytest

from models.assessment_snapshot import AssessmentSnapshot
from services.decision_report import CONFIDENCE_NOTE, STATEMENT, build_decision_report
from services.evidence_records import Condition
from services.decision_report import _FLAG_TEXT, _HELP
from services.scoring_service import create_assessment_for_sme
from tests.test_bank_statement_provenance import _login, _upload, env  # noqa: F401
from tests.test_evidence_snapshot_storage import _sme


def _strings(o):
    if isinstance(o, str):
        yield o
    elif isinstance(o, dict):
        for v in o.values():
            yield from _strings(v)
    elif isinstance(o, (list, tuple)):
        for v in o:
            yield from _strings(v)


def _snap(env):
    _, _, sid = create_assessment_for_sme(_sme(env), env.db)
    env.db.expire_all()
    return env.db.get(AssessmentSnapshot, sid)


def test_report_states_what_it_is_and_what_it_is_not(env):
    r = build_decision_report(_snap(env))
    assert r["statement"] == STATEMENT and "not a prediction" in STATEMENT
    assert r["confidence_note"] == CONFIDENCE_NOTE
    assert "does not describe how good the business is" in CONFIDENCE_NOTE
    assert "provisional" in CONFIDENCE_NOTE and "not yet been validated" in CONFIDENCE_NOTE


FORBIDDEN = ["will repay", "likely to repay", "probability", "guarantee", "predict", "default risk",
             "creditworthy", "safe to lend", "recommend lending", "reviewer", "reviewed_by", ".pdf", "/uploads", "user_id"]


def test_report_never_predicts_and_never_exposes_internals(env):
    r = build_decision_report(_snap(env))
    text = " ".join(s for k, s in ((k, s) for k in ["x"] for s in _strings({**r, "statement": ""}))).lower()
    for word in FORBIDDEN:
        assert word not in text, word
    json.dumps(r)


def test_three_outputs_are_kept_separate_and_explained(env):
    h = build_decision_report(_snap(env))["headline"]
    assert {"funding_readiness_score", "viability_score", "evidence_confidence_score"} <= set(h)
    assert set(h["scores_explained"]) == {"funding_readiness_score", "viability_score", "evidence_confidence_score"}
    assert h["decision"]


def test_every_factor_is_listed_with_points_and_plain_confidence(env):
    snap = _snap(env)
    r = build_decision_report(snap)
    names = {f["name"] for f in r["factors"]} | {c["name"] for c in r["context_only"]}
    assert names == {k for k in snap.factor_breakdown if not k.startswith("_")}
    for f in r["factors"]:
        assert f["confidence_text"] and f["points"] <= f["max_points"] + 1e-9


def test_report_matches_stored_scores_and_changes_nothing(env):
    snap = _snap(env)
    before = (snap.score, snap.viability_score, snap.decision, json.dumps(snap.factor_breakdown, sort_keys=True))
    r = build_decision_report(snap)
    assert r["headline"]["funding_readiness_score"] == round(snap.score, 1)
    assert r["headline"]["decision"] == snap.decision
    assert (snap.score, snap.viability_score, snap.decision,
            json.dumps(snap.factor_breakdown, sort_keys=True)) == before


def test_missing_evidence_becomes_a_gap_with_a_next_step(env):
    r = build_decision_report(_snap(env))
    gaps = {g["name"]: g["what_would_help"] for g in r["main_gaps"]}
    assert "Compliance Documents" in gaps and gaps["Compliance Documents"]
    assert r["strongest_support"] == [] or all(isinstance(n, str) for n in r["strongest_support"])


def test_context_only_factors_are_not_presented_as_scored(env):
    r = build_decision_report(_snap(env))
    assert any(c["name"] == "Market Viability" for c in r["context_only"])
    assert all(f["name"] != "Market Viability" for f in r["factors"])


def test_old_snapshot_without_evidence_records_still_explains(env):
    snap = _snap(env)
    data = dict(snap.input_snapshot); data.pop("evidence")
    old = SimpleNamespace(decision=snap.decision, profile=snap.profile, score=snap.score,
                          viability_score=snap.viability_score, evidence_depth=snap.evidence_depth,
                          factor_breakdown=snap.factor_breakdown, input_snapshot=data,
                          strategy_version=snap.strategy_version, inference_version=snap.inference_version,
                          assessed_at=datetime(2026, 1, 1))
    r = build_decision_report(old)
    assert r["evidence_detail_available"] is False
    assert all(f["confidence"] is None for f in r["factors"])
    assert all("not recorded" in f["confidence_text"] for f in r["factors"])


def test_conflict_and_unreconciled_flags_are_explained_in_plain_words():
    rec = {"claim": "annual revenue R120,000 extracted from the approved bank statement",
           "condition": "conflicting_or_ambiguous", "confidence": "low", "evidence_type": "bank_observed",
           "verification_status": "verified", "needs_review": True,
           "flags": ["declared_vs_bank_revenue_conflict", "deposits_not_classified_as_customer_revenue", "mystery_flag"]}
    snap = SimpleNamespace(
        decision="Review", profile="growth", score=50, viability_score=50, evidence_depth=40,
        factor_breakdown={"Revenue Tier": {"label": "R100k+", "contribution": 5, "max": 15, "applicable": True},
                          "_assessment": {"profile_label": "Growing"}},
        input_snapshot={"evidence": {"records": {"Revenue Tier": rec}, "config_version": "provisional-1"}},
        strategy_version="v2", inference_version="v1", assessed_at=None)
    f = build_decision_report(snap)["factors"][0]
    assert f["needs_review"] and len(f["notes"]) == 2          # unknown flag is not shown raw
    assert not any("mystery" in n for n in f["notes"])
    assert f["what_would_help"]


def test_every_condition_has_plain_next_step_or_none_needed():
    allowed_no_help = {Condition.ADMIN_APPROVED, Condition.BANK_APPROVED_RECONCILED,
                       Condition.TRANSACTIONS_REVIEWED_CUSTOMER_REVENUE, Condition.EXTERNAL_REFERENCE}
    for c in Condition:
        assert c.value in _HELP or c in allowed_no_help, c


def test_flag_wording_has_no_forbidden_terms():
    for t in _FLAG_TEXT.values():
        assert not any(w in t.lower() for w in FORBIDDEN)


# ---- endpoint access ---------------------------------------------------------------------
from tests.test_access_isolation import world  # noqa: F401,E402
from services.scoring_service import create_assessment_for_sme as _create  # noqa: E402


def _assess(world):
    _, _, sid = _create(world.db.get(type(world.A), world.A.id), world.db)
    return sid


def test_owner_and_admin_get_the_same_report(world):
    sid = _assess(world)
    own = world.call("a", "GET", f"/decision-reports/{sid}")
    adm = world.call("admin", "GET", f"/decision-reports/{sid}")
    assert own.status_code == adm.status_code == 200 and own.json() == adm.json()
    assert world.call("a", "GET", f"/decision-reports/sme/{world.A.id}/latest").json() == own.json()


def test_other_business_cannot_read_it(world):
    sid = _assess(world)
    assert world.call("b", "GET", f"/decision-reports/{sid}").status_code == 403
    assert world.call("anon", "GET", f"/decision-reports/{sid}").status_code == 401


def test_lender_needs_approval_and_a_relationship(world):
    sid = _assess(world)
    assert world.call("l1", "GET", f"/decision-reports/{sid}").status_code == 404   # unrelated
    world.request("pending", None)
    own = world.call("a", "GET", f"/decision-reports/{sid}").json()
    assert world.call("l1", "GET", f"/decision-reports/{sid}").json() == own          # same report
    world.L1.approval_status = "pending"; world.db.commit()
    assert world.call("l1", "GET", f"/decision-reports/{sid}").status_code == 403


def test_no_assessment_yet_is_a_clear_404(world):
    assert world.call("a", "GET", f"/decision-reports/sme/{world.A.id}/latest").status_code == 404
