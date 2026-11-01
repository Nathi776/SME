"""
Remove the placeholder customers and invoices that older versions of GET /customers/ inserted
into every business account that had fewer than 10 invoices.

    python remove_seeded_customers.py            # show what would be removed (changes nothing)
    python remove_seeded_customers.py --apply    # remove it

An invoice is treated as placeholder data only when its client name, invoice number AND amount all
match the old built-in sample list. Any of them that already has a finance request is kept and
reported, so no financing record is ever orphaned. Back up the database before using --apply.
"""
import sys
from decimal import Decimal
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import models  # noqa: F401,E402
from database import SessionLocal  # noqa: E402
from models.invoice import Invoice  # noqa: E402

SAMPLE = {(c, n, Decimal(str(a))) for c, n, a in [["ABC Manufacturing (Pty) Ltd", "INV-2026-001", 50000.0], ["ABC Manufacturing (Pty) Ltd", "INV-2026-002", 70000.0], ["ABC Manufacturing (Pty) Ltd", "INV-2026-003", 40000.0], ["ABC Manufacturing (Pty) Ltd", "INV-2026-004", 60000.0], ["ABC Manufacturing (Pty) Ltd", "INV-2026-005", 60000.0], ["ABC Manufacturing (Pty) Ltd", "INV-2026-006", 30000.0], ["ABC Manufacturing (Pty) Ltd", "INV-2026-007", 25000.0], ["ABC Manufacturing (Pty) Ltd", "INV-2026-008", 45000.0], ["BuildTech (Pty) Ltd", "INV-2026-023", 15000.0], ["BuildTech (Pty) Ltd", "INV-2026-024", 25000.0], ["BuildTech (Pty) Ltd", "INV-2026-025", 30000.0], ["BuildTech (Pty) Ltd", "INV-2026-026", 10000.0], ["Cape Logistics", "INV-2026-027", 50000.0], ["Cape Logistics", "INV-2026-028", 40000.0], ["City Power Solutions", "INV-2026-014", 20000.0], ["City Power Solutions", "INV-2026-015", 30000.0], ["City Power Solutions", "INV-2026-016", 40000.0], ["Durban Retailers Ltd", "INV-2026-029", 35000.0], ["Durban Retailers Ltd", "INV-2026-030", 25000.0], ["Global Partner 10 Ltd", "INV-2026-010", 20000.0], ["Global Partner 11 Ltd", "INV-2026-011", 20500.0], ["Global Partner 12 Ltd", "INV-2026-012", 21000.0], ["Global Partner 13 Ltd", "INV-2026-013", 21500.0], ["Global Partner 14 Ltd", "INV-2026-014", 22000.0], ["Global Partner 15 Ltd", "INV-2026-015", 22500.0], ["Global Partner 16 Ltd", "INV-2026-016", 23000.0], ["Global Partner 17 Ltd", "INV-2026-017", 23500.0], ["Global Partner 18 Ltd", "INV-2026-018", 24000.0], ["Global Partner 19 Ltd", "INV-2026-019", 24500.0], ["Global Partner 20 Ltd", "INV-2026-020", 25000.0], ["Global Partner 21 Ltd", "INV-2026-021", 25500.0], ["Global Partner 22 Ltd", "INV-2026-022", 26000.0], ["Global Partner 23 Ltd", "INV-2026-023", 26500.0], ["Global Partner 24 Ltd", "INV-2026-024", 27000.0], ["Global Partner 25 Ltd", "INV-2026-025", 27500.0], ["Global Partner 26 Ltd", "INV-2026-026", 28000.0], ["Global Partner 27 Ltd", "INV-2026-027", 28500.0], ["Global Partner 28 Ltd", "INV-2026-028", 29000.0], ["Global Partner 29 Ltd", "INV-2026-029", 29500.0], ["Global Partner 30 Ltd", "INV-2026-030", 30000.0], ["Global Partner 31 Ltd", "INV-2026-031", 30500.0], ["Global Partner 32 Ltd", "INV-2026-032", 31000.0], ["Global Partner 8 Ltd", "INV-2026-008", 19000.0], ["Global Partner 9 Ltd", "INV-2026-009", 19500.0], ["Metro Hardware Supplies", "INV-2026-009", 30000.0], ["Metro Hardware Supplies", "INV-2026-010", 40000.0], ["Metro Hardware Supplies", "INV-2026-011", 50000.0], ["Metro Hardware Supplies", "INV-2026-012", 35000.0], ["Metro Hardware Supplies", "INV-2026-013", 25000.0], ["Office First (Pty) Ltd", "INV-2026-017", 20000.0], ["Office First (Pty) Ltd", "INV-2026-018", 30000.0], ["Office First (Pty) Ltd", "INV-2026-019", 40000.0], ["Office First (Pty) Ltd", "INV-2026-020", 20000.0], ["Office First (Pty) Ltd", "INV-2026-021", 15000.0], ["Office First (Pty) Ltd", "INV-2026-022", 25000.0]]}


def main(apply: bool) -> None:
    db = SessionLocal()
    try:
        matches = [
            i for i in db.query(Invoice).all()
            if (i.client_name, i.invoice_number, Decimal(str(i.amount))) in SAMPLE
        ]
        removable = [i for i in matches if not i.finance_requests]
        kept = [i for i in matches if i.finance_requests]
        print(f"Placeholder invoices found: {len(matches)} (removable: {len(removable)}, kept because they have finance requests: {len(kept)})")
        for i in kept:
            print(f"  kept: invoice {i.id} ({i.client_name}, {i.invoice_number}) for SME {i.sme_id}")
        if not apply:
            print("Dry run only. Re-run with --apply to remove them.")
            return
        for i in removable:
            db.delete(i)
        db.commit()
        print(f"Removed {len(removable)} invoices.")
    finally:
        db.close()


if __name__ == "__main__":
    main("--apply" in sys.argv)
