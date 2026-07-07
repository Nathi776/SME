"""
seed_fresh.py — Complete fresh test data for the SME platform.

Run from backend/ after clearing the database:
    python seed_fresh.py

Creates:
  • 1 Admin
  • 2 Lenders  (conservative + impact)
  • 10 SME accounts covering all test scenarios (including S7c)
  • Invoices, verifications, credit scores for each

All passwords:  Test1234!
"""
from __future__ import annotations
import sys, os, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.path.insert(0, os.path.dirname(__file__))

from decimal import Decimal
from datetime import datetime, timedelta, timezone
from passlib.context import CryptContext
from database import SessionLocal
from models.user import User
from models.sme import SME
from models.lender import Lender
from models.invoice import Invoice
from models.verification import Verification
from models.credit_score import CreditScore
from models.finance_request import FinanceRequest
from core.scoring import ScoringInput, calculate_score


db = SessionLocal()
pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")
PWD = "Test1234!"
NOW = datetime.now(timezone.utc)

def h(p): return pwd.hash(p)

def skip(email):
    if db.query(User).filter(User.email == email).first():
        print(f"  ↳ Already exists, skipping.")
        return True
    return False

def add_verification(sme_id, doc_type, status="approved"):
    ver = Verification(
        sme_id=sme_id, doc_type=doc_type,
        document_url=f"/seed/{doc_type}_placeholder.pdf",
        status=status,
        submitted_at=NOW - timedelta(days=7),
        reviewed_at=NOW - timedelta(days=5) if status == "approved" else None,
        reviewer_notes="Seeded for testing" if status == "approved" else None,
    )
    db.add(ver)

def add_invoice(sme_id, client, amount, status, days_ago_issued=30, days_overdue=0):
    issue = NOW - timedelta(days=days_ago_issued)
    due = NOW - timedelta(days=days_overdue) if days_overdue > 0 else NOW + timedelta(days=30)
    inv = Invoice(
        sme_id=sme_id, client_name=client,
        description="Professional services", amount=Decimal(str(amount)),
        status=status, invoice_number=f"INV-{sme_id}-{client[:4].upper()}-{days_ago_issued}",
        issue_date=issue, due_date=due, currency="ZAR", created_at=issue,
    )
    db.add(inv)
    return inv

def score_sme(sme, invoices, verifications):
    total = len(invoices)
    unpaid = sum(1 for i in invoices if i.status != "paid")
    on_time = sum(1 for i in invoices if i.status == "paid" and i.due_date and i.due_date >= i.issue_date)
    ver_map = {v.doc_type: v.status for v in verifications}
    revenue = float(sme.bs_parsed_revenue) if sme.bs_parsed_revenue else float(sme.revenue)
    inp = ScoringInput(
        revenue=revenue, years_active=sme.years_active, industry=sme.industry,
        total_invoices=total, paid_on_time=on_time, unpaid_invoices=unpaid,
        verifications=ver_map,
        overdraft_count=int(sme.bs_overdraft_count) if sme.bs_overdraft_count is not None else None,
        income_regularity=float(sme.bs_income_regularity) if sme.bs_income_regularity is not None else None,
        months_analysed=int(sme.bs_months_analysed) if sme.bs_months_analysed is not None else None,
        province=sme.province,
    )
    result = calculate_score(inp)
    cs = CreditScore(sme_id=sme.id, score=result.score, created_at=NOW)
    db.add(cs)
    return result


# Clear existing data to force clean seeding
print("🧹 Cleaning database tables...")
db.query(FinanceRequest).delete()
db.query(Verification).delete()
db.query(CreditScore).delete()
db.query(Invoice).delete()
db.query(Lender).delete()
db.query(SME).delete()
db.query(User).delete()
db.commit()
print("✨ Database clean!")

print("\n🌱 Seeding fresh test data...\n")

# ════════════════════════════════════════════════════════════════════════════════
# ADMIN
# ════════════════════════════════════════════════════════════════════════════════
print("👤 Admin account")
if not skip("admin@smeplatform.co.za"):
    db.add(User(username="admin", email="admin@smeplatform.co.za",
                hashed_password=h(PWD), role="admin"))
    db.commit()
    print(f"  ↳ Created admin@smeplatform.co.za / {PWD}")

