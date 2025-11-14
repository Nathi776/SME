def calculate_credit_score(data):
    score = 0

    # Revenue consistency
    if data['revenue_growth'] > 0.1:
        score += 25
    elif data['revenue_growth'] >= 0:
        score += 15
    else:
        score += 5

    # Invoice payment timeliness
    if data['on_time_invoices'] >= 0.9:
        score += 20
    elif data['on_time_invoices'] >= 0.7:
        score += 10
    else:
        score += 5

    # Debt ratio
    if data['debt_ratio'] < 0.3:
        score += 15
    elif data['debt_ratio'] < 0.6:
        score += 10
    else:
        score += 5

    # Profit margin
    if data['profit_margin'] > 0.2:
        score += 10
    elif data['profit_margin'] > 0.1:
        score += 5
    else:
        score += 2

    # Unpaid invoices
    if data['unpaid_invoices'] < 0.05:
        score += 10
    elif data['unpaid_invoices'] < 0.1:
        score += 5

    # Business age
    if data['business_age'] > 5:
        score += 10
    elif data['business_age'] > 2:
        score += 5
    else:
        score += 2

    # Industry risk
    risk_map = {'low': 10, 'medium': 5, 'high': 2}
    score += risk_map.get(data['industry_risk'], 5)

    # Final normalization
    return min(score, 100)


def determine_decision(score: float) -> str:
    if score >= 80:
        return "Approved"
    elif score >= 60:
        return "Review"
    else:
        return "Declined"