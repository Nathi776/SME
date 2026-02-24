from sqlalchemy import inspect, text
from database import engine

with engine.connect() as conn:
    inspector = inspect(conn)
    columns = [c["name"] for c in inspector.get_columns("finance_requests")]

    if "platform_fee" not in columns:
        conn.execute(text("ALTER TABLE finance_requests ADD COLUMN platform_fee FLOAT DEFAULT 0"))
        print("✓ platform_fee added")

    if "net_amount" not in columns:
        conn.execute(text("ALTER TABLE finance_requests ADD COLUMN net_amount FLOAT DEFAULT 0"))
        print("✓ net_amount added")

    conn.commit()