# ════════════════════════════════════════════════════════════════════════════════
# LENDERS
# ════════════════════════════════════════════════════════════════════════════════
print("\n🏦 Lender accounts")

for email, username, name, ltype in [
    ("lender.conservative@nedbank.co.za", "nedbank_lender",
     "Nedbank Business Finance", "Commercial Bank — Conservative"),
    ("lender.impact@sefa.co.za",          "sefa_lender",
     "SEFA — Small Enterprise Finance Agency", "Development Finance Institution — Impact"),
]:
    print(f"  {name}")
    if not skip(email):
        u = User(username=username, email=email, hashed_password=h(PWD), role="lender")
        db.add(u); db.flush()
        db.add(Lender(user_id=u.id, organization_name=name, contact_email=email))
        db.commit()
        print(f"  ↳ Created {email} / {PWD}")

# ════════════════════════════════════════════════════════════════════════════════
# SME SCENARIOS
# ════════════════════════════════════════════════════════════════════════════════

def make_sme(scenario, email, username, sme_name, industry, revenue, years_active,
             bs_parsed_revenue=None, bs_months_analysed=None,
             bs_income_regularity=None, bs_overdraft_count=None,
             bs_avg_monthly_income=None, province=None, business_city=None):
    print(f"\n📋 {scenario}")
    if skip(email): return None, None
    u = User(username=username, email=email, hashed_password=h(PWD), role="sme")
    db.add(u); db.flush()
    avg_inc = bs_avg_monthly_income or (bs_parsed_revenue / 12 if bs_parsed_revenue else None)
    sme = SME(
        user_id=u.id, name=sme_name, industry=industry,
        revenue=Decimal(str(revenue)), years_active=years_active,
        province=province, business_city=business_city,
        bs_parsed_revenue=Decimal(str(bs_parsed_revenue)) if bs_parsed_revenue else None,
        bs_months_analysed=bs_months_analysed,
        bs_income_regularity=Decimal(str(bs_income_regularity)) if bs_income_regularity else None,
        bs_overdraft_count=bs_overdraft_count,
        bs_avg_monthly_income=Decimal(str(avg_inc)) if avg_inc else None,
        bs_avg_monthly_expenses=Decimal(str(avg_inc * 0.55)) if avg_inc else None,
        bs_avg_monthly_balance=Decimal(str(avg_inc * 0.30)) if avg_inc else None,
    )
    db.add(sme); db.flush()
    return u, sme


# ── S1: New business, no documents, no invoices ───────────────────────────────
u, sme = make_sme(
    "S1 — New Business | No Docs | No Invoices | Expected: DECLINED (~25 pts)",
    "s1.new.nodocs@testmail.co.za", "s1_khulani",
    "Khulani Cleaning Solutions (Pty) Ltd", "Retail", 20_000, 0,
    province="Gauteng", business_city="Johannesburg")
if sme:
    result = score_sme(sme, [], [])
    db.commit()
    print(f"  ↳ Score: {result.score} | {result.decision} | Login: s1.new.nodocs@testmail.co.za / {PWD}")

# ── S2: New business, bank statement uploaded (not approved) ──────────────────
u, sme = make_sme(
    "S2 — New Business | Bank Statement Uploaded (pending) | Expected: DECLINED (~38 pts)",
    "s2.new.bankonly@testmail.co.za", "s2_khulani",
    "Khulani Cleaning Solutions (Pty) Ltd", "Retail", 20_000, 0,
    bs_parsed_revenue=114_000, bs_months_analysed=4,
    bs_income_regularity=0.78, bs_overdraft_count=0, bs_avg_monthly_income=9_500,
    province="Gauteng", business_city="Johannesburg")
