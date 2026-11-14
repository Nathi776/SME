"""
Tests for services/evidence_records.py (provisional bands; pure, unpersisted, no score change).
Confidence attaches to the CLAIM, not the document, and never implies viability.
"""
import copy
import pathlib
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace as NS

import pytest

from core.assessment_engine import assess
from services import evidence_records as er
from services.evidence_records import Band, Condition, EvidenceConfig, PROVISIONAL_BANDS, build_evidence_records
from tests.validation.test_evidence_handling import sme

NOW = datetime(2026, 11, 14, tzinfo=timezone.utc)


def ver(i, doc, status, sub=datetime(2026, 10, 1), rev=None, method=None):
    return NS(id=i, doc_type=doc, status=status, submitted_at=sub, reviewed_at=rev, review_method=method)


def records(inp=None, rows=(), bank=None, **kw):
    inp = inp or sme()
    return build_evidence_records(inp, assess(inp).breakdown, rows, bank, **kw)


def bank_inp(**k):
    base = dict(verifications={"bank_statement": "approved"}, months_analysed=6, bank_statement_verification_id=11,
                revenue=120_000.0)
    base.update(k)
    return sme(**base)


# ---------------------------------------------------------------- the provisional band table

@pytest.mark.parametrize("cond,band", [
    (Condition.DECLARED_UNSUPPORTED, Band.LOW),
    (Condition.UPLOADED_UNREVIEWED, Band.LOW),
    (Condition.ADMIN_APPROVED, Band.MEDIUM),
    (Condition.BANK_APPROVED_RECONCILED, Band.MEDIUM_HIGH),
    (Condition.TRANSACTIONS_REVIEWED_CUSTOMER_REVENUE, Band.HIGH),
    (Condition.CONFLICTING_OR_AMBIGUOUS, Band.LOW),
])
def test_provisional_band_per_condition(cond, band):
    assert PROVISIONAL_BANDS[cond] is band


def test_bands_are_configurable_not_hard_coded():
    cfg = EvidenceConfig(bands={**PROVISIONAL_BANDS, Condition.ADMIN_APPROVED: Band.HIGH})
    rows = [ver(1, "cipc", "approved", rev=datetime(2026, 10, 2))]
    default = records(rows=rows)["Compliance Documents"]["confidence"]
    changed = records(rows=rows, config=cfg)["Compliance Documents"]["confidence"]
    assert (default, changed) == ("medium", "high")


# ---------------------------------------------------------------- revenue claim

def test_declared_revenue_is_low_and_unverified():
    r = records(sme(verifications={}, months_analysed=None))["Revenue Tier"]
    assert (r["confidence"], r["verification_status"], r["source"]) == ("low", "unverified", "declared")


def test_approved_statement_without_reconciliation_is_medium_with_honest_flags():
    r = records(bank_inp())["Revenue Tier"]
    assert r["confidence"] == "medium" and r["verification_status"] == "verified"
    assert "extraction_reconciliation_not_available" in r["flags"]
    assert "deposits_not_classified_as_customer_revenue" in r["flags"]


def test_reconciled_extraction_is_medium_high():
    assert records(bank_inp(), extraction_reconciled=True)["Revenue Tier"]["confidence"] == "medium_high"


def test_transaction_level_review_is_the_only_route_to_high():
    r = records(bank_inp(), extraction_reconciled=True, transactions_reviewed=True)["Revenue Tier"]
    assert r["confidence"] == "high"
    assert "deposits_not_classified_as_customer_revenue" not in r["flags"]
    # reviewed transactions without a reconciled extraction are NOT high
    assert records(bank_inp(), transactions_reviewed=True)["Revenue Tier"]["confidence"] != "high"


def test_failed_reconciliation_is_conflicting_and_needs_review():
    r = records(bank_inp(), extraction_reconciled=False)["Revenue Tier"]
    assert r["confidence"] == "low" and r["needs_review"] and "extraction_did_not_reconcile" in r["flags"]


def test_declared_versus_bank_revenue_conflict_is_flagged():
    r = records(bank_inp(revenue=120_000.0), extraction_reconciled=True, declared_revenue=40_000.0)["Revenue Tier"]
    assert r["confidence"] == "low" and r["needs_review"]
    assert "declared_vs_bank_revenue_conflict" in r["flags"] and r["provenance"]["declared_revenue"] == 40_000.0


