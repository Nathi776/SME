# Model Specification Document: Assessment Engine v1.0

This document defines the mathematical, logical, and structural specifications of the **SME Assessment Engine v1.0**. It serves as the authoritative source of truth for lenders, developers, and compliance panels reviewing the platform's viability assessments.

---

## 1. Purpose & Scope

### Intended Measurement
The Assessment Engine v1.0 is designed to measure **SME Funding Readiness**. It evaluates the operational strength, compliance integrity, market context, and intent evidence of an SME relative to the typical capability of its business stage. 

### What it does NOT Measure (Non-Claims)
* **Probability of Repayment / Default:** The engine is expert/rule-based. It does *not* calculate statistical default probability (e.g., credit probability of default) because it is not yet calibrated against a real-world outcome dataset.
* **Economic Success:** A high score indicates high funding readiness (verifiable capability and compliance), not a guarantee of profitability.
* **Collateral Liquidity:** It does not evaluate physical assets or real estate value.

---

## 1b. Three Distinct Outputs

An assessment reports three separate measures. They answer different questions and must not be read as one number.

| Output | Question it answers | How it is computed |
| :--- | :--- | :--- |
| **Viability Score** (0-100) | How strong is the business itself? | Earned / maximum points over the *viability factors*: Revenue Tier, Invoice Timeliness, Unpaid Invoice Ratio, Business Age, Industry Risk, Market Viability, Intent Documents (evidenced demand) and Founder Signal, using the stage-aware weights in section 4. **Compliance Documents are excluded.** |
| **Funding Readiness** (0-100) | Is this business ready to be funded right now? | All applicable factors, including Compliance Documents (the existing `score`, and the basis of the decision in section 6). |
| **Evidence Confidence** (5-100%) | How well verified are the inputs? | Depth of approved evidence (section 5; the existing `confidence_score`). |

Reading them together:
* High viability, lower readiness: a sound business that has not yet submitted or verified its paperwork. The recommendations explain how to close the gap.
* High viability, low confidence: promising on declared information that is not yet verified; treat with caution.
* Submitting more compliance documents raises Funding Readiness and Evidence Confidence but does not change Viability.

API: assessment responses include `scores: {viability_score, funding_readiness_score, evidence_confidence}`. The existing `score` field is unchanged and equals `funding_readiness_score`. Snapshots persist `viability_score` alongside `score` and `evidence_depth`.

Like the rest of the engine, Viability Score is rule-based and uncalibrated: it is not a probability of survival or repayment (see section 1).

---

## 2. Business Stage Profiles

Rather than using a single flat scoring formula, the engine uses **stage-aware profile inference** to classify the SME into one of four stages. This determines the active weighting strategy:

```
Established (age ≥ 3 yrs OR invoices ≥ 20)
       ↓ (if not met)
Growth (age ≥ 1 yr AND [invoices > 0 OR bank statement parsed])
       ↓ (if not met)
Startup (CIPC approved OR age ≥ 1 yr OR bank statement on file)
       ↓ (if not met)
Idea (No verified history or documents yet)
```

| Profile Stage | Definition | Logical Rule (Sequential Check) |
| :--- | :--- | :--- |
| **Established** | Demonstrate long-standing operation or high transaction velocity. | `years_active >= 3` OR `total_invoices >= 20` |
| **Growth** | Early trading history with verified cashflow. | `years_active >= 1` AND (`total_invoices > 0` OR `bank_statement_parsed`) |
| **Startup** | Formally registered and preparing to trade. | `cipc_verified` OR `years_active >= 1` OR `bank_statement_on_file` |
| **Idea** | Unregistered conceptual phase. | Default fallback case. |

---

## 3. Scoring Factors

The engine evaluates **nine core factors** across three evidence layers:

### A. Business operational Evidence
1. **Revenue Tier (Max 25 pts):** Continuous score scaled linearly up to R500,000. Values above R500,000 receive the maximum allocation. Revenue is classified as *self-reported* or *parsed* depending on bank statement verification.
2. **Invoice Timeliness (Max 20 pts):** Based on the ratio of invoices paid on time over total invoices. It is discretized into four tiers:
   * $\ge 90\%$ on time: 100% factor weight
   * $\ge 70\%$ on time: 65% factor weight
   * $\ge 50\%$ on time: 35% factor weight
   * $< 50\%$ on time: 15% factor weight
   * *No invoices yet:* Receives a neutral 50% allocation.
3. **Unpaid Invoice Ratio (Max 10 pts):** Measures outstanding credit risk (unpaid invoices divided by total invoices):
   * $\le 5\%$ unpaid: 100% weight
   * $\le 15\%$ unpaid: 60% weight
   * $\le 30\%$ unpaid: 30% weight
   * $> 30\%$ unpaid: 0% weight
   * *No invoices yet:* Receives a neutral 50% allocation.

### B. Context & compliance Evidence
4. **Business Age (Max 10 pts):** Scored incrementally based on years of operation:
   * $\ge 5$ years: 10 pts
   * $\ge 2$ years: 6 pts
   * $\ge 1$ year: 3 pts
   * $< 1$ year: 1 pt
5. **Industry Risk (Max 10 pts):** Measures sector survival rates past 36 months in South Africa (SEDA/World Bank benchmarks). Continuously scaled between the lowest-survival sector (Construction, 0.38 $\rightarrow$ 3 pts) and highest (Healthcare/Tech, 0.74 $\rightarrow$ 10 pts).
6. **Market Viability (Max 10 pts):** Province-level GDP economic index interacting with local industry strength (e.g. Agriculture multiplier in Free State). Continuously scaled (Gauteng $\rightarrow$ 10 pts, Northern Cape $\rightarrow$ 3 pts). A neutral 5 pts is applied if province is not provided.
7. **Compliance Documents (Max 25 pts):** Aggregates verified documents up to a 25 pt cap:
   * CIPC registration: 10 pts
   * Bank statement verified: 8 pts (+ quality adjustments for overdrafts and regularity)
   * Tax clearance certificate: 5 pts
   * Registration/Utility documents: 2 pts

