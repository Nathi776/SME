"""
services/checkin_reminder_service.py

Reminds business owners to submit the 90, 180 and 365-day check-ins that
produce the outcome labels used to evaluate the model.

Rules
* A check-in is due once its due date has passed and it is not completed.
* One email per outcome per run, listing every due check-in that is eligible.
* A check-in is reminded again only after REMIND_EVERY_DAYS, and at most
  MAX_REMINDERS times in total. After that the person is left alone; the
  check-in still shows as outstanding in the portal.
* A failed send never counts as a reminder and is retried on the next run.
* The email contains no financial details.

Run it daily, for example from cron:
    0 7 * * *  cd /path/to/backend && python send_checkin_reminders.py
"""
from __future__ import annotations

from dataclasses import asdict, dataclass
from datetime import datetime, timedelta
from typing import Callable

from sqlalchemy.orm import Session

from config import get_settings
from core.time_utils import utc_now
from models.checkin_reminder import CheckinReminder
from models.sme_outcome import SmeOutcome
from services.email_service import EmailNotConfigured, EmailSendError, send_email

INTERVALS = (90, 180, 365)
REMIND_EVERY_DAYS = 7
MAX_REMINDERS = 3


@dataclass
class ReminderRunSummary:
    outcomes_with_due_checkins: int = 0
    emails_sent: int = 0
    skipped_not_yet_eligible: int = 0
    skipped_max_reached: int = 0
    skipped_no_email: int = 0
    failed: int = 0
    not_configured: bool = False

    def as_dict(self) -> dict:
        return asdict(self)


def outstanding_checkins(outcome: SmeOutcome, now: datetime) -> list[int]:
    """Intervals whose due date has passed and which are not yet completed."""
    due = []
    for interval in INTERVALS:
        due_at = getattr(outcome, f"check_in_{interval}_due_at")
        completed = getattr(outcome, f"checkin_{interval}_completed")
        if due_at is not None and due_at <= now and not completed:
            due.append(interval)
    return due


def _state(db: Session, outcome_id: int) -> dict[int, CheckinReminder]:
    rows = db.query(CheckinReminder).filter(CheckinReminder.outcome_id == outcome_id).all()
    return {r.interval_days: r for r in rows}


def _eligible(row: CheckinReminder | None, now: datetime) -> tuple[bool, bool]:
    """Returns (eligible_now, max_reached)."""
    if row is None or row.reminder_count == 0:
        return True, False
    if row.reminder_count >= MAX_REMINDERS:
        return False, True
    if row.last_sent_at and now - row.last_sent_at < timedelta(days=REMIND_EVERY_DAYS):
        return False, False
    return True, False


def build_message(business_name: str, intervals: list[int]) -> tuple[str, str]:
    portal = get_settings().portal_base_url.rstrip("/")
    labels = ", ".join(f"{i}-day" for i in intervals)
    subject = "Your funding check-in is due"
    body = (
        f"Hello,\n\n"
        f"Your {labels} check-in for {business_name} is now due. "
        f"It only asks whether the business is still operating, its recent revenue, "
        f"and the loan repayment status.\n\n"
        f"Please log in and complete it here: {portal}\n\n"
        f"These check-ins help us understand how businesses progress after funding. "
        f"If you have already completed it, you can ignore this message.\n"
    )
    return subject, body


def run_due_reminders(
    db: Session,
    now: datetime | None = None,
    sender: Callable[[str, str, str], None] = send_email,
) -> ReminderRunSummary:
    now = now or utc_now()
    summary = ReminderRunSummary()

    outcomes = db.query(SmeOutcome).all()
    for outcome in outcomes:
        due = outstanding_checkins(outcome, now)
        if not due:
            continue
        summary.outcomes_with_due_checkins += 1

        sme = outcome.sme
        email = sme.user.email if sme is not None and sme.user is not None else None
        if not email:
            summary.skipped_no_email += 1
            continue

        state = _state(db, outcome.id)
        to_send: list[int] = []
        blocked_by_max = False
        for interval in due:
            ok, maxed = _eligible(state.get(interval), now)
            if ok:
                to_send.append(interval)
            blocked_by_max = blocked_by_max or maxed
        if not to_send:
            if blocked_by_max:
                summary.skipped_max_reached += 1
            else:
                summary.skipped_not_yet_eligible += 1
            continue

        subject, body = build_message(sme.name, to_send)
        try:
            sender(email, subject, body)
        except EmailNotConfigured:
            summary.not_configured = True
            return summary                      # nothing can be sent this run
        except EmailSendError as exc:
            summary.failed += 1
            for interval in to_send:
                row = state.get(interval) or CheckinReminder(
                    outcome_id=outcome.id, interval_days=interval, reminder_count=0
                )
                row.last_error = str(exc)[:300]
                db.add(row)
            db.commit()
            continue

        for interval in to_send:
            row = state.get(interval) or CheckinReminder(
                outcome_id=outcome.id, interval_days=interval, reminder_count=0
            )
            row.reminder_count += 1
            row.first_sent_at = row.first_sent_at or now
            row.last_sent_at = now
            row.last_error = None
            db.add(row)
        db.commit()                              # commit per email: a crash cannot resend
        summary.emails_sent += 1

    return summary
