"""
seed_test_profiles.py

Seeds all 6 test scenarios from the scenario test suite into the database.
Run from the backend directory:

    python seed_test_profiles.py

Each scenario creates:
  - A User  (login: scenario_N@test.com / password: Test1234!)
  - An SME  profile with the correct signals
  - Invoices (where applicable)
  - Verifications (where applicable, status "approved")
  - A CreditScore calculated by the real scoring engine

After running, log into the frontend with any of these credentials
and you will see the exact score and decision produced by the test suite.

Safe to run multiple times — existing seed users are skipped.
"""

from __future__ import annotations

import sys
import os
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.path.insert(0, os.path.dirname(__file__))

from datetime import datetime, timedelta, timezone
from passlib.context import CryptContext
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

from database import SessionLocal
from models.user import User
from models.sme import SME
from models.invoice import Invoice
from models.verification import Verification
from models.credit_score import CreditScore
from models.lender import Lender
from models.finance_request import FinanceRequest
from core.scoring import ScoringInput, calculate_score

db = SessionLocal()

PASSWORD = "Test1234!"
NOW = datetime.now(timezone.utc)


def hashed(plain: str) -> str:
    return pwd_context.hash(plain)


def make_invoice(
    sme_id: int,
    amount: float,
    status: str,
    days_overdue: int = 0,
    client: str = "Test Client (Pty) Ltd",
) -> Invoice:
    """
    status: "paid" | "pending" | "overdue"
    days_overdue > 0 means due_date is in the past (overdue/unpaid)
    """
    issue = NOW - timedelta(days=30 + days_overdue)
    due   = NOW - timedelta(days=days_overdue) if days_overdue > 0 else NOW + timedelta(days=30)
    return Invoice(
        sme_id=sme_id,
        client_name=client,
        description="Test invoice",
        amount=amount,
        status=status,
        invoice_number=f"INV-{sme_id}-{int(amount)}",
        issue_date=issue,
        due_date=due,
        currency="ZAR",
        created_at=issue,
    )


def make_verification(sme_id: int, doc_type: str) -> Verification:
    return Verification(
        sme_id=sme_id,
        doc_type=doc_type,
        document_url=f"/seed/placeholder_{doc_type}.pdf",
        status="approved",
        submitted_at=NOW - timedelta(days=5),
        reviewed_at=NOW - timedelta(days=3),
        reviewer_notes="Seeded for testing",
    )


def score_and_save(sme: SME, invoices: list[Invoice], verifications: list[Verification]) -> CreditScore:
    """Build a ScoringInput from seed data and persist the resulting score."""
    total    = len(invoices)
    unpaid   = sum(1 for inv in invoices if inv.status != "paid")
    on_time  = sum(
        1 for inv in invoices
        if inv.status == "paid"
        and inv.due_date is not None
        and inv.due_date >= inv.issue_date
    )
    ver_map  = {v.doc_type: v.status for v in verifications}

    revenue = float(sme.bs_parsed_revenue) if sme.bs_parsed_revenue else float(sme.revenue)

    inp = ScoringInput(
        revenue=revenue,
        years_active=sme.years_active,
        industry=sme.industry,
        total_invoices=total,
        paid_on_time=on_time,
        unpaid_invoices=unpaid,
        verifications=ver_map,
        overdraft_count=sme.bs_overdraft_count,
        income_regularity=float(sme.bs_income_regularity) if sme.bs_income_regularity else None,
        months_analysed=sme.bs_months_analysed,
    )
    result = calculate_score(inp)
    print(f"    Score: {result.score}  Decision: {result.decision}")
    return CreditScore(sme_id=sme.id, score=result.score, created_at=NOW)


def seed_scenario(
    n: int | str,
    label: str,
    email: str,
    industry: str,
    revenue: float,
    years_active: int,
    bs_parsed_revenue: float | None,
    bs_months_analysed: int | None,
    bs_income_regularity: float | None,
    bs_overdraft_count: int | None,
    bs_avg_monthly_income: float | None,
    invoice_specs: list[dict],      # [{amount, status, days_overdue}]
    doc_types: list[str],           # approved doc_types
):
    print(f"\nScenario {n}: {label}")

    if db.query(User).filter(User.email == email).first():
        print(f"  ↳ Already seeded, skipping.")
        return

    # User
    user = User(
        username=f"scenario_{n}",
        email=email,
        hashed_password=hashed(PASSWORD),
        role="sme",
    )
    db.add(user)
    db.flush()

    # SME
    sme = SME(
        user_id=user.id,
        name=f"Scenario {n} — {label}",
        industry=industry,
        revenue=revenue,
        years_active=years_active,
        bs_parsed_revenue=bs_parsed_revenue,
        bs_months_analysed=bs_months_analysed,
        bs_income_regularity=bs_income_regularity,
        bs_overdraft_count=bs_overdraft_count,
        bs_avg_monthly_income=bs_avg_monthly_income,
        bs_avg_monthly_expenses=bs_avg_monthly_income * 0.6 if bs_avg_monthly_income else None,
        bs_avg_monthly_balance=bs_avg_monthly_income * 0.3 if bs_avg_monthly_income else None,
    )
    db.add(sme)
    db.flush()

    # Invoices
    invoices: list[Invoice] = []
    for spec in invoice_specs:
        inv = make_invoice(
            sme_id=sme.id,
            amount=spec["amount"],
            status=spec["status"],
            days_overdue=spec.get("days_overdue", 0),
        )
        db.add(inv)
        invoices.append(inv)
    db.flush()

    # Verifications
    verifications: list[Verification] = []
    for doc in doc_types:
        v = make_verification(sme.id, doc)
        db.add(v)
        verifications.append(v)
    db.flush()

    # Score
    cs = score_and_save(sme, invoices, verifications)
    db.add(cs)
    db.commit()
    print(f"  ↳ Seeded. Login: {email} / {PASSWORD}")


