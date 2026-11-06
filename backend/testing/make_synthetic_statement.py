"""
Generates FICTIONAL bank statements (PDF + ground truth JSON) for testing the transaction extractor.
All names and amounts are invented. Needs reportlab (dev only); the generated files are committed so
tests and CI do not need it.   Run: python testing/make_synthetic_statement.py
"""
import json
from datetime import date
from decimal import Decimal
from pathlib import Path

from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

OUT = Path(__file__).resolve().parent.parent / "tests" / "fixtures"
D = Decimal
OPENING = D("10000.00")
PERIOD = (date(2026, 1, 1), date(2026, 3, 31))

# (date, description, debit, credit, truth) ; truth: "sale" = genuine customer revenue,
# otherwise the TRUE nature of the deposit, or None for debits.
ROWS = [
    (date(2026, 1, 2),  "PAYMENT FROM ABC TRADERS",                 None, D("4500.00"), "sale"),
    (date(2026, 1, 3),  "OWNER CAPITAL INJECTION",                  None, D("20000.00"), "owner_contribution"),
    (date(2026, 1, 5),  "BUSINESS LOAN DISBURSEMENT",               None, D("50000.00"), "loan"),
    (date(2026, 1, 8),  "TRANSFER FROM SAVINGS",                    None, D("3000.00"), "internal_transfer"),
    (date(2026, 1, 10), "RENT JANUARY",                             D("6500.00"), None, None),
    (date(2026, 1, 15), "CUSTOMER REFUND",                          None, D("800.00"), "refund_reversal"),
    (date(2026, 1, 20), "LOAN REPAYMENT INVOICE",                   None, D("1200.00"), "ambiguous"),
    (date(2026, 1, 22), "SUPPLIER PAYMENT NDLOVU WHOLESALE",        D("3200.00"), None, None),
    (date(2026, 1, 25), "SALE OF EQUIPMENT",                        None, D("7500.00"), "asset_sale_not_revenue"),
    (date(2026, 1, 28), "OWNER STORES PAYMENT",                     None, D("2200.00"), "sale"),
    (date(2026, 1, 31), "PAYMENT FROM ABC TRADERS",                 None, D("4500.00"), "sale"),
    (date(2026, 1, 31), "MONTHLY ACCOUNT FEE",                      D("120.00"), None, None),
    (date(2026, 2, 2),  "PAYMENT FROM ABC TRADERS",                 None, D("4500.00"), "sale"),
    (date(2026, 2, 5),  "CASH DEPOSIT 88213",                       None, D("950.00"), "unknown"),
    (date(2026, 2, 14), "YOCO CARD SETTLEMENT",                     None, D("1250.00"), "sale"),
    (date(2026, 2, 14), "YOCO CARD SETTLEMENT",                     None, D("1250.00"), "sale"),   # identical row, same day
    (date(2026, 2, 20), "SALARIES FEBRUARY",                        D("8000.00"), None, None),
    (date(2026, 2, 27), "PAYMENT FROM KHUMALO HARDWARE AND BUILDING SUPPLIES INVOICE 20481 FEBRUARY ORDER",
                                                                    None, D("9800.00"), "sale"),   # wraps onto 2 lines
    (date(2026, 2, 28), "INV 20490 DUBE CATERING",                  None, D("3100.00"), "sale"),
    (date(2026, 3, 1),  "INV 20491 DUBE CATERING",                  None, D("3100.00"), "sale"),   # month-end span
    (date(2026, 3, 3),  "MONTHLY ACCOUNT FEE",                      D("120.00"), None, None),
    (date(2026, 3, 10), "PAYMENT FROM ABC TRADERS",                 None, D("4500.00"), "sale"),
    (date(2026, 3, 18), "SNAPSCAN SETTLEMENT",                      None, D("2650.00"), "sale"),
    (date(2026, 3, 25), "SUPPLIER PAYMENT NDLOVU WHOLESALE",        D("4100.00"), None, None),
    (date(2026, 3, 31), "INTER ACCOUNT TRANSFER",                   None, D("1500.00"), "internal_transfer"),
]
ROWS_PER_PAGE = 14
X = dict(date=40, desc=120, debit=420, credit=485, balance=555)  # right edges for numbers
WRAP = 40


