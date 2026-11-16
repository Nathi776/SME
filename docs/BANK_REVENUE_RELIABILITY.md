# Analysis: reliability of bank-derived customer revenue, and what must be true before it earns full credit

Status: ANALYSIS ONLY. No code, scoring or test changed. Reproduce the table with
`python backend/testing/bank_revenue_reliability.py`. Written after strategy v4 (PR #48), which already prevents
bank-derived revenue from being credited above the declared figure.

## 1. What production does today

The upload path uses `services/bank_statement_parser.py`. It is a **text-pattern parser**: it looks for
labelled lines such as `parsed_revenue: 150000` and `months_analysed: 12` in the file's decoded bytes. It does not read
transactions. Two consequences, both demonstrated by the script:

- A real-layout bank statement PDF is **not parsed** (returns nothing). It is saved for manual review, and no
  bank-derived revenue reaches scoring. This is the safe failure.
- A seven-line text file that merely states the fields **is parsed**, including `parsed_revenue: 5000000`. The
  numbers are whatever the document says about itself. Their only protection is the administrator reading the
  document before approving it.

So today's "bank-derived revenue" is a document's own summary, not a figure computed from transactions, and it is not
authenticity-checked. It should be described as such everywhere (the report, admin screen, lender view). Strategy v4
contains the damage for revenue (never above the declared figure), but approval of such a document still earns
compliance credit and a "medium" evidence band, and a crafted figure BELOW the declared one lowers the score.

## 2. What the built (unwired) pipeline does

Extractor, deposit classifier (rules-v2) and revenue normaliser read the transactions, reconcile balances, classify each
deposit and refuse to produce a figure when extraction is not trustworthy. On the three synthetic fixtures:

| Fixture | Extraction trustworthy | Credits | True customer revenue | "All credits" would overstate by | Classifier counts as revenue | Wrongly counted | Genuine sales not counted | Annual figure |
|---|---|---|---|---|---|---|---|---|
| hard_cases | yes | 126,300 | 41,350 | 84,950 (67%) | 39,150 | 0 | 2,200 (plus 12,650 unresolved for review) | 156,600 (run rate, 3 months) |
| garbled_amount | no, blocked (3 problems) | 126,300 | 41,350 | 67% | none produced | – | – | none |
| missing_row | no, blocked (2 problems) | 118,800 | 41,350 | 65% | none produced | – | – | none |

What this shows, and what it does not:

- Two thirds of the credits in these statements are loans, owner money, transfers or refunds. Treating deposits as
  revenue would badly overstate it; classification is the thing that matters.
- The pipeline errs on the side of caution: no non-sales were counted as revenue, one genuine sale was left out, and
  broken extractions produce nothing rather than a wrong number.
- Caveat that limits everything above: the fixtures and the rules were developed together, on one layout, with
  known answers. This is a development check, not evidence of real-world accuracy. There are no real statements, no
  second bank and no independent labels yet. Do not quote these figures as performance.
- A 3-month statement gives a run-rate estimate (here 156,600 against a true 165,400). Seasonality means short periods
  are indicative only; the normaliser already withholds an annual figure under 3 months or with over 25% unresolved.

## 3. Conditions before bank evidence earns full revenue points

Proposed gates, for your decision. Numbers are starting points, not validated targets.

1. **Replace the self-declared parser in the scoring path.** Revenue used for scoring must come from extracted,
   reconciled transactions, or be labelled as unverified and capped as an unsupported claim.
2. **Shadow mode first.** Run extractor + classifier on every approved statement, store the observation, show it to the
   administrator next to the document, and keep it out of scoring. Review the disagreements for the pilot period.
3. **Human review of unresolved deposits** (already supported: a person's decision overrides rules and is recorded).
   Revenue counts as "reviewed" only after that.
4. **Labelled multi-bank evaluation set** (planning target already in `BANK_STATEMENT_EVALUATION_SET.md`: about 100
   statements, 3 or more banks). Before bank revenue earns full points, report precision and recall per category with
   confidence intervals, and require the share of non-sale deposits counted as revenue to be low (proposal: at most
   2% of counted value, upper confidence bound) and the rules to stay frozen while measured.
5. **Reconciliation required.** No full credit unless the extraction is trustworthy and balances reconcile.
6. **Authenticity.** Reconciliation proves internal consistency, not that the bank issued the document. Options, in
   rising cost: administrator checks against a second source, consented bank-feed access, or lender-confirmed
   statements. Decide how much assurance the pilot needs; until then bank evidence stays "medium", never "high" from
   a PDF alone.
7. **Conflict handling.** Keep the 25% declared-versus-bank flag, and record every conflict for tuning.

## 4. What to do before then (small, no scoring change)

- Label the parser's output on the admin screen and in the report as "figures stated in the document, not read from
  transactions", so approval is not mistaken for verification.
- Store which method produced `bs_parsed_revenue` (document-declared / transaction-extracted) so later evidence records
  and the explanation report can say so.
- Request real redacted statements from pilot businesses with consent, to build the evaluation set.

## 5. Decisions for you

1. Approve the shadow-mode-first plan and gates 1 to 7 as the route to full revenue credit?
2. Is a 2% wrongly-counted ceiling the right starting gate, or should it be stricter?
3. How much authenticity assurance does the pilot need before a lender relies on a bank statement?
4. Should the admin screen wording change (section 4) go in now, ahead of the pilot?
