import sys
from pathlib import Path

# Ensure backend modules are importable
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
    db = SessionLocal()
    username = "admin"
    user = db.query(User).filter(User.username == username).first()
    if not user:
        print(f"No user with username '{username}' found")
        return

    old_role = user.role
    user.role = "admin"
    user.hashed_password = hash_password("AdminPass123")
    db.add(user)
    db.commit()

    if old_role == "admin":
        print(f"Reset password and confirmed role 'admin' for user id={user.id}")
    else:
        print(f"Updated user id={user.id} role {old_role} -> {user.role} and reset password")


if __name__ == "__main__":
    main()
