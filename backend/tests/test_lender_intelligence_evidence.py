"""Lenders must see the business's real evidence, not placeholders."""
from tests.test_access_isolation import world  # noqa: F401
from models import Verification


def _get(world):
    r = world.call("l1", "GET", f"/lenders/sme-intelligence/{world.A.id}")
    assert r.status_code == 200, r.text
    return r.json()


def test_documents_reflect_real_verification_status(world):
    world.db.add_all([
        Verification(sme_id=world.A.id, doc_type="cipc", status="approved", document_url="c.pdf"),
        Verification(sme_id=world.A.id, doc_type="tax_clearance", status="rejected", document_url="t.pdf"),
    ])
    world.db.commit()
    docs = {d["doc_type"]: d["status"] for d in _get(world)["evidence"]["documents"]}
    assert docs["cipc"] == "approved"
    assert docs["tax_clearance"] == "rejected"
    assert docs["bank_statement"] == "pending"      # the pending upload from the fixture
    assert "vat_certificate" not in docs             # nothing submitted -> not listed, never "verified"


def test_latest_approved_wins_over_newer_pending(world):
    world.db.add_all([
        Verification(sme_id=world.A.id, doc_type="cipc", status="approved", document_url="old.pdf"),
        Verification(sme_id=world.A.id, doc_type="cipc", status="pending", document_url="new.pdf"),
    ])
    world.db.commit()
    docs = {d["doc_type"]: d for d in _get(world)["evidence"]["documents"]}
    assert docs["cipc"]["status"] == "approved" and docs["cipc"]["newer_pending"] is True


def test_three_distinct_outputs_are_returned(world):
    ev = _get(world)["evidence"]
    assert set(ev) >= {"documents", "viability_score", "funding_readiness", "evidence_confidence"}


def test_no_document_links_or_other_businesses_data_leak(world):
    other = Verification(sme_id=world.B.id, doc_type="cipc", status="approved", document_url="secret-b.pdf")
    world.db.add(other); world.db.commit()
    text = world.call("l1", "GET", f"/lenders/sme-intelligence/{world.A.id}").text
    assert "secret-b.pdf" not in text and "x.pdf" not in text   # no file paths at all
