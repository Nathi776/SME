from decimal import Decimal


def calculate_credit_score(revenue: Decimal | float | int, years_active: int, unpaid_invoices: int) -> float:
    """Shared score calculation used for initial and manual score generation."""
    revenue = Decimal(str(revenue))
    base_score = 50
    revenue_boost = min(revenue / Decimal("100000"), Decimal("30"))
    stability_boost = min(years_active * 2, 10)
    penalty = unpaid_invoices * 2

    score = base_score + revenue_boost + stability_boost - penalty
    return float(max(Decimal("0"), min(score, Decimal("100"))))


def calculate_rule_based_score(sme):
    """Rule-based scoring logic"""
    score = 0

    # Example rule-based calculation
    if sme.revenue > 500000:
        score += 40
    elif sme.revenue > 100000:
        score += 20

    if sme.expenses < sme.revenue * 0.5:
        score += 30
    else:
        score += 10

    return min(score, 100)
