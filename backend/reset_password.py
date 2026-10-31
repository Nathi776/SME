"""
Check or reset one account's password. Run from the backend folder:

    python reset_password.py --list                     # accounts and whether their stored password is a valid hash
    python reset_password.py someone@example.com        # reset (prompts for the new password; nothing is echoed)

Accepts a username or an email. Never prints stored hashes.
"""
import argparse
import getpass
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import models  # noqa: F401,E402  (register every table)
from database import SessionLocal  # noqa: E402
from models.user import User  # noqa: E402
from services.auth_service import find_user_by_email, hash_password  # noqa: E402


def looks_hashed(stored: str | None) -> bool:
    return bool(stored) and stored.startswith("$2") and len(stored) == 60


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("account", nargs="?", help="username or email")
    parser.add_argument("--list", action="store_true")
    args = parser.parse_args()

    db = SessionLocal()
    try:
        if args.list:
            for u in db.query(User).order_by(User.id):
                state = "ok (bcrypt hash)" if looks_hashed(u.hashed_password) else "NOT a valid bcrypt hash"
                print(f"{u.id:>4}  {u.role:<7} {u.username:<25} {u.email:<35} password: {state}")
            return 0

        if not args.account:
            parser.error("give a username/email, or use --list")
        user = (db.query(User).filter(User.username == args.account).first()
                or find_user_by_email(db, args.account))
        if user is None:
            print(f"No account found for '{args.account}'. Use --list to see accounts.")
            return 1

        pw = getpass.getpass(f"New password for {user.username} ({user.email}): ")
        if len(pw) < 8:
            print("Password must be at least 8 characters.")
            return 1
        if pw != getpass.getpass("Repeat the new password: "):
            print("Passwords do not match.")
            return 1
        user.hashed_password = hash_password(pw)
        db.commit()
        print(f"Password updated for {user.username}. You can log in now.")
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    sys.exit(main())
