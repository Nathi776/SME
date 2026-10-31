# SME Intelligence Platform - External API Specification (v1)

Welcome to the SME Intelligence Platform API. This document details the external API endpoints designed for integration by lenders, government agencies, corporate procurement teams, and developers.

## Overview

The External API provides a versioned, documented interface to query SME credit scores, market viability signals, and aggregated platform stats.

*   **Base URL:** `http://127.0.0.1:8000/api/v1`
*   **Version:** `v1.0.0`
*   **Versioning Policy:** Backward-compatible changes (adding fields) will keep the major version. Breaking changes (removing fields or modifying structure) will increment the version prefix (e.g. `/api/v2`).

---

## Authentication

All endpoints under `/api/v1` (except administration key generation) require authentication via a unique API key passed in the header:

*   **Header Name:** `X-API-Key`
*   **How to obtain a key:** Contact the platform administrator. Admins can generate keys via the administrator portal under the "API Keys" section.
*   **Security Note:** Keys are hashed in the database using bcrypt. The raw key is shown only once upon generation and cannot be retrieved later.

Example request:

```http
GET /api/v1/market/viability?industry=Technology&province=Gauteng HTTP/1.1
Host: 127.0.0.1:8000
X-API-Key: secure_raw_api_key_string
```

---

## Rate Limiting

To ensure platform reliability and fair usage, all external endpoints are rate limited.
*   **Default Limit:** 60 requests per minute per IP address / API key (as configured via `slowapi` in the backend).
*   **Headers Returned:**
    *   `X-RateLimit-Limit`: Maximum requests allowed in the window.
    *   `X-RateLimit-Remaining`: Number of requests remaining in the current window.
    *   `X-RateLimit-Reset`: Time (seconds) remaining until the limit resets.

---

## Endpoints

### 1. Retrieve SME Score
`GET /api/v1/sme/score`

Submits a South African company registration number and retrieves detailed platform intelligence on that SME.

#### Request Parameters
*   `registration_number` (Query, required, string): Format `YYYY/NNNNNN/NN` (e.g. `2019/045321/07`).

#### The three scores
`score` and `scores.funding_readiness_score` are the same value and drive `decision`. They are distinct from the other two outputs; do not combine them into one number.

| Field | Meaning |
| :--- | :--- |
| `scores.viability_score` (0-100) | How strong the business itself looks. Excludes compliance paperwork, so submitting more documents does not change it. |
| `scores.funding_readiness_score` (0-100) | Overall readiness for funding now, including compliance documents. Equals `score`. |
| `scores.evidence_confidence` (5-100) | How well the inputs are verified. Read viability together with this: high viability with low confidence means promising but unverified. |

All three are rule-based and uncalibrated; none is a probability of repayment or survival. See `MODEL_SPECIFICATION.md`.

#### Response Example (200 OK)
```json
{
  "registration_number": "2019/045321/07",
  "company_name": "Thabo Nkosi Engineering (Pty) Ltd",
  "industry": "Manufacturing",
  "province": "KwaZulu-Natal",
  "score": 82.4,
  "decision": "Approved",
  "scores": {
    "viability_score": 88.1,
    "funding_readiness_score": 82.4,
    "evidence_confidence": 85.0
  },
  "score_components": {
    "revenue_tier": { "contribution": 18.0, "max": 25, "label": "R200k-R500k (parsed)" },
    "invoice_timeliness": { "contribution": 20.0, "max": 20, "label": "95% on time" },
    "founder_signal": { "contribution": 12.0, "max": 15, "label": "Founder profile: 12/15 pts" }
  },
  "projected_score": 91.2,
  "projected_decision": "Approved",
  "top_gaps": [
    { "factor": "Compliance Documents", "gap_pts": 5.0, "action": "Upload SARS Tax Clearance Certificate" }
  ],
  "cipc_verified": true,
  "assessed_at": "2025-07-15T10:30:00Z"
}
```

---

### 2. Query Market Viability
`GET /api/v1/market/viability`

Queries sector and province viability signals based on Stats SA and World Bank datasets. No SME record is required for this query.

#### Request Parameters
*   `industry` (Query, required, string): One of `Technology`, `Retail`, `Construction`, `Manufacturing`, `Healthcare`, `Agriculture`, `Transport & Logistics`, `Food & Beverage`, `Professional Services`, `Other`.
*   `province` (Query, optional, string): South African province name (e.g. `Gauteng`, `Western Cape`, `KwaZulu-Natal`, `Mpumalanga`, `Eastern Cape`, `North West`, `Free State`, `Limpopo`, `Northern Cape`).

