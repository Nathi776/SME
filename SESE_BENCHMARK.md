# SESE 2023 benchmark and revenue-scoring baseline

**Source:** Stats SA, Survey of Employers and the Self-employed (SESE) 2023, Jul-Sep 2023, 1,583 records, weighted.
Data used under Stats SA terms: acknowledge Stats SA, no resale, raw microdata not in this repository.

> **Population limitation (keep in every export).** SESE 2023 covers only businesses **not registered for VAT**
> (VAT-registered businesses ended the interview). Figures describe that population, not all South African SMEs,
> and are survey estimates for a single quarter.

## 1. Benchmark table

| Indicator | SESE 2023 | Implication for the engine |
|---|---|---|
| Neither income-tax nor CIPC registration | 92% | Do not penalise informality |
| Registered for income tax | 7.5% | Contextual evidence, not proof of viability |
| Registered with CIPC | 2% | Never a prerequisite for a positive viability result |
| Keep no financial records | 71% | Support alternative evidence |
| Informal sales/spending records | 13% | Recognise as evidence |
| Partial financial records | 9.5% | Credit proportionate to quality |
| Full financial records | 6.3% | Completeness is not viability |
| Formal business account | 25% | No bank account is not automatic failure |
| Borrowed to start | 17% (16% of those still repaying) | Record separately from viability |
| Employers | 14% | Separate from own-account |
| Business age | <1y 16%, 1-3y 23%, 3-5y 17%, 5-10y 21%, 10y+ 23% | Young businesses are common |
| Median 12-month turnover (traded all 12 months, n=1,111) | R14,400 | Annual figure; not comparable to part-year revenue |
| Turnover under R50k / R100k / R200k / R500k | 76% / 88% / 94% / 98% | Micro range dominates |

Not turned into weights: median turnover by record-keeping (none R10k, simple R30k, some R30k, full R55k) is association, not cause.

## 2. How revenue is scored today (inspected, unchanged)

- **Annual** revenue (UI label "Annual Revenue"); no months-trading input exists.
- **Verified over declared:** `scoring_service` uses the latest approved bank statement's `parsed_revenue`, else the declared figure. The parser keeps `months_analysed` but does not use it to annualise, so a short statement is read as a full year.
- **Linear, not tiered:** `min(revenue / 500,000, 1) x revenue_max`. Labels at R50k / R100k / R200k / R500k only.
- **Stage maxima:** startup 15, growth 20, established 25 (idea stage has no revenue factor). The same R500k ceiling applies to every stage.

## 3. Baseline (growth stage unless noted; 8/10 invoices on time, bank evidence approved)

| Turnover | Revenue pts /20 | Score | Decision |
|---|---|---|---|
| R5,000 | 0.2 | 42.8 | Declined |
| R10,000 | 0.4 | 43.0 | Declined |
| R15,000 | 0.6 | 43.1 | Declined |
| R25,000 | 1.0 | 43.5 | Declined |
| R50,000 | 2.0 | 44.5 | Declined |
| R75,000 | 3.0 | 45.4 | Declined |
| R100,000 | 4.0 | 46.4 | Declined |
| R250,000 | 10.0 | 52.1 | Review |
| R500,000 | 20 | 61.6 | Review |

Established stage behaves the same (R5k 42.2 -> R500k 64.7). Startup-like profile (1y, 3 invoices): 31.9 -> 50.8.

Reading: the factor is proportional and does not overwhelm other factors (R500k adds ~19 points, never reaches Approved alone), but it has almost no resolution where 76% of SESE businesses sit: R5k to R50k moves the score under 2 points. Revenue-only differences matter above R100k, a range holding about 12% of the surveyed population. The score is also silent on trading duration.

## 4. Proposed test bands (not Stats SA thresholds; no points assigned)

R0-10k, R10,001-25k, R25,001-50k, R50,001-100k, R100,001-250k, R250,001-500k, >R500k. Comparison against the current formula is the next step; the formula is unchanged in this change.

## 5. Tests added (`backend/tests/behavioral/`)

48 passed, 6 strict xfails recording gaps. Full suite: 373 passed, 9 xfailed; gold regression: no score changes.

| Gap | Test |
|---|---|
| Missing CIPC halves compliance credit in Funding Readiness: 46.4 vs 50.2, crosses the Review line though viability is equal | `test_informal_business_is_not_declined_where_equivalent_registered_one_is_not` |
| No input for informal sales/expenditure records | `test_informal_records_are_recognised_as_evidence` |
| Poor bank evidence leaves viability unchanged (gap 3) | `test_poor_bank_evidence_is_not_equal_to_no_bank_evidence` |
| Micro range resolution under 2 pts R5k-R50k | `test_micro_range_is_resolved_by_at_least_five_points` |
| No months-trading input | `test_trading_duration_is_an_input` |
| parsed_revenue not annualised by months_analysed | `test_parsed_revenue_is_annualised_using_months_analysed` |
