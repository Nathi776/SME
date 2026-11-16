"""Strategy v4 revenue policy: what earns scoring credit, and what must never be hidden."""
from datetime import datetime, timedelta, timezone
from decimal import Decimal

import pytest

from core.assessment_engine import REVENUE_POLICY, RevenuePolicy, assess, resolve_revenue_for_scoring
from core.scoring import EvidencePackage, FounderSignalInput
from models import Invoice, Verification
from services.decision_report import build_decision_report
from services.scoring_service import build_evidence_package, create_assessment_for_sme
from tests.test_access_isolation import world  # noqa: F401

NO_BANK = dict(overdraft_count=None, income_regularity=None, months_analysed=None)


def pkg(**k):
    d = dict(revenue=50_000.0, years_active=2, industry="Retail", total_invoices=10, paid_on_time=8,
             unpaid_invoices=2, verifications={"cipc": "approved"}, province="Gauteng",
             founder=FounderSignalInput(3, "diploma", False, False, True), **NO_BANK)
    d.update(k)
    return EvidencePackage(**d)


def rt(inp):
    return assess(inp).breakdown["Revenue Tier"]


# ---- Rule A: unsupported self-reported revenue ------------------------------------------
def test_extreme_unsupported_claim_is_credited_only_up_to_the_cap_and_declared_is_kept():
    b = rt(pkg(revenue=5_000_000.0))
    assert b["declared_revenue"] == 5_000_000.0 and b["scoring_revenue"] == REVENUE_POLICY.unsupported_cap
    assert b["cap_applied"] and b["revenue_basis"] == "self_reported_unsupported"
    assert b["contribution"] == rt(pkg(revenue=100_000.0))["contribution"]
    assert b["revenue_policy_version"] == "revenue-policy-1" and b["cap_amount"] == 100_000.0


def test_ordinary_startup_under_the_cap_is_untouched():
    b = rt(pkg(revenue=60_000.0))
    assert not b["cap_applied"] and b["scoring_revenue"] == 60_000.0 and b["revenue_basis"] == "self_reported"


def test_cap_is_not_presented_as_a_limit_on_revenue():
    label = rt(pkg(revenue=5_000_000.0))["label"]
    assert "not credited" in label and "maximum" not in label.lower()


def test_cap_is_configurable_and_versioned():
    p = RevenuePolicy(version="revenue-policy-test", unsupported_cap=50_000.0)
    r = resolve_revenue_for_scoring(pkg(revenue=300_000.0), p)
    assert r.scoring_revenue == 50_000.0 and r.policy_version == "revenue-policy-test" and r.cap == 50_000.0


# ---- Rule C: invoice-supported revenue ----------------------------------------------------
def test_paid_invoices_lift_the_cap_up_to_their_value():
    r = resolve_revenue_for_scoring(pkg(revenue=400_000.0, invoice_paid_revenue=250_000.0))
    assert r.scoring_revenue == 250_000.0 and r.basis == "invoice_supported" and r.declared_revenue == 400_000.0
    full = resolve_revenue_for_scoring(pkg(revenue=400_000.0, invoice_paid_revenue=400_000.0))
    assert full.scoring_revenue == 400_000.0 and not full.cap_applied


def test_small_paid_invoice_total_does_not_lift_the_cap():
    r = resolve_revenue_for_scoring(pkg(revenue=400_000.0, invoice_paid_revenue=30_000.0))
    assert r.scoring_revenue == 100_000.0 and r.basis == "self_reported_unsupported"


# ---- Rule B: approved bank statement, deposits unclassified ------------------------------
BANK = dict(verifications={"cipc": "approved", "bank_statement": "approved"}, overdraft_count=0,
            income_regularity=0.85, months_analysed=12)


