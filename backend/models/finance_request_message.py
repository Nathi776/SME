from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text

from core.time_utils import utc_now
from database import Base


class FinanceRequestMessage(Base):
    """
    One message in the conversation between a lender and an SME about a finance
    request: a lender's question (`info_request`) or the SME's answer (`response`).
    Append-only, so the exchange is a record of what was asked and answered.
    """

    __tablename__ = "finance_request_messages"

    id = Column(Integer, primary_key=True, index=True)
    request_id = Column(
        Integer, ForeignKey("finance_requests.id", ondelete="CASCADE"), nullable=False, index=True
    )
    author_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    author_role = Column(String(20), nullable=False)       # "lender" | "sme"
    kind = Column(String(20), nullable=False)               # "info_request" | "response"
    message = Column(Text, nullable=False)
    created_at = Column(DateTime, nullable=False, default=utc_now)
