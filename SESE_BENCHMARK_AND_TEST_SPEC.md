# SESE 2023 Benchmark Table and Test Specification

Status: benchmark and tests only. **The scoring formula, weights and thresholds are unchanged.**

## 1. Limitations (carry into every report or export)
- Population: businesses in the Stats SA SESE 2023 **non-VAT-registered** population, not all South African SMEs.
- Figures are survey estimates (weighted), not exact counts, and cover a single reference period.
- Annual turnover is a survey-reported figure; the R14,400 median applies only to businesses that operated all 12 months.
- No repayment or survival outcomes exist in SESE. These statistics are context for testing, **not scoring weights**, and record-keeping vs turnover differences are correlations, not causes.

## 2. Benchmark table
| Indicator | SESE 2023 | Implication for SME Intelligence |
|---|---|---|
| No income-tax or CIPC registration | 92% | Do not automatically penalise informality |
| Registered for income tax | 7.5% | Contextual evidence, not proof of viability |
| Registered with CIPC | 2% | Not a prerequisite for a positive assessment |
| Keep no financial records | 71% | Support alternative evidence |
| Informal sales/spending records | 13% | Recognise informal records |
| Partial financial records | 9.5% | Credit proportionate to quality |
| Full financial records | 6.3% | Evidence completeness is not viability |
| Formal business account | 25% | Absence is not automatic failure |
| Borrowed to start | 17% | Record funding history separately |
| Employers | 14% | Distinguish from own-account businesses |

| Annual turnover | Share of businesses |
|---|---|
| Below R50,000 | 76% |
| Below R100,000 | 88% |
| Below R500,000 | 98% |

Median annual turnover (12-month traders): ~R14,400.

Proposed **test** bands (not Stats SA thresholds, no points assigned): R0–10k, 10–25k, 25–50k, 50–100k, 100–250k, 250–500k, above 500k.

## 3. Current revenue scoring baseline (inspected, unchanged)
- Revenue is an **annual** figure (declared, or from an approved parsed bank statement; labelled `parsed` / `self-reported`).
- Scored **linearly**: `min(revenue / R500,000, 1) × stage revenue_max` (Startup 15, Growth 20, others per stage table). Flat above R500k.
- The same R500k scale applies in every stage where the factor applies; the **Idea stage drops the factor entirely**.
- Labels are coarse: `< R50k`, R50–100k, R100–200k, R200–500k, `≥ R500k`. About 76% of the SESE population sits in the single `< R50k` label, although points still differ continuously (R10k = 0.3 pts vs R25k = 0.8 pts at Startup).
- **No trading-duration adjustment**: `EvidencePackage` has no months-traded field, so a young business's revenue cannot be annualised before comparison with the R14,400 full-year median, and the engine cannot yet tell a half-year trader from a full-year one. Risk: young businesses compare unfavourably only through the Business Age factor and the unadjusted revenue.
- Existing coverage: monotonicity (`test_monotonicity`), tier-boundary continuity (`test_stability`), sensitivity, adversarial inputs.

## 4. Tests added (`backend/tests/behavioral/`)
| Module | Checks |
|---|---|
| `test_informality_fairness.py` | Missing CIPC / tax registration does not change viability; informal trading earns credit; missing docs beat rejected docs; registration without trading is not highly viable |
| `test_alternative_evidence.py` | Evidence-confidence ladder ordering; informal evidence not treated as nonexistent; no certainty without documents |
| `test_micro_business_revenue.py` | R5k to R500k monotonic and distinguishable in points; revenue cannot dominate or rescue unpaid invoices; baseline linearity, cross-stage consistency, Idea-stage exclusion |
| `test_market_context_neutrality.py` | Province and sector do not change score, viability, confidence or decision; context factors carry zero points |

Known gaps recorded as strict xfail (not fixed, formula untouched):
1. Lower micro-range labels are not distinguished (`< R50k`).
2. No trading-duration field for annualising revenue.

## 5. Baseline results
- Full backend suite: 366 passed, 1 skipped, 5 xfailed (3 earlier engine gaps + the 2 above).
- Behavioural suite: 42 passed, 2 xfailed.
- Gold regression (850 scenarios): all assertions passed, no score changes vs baseline; profile inference and recommendation accuracy 100%.

## 6. Next step (not done)
Compare the proposed bands against the current linear scale across the four stages, and decide whether to add a months-traded field, before any change to the formula. Any change should bump the strategy version and update the gold baseline deliberately.
