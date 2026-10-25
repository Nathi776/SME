"""
models/sme_outcome.py

Stores SME outcome signals tracked over time (90, 180, 365 days)
after a finance request has been funded.
This forms the feedback loop to see if the recommendations provided
lead to positive business outcomes (loan repayment, revenue growth, etc.).

Y-variables (y1â€“y5) are persisted columns written during update_checkin()
at the 365-day mark. They are the ground-truth training labels for the
predictive model â€” point-in-time snapshots, never computed properties.
"""

from sqlalchemy import Column, Integer, Float, Numeric, ForeignKey, DateTime, JSON, Boolean, String
from sqlalchemy.orm import relationship
from core.time_utils import utc_now
from database import Base


class SmeOutcome(Base):
    __tablename__ = "sme_outcomes"

    id = Column(Integer, primary_key=True, index=True)
    finance_request_id = Column(
        Integer,
        ForeignKey("finance_requests.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    sme_id = Column(
        Integer,
        ForeignKey("smes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    score_at_funding = Column(Float, nullable=False)
    amount = Column(Numeric(18, 2), nullable=False)
    outstanding_recommendations = Column(JSON, nullable=False, default=list)
    outcome_status = Column(String(50), nullable=False, default="pending", server_default="pending")
    check_in_90_due_at  = Column(DateTime, nullable=True)
    check_in_180_due_at = Column(DateTime, nullable=True)
    check_in_365_due_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(
        DateTime, default=utc_now, onupdate=utc_now
    )

    # â”€â”€ Checkin 90 Days â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    checkin_90_completed     = Column(Boolean, default=False, nullable=False)
    checkin_90_date          = Column(DateTime, nullable=True)
    checkin_90_still_operating = Column(Boolean, nullable=True)
    checkin_90_revenue       = Column(Numeric(18, 2), nullable=True)
    checkin_90_loan_repaid   = Column(Boolean, nullable=True)

    # â”€â”€ Checkin 180 Days â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    checkin_180_completed    = Column(Boolean, default=False, nullable=False)
    checkin_180_date         = Column(DateTime, nullable=True)
    checkin_180_still_operating = Column(Boolean, nullable=True)
    checkin_180_revenue      = Column(Numeric(18, 2), nullable=True)
    checkin_180_loan_repaid  = Column(Boolean, nullable=True)

    # â”€â”€ Checkin 365 Days â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    checkin_365_completed    = Column(Boolean, default=False, nullable=False)
    checkin_365_date         = Column(DateTime, nullable=True)
    checkin_365_still_operating = Column(Boolean, nullable=True)
    checkin_365_revenue      = Column(Numeric(18, 2), nullable=True)
    checkin_365_loan_repaid  = Column(Boolean, nullable=True)

    # â”€â”€ Y-variables (ML training labels) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    # Written once during update_checkin() when the 365-day check-in is
    # completed. These are immutable point-in-time labels â€” never recomputed
    # after being set. NULL means the 365-day check-in has not happened yet.
    #
    # y1  Did the business survive 12 months after funding?
    #     Source: checkin_365_still_operating
    y1_survived_12m  = Column(Boolean, nullable=True)

    # y2  Did the business survive 18 months after funding?
    #     Source: checkin_540_still_operating (requires 540-day check-in â€” migration 019)
    #     Left NULL until that check-in exists.
    y2_survived_18m  = Column(Boolean, nullable=True)

    # y3  Did the business reach R100 000 monthly revenue within 12 months?
    #     Source: checkin_365_revenue >= 100_000
    y3_reached_100k  = Column(Boolean, nullable=True)

    # y4  Did revenue grow between 90-day and 365-day check-ins?
    #     Source: checkin_365_revenue > checkin_90_revenue (both must be non-null)
    y4_revenue_grew  = Column(Boolean, nullable=True)

    # y5  Did the business default on the loan by 12 months?
    #     Source: checkin_365_loan_repaid == False
    y5_defaulted     = Column(Boolean, nullable=True)

    # â”€â”€ Relationships â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    sme = relationship("SME", back_populates="outcomes")
    finance_request = relationship("FinanceRequest", back_populates="outcome")
