# SME Credit Scoring & Invoice Finance System

A full-stack application that helps small businesses manage invoices, calculate credit scores, and request invoice financing from lenders.

## What It Does

- SME users can register, log in, create an SME profile, create invoices, and request financing.
- Lender users can review pending finance requests, approve or reject them, and inspect SME profiles.
- The backend calculates credit scores and applies fee rates based on risk.
- The frontend provides separate SME, lender, and analytics views.

## Project Structure

- `backend/` - FastAPI application, SQLAlchemy models, routers, and services.
- `sme-portal/` - React frontend built with TypeScript and Material UI.
- `backend/alembic/` - Database migration files.

## Prerequisites

- Python 3.12+
- Node.js and npm
- PostgreSQL

## Environment Variables

The backend reads these optional environment variables:

- `DATABASE_URL` - PostgreSQL connection string.
- `SECRET_KEY` - JWT signing key.
- `CORS_ORIGINS` - Comma-separated allowed frontend origins.

Example PowerShell setup:

```powershell
$env:DATABASE_URL="postgresql://postgres:password@localhost:5432/credit_db"
$env:SECRET_KEY="replace-with-a-secure-secret"
$env:CORS_ORIGINS="http://localhost:3000,http://127.0.0.1:3000"
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

Backend URL:

- `http://127.0.0.1:8000`

API docs:

- `http://127.0.0.1:8000/docs`
- `http://127.0.0.1:8000/redoc`

### Run the Frontend

From the `sme-portal` folder:

```powershell
npm start
```

Frontend URL:

- `http://localhost:3000`

## Available Frontend Pages

- `/` - Login page
- `/login` - Login page alias
- `/dashboard` - SME dashboard
- `/invoices` - Invoice management
- `/finance` - Finance request page
- `/lender/dashboard` - Lender dashboard
- `/lender/sme/:smeId` - Lender SME detail view
- `/analytics` - Analytics dashboard
- `/smes/:id` - SME detail page

## Core Backend Modules

- `auth` - Register, login, password change, JWT auth.
- `smes` - SME profile creation, dashboard, CRUD.
- `invoices` - Invoice CRUD and SME invoice listing.
- `credit-scores` - Credit score calculation and history.
- `finance` - Finance request submission, approval, rejection, and status tracking.
- `lenders` - Lender registration, profile management, and SME browsing.

## Main Business Flow

1. A user registers and logs in.
2. The SME user creates an SME profile.
3. The SME creates invoices.
4. The backend calculates a credit score for the SME.
5. The SME submits a finance request against an unpaid invoice.
6. A lender reviews the request and approves or rejects it.
7. The SME dashboard shows invoice counts, outstanding balance, credit score, and finance request history.

## Testing the System

The backend ships with Swagger, which is the easiest way to test the API.

1. Start the backend.
2. Open `http://127.0.0.1:8000/docs`.
3. Register a user with `POST /auth/register`.
4. Log in with `POST /auth/login` and copy the bearer token.
5. Use the `Authorize` button in Swagger and paste `Bearer <token>`.
6. Create an SME profile, create an invoice, calculate a score, and submit a finance request.

See `TESTING_GUIDE.md` for a full step-by-step workflow.

## Data and Security Notes

- All mutation endpoints for invoices and SMEs are protected with JWT authentication and ownership checks.
- Finance requests are capped by invoice amount and score-based eligibility.
- The frontend uses a shared Axios client that automatically attaches the bearer token.
- The backend defaults to a local PostgreSQL database in development, but `DATABASE_URL` should be set in real environments.

## Troubleshooting

- If the backend cannot connect to the database, verify `DATABASE_URL` and that PostgreSQL is running.
- If the frontend cannot reach the backend, ensure the backend is running on `http://127.0.0.1:8000` and that `CORS_ORIGINS` includes `http://localhost:3000`.
- If login works in Swagger but not in the frontend, clear `localStorage` and sign in again.
- If `npm run build` fails with an `EIO` error on Windows, try Node 18 LTS or use the development server with `npm start`.

## Useful Commands

### Backend

```powershell
cd backend
venv\Scripts\activate
python -m uvicorn main:app --host 127.0.0.1 --port 8000
```

### Frontend

```powershell
cd sme-portal
npm start
```

### Frontend Production Build

```powershell
cd sme-portal
npm run build
```

## Additional References

- `API_DOCUMENTATION.md`
- `TESTING_GUIDE.md`
- `IMPLEMENTATION_SUMMARY.md`
- `VERIFICATION_CHECKLIST.md`