if sme:
    vers = []
    add_verification(sme.id, "bank_statement", status="pending")
    db.flush()
    vers = db.query(Verification).filter(Verification.sme_id == sme.id).all()
    result = score_sme(sme, [], vers)
    db.commit()
    print(f"  ↳ Score: {result.score} | {result.decision} | Login: s2.new.bankonly@testmail.co.za / {PWD}")
    print(f"     ⚠ Upload bank_statement.pdf from S2 folder and have admin approve to see score jump.")

# ── S3: New business, CIPC + bank statement approved ─────────────────────────
u, sme = make_sme(
    "S3 — New Business | CIPC + Bank Approved | Expected: REVIEW (~56 pts) -> Now Gauteng/Tech (~62.7 pts)",
    "s3.new.cipc.bank@testmail.co.za", "s3_siyanda",
    "Siyanda Tech Innovations (Pty) Ltd", "Technology", 20_000, 0,
    bs_parsed_revenue=150_000, bs_months_analysed=4,
    bs_income_regularity=0.82, bs_overdraft_count=0, bs_avg_monthly_income=12_500,
    province="Gauteng", business_city="Johannesburg")
if sme:
    add_verification(sme.id, "cipc", "approved")
    add_verification(sme.id, "bank_statement", "approved")
    db.flush()
    vers = db.query(Verification).filter(Verification.sme_id == sme.id).all()
    result = score_sme(sme, [], vers)
    db.commit()
    print(f"  ↳ Score: {result.score} | {result.decision} | Login: s3.new.cipc.bank@testmail.co.za / {PWD}")
    print(f"     ✅ Can apply for pre-invoice funding (score ≥ 50).")

# ── S4: New business, all 4 docs approved, strong bank statement ──────────────
u, sme = make_sme(
    "S4 — New Business | All 4 Docs Approved | Strong Bank | Expected: APPROVED (75+ pts)",
    "s4.new.fullydoc@testmail.co.za", "s4_nomsa",
    "Nomsa Consulting Group (Pty) Ltd", "Professional Services", 20_000, 0,
    bs_parsed_revenue=300_000, bs_months_analysed=6,
    bs_income_regularity=0.94, bs_overdraft_count=0, bs_avg_monthly_income=25_000,
    province="Gauteng", business_city="Johannesburg")
if sme:
    for doc in ["cipc", "bank_statement", "tax_clearance", "registration_docs"]:
        add_verification(sme.id, doc, "approved")
    db.flush()
    vers = db.query(Verification).filter(Verification.sme_id == sme.id).all()
    result = score_sme(sme, [], vers)
    db.commit()
    print(f"  ↳ Score: {result.score} | {result.decision} | Login: s4.new.fullydoc@testmail.co.za / {PWD}")
    print(f"     ✅ New business that qualifies — strong pre-invoice case.")

# ── S5: Established business, perfect invoices, all docs ─────────────────────
u, sme = make_sme(
    "S5 — Established Business | Perfect Invoices | All Docs | Expected: APPROVED (100 pts)",
    "s5.established.perfect@testmail.co.za", "s5_thabo",
    "Thabo Nkosi Engineering (Pty) Ltd", "Manufacturing", 550_000, 6,
    bs_parsed_revenue=612_000, bs_months_analysed=6,
    bs_income_regularity=0.96, bs_overdraft_count=0, bs_avg_monthly_income=51_000,
    province="Gauteng", business_city="Johannesburg")
if sme:
    invoices = []
    for client, amt, days_ago, overdue in [
        ("Sasol (Pty) Ltd",       55000, 150, 0),
        ("Eskom Holdings SOC",    38000, 140, 0),
        ("Anglo American Plc",    62000, 120, 0),
        ("ArcelorMittal SA",      41000, 110, 0),
        ("Transnet SOC Ltd",      58000, 90,  0),
        ("Sapref (Pty) Ltd",      44000, 80,  0),
        ("Sasol (Pty) Ltd",       60000, 60,  0),
        ("Eskom Holdings SOC",    42000, 50,  0),
        ("Anglo American Plc",    65000, 30,  0),
        ("Transnet SOC Ltd",      48000, 20,  0),
    ]:
        inv = add_invoice(sme.id, client, amt, "paid", days_ago, overdue)
        invoices.append(inv)
    add_invoice(sme.id, "ArcelorMittal SA", 45000, "pending", 10, 0)
    invoices.append(db.query(Invoice).filter(Invoice.sme_id == sme.id,
                                              Invoice.status == "pending").first() or invoices[-1])
    for doc in ["cipc", "bank_statement", "tax_clearance", "registration_docs"]:
        add_verification(sme.id, doc, "approved")
    db.flush()
    all_invoices = db.query(Invoice).filter(Invoice.sme_id == sme.id).all()
    vers = db.query(Verification).filter(Verification.sme_id == sme.id).all()
    result = score_sme(sme, all_invoices, vers)
    db.commit()
    print(f"  ↳ Score: {result.score} | {result.decision} | Login: s5.established.perfect@testmail.co.za / {PWD}")
    print(f"     ✅ Gold standard — 10 paid invoices, all docs, 6yr history.")

