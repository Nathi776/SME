from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String

from core.time_utils import utc_now
from database import Base


class DataConsent(Base):
    """
    Append-only record of a user granting or withdrawing consent for a
    specific purpose. The current state is the most recent row for the
    (user, purpose) pair; earlier rows are kept as evidence of what the user
    agreed to, under which policy version, and when.
    """

    __tablename__ = "data_consents"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    purpose = Column(String(50), nullable=False, index=True)
    granted = Column(Boolean, nullable=False)
    policy_version = Column(String(20), nullable=False)
    # "registration" | "portal" | ... — where the choice was made
    source = Column(String(30), nullable=False)
    recorded_at = Column(DateTime, nullable=False, default=utc_now)
