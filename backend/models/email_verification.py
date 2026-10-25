from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, UniqueConstraint

from core.time_utils import utc_now
from database import Base


class EmailVerificationCode(Base):
    """
    One-time verification code, stored as an HMAC (never in plaintext) in the
    database so it survives restarts and works across multiple workers.
    """

    __tablename__ = "email_verification_codes"
    __table_args__ = (UniqueConstraint("user_id", "channel", name="uq_verification_user_channel"),)

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    channel = Column(String(20), nullable=False)
    code_hash = Column(String(64), nullable=False)
    expires_at = Column(DateTime, nullable=False)
    attempts = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, nullable=False, default=utc_now)
