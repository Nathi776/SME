import pytest
from core.scoring import calculate_score, ScoringInput, determine_decision

def test_determine_decision():
    assert determine_decision(75) == "Approved"
    assert determine_decision(74.9) == "Review"
    assert determine_decision(50) == "Review"
    assert determine_decision(49) == "Declined"

def test_calculate_score_basic():
    # Setup standard input
    inp = ScoringInput(
        revenue=120_000,
        years_active=3,
        industry="Technology",
        total_invoices=10,
        paid_on_time=8,
        unpaid_invoices=2,
        verifications={
            "cipc": "approved",
            "bank_statement": "approved",
            "tax_clearance": "pending"
        }
    )
    result = calculate_score(inp)
    
    # Breakdown check
    # 1. Revenue: 120_000 -> 12 pts (R100k-R200k)
    # 2. Timeliness: 8/10 = 80% -> 13 pts (70% to 90%)
    # 3. Age: 3 years -> 6 pts (2 to 5 years)
    # 4. Unpaid ratio: 2/10 = 20% -> 3 pts (15% to 30%)
    # 5. Industry risk: Technology (low) -> 10 pts
    # 6. Verifications: cipc (10) + bank_statement (8) = 18 pts
    # Total expected score = 12 + 13 + 6 + 3 + 10 + 18 = 62 pts
    
    assert result.score == 62.0
    assert result.decision == "Review"
    assert result.breakdown["Revenue Tier"]["contribution"] == 12
    assert result.breakdown["Invoice Timeliness"]["contribution"] == 13
    assert result.breakdown["Business Age"]["contribution"] == 6
    assert result.breakdown["Unpaid Invoice Ratio"]["contribution"] == 3
    assert result.breakdown["Industry Risk"]["contribution"] == 10
    assert result.breakdown["Verification Depth"]["contribution"] == 18

def test_calculate_score_no_invoices():
    # Neutral invoices
    inp = ScoringInput(
        revenue=50_000,
        years_active=0,
        industry="Construction",
        total_invoices=0,
        paid_on_time=0,
        unpaid_invoices=0,
        verifications={}
    )
    result = calculate_score(inp)
    
    # 1. Revenue: 50_000 -> 7 pts
    # 2. Timeliness: 0 invoices -> 10 pts
    # 3. Age: 0 years -> 1 pt
    # 4. Unpaid: 0 invoices -> 5 pts
    # 5. Industry risk: Construction (high) -> 3 pts
    # 6. Verifications: 0 pts
    # Total expected = 7 + 10 + 1 + 5 + 3 + 0 = 26 pts
    assert result.score == 26.0
    assert result.decision == "Declined"

def test_calculate_score_verification_cap():
    # Maximum points cap check (max 25 pts)
    inp = ScoringInput(
        revenue=600_000,
        years_active=6,
        industry="Professional Services",
        total_invoices=10,
        paid_on_time=10,
        unpaid_invoices=0,
        verifications={
            "cipc": "approved",           # 10
            "bank_statement": "approved",   # 8
            "tax_clearance": "approved",    # 5
            "registration_docs": "approved" # 2
        } # Total points 25.
    )
    result = calculate_score(inp)
    # Expected points:
    # 1. Revenue: 25
    # 2. Timeliness: 20
    # 3. Age: 10
    # 4. Unpaid: 10
    # 5. Industry: 10
    # 6. Verifications: 25 (capped at 25)
    # Total points = 25 + 20 + 10 + 10 + 10 + 25 = 100
    assert result.score == 100.0
    assert result.decision == "Approved"

def test_calculate_score_with_bank_statement():
    # Setup input with bank statement quality signals
    inp = ScoringInput(
        revenue=120_000,
        years_active=3,
        industry="Technology",
        total_invoices=10,
        paid_on_time=8,
        unpaid_invoices=2,
        verifications={
            "cipc": "pending",
            "bank_statement": "pending"
        },
        overdraft_count=1,
        income_regularity=0.85,
        months_analysed=6
    )
    result = calculate_score(inp)
    
    # Revenue: 120k -> 12 pts (parsed)
    # Timeliness: 8/10 -> 13 pts
    # Age: 3 years -> 6 pts
    # Unpaid: 20% -> 3 pts
    # Industry risk: Tech (low) -> 10 pts
    # Verification Depth:
    #   Approved verifications = 0
    #   Bank statement parsed bonus:
    #     months_analysed >= 6: +2
    #     income_regularity >= 0.8: +2
    #     overdraft_count = 1: -1
    #     Total bonus = 2 + 2 - 1 = 3 pts
    #   Total verification depth = min(0 + 3, 25) = 3 pts
    # Expected score = 12 + 13 + 6 + 3 + 10 + 3 = 47 pts
    assert result.score == 47.0
    assert result.decision == "Declined"

