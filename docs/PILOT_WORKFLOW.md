# Pilot workflow and commercial brief (draft for discussion)

Status: DRAFT. Describes how a small pilot would run on what the platform does today. It makes no pricing
commitment and no claim of predictive accuracy.

## 1. Purpose of the pilot

Learn, with real consent and real outcomes, whether the evidence-based assessment is useful to small
businesses and lenders, and collect the labelled data the rules and confidence bands still need.
The pilot is NOT a test of whether the score predicts repayment: with a small cohort that claim cannot be made.

## 2. What exists today (and what a pilot can rely on)

| Step | Built | Notes |
|---|---|---|
| Business registers, completes profile, uploads documents | yes | Admin reviews each document; reviewer identity is recorded internally |
| Stage-aware assessment: funding readiness, viability, evidence confidence kept separate | yes | Scoring formula frozen |
| Plain-language explanation report (business and lender see the same one) | yes | Portal page in PR #42 |
| Lender onboarding with admin approval; lenders see only related businesses | yes | Migration 032; review existing lender accounts after deploying |
| Consent for data use beyond the business's own assessment | yes | Opt-in, versioned, withdrawable |
| Outcome tracking at 90 / 180 / 365 days with reminders | yes | Reminder job needs a cron/SMTP setup (see section 6) |
| Bank-statement transaction extraction and deposit classification | built, NOT wired to production | Rules frozen until a labelled multi-bank evaluation set exists |

## 3. Cohort and roles

- 10 to 20 businesses, mixed stage (idea, startup, early trading), recruited by direct invitation.
- 1 to 3 lenders (or lender-like partners), each approved by an admin before they see anything.
- 1 named platform administrator who reviews documents and lender approvals.

## 4. Step-by-step flow

1. **Invite and consent.** Business receives the consent text (what is collected, why, who sees it, how to withdraw).
   Nothing beyond its own assessment is used until it opts in. Record the policy version shown.
2. **Onboard.** Business registers, completes profile, uploads documents. Admin approves or rejects each document with a reason.
3. **Assess.** Business gets its assessment and the explanation report, including what would strengthen it.
4. **Improve.** Business acts on the next steps; a new assessment is run. Both snapshots are kept, so change over time is visible.
5. **Lender view (if the business requests finance).** Only an approved lender with a request open to it, or assigned to it,
   sees the business. The lender sees the same report the business sees.
6. **Outcome check-ins** at 90, 180 and 365 days: still operating, revenue, repayment. Missing check-ins are chased, not guessed.
7. **Review.** At the end of each interval, the pilot owner reviews the cases listed in section 5.

## 5. What the pilot should measure

Usefulness, not prediction:
- Did businesses understand the report? (short feedback question after viewing)
- Did they act on the next steps, and did their evidence confidence change?
- Did lenders say the report saved them time or changed what they asked for?
- How often did admin review disagree with, or need to correct, what the system showed?
- How many documents were rejected, and why?
- Response rate on check-ins.

Evidence-quality data to collect with consent, for the open design decisions:
- Declared vs bank-observed revenue gaps (informs the 25% conflict tolerance).
- Age of evidence at assessment (informs the staleness policy).
- Redacted bank statements for the labelled evaluation set, with explicit consent and redaction.

Outcomes may be reported descriptively (counts, ranges). Do not report accuracy, hit rates or "predictive power" from this cohort.

## 6. Prerequisites before inviting anyone

- [ ] POPIA review of the consent text, retention period and information-officer details.
- [ ] Production migrations 031 and 032 applied; existing lender accounts reviewed (suspend any unknown).
- [ ] SMTP and the reminder cron configured; check-in emails tested end to end.
- [ ] Storage bucket public access blocked; confirm uploaded documents are not publicly readable.
- [ ] Test and demo accounts removed from the production database.
- [ ] Pilot administrator named, with a written rule for how quickly documents are reviewed.
- [ ] Open design decisions recorded (section 8).

## 7. Commercial brief (options only, no prices)

Who could pay, and for what. Pricing is deliberately not set: it should follow what the pilot shows people value.

| Possible payer | What they would value | Open question |
|---|---|---|
| Lenders | Faster, more consistent screening with visible evidence quality | Per-assessment, subscription, or per-funded-deal? |
| Funders and development programmes | Cohort-level readiness and outcome reporting | Fixed programme fee vs per-business? |
| Businesses | A clear roadmap to funding readiness | Free to the business is the safer starting point; charging small businesses early risks adoption |

Principles to keep regardless of model:
- The business never pays to improve its score or to influence its assessment.
- A lender's payment never changes a business's score, report or visibility rules.
- Existing platform-fee logic on finance requests should be reviewed separately before any commercial launch.

## 8. Decisions needed from the owner before or during the pilot

1. Confidence-band rules (proposal: approved bank statement is medium until reconciled).
2. Staleness policy for old evidence.
3. The 25% declared-vs-bank conflict tolerance.
4. Whether an automatic CIPC registry check counts as medium evidence.
5. Half-credit neutral value for missing documents.
6. Engine gaps 3, 4 and 6 from the audit.
7. Whether to rewrite git history to remove the World Bank survey JSON, and the permission email to the data owner.

## 9. Exit criteria

Stop or pause if: a consent or access problem is found, a business reports its data was seen by someone unrelated,
or admin review volume cannot keep within the stated turnaround. Any such event is recorded, fixed and
disclosed to the affected parties before the pilot continues.