# ── Scenarios ─────────────────────────────────────────────────────────────────

seed_scenario(
    n=1,
    label="New Business — No Docs, No Invoices",
    email="scenario_1@test.com",
    industry="Retail",
    revenue=20_000,
    years_active=0,
    bs_parsed_revenue=None,
    bs_months_analysed=None,
    bs_income_regularity=None,
    bs_overdraft_count=None,
    bs_avg_monthly_income=None,
    invoice_specs=[],
    doc_types=[],
)

seed_scenario(
    n=2,
    label="New Business — Bank Statement Uploaded (Not Approved)",
    email="scenario_2@test.com",
    industry="Retail",
    revenue=20_000,          # self-reported fallback — scorer uses parsed
    years_active=0,
    bs_parsed_revenue=150_000,
    bs_months_analysed=4,
    bs_income_regularity=0.82,
    bs_overdraft_count=0,
    bs_avg_monthly_income=12_500,
    invoice_specs=[],
    doc_types=[],            # uploaded but not yet approved
)

seed_scenario(
    n=3,
    label="New Business — CIPC & Bank Statement Approved",
    email="scenario_3@test.com",
    industry="Retail",
    revenue=20_000,
    years_active=0,
    bs_parsed_revenue=150_000,
    bs_months_analysed=4,
    bs_income_regularity=0.82,
    bs_overdraft_count=0,
    bs_avg_monthly_income=12_500,
    invoice_specs=[],
    doc_types=["cipc", "bank_statement"],
)

seed_scenario(
    n=4,
    label="Established Business — Good Invoices, All Docs Verified",
    email="scenario_4@test.com",
    industry="Professional Services",
    revenue=550_000,
    years_active=6,
    bs_parsed_revenue=550_000,
    bs_months_analysed=6,
    bs_income_regularity=0.95,
    bs_overdraft_count=0,
    bs_avg_monthly_income=45_833,
    invoice_specs=(
        [{"amount": 50_000, "status": "paid", "days_overdue": 0}] * 19
      + [{"amount": 50_000, "status": "pending", "days_overdue": 0}]
    ),
    doc_types=["cipc", "bank_statement", "tax_clearance", "registration_docs"],
)

seed_scenario(
    n=5,
    label="High Revenue — Poor Invoice Performance, No Docs",
    email="scenario_5@test.com",
    industry="Manufacturing",
    revenue=600_000,
    years_active=3,
    bs_parsed_revenue=None,
    bs_months_analysed=None,
    bs_income_regularity=None,
    bs_overdraft_count=None,
    bs_avg_monthly_income=None,
    invoice_specs=(
        [{"amount": 80_000, "status": "paid",    "days_overdue": 0}] * 8
      + [{"amount": 80_000, "status": "overdue", "days_overdue": 45}] * 12
    ),
    doc_types=[],
)

seed_scenario(
    n="6a",
    label="Baseline SME — Technology Sector (Low Risk)",
    email="scenario_6a@test.com",
    industry="Technology",
    revenue=150_000,
    years_active=2,
    bs_parsed_revenue=None,
    bs_months_analysed=None,
    bs_income_regularity=None,
    bs_overdraft_count=None,
    bs_avg_monthly_income=None,
    invoice_specs=(
        [{"amount": 30_000, "status": "paid",    "days_overdue": 0}] * 4
      + [{"amount": 30_000, "status": "pending", "days_overdue": 0}] * 1
    ),
    doc_types=["cipc"],
)

seed_scenario(
    n="6b",
    label="Baseline SME — Construction Sector (High Risk)",
    email="scenario_6b@test.com",
    industry="Construction",
    revenue=150_000,
    years_active=2,
    bs_parsed_revenue=None,
    bs_months_analysed=None,
    bs_income_regularity=None,
    bs_overdraft_count=None,
    bs_avg_monthly_income=None,
    invoice_specs=(
        [{"amount": 30_000, "status": "paid",    "days_overdue": 0}] * 4
      + [{"amount": 30_000, "status": "pending", "days_overdue": 0}] * 1
    ),
    doc_types=["cipc"],
)

db.close()
print("\n✓ All scenarios seeded successfully.")
print("\nLogin credentials:")
for i in ["1", "2", "3", "4", "5", "6a", "6b"]:
    print(f"  scenario_{i}@test.com  /  {PASSWORD}")
