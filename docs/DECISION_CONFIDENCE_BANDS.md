# Decision record: evidence confidence bands

Status: PROPOSED DEFAULT, awaiting owner confirmation. These are the bands the code already uses
(`PROVISIONAL_BANDS` in `backend/services/evidence_records.py`, config version `provisional-1`).
Confirming this record changes no code. Changing a band is a one-line configuration change and does not
touch the scoring formula, weights or thresholds.

## What a band means

A band describes how reliable the evidence for ONE claim is. It is not a probability, it is not a measure
of how good the business is, and it has not been validated against outcomes. Confidence attaches to the
claim, not the document: an approved bank statement is good evidence of deposits, not by itself of customer revenue.

## Proposed rules

| Situation | Band | Reason |
|---|---|---|
| Declared by the business, nothing supporting it | low | Unsupported self-report |
| Self-attested records (e.g. business-entered invoices) | low | Not confirmed by the other party |
| Document uploaded, not yet reviewed | low | Nobody has checked it |
| Document approved by an administrator | medium | A person checked it; the claim may still be incomplete |
| Bank statement approved AND extraction reconciles to its balances | medium_high | Figures are internally consistent |
| Deposits individually reviewed and classified as customer revenue (and reconciled) | high | The specific claim, customer revenue, is established |
| Declared and bank-observed revenue differ by more than the tolerance (25%), or extraction fails to reconcile | low, flagged for review | Conflicting evidence is never trusted silently |
| Document rejected, or nothing submitted | none | No usable evidence |
| Market and province context | not applicable | Shown for information, not scored |

Modifiers (configurable; staleness is OFF until a policy is chosen):
- Stale evidence caps at low once a staleness window is set.
- A manual override can never raise a band above medium, and an override with no reason is flagged for review.

## Consequences you should know about

- Until the extractor and deposit review are wired in, NO revenue claim can reach medium_high or high.
  The best a bank-derived revenue figure shows today is medium, with the flags "extraction reconciliation not
  available" and "deposits not classified as customer revenue". This is deliberate: it is honest about what is checked.
- An automatic CIPC registry check is not given a band here (open decision 4). Registration establishes that the
  business exists, not that it trades; if adopted it should be medium for existence only.

## Questions to confirm

1. Is "approved by an administrator = medium" the right ceiling for a reviewed but unreconciled document?
2. Should a reconciled statement alone (deposits unclassified) be medium_high, or stay medium until deposits are reviewed?
   The current default is medium_high; the stricter option is medium.
3. Is low (not none) right for conflicting evidence?

## Review trigger

Revisit after the pilot: compare bands with administrator corrections and with check-in outcomes (descriptively only).