def test_small_declared_vs_bank_difference_is_not_a_conflict():
    r = records(bank_inp(revenue=120_000.0), extraction_reconciled=True, declared_revenue=110_000.0)["Revenue Tier"]
    assert r["confidence"] == "medium_high" and not r["needs_review"]


def test_confidence_does_not_depend_on_the_revenue_amount():
    low = records(bank_inp(revenue=5_000.0), extraction_reconciled=True)["Revenue Tier"]["confidence"]
    high = records(bank_inp(revenue=900_000.0), extraction_reconciled=True)["Revenue Tier"]["confidence"]
    assert low == high  # reliability of the evidence is not business quality


def test_latest_upload_and_statement_actually_used_are_kept_apart():
    used = ver(11, "bank_statement", "approved", datetime(2026, 8, 1), datetime(2026, 8, 2), "manual_admin")
    newer = ver(12, "bank_statement", "pending", datetime(2026, 10, 20))
    bank = NS(approved=used, governing=newer)
    r = records(bank_inp(bank_statement_newer_pending=True), [used, newer], bank)["Revenue Tier"]
    assert r["provenance"]["used_verification_id"] == 11 and r["provenance"]["latest_upload_id"] == 12
    assert "newer_upload_pending_review" in r["flags"]
    assert r["collected_at"].startswith("2026-08-02") and r["collected_at_basis"] == "reviewed_at"
    assert r["review_method"] == "manual_admin"


def test_approved_statement_without_parsed_revenue_is_still_declared_and_flagged():
    inp = sme(verifications={"bank_statement": "approved"}, months_analysed=None, bank_statement_verification_id=11)
    r = records(inp, bank=NS(approved=ver(11, "bank_statement", "approved"), governing=None))["Revenue Tier"]
    assert r["source"] == "declared" and "approved_statement_without_parsed_revenue" in r["flags"]


# ---------------------------------------------------------------- documents

def test_compliance_separates_absent_pending_rejected_and_approved():
    rows = [ver(1, "cipc", "approved", rev=datetime(2026, 10, 2), method="auto_cipc_api"),
            ver(2, "tax_clearance", "pending"), ver(3, "registration_docs", "rejected", rev=datetime(2026, 10, 3))]
    r = records(rows=rows)["Compliance Documents"]
    by = {d["doc_type"]: d for d in r["documents"]}
    assert by["cipc"]["verification_status"] == "verified" and by["cipc"]["confidence"] == "medium"
    assert by["tax_clearance"]["verification_status"] == "pending" and by["tax_clearance"]["confidence"] == "low"
    assert by["registration_docs"]["verification_status"] == "rejected" and by["registration_docs"]["confidence"] == "none"
    absent = [d for d in r["documents"] if d["verification_id"] is None]
    assert absent and all(d["confidence"] == "none" for d in absent)
    assert "registration_docs_rejected" in r["flags"] and "tax_clearance_pending_review" in r["flags"]
    assert r["confidence"] == "medium" and r["needs_review"]


def test_no_documents_means_no_evidence_not_unviable():
    r = records()["Compliance Documents"]
    assert (r["confidence"], r["verification_status"]) == ("none", "unverified")


def test_unrecognised_loi_counterparty_is_conflicting():
    inp = sme(intent_doc_details={"letter_of_intent": {"status": "approved", "loi_counterparty_known": False}})
    r = records(inp)["Intent Documents"]
    assert r["needs_review"] and "counterparty_not_recognised" in r["flags"]


# ---------------------------------------------------------------- self-attested and context factors

def test_invoice_factors_are_self_attested_low_and_never_verified():
    recs = records()
    for f in ("Invoice Timeliness", "Unpaid Invoice Ratio"):
        assert recs[f]["confidence"] == "low" and recs[f]["verification_status"] == "unverified"
        assert "business_entered_not_counterparty_confirmed" in recs[f]["flags"]


def test_no_invoices_is_not_submitted():
    inp = sme(total_invoices=0, paid_on_time=0, unpaid_invoices=0)
    assert records(inp)["Invoice Timeliness"]["condition"] == "not_submitted"


def test_context_factors_are_not_applicable_and_carry_no_weight():
    recs = records()
    for f in ("Industry Risk", "Market Viability"):
        assert recs[f]["confidence"] == "not_applicable" and recs[f]["impact"]["weight_share"] == 0.0
        assert "context_only_not_scored" in recs[f]["flags"]


