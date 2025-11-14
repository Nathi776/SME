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
