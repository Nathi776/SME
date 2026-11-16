# Revenue scoring policy (strategy v4)

Status: IMPLEMENTED on owner approval, PROVISIONAL (to be calibrated with pilot evidence).
Config: `RevenuePolicy` in `backend/core/assessment_engine.py` (version `revenue-policy-1`), stored with every
snapshot under `input_snapshot.revenue_policy` and on the Revenue Tier breakdown.

## Rules

- **A. Unsupported self-reported revenue** earns scoring credit only up to R100,000.
- **B. Approved bank statement:** the bank figure is used, but until its deposits are classified as customer
  revenue it is never credited above the business's own declared figure (a bank figure BELOW the declared
  one is used as is). If no declared figure exists, the R100,000 limit applies. An approval alone therefore
  cannot raise the revenue score.
- **C. Invoice-supported revenue:** revenue above R100,000 is credited up to the rand value of invoices recorded
  as paid (with a paid date) in the last 12 months. Unpaid or old invoices count for nothing; the absence of a
  bank statement is not treated as proof that invoices do not support revenue.

R100,000 is only the amount that earns scoring credit while unsupported. It is not a limit on what a business can
earn, claim or have recognised, and the platform never states it as one.

## What is recorded

Revenue Tier breakdown: `declared_revenue` (never altered), `scoring_revenue`, `revenue_basis`
(`self_reported`, `self_reported_unsupported`, `invoice_supported`, `bank_derived_unclassified`), `cap_applied`,
`cap_amount`, `limited_to_declared`, `revenue_conflict`, `revenue_policy_version`. The snapshot stores
`declared_revenue`, `scoring_revenue` and the policy. The explanation report shows the cap and why, in plain words.

## Effect on the gold scenarios

29 scores change (5 `fraud` scenarios by -13.1, 24 `missing_evidence` by -0.7 to -0.8). Exactly five decisions
change (SME_FRAUD_030/035/040/045/050, Review to Declined); no profile changes; the other 821 are unchanged.
The pre-v4 baseline is preserved in `backend/testing/expected_results_strategy_v3.json`.

## Consequence to be aware of: viability

Revenue Tier is also a viability factor, so for businesses claiming more than R100k without support, the viability
score falls as well (on the 29 changed gold scenarios, between -0.9 and -17.4; the large drops are the extreme
fraud-style claims). Viability therefore now reflects revenue support above the cap, not only the claim. The earlier
principle that missing documents never lower viability still holds for claims under the cap, and the tests that
state it were pinned to revenue under R100k for that reason. If viability should ignore revenue support entirely,
that is a separate decision.

## Still open

Wiring in the deposit classifier, and reviewing the reliability of bank-derived customer revenue before full
revenue points are awarded on bank evidence.
