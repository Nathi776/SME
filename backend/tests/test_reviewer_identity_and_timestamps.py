"""
Audit F7 (reviewer accountability) and F5 (evidence timestamps). Neither affects any score.
"""
from datetime import datetime
from types import SimpleNamespace

from models.assessment_snapshot import AssessmentSnapshot
from models.sme import SME
from models.user import User
from models.verification import Verification
from services.evidence_selection import evidence_timestamps
from services.scoring_service import create_assessment_for_sme
from tests.test_bank_statement_provenance import _login, _upload, env  # noqa: F401  (fixture reuse)


def _admin_id(env):
    return env.db.query(User).filter(User.role == "admin").one().id


def test_unreviewed_upload_has_no_reviewer(env):
    vid = _upload(env, _login(env, "sme")).json()["id"]
    ver = env.db.query(Verification).get(vid)
    assert ver.reviewed_by_user_id is None and ver.review_method is None


def test_approval_records_who_and_how(env):
    sme_h, adm_h = _login(env, "sme"), _login(env, "admin")
    vid = _upload(env, sme_h).json()["id"]
    r = env.client.put(f"/verifications/approve/{vid}", headers=adm_h, json={"reviewer_notes": "ok"})
    assert r.status_code == 200
    env.db.expire_all()
    ver = env.db.query(Verification).get(vid)
    assert ver.reviewed_by_user_id == _admin_id(env) and ver.review_method == "manual_admin"
    body = r.json()
    assert body["review_method"] == "manual_admin"
    assert "reviewed_by_user_id" not in body  # reviewer identity stays internal


def test_rejection_records_who_and_how(env):
    sme_h, adm_h = _login(env, "sme"), _login(env, "admin")
    vid = _upload(env, sme_h).json()["id"]
    assert env.client.put(f"/verifications/reject/{vid}", headers=adm_h,
                          json={"reviewer_notes": "unreadable"}).status_code == 200
    env.db.expire_all()
    ver = env.db.query(Verification).get(vid)
    assert ver.status == "rejected"
    assert ver.reviewed_by_user_id == _admin_id(env) and ver.review_method == "manual_admin"


def test_snapshot_records_evidence_timestamps(env):
    sme_h, adm_h = _login(env, "sme"), _login(env, "admin")
    vid = _upload(env, sme_h).json()["id"]
    sme = env.db.query(SME).filter(SME.id == env.sme_id).one()

    _, _, snap_id = create_assessment_for_sme(sme, env.db)
    before = env.db.query(AssessmentSnapshot).get(snap_id).input_snapshot["evidence_timestamps"]
    assert before["documents"]["bank_statement"]["status"] == "pending"
    assert before["documents"]["bank_statement"]["reviewed_at"] is None
    assert before["bank_statement_used"] is None

    assert env.client.put(f"/verifications/approve/{vid}", headers=adm_h, json={}).status_code == 200
    env.db.expire_all()
    sme = env.db.query(SME).filter(SME.id == env.sme_id).one()
    _, _, snap_id = create_assessment_for_sme(sme, env.db)
    after = env.db.query(AssessmentSnapshot).get(snap_id).input_snapshot["evidence_timestamps"]
    used = after["bank_statement_used"]
    assert used["verification_id"] == vid and used["reviewed_at"] and used["submitted_at"]
    assert used["review_method"] == "manual_admin"


def _v(i, doc, status, sub, rev=None):
    return SimpleNamespace(id=i, doc_type=doc, status=status, submitted_at=sub, reviewed_at=rev,
                           review_method=None)


def test_helper_reports_latest_per_type_and_the_statement_actually_used():
    old = _v(1, "bank_statement", "approved", datetime(2026, 1, 1), datetime(2026, 1, 2))
    new = _v(2, "bank_statement", "pending", datetime(2026, 3, 1))
    cipc = _v(3, "cipc", "approved", datetime(2026, 2, 1), datetime(2026, 2, 2))
    out = evidence_timestamps([old, new, cipc], SimpleNamespace(approved=old))
    assert out["documents"]["bank_statement"]["verification_id"] == 2  # newest upload
    assert out["bank_statement_used"]["verification_id"] == 1          # the one scoring relied on
    assert out["documents"]["cipc"]["reviewed_at"] == datetime(2026, 2, 2).isoformat()


def test_helper_handles_no_documents():
    assert evidence_timestamps([], None) == {"documents": {}, "bank_statement_used": None}
