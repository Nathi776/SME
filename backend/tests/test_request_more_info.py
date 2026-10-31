"""Lender asks, SME answers, lender decides; plus the pending-queue fix."""
from decimal import Decimal

import pytest

from models import FinanceRequest
from tests.test_access_isolation import world  # noqa: F401  (shared fixture)


def _pending(world):
    return world.request("pending", None)


def _status(world, rid):
    world.db.expire_all()
    return world.db.get(FinanceRequest, rid).status


def test_new_requests_appear_in_every_lenders_pending_list(world):
    r = _pending(world)
    for who in ("l1", "l2"):
        ids = [x["id"] for x in world.call(who, "GET", "/finance/pending").json()]
        assert r.id in ids, who


def test_full_cycle_ask_answer_approve(world):
    r = _pending(world)
    ask = world.call("l1", "POST", f"/finance/{r.id}/request-info", json={"message": "Please send 6 months of statements"})
    assert ask.status_code == 200 and ask.json()["status"] == "info_requested"
    assert _status(world, r.id) == "info_requested"

    # paused: not in anyone's actionable list, can't be approved yet
    assert r.id not in [x["id"] for x in world.call("l1", "GET", "/finance/pending").json()]
    assert r.id in [x["id"] for x in world.call("l1", "GET", "/finance/awaiting-info").json()]
    assert world.call("l1", "PUT", f"/finance/approve/{r.id}", json={"approved_amount": 500}).status_code == 400

    ans = world.call("a", "POST", f"/finance/{r.id}/respond", json={"message": "Uploaded, see documents"})
    assert ans.status_code == 200 and ans.json()["status"] == "pending"

    # back in the asking lender's queue only
    assert r.id in [x["id"] for x in world.call("l1", "GET", "/finance/pending").json()]
    assert r.id not in [x["id"] for x in world.call("l2", "GET", "/finance/pending").json()]
    assert world.call("l1", "PUT", f"/finance/approve/{r.id}", json={"approved_amount": 500}).status_code == 200

    thread = world.call("a", "GET", f"/finance/{r.id}/messages").json()
    assert [m["kind"] for m in thread] == ["info_request", "response"]
    assert [m["author_role"] for m in thread] == ["lender", "sme"]


def test_other_lender_cannot_decide_a_claimed_request(world):
    r = _pending(world)
    world.call("l1", "POST", f"/finance/{r.id}/request-info", json={"message": "Need more detail please"})
    world.call("a", "POST", f"/finance/{r.id}/respond", json={"message": "Here is the detail"})
    assert world.call("l2", "PUT", f"/finance/approve/{r.id}", json={"approved_amount": 1}).status_code == 400
    assert world.call("l2", "PUT", f"/finance/reject/{r.id}").status_code == 400
    assert world.call("l2", "POST", f"/finance/{r.id}/request-info", json={"message": "Me too please"}).status_code == 400
    assert _status(world, r.id) == "pending"


def test_only_the_right_people_can_use_the_actions(world):
    r = _pending(world)
    msg = {"message": "Valid message text"}
    assert world.call("a", "POST", f"/finance/{r.id}/request-info", json=msg).status_code == 403
    assert world.call("anon", "POST", f"/finance/{r.id}/request-info", json=msg).status_code == 401
    world.call("l1", "POST", f"/finance/{r.id}/request-info", json=msg)
    assert world.call("b", "POST", f"/finance/{r.id}/respond", json=msg).status_code == 404   # other SME
    assert world.call("l1", "POST", f"/finance/{r.id}/respond", json=msg).status_code == 403   # lender
    assert _status(world, r.id) == "info_requested"


def test_thread_is_private(world):
    r = _pending(world)
    world.call("l1", "POST", f"/finance/{r.id}/request-info", json={"message": "Confidential question here"})
    assert world.call("a", "GET", f"/finance/{r.id}/messages").status_code == 200
    assert world.call("l1", "GET", f"/finance/{r.id}/messages").status_code == 200
    assert world.call("admin", "GET", f"/finance/{r.id}/messages").status_code == 200
    for who in ("b", "l2"):
        assert world.call(who, "GET", f"/finance/{r.id}/messages").status_code == 404, who
    assert world.call("anon", "GET", f"/finance/{r.id}/messages").status_code == 401


@pytest.mark.parametrize("text", ["", "hey", " " * 10, "x" * 1001])
def test_message_length_is_validated(world, text):
    r = _pending(world)
    assert world.call("l1", "POST", f"/finance/{r.id}/request-info", json={"message": text}).status_code in (400, 422)
    assert _status(world, r.id) == "pending"


def test_cannot_ask_on_a_decided_request_or_answer_when_not_asked(world):
    done = world.request("approved", world.L1)
    assert world.call("l1", "POST", f"/finance/{done.id}/request-info", json={"message": "Too late to ask"}).status_code == 400
    r = _pending(world)
    assert world.call("a", "POST", f"/finance/{r.id}/respond", json={"message": "Nothing was asked"}).status_code == 400


def test_email_failure_does_not_block_the_action(world, monkeypatch):
    import services.email_service as es

    def boom(*a, **k):
        raise RuntimeError("smtp down")

    monkeypatch.setattr(es, "send_email", boom)
    r = _pending(world)
    assert world.call("l1", "POST", f"/finance/{r.id}/request-info", json={"message": "Valid question text"}).status_code == 200
    assert _status(world, r.id) == "info_requested"


def test_sme_is_emailed_with_the_question(world, monkeypatch):
    import services.email_service as es
    sent = []
    monkeypatch.setattr(es, "send_email", lambda to, subject, body: sent.append((to, body)))
    r = _pending(world)
    world.call("l1", "POST", f"/finance/{r.id}/request-info", json={"message": "Which bank do you use?"})
    assert len(sent) == 1 and "Which bank do you use?" in sent[0][1]