#### Response Example (200 OK)
```json
{
  "industry": "Technology",
  "province": "Gauteng",
  "sector_survival_rate": 0.72,
  "province_market_score": 1.0,
  "combined_viability": 0.832,
  "viability_label": "Strong opportunity",
  "survival_label": "72% sector survival (strong)",
  "market_label": "High economic activity market (100%)",
  "data_version": "2025.10.1"
}
```

`data_version` identifies the market tables behind the answer. See endpoint 4 for where those tables come from.

---

### 3. Retrieve Platform Statistics
`GET /api/v1/platform/stats`

Queries high-level aggregate platform stats for dashboard reporting. No individual SME data is exposed.

#### Request Parameters
None.

#### Response Example (200 OK)
```json
{
  "total_smes_assessed": 142,
  "score_distribution": {
    "approved": 28,
    "review": 61,
    "declined": 53
  },
  "avg_score": 58.4,
  "sectors_covered": ["Technology", "Construction", "Retail"],
  "provinces_covered": ["Gauteng", "Western Cape", "KwaZulu-Natal"],
  "platform_version": "1.0.0"
}
```

---

## Platform API (JWT, used by the portal)

These endpoints use a bearer token from `POST /auth/login` (`Authorization: Bearer <token>`), not an API key. They are not part of the versioned external API and may change with the portal.

### Authentication and email verification

| Method | Path | Notes |
| :--- | :--- | :--- |
| POST | `/auth/register` | Roles `sme` or `lender`. Password: 8+ characters with an uppercase letter and a number. Optional `consent_model_improvement` (true/false): records the user's explicit choice; leave it out if the user was not asked. See Consent below. |
| POST | `/auth/login` | Body: `username` or `email`, plus `password`. Unknown users and wrong passwords return the same 401. Passwords are bcrypt-hashed; plaintext is never accepted. |
| POST | `/auth/send-verification` | Body: `user_id` or `email`, optional `channels` (only `email`). Always returns the same generic message, whether or not the account exists. |
| POST | `/auth/resend-verification` | Same behaviour; one code per account per minute. |
| POST | `/auth/verify` | Body: `user_id` or `email`, `channel`, `code`. Sets `email_verified_at`. |
| POST | `/auth/change-password` | Authenticated. |

Verification codes are stored hashed, expire after 10 minutes, work once, and are burned after 5 wrong attempts. Rate limits: login, register and verify 10/min; send and resend 5/min.

### Consent for model-improvement use

Using a business's assessment results and later check-in outcomes to evaluate and improve the scoring model is **opt-in**. No record means no consent. Granting and withdrawing each add a record (nothing is overwritten), tagged with the policy version the user saw and where the choice was made.

| Method | Path | Notes |
| :--- | :--- | :--- |
| GET | `/consent/policy` | Public. The exact wording and its `policy_version`, so the portal shows the same text that is recorded. |
| GET | `/consent` | Current state for the signed-in user: `granted`, `decided` (false = never asked), `policy_version`, `recorded_at`. |
| PUT | `/consent/{purpose}` | Body `{"granted": true|false}`. Purpose today: `model_improvement`. Unknown purposes return 404. |
| GET | `/consent/history` | The user's own full history. |

Withdrawal applies from the moment it is recorded: analyses read current consent each time they run, so a withdrawn business drops out of the next one. It cannot undo analysis already completed. The wording is product copy, not legal advice; have it reviewed against POPIA and bump `CONSENT_POLICY_VERSION` whenever it changes.

### Verification documents

| Method | Path | Notes |
| :--- | :--- | :--- |
| POST | `/verifications/submit` | Multipart: `doc_type`, `file` (and `cipc_registration_number` for `cipc`). Allowed files: `.pdf`, `.png`, `.jpg`, `.jpeg`; the content must match the extension (400 otherwise). Maximum 10 MB (413). Bank statements must be PDF. |
| GET | `/verifications/my` | Own records. |
| GET | `/verifications/pending` | Admin only. |
| PUT | `/verifications/approve/{id}` and `/reject/{id}` | Admin only. Only `pending` records can be reviewed; reviewed ones return 409. Approving a bank statement copies its metrics onto the SME record. |
| GET | `/verifications/{id}/document` | Download. Allowed for the owning SME, the owning lender and admins; anyone else gets 404. |

