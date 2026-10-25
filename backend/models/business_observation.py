"""
models/business_observation.py

Stores timestamped observations of an SME's business state.

Unlike SmeOutcome, an observation does not require financing.
It can therefore be recorded for:
- idea-stage businesses
- unfunded businesses
- funded businesses
- businesses that later become inactive
- businesses that continue operating

The purpose is to build a longitudinal dataset that can eventually
be used to study business-state transitions and outcomes.
"""

from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    JSON,
    Numeric,
    String,
)
from sqlalchemy.orm import relationship

from database import Base


class BusinessObservation(Base):
    __tablename__ = "business_observations"

    id = Column(Integer, primary_key=True, index=True)

    # Business being observed
    sme_id = Column(
        Integer,
        ForeignKey("smes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # When this observation represents the business state
    observed_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        index=True,
    )

    # Where the observation came from.
    # Examples:
    # "self_reported", "bank_statement", "invoice",
    # "verification", "system", "external_data"
    source = Column(String(50), nullable=False, default="system")

    # ── Operating state ──────────────────────────────────────────────────────

    still_operating = Column(Boolean, nullable=True)

    years_active = Column(Integer, nullable=True)

    # ── Financial state ───────────────────────────────────────────────────────

    revenue = Column(Numeric(18, 2), nullable=True)

    avg_monthly_balance = Column(Numeric(18, 2), nullable=True)

    avg_monthly_income = Column(Numeric(18, 2), nullable=True)

    avg_monthly_expenses = Column(Numeric(18, 2), nullable=True)

    # ── Trading / cash-flow evidence ─────────────────────────────────────────

    total_invoices = Column(Integer, nullable=True)

    paid_on_time = Column(Integer, nullable=True)

    unpaid_invoices = Column(Integer, nullable=True)

    # ── Bank statement signals ───────────────────────────────────────────────

    overdraft_count = Column(Integer, nullable=True)

    income_regularity = Column(Numeric(18, 4), nullable=True)

    months_analysed = Column(Integer, nullable=True)

    parsed_revenue = Column(Numeric(18, 2), nullable=True)

    # ── Context ───────────────────────────────────────────────────────────────

    industry = Column(String, nullable=True)

    province = Column(String, nullable=True)

    business_city = Column(String, nullable=True)

    # Additional structured observations that do not yet justify
    # dedicated database columns.
    additional_data = Column(JSON, nullable=True)

    # ── Relationship ─────────────────────────────────────────────────────────

    sme = relationship(
        "SME",
        back_populates="business_observations",
    )

    assessment_snapshots = relationship(
        "AssessmentSnapshot",
        back_populates="business_observation",
    )

    def __repr__(self):
        return (
            f"<BusinessObservation("
            f"id={self.id}, "
            f"sme_id={self.sme_id}, "
            f"observed_at='{self.observed_at}', "
            f"source='{self.source}')>"
        )
