"""
Analysis only: how reliable is bank-derived customer revenue today? Reads the extractor, classifier and
normaliser on the synthetic fixtures against their ground truth and changes nothing.
Run: python testing/bank_revenue_reliability.py   (prints markdown)
"""
import json
import sys
from decimal import Decimal
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from services.bank_statement_parser import parse_bank_statement  # noqa: E402
from services.transaction_extractor import extract_and_classify  # noqa: E402

FIX = Path(__file__).resolve().parent.parent / "tests" / "fixtures"
D = Decimal


def main():
    print("| Fixture | Extraction trustworthy | Credits (truth) | True customer revenue | Naive 'all credits' "
          "overstates by | Classifier counts as revenue | Wrongly counted | Missed / left unresolved | Annual figure |")
    print("|---|---|---|---|---|---|---|---|---|")
    for pdf in sorted(FIX.glob("synthetic_statement_*.pdf")):
        truth = json.loads(pdf.with_suffix(".truth.json").read_text())
        rows = [r for r in truth["rows"] if r["credit"]]
        credits = sum(D(r["credit"]) for r in rows)
        true_rev = sum(D(r["credit"]) for r in rows if r["true_category"] == "sale")
        out = extract_and_classify(pdf.read_bytes())
        parsed_old = parse_bank_statement(pdf.read_bytes())
        if out.observation is None:
            print(f"| {pdf.stem[len('synthetic_statement_'):]} | no ({len(out.blocked_reason)} problem(s)) | {credits} | "
                  f"{true_rev} | {credits - true_rev} ({(credits - true_rev) / credits:.0%}) | blocked | – | – | none |")
            continue
        o = out.observation
        by_key = {(r["date"], r["description"], D(r["credit"])): r["true_category"] for r in rows}
        wrong = missed = D(0)
        for c in out.classified:
            truth_cat = by_key.get((c.transaction.date.isoformat(), c.transaction.description, c.transaction.amount))
            if c.counts_as_revenue and truth_cat != "sale":
                wrong += c.transaction.amount
            if not c.counts_as_revenue and truth_cat == "sale":
                missed += c.transaction.amount
        print(f"| {pdf.stem[len('synthetic_statement_'):]} | yes | {credits} | {true_rev} | "
              f"{credits - true_rev} ({(credits - true_rev) / credits:.0%}) | {o.observed_customer_revenue} | "
              f"{wrong} | {missed} (unresolved {o.unresolved_deposits}) | {o.annualised_run_rate} ({o.basis}) |")
    print("\nProduction parser on a real-layout PDF:", parse_bank_statement((FIX / "synthetic_statement_hard_cases.pdf").read_bytes()))
    crafted = (b"avg_monthly_balance: 1\navg_monthly_income: 500000\navg_monthly_expenses: 1\noverdraft_count: 0\n"
               b"income_regularity: 0.9\nmonths_analysed: 12\nparsed_revenue: 5000000")
    print("Production parser on a 7-line text file that merely states the fields:", parse_bank_statement(crafted))


if __name__ == "__main__":
    main()
