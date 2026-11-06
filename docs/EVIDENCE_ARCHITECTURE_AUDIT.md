# Evidence Architecture Audit

Scope: does each assessment factor record where its evidence came from, what kind it is, whether it was verified, how reliable it is, which score it affects, when it was collected and how it was derived. **Audit only: no scoring, schema or behaviour was changed.** Baseline: docs/BASELINE.md (commit 959c34a, strategy v2).

Key question: *can the engine explain why it gave a score, not merely return a number?* Answer today: **it can explain how many points each factor contributed and what inputs were used, but not how much to trust each input.** The pieces for a full explanation (stored inputs, per-factor breakdown, versions, market-data fingerprint) exist; the trust information (type, verification, confidence, time, derivation per factor) mostly does not.

## 1. What is recorded today
- Each assessment writes an `AssessmentSnapshot` with: inputs (`input_snapshot`), per-factor `factor_breakdown`, `strategy_version`, `inference_version`, `market_context` (including the market-data version), recommendations, and the three outputs (`score` = Funding Readiness, `viability_score`, `evidence_depth` = Evidence Confidence). Inputs plus versions appear sufficient to recompute a score with the same engine version (not re-verified in this audit).
- A `BusinessObservation` is written at the same time, with a coarse `source` and the id of the approved bank-statement `Verification` the bank signals came from.
- Each factor's breakdown carries `value`, `label`, `contribution`, `max`, `applicable`, plus factor-specific extras.

## 2. Seven-field matrix (Yes / Partial / No)

| Factor | Source | Evidence type | Verification status | Confidence | Impact | Timestamp | Provenance |
|---|---|---|---|---|---|---|---|
| Revenue Tier | Partial (`parsed` / `self-reported`) | Partial (same label) | Partial (implied) | No | Yes | No | Partial (verification id on snapshot; see F1) |
| Invoice Timeliness | No | No | No | No | Yes | No | No |
| Unpaid Invoice Ratio | No | No | No | No | Yes | No | No |
| Business Age | No (declared years_active) | No | No | No | Yes | No | No |
| Industry Risk (context) | Yes (sector table) | Yes (external data) | n/a | No | Yes (0 points, stated) | Partial (table version) | Yes (data version and fingerprint) |
| Market Viability (context) | Yes (province table) | Yes | n/a | No | Yes (0 points, stated) | Partial | Yes |
| Compliance Documents | Yes (document types) | Yes (documents) | Partial (see F4) | Partial (bank quality) | Yes | No (see F5) | Partial |
| Intent Documents | Yes | Yes | Partial | No | Yes | No | Partial (counterparty-known flag stored) |
| Founder Signal | No (declared profile) | No | No | No | Yes | No | No |

Cross-cutting: Evidence Confidence is a single aggregate (base 10 plus approved documents, founder profile, intent documents). It is not built from per-factor confidence, and invoice evidence adds nothing to it.

## 3. Findings

**F1 (bug, demonstrated). Revenue provenance can contradict itself.** If an approved bank statement exists but carries no parsed revenue or months analysed, revenue falls back to the declared figure. The engine then labels the factor `self-reported`, while the snapshot's `revenue_source` says `verified_bank_statement` (it keys off the verification id alone). A lender reading the snapshot would be told the revenue was verified when it was declared. Fix is small and does not change scores.

**F2. Revenue has no recorded period or kind.** `parsed_revenue` has no period; whether it contains sales or all deposits is unknown (docs/BANK_REVENUE_CLASSIFICATION_SPEC.md). The classifier and normaliser address this but are not wired in.

**F3. No per-factor evidence record.** Type (declaration, bank-observed, verified document), confidence and collection time are not stored per factor. Explanations can say what contributed, not how reliable it was.

**F4. Rejected, pending and absent documents look the same in the breakdown.** All are listed under `missing`, but scores differ: rejected scores far lower than pending or absent, which score identically (Compliance factor, same other inputs; for example 3.5 versus 11.0 of 22 with three document types, exact values depend on which document types are submitted). The rule is deliberate (missing is not the same as rejected) but the explanation does not show it, so a reader cannot tell why two "0 of 4 verified" businesses scored differently.

**F5. No evidence timestamps or staleness.** The observation's `observed_at` is the assessment time, not when evidence was collected. Document `submitted_at` and `reviewed_at` exist on `Verification` but are not copied into the snapshot, and the engine has no staleness rule (an old approved statement counts like a new one).

**F6. Declared and verified inputs are not labelled; invoice evidence is entirely self-attested (code checked).** Years active, industry, founder profile and invoice data are self-supplied and unlabelled. Checked in `routers/invoice_router.py`: only the owning SME can create, update, mark paid or delete an invoice; lenders and admins can only read. The paid timestamp is set by the server, so lateness cannot be backdated, but the business sets the invoice, its due date and when it is marked paid, and nothing verifies the invoice (an uploaded PDF is stored but not checked, and no counterparty confirms it). Invoice Timeliness and Unpaid Invoice Ratio carry 28 of 125 points in Growth and 37 of 125 in Established, so a large share of the score rests on unverified self-reported records. This is a limitation to state plainly to partners, not a bug.

**F7. Reviewer accountability is thin.** `Verification` has `reviewed_at` and free-text `reviewer_notes` but no reviewer identity. Manual review decisions should be attributable (also required by the evaluation acceptance criteria).

**F8. Observation source is coarse.** Observations created by scoring are all `source="assessment"` regardless of what the values came from.

## 3a. Verification of this audit (second review)
Re-checked against the code at commit 882bd1e: baseline test and regression numbers reproduce (471 passed, 1 skipped, 9 xfailed; 850/850, no drift). F1 reproduced: with a bank-statement verification id but no parsed revenue or months analysed, the engine labels revenue `self-reported` while the snapshot's `revenue_source` (set in `services/scoring_service.py` from the verification id alone) says `verified_bank_statement`. F4 reproduced qualitatively (absent equals pending, rejected much lower). F6 resolved as above. F7 not re-checked.

## 4. Strengths
Versioned strategy and inference, market-data version and fingerprint, stored inputs and breakdown, bank-statement evidence selection (latest approved wins, newer pending flagged), context-only factors clearly marked, three outputs kept separate, outcome labels written once at the 12-month check-in.

## 5. Recommendations (each additive; none changes a score)
1. Fix F1: derive `revenue_source` from the same condition as the engine factor. Add a test that the two always agree.
2. Show document status per type in the breakdown (approved / pending / rejected / not submitted) so F4 is explained.
3. Design a per-factor `evidence` object (source, type, status, confidence band, collected_at, derivation) stored alongside `factor_breakdown`. Design it before building the explanation report, since the report depends on it. Confidence should be a documented rule or band, not a new calculated number presented as precise.
4. Copy document timestamps into the snapshot; decide a staleness policy as a separate, explicit decision.
5. Label declared inputs as declared; audit who can set invoice status (F6).
6. Add reviewer identity to verification decisions (F7).
7. Then build the decision-explanation report on top of 2 and 3, keeping viability, funding readiness and evidence confidence separate and not describing a thinly documented business as unviable.

Not recommended now: new scoring factors, calibrating weights, wiring the extractor into production.
