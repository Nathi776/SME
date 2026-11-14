"""
Per-factor evidence records (design: docs/EVIDENCE_RECORD_DESIGN.md).

PURE and UNPERSISTED: reads the assessment inputs, the engine's breakdown and the verification rows,
and describes what each factor rests on. It never changes a score, weight, threshold or decision and
nothing is stored yet. Confidence bands are PROVISIONAL starting classifications (not validated
probabilities) and live in EvidenceConfig, not in the scoring engine.

Three separate facts per factor (never merged):
  verification_status : was the document or claim reviewed and accepted?
  confidence          : how reliable is the specific CLAIM / extracted value? (a band, not a probability)
  impact              : how much of the score does the factor carry?
High confidence means "the evidence for this input is reliable", never "the business is viable".

Confidence attaches to the claim, not the document: an approved bank statement is evidence of
deposits; it does not by itself establish that they are customer revenue.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Iterable, Mapping

from core.assessment_engine import revenue_evidence_source
from core.scoring import COMPLIANCE_POINTS, INTENT_BASE_POINTS

EVIDENCE_SCHEMA_VERSION = 1


class Band(str, Enum):
    NONE = "none"
    LOW = "low"
    MEDIUM = "medium"
    MEDIUM_HIGH = "medium_high"
    HIGH = "high"
    NOT_APPLICABLE = "not_applicable"


_ORDER = [Band.NONE, Band.LOW, Band.MEDIUM, Band.MEDIUM_HIGH, Band.HIGH]


def _cap(band: Band, ceiling: Band | None) -> Band:
    if ceiling is None or band not in _ORDER or ceiling not in _ORDER:
        return band
    return min(band, ceiling, key=_ORDER.index)


class Condition(str, Enum):
    DECLARED_UNSUPPORTED = "declared_unsupported"
    SELF_ATTESTED_RECORDS = "self_attested_records"
    UPLOADED_UNREVIEWED = "uploaded_unreviewed"
    ADMIN_APPROVED = "admin_approved"
    BANK_APPROVED_RECONCILED = "bank_approved_reconciled"
    TRANSACTIONS_REVIEWED_CUSTOMER_REVENUE = "transactions_reviewed_customer_revenue"
    CONFLICTING_OR_AMBIGUOUS = "conflicting_or_ambiguous"
    REJECTED = "rejected"
    NOT_SUBMITTED = "not_submitted"
    EXTERNAL_REFERENCE = "external_reference"


PROVISIONAL_BANDS: Mapping[Condition, Band] = {
    Condition.DECLARED_UNSUPPORTED: Band.LOW,
    Condition.SELF_ATTESTED_RECORDS: Band.LOW,
    Condition.UPLOADED_UNREVIEWED: Band.LOW,
    Condition.ADMIN_APPROVED: Band.MEDIUM,
    Condition.BANK_APPROVED_RECONCILED: Band.MEDIUM_HIGH,
    Condition.TRANSACTIONS_REVIEWED_CUSTOMER_REVENUE: Band.HIGH,
    Condition.CONFLICTING_OR_AMBIGUOUS: Band.LOW,
    Condition.REJECTED: Band.NONE,
    Condition.NOT_SUBMITTED: Band.NONE,
    Condition.EXTERNAL_REFERENCE: Band.NOT_APPLICABLE,
}


@dataclass(frozen=True)
class EvidenceConfig:
    bands: Mapping[Condition, Band] = field(default_factory=lambda: dict(PROVISIONAL_BANDS))
    version: str = "provisional-1"
    revenue_conflict_tolerance: float = 0.25      # declared vs bank revenue may differ by this fraction
    stale_after_days: int | None = None           # undecided policy: None = staleness is not flagged
    stale_band_cap: Band | None = Band.LOW
    override_band_cap: Band = Band.MEDIUM         # a manual override can never raise confidence above this


@dataclass
class EvidenceRecord:
    factor: str
    claim: str
    source: str
    evidence_type: str
    verification_status: str
    condition: str
    confidence: str
    needs_review: bool
    flags: list[str]
    collected_at: str | None
    collected_at_basis: str
    provenance: dict
    impact: dict
    review_method: str | None = None
    override: dict | None = None
    documents: list[dict] | None = None

    def to_dict(self) -> dict:
        return {k: v for k, v in self.__dict__.items() if v is not None}


# ── helpers ───────────────────────────────────────────────────────────────────

_STATUS = {"approved": "verified", "pending": "pending", "rejected": "rejected", None: "not_submitted"}


def _aware(d: datetime | None) -> datetime | None:
    return d if d is None or d.tzinfo else d.replace(tzinfo=timezone.utc)


def _latest_by_type(verifications: Iterable) -> dict:
    latest: dict = {}
    for v in sorted(verifications, key=lambda x: (x.submitted_at is not None, x.submitted_at, x.id or 0)):
        latest[v.doc_type] = v
    return latest


def _doc_condition(v) -> Condition:
    if v is None:
        return Condition.NOT_SUBMITTED
    return {"approved": Condition.ADMIN_APPROVED, "rejected": Condition.REJECTED}.get(
        v.status, Condition.UPLOADED_UNREVIEWED)


def _collected(v):
    if v is None:
        return None, "no document"
    if v.reviewed_at is not None:
        return _aware(v.reviewed_at), "reviewed_at"
    return _aware(v.submitted_at), "submitted_at"


def _best(bands: list[Band]) -> Band:
    ranked = [b for b in bands if b in _ORDER]
    return max(ranked, key=_ORDER.index) if ranked else Band.NONE


def _iso(d):
    return d.isoformat() if d else None


# ── public API ────────────────────────────────────────────────────────────────

def build_evidence_records(
    inp,
    breakdown: Mapping[str, dict],
    verifications: Iterable = (),
    bank_evidence=None,
    *,
    config: EvidenceConfig | None = None,
    as_of: datetime | None = None,
    declared_revenue: float | None = None,
    extraction_reconciled: bool | None = None,
    transactions_reviewed: bool | None = None,
    overrides: Mapping[str, dict] | None = None,
) -> dict[str, dict]:
    """
    Returns {factor name: evidence record as a dict} for every factor in `breakdown`.

    declared_revenue       : the founder's own figure, to detect a conflict with bank-derived revenue.
    extraction_reconciled  : True/False once the statement extraction has been reconciled (None = not known).
    transactions_reviewed  : True once deposits were individually reviewed and classified as customer revenue.
    overrides              : {factor: {"by": str, "reason": str, "at": datetime}} for manual overrides.
    """
    cfg = config or EvidenceConfig()
    verifications = list(verifications)
    latest = _latest_by_type(verifications)
    now = _aware(as_of)
    overrides = overrides or {}
    scored_max = sum(v.get("max", 0) or 0 for k, v in breakdown.items()
                     if not k.startswith("_") and v.get("applicable", True))

    def finish(factor, claim, source, etype, vstatus, cond, *, flags=None, needs_review=False,
               collected=None, basis="unknown", provenance=None, review_method=None, documents=None,
               band=None):
        flags = list(flags or [])
        band = band if band is not None else cfg.bands[cond]
        if cond in (Condition.CONFLICTING_OR_AMBIGUOUS,):
            needs_review = True
        if cfg.stale_after_days is not None and collected is not None and now is not None \
                and (now - collected).days > cfg.stale_after_days:
            flags.append("stale")
            band = _cap(band, cfg.stale_band_cap)
        ov = overrides.get(factor)
        override = None
        if ov is not None:
            flags.append("manually_overridden")
            band = _cap(band, cfg.override_band_cap)
            if not ov.get("reason"):
                flags.append("override_without_reason")
                needs_review = True
            override = {"by": ov.get("by"), "reason": ov.get("reason"), "at": _iso(_aware(ov.get("at")))}
        b = breakdown[factor]
        pts, mx = b.get("contribution", 0) or 0, b.get("max", 0) or 0
        impact = {"factor": factor, "points": pts, "max": mx, "applicable": bool(b.get("applicable", True)),
                  "contextual": bool(b.get("contextual", False)),
                  "weight_share": round(mx / scored_max, 4) if scored_max and b.get("applicable", True) else 0.0}
        return EvidenceRecord(
            factor=factor, claim=claim, source=source, evidence_type=etype, verification_status=vstatus,
            condition=cond.value, confidence=band.value, needs_review=needs_review, flags=flags,
            collected_at=_iso(collected), collected_at_basis=basis, provenance=provenance or {},
            impact=impact, review_method=review_method, override=override, documents=documents)

    out: dict[str, EvidenceRecord] = {}
    for factor in breakdown:
        if factor.startswith("_"):
            continue
        label = breakdown[factor].get("label")

        if factor == "Revenue Tier":
            used = bank_evidence.approved if bank_evidence is not None else None
            governing = bank_evidence.governing if bank_evidence is not None else None
            parsed = revenue_evidence_source(inp) == "parsed"
            flags, review = [], False
            prov = {"derivation": "parsed from approved bank statement" if parsed else "declared by the business",
                    "used_verification_id": inp.bank_statement_verification_id,
                    "latest_upload_id": governing.id if governing is not None else None}
            if governing is not None and (inp.bank_statement_newer_pending
                                          or (used is not None and governing.id != used.id)
                                          or (used is None and governing.status == "pending")):
                flags.append("newer_upload_pending_review")
            if parsed:
                claim = f"annual revenue R{inp.revenue:,.0f} extracted from the approved bank statement (deposits not classified as customer revenue)"
                if transactions_reviewed is True and extraction_reconciled is True:
                    cond = Condition.TRANSACTIONS_REVIEWED_CUSTOMER_REVENUE
                    claim = f"annual customer revenue R{inp.revenue:,.0f}, deposits individually reviewed"
                elif extraction_reconciled is True:
                    cond = Condition.BANK_APPROVED_RECONCILED
                elif extraction_reconciled is False:
                    cond = Condition.CONFLICTING_OR_AMBIGUOUS
                    flags.append("extraction_did_not_reconcile")
                else:
                    cond = Condition.ADMIN_APPROVED
                    flags.append("extraction_reconciliation_not_available")
                if transactions_reviewed is not True:
                    flags.append("deposits_not_classified_as_customer_revenue")
                if declared_revenue and inp.revenue and \
                        abs(declared_revenue - inp.revenue) / max(declared_revenue, inp.revenue) \
                        > cfg.revenue_conflict_tolerance:
                    cond = Condition.CONFLICTING_OR_AMBIGUOUS
                    flags.append("declared_vs_bank_revenue_conflict")
                    prov["declared_revenue"] = declared_revenue
                collected, basis = _collected(used)
                out[factor] = finish(factor, claim, "bank_statement", "bank_observed", "verified", cond,
                                     flags=flags, collected=collected, basis=basis, provenance=prov,
                                     review_method=getattr(used, "review_method", None))
            else:
                if used is not None:
                    flags.append("approved_statement_without_parsed_revenue")
                out[factor] = finish(factor, f"annual revenue R{inp.revenue:,.0f} as declared", "declared",
                                     "declaration", "unverified", Condition.DECLARED_UNSUPPORTED,
                                     flags=flags, provenance=prov)

        elif factor in ("Invoice Timeliness", "Unpaid Invoice Ratio"):
            if inp.total_invoices == 0:
                out[factor] = finish(factor, "no invoices recorded", "invoice_records", "self_attested_records",
                                     "not_submitted", Condition.NOT_SUBMITTED, flags=["no_invoices"])
            else:
                claim = (f"{inp.paid_on_time} of {inp.total_invoices} invoices paid on time"
                         if factor == "Invoice Timeliness" else
                         f"{inp.unpaid_invoices} of {inp.total_invoices} invoices unpaid")
                out[factor] = finish(factor, claim, "invoice_records", "self_attested_records", "unverified",
                                     Condition.SELF_ATTESTED_RECORDS,
                                     flags=["business_entered_not_counterparty_confirmed"],
                                     provenance={"derivation": "business-entered invoices; paid time set by the server"})

        elif factor == "Business Age":
            out[factor] = finish(factor, f"{inp.years_active} years active, as declared", "declared",
                                 "declaration", "unverified", Condition.DECLARED_UNSUPPORTED,
                                 flags=["registration_does_not_establish_trading_history"],
                                 provenance={"derivation": "declared; never inferred from registration date"})

        elif factor == "Compliance Documents":
            docs, bands, flags = [], [], []
            for doc_type in COMPLIANCE_POINTS:
                v = latest.get(doc_type)
                if doc_type == "bank_statement" and bank_evidence is not None and bank_evidence.approved is not None:
                    v = bank_evidence.approved
                cond = _doc_condition(v)
                b = cfg.bands[cond]
                bands.append(b)
                collected, basis = _collected(v)
                docs.append({"doc_type": doc_type, "verification_status": _STATUS.get(v.status if v else None, "pending"),
                             "condition": cond.value, "confidence": b.value,
                             "verification_id": v.id if v is not None else None,
                             "collected_at": _iso(collected), "review_method": getattr(v, "review_method", None)})
                if cond is Condition.REJECTED:
                    flags.append(f"{doc_type}_rejected")
                if cond is Condition.UPLOADED_UNREVIEWED:
                    flags.append(f"{doc_type}_pending_review")
            best = _best(bands)
            any_approved = any(d["verification_status"] == "verified" for d in docs)
            cond = Condition.ADMIN_APPROVED if any_approved else (
                Condition.UPLOADED_UNREVIEWED if any(d["verification_status"] == "pending" for d in docs)
                else Condition.NOT_SUBMITTED)
            times = [d["collected_at"] for d in docs if d["collected_at"]]
            out[factor] = finish(factor, label or "compliance documents", "uploaded_document", "document_approved",
                                 "verified" if any_approved else "unverified", cond, flags=flags,
                                 needs_review=any(d["verification_status"] == "pending" for d in docs),
                                 collected=_aware(datetime.fromisoformat(max(times))) if times else None,
                                 basis="latest document timestamp", documents=docs, band=best)

        elif factor == "Intent Documents":
            docs, bands, flags = [], [], []
            for doc_type, det in (inp.intent_doc_details or {}).items():
                status = det.get("status")
                known = det.get("loi_counterparty_known")
                cond = {"approved": Condition.ADMIN_APPROVED, "rejected": Condition.REJECTED}.get(
                    status, Condition.UPLOADED_UNREVIEWED)
                if cond is Condition.ADMIN_APPROVED and doc_type == "letter_of_intent" and not known:
                    cond = Condition.CONFLICTING_OR_AMBIGUOUS
                    flags.append("counterparty_not_recognised")
                bands.append(cfg.bands[cond])
                docs.append({"doc_type": doc_type, "verification_status": _STATUS.get(status, "pending"),
                             "condition": cond.value, "confidence": cfg.bands[cond].value})
            if not docs:
                out[factor] = finish(factor, "no intent documents submitted", "uploaded_document",
                                     "document_approved", "not_submitted", Condition.NOT_SUBMITTED)
            else:
                cond = Condition.ADMIN_APPROVED if any(d["verification_status"] == "verified" for d in docs) \
                    else Condition.UPLOADED_UNREVIEWED
                out[factor] = finish(factor, label or "intent documents", "uploaded_document", "document_approved",
                                     "verified" if cond is Condition.ADMIN_APPROVED else "unverified", cond,
                                     flags=flags, documents=docs, band=_best(bands),
                                     needs_review=any(d["condition"] == Condition.CONFLICTING_OR_AMBIGUOUS.value for d in docs))

        elif factor == "Founder Signal":
            if inp.founder is None:
                out[factor] = finish(factor, "no founder profile", "declared", "declaration", "not_submitted",
                                     Condition.NOT_SUBMITTED, flags=["no_founder_profile"])
            else:
                out[factor] = finish(factor, "founder profile as declared", "declared", "declaration",
                                     "unverified", Condition.DECLARED_UNSUPPORTED)

        elif factor in ("Industry Risk", "Market Viability"):
            out[factor] = finish(factor, label or factor, "external_table", "external_reference", "not_applicable",
                                 Condition.EXTERNAL_REFERENCE, flags=["context_only_not_scored"],
                                 provenance={"derivation": "market reference table"})

        else:  # a factor this module does not know yet is reported, never silently skipped
            out[factor] = finish(factor, label or factor, "unknown", "unknown", "unverified",
                                 Condition.CONFLICTING_OR_AMBIGUOUS, flags=["factor_not_covered_by_evidence_rules"])
    return {k: v.to_dict() for k, v in out.items()}