# ── S6: High revenue, poor invoice behaviour, no docs ────────────────────────
u, sme = make_sme(
    "S6 — High Revenue | Poor Invoices (60% unpaid) | No Docs | Expected: DECLINED (~40 pts)",
    "s6.highrev.poorinv@testmail.co.za", "s6_vusi",
    "Vusi Retail Solutions (Pty) Ltd", "Manufacturing", 600_000, 3,
    province="Gauteng", business_city="Johannesburg")
if sme:
    for client, amt, days_ago, status in [
        ("Builders Warehouse",  80000, 150, "paid"),
        ("Game Stores (Pty)",   80000, 140, "paid"),
        ("Massmart Holdings",   80000, 120, "paid"),
        ("Pepkor Retail",       80000, 110, "paid"),
        ("Shoprite Holdings",   80000, 100, "paid"),
        ("Pick n Pay Stores",   80000, 90,  "overdue"),
        ("Spar Group Ltd",      80000, 80,  "overdue"),
        ("Woolworths Holdings", 80000, 70,  "overdue"),
        ("TFG Africa (Pty)",    80000, 60,  "overdue"),
        ("Clicks Group Ltd",    80000, 50,  "overdue"),
        ("Dis-Chem Pharmacies", 80000, 40,  "overdue"),
    ]:
        add_invoice(sme.id, client, amt, status, days_ago,
                    days_overdue=45 if status == "overdue" else 0)
    db.flush()
    all_invoices = db.query(Invoice).filter(Invoice.sme_id == sme.id).all()
    result = score_sme(sme, all_invoices, [])
    db.commit()
    print(f"  ↳ Score: {result.score} | {result.decision} | Login: s6.highrev.poorinv@testmail.co.za / {PWD}")

# ── S7a: Technology sector baseline ──────────────────────────────────────────
u, sme = make_sme(
    "S7a — Technology Sector (Gauteng) | Baseline Profile | Expected: REVIEW (58.2 pts)",
    "s7a.tech.sector@testmail.co.za", "s7a_lebo_tech",
    "Lebo Technology Ventures (Pty) Ltd", "Technology", 150_000, 2,
    province="Gauteng", business_city="Johannesburg")
if sme:
    for client, amt, days_ago, status in [
        ("Metro Trading (Pty) Ltd", 30000, 120, "paid"),
        ("City Works (Pty) Ltd",    30000, 90,  "paid"),
        ("Absa Bank Ltd",           30000, 60,  "paid"),
        ("Discovery Ltd",           30000, 30,  "paid"),
        ("Pending client",          30000, 5,   "pending"),
    ]:
        add_invoice(sme.id, client, amt, status, days_ago)
    add_verification(sme.id, "cipc", "approved")
    db.flush()
    all_invoices = db.query(Invoice).filter(Invoice.sme_id == sme.id).all()
    vers = db.query(Verification).filter(Verification.sme_id == sme.id).all()
    result = score_sme(sme, all_invoices, vers)
    db.commit()
    print(f"  ↳ Score: {result.score} | {result.decision} | Login: s7a.tech.sector@testmail.co.za / {PWD}")

