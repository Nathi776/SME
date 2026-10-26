"""
Send check-in reminders. Intended to be run once a day (cron or a scheduler).

    python send_checkin_reminders.py

Exit code 0 on success, 1 if any email failed or SMTP is not configured.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import models  # noqa: F401,E402  (register all tables)
from database import SessionLocal  # noqa: E402
from services.checkin_reminder_service import run_due_reminders  # noqa: E402


def main() -> int:
    db = SessionLocal()
    try:
        summary = run_due_reminders(db)
    finally:
        db.close()
    print(summary.as_dict())
    return 1 if (summary.failed or summary.not_configured) else 0


if __name__ == "__main__":
    sys.exit(main())