### C. Founder & Demand Signals
8. **Intent Documents (Max 15 pts):** Aggregates pipeline demand documents up to a 15 pt cap:
   * Letter of Intent (LOI): 8 pts (+ 4 pt bonus if counterparty is verified)
   * Supplier Quotes: 4 pts
   * Lease Agreements: 3 pts
9. **Founder Signal (Max 15 pts):** Evaluates capability from the founder profile up to a 15 pt cap:
   * Experience: $\ge 5$ yrs (12 pts), $\ge 2$ yrs (8 pts), $\ge 1$ yr (4 pts), $< 1$ yr (0 pts)
   * Qualification: Degree/Postgrad (4 pts), Certificate/Diploma (2 pts), None/Matric (0 pts)
   * Prior Business Owner: 4 pts
   * Reference Provided: 3 pts
   * Trade Association Member: 2 pts

---

## 4. Weight Strategies (Profile Weighting)

Weight strategies dynamically reallocate the impact of factors depending on the inferred business stage, ensuring that unavailable operational factors do not penalize early-stage concepts.

$$\text{Final Score} = \left( \frac{\sum \text{Earned Points of Applicable Factors}}{\sum \text{Max Points of Applicable Factors}} \right) \times 100$$

| Factor | Idea Strategy | Startup Strategy | Growth Strategy | Established Strategy |
| :--- | :---: | :---: | :---: | :---: |
| **Revenue Tier** | *Unavailable (0)* | 15 | 20 | 25 |
| **Invoice Timeliness** | *Unavailable (0)* | 8 | 18 | 25 |
| **Business Age** | 5 | 8 | 10 | 10 |
| **Unpaid Invoice Ratio** | *Unavailable (0)* | 5 | 10 | 12 |
| **Industry Risk** | 12 | 12 | 10 | 8 |
| **Market Viability** | 15 | 12 | 10 | 7 |
| **Compliance Docs** | 20 | 22 | 22 | 20 |
| **Intent Docs** | 20 | 16 | 10 | 8 |
| **Founder Signal** | 20 | 17 | 15 | 10 |
| **RAW MAXIMUM** | **92** | **125** | **130** | **135** |

---

## 5. Evidence Depth Confidence

The **Confidence Score** measures the depth of primary verified evidence submitted. It runs independently of the viability score and ranges from 5% (blank self-reported profile) to 100% (full CIPC, 6-month bank statement audit, tax clearance, verified references, and counterparty validated LOIs).

### Key Confidence Anchors
* **Founder Only Signal:** ~20–30% confidence.
* **CIPC Verified + Self-reported details:** ~40–50% confidence.
* **CIPC Verified + parsed bank statement + invoices:** ~70–85% confidence.
* **Fully Audited (Tax + verified counterparties):** ~90–100% confidence.

---

## 6. Decision Thresholds

| Score Range | Inferred Decision | Meaning / Action |
| :--- | :--- | :--- |
| **$\ge 75.0$** | **Approved** | The SME shows high operational capability, low compliance risk, and solid financial indicators appropriate to its stage. Ready for funding offer. |
| **$50.0 \text{ to } 74.9$** | **Review** | Marginal or mixed case. Requires human review (e.g. manual checking of bank statement anomalies or verify trade patterns). |
| **$< 50.0$** | **Declined** | High risk or insufficient evidence to justify funding. The SME is provided with automated gap recommendations to improve readiness. |

---

## 7. Model Assumptions & Known Limitations

1. **Rule-Based Weighting:** Current weights represent expert consensus on SME risk, not empirical coefficients.
2. **Province/Market Bias:** Location indicators act as modifiers. A business in Limpopo is penalized relative to one in Gauteng. The model assumes Stats SA provincial GDP index is a proxy for individual business opportunity.
3. **Linear Revenue Scale:** Scaled linearly to R500k. A business with R500k revenue receives the same revenue score as one with R5M, assuming that past R500k, other transactional metrics become better indicators.
4. **Simulation Validation:** Current outcome testing is run against synthetic simulator profiles. True predictive validity will only be established when the engine is calibrated against observed repayments and defaults.
5. **Market Data Provenance:** The sector-survival and province tables are versioned (`MARKET_DATA_VERSION`) and fingerprinted, and each assessment snapshot records both. Each table is labelled with its evidence basis (`GET /api/v1/market/data-sources`). None has been independently checked against its original publication yet. The sector-survival table is attributed to 2023 sources and is flagged stale after 12 months; the industry-by-province multipliers are analyst judgement with no published source. Treat Industry Risk and Market Viability accordingly until the tables are re-sourced.

## World Bank Enterprise Survey context benchmarks (South Africa 2020)

`data/wbes_sa_2020_benchmarks.json` holds weighted aggregates (finance access, audited statements,
firm age, sales per employee, labour-cost share) by size band and sector, built by
`data_pipeline/build_wbes_benchmarks.py` from licensed survey microdata that is not stored in the repo.
They are **context only and do not enter any score**. Coverage is formal firms with 5+ employees in four
provinces, surveyed mostly after the COVID-19 outbreak (median firm: 14 permanent staff, 20 years old), so
they do not describe micro or informal businesses. Cells with fewer than 30 firms are suppressed. The
survey cannot supply survival or loan-approval rates (no usable closure outcome; 28 loan applications).
The data-use terms have not yet been checked against shipping derived tables.