# ── S7b: Construction sector baseline (identical profile) ─────────────────────
u, sme = make_sme(
    "S7b — Construction Sector (Gauteng) | Same Profile as S7a | Expected: REVIEW (51.8 pts)",
    "s7b.construction.sector@testmail.co.za", "s7b_lebo_construction",
    "Lebo Construction Ventures (Pty) Ltd", "Construction", 150_000, 2,
    province="Gauteng", business_city="Johannesburg")
if sme:
    for client, amt, days_ago, status in [
        ("Metro Trading (Pty) Ltd", 30000, 120, "paid"),
        ("City Works (Pty) Ltd",    30000, 90,  "paid"),
        ("Absa Bank Ltd",           30000, 60,  "paid"),
        ("Discovery Ltd",           30000, 30,  "paid"),
        ("Pending client",          30000, 5,   "pending"),
    ]:
        add_invoice(sme.id, client, amt, status, days_ago)
    add_verification(sme.id, "cipc", "approved")
    db.flush()
    all_invoices = db.query(Invoice).filter(Invoice.sme_id == sme.id).all()
    vers = db.query(Verification).filter(Verification.sme_id == sme.id).all()
    result = score_sme(sme, all_invoices, vers)
    db.commit()
    print(f"  ↳ Score: {result.score} | {result.decision} | Login: s7b.construction.sector@testmail.co.za / {PWD}")
    print(f"     ↑ Compare with S7a — 6.4 pt gap from industry risk.")

# ── S7c: Technology sector in Limpopo (different market viability) ────────────
u, sme = make_sme(
    "S7c — Technology Sector in Limpopo | Same as S7a but Limpopo | Expected: REVIEW (52.4 pts)",
    "s7c.tech.limpopo@testmail.co.za", "s7c_lebo_limpopo",
    "Lebo Tech Limpopo (Pty) Ltd", "Technology", 150_000, 2,
    province="Limpopo", business_city="Polokwane")
if sme:
    for client, amt, days_ago, status in [
        ("Metro Trading (Pty) Ltd", 30000, 120, "paid"),
        ("City Works (Pty) Ltd",    30000, 90,  "paid"),
        ("Absa Bank Ltd",           30000, 60,  "paid"),
        ("Discovery Ltd",           30000, 30,  "paid"),
        ("Pending client",          30000, 5,   "pending"),
    ]:
        add_invoice(sme.id, client, amt, status, days_ago)
    add_verification(sme.id, "cipc", "approved")
    db.flush()
    all_invoices = db.query(Invoice).filter(Invoice.sme_id == sme.id).all()
    vers = db.query(Verification).filter(Verification.sme_id == sme.id).all()
    result = score_sme(sme, all_invoices, vers)
    db.commit()
    print(f"  ↳ Score: {result.score} | {result.decision} | Login: s7c.tech.limpopo@testmail.co.za / {PWD}")
    print(f"     ↑ Compare with S7a (Gauteng Tech) at 58.2 vs S7c (Limpopo Tech) at 52.4.")

db.close()

print("\n" + "═"*60)
print("✅ SEEDING COMPLETE")
print("═"*60)
print("\n📧 LOGIN CREDENTIALS (all password: Test1234!)\n")
accounts = [
    ("ADMIN",       "admin@smeplatform.co.za"),
    ("LENDER 1",    "lender.conservative@nedbank.co.za"),
    ("LENDER 2",    "lender.impact@sefa.co.za"),
    ("SME S1",      "s1.new.nodocs@testmail.co.za"),
    ("SME S2",      "s2.new.bankonly@testmail.co.za"),
    ("SME S3",      "s3.new.cipc.bank@testmail.co.za"),
    ("SME S4",      "s4.new.fullydoc@testmail.co.za"),
    ("SME S5",      "s5.established.perfect@testmail.co.za"),
    ("SME S6",      "s6.highrev.poorinv@testmail.co.za"),
    ("SME S7a",     "s7a.tech.sector@testmail.co.za"),
    ("SME S7b",     "s7b.construction.sector@testmail.co.za"),
    ("SME S7c",     "s7c.tech.limpopo@testmail.co.za"),
]
for role, email in accounts:
    print(f"  {role:<12} {email}")
print()
