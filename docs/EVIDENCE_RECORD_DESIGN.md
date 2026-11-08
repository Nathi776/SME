# Per-Factor Evidence Record and Decision Explanation: Design

Status: **design for review. Nothing here is built.** It answers audit findings F3 to F8 (docs/EVIDENCE_ARCHITECTURE_AUDIT.md). It changes no score, weight or threshold.

## 1. Principles
1. Additive: new fields are stored alongside the existing `factor_breakdown`; scoring code is untouched.
2. Confidence is a **documented band** from a rule table, not a calculated number that looks precise.
3. Three outputs stay separate: Funding Readiness, Viability Score, Evidence Confidence. A thinly documented business is described as "limited evidence", never "unviable".
4. Declared stays declared. An approved document is not the same as verified contents.
5. Old snapshots are not rewritten; they read as `evidence: not recorded`.

## 2. The evidence record (one per factor, stored in the snapshot JSON)
| Field | Values / meaning |
|---|---|
| `source` | `declared`, `bank_statement`, `uploaded_document`, `invoice_records`, `external_table`, `system_derived` |
| `evidence_type` | `declaration`, `bank_observed`, `document_approved`, `self_attested_records`, `external_reference` |
| `verification_status` | `verified`, `unverified`, `pending`, `rejected`, `not_submitted`, `not_applicable` |
| `confidence_band` | `high`, `medium`, `low`, `none` (rule table below) |
| `impact` | factor, points, max, and share of the stage's scored maximum |
| `collected_at` | when the evidence was supplied or reviewed, plus which timestamp it came from; `null` when unknown |
| `derivation` | one line on how the value was produced, with ids (verification id, invoice count, table version) |
| `reviewer` | who approved or rejected a document (needs F7 first) |

`evidence_schema_version: 1` is stored beside it.

## 3. Proposed band rules (starting point, to be agreed)
| Factor | Condition | Type / status | Band |
|---|---|---|---|
| Revenue Tier | approved statement and parsed (months analysed set) | bank_observed / verified | medium (high only once deposits are classified and the period stored) |
| | declared only | declaration / unverified | low |
| Invoice Timeliness, Unpaid Ratio | business-entered invoices | self_attested_records / unverified | low (higher only with counterparty confirmation, not planned) |
| Business Age | declared years | declaration / unverified | low (medium with CIPC approved) |
| Compliance Documents | each document type | document_approved: verified / pending / rejected / not_submitted | high for approved, none for others |
| Intent Documents | approved with counterparty known | document_approved / verified | medium |
| Founder Signal | declared profile | declaration / unverified | low |
| Industry Risk, Market Viability | context tables | external_reference / not_applicable | n/a (0 points, stated) |

Per-document status (F4) is shown for Compliance so that "absent", "pending" and "rejected" are distinguishable in any explanation.

## 4. Decision-explanation report (built on the record)
Sections, in order: (1) three outputs, each with its own plain statement; (2) factor table (points, max, evidence type, status, band); (3) positive indicators; (4) negative indicators; (5) missing or conflicting evidence (for example declared revenue versus bank evidence, once cross-checking exists); (6) what would raise Evidence Confidence; (7) recommendations; (8) versions and data used (strategy, inference, market data, evidence schema); (9) a limitations statement that no predictive accuracy is claimed.

Wording rules: limited evidence is reported as limited evidence; Funding Readiness is described as readiness for a lender's review, not as business quality; context-only factors are labelled as not scored.

## 5. Open decisions (yours)
1. Confidence band rules in section 3, especially whether an approved bank statement is `medium` or `high`.
2. Staleness policy (how old can evidence be before it is flagged), or leave unflagged for the pilot.
3. Whether invoices should ever gain counterparty confirmation, or stay low-confidence permanently.
4. Whether the report is shown to the SME, to lenders, or both, and with the same detail.

## 6. Build order (each step separately reviewed and tested)
0. Prerequisites (**done**): reviewer identity (`reviewed_by_user_id`, `review_method`, migration 031; identity is stored but not exposed to the business; decisions made before this change stay NULL, not back-filled) and document submit/review timestamps copied into each snapshot as `input_snapshot.evidence_timestamps` (latest record per document type, plus the bank statement actually used). Neither affects any score.
1. Pure `build_evidence_records(inputs, breakdown)` function with a test per factor and per rule row. No persistence.
2. Store the records in the snapshot JSON with `evidence_schema_version`; test that scores and regression are unchanged.
3. Explanation report endpoint and a portal view.
4. Tests that the report never labels limited evidence as unviable and keeps the three outputs separate.

Acceptance: 850-scenario regression unchanged at every step; every factor has a record; no record claims `verified` for a declared value.
