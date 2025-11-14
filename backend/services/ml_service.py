import joblib
import numpy as np

# Example ML service placeholder (model integration coming later)

def load_model():
    """Load pre-trained model and vectorizer."""
    try:
        model = joblib.load("ml/credit_model.pkl")
        vectorizer = joblib.load("ml/vectorizer.pkl")
        return model, vectorizer
    except Exception:
        return None, None

def predict_credit_score(features: dict) -> float:
    """
    Placeholder ML-based scoring function.
    Converts features to array and predicts score using trained model.
    """
    # For now, use a simple rule-based approach
    base_score = 600
    if features.get("revenue", 0) > 500000:
        base_score += 100
    if features.get("late_payments", 0) > 3:
        base_score -= 50
    if features.get("years_active", 0) > 3:
        base_score += 30

    return min(base_score, 850)
