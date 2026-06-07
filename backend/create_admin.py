import sys
from pathlib import Path

# Ensure backend package modules are importable when running from the repo root
sys.path.insert(0, str(Path(__file__).resolve().parent))

from database import SessionLocal

# Import dependent models so SQLAlchemy mappers are configured
import models.sme  # noqa: F401
import models.lender  # noqa: F401
import models.invoice  # noqa: F401
import models.credit_score  # noqa: F401
import models.finance_request  # noqa: F401
import models.verification  # noqa: F401

from models.user import User
from services.auth_service import hash_password


def main():
    username = "admin"
    email = "admin@example.com"
    password = "AdminPass123"

    db = SessionLocal()
    try:
        existing = db.query(User).filter(User.username == username).first()
        if existing:
            print(f"User with username '{username}' already exists (id={existing.id}, role={existing.role}).")
            return

        existing_email = db.query(User).filter(User.email == email).first()
        if existing_email:
            print(f"User with email '{email}' already exists (id={existing_email.id}, role={existing_email.role}).")
            return

        user = User(username=username, email=email, hashed_password=hash_password(password), role="admin")
        db.add(user)
        db.commit()
        db.refresh(user)
        print(f"Created admin user id={user.id} username={username} password={password}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
