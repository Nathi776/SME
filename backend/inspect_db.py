import sys
from pathlib import Path

# Ensure backend package modules are importable when running from the repo root
sys.path.insert(0, str(Path(__file__).resolve().parent))

# Import dependent models so SQLAlchemy mappers are configured
import models.user  # noqa: F401
import models.sme  # noqa: F401
import models.lender  # noqa: F401
import models.invoice  # noqa: F401
import models.credit_score  # noqa: F401
import models.finance_request  # noqa: F401
import models.verification  # noqa: F401

from database import SessionLocal
from models.user import User
from models.sme import SME
from models.invoice import Invoice
from models.finance_request import FinanceRequest

def inspect():
    db = SessionLocal()
    try:
        users = db.query(User).all()
        print(f"--- Users: {len(users)} ---")
        for u in users:
            print(f"ID: {u.id}, Username: {u.username}, Role: {u.role}, Email: {u.email}")
            
        smes = db.query(SME).all()
        print(f"\n--- SMEs: {len(smes)} ---")
        for s in smes:
            print(f"ID: {s.id}, Name: {s.name}, User ID: {s.user_id}")
            
        invoices = db.query(Invoice).all()
        print(f"\n--- Invoices: {len(invoices)} ---")
        for i in invoices:
            print(f"ID: {i.id}, Client: {i.client_name}, Amount: {i.amount}, Status: {i.status}, SME ID: {i.sme_id}")
            
        requests = db.query(FinanceRequest).all()
        print(f"\n--- Finance Requests: {len(requests)} ---")
        for r in requests:
            print(f"ID: {r.id}, SME ID: {r.sme_id}, Invoice ID: {r.invoice_id}, Status: {r.status}")
    finally:
        db.close()

if __name__ == "__main__":
    inspect()
