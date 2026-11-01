from decimal import Decimal

import remove_seeded_customers as rsc
from models import Invoice
from tests.test_access_isolation import world  # noqa: F401


def test_viewing_customers_never_creates_invoices(world):
    before = world.db.query(Invoice).count()
    for _ in range(2):
        assert world.call("a", "GET", "/customers/").status_code == 200
    assert world.db.query(Invoice).count() == before


def test_cleanup_script_removes_only_placeholder_invoices_and_defaults_to_dry_run(world, monkeypatch):
    client, number, amount = sorted(rsc.SAMPLE)[0]
    fake = Invoice(sme_id=world.A.id, client_name=client, invoice_number=number, amount=amount, status="paid")
    real = Invoice(sme_id=world.A.id, client_name="Real Customer", invoice_number=number, amount=amount, status="paid")
    world.db.add_all([fake, real]); world.db.commit()
    fake_id, real_id = fake.id, real.id

    class Keep:  # keep the test session open; the script closes the session it is given
        def __getattr__(self, n): return getattr(world.db, n)
        def close(self): pass
    monkeypatch.setattr(rsc, "SessionLocal", lambda: Keep())

    rsc.main(apply=False)
    assert world.db.get(Invoice, fake_id) is not None
    rsc.main(apply=True)
    assert world.db.get(Invoice, fake_id) is None
    assert world.db.get(Invoice, real_id) is not None