# ---------------------------------------------------------------- stale, override, unknown

def test_staleness_is_off_by_default_and_flags_and_caps_when_configured():
    old = datetime(2025, 1, 1)
    rows = [ver(1, "cipc", "approved", sub=old, rev=old)]
    assert "stale" not in records(rows=rows, as_of=NOW)["Compliance Documents"]["flags"]
    cfg = EvidenceConfig(stale_after_days=180)
    r = records(rows=rows, as_of=NOW, config=cfg)["Compliance Documents"]
    assert "stale" in r["flags"] and r["confidence"] == "low"
    fresh = [ver(1, "cipc", "approved", sub=NOW - timedelta(days=5), rev=NOW - timedelta(days=4))]
    assert "stale" not in records(rows=fresh, as_of=NOW, config=cfg)["Compliance Documents"]["flags"]


def test_manual_override_is_recorded_and_cannot_raise_confidence_above_the_cap():
    ov = {"Revenue Tier": {"by": "admin_7", "reason": "statement re-read manually", "at": NOW}}
    r = records(bank_inp(), extraction_reconciled=True, transactions_reviewed=True, overrides=ov)["Revenue Tier"]
    assert r["confidence"] == "medium" and "manually_overridden" in r["flags"]
    assert r["override"]["by"] == "admin_7" and not r["needs_review"]


def test_override_without_a_reason_needs_review():
    r = records(bank_inp(), overrides={"Revenue Tier": {"by": "admin_7"}})["Revenue Tier"]
    assert r["needs_review"] and "override_without_reason" in r["flags"]


def test_unknown_factor_is_reported_never_skipped():
    inp = sme()
    breakdown = assess(inp).breakdown
    breakdown["Brand New Factor"] = {"contribution": 3.0, "max": 5.0, "label": "x"}
    r = build_evidence_records(inp, breakdown)["Brand New Factor"]
    assert "factor_not_covered_by_evidence_rules" in r["flags"] and r["needs_review"]


# ---------------------------------------------------------------- completeness and purity

STAGES = {"idea": dict(years_active=0, total_invoices=0, paid_on_time=0, unpaid_invoices=0, verifications={}),
          "startup": dict(years_active=0, total_invoices=0, paid_on_time=0, unpaid_invoices=0,
                          verifications={"cipc": "approved"}),
          "growth": dict(), "established": dict(years_active=5, total_invoices=25, paid_on_time=20, unpaid_invoices=5)}


@pytest.mark.parametrize("stage", STAGES)
def test_every_factor_gets_a_record_and_weights_sum_to_one(stage):
    inp = sme(**STAGES[stage])
    result = assess(inp)
    recs = build_evidence_records(inp, result.breakdown)
    assert set(recs) == {k for k in result.breakdown if not k.startswith("_")}
    assert "factor_not_covered_by_evidence_rules" not in sum((r["flags"] for r in recs.values()), [])
    assert sum(r["impact"]["weight_share"] for r in recs.values()) == pytest.approx(1.0, abs=0.01)


def test_building_records_changes_no_score_or_breakdown():
    inp = sme()
    before = assess(inp)
    snapshot = copy.deepcopy(before.breakdown)
    build_evidence_records(inp, before.breakdown, [ver(1, "cipc", "approved")])
    after = assess(inp)
    assert before.breakdown == snapshot
    assert (before.score, before.viability_score, before.confidence_score, before.decision) == \
           (after.score, after.viability_score, after.confidence_score, after.decision)


def test_module_is_pure_and_unwired():
    src = pathlib.Path(er.__file__).read_text()
    for forbidden in ("sqlalchemy", "Session", "commit(", "open(", "requests"):
        assert forbidden not in src
    root = pathlib.Path(er.__file__).resolve().parents[1]
    offenders = [p.relative_to(root).as_posix() for p in root.rglob("*.py")
                 if not p.relative_to(root).as_posix().startswith(("tests/", "venv", ".venv"))
                 and not p.name == "evidence_records.py"
                 and "evidence_records" in p.read_text(encoding="utf-8-sig", errors="ignore")]
    assert offenders == []


def test_records_are_json_serialisable():
    import json
    json.dumps(records(bank_inp(), [ver(11, "bank_statement", "approved", rev=datetime(2026, 10, 2))],
                       NS(approved=ver(11, "bank_statement", "approved", rev=datetime(2026, 10, 2)), governing=None),
                       extraction_reconciled=True))
