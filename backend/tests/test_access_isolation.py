"""Who may read or change whose data. Each test names the rule it protects."""
from decimal import Decimal

import pytest

from models import SME, FinanceRequest, Invoice, Lender, Verification
from services.outcome_service import create_outcome


@pytest.fixture()
def world(api):
    db = api.Session()
    users = {n: api.make_user(r) for n, r in
             [("a", "sme"), ("b", "sme"), ("l1", "lender"), ("l2", "lender"), ("admin", "admin")]}
    A = SME(name="A", industry="Retail", revenue=Decimal("100000"), years_active=3, user_id=users["a"].id)
    B = SME(name="B", industry="Retail", revenue=Decimal("100000"), years_active=3, user_id=users["b"].id)
    db.add_all([A, B]); db.commit()
    L1 = Lender(user_id=users["l1"].id, organization_name="L1", contact_email="l1@secret.com", phone="0110000001")
    L2 = Lender(user_id=users["l2"].id, organization_name="L2", contact_email="l2@secret.com")
    db.add_all([L1, L2]); db.commit()
    inv = Invoice(sme_id=A.id, client_name="c", amount=Decimal("1000")); db.add(inv); db.commit()
    ver = Verification(sme_id=A.id, doc_type="bank_statement", status="pending", document_url="x.pdf")
    db.add(ver); db.commit()

    def request(status, lender):
        r = FinanceRequest(sme_id=A.id, amount_requested=Decimal("1000"),
                           approved_amount=Decimal("1000"), status=status,
                           lender_id=lender.id if lender else None, invoice_id=inv.id)
        db.add(r); db.commit()
        return r

    headers = {n: api.login(u) for n, u in users.items()}
    headers["anon"] = {}
    ns = type("W", (), {})()
    ns.api, ns.db, ns.h = api, db, headers
    ns.A, ns.B, ns.L1, ns.L2, ns.inv, ns.ver, ns.request = A, B, L1, L2, inv, ver, request
    ns.call = lambda who, m, p, **kw: api.client.request(m, p, headers=headers[who], **kw)
    return ns


# ---- authentication required everywhere -------------------------------------------------
@pytest.mark.parametrize("method,path", [
    ("GET", "/lenders/1"), ("GET", "/smes/1"), ("GET", "/invoices/"), ("GET", "/finance/pending"),
    ("GET", "/verifications/my"), ("GET", "/outcomes/history"), ("GET", "/consent"),
])
def test_anonymous_is_rejected(world, method, path):
    assert world.call("anon", method, path).status_code == 401


# ---- one SME cannot touch another's records ---------------------------------------------
def test_other_sme_cannot_read_or_change_my_business(world):
    A = world.A.id
    assert world.call("b", "GET", f"/smes/{A}").status_code == 403
    assert world.call("b", "PUT", f"/smes/{A}", json={"name": "x", "industry": "Retail",
                                                      "revenue": 1, "years_active": 1}).status_code == 403
    assert world.call("b", "DELETE", f"/smes/{A}").status_code == 403
    assert world.call("b", "GET", f"/invoices/sme/{A}").status_code == 403
    assert world.call("b", "GET", f"/finance/requests/{A}").status_code == 403
    assert world.db.query(SME).get(A).name == "A"


def test_other_sme_cannot_touch_my_invoice_or_document(world):
    assert world.call("b", "PUT", f"/invoices/{world.inv.id}/paid").status_code in (403, 404)
    assert world.call("b", "DELETE", f"/invoices/{world.inv.id}").status_code in (403, 404)
    assert world.call("b", "GET", f"/verifications/{world.ver.id}/document").status_code in (403, 404)
    assert world.call("b", "GET", "/invoices/").json() == []


def test_other_sme_cannot_submit_my_checkin(world):
    req = world.request("funded", world.L1)
    out = create_outcome(world.db, req.id); world.db.commit()
    body = {"interval": 90, "still_operating": True, "revenue": 1, "loan_repaid": False}
    assert world.call("b", "POST", f"/outcomes/{out.id}/checkin", json=body).status_code in (403, 404)
    assert world.call("l1", "POST", f"/outcomes/{out.id}/checkin", json=body).status_code in (403, 404)


# ---- role boundaries --------------------------------------------------------------------
def test_lender_cannot_edit_or_delete_smes_or_invoices(world):
    assert world.call("l1", "PUT", f"/smes/{world.A.id}", json={"name": "x", "industry": "Retail",
                                                                "revenue": 1, "years_active": 1}).status_code in (403, 404)
    assert world.call("l1", "DELETE", f"/smes/{world.A.id}").status_code in (403, 404)
    assert world.call("l1", "DELETE", f"/invoices/{world.inv.id}").status_code in (403, 404)


def test_sme_cannot_use_lender_or_admin_actions(world):
    r = world.request("pending", None)
    assert world.call("a", "PUT", f"/finance/approve/{r.id}", json={"approved_amount": 1}).status_code == 403
    assert world.call("a", "PUT", f"/finance/reject/{r.id}").status_code == 403
    assert world.call("a", "PUT", f"/finance/funded/{r.id}").status_code == 403
    assert world.call("a", "GET", "/finance/pending").status_code == 403
    assert world.call("a", "GET", "/verifications/pending").status_code == 403
    assert world.call("a", "PUT", f"/verifications/approve/{world.ver.id}", json={}).status_code == 403
    assert world.call("a", "GET", "/lenders/available-smes").status_code == 403


def test_lender_cannot_approve_documents(world):
    assert world.call("l1", "PUT", f"/verifications/approve/{world.ver.id}", json={}).status_code == 403


# ---- lender can only move their own deals -----------------------------------------------
@pytest.mark.parametrize("path,status", [("funded", "approved"), ("paid", "funded"), ("closed", "paid")])
def test_lender_cannot_advance_another_lenders_request(world, path, status):
    r = world.request(status, world.L1)
    assert world.call("l2", "PUT", f"/finance/{path}/{r.id}").status_code == 403
    world.db.expire_all()
    assert world.db.query(FinanceRequest).get(r.id).status == status


def test_owning_lender_and_admin_can_advance(world):
    r1 = world.request("approved", world.L1)
    assert world.call("l1", "PUT", f"/finance/funded/{r1.id}").status_code == 200
    r2 = world.request("approved", world.L1)
    assert world.call("admin", "PUT", f"/finance/funded/{r2.id}").status_code == 200


# ---- lender profiles (contact details) --------------------------------------------------
def test_lender_profile_is_private_to_owner_and_admin(world):
    assert world.call("l1", "GET", f"/lenders/{world.L1.id}").status_code == 200
    assert world.call("admin", "GET", f"/lenders/{world.L1.id}").status_code == 200
    for who in ("a", "b", "l2"):
        r = world.call(who, "GET", f"/lenders/{world.L1.id}")
        assert r.status_code == 403, who
        assert "l1@secret.com" not in r.text


# ---- consent is per user ----------------------------------------------------------------
def test_consent_choices_are_per_user(world):
    assert world.call("a", "PUT", "/consent/model_improvement", json={"granted": True}).status_code == 200
    assert world.call("b", "GET", "/consent/history").json() == []
