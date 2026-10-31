# Deployment checklist

Work top to bottom. Items marked **[you]** need an account or decision from the owner.

## 1. Before first deploy
- [ ] **[you]** Merge the open pull request(s) into `main`; deploy from `main` only.
- [ ] **[you]** Provision PostgreSQL (managed, with automated daily backups and a tested restore).
- [ ] Copy `backend/.env.example` to the host's secret store and fill every value. `SECRET_KEY` must be 32+ random characters or the app refuses to start in production.
- [ ] Set `CORS_ORIGINS` to the real portal domain(s) only.
- [ ] Set up the database: `cd backend && python setup_database.py` (builds a new database, or applies pending migrations to an existing one; do not run `alembic upgrade head` on an empty database, because the migration history assumes tables already exist). Expect a single head, 029 or later.
- [ ] Create the first admin: `python create_admin.py`.
- [ ] Build the portal with `REACT_APP_API_URL=https://YOUR-API-DOMAIN npm run build` (in `sme-portal`) and serve it over HTTPS.

## 2. Document storage (sensitive: bank statements, ID)
- [ ] **[you]** Create a private S3 bucket and enable **Block all public access** (all four settings) and default encryption.
- [ ] Grant the app's IAM user only `s3:PutObject` / `s3:GetObject` on that bucket.
- [ ] If not using S3, set `PERSISTENT_UPLOAD_DIR` to a persistent volume; otherwise uploads vanish on restart.
- [ ] Upload a test PDF and confirm the stored link is a short-lived presigned URL and the raw bucket URL returns Access Denied.

## 3. Email and reminders
- [ ] **[you]** Choose an SMTP provider (SendGrid, Mailgun, Amazon SES, or your domain's mail) and verify the sending domain (SPF/DKIM).
- [ ] Set the `SMTP_*` variables and `PORTAL_BASE_URL`.
- [ ] Schedule the daily job (example, 07:00 server time):
  `0 7 * * * cd /app/backend && /usr/bin/python send_checkin_reminders.py >> /var/log/checkin_reminders.log 2>&1`
  Exit code 1 means an email failed or SMTP is unset; alert on non-zero.
- [ ] Send yourself a test: register, make a check-in due, run the script once, confirm the email and its link.

## 4. Staging run-through (do not skip)
Repeat on a staging copy with a real database, then once on production with a test account:
1. Register an SME; confirm the consent box is **unticked** by default; verify email.
2. Upload documents; get an assessment; confirm the three outputs (Viability, Funding Readiness, Evidence Confidence) display.
3. Open Privacy & Data; allow, then withdraw; confirm history lists both.
4. Request funding; confirm an outcome record is created.
5. Make a check-in overdue; confirm the banner and the reminder email.
6. Log in as a lender and as an admin; confirm each sees only what it should.
7. Try 6 wrong logins to confirm rate limiting.

## 5. Operations
- [ ] Error monitoring (Sentry or similar) on API and portal.
- [ ] Uptime check on `/health` (returns 503 if the database is unreachable) and an alert contact.
- [ ] Log retention policy; make sure logs contain no document contents or passwords.
- [ ] Dependency updates: rerun `pip install -r requirements.txt` and the test suite monthly.

## 6. Legal and data (before real customers)
- [ ] **[you]** Privacy policy and terms published on the site; POPIA review of the consent wording (`CONSENT_POLICY_VERSION` in `services/consent_service.py`: bump it whenever the wording changes).
- [ ] **[you]** Register an Information Officer with the Information Regulator.
- [ ] Do not display World Bank Enterprise Survey figures to users until written permission arrives (see MODEL_SPECIFICATION.md).
- [ ] Tell users plainly that the score is unvalidated against repayment outcomes until check-in data accumulates.

## 7. Known gaps
- No admin screen for the reminder job (use the script or `POST /outcomes/reminders/run`).
- Lender sign-up has no consent checkbox (lenders can opt in from Privacy & Data).
- The sector-survival table is cited but unverified.

## 8. Access rules (enforced by tests/test_access_isolation.py)
- Every endpoint requires login; one SME cannot read or change another's business, invoices, documents or check-ins.
- Lenders cannot edit SMEs or approve documents; SMEs cannot use lender or admin actions.
- A lender can mark funded/paid/closed only the requests they approved (admins: any).
- Lender profiles (contact details, limits) are visible only to that lender and admins.
- Policy question left open: any lender can currently list all invoices and all pending requests (marketplace behaviour). Decide whether that should be narrowed before multiple competing lenders join.
