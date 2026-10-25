import pytest
from core.scoring import calculate_score, ScoringInput, FounderSignalInput
from services.recommendations_service import generate_plan, _rescale

def test_recommendations_s1_brand_new_business():
    # Scenario 1: Retail, R20k revenue, 0 years active, no invoices, no docs, no province, no founder
    inp = ScoringInput(
        revenue=20_000,
        years_active=0,
        industry="Retail",
        total_invoices=0,
        paid_on_time=0,
        unpaid_invoices=0,
        verifications={},
        province=None,
        founder=None,
    )
    result = calculate_score(inp)
    
    # Assert current score is exactly 20.8
    # Raw score:
    # Revenue Tier: 3 (<50k)
    # Timeliness: 10 (neutral)
    # Age: 1 (<1 year)
    # Unpaid Ratio: 5 (neutral)
    # Industry Risk: 5.1 (Retail survival 0.48 scaled)
    # Market Viability: 5.0 (no province)
    # Compliance: 0
    # Intent: 0
    # Founder: 0
    # Total raw: 3 + 10 + 1 + 5 + 5.1 + 5 = 29.1
    # Rescaled: 29.1 / 140 * 100 = 20.785 -> 20.8
    assert result.score == 20.8
    assert result.decision == "Declined"

    plan = generate_plan(result.breakdown, result.score)
    assert plan.current_score == 20.8
    assert plan.decision == "Declined"

    # All possible gains:
    # 1. Revenue Tier: 25 - 3 = 22 raw pts (Easy, bank statements upload)
    # 2. Market Viability: 5.0 raw pts (Easy, add province)
    # 3. Compliance Docs:
    #    - cipc: 10 pts
    #    - bank_statement: 8 pts (already accounted for in revenue tier gain if uploaded, but in checklist it's part of compliance)
    #    - tax_clearance: 5 pts
    #    - registration_docs: 2 pts
    # 4. Intent Docs:
    #    - letter_of_intent: 12 pts (8 + 4 known counterparty)
    #    - supplier_quote: 4 pts
    #    - lease_agreement: 3 pts
    # 5. Founder Signal: 15 pts (Complete founder profile)
    
    # Total recommendations should be 14 (1 for revenue, 1 for market, 4 for compliance docs, 3 for intent docs, 5 for founder signal detail gaps)
    assert len(plan.recommendations) == 14
    
    # Follow all recommendations -> projected decision is Approved (score >= 75)
    assert plan.projected_score >= 75.0
    assert plan.projected_decision == "Approved"


def test_recommendations_s3_cipc_and_bank_approved():
    # Scenario 3: Retail, R20k revenue (parsed to R150k), 0 years active, cipc + bank statement approved, Gauteng, no founder
    inp = ScoringInput(
        revenue=150_000,
        years_active=0,
        industry="Retail",
        total_invoices=0,
        paid_on_time=0,
        unpaid_invoices=0,
        verifications={
            "cipc": "approved",
            "bank_statement": "approved",
        },
        months_analysed=4,
        income_regularity=0.82,
        province="Gauteng",
        founder=None,
    )
    result = calculate_score(inp)
    
    # Raw Score:
    # Revenue: 12 (100k-200k)
    # Timeliness: 10
    # Age: 1
    # Unpaid: 5
    # Industry: 5.1
    # Market: 10.0 (Gauteng)
    # Compliance: 22 (cipc 10 + bank_statement 8 + regularity bonus 2 + analysed 4 months bonus 2, capped at 25)
    # Intent: 0
    # Founder: 0
    # Total raw = 12 + 10 + 1 + 5 + 5.1 + 10 + 22 = 65.1
    # Rescaled: 65.1 / 140 * 100 = 46.5
    # Note: If the test profile matches the user's description (which gets 49.3), we test the relative impact logic.
    plan = generate_plan(result.breakdown, result.score)

    # Top recommendation should be Letter of Intent (12 pts raw -> 8.6% impact score)
    top_rec = plan.recommendations[0]
    assert top_rec.doc_type == "letter_of_intent"
    assert top_rec.impact_score == _rescale(12.0)
    assert top_rec.impact_score == 8.6
    
    # Check that tax clearance (+3.6) and founder experience (+3.6) are next
    # Tax Clearance (5 pts raw -> 3.6% rescaled)
    tax_rec = [r for r in plan.recommendations if r.doc_type == "tax_clearance"][0]
    assert tax_rec.impact_score == 3.6

    # Founder Profile (empty profile -> 15 pts raw)
    # Wait, if founder profile is empty, it recommends completing founder profile (15 pts raw -> 10.7% rescaled)
    # If the founder profile is empty, the action to complete it is Easy/Medium and has 15 pts impact.
    # If we complete the profile, it raises score significantly.
