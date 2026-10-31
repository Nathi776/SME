from decimal import Decimal
"""Regressions found in the codebase audit."""
import pytest

from models import AssessmentSnapshot, BusinessObservation, FinanceRequest, SME
from tests.test_access_isolation import world  # noqa: F401


def _counts(world):
    world.db.expire_all()
    return (world.db.query(AssessmentSnapshot).count(), world.db.query(BusinessObservation).count())


def test_viewing_pages_does_not_write_assessment_records(world):
    before = _counts(world)
    for _ in range(3):
        assert world.call("l1", "GET", f"/lenders/sme-intelligence/{world.A.id}").status_code == 200
        assert world.call("a", "GET", "/recommendations/").status_code == 200
    assert _counts(world) == before


@pytest.mark.parametrize("status", ["approved", "funded"])
def test_business_with_unsettled_financing_cannot_delete_itself(world, status):
    world.request(status, world.L1)
    r = world.call("a", "DELETE", f"/smes/{world.A.id}")
    assert r.status_code == 409
    world.db.expire_all()
    assert world.db.get(SME, world.A.id) is not None
    assert world.db.query(FinanceRequest).filter_by(sme_id=world.A.id).count() == 1


@pytest.mark.parametrize("status", ["pending", "rejected", "paid", "closed"])
def test_settled_or_unfunded_business_can_delete(world, status):
    world.request(status, world.L1)
    assert world.call("a", "DELETE", f"/smes/{world.A.id}").status_code == 200


from services.finance_service import approve_finance_request as approve_request


@pytest.mark.parametrize("quoted,expected", [(Decimal("0.05"), Decimal("50.00")), (Decimal("0.015"), Decimal("15.00")), (None, Decimal("20.00"))])
def test_approval_charges_the_fee_rate_quoted_at_application(world, quoted, expected):
    r = world.request("pending", None)
    r.fee_rate = quoted
    world.db.commit()
    done = approve_request(world.db, r.id, world.L1.id, Decimal("1000"))
    assert done.platform_fee == expected
    assert done.net_amount == Decimal("1000") - expected


def test_rejection_reason_is_stored_and_visible_to_the_business(world):
    r = world.request("pending", None)
    resp = world.call("l1", "PUT", f"/finance/reject/{r.id}", json={"reason": "  Invoice debtor not verifiable  "})
    assert resp.status_code == 200
    assert resp.json()["rejection_reason"] == "Invoice debtor not verifiable"
    world.db.refresh(r)
    assert r.status == "rejected"


def test_rejecting_without_a_reason_still_works(world):
    r = world.request("pending", None)
    assert world.call("l1", "PUT", f"/finance/reject/{r.id}", json={}).status_code == 200
