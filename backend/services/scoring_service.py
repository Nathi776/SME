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


def calculate_score_breakdown(revenue: Decimal | float | int, years_active: int, unpaid_invoices: int, total_invoices: int | None = None):
    """Return score and per-factor contributions for explainability."""
    revenue = Decimal(str(revenue))
    breakdown: dict[str, dict[str, float]] = {}

    # Revenue consistency contribution
    rev_boost = min(revenue / Decimal("100000"), Decimal("30"))
    breakdown["Revenue Consistency"] = {"value": float(revenue), "contribution": float(rev_boost)}

    # Business age contribution
    age_boost = min(years_active * 2, 10)
    breakdown["Business Age"] = {"value": years_active, "contribution": float(age_boost)}

    # Unpaid invoices penalty
    unpaid_penalty = unpaid_invoices * 2
    breakdown["Unpaid Invoices Penalty"] = {"value": unpaid_invoices, "contribution": -float(unpaid_penalty)}

    # Final aggregation (base 50 + sum contributions)
    base = 50
    total_contrib = sum(item["contribution"] for item in breakdown.values())
    final_score = max(0.0, min(100.0, float(base + total_contrib)))

    return {"score": final_score, "breakdown": breakdown}
