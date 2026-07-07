"""
test_scoring_unit.py — Updated for Track B (Founder Signal + RAW_MAX=140).

All score assertions use the rescaled formula: round((raw / 140.0) * 100, 1)

Factors and their max raw pts:
  Revenue Tier          25
  Invoice Timeliness    20
  Business Age          10
  Unpaid Invoice Ratio  10
  Industry Risk         10  (continuous — Technology ≈ 10.0, Construction ≈ 3.0)
  Market Viability      10  (5.0 when province=None)
  Compliance Documents  25
  Intent Documents      15
  Founder Signal        15
  ───────────────────────
  RAW_MAX              140
"""

import pytest
from core.scoring import (
    calculate_score, determine_decision,
    ScoringInput, FounderSignalInput, RAW_MAX,
    COMPLIANCE_POINTS, INTENT_BASE_POINTS, LOI_KNOWN_COUNTERPARTY_BONUS,
)


# ── Helper ────────────────────────────────────────────────────────────────────
def rescale(raw: float) -> float:
    return round(min(max((raw / RAW_MAX) * 100, 0), 100), 1)


# ── Decision threshold tests ──────────────────────────────────────────────────
def test_determine_decision():
    assert determine_decision(75.0) == "Approved"
    assert determine_decision(74.9) == "Review"
    assert determine_decision(50.0) == "Review"
    assert determine_decision(49.9) == "Declined"


# ── Basic score: Technology, Gauteng, standard invoices, partial compliance ───
def test_calculate_score_basic():
    inp = ScoringInput(
        revenue=120_000,
        years_active=3,
        industry="Technology",
        total_invoices=10,
        paid_on_time=8,
        unpaid_invoices=2,
        verifications={
            "cipc":           "approved",   # 10 pts
            "bank_statement": "approved",   # 8 pts
            "tax_clearance":  "pending",    # 0 pts
        },
        province="Gauteng",
        founder=None,
    )
    result = calculate_score(inp)

    # Raw pts:
    # Revenue:    12  (R100k-R200k)
    # Timeliness: 13  (80% on time)
    # Age:         6  (2-5 years)
    # Unpaid:      3  (20% unpaid)
    # Industry:   10  (Technology ≈ 72% survival → max 10)
    # Market:     10  (Gauteng → 10)
    # Compliance: 18  (cipc 10 + bank_statement 8)
    # Intent:      0  (none submitted)
    # Founder:     0  (none)
    # Raw = 72  →  rescale(72) = round(72/140*100, 1) = 51.4
    assert result.breakdown["Revenue Tier"]["contribution"] == 12
    assert result.breakdown["Invoice Timeliness"]["contribution"] == 13
    assert result.breakdown["Business Age"]["contribution"] == 6
    assert result.breakdown["Unpaid Invoice Ratio"]["contribution"] == 3
    assert result.breakdown["Compliance Documents"]["contribution"] == 18
    assert result.breakdown["Intent Documents"]["contribution"] == 0
    assert result.breakdown["Founder Signal"]["contribution"] == 0
    assert result.score == rescale(72)
    assert result.decision == "Review"


# ── No invoices: neutral invoice scores ───────────────────────────────────────
def test_calculate_score_no_invoices():
    inp = ScoringInput(
        revenue=50_000,
        years_active=0,
        industry="Construction",
        total_invoices=0,
        paid_on_time=0,
        unpaid_invoices=0,
        verifications={},
        province=None,   # neutral market score = 5 pts
        founder=None,
    )
    result = calculate_score(inp)

    # Revenue:    7   (R50k-R100k)
    # Timeliness: 10  (neutral — no invoices)
    # Age:         1  (< 1 year)
    # Unpaid:      5  (neutral — no invoices)
    # Industry:    3  (Construction ≈ 38% survival → min 3)
    # Market:      5  (no province)
    # Compliance:  0
    # Intent:      0
    # Founder:     0
    # Raw = 31  →  rescale(31) = 22.1
    assert result.score == rescale(31)
    assert result.decision == "Declined"


