# Bank Statement Labelling Guide

Purpose: produce human ground truth for evaluating the transaction extractor and deposit classifier. Labels are assigned by trained reviewers from the statement evidence, **never copied from a model's output**. The classifier rules are frozen while this set is built.

## 1. Labels

| Label | Meaning | Revenue treatment |
|---|---|---|
| `CUSTOMER_SALE` | Payment received for goods or services | Include |
| `CUSTOMER_REFUND` | Refund paid back to a customer | Negative adjustment (see section 3) |
| `OWNER_CONTRIBUTION` | Capital introduced by an owner, shareholder or director | Exclude |
| `LOAN_RECEIPT` | Loan or credit facility proceeds | Exclude |
| `INTERNAL_TRANSFER` | Transfer between accounts owned by the business | Exclude |
| `ASSET_DISPOSAL` | Proceeds from the sale of equipment or other assets | Exclude from ordinary trading revenue |
| `OTHER_NON_REVENUE` | Other identified non-sales deposit (supplier refund, interest, grant, insurance payout) | Exclude |
| `UNCLASSIFIED` | Insufficient information to determine the type | Do not count |
| `REVIEW_REQUIRED` | Information present but conflicting, or needs human judgement | Do not count until reviewed |

`UNCLASSIFIED` versus `REVIEW_REQUIRED`: the first has too little information ("CASH DEPOSIT 88213" with nothing else); the second has information that conflicts or is ambiguous ("LOAN REPAYMENT INVOICE", "OWNER STORES PAYMENT"). A reviewer who later resolves a `REVIEW_REQUIRED` item changes its label and records why; the original is kept in the notes.

Mapping to the current classifier categories (for evaluation only): `CUSTOMER_SALE` = customer_sale; `LOAN_RECEIPT` = loan; `OWNER_CONTRIBUTION` = owner_contribution; `INTERNAL_TRANSFER` = internal_transfer; `UNCLASSIFIED` and `REVIEW_REQUIRED` = unknown (needs review). The classifier has no categories for `ASSET_DISPOSAL`, `CUSTOMER_REFUND` or `OTHER_NON_REVENUE`: a correct outcome for those is "not counted as revenue", and the missing categories are an evaluation finding, not something to patch now.

## 2. Labelling rules
1. Preserve the original description exactly as printed. No cleaning, case changes or translation.
2. Never infer a customer sale from `SALE` or `SALES` alone.
3. Never infer an owner contribution from `OWNER`, `DIRECTOR`, `SHAREHOLDER` or `MEMBER` alone.
4. Label from evidence: the description, amount pattern, repetition, counterparty, balance behaviour and, where the business has them, invoices or the owner's explanation. Write that evidence in `evidence_notes` (one short sentence; no personal details).
5. Record `reviewer_id` (pseudonymous) and `review_date` on every row.
6. Do not use any model or rule output as ground truth. Reviewers do not see classifier output while labelling.
7. When unsure, choose `UNCLASSIFIED` or `REVIEW_REQUIRED`. A reviewer may mark a transaction unresolved; never force a label.
8. Label **every** transaction so extraction and refund handling can be evaluated. A debit that is not a customer refund gets `transaction_direction=DEBIT` and `ground_truth_label=NOT_APPLICABLE`; debits are never deposits. A debit that is a customer refund is `CUSTOMER_REFUND`.
9. Two reviewers independently label a sample (suggested 20% of statements). Record disagreements; the disagreement rate is a reported metric, and a third person resolves each one.

## 3. Refund treatment (decision)
Refunds are separate negative adjustments, not silent exclusions:

| Item | Example |
|---|---|
| Gross customer revenue (sales) | R50,000 |
| Confirmed customer refunds | -R2,000 |
| Net customer revenue | R48,000 |
| Unclassified or disputed refund amounts | reported separately, not deducted |

- Do not treat every debit as a refund. A debit is a `CUSTOMER_REFUND` only with sufficient evidence (description such as "REFUND" to a payer who appears as a customer, or a reversal matching an earlier sale).
- Link a refund to the original sale where possible (`linked_transaction_id`); otherwise mark it unlinked.
- Ambiguous debits go to `REVIEW_REQUIRED` and are not deducted.
- A credit labelled "REFUND" is usually a supplier or bank refund received: `OTHER_NON_REVENUE`, not a customer refund.

## 4. Quick examples (fictional)
| Description | Label | Why |
|---|---|---|
| PAYMENT FOR INVOICE 1024 | CUSTOMER_SALE | invoice reference |
| SALE OF EQUIPMENT | ASSET_DISPOSAL | asset, not trading |
| OWNER CAPITAL INJECTION | OWNER_CONTRIBUTION | paired phrase |
| INV 20491 OWNER STORES | CUSTOMER_SALE | invoice reference resolves the name |
| OWNER STORES PAYMENT | REVIEW_REQUIRED (or CUSTOMER_SALE with evidence) | name vs owner ambiguity |
| LOAN REPAYMENT INVOICE | REVIEW_REQUIRED | conflicting signals |
| CASH DEPOSIT 88213 | UNCLASSIFIED | no information |
| TRANSFER FROM SAVINGS | INTERNAL_TRANSFER | own account |
| CUSTOMER REFUND (debit) | CUSTOMER_REFUND | paid back to a customer |
