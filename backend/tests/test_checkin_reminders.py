"""Check-in reminders: due detection, spacing, caps, failures and endpoints."""
import re
from datetime import timedelta

import pytest

from core.time_utils import utc_now
from models.checkin_reminder import CheckinReminder
from models.sme_outcome import SmeOutcome
from models.user import User
from services import checkin_reminder_service as svc
from services.checkin_reminder_service import MAX_REMINDERS, REMIND_EVERY_DAYS, run_due_reminders
from services.email_service import EmailNotConfigured, EmailSendError, send_email
from services.outcome_service import create_outcome, update_checkin
from tests.test_outcome_labels_and_linkage import _funded_request, _sme


class Outbox:
    def __init__(self):
        self.sent = []

    def __call__(self, to, subject, body):
        self.sent.append((to, subject, body))


@pytest.fixture()
def db(api):
    s = api.Session()
    yield s
    s.close()


def _outcome(db, name="Acme"):
    sme = _sme(db, name=name)
    req, _ = _funded_request(db, sme)
    outcome = create_outcome(db, req.id)
    db.commit()
    return sme, outcome


def _days(n):
    return utc_now() + timedelta(days=n)


def test_nothing_sent_before_a_checkin_is_due(db):
    _outcome(db)
    box = Outbox()
    s = run_due_reminders(db, now=_days(30), sender=box)
    assert box.sent == [] and s.emails_sent == 0 and s.outcomes_with_due_checkins == 0


def test_due_checkin_sends_one_email_with_no_financial_details(db):
    sme, _ = _outcome(db)
    box = Outbox()
    s = run_due_reminders(db, now=_days(91), sender=box)

    assert s.emails_sent == 1
    to, subject, body = box.sent[0]
    assert to == f"{sme.name}@t.com"
    assert "90-day" in body and "180-day" not in body
    from config import get_settings
    text = body.replace(get_settings().portal_base_url, "")
    assert not re.search(r"R\s?\d|\d{4,}", text)       # no amounts or figures
    row = db.query(CheckinReminder).one()
    assert (row.interval_days, row.reminder_count) == (90, 1)


def test_no_repeat_within_the_waiting_period(db):
    _outcome(db)
    box = Outbox()
    run_due_reminders(db, now=_days(91), sender=box)
    s = run_due_reminders(db, now=_days(91) + timedelta(days=REMIND_EVERY_DAYS - 1), sender=box)
    assert len(box.sent) == 1 and s.skipped_not_yet_eligible == 1


def test_repeats_weekly_then_stops_at_the_cap(db):
    _outcome(db)
    box = Outbox()
    base = _days(91)
    for week in range(MAX_REMINDERS + 2):
        s = run_due_reminders(db, now=base + timedelta(days=REMIND_EVERY_DAYS * week), sender=box)
    assert len(box.sent) == MAX_REMINDERS
    assert s.skipped_max_reached == 1
    assert db.query(CheckinReminder).one().reminder_count == MAX_REMINDERS


def test_completed_checkin_is_not_reminded(db):
    _, outcome = _outcome(db)
    update_checkin(db, outcome.id, 90, True, 50000, False)
    box = Outbox()
    s = run_due_reminders(db, now=_days(91), sender=box)
    assert box.sent == [] and s.outcomes_with_due_checkins == 0


def test_several_due_checkins_share_one_email(db):
    _outcome(db)
    box = Outbox()
    s = run_due_reminders(db, now=_days(400), sender=box)
    assert s.emails_sent == 1
    body = box.sent[0][2]
    assert "90-day" in body and "180-day" in body and "365-day" in body
    assert db.query(CheckinReminder).count() == 3


def test_failed_send_does_not_count_and_is_retried(db):
    _outcome(db)

    def failing(*a):
        raise EmailSendError("smtp down")

    s = run_due_reminders(db, now=_days(91), sender=failing)
    assert s.failed == 1 and s.emails_sent == 0
    row = db.query(CheckinReminder).one()
    assert row.reminder_count == 0 and "smtp down" in row.last_error

    box = Outbox()
    s = run_due_reminders(db, now=_days(91), sender=box)         # same day: retried
    assert s.emails_sent == 1
    row = db.query(CheckinReminder).one()
    assert row.reminder_count == 1 and row.last_error is None


def test_unconfigured_smtp_sends_nothing_and_reports_it(db):
    _outcome(db)

    def unconfigured(*a):
        raise EmailNotConfigured("no smtp")

    s = run_due_reminders(db, now=_days(91), sender=unconfigured)
    assert s.not_configured is True and s.emails_sent == 0
    assert db.query(CheckinReminder).count() == 0


def test_real_sender_refuses_when_smtp_missing():
    with pytest.raises(EmailNotConfigured):
        send_email("a@b.com", "s", "b")


def test_user_without_email_is_skipped(db):
    sme, _ = _outcome(db)
    db.query(User).filter(User.id == sme.user_id).update({"email": None})
    db.commit()
    box = Outbox()
    s = run_due_reminders(db, now=_days(91), sender=box)
    assert s.skipped_no_email == 1 and box.sent == []


def test_two_businesses_get_separate_emails(db):
    _outcome(db, "One")
    _outcome(db, "Two")
    box = Outbox()
    s = run_due_reminders(db, now=_days(91), sender=box)
    assert s.emails_sent == 2 and {m[0] for m in box.sent} == {"One@t.com", "Two@t.com"}


# ── Endpoints ────────────────────────────────────────────────────────────────

def _make_overdue(api, outcome_id, days=10):
    s = api.Session()
    o = s.get(SmeOutcome, outcome_id)
    o.check_in_90_due_at = utc_now() - timedelta(days=days)
    s.commit()
    s.close()


def _sme_login(api, db, sme):
    user = db.get(User, sme.user_id)
    from types import SimpleNamespace
    # _sme() stores a placeholder hash; set a real password so the helper can log in
    from services.auth_service import hash_password
    user.hashed_password = hash_password("Password123")
    db.commit()
    return api.login(SimpleNamespace(username=user.username, password="Password123"))


def test_due_endpoint_lists_only_own_outstanding_checkins(api, db):
    mine, mine_outcome = _outcome(db, "Mine")
    other, other_outcome = _outcome(db, "Other")
    _make_overdue(api, mine_outcome.id)
    _make_overdue(api, other_outcome.id)

    r = api.client.get("/outcomes/due", headers=_sme_login(api, db, mine))
    assert r.status_code == 200
    items = r.json()
    assert [(i["outcome_id"], i["interval"]) for i in items] == [(mine_outcome.id, 90)]
    assert items[0]["days_overdue"] >= 10 and items[0]["reminders_sent"] == 0


def test_run_endpoint_is_admin_only_and_reports_summary(api, db):
    sme, outcome = _outcome(db)
    _make_overdue(api, outcome.id)

    assert api.client.post("/outcomes/reminders/run").status_code == 401
    assert api.client.post("/outcomes/reminders/run",
                           headers=_sme_login(api, db, sme)).status_code == 403

    admin = api.make_user("admin")
    r = api.client.post("/outcomes/reminders/run", headers=api.login(admin))
    assert r.status_code == 200
    body = r.json()
    assert body["outcomes_with_due_checkins"] == 1
    assert body["not_configured"] is True            # no SMTP in the test environment
