# Analysis: poor bank behaviour (gap 3) and overdrafts beyond two (gap 6)

Status: ANALYSIS ONLY. Nothing in the engine, weights or thresholds was changed. Reproduce with
`python backend/testing/bank_behaviour_analysis.py`.

## The two gaps (verified against the engine)

- **Gap 3.** An approved bank statement earns full base credit (8 of 25 compliance points, scaled by stage)
  whatever it shows; a missing one earns half. Behaviour then adds or removes at most a few points, and the
  overdraft penalty stops at two. So a business with 8 overdrafts and income regularity 0.2 can score the same
  as, or more than, one that submitted no statement. Test: `test_poor_bank_behaviour_does_not_beat_no_bank_evidence`.
- **Gap 6.** The overdraft penalty is `min(count, 2)`, so 2, 5 and 10 overdrafts score identically.
  Test: `test_more_overdrafts_keep_lowering_the_score`.

## Options measured on the gold scenarios

"Poor" here means 3 or more overdrafts or income regularity below 0.4 on an approved, parsed statement.
The Compliance Documents factor was re-derived and matched the engine in every valid scenario before any
option was computed. 825 of the 850 scenarios are valid (25 are deliberately invalid inputs).

602 scenarios have an approved, parsed bank statement; 100 of them are poor. All 100 poor cases are in the
`bad_outcome` category.

| Option | Scores that change | Decisions that change | Largest score drop |
|---|---|---|---|
| G6: overdraft cap 4 | 100 | 0 | -1.9 |
| G6: overdraft cap 6 | 100 | 0 | -3.9 |
| G3-B: poor statement earns the same as a missing one | 100 | 0 | -3.9 |
| G3-A: poor statement earns below a missing one (no base credit) | 100 | 0 | -7.7 |
| G3-B + G6 cap 4 | 100 | 0 | -5.8 |

## What this does and does not tell you

- No option changes a decision in the gold set. That is a limit of the set, not a reason to relax: all poor
  cases come from one synthetic category whose expected decisions were already low. Real businesses near
  the Review and Approved lines are not represented, so decision changes in practice may differ.
- Every option lowers scores for exactly the same 100 scenarios; they differ in how far.
- Nothing here shows which option is more accurate. There are no outcome labels, and no predictive claim is made.

## Recommendation (for your sign-off)

- **Gap 3: option B** (a poor statement earns the same as no statement, never less). It closes the gap that
  the test describes without making it costly to upload a statement; showing the poor behaviour to the lender
  in the explanation report keeps that information visible. Option A would make disclosure riskier than silence.
- **Gap 6: cap 4.** A graded penalty that keeps falling, with a ceiling so one bad quarter cannot dominate.
  Cap 6 is the stronger version if you prefer it.
- If both are accepted, the combined effect is at most -5.8 points on affected scenarios.

## If you sign off

1. Change the engine rule only for the chosen options and bump the strategy version string so stored
   snapshots stay traceable to the rule that produced them.
2. Convert the xfail tests for gaps 3 and 6 to passing tests.
3. Re-baseline the 850-scenario regression, with the 100 changed scenarios listed as intended and no others changing.
4. Record the change here and in `docs/BASELINE.md`.
