"""
Decision explanation report (pure: a stored assessment snapshot in, a report dict out).

It describes what the assessment rests on, in plain language, and what would strengthen it. It never
recomputes or changes a score, weight, threshold or decision, reads nothing but the snapshot, and
works for older snapshots that carry no evidence records.

Wording rules (enforced by tests/test_decision_report.py):
  * It is an assessment of submitted evidence, never a prediction of repayment or business success.
  * "Evidence confidence" is how reliable the evidence for an input is, never how good the business is.
  * Confidence bands are provisional starting classifications, not validated probabilities.
  * No reviewer identity, document paths or internal ids are exposed.
"""
from __future__ import annotations

REPORT_SCHEMA_VERSION = 1

STATEMENT = ("This report explains how the assessment was reached from the evidence submitted. "
             "It is not a prediction of repayment or of business success.")
CONFIDENCE_NOTE = ("Evidence confidence describes how reliable the evidence behind each input is. "
                   "It does not describe how good the business is. Confidence levels are provisional "
                   "classifications and have not yet been validated against real outcomes.")

_BAND_TEXT = {
    "high": "Strong evidence", "medium_high": "Good evidence", "medium": "Some evidence",
    "low": "Weak evidence", "none": "No evidence", "not_applicable": "Context only",
}
_RANK = {"none": 0, "low": 1, "medium": 2, "medium_high": 3, "high": 4}

_FLAG_TEXT = {
    "declared_vs_bank_revenue_conflict": "The revenue declared and the revenue seen in the bank statement differ by more than the allowed margin.",
    "deposits_not_classified_as_customer_revenue": "Bank deposits have not yet been individually checked to confirm they are customer payments.",
    "extraction_did_not_reconcile": "The figures read from the bank statement did not add up to its balances.",
    "extraction_reconciliation_not_available": "The bank statement figures have not been cross-checked against its balances.",
    "newer_upload_pending_review": "A newer upload is waiting for review; this assessment used the latest approved document.",
    "approved_statement_without_parsed_revenue": "A bank statement was approved but no revenue could be read from it, so the declared figure was used.",
    "stale": "This evidence is older than the review period.",
    "manually_overridden": "This item was adjusted manually.",
    "override_without_reason": "A manual adjustment was made without a recorded reason and needs review.",
    "no_founder_profile": "No founder profile has been completed.",
    "no_invoices": "No invoices have been recorded yet.",
    "business_entered_not_counterparty_confirmed": "Entered by the business; not confirmed by the other party.",
    "counterparty_not_recognised": "The other party in this document could not be recognised.",
    "registration_does_not_establish_trading_history": "Registration shows the business exists; it does not show how long or how well it has traded.",
    "context_only_not_scored": "Shown for information; it does not change the score.",
    "factor_not_covered_by_evidence_rules": "Evidence reliability is not yet rated for this item.",
}
_HIDDEN_FLAGS = {"context_only_not_scored"}   # explained by the section it sits in

_HELP = {
    "not_submitted": "Submit the relevant document or information for review.",
    "declared_unsupported": "Support the declared figure with a document, such as a bank statement.",
    "uploaded_unreviewed": "Wait for the uploaded document to be reviewed.",
    "conflicting_or_ambiguous": "Resolve the difference between the figures, or provide a clearer document.",
    "rejected": "Upload a corrected document to replace the one that was not accepted.",
    "self_attested_records": "Back the records with documents the other party can confirm.",
}


def _pts(x):
    return round(float(x), 1) if x is not None else 0.0


def _factor_view(name: str, b: dict, rec: dict | None) -> dict:
    applicable = bool(b.get("applicable", True))
    view = {
        "name": name,
        "description": b.get("label") or (rec or {}).get("claim") or name,
        "points": _pts(b.get("contribution")), "max_points": _pts(b.get("max")),
        "scored": applicable and not b.get("contextual", False),
    }
    if rec is None:
        view.update(confidence=None, confidence_text="Evidence detail not recorded for this assessment",
                    rests_on=None, notes=[], what_would_help=None, needs_review=False)
        return view
    band = rec.get("confidence")
    flags = [f for f in rec.get("flags", []) if f not in _HIDDEN_FLAGS]
    view.update(
        confidence=band, confidence_text=_BAND_TEXT.get(band, "Not rated"),
        rests_on=rec.get("claim"),
        evidence_kind=rec.get("evidence_type"),
        verification=rec.get("verification_status"),
        notes=[_FLAG_TEXT[f] for f in flags if f in _FLAG_TEXT],
        what_would_help=_HELP.get(rec.get("condition")) if view["scored"] else None,
        needs_review=bool(rec.get("needs_review")),
    )
    return view


def build_decision_report(snapshot) -> dict:
    """`snapshot` is an AssessmentSnapshot (or any object with the same attributes)."""
    breakdown = snapshot.factor_breakdown or {}
    meta = breakdown.get("_assessment", {}) or {}
    ev = (snapshot.input_snapshot or {}).get("evidence") or {}
    records = ev.get("records") or {}

    factors = [_factor_view(k, v, records.get(k)) for k, v in breakdown.items() if not k.startswith("_")]
    scored = [f for f in factors if f["scored"]]
    context = [f for f in factors if not f["scored"]]

    ranked = [f for f in scored if f["confidence"] in _RANK]
    strongest = sorted((f for f in ranked if _RANK[f["confidence"]] >= 3 and f["points"] > 0),
                       key=lambda f: -f["points"])
    gaps = sorted((f for f in scored if f["confidence"] in ("none", "low") or f["needs_review"]),
                  key=lambda f: -(f["max_points"] - f["points"]))

    return {
        "schema_version": REPORT_SCHEMA_VERSION,
        "statement": STATEMENT,
        "headline": {
            "decision": snapshot.decision,
            "stage": meta.get("profile_label") or snapshot.profile,
            "funding_readiness_score": _pts(snapshot.score),
            "viability_score": _pts(snapshot.viability_score) if snapshot.viability_score is not None else None,
            "evidence_confidence_score": _pts(meta.get("confidence_score", snapshot.evidence_depth))
            if (meta.get("confidence_score") is not None or snapshot.evidence_depth is not None) else None,
            "scores_explained": {
                "funding_readiness_score": "How ready the business is for funding on the evidence submitted.",
                "viability_score": "How viable the business looks for its stage, separate from funding readiness.",
                "evidence_confidence_score": "How much verified evidence supports this assessment.",
            },
        },
        "reasoning": list(meta.get("reasoning") or []),
        "factors": scored,
        "strongest_support": [f["name"] for f in strongest],
        "main_gaps": [{"name": f["name"], "what_would_help": f["what_would_help"]} for f in gaps],
        "context_only": [{"name": f["name"], "description": f["description"]} for f in context],
        "confidence_note": CONFIDENCE_NOTE,
        "evidence_detail_available": bool(records),
        "traceability": {
            "assessed_at": snapshot.assessed_at.isoformat() if getattr(snapshot, "assessed_at", None) else None,
            "strategy_version": snapshot.strategy_version, "inference_version": snapshot.inference_version,
            "evidence_rules_version": ev.get("config_version"),
        },
    }
