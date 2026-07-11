"""
models/sme_outcome.py

Stores SME outcome signals tracked over time (90, 180, 365 days)
after a finance request has been funded.
This forms the feedback loop to see if the recommendations provided
lead to positive business outcomes (loan repayment, revenue growth, etc.).
"""

from sqlalchemy import Column, Integer, Float, Numeric, ForeignKey, DateTime, JSON, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
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
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    # ── Checkin 90 Days ───────────────────────────────────────────────────────
    checkin_90_completed = Column(Boolean, default=False, nullable=False)
    checkin_90_date = Column(DateTime, nullable=True)
    checkin_90_still_operating = Column(Boolean, nullable=True)
    checkin_90_revenue = Column(Numeric(18, 2), nullable=True)
    checkin_90_loan_repaid = Column(Boolean, nullable=True)

    # ── Checkin 180 Days ──────────────────────────────────────────────────────
    checkin_180_completed = Column(Boolean, default=False, nullable=False)
    checkin_180_date = Column(DateTime, nullable=True)
    checkin_180_still_operating = Column(Boolean, nullable=True)
    checkin_180_revenue = Column(Numeric(18, 2), nullable=True)
    checkin_180_loan_repaid = Column(Boolean, nullable=True)

    # ── Checkin 365 Days ──────────────────────────────────────────────────────
    checkin_365_completed = Column(Boolean, default=False, nullable=False)
    checkin_365_date = Column(DateTime, nullable=True)
    checkin_365_still_operating = Column(Boolean, nullable=True)
    checkin_365_revenue = Column(Numeric(18, 2), nullable=True)
    checkin_365_loan_repaid = Column(Boolean, nullable=True)

    # ── Relationships ─────────────────────────────────────────────────────────
    sme = relationship("SME", back_populates="outcomes")
    finance_request = relationship("FinanceRequest", back_populates="outcome")
