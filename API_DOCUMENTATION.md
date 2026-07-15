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
`GET /api/v1/sme/{registration_number}/score`

Submits a South African company registration number and retrieves detailed platform intelligence on that SME.

#### Request Parameters
*   `registration_number` (Path, required, string): Format `YYYY/NNNNNN/NN` (e.g. `2019/045321/07`).

#### Response Example (200 OK)
```json
{
  "registration_number": "2019/045321/07",
  "company_name": "Thabo Nkosi Engineering (Pty) Ltd",
  "industry": "Manufacturing",
  "province": "KwaZulu-Natal",
  "score": 82.4,
  "decision": "Approved",
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
  "combined_viability": 0.864,
  "viability_label": "Strong opportunity",
  "survival_label": "72% sector survival (strong)",
  "market_label": "High economic activity market (100%)"
}
```

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
A commercial bank integrates the API into its loan origination workflow. When an SME applies for funding, the bank's system automatically calls `GET /api/v1/sme/2019/045321/07/score` using their API key. The platform returns a consolidated rating (`82.4` / `Approved`) and full detail on cashflow verified through bank statements. This lets the lender offer instant, data-backed decisions.

### 2. Government Sector Query
A provincial development agency wants to allocate enterprise grants to high-viability sectors. They fetch viability metrics by calling `GET /api/v1/market/viability?industry=Agriculture&province=Limpopo`. The API returns a combined viability index and a descriptive label ("Limpopo has lower formal economic activity, but Agriculture performs particularly well in this province").

### 3. Procurement Supplier Assessment
A corporate enterprise wants to assess the operational risk of a potential supplier. They call `GET /api/v1/sme/2021/112233/07/score` to retrieve compliance depth (CIPC status, tax clearances) and payment behaviors (unpaid invoice ratio, invoice timeliness) before onboarding them.

---

## Changelog

*   **v1.0.0**
    *   Initial release of versioned external integration layer.
    *   Added CIPC lookup endpoint, market viability query, and aggregate stats query.
    *   Introduced hashed API Key header authentication mechanism.
