# Bank Statement Revenue Classification and Period Normalisation

Status: Phases 1 and 2 implemented as **pure modules, not wired into scoring, the parser, the database or the API**. The scoring formula and the existing bank-statement override are unchanged.

## 1. Problem (from docs/REVENUE_SCALE_COMPARISON.md)
1. The current parser reads a pre-labelled `parsed_revenue` figure; nothing says what it contains (sales vs loans, transfers, owner money).
2. The period covered by that figure is undefined.
3. An approved statement overrides declared revenue although approval of a document is not verification of its contents.

## 2. Phase 1: deposit classification (`services/deposit_classifier.py`)
Each credit is classified before any revenue is calculated.

| Category | Treatment |
|---|---|
| customer_sale | Included as revenue |
| loan | Excluded |
| owner_contribution | Excluded |
| internal_transfer | Excluded |
| refund_reversal | Excluded |
| unknown | Excluded, flagged `needs_review` |

Per transaction the record keeps: date, description, amount, category, confidence, source (`rule:<id>` / `conflict` / `default` / `manual:<reviewer>`), review status (`auto` / `needs_review` / `reviewed`).

Rules (`rules-v1`, ordered keyword rules, no ML):
- A deposit counts as revenue only when classified as a customer sale with confidence of at least 0.70 and not awaiting review.
- **Unknown never becomes revenue.** No matching rule means unknown plus review.
- A description matching both a sale rule and a non-sale rule (for example "LOAN REPAYMENT INVOICE") is a **conflict**: unknown plus review, never guessed.
- Several non-sale matches take a fixed most-specific precedence (owner, transfer, loan, refund); all are excluded anyway.
- A person's decision (`apply_review`) overrides the rules, requires a reviewer name and is recorded as `manual:<name>`.
- Debits and zero amounts are not deposits and are ignored.

Known limits of keyword rules (to be measured on real statements, not assumed solved): descriptions are free text and vary by bank; a customer whose name contains a keyword (for example "OWNER") will be sent to review rather than counted; wording such as "SALE OF EQUIPMENT" can match a sale rule. Rule-based first, ML only if labelled review decisions later justify it.

## 3. Phase 2: period normalisation (`services/revenue_normalisation.py`)
Input: classified deposits plus the statement's actual start and end dates. Output (`RevenueObservation`) keeps separate, never merged:

| Field | Meaning |
|---|---|
| total_deposits | every credit in the period |
| observed_customer_revenue | classified customer sales (rules and/or review) |
| reviewed_customer_revenue | the part a person confirmed |
| excluded_by_category | loans, owner contributions, transfers, refunds |
| unresolved_deposits | unknown or conflicting, excluded |
| months_covered, monthly_average | actual coverage, observed / months |
| annualised_run_rate | an **estimate** (observed x 12 / months), never actual annual revenue |
| basis | `observed_12_months`, `run_rate` or `not_reliable` |

An annual estimate is withheld (`not_reliable`) when the period is under 3 months or more than 25% of deposit value is unresolved. Transactions outside the stated period are ignored and counted. A period of about 12 months (11.5 to 12.5) is reported as observed, not as a run rate. Worked example: 1 Jan to 30 Apr, verified customer deposits R50,000, 4 months, monthly average R12,500, run rate R150,000.

## 4. Target evidence levels (design intent; not yet implemented)
The engine should eventually distinguish, instead of one `revenue` number:
1. Declared revenue (founder statement).
2. Bank-derived observed revenue (all deposits in the period).
3. Verified customer revenue (classified sales, review complete).
4. Estimated annualised revenue (run rate, labelled as an estimate).

Approval of a document and verification of its financial contents are separate states. Until levels 3 and 4 exist in the engine, the current override stays as is and this is recorded as a known gap.

## 5. Not in this milestone
- Phase 3 capture side: persisting classified transactions and `months_trading` / `revenue_period_months` (database, API, portal), with validation and backward compatibility.
- Extracting transactions from real statement PDFs (the current parser reads labelled fields only).
- Phase 4: duration-adjusted revenue under a new strategy version, compared against the 850-scenario regression, then calibrated on pilot outcomes.