`document_url` in responses is always `/verifications/{id}/document`. Storage references and file paths are never exposed. Local files are returned as attachments; S3-stored files redirect (307) to a presigned URL valid for 5 minutes. Keep the S3 bucket private ("Block all public access").

Uploaded bank statements are parsed, but their metrics are stored against that specific verification record and are used in scoring only once that statement is approved.

### Assessments and provenance

`POST /credit-scores/calculate/{sme_id}` records an observation and a snapshot and returns:

```json
{
  "score": 72.4,
  "decision": "Review",
  "scores": { "viability_score": 80.2, "funding_readiness_score": 72.4, "evidence_confidence": 55.0 },
  "profile": "growth",
  "observation_id": 31,
  "assessment_snapshot_id": 57
}
```

`GET /credit-scores/details/{sme_id}` returns the live `score`, `scores` and per-factor `breakdown` without saving anything.

Scoring uses the **latest approved** bank statement. A newer upload that is still pending or was rejected does not displace it. Each snapshot's `input_snapshot` records:

*   `bank_statement_verification_id`: the verification record the bank signals came from (`null` if none was approved)
*   `bank_statement_newer_pending`: `true` when a newer, unreviewed statement exists, so the evidence may be stale
*   `revenue_source`: `verified_bank_statement` or `declared`

Business observations carry the same `bank_statement_verification_id`.

### Outcomes and model evaluation

| Method | Path | Notes |
| :--- | :--- | :--- |
| GET | `/outcomes/history` | SMEs see their own; lenders and admins see all. Read-only: it does not create assessments. |
| POST | `/outcomes/{id}/checkin` | SME owner or admin. Body: `interval` (90, 180 or 365), `still_operating`, `revenue`, `loan_repaid`. Also recorded as a business observation (source `outcome_checkin`). |
| GET | `/outcomes/due` | Check-ins that are due and not yet submitted: an SME's own, or all for admins. Each item shows `days_overdue` and `reminders_sent`. |
| POST | `/outcomes/reminders/run` | Admin. Sends due check-in reminders now and returns a summary (`emails_sent`, `skipped_*`, `failed`, `not_configured`). |
| GET | `/outcomes/analytics` | Lenders and admins. |
| GET | `/assessment-evaluations/{snapshot_id}` | What happened after one assessment. |
| GET | `/assessment-evaluations/calibration/summary` | Lenders and admins. Realised 12-month survival and default rates by strategy version and score band. Only businesses whose owner currently consents are included (`excluded_without_consent` shows how many were left out). Groups under 30 outcomes are flagged `sufficient_sample: false`. Reports association, not causation. |

An outcome's `score_at_funding` is the score from the assessment snapshot the funding request was based on. At the 365-day check-in the training labels are written once and never changed: `y1_survived_12m`, `y3_reached_100k`, `y4_revenue_grew`, `y5_defaulted`. `y2_survived_18m` stays empty until a 540-day check-in exists.

---

### 4. Market Data Sources
`GET /api/v1/market/data-sources`

Describes where each market table comes from, what kind of evidence stands behind it, how old it is, and whether anyone has checked it against the original publication.

#### Response Example (200 OK)
```json
{
  "version": "2025.10.1",
  "fingerprint": "34738e3d4e543cdb",
  "tables": {
    "sector_survival_rates": {
      "basis": "cited_benchmark",
      "cited_sources": ["SEDA SME Quarterly Update 2023"],
      "as_of": "2023",
      "independently_verified": false,
      "stale": true,
      "note": "Share of businesses surviving past 36 months, by sector. Values are attributed to the cited reports and have not been independently re-checked."
    }
  }
}
```

`basis` is one of `published_statistic`, `informed_index`, `cited_benchmark`, `expert_judgement`, `taxonomy` or `design_default`. `stale` is true when the data period ended more than 12 months ago. `fingerprint` changes whenever any value in any table changes. Every assessment snapshot stores the version and fingerprint it used (`market_context.market_data`).

### Check-in reminders (operations)

Check-ins produce the outcome labels the model is evaluated against, so late ones are chased automatically:

