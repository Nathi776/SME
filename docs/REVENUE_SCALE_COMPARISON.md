# Revenue Scale Comparison (analysis only)

Status: **analysis only. Scoring formula, thresholds and production behaviour are unchanged.** The only
code change is two optional, unused `EvidencePackage` fields (`months_trading`, `revenue_period_months`).
Reproduce with `python backend/testing/revenue_scale_analysis.py` (needs `DATABASE_URL=sqlite:///./ci.db`).

Proposed bands are test bands, not Stats SA thresholds. SESE figures are non-VAT survey estimates
(about 76% of businesses below R50k, 88% below R100k, 98% below R500k annual turnover).

## 1. Findings

1. **Revenue is a large share of every scored stage**: Startup 16.5%, Growth 19.0%, Established 22.7% of applicable raw points; Idea 0% (factor not applicable). Weights differ by stage today and there is no reason to assume they should converge.
2. **The scale is strictly linear at 0.40 points per R10k (Growth)**, so differentiation grows with turnover, not with where businesses actually are. The whole R0–R50k range, where ~76% of SESE businesses sit, spans only 1.5 (Startup), 2.0 (Growth) and 2.5 (Established) revenue points, about 1.7–2.2 overall score points.
3. **Revenue rarely changes a decision inside the micro range.** Across 400 randomised profiles per stage, moving from R0 to R100k changed the decision in 0% (Startup), 4.8% (Growth) and 2.5% (Established) of cases. Moving from R0 to R500k changed it in 72%, 44% and 70%. Decision impact is concentrated above R100k, a segment of ~12% of SESE businesses, and above R500k (~2%).
4. **Numeric differences exist but are small and uniform in the micro range.** R10k vs R25k is 0.6 points (Growth). Whether that is meaningful differentiation or noise is a product decision; the data cannot say, because SESE has no outcome information.
5. **Labels, not points, are coarse.** `< R50k` covers three proposed bands, and the existing label boundaries (R50k/R100k/R200k/R500k) match the proposed bands only at R50k, R100k and R500k.
6. **Flat above R500k** (no differentiation of larger turnovers), and the same R500k ceiling applies in every stage.
7. **Rounding artefact**: Established shows +0.1 between R25,000 and R25,001 (1.2 to 1.3) purely from rounding to one decimal.

## 2. Is this good or bad?

Not decidable without outcomes. Low micro-range sensitivity is consistent with the fairness principle (informal micro-businesses are not marked down for being small) but means two micro-businesses are separated almost entirely by non-revenue factors. High sensitivity above R100k means a business with R500k turnover can gain 17 to 23 score points over R0 with every other input fixed, enough to flip the decision in a large share of cases. That is a defensible effect for larger firms but should be a conscious choice, not a by-product of a single linear ceiling.

## 3. Tables (generated)

## A. Points at band edges (revenue factor only)

### Idea (profile=IDEA, revenue factor applicable=False, revenue max=10, applicable raw max=65, revenue share of stage score=0.0%)

Revenue is not scored in this stage; all bands contribute 0.

### Startup (profile=STARTUP, revenue factor applicable=True, revenue max=15, applicable raw max=91, revenue share of stage score=16.5%)

| Revenue | Proposed band | Current label | Rev pts | Δ pts vs previous edge | Overall score |
|---|---|---|---|---|---|
| R0 | Very low | < R50k | 0 |  | 32.4 |
| R10,000 | Very low | < R50k | 0.3 | +0.3 | 32.7 |
| R10,001 | Lower micro | < R50k | 0.3 | +0.0 | 32.7 |
| R25,000 | Lower micro | < R50k | 0.8 | +0.5 | 33.3 |
| R25,001 | Upper lower-micro | < R50k | 0.8 | +0.0 | 33.3 |
| R50,000 | Upper lower-micro | R50k–R100k | 1.5 | +0.7 | 34.1 |
| R50,001 | Higher micro | R50k–R100k | 1.5 | +0.0 | 34.1 |
| R100,000 | Higher micro | R100k–R200k | 3.0 | +1.5 | 35.7 |
| R100,001 | Growing micro | R100k–R200k | 3.0 | +0.0 | 35.7 |
| R250,000 | Growing micro | R200k–R500k | 7.5 | +4.5 | 40.7 |
| R250,001 | Upper micro | R200k–R500k | 7.5 | +0.0 | 40.7 |
| R500,000 | Upper micro | ≥ R500k | 15 | +7.5 | 48.9 |
| R500,001 | Larger turnover | ≥ R500k | 15 | +0.0 | 48.9 |
| R1,000,000 | Larger turnover | ≥ R500k | 15 | +0.0 | 48.9 |

