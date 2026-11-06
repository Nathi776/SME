# Bank Statement Evaluation Set: Format, Methodology and Data Protection

Status: specification and blank templates only. No real statement is in this repository. The classifier rules (`rules-v2`) and the extractor are frozen and unwired while this set is built.

## 1. Files
| File | Contents |
|---|---|
| `docs/evaluation/transactions_template.csv` | one row per transaction (header only) |
| `docs/evaluation/statement_manifest_template.csv` | one row per statement (header only) |
| `docs/BANK_STATEMENT_LABELLING_GUIDE.md` | label definitions and rules |

Real data lives **outside the repository** (the path `evaluation_data/` is git-ignored as a safety net). Original statements are stored separately from the labelled set.

## 2. Transaction file columns
`statement_id, bank_name, account_type, transaction_id, transaction_date, description, debit, credit, balance, transaction_direction, ground_truth_label, confidence, evidence_notes, linked_transaction_id, reviewer_id, review_date, review_status`

| Column | Notes |
|---|---|
| statement_id | pseudonymous (for example `S-0001`), never an account number |
| bank_name, account_type | layout grouping (business current, cheque, savings...) |
| transaction_id | unique within the statement, in printed order |
| description | exact original text |
| debit / credit / balance | decimals as printed, `.` decimal point, no thousands separator; one of debit/credit filled |
| transaction_direction | `CREDIT` or `DEBIT` |
| ground_truth_label | one of the nine labels, or `NOT_APPLICABLE` for a debit that is not a refund |
| confidence | reviewer certainty: `high`, `medium`, `low` |
| evidence_notes | short, no personal data |
| linked_transaction_id | for a refund, the original sale if known |
| review_status | `labelled`, `disputed`, `resolved`, `unresolved` |

## 3. Statement manifest columns
`statement_id, bank_name, layout_id, period_start, period_end, pages, transaction_count, opening_balance, closing_balance, reconciliation_result, extraction_status, redaction_status, evaluation_permission, permission_date, split`

`reconciliation_result`: `reconciles` / `difference:<amount>`. `extraction_status`: `ok`, `failed:<reason>`. `redaction_status`: `redacted_verified`, `pending`. `evaluation_permission`: `granted` only with written permission recorded; rows without it are not used. `split`: `development` or `test`.

## 4. Methodology
Extraction and classification are evaluated separately.

| Evaluation | Metrics |
|---|---|
| PDF extraction | row-level accuracy, date and amount accuracy, reconciliation rate, failures reported per layout |
| Deposit classification | precision, recall and F1 per label |
| Revenue calculation | absolute and percentage error against human-labelled **net** customer revenue (sales minus confirmed refunds) |
| Human review | share of deposits sent to review, reviewer disagreement rate |

- **Split by statement, never by transaction.** All transactions of one statement go to development or to test, so the test set is untouched by rule tuning.
- The test split is used once per rules version and is never used to tune rules.
- Proposed initial target: at least 100 labelled statements from three or more banks, across layouts, volumes and business types, if access permits. This is a planning target, not a statistical guarantee; report confidence intervals for the metrics.
- Report results per bank and per layout as well as pooled; a good pooled number can hide one failing layout.

## 5. Data protection (before collecting anything)
1. Obtain explicit written permission to use each statement for software evaluation.
2. Remove names, account numbers, identity numbers, addresses and unrelated personal information; keep only what extraction and classification need. Counterparty names in descriptions are pseudonymised consistently when they identify private individuals.
3. Store originals separately from the labelled dataset, with restricted access.
4. Document retention and deletion procedures, and honour withdrawal of permission.
5. No raw statements, and no unredacted data, in the public GitHub repository.
6. Check the applicable data-protection obligations (POPIA) before collection.

## 6. Acceptance criteria before any production integration
1. Extraction evaluated across multiple bank layouts.
2. Precision and recall reported per label.
3. Refunds deducted correctly from net revenue (decision recorded in the classification spec).
4. Unknown and ambiguous transactions excluded from calculated revenue.
5. Reconciliation failures prevent revenue output.
6. Manual overrides recorded and auditable.
7. The 850-scenario regression unchanged.
8. No production scoring integration until the results are reviewed.

The synthetic results (precision 10/10, recall 10/11) are development results for a layout designed alongside the extractor. They are not evidence of real-world performance; this set is what will show whether the rules generalise.
