from datetime import datetime, timezone

from sqlalchemy import (
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
)
from sqlalchemy.orm import relationship

from database import Base


class AssessmentSnapshot(Base):
    __tablename__ = "assessment_snapshots"

    id = Column(Integer, primary_key=True, index=True)

    sme_id = Column(
        Integer,
        ForeignKey("smes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    business_observation_id = Column(
        Integer,
        ForeignKey(
            "business_observations.id",
            ondelete="SET NULL",
        ),
        nullable=True,
        index=True,
    )

    assessed_at = Column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        index=True,
    )

    profile = Column(String(50), nullable=False)

    strategy_version = Column(String(50), nullable=True)

    inference_version = Column(String(50), nullable=True)

    score = Column(Float, nullable=False)

    decision = Column(String(50), nullable=False)

    evidence_depth = Column(Float, nullable=True)

    input_snapshot = Column(JSON, nullable=True)

    factor_breakdown = Column(JSON, nullable=True)

    market_context = Column(JSON, nullable=True)

    recommendations = Column(JSON, nullable=True)

    notes = Column(Text, nullable=True)

    sme = relationship(
        "SME",
        back_populates="assessment_snapshots",
    )

    business_observation = relationship(
        "BusinessObservation",
        back_populates="assessment_snapshots",
    )

    finance_requests = relationship(
        "FinanceRequest",
        back_populates="assessment_snapshot",
    )