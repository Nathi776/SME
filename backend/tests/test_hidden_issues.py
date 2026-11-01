"""Issues found by probing the running app: double financing, absurd pre-invoice amounts,
and lenders reading each other's outcome records."""
from decimal import Decimal

import pytest

from models import FinanceRequest
from models.sme_outcome import SmeOutcome
from tests.test_access_isolation import world  # noqa: F401


@pytest.mark.parametrize("status", ["pending", "info_requested", "approved", "funded"])
def test_an_invoice_with_an_active_request_cannot_be_financed_again(world, status):
    world.request(status, world.L1 if status != "pending" else None)
    r = world.call("a", "POST", "/finance/apply", json={"invoice_id": world.inv.id, "amount": 10})
    assert r.status_code == 400
    assert "active financing request" in r.json()["detail"]


@pytest.mark.parametrize("status", ["rejected", "paid", "closed"])
def test_an_invoice_can_be_financed_again_once_the_old_request_is_over(world, status):
    world.request(status, world.L1)
    r = world.call("a", "POST", "/finance/apply", json={"invoice_id": world.inv.id, "amount": 10})
    assert r.status_code != 400 or "active financing request" not in r.json()["detail"]


def test_lender_sees_only_outcomes_of_deals_it_funded(world):
    mine = world.request("funded", world.L1)
    theirs = world.request("funded", world.L2)
    for req in (mine, theirs):
        world.db.add(SmeOutcome(finance_request_id=req.id, sme_id=world.A.id,
                                score_at_funding=60.0, amount=Decimal("1000")))
    world.db.commit()
    seen = {o["finance_request_id"] for o in world.call("l1", "GET", "/outcomes/history").json()}
    assert seen == {mine.id}
    assert {o["finance_request_id"] for o in world.call("admin", "GET", "/outcomes/history").json()} == {mine.id, theirs.id}


def test_pre_invoice_request_cannot_exceed_stated_revenue(world, monkeypatch):
    from types import SimpleNamespace
    import services.finance_service as fs
    snap = world.db.query(__import__("models").AssessmentSnapshot).first()
    monkeypatch.setattr(fs, "score_sme", lambda sme, db: SimpleNamespace(score=70, assessment_snapshot_id=snap.id if snap else 1))
    too_much = world.call("a", "POST", "/finance/apply", json={"amount": 10**12})
    assert too_much.status_code == 400 and "revenue" in too_much.json()["detail"]