# ── Compliance cap at 25 pts ──────────────────────────────────────────────────
def test_compliance_documents_cap():
    inp = ScoringInput(
        revenue=600_000,
        years_active=6,
        industry="Professional Services",
        total_invoices=10,
        paid_on_time=10,
        unpaid_invoices=0,
        verifications={
            "cipc":               "approved",  # 10
            "bank_statement":     "approved",  # 8
            "tax_clearance":      "approved",  # 5
            "registration_docs":  "approved",  # 2
        },
        province="Gauteng",
        founder=None,
    )
    result = calculate_score(inp)

    # Compliance = min(10+8+5+2, 25) = 25
    assert result.breakdown["Compliance Documents"]["contribution"] == 25
    # Revenue 25 + Timeliness 20 + Age 10 + Unpaid 10 + Industry ~10 + Market 10 + Compliance 25 + Intent 0 + Founder 0
    # ≈ rescale(110) ≈ 78.6 (industry is ~10 for Pro Services)
    assert result.score >= 75.0
    assert result.decision == "Approved"


# ── Bank statement quality bonus ──────────────────────────────────────────────
def test_bank_statement_quality_bonus():
    inp = ScoringInput(
        revenue=120_000,
        years_active=3,
        industry="Technology",
        total_invoices=10,
        paid_on_time=8,
        unpaid_invoices=2,
        verifications={
            "cipc":           "pending",
            "bank_statement": "pending",
        },
        overdraft_count=1,
        income_regularity=0.85,
        months_analysed=6,
        province="Gauteng",
        founder=None,
    )
    result = calculate_score(inp)

    # Compliance: 0 approved + bonus (months>=6: +2, regularity>=0.8: +2, overdraft 1: -1) = 3
    assert result.breakdown["Compliance Documents"]["contribution"] == 3
    assert result.breakdown["Intent Documents"]["contribution"] == 0


# ── Intent documents: LOI only, unknown counterparty ─────────────────────────
def test_intent_loi_unknown_counterparty():
    inp = ScoringInput(
        revenue=50_000,
        years_active=0,
        industry="Technology",
        total_invoices=0,
        paid_on_time=0,
        unpaid_invoices=0,
        verifications={"cipc": "approved", "letter_of_intent": "approved"},
        intent_doc_details={
            "letter_of_intent": {"status": "approved", "loi_counterparty_known": False}
        },
        province="Gauteng",
        founder=None,
    )
    result = calculate_score(inp)

    # LOI base = 8 pts, no known counterparty bonus
    assert result.breakdown["Intent Documents"]["contribution"] == 8
    assert "letter_of_intent" in result.breakdown["Intent Documents"]["verified"]


# ── Intent documents: LOI with known counterparty ────────────────────────────
def test_intent_loi_known_counterparty():
    inp = ScoringInput(
        revenue=50_000,
        years_active=0,
        industry="Technology",
        total_invoices=0,
        paid_on_time=0,
        unpaid_invoices=0,
        verifications={"cipc": "approved", "letter_of_intent": "approved"},
        intent_doc_details={
            "letter_of_intent": {"status": "approved", "loi_counterparty_known": True}
        },
        province="Gauteng",
        founder=None,
    )
    result = calculate_score(inp)

    # LOI base 8 + known counterparty bonus 4 = 12 pts
    assert result.breakdown["Intent Documents"]["contribution"] == 8 + LOI_KNOWN_COUNTERPARTY_BONUS


# ── Intent documents: all three, LOI known ───────────────────────────────────
def test_intent_all_three_docs_cap():
    inp = ScoringInput(
        revenue=80_000,
        years_active=0,
        industry="Professional Services",
        total_invoices=0,
        paid_on_time=0,
        unpaid_invoices=0,
        verifications={
            "cipc":             "approved",
            "letter_of_intent": "approved",
            "supplier_quote":   "approved",
            "lease_agreement":  "approved",
        },
        intent_doc_details={
            "letter_of_intent": {"status": "approved", "loi_counterparty_known": True},
            "supplier_quote":   {"status": "approved", "loi_counterparty_known": None},
            "lease_agreement":  {"status": "approved", "loi_counterparty_known": None},
        },
        province="Gauteng",
        founder=None,
    )
    result = calculate_score(inp)

    # LOI: 8 + 4 (known) = 12
    # supplier_quote: 4
    # lease_agreement: 3
    # Total before cap = 19, capped at 15
    assert result.breakdown["Intent Documents"]["contribution"] == 15


