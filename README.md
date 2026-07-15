# SME Intelligence Platform
An SME intelligence platform whose first application is funding readiness — making invisible businesses legible to the financial system.

## The Problem

Most SMEs fail not because they are bad businesses, but because traditional lenders cannot see them. Invoices, credit history, and collateral are proxies for confidence — and early-stage businesses have none of them.

South Africa has an estimated 2.5 million SMEs. The majority cannot access formal funding. The gap is not capital — it is information.

This platform is built to close that information gap.

## What the Platform Does

*   **For SMEs:** Understand exactly why you are or are not fundable. Get a personalised action plan that shows you — step by step, with exact score impact — what to do to qualify for funding. Track your progress over time.
*   **For Lenders:** Assess SME creditworthiness using verified data, not just invoices. See a full intelligence profile: founder signals, business signals, market viability, compliance depth, and intent documents. Monitor portfolio health and track outcomes after funding.
*   **For Government and Development Agencies:** Identify which SMEs in which sectors and provinces have the highest survival probability. Allocate support resources to businesses most likely to succeed. Access sector and province viability data at scale.

## The Intelligence Engine

| Layer | Factor | What it measures | Max pts |
| :--- | :--- | :--- | :--- |
| Layer 1 — Founder | Founder Signal | Experience, qualifications, prior ownership, network | 15 |
| Layer 2 — Business | Revenue Tier | Verified cashflow from bank statement parsing | 25 |
| Layer 2 — Business | Invoice Timeliness | Payment collection behaviour | 20 |
| Layer 2 — Business | Business Age | Operational track record | 10 |
| Layer 2 — Business | Unpaid Invoice Ratio | Cash flow risk indicator | 10 |
| Layer 2 — Business | Industry Risk | Sector survival rate (Stats SA / World Bank) | 10 |
| Layer 2 — Business | Market Viability | Province economic activity × industry adjustment | 10 |
| Layer 2 — Business | Compliance Documents | CIPC, bank statement, tax clearance, registration | 25 |
| Layer 2 — Business | Intent Documents | Letter of intent, supplier quote, lease agreement | 15 |

All scores are rescaled to 0–100. Decision thresholds: ≥75 Approved, ≥50 Review, <50 Declined.

## Key Features

*   Pre-invoice funding path — SMEs without invoices can be assessed on founder and market signals alone
*   Bank statement parsing — PDF statements parsed automatically, verified revenue replaces self-reported figures
*   CIPC live verification — company registration verified automatically via API with manual review fallback
*   Recommendations engine — every declined SME receives a prioritised action plan with exact score impact per action
*   Outcome tracking — funded deals tracked at 90, 180, and 365 days to measure repayment and survival
*   Market viability scoring — sector survival rates and province economic indices from Stats SA data
*   Pre-registration assessment — public tool for entrepreneurs to assess viability before registering a company
*   Lender intelligence dashboard — portfolio analytics, score distribution, sector concentration, funding criteria filters

## Decision Thresholds

| Score | Decision | Meaning |
| :--- | :--- | :--- |
| 75–100 | Approved | Strong candidate — recommend for funding |
| 50–74 | Review | Viable candidate — human review recommended |
| 0–49 | Declined | Insufficient evidence — platform provides improvement roadmap |

## Platform Roadmap

| Phase | Description | Status |
| :--- | :--- | :--- |
| 1 — Collect Evidence | Founder signals, business signals, market data, documents | ✅ Complete |
| 2 — Generate Recommendations | Personalised action plans with score impact | ✅ Complete |
| 3 — Track Outcomes | Funded deal tracking at 90/180/365 days | ✅ Complete |
| 4 — Learn | Replace rule-based weights with ML trained on outcome data | 🔄 In progress |
| 5 — Infrastructure | API-first platform for lenders, government, corporates | 🔄 In progress |

## Tech Stack

| Backend | Frontend |
| :--- | :--- |
| Python 3.12, FastAPI, SQLAlchemy, Alembic, PostgreSQL, Pydantic, passlib/bcrypt, slowapi | React 18, TypeScript, Tailwind CSS, Recharts, Lucide React, React Router, Axios |

## Environment Variables

The backend reads these environment variables:

*   `DATABASE_URL` — PostgreSQL connection string.
*   `SECRET_KEY` — JWT signing key.
*   `CORS_ORIGINS` — Comma-separated allowed frontend origins.
*   `CIPC_API_URL` — CIPC data provider endpoint (leave blank for manual review fallback)
*   `CIPC_API_KEY` — CIPC data provider API key
*   `UPLOAD_DIR` — Directory for uploaded verification documents (default: /tmp/sme_uploads)
*   `PLATFORM_FEE_RATE` — Platform fee as a decimal (default: 0.03)

Example PowerShell setup:

```powershell
$env:DATABASE_URL="postgresql://postgres:password@localhost:5432/credit_db"
$env:SECRET_KEY="replace-with-a-secure-secret"
$env:CORS_ORIGINS="http://localhost:3000,http://127.0.0.1:3000"
$env:CIPC_API_URL=""
$env:CIPC_API_KEY=""
```

## Install Dependencies

### Backend

```powershell
cd backend
venv\Scripts\activate
pip install -r requirements.txt
```

### Frontend

```powershell
cd sme-portal
npm install
```

## Run the Application

### Run the Backend

From the `backend` folder:

```powershell
venv\Scripts\activate
python -m uvicorn main:app --host 127.0.0.1 --port 8000
```

If you prefer to avoid activating the virtual environment, you can run the interpreter directly:

```powershell
.\venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000
```

Run database migrations explicitly before starting the backend:

```powershell
cd backend
alembic upgrade head
```

Backend URL:

*   `http://127.0.0.1:8000`

API docs:

*   `http://127.0.0.1:8000/docs`
*   `http://127.0.0.1:8000/redoc`

### Run the Frontend

From the `sme-portal` folder:

```powershell
npm start
```

Frontend URL:

*   `http://localhost:3000`

## Available Routes

Public (no login required):
*   `/assess` — Pre-registration business viability assessment

SME routes:
*   `/dashboard` — SME dashboard with score and funding overview
*   `/invoices` — Invoice management
*   `/finance` — Finance request submission (invoice-backed and pre-invoice)
*   `/documents` — Verification document uploads
*   `/founder-profile` — Founder profile (Layer 1 signals)
*   `/recommendations` — Personalised funding readiness action plan
*   `/outcomes` — Funding history and check-in submissions
*   `/credit-score` — Credit score details and factor breakdown

Lender routes:
*   `/lender/dashboard` — Pending finance requests queue
*   `/lender/intelligence` — Portfolio analytics and intelligence dashboard
*   `/lender/sme/:smeId` — Full SME intelligence profile

Admin routes:
*   `/admin/dashboard` — Verification document review queue

## API Documentation

Full API documentation is available at http://127.0.0.1:8000/docs (Swagger UI) and http://127.0.0.1:8000/redoc (ReDoc) when the backend is running. See API_DOCUMENTATION.md for the external API specification.
