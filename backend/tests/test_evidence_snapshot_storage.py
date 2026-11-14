"""
Step 2 of docs/EVIDENCE_RECORD_DESIGN.md: evidence records are stored in the assessment snapshot.
They are informational. They must never change or block an assessment.
"""
import json

import pytest

from models.assessment_snapshot import AssessmentSnapshot
from models.sme import SME
from services import scoring_service
from services.evidence_records import EVIDENCE_SCHEMA_VERSION
from services.scoring_service import calculate_assessment, create_assessment_for_sme
from tests.test_bank_statement_provenance import _login, _upload, env  # noqa: F401


def _sme(env):
    return env.db.query(SME).filter(SME.id == env.sme_id).one()


def _stored(env, snap_id):
    env.db.expire_all()
    return env.db.query(AssessmentSnapshot).get(snap_id).input_snapshot["evidence"]


def test_snapshot_stores_a_record_for_every_factor_with_versions(env):
    result, _, snap_id = create_assessment_for_sme(_sme(env), env.db)
    ev = _stored(env, snap_id)
    assert ev["schema_version"] == EVIDENCE_SCHEMA_VERSION and ev["config_version"] == "provisional-1"
    assert set(ev["records"]) == {k for k in result.breakdown if not k.startswith("_")}
    assert ev["config"]["stale_after_days"] is None and "bands" in ev["config"] and ev["built_at"]
    assert "error" not in ev


def test_stored_records_survive_a_database_round_trip_as_json(env):
    _, _, snap_id = create_assessment_for_sme(_sme(env), env.db)
    json.dumps(_stored(env, snap_id))  # already read back from the database


def test_storing_records_changes_no_score_or_decision(env):
    sme = _sme(env)
    expected, _ = calculate_assessment(sme, env.db)
    result, _, snap_id = create_assessment_for_sme(sme, env.db)
    snap = env.db.query(AssessmentSnapshot).get(snap_id)
    assert (result.score, result.viability_score, result.confidence_score, result.decision) == \
           (expected.score, expected.viability_score, expected.confidence_score, expected.decision)
    assert (snap.score, snap.decision, snap.viability_score) == (expected.score, expected.decision, expected.viability_score)


def test_a_failure_building_records_never_blocks_the_assessment(env, monkeypatch):
    def boom(*a, **k):
        raise RuntimeError("simulated evidence failure")
    monkeypatch.setattr(scoring_service, "build_evidence_records", boom)
    sme = _sme(env)
    expected, _ = calculate_assessment(sme, env.db)
    result, _, snap_id = create_assessment_for_sme(sme, env.db)
    ev = _stored(env, snap_id)
    assert ev["records"] is None and "simulated evidence failure" in ev["error"]
    assert result.score == expected.score and result.decision == expected.decision


def test_records_reflect_review_state_and_the_statement_used(env):
    sme_h, adm_h = _login(env, "sme"), _login(env, "admin")
    vid = _upload(env, sme_h).json()["id"]
    _, _, before_id = create_assessment_for_sme(_sme(env), env.db)
    before = _stored(env, before_id)["records"]["Revenue Tier"]
    assert before["source"] == "declared" and before["confidence"] == "low"

    assert env.client.put(f"/verifications/approve/{vid}", headers=adm_h, json={}).status_code == 200
    env.db.expire_all()
    _, _, after_id = create_assessment_for_sme(_sme(env), env.db)
    after = _stored(env, after_id)["records"]["Revenue Tier"]
    assert after["source"] == "bank_statement" and after["verification_status"] == "verified"
    assert after["provenance"]["used_verification_id"] == vid
    assert after["review_method"] == "manual_admin"
    assert "extraction_reconciliation_not_available" in after["flags"]  # stated, not guessed
    # declared R10,000 versus statement R180,000: the conflict is recorded, not hidden
    assert "declared_vs_bank_revenue_conflict" in after["flags"]
    assert after["confidence"] == "low" and after["needs_review"]
    assert after["provenance"]["declared_revenue"] == 10000.0


def test_without_a_conflict_the_approved_statement_is_medium(env):
    sme_h, adm_h = _login(env, "sme"), _login(env, "admin")
    vid = _upload(env, sme_h).json()["id"]
    sme = _sme(env)
    sme.revenue = 175000  # close to the statement's R180,000, inside the 25% tolerance
    env.db.commit()
    assert env.client.put(f"/verifications/approve/{vid}", headers=adm_h, json={}).status_code == 200
    env.db.expire_all()
    _, _, snap_id = create_assessment_for_sme(_sme(env), env.db)
    rec = _stored(env, snap_id)["records"]["Revenue Tier"]
    assert rec["confidence"] == "medium" and not rec["needs_review"]
    assert "declared_vs_bank_revenue_conflict" not in rec["flags"]


def test_old_snapshots_without_the_block_are_still_readable(env):
    _, _, snap_id = create_assessment_for_sme(_sme(env), env.db)
    snap = env.db.query(AssessmentSnapshot).get(snap_id)
    legacy = {k: v for k, v in snap.input_snapshot.items() if k not in ("evidence", "evidence_timestamps")}
    assert legacy.get("revenue") is not None and legacy.get("evidence") is None  # readers use .get("revenue") only
