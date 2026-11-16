# Analysis: declared revenue is never cross-checked (gap 4)

Status: ANALYSIS ONLY. No engine, weight, threshold or test changed. Reproduce with
`python backend/testing/declared_revenue_analysis.py`.

## What the gap really is (checked against the code)

The gap-4 xfail test compares revenue 150k with 1.5m, both with an approved bank statement. That setup is
artificial: the engine receives ONE revenue figure, and `scoring_service` already chooses it. When an approved
statement has parsed revenue, the bank figure replaces the declared figure, so a declared number cannot inflate
a statement-backed score. The real exposure is narrower:

1. **No approved statement: declared revenue is taken at face value** and earns full linear credit up to R500k.
   Gold example: R500,000,000 declared with no invoices still reaches "Review".
2. **When a statement is approved, its deposits are not yet classified as customer revenue** (the classifier is not
   wired to production), so owner injections or loan inflows could raise the bank-derived figure. This is closed by
   wiring the classifier in, not by a scoring rule, and is out of scope here.

The evidence records already flag a declared-versus-bank conflict (25% tolerance) for human review. The score ignores it.

## Options measured (gold scenarios)

708 valid scenarios score revenue; 106 of them rely on self-reported revenue (29 above R100k). Revenue Tier points
were re-derived and matched the engine in every one before any option was computed.

| Option | Scores that change | Decisions that change | Largest drop |
|---|---|---|---|
| Self-reported revenue counts at 50% | 94 | 13 | -8.2 |
| Self-reported revenue capped at R100k | 29 | 5 | -13.1 |
| Self-reported revenue capped at R250k | 5 | 5 | -8.2 |

Where the cap bites:
- Cap R100k: 5 "fraud" scenarios (R500m, no invoices) drop 13.1 and move Review to Declined; 24
  "missing_evidence" scenarios drop only 0.7 to 0.8, with no decision change.
- Cap R250k: only the same 5 fraud scenarios change.
- The 50% discount also moves 8 ordinary startups at about R39k from Review to Declined. That penalises small honest
  businesses for having no statement, which conflicts with the platform's informality-fairness stance. Not recommended.

## What the options mean for a business

A cap says: revenue you state but have not evidenced earns credit only up to the cap; upload a statement and the
full revenue counts. It does not call anyone a liar, never reduces a statement-backed score, and points the business
at the evidence that raises its confidence anyway.

## Recommendation (for your sign-off)

- **Cap self-reported revenue at R100k for scoring.** It stops the manipulation case, costs honest unsupported
  businesses under one point in the gold set, and nudges them toward uploading a statement. R250k is the minimal
  alternative if you want the smallest possible change; it leaves R100k to R250k unsupported claims earning full credit.
- Show the cap in the report ("revenue above R100k counts once supported by a bank statement") and record it on the
  Revenue Tier breakdown so it is never silent.
- Replace the artificial xfail with two tests: unsupported 1.5m scores no higher than unsupported 100k, and the same
  1.5m WITH an approved statement basis is unchanged.
- Strategy version v3 to v4; re-baseline the gold regression with exactly the 29 changed scenarios listed.

Nothing here claims that R100k is the right level; it is a conservative starting rule to be revisited with pilot data
(declared-versus-bank gaps, the same data that informs the 25% tolerance).
