"""Lenders see other businesses' data: they must be approved, and see only businesses they are related to."""
from datetime import datetime

from models import Lender, User
from tests.test_access_isolation import world  # noqa: F401

SME_READS = [
    "/lenders/sme-intelligence/{a}", "/smes/{a}", "/invoices/sme/{a}",
    "/business-observations/{a}", "/credit-scores/sme/{a}", "/credit-scores/history/{a}", "/credit-scores/details/{a}",
]


def _make_pending(world):
    world.L1.approval_status = "pending"
    world.db.commit()


def test_pending_lender_is_refused_everywhere(world):
    world.request("pending", None)
    _make_pending(world)
    for path in SME_READS + ["/smes/", "/invoices/", "/lenders/available-smes", "/lenders/portfolio-analytics"]:
        r = world.call("l1", "GET", path.format(a=world.A.id))
        assert r.status_code == 403, (path, r.status_code)


def test_pending_lender_can_still_view_own_profile(world):
    _make_pending(world)
    r = world.call("l1", "GET", "/lenders/me")
    assert r.status_code == 200 and r.json()["approval_status"] == "pending"


def test_rejected_and_suspended_lenders_are_refused(world):
    world.request("pending", None)
    for st in ("rejected", "suspended"):
        world.L1.approval_status = st
        world.db.commit()
        assert world.call("l1", "GET", f"/smes/{world.A.id}").status_code == 403


def test_approved_lender_cannot_read_unrelated_business(world):
    # No finance request exists for A, so L1 has no relationship with A.
    for path in SME_READS:
        r = world.call("l1", "GET", path.format(a=world.A.id))
        assert r.status_code in (403, 404), (path, r.status_code)
    assert world.call("l1", "GET", "/smes/").json() == []
    assert world.call("l1", "GET", "/invoices/").json() == []


def test_lender_sees_business_with_open_pool_request_or_own_assignment(world):
    r = world.request("pending", None)
    assert world.call("l1", "GET", f"/smes/{world.A.id}").status_code == 200
    assert world.call("l2", "GET", f"/smes/{world.A.id}").status_code == 200
    r.status, r.lender_id = "approved", world.L1.id
    world.db.commit()
    assert world.call("l1", "GET", f"/smes/{world.A.id}").status_code == 200
    # Once assigned to L1, other lenders lose access.
    assert world.call("l2", "GET", f"/smes/{world.A.id}").status_code in (403, 404)
    assert world.call("l2", "GET", f"/invoices/sme/{world.A.id}").status_code == 403


def test_other_businesses_stay_hidden_even_with_a_request(world):
    world.request("pending", None)  # for A only
    assert world.call("l1", "GET", f"/smes/{world.B.id}").status_code in (403, 404)
    ids = {s["id"] for s in world.call("l1", "GET", "/smes/").json()}
    assert ids == {world.A.id}


def test_admin_still_sees_everything(world):
    assert world.call("admin", "GET", f"/smes/{world.A.id}").status_code == 200
    assert len(world.call("admin", "GET", "/smes/").json()) == 2


def test_sme_and_admin_accounts_cannot_become_lenders(world):
    body = {"organization_name": "X", "contact_email": "x@x.com"}
    for who in ("a", "admin"):
        assert world.call(who, "POST", "/lenders/register", json=body).status_code == 403
    world.db.expire_all()
    assert world.db.query(User).filter_by(id=world.A.user_id).one().role == "sme"


def test_new_lender_registers_as_pending(world):
    u = world.api.make_user("lender")
    world.h["new"] = world.api.login(u)
    r = world.call("new", "POST", "/lenders/register",
                   json={"organization_name": "Fresh", "contact_email": "f@f.com"})
    assert r.status_code in (200, 201), r.text
    assert r.json()["approval_status"] == "pending"
    assert world.call("new", "GET", "/smes/").status_code == 403


def test_portfolio_analytics_are_scoped_per_lender(world):
    from decimal import Decimal
    from services.outcome_service import create_outcome  # noqa: F401
    r = world.request("funded", world.L2)
    from models import SmeOutcome
    world.db.add(SmeOutcome(finance_request_id=r.id, sme_id=world.A.id, score_at_funding=60,
                            amount=Decimal("1000"), outcome_status="repaid"))
    world.db.commit()
    assert world.call("l2", "GET", "/outcomes/analytics").json()["total_deals"] == 1
    assert world.call("l1", "GET", "/outcomes/analytics").json()["total_deals"] == 0
    assert world.call("admin", "GET", "/outcomes/analytics").json()["total_deals"] == 1


def test_admin_approval_flow_and_audit_fields(world):
    _make_pending(world)
    # Email must be verified first.
    assert world.call("admin", "PUT", f"/admin/lenders/{world.L1.id}/approve").status_code == 400
    u = world.db.query(User).get(world.L1.user_id)
    u.email_verified_at = datetime(2026, 1, 1)
    world.db.commit()
    r = world.call("admin", "PUT", f"/admin/lenders/{world.L1.id}/approve")
    assert r.status_code == 200 and r.json()["approval_status"] == "approved"
    world.db.expire_all()
    l = world.db.get(Lender, world.L1.id)
    assert l.approved_at is not None and l.approved_by_user_id is not None
    assert world.call("admin", "PUT", f"/admin/lenders/{world.L1.id}/suspend").json()["approval_status"] == "suspended"
    assert world.call("l1", "GET", "/lenders/available-smes").status_code == 403


def test_only_admin_can_manage_lenders(world):
    for who in ("a", "l1", "l2"):
        assert world.call(who, "PUT", f"/admin/lenders/{world.L2.id}/approve").status_code == 403
        assert world.call(who, "GET", "/admin/lenders").status_code == 403
