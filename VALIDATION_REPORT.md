# Technical validation report: assessment engine (sprint 1)

Date: 2026-11-04. Scope: the current `main` branch. This report says what the engine is, what was re-run,
what was found, and what is still unproven.

## 1. What the system is

The assessment engine (`backend/core/assessment_engine.py`, `core/scoring.py`) is a **rule-based, weighted
scoring model**. Nothing in the backend is trained from data: no model files, no fitting code, no
machine-learning libraries in use. The three outputs (Viability Score, Funding Readiness, Evidence
Confidence) are deterministic functions of the inputs, the market tables, and hand-chosen weights.

So today the product should be described as an *explainable assessment engine*, **not** as machine
learning and not as a predictor of repayment or survival. The data that could support a learned
component (check-in outcomes, y1 to y5 labels) is being collected but does not yet exist in volume.

## 2. What was re-run on the current code

| Check | Result |
|---|---|
| 850 gold scenarios (`testing/regression_runner.py`) | 850 / 850 pass; stage inference 100% in all four stages |
| Behavioural suite (monotonicity, sensitivity, stability, adversarial) | 17 / 17 pass |
| Full backend suite | all pass (see CI) |

**Limits of those numbers.** The gold scenarios' expected values and the saved regression baseline were
written from this same engine, so "100%" means *the engine still behaves as it did*, not *it is
correct*. They protect against accidental change; they are not evidence of validity.

## 3. New validation tests (`backend/tests/validation/`)

Four tests pass (noise stability, late payment worse than no history, weak founder never above unknown
founder, more documents never lowers evidence confidence). Six tests are `xfail(strict=True)`, each
recording a gap below. When a gap is fixed its test will start passing, the strict marker will fail the
run, and the marker should be removed.

## 4. Gaps found (status after strategy v2)

| # | Finding | Evidence (baseline: growth-stage tech SME, score 57.6 under v1) |
|---|---|---|
| 1 | **FIXED in v2.** **Province changes the funding decision on its own.** | Northern Cape scores 5.6 points below Gauteng for an identical business. In 30 of 117 scanned profiles the decision differs (e.g. Review vs Declined). Sector shows a similar 5.6-point spread. This comes from the market tables by design, but it is a fairness question that needs an explicit decision. |
| 2 | **FIXED in v2.** **Missing evidence is treated as negative evidence.** | No bank statement and a *rejected* bank statement both score 49.2 (Declined). |
| 3 | **OPEN.** **Bad evidence beats no evidence.** | A statement showing 8 overdrafts and 0.2 income regularity scores 54.8 (Review), above 49.2 with no statement. It rewards uploading anything. |
| 4 | **OPEN.** **Declared revenue is never cross-checked.** | Raising declared revenue tenfold raises the score from 57.6 to 68.8 with nothing to support it. Bank-derived revenue exists on the SME record but the engine does not take it as an input. |
| 5 | **PARTLY FIXED in v2.** **Informal businesses are penalised.** | A seller with a verified, regular bank statement and 3 years of trading but no CIPC registration scores 49.5 and is Declined; with no documents at all, 41.8. |
| 6 | **OPEN.** **Overdraft sensitivity saturates.** | 2, 5 and 10 overdrafts all give 56.2. |

Not found: instability (a plus or minus 1% change in revenue moves the score by about 0.2) and no
single input that breaks the engine.

## 4a. Engine principles adopted (strategy v2, 2026-11-04)

Decided by the product owner and now enforced by tests:

1. **Province and sector are context, not decision drivers.** They remain in the breakdown
   (`contextual: true`) and in explanations, but contribute 0 points to the score, the Viability Score
   and the decision, and no longer appear as recommendation targets. They may be reinstated only when
   backed by sufficiently granular, relevant and verifiable evidence.
2. **Informality is not penalised automatically.** The Viability Score is identical with or without CIPC
   registration. A document that is missing or pending earns neutral half credit in Funding Readiness
   and lowers Evidence Confidence; a document that was reviewed and rejected earns nothing.
3. Viability, evidence confidence and regulatory compliance stay separate measures.

**Effect on the 850 gold scenarios:** 51 scenarios (6%) change decision (34 Declined to Review,
10 Review to Declined, 6 Review to Approved, 1 Approved to Review); mean score change +1.7, range
-12.6 to +11.9. The three borderline Construction scenarios whose expected result was "Declined because
of the sector" now expect "Review". Gold baseline regenerated; strategy version bumped to `v2` so old
and new snapshots are never mixed in calibration.

**Residual (gap 5):** a sound informal seller can still land just under the Review line, because
verified documents earn full credit and unverified ones half. Whether half credit is the right neutral
value, or whether registration should count only where legally required, is still to be decided.

Also fixed along the way: recommendation impact points were measured against a fixed 140-point basis
even though the score is normalised by the points available to that business, which understated
impact for idea-stage businesses; they now use the same basis as the score.

## 5. Not yet done

- **Public datasets (FinMark MSME, Stats SA SESE):** not yet inspected. Their variables, licences, and
  whether they hold any business-level outcome are unknown. The World Bank data was inspected earlier;
  it is research-only and holds no repayment outcomes.
- **Independent scenario review:** the five scenarios in the proposed plan (informal seller, startup
  with a purchase commitment, indebted established firm, strong founder with an untested market,
  revenue contradicted by bank evidence) should each be assessed by a person with a written rubric and
  compared with the engine. Gaps 4 and 5 already show scenarios A and E would fail.
- **Fraud indicators and fairness beyond province** (no demographic inputs exist; only province and
  sector were tested).

## 6. Decisions needed before changing the engine

Gaps 3, 4 and 6 are still open and need owner decisions: how bad bank evidence should compare with
none, whether declared revenue must be reconciled with bank-derived revenue, and how steeply repeated
overdrafts should count.
