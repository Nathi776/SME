from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, UniqueConstraint

from core.time_utils import utc_now
from database import Base


class CheckinReminder(Base):
    """
    Tracks reminders sent for one check-in of one outcome, so the same person
    is not emailed twice in a row and reminders stop after a fixed number.
    """

    __tablename__ = "checkin_reminders"
    __table_args__ = (
        UniqueConstraint("outcome_id", "interval_days", name="uq_reminder_outcome_interval"),
    )

    id = Column(Integer, primary_key=True, index=True)
    outcome_id = Column(
        Integer, ForeignKey("sme_outcomes.id", ondelete="CASCADE"), nullable=False, index=True
    )
    interval_days = Column(Integer, nullable=False)          # 90, 180 or 365
    reminder_count = Column(Integer, nullable=False, default=0)
    first_sent_at = Column(DateTime, nullable=True)
    last_sent_at = Column(DateTime, nullable=True)
    last_error = Column(String(300), nullable=True)
    created_at = Column(DateTime, nullable=False, default=utc_now)