### Growth (profile=GROWTH, revenue factor applicable=True, revenue max=20, applicable raw max=105, revenue share of stage score=19.0%)

| Revenue | Proposed band | Current label | Rev pts | Δ pts vs previous edge | Overall score |
|---|---|---|---|---|---|
| R0 | Very low | < R50k | 0 |  | 49.9 |
| R10,000 | Very low | < R50k | 0.4 | +0.4 | 50.3 |
| R10,001 | Lower micro | < R50k | 0.4 | +0.0 | 50.3 |
| R25,000 | Lower micro | < R50k | 1.0 | +0.6 | 50.9 |
| R25,001 | Upper lower-micro | < R50k | 1.0 | +0.0 | 50.9 |
| R50,000 | Upper lower-micro | R50k–R100k | 2.0 | +1.0 | 51.8 |
| R50,001 | Higher micro | R50k–R100k | 2.0 | +0.0 | 51.8 |
| R100,000 | Higher micro | R100k–R200k | 4.0 | +2.0 | 53.7 |
| R100,001 | Growing micro | R100k–R200k | 4.0 | +0.0 | 53.7 |
| R250,000 | Growing micro | R200k–R500k | 10.0 | +6.0 | 59.4 |
| R250,001 | Upper micro | R200k–R500k | 10.0 | +0.0 | 59.4 |
| R500,000 | Upper micro | ≥ R500k | 20 | +10.0 | 69.0 |
| R500,001 | Larger turnover | ≥ R500k | 20 | +0.0 | 69.0 |
| R1,000,000 | Larger turnover | ≥ R500k | 20 | +0.0 | 69.0 |

### Established (profile=ESTABLISHED, revenue factor applicable=True, revenue max=25, applicable raw max=110, revenue share of stage score=22.7%)

| Revenue | Proposed band | Current label | Rev pts | Δ pts vs previous edge | Overall score |
|---|---|---|---|---|---|
| R0 | Very low | < R50k | 0 |  | 55.5 |
| R10,000 | Very low | < R50k | 0.5 | +0.5 | 55.9 |
| R10,001 | Lower micro | < R50k | 0.5 | +0.0 | 55.9 |
| R25,000 | Lower micro | < R50k | 1.2 | +0.7 | 56.5 |
| R25,001 | Upper lower-micro | < R50k | 1.3 | +0.1 | 56.6 |
| R50,000 | Upper lower-micro | R50k–R100k | 2.5 | +1.2 | 57.7 |
| R50,001 | Higher micro | R50k–R100k | 2.5 | +0.0 | 57.7 |
| R100,000 | Higher micro | R100k–R200k | 5.0 | +2.5 | 60.0 |
| R100,001 | Growing micro | R100k–R200k | 5.0 | +0.0 | 60.0 |
| R250,000 | Growing micro | R200k–R500k | 12.5 | +7.5 | 66.8 |
| R250,001 | Upper micro | R200k–R500k | 12.5 | +0.0 | 66.8 |
| R500,000 | Upper micro | ≥ R500k | 25 | +12.5 | 78.2 |
| R500,001 | Larger turnover | ≥ R500k | 25 | +0.0 | 78.2 |
| R1,000,000 | Larger turnover | ≥ R500k | 25 | +0.0 | 78.2 |

## B. Can revenue alone change the decision? (random other inputs, 400 profiles per stage)

| Stage | Decision changes R0→R100k | R0→R500k | Mean score gain R0→R100k | R0→R500k |
|---|---|---|---|---|
| Idea | 0.0% | 0.0% | 0.00 | 0.00 |
| Startup | 0.0% | 71.8% | 3.30 | 16.49 |
| Growth | 4.8% | 43.8% | 3.81 | 19.05 |
| Established | 2.5% | 70.0% | 4.55 | 22.73 |