def money(v):
    return f"{v:,.2f}"


def wrap(text):
    words, lines, cur = text.split(), [], ""
    for w in words:
        if len(cur) + len(w) + 1 > WRAP and cur:
            lines.append(cur)
            cur = w
        else:
            cur = f"{cur} {w}".strip()
    return lines + [cur]


def build(rows, opening, name, shown_closing=None, balances=None, garble_row=None):
    """balances: the balance printed per row (default: computed). garble_row: index whose credit text is corrupted."""
    bal, printed = opening, []
    for r in rows:
        bal = bal + (r[3] or 0) - (r[2] or 0)
        printed.append(bal)
    closing = shown_closing if shown_closing is not None else printed[-1]
    truth_rows = [dict(date=r[0].isoformat(), description=r[1], debit=str(r[2]) if r[2] else None,
                       credit=str(r[3]) if r[3] else None, balance=str(b), true_category=r[4])
                  for r, b in zip(rows, balances or printed)]

    c = canvas.Canvas(str(OUT / f"{name}.pdf"), pagesize=A4)
    height = A4[1]
    pages = [rows[i:i + ROWS_PER_PAGE] for i in range(0, len(rows), ROWS_PER_PAGE)]
    idx = 0
    for p, chunk in enumerate(pages, 1):
        y = height - 50
        c.setFont("Helvetica-Bold", 12)
        c.drawString(X["date"], y, "SYNTHETIC TEST BANK - FICTIONAL STATEMENT")
        y -= 16
        c.setFont("Helvetica", 9)
        c.drawString(X["date"], y, f"Statement period: {PERIOD[0]:%d %b %Y} to {PERIOD[1]:%d %b %Y}")
        y -= 14
        c.drawString(X["date"], y, "Account holder: Example Trading (Pty) Ltd (fictional)")
        y -= 22
        c.setFont("Helvetica-Bold", 9)
        c.drawString(X["date"], y, "Date")
        c.drawString(X["desc"], y, "Description")
        for k, label in (("debit", "Debit"), ("credit", "Credit"), ("balance", "Balance")):
            c.drawRightString(X[k], y, label)
        y -= 16
        c.setFont("Helvetica", 9)
        if p == 1:
            c.drawString(X["desc"], y, "Opening Balance")
            c.drawRightString(X["balance"], y, money(opening))
            y -= 14
        for r in chunk:
            lines = wrap(r[1])
            c.drawString(X["date"], y, f"{r[0]:%d %b %Y}")
            c.drawString(X["desc"], y, lines[0])
            if r[2]:
                c.drawRightString(X["debit"], y, money(r[2]))
            if r[3]:
                txt = money(r[3])
                if garble_row == idx:
                    txt = txt.replace("0", "O", 1)
                c.drawRightString(X["credit"], y, txt)
            c.drawRightString(X["balance"], y, money((balances or printed)[idx]))
            for extra in lines[1:]:
                y -= 12
                c.drawString(X["desc"], y, extra)
            y -= 14
            idx += 1
        if p == len(pages):
            c.setFont("Helvetica-Bold", 9)
            c.drawString(X["desc"], y, "Closing Balance")
            c.drawRightString(X["balance"], y, money(closing))
        c.setFont("Helvetica", 8)
        c.drawString(X["date"], 30, f"Page {p} of {len(pages)}")
        c.showPage()
    c.save()
    (OUT / f"{name}.truth.json").write_text(json.dumps(dict(
        opening_balance=str(opening), closing_balance=str(closing), period_start=PERIOD[0].isoformat(),
        period_end=PERIOD[1].isoformat(), rows=truth_rows), indent=2))
    return printed


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    build(ROWS, OPENING, "synthetic_statement_hard_cases")
    # Negative cases: the extractor must REPORT these, not pass them silently.
    full_balances = build(ROWS, OPENING, "synthetic_statement_hard_cases")
    missing = 8  # drop one row from the PDF but keep the original printed balances and closing balance
    build(ROWS[:missing] + ROWS[missing + 1:], OPENING, "synthetic_statement_missing_row",
          shown_closing=full_balances[-1], balances=full_balances[:missing] + full_balances[missing + 1:])
    build(ROWS, OPENING, "synthetic_statement_garbled_amount", garble_row=0)
    print("written to", OUT)