# ── Full pre-invoice SME with strong intent docs ──────────────────────────────
def test_pre_invoice_sme_with_intent_docs():
    """
    New business in Gauteng. No invoices. CIPC + bank approved.
    LOI from known counterparty. Supplier quote approved.
    """
    inp = ScoringInput(
        revenue=200_000,
        years_active=0,
        industry="Technology",
        total_invoices=0,
        paid_on_time=0,
        unpaid_invoices=0,
        verifications={
            "cipc":             "approved",   # 10
            "bank_statement":   "approved",   # 8
            "letter_of_intent": "approved",
            "supplier_quote":   "approved",
        },
        intent_doc_details={
            "letter_of_intent": {"status": "approved", "loi_counterparty_known": True},
            "supplier_quote":   {"status": "approved", "loi_counterparty_known": None},
        },
        overdraft_count=0,
        income_regularity=0.85,
        months_analysed=6,
        province="Gauteng",
        founder=None,
    )
    result = calculate_score(inp)

    # Revenue:    18  (R200k)
    # Timeliness: 10  (no invoices neutral)
    # Age:         1
    # Unpaid:      5  (no invoices neutral)
    # Industry:   10  (Tech)
    # Market:     10  (Gauteng)
    # Compliance: min(10+8 + bs_bonus(2+2+0), 25) = min(22, 25) = 22
    # Intent:     min(8+4+4, 15) = 15
    # Raw = 18+10+1+5+10+10+22+15 = 91  → rescale(91) = 65.0 → Review
    assert result.score == rescale(91)
    assert result.decision == "Review"
    assert result.breakdown["Intent Documents"]["contribution"] == 15


# ── Founder Signal: profile not completed (None) ──────────────────────────────
def test_founder_no_profile():
    inp = ScoringInput(
        revenue=50_000,
        years_active=0,
        industry="Technology",
        total_invoices=0,
        paid_on_time=0,
        unpaid_invoices=0,
        province="Gauteng",
        founder=None,
    )
    result = calculate_score(inp)
    assert result.breakdown["Founder Signal"]["contribution"] == 0
    assert result.breakdown["Founder Signal"]["note"] == "Complete your founder profile to earn up to 15 pts"


# ── Founder Signal: scoring signals (perfect profile) ────────────────────────
def test_founder_scoring_signals():
    founder = FounderSignalInput(
        years_industry_experience=5,  # 5 pts
        highest_qualification="degree",  # 4 pts
        prior_business_owner=True,  # 3 pts
        trade_association_member=True,  # 2 pts
        reference_provided=True,  # 1 pt
    )
    inp = ScoringInput(
        revenue=50_000,
        years_active=0,
        industry="Technology",
        total_invoices=0,
        paid_on_time=0,
        unpaid_invoices=0,
        province="Gauteng",
        founder=founder,
    )
    result = calculate_score(inp)
    # Raw: 5 + 4 + 3 + 2 + 1 = 15 pts
    assert result.breakdown["Founder Signal"]["contribution"] == 15
    assert "degree qualification" in result.breakdown["Founder Signal"]["detail"]
    assert "prior business ownership" in result.breakdown["Founder Signal"]["detail"]
    assert "trade association member" in result.breakdown["Founder Signal"]["detail"]
    assert "business reference provided" in result.breakdown["Founder Signal"]["detail"]


# ── Founder Signal: S3 brand new SME with perfect founder profile ────────────
def test_pre_invoice_sme_with_perfect_founder():
    """
    S3 equivalent: new Tech business in Gauteng. CIPC + bank statement approved.
    Perfect founder profile. Should score exactly 60.0 (Review).
    """
    founder = FounderSignalInput(
        years_industry_experience=5,  # 5
        highest_qualification="degree",  # 4
        prior_business_owner=True,  # 3
        trade_association_member=True,  # 2
        reference_provided=True,  # 1
    )
    inp = ScoringInput(
        revenue=150_000,  # 12 pts (R100k-R200k)
        years_active=0,  # 1 pt (< 1 year)
        industry="Technology",  # 10 pts
        total_invoices=0,
        paid_on_time=0,
        unpaid_invoices=0,
        verifications={
            "cipc": "approved",  # 10
            "bank_statement": "approved",  # 8
        },
        overdraft_count=1,
        income_regularity=0.85,
        months_analysed=6,
        province="Gauteng",  # 10 pts
        founder=founder,
    )
    result = calculate_score(inp)

    # Breakdown:
    # 1. Revenue Tier: 12
    # 2. Timeliness: 10 (no invoices)
    # 3. Age: 1
    # 4. Unpaid: 5 (no invoices)
    # 5. Industry Risk: 10
    # 6. Market Viability: 10
    # 7. Compliance Documents: min(10+8 + (2+2-1), 25) = 21
    # 8. Intent Documents: 0
    # 9. Founder Signal: 15
    # Total = 12 + 10 + 1 + 5 + 10 + 10 + 21 + 0 + 15 = 84 raw
    # rescale(84) = 84 / 140 * 100 = 60.0
    assert result.score == 60.0
    assert result.decision == "Review"