*   A check-in is due once its due date has passed and it has not been submitted.
*   One email per business per run lists every eligible due check-in. The same check-in is reminded again only after 7 days, and at most 3 times in total. It stays visible in `GET /outcomes/due` afterwards.
*   A failed send is not counted and is retried on the next run. Emails contain no financial details.
*   Nothing is sent until SMTP is configured (`SMTP_HOST`, `SMTP_FROM_EMAIL` or `SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_PORT`, `SMTP_USE_TLS`). Set `PORTAL_BASE_URL` so the email links to your portal.
*   Schedule `python send_checkin_reminders.py` once a day, for example `0 7 * * * cd /path/to/backend && python send_checkin_reminders.py`. It exits with 1 if any send failed or SMTP is not configured.

---

## Error Responses

*   **401 Unauthorized:** Invalid or inactive API key.
    ```json
    { "detail": "Invalid or inactive API key" }
    ```
*   **404 Not Found:** Requested SME registration number not found.
    ```json
    { "error": "SME not found", "registration_number": "2019/045321/07" }
    ```
*   **422 Unprocessable Entity:** Invalid parameter format (e.g., malformed registration number or missing parameters).
    ```json
    {
      "detail": [
        { "loc": ["query", "industry"], "msg": "field required", "type": "value_error.missing" }
      ]
    }
    ```
*   **429 Too Many Requests:** Rate limit exceeded.
    ```json
    { "error": "Rate limit exceeded", "message": "60 requests per minute limit reached." }
    ```

---

## Use Cases

### 1. Lender Credit Check
A commercial bank integrates the API into its loan origination workflow. When an SME applies for funding, the bank's system automatically calls `GET /api/v1/sme/score?registration_number=2019/045321/07` using their API key. The platform returns a consolidated rating (`82.4` / `Approved`) and full detail on cashflow verified through bank statements. This lets the lender offer instant, data-backed decisions.

### 2. Government Sector Query
A provincial development agency wants to allocate enterprise grants to high-viability sectors. They fetch viability metrics by calling `GET /api/v1/market/viability?industry=Agriculture&province=Limpopo`. The API returns a combined viability index and a descriptive label ("Limpopo has lower formal economic activity, but Agriculture performs particularly well in this province").

### 3. Procurement Supplier Assessment
A corporate enterprise wants to assess the operational risk of a potential supplier. They call `GET /api/v1/sme/score?registration_number=2021/112233/07` to retrieve compliance depth (CIPC status, tax clearances) and payment behaviors (unpaid invoice ratio, invoice timeliness) before onboarding them.

---

## Changelog

*   **v1.2.0** (backward compatible)
    *   `GET /api/v1/market/viability` returns `data_version`; new `GET /api/v1/market/data-sources`.
    *   Platform API: consent endpoints, `consent_model_improvement` at registration, `GET /outcomes/due`, `POST /outcomes/reminders/run`, and `excluded_without_consent` in the calibration summary.

*   **v1.1.0** (backward compatible)
    *   `GET /api/v1/sme/score` now returns a `scores` object (`viability_score`, `funding_readiness_score`, `evidence_confidence`). Existing fields are unchanged.
    *   Platform API (JWT) documented below: private document access, verification review rules, outcome labels and model calibration.

*   **v1.0.0**
    *   Initial release of versioned external integration layer.
    *   Added CIPC lookup endpoint, market viability query, and aggregate stats query.
    *   Introduced hashed API Key header authentication mechanism.

## Request more information (finance requests)

A lender can pause a decision to ask the business a question; the business answers; the request returns to that lender's pending queue.

| Method and path | Who | Notes |
|---|---|---|
| `POST /finance/{id}/request-info` | lender | body `{message}` (5-1000 chars). Request must be `pending`. Sets status `info_requested` and claims the request for this lender. Emails the business owner (best effort). |
| `POST /finance/{id}/respond` | the business owner | body `{message}`. Request must be `info_requested`. Returns it to `pending`. Emails the lender (best effort). |
| `GET /finance/{id}/messages` | owner, the claiming lender, admin | Ordered thread `[{id, author_role, kind, message, created_at}]`; others get 404. |
| `GET /finance/awaiting-info` | lender | The lender's own `info_requested` requests. |

`GET /finance/pending` now returns pending requests that are unassigned or claimed by the calling lender. Previously it returned only requests already assigned to the caller, which new requests never were, so lenders could not see new requests. Once claimed, only that lender can approve or reject.