def test_approving_a_statement_does_not_raise_revenue_credit_above_the_declared_figure():
    inflated_deposits = resolve_revenue_for_scoring(pkg(revenue=1_500_000.0, declared_revenue=100_000.0, **BANK))
    assert inflated_deposits.scoring_revenue == 100_000.0 and inflated_deposits.limited_to_declared
    assert inflated_deposits.basis == "bank_derived_unclassified"
    same = rt(pkg(revenue=1_500_000.0, declared_revenue=100_000.0, **BANK))["contribution"]
    assert same == rt(pkg(revenue=100_000.0, declared_revenue=100_000.0, **BANK))["contribution"]


def test_bank_figure_below_declared_is_used_as_is():
    r = resolve_revenue_for_scoring(pkg(revenue=60_000.0, declared_revenue=200_000.0, **BANK))
    assert r.scoring_revenue == 60_000.0 and not r.limited_to_declared and r.conflict


def test_statement_with_no_declared_revenue_is_capped_not_trusted():
    r = resolve_revenue_for_scoring(pkg(revenue=900_000.0, declared_revenue=0.0, **BANK))
    assert r.scoring_revenue == REVENUE_POLICY.unsupported_cap


def test_supported_scores_are_never_below_unsupported_scores_for_the_same_claim():
    unsupported = rt(pkg(revenue=400_000.0))["contribution"]
    supported = rt(pkg(revenue=400_000.0, invoice_paid_revenue=400_000.0))["contribution"]
    assert supported > unsupported


# ---- end to end through the service ----------------------------------------------------------
def _assess(world):
    sme = world.db.get(type(world.A), world.A.id)
    return create_assessment_for_sme(sme, world.db)[2]


def test_service_counts_only_recent_paid_invoices(world):
    now = datetime.now(timezone.utc)
    world.A.revenue = Decimal("400000")
    for status, amount, when in [("paid", 150000, now - timedelta(days=30)),
                                 ("paid", 90000, now - timedelta(days=400)),   # too old
                                 ("pending", 70000, None)]:                    # not paid
        world.db.add(Invoice(sme_id=world.A.id, client_name="c", amount=Decimal(amount), status=status,
                             paid_at=when))
    world.db.commit()
    inp = build_evidence_package(world.db.get(type(world.A), world.A.id), world.db)
    assert inp.declared_revenue == 400000.0 and inp.invoice_paid_revenue == 150000.0


def test_snapshot_and_report_disclose_the_cap(world):
    world.A.revenue = Decimal("5000000")
    world.db.commit()
    sid = _assess(world)
    snap = world.db.get(__import__("models").AssessmentSnapshot, sid)
    assert snap.strategy_version == "v4"
    assert snap.input_snapshot["declared_revenue"] == 5_000_000.0
    assert snap.input_snapshot["scoring_revenue"] == 100_000.0
    assert snap.input_snapshot["revenue_policy"]["unsupported_cap"] == 100_000.0
    rep = build_decision_report(snap)
    notes = " ".join(n for f in rep["factors"] if f["name"] == "Revenue Tier" for n in f["notes"])
    assert "R100,000" in notes and "not a limit on what the business earns or claims" in notes


def test_bank_deposits_above_declared_are_not_credited_and_say_so(world):
    world.A.revenue = Decimal("100000")
    world.db.add(Verification(sme_id=world.A.id, doc_type="bank_statement", status="approved",
                              document_url="x.pdf", submitted_at=datetime.now(timezone.utc),
                              reviewed_at=datetime.now(timezone.utc), bs_parsed_revenue=Decimal("1500000"),
                              bs_months_analysed=12, bs_overdraft_count=0, bs_income_regularity=0.9))
    world.db.commit()
    sid = _assess(world)
    snap = world.db.get(__import__("models").AssessmentSnapshot, sid)
    b = snap.factor_breakdown["Revenue Tier"]
    assert b["scoring_revenue"] == 100_000.0 and b["limited_to_declared"] and b["declared_revenue"] == 100_000.0
    notes = " ".join(n for f in build_decision_report(snap)["factors"] if f["name"] == "Revenue Tier"
                     for n in f["notes"])
    assert "not yet been checked as customer payments" in notes
