# Technical Baseline

Reference point for every later change. Nothing here is a validated accuracy claim. Regenerate the generated parts with
`DATABASE_URL=sqlite:///./ci.db python backend/testing/generate_baseline.py` (reads the live code) and compare.

## 1. Version and test results
```
commit: 959c34aeb86ed1d50572661b70e23324f90ce094  (2026-11-06)
engine strategy version: v2
market data version: 2025.10.1
deposit classifier: rules-v2 (min sale confidence 0.7, low-confidence below 0.8, strong sale 0.9)
normalisation: min months to annualise 3, max unresolved share 0.25, 12-month tolerance (11.5, 12.5)

```
Recorded 2026-11-06 on that commit:

| Check | Result |
|---|---|
| Full backend suite (`pytest`) | 471 passed, 1 skipped, 9 xfailed (3 min 46 s) |
| Gold regression (850 scenarios) | 850 passed, 0 failed, no score changes vs stored baseline |
| Reproduce | `cd backend && DATABASE_URL=sqlite:///./ci.db python -m pytest -q` and `python testing/regression_runner.py` (then `git checkout -- testing/validation_report*`) |

## 2. Assessment weights, thresholds, rules (generated from code)
## Stage weights (max points)

| Stage | revenue | timeliness | age | unpaid | industry | market | compliance | intent | founder | raw_max | context-only |
|---|---|---|---|---|---|---|---|---|---|---|---|
| idea | 10 | 5 | 5 | 3 | 12 | 15 | 20 | 20 | 20 | 110 | industry+market = 27; scored max 83 |
| startup | 15 | 8 | 8 | 5 | 12 | 12 | 22 | 16 | 17 | 115 | industry+market = 24; scored max 91 |
| growth | 20 | 18 | 10 | 10 | 10 | 10 | 22 | 10 | 15 | 125 | industry+market = 20; scored max 105 |
| established | 25 | 25 | 10 | 12 | 8 | 7 | 20 | 8 | 10 | 125 | industry+market = 15; scored max 110 |

Viability factors: Revenue Tier, Invoice Timeliness, Unpaid Invoice Ratio, Business Age, Industry Risk, Market Viability, Intent Documents, Founder Signal

## Deposit rules

- `loan.keyword` -> loan (0.9): `\b(LOAN|CREDIT ADVANCE|CASH ADVANCE|MICROLOAN|MICRO LOAN|FINANCE ADVANCE|OVERDRAFT FACILITY|LENDER|DISBURSEMENT)\b`
- `owner.strong` -> owner_contribution (0.9): `\b((OWNER|DIRECTOR|SHAREHOLDER|MEMBER)'?S? (CAPITAL|CONTRIBUTION|FUNDING|INJECTION|LOAN|INVESTMENT|DEPOSIT)|CAPITAL (INJECTION|CONTRIBUTION)|DRAWINGS? REPAY|PERSONAL (ACC|ACCOUNT)|OWN CONTRIBUTION)\b`
- `transfer.keyword` -> internal_transfer (0.9): `\b(OWN ACC(OUNT)?|INTER[- ]?ACC(OUNT)?|BETWEEN ACC(OUNT)?S?|SAVINGS? TRANSFER|TRANSFER FROM (SAVINGS?|CURRENT|CHEQUE|CREDIT CARD)|TFR FROM (SAV|CUR|CHQ)|ACCOUNT TRANSFER|IB TRANSFER FROM (SAV|CUR))\b`
- `refund.keyword` -> refund_reversal (0.9): `\b(REFUND|REVERSAL|REVERSED|RETURNED|CHARGEBACK|CHARGE BACK|UNPAID DEBIT|REBATE|RTD)\b`
- `sale.processor` -> customer_sale (0.9): `\b(YOCO|SNAPSCAN|ZAPPER|PAYFAST|PAYSTACK|PEACH PAYMENTS|IKHOKHA|SUMUP|CARD SETTLEMENT|POS SETTLEMENT|MERCHANT SETTLEMENT)\b`
- `sale.invoice` -> customer_sale (0.9): `\b(INV|INVOICE|INV(OICE)? ?(NO|#)?\s?\d+)\b`
- `sale.customer` -> customer_sale (0.75): `\b(CUSTOMER|CLIENT|PAYMENT FROM|PMT FROM|PAYMENT RECEIVED)\b`
- weak owner word (review only): `\b(OWNER|DIRECTOR|SHAREHOLDER|MEMBER)'?S?\b`


Notes:
- Industry Risk and Market Viability are **context-only**: they carry 0 points in every stage. Their nominal weights remain in the strategy table but are not scored, so the effective maximum is the "scored max".
- Decision thresholds (`core/scoring.py::determine_decision`): score >= 75 Approved, >= 50 Review, otherwise Declined.
- Stage inference (`ProfileInferenceService`, evaluated in order): Established if years_active >= 3 or invoices >= 20; Growth if years_active >= 1 with invoices or a bank statement; Startup if CIPC verified, years_active >= 1 or a bank statement; otherwise Idea.
- Business-age points: 5+ years full, 2-4 years 0.60, 1 year 0.30 (of the age factor).
- Revenue: annual figure, linear to R500,000, flat above, same scale in every stage where it applies; Idea does not score it. See docs/REVENUE_SCALE_COMPARISON.md.
- Documents: approved = full points, missing or pending = half, rejected = zero. Evidence Confidence is a separate additive score (base 10 plus verified documents, founder profile, intent documents).
- Three outputs are separate: Funding Readiness (`score`), Viability Score, Evidence Confidence.

## 3. Revenue normalisation (standalone, not wired in)
Observed customer revenue, reviewed revenue, excluded amounts and unresolved deposits are kept apart. A run-rate is withheld when the period is under 3 months or more than 25% of deposit value is unresolved; a period of 11.5 to 12.5 months is reported as observed. See docs/BANK_REVENUE_CLASSIFICATION_SPEC.md. The transaction extractor, the classifier and the normaliser are **not connected** to the parser, scoring, the engine, the database or the API.

## 4. Known limitations (all recorded as strict xfail tests where testable)
1. Poor bank behaviour (irregular income, overdrafts) can score no worse than submitting no statement (gap 3); more than two overdrafts have no further effect (gap 6).
2. Declared revenue is never cross-checked against bank evidence (gap 4).
3. Parsed revenue has no recorded period; months_analysed is never used to annualise.
4. The micro-range (below about R50k) is barely separated by the revenue factor; the duration fields (`months_trading`, `revenue_period_months`) exist but do not affect scoring.
5. Informal sales and expenditure records have no input channel and cannot raise confidence.
6. A business without CIPC earns half compliance credit, so Funding Readiness can still differ from an otherwise equal registered business (viability is equal).
7. Deposit classifier: keyword rules frozen at rules-v2; synthetic precision 10/10 and recall 10/11 are development results for a layout designed with the extractor, not real-world accuracy. No categories for asset disposal, customer refund or other non-revenue deposits. Refunds paid out (debits) do not yet reduce revenue (decision: net them; not implemented).
8. Extractor: text-layer PDFs in one synthetic layout only.
9. The weights and thresholds are expert-set rules. No outcome data exists, so nothing is calibrated and **no predictive accuracy is claimed**. Public datasets (SESE, WBES) have no repayment or survival outcomes and are not scoring weights. WBES benchmark data is research-only and git-ignored.
10. The pilot has not yet produced outcome labels.

Open by decision: half-credit value for missing documents; lender self-registration approval (deferred); persistence/API/portal capture of the duration fields; refund netting.