## C. Micro range resolution (Growth stage, points per R10,000)

| Range | Points gained | Points per R10k |
|---|---|---|
| R0–R10,000 | 0.4 | 0.40 |
| R10,000–R25,000 | 0.6 | 0.40 |
| R25,000–R50,000 | 1.0 | 0.40 |
| R50,000–R100,000 | 2.0 | 0.40 |
| R100,000–R250,000 | 6.0 | 0.40 |
| R250,000–R500,000 | 10.0 | 0.40 |


## 4. Bank-statement revenue (issue 4)

Inspected `services/bank_statement_parser.py` and `services/scoring_service.py`:

- The parser **does not read transactions**. It regex-matches seven pre-labelled fields (`avg_monthly_income`, `parsed_revenue`, `months_analysed`, ...) from the document text. Nothing in the code separates sales from transfers, loans, owner contributions or refunds; whoever produced the `parsed_revenue` value decided that, and the engine cannot tell.
- The **period of `parsed_revenue` is undefined**. In the sample `synthetic_bank_statement.pdf`, `avg_monthly_income = 12500`, `months_analysed = 4`, `parsed_revenue = 150000`: 150000 equals 12 x 12500, so it appears to be annualised, but nothing states that, and nothing enforces it.
- `scoring_service` **replaces declared revenue with `parsed_revenue`** whenever an approved statement exists, so an unlabelled figure silently becomes the scored annual revenue.

Conclusion: bank-derived revenue must not feed annualisation until (a) the extraction step classifies deposits (sales vs non-sales) and reports both totals, and (b) the covered period is stored explicitly as `revenue_period_months`. Until then it should be treated as "bank deposits, unclassified".

## 5. Months-traded data model (decision implemented, effect deferred)

Added to `EvidencePackage`, both optional and unused by scoring:
- `months_trading`: months actually operated. Never inferred from registration date or `years_active`.
- `revenue_period_months`: months covered by the reported revenue.
- `revenue` continues to hold the reported figure unchanged.

Not yet done: persistence (DB columns, migration, API/portal capture) and `reported_revenue` naming. These need a decision on capture UX first.

Proposed rule (executable spec in `tests/behavioral/test_revenue_duration_adjustment.py`, not wired into the engine):
- Annualise only when both fields are present, the period does not exceed months traded, and the period is at least 3 months. 12-month figures are actuals; others are labelled run rate.
- Never assume a missing duration means 12 months. Never penalise youth by the factor alone.

## 6. Sample scenarios (Growth stage, other inputs fixed)

| Scenario | Reported | Period | Months traded | Proposed annualised | Basis | Current engine uses |
|---|---|---|---|---|---|---|
| Steady micro trader | R14,400 | 12 | 30 | R14,400 | actual | R14,400 |
| Young, 6 months | R7,200 | 6 | 6 | R14,400 | run rate | R7,200 |
| Young, 6 months, strong | R12,000 | 6 | 6 | R24,000 | run rate | R12,000 |
| Duration unknown | R14,400 | ? | ? | none | not reliable | R14,400 |
| Impossible (12 months of figures, 6 traded) | R30,000 | 12 | 6 | none | not reliable | R30,000 |

Today the young trader's R7,200 scores half what the same pace would score over a full year (0.3 vs 0.6 revenue points in Growth), which is the distortion months_trading is meant to remove.

## 7. Recommendation

1. Keep the formula as is for now. No evidence supports specific new weights.
2. Do not adopt the proposed bands as scoring tiers yet. Use them for **reporting labels** first, since the label gap (finding 5) is cheap and risk free.
3. Decide per stage, explicitly, whether revenue should carry the same weight (finding 1) and whether the ceiling should be above R500k.
4. Fix the data first: classify bank deposits, store the covered period, then persist `months_trading` / `revenue_period_months` with capture in the portal.
5. Only then trial duration-adjusted revenue behind a new strategy version (v3), with the gold dataset regenerated deliberately and old assessments left on v2.
6. Any threshold choice must eventually be calibrated on pilot check-in outcomes, not on SESE statistics.
