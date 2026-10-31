from sqlalchemy import Column, Integer, Numeric, ForeignKey, String, DateTime, Text
from sqlalchemy.orm import relationship
from core.time_utils import utc_now
from database import Base
from models.assessment_snapshot import AssessmentSnapshot


class FinanceRequest(Base):
    __tablename__ = 'finance_requests'

    id = Column(Integer, primary_key=True, index=True)

    amount_requested = Column(Numeric(18, 2), nullable=False)
    approved_amount = Column(Numeric(18, 2), nullable=True)

    fee_rate = Column(Numeric(18, 4), default=0)
    platform_fee = Column(Numeric(18, 2), default=0)
    rejection_reason = Column(Text, nullable=True)
    net_amount = Column(Numeric(18, 2), default=0)

    status = Column(String, default="pending")
    purpose_of_funding = Column(String, nullable=True)
    preferred_payout_date = Column(DateTime, nullable=True)
    additional_notes = Column(String, nullable=True)

    # "invoice_backed" â€” traditional: tied to an invoice
    # "pre_invoice"    â€” early-stage: no invoice yet, scored on business signals
    request_type = Column(String, nullable=False, default="invoice_backed")

    lender_id = Column(Integer, ForeignKey("lenders.id"), nullable=True)
    created_at = Column(DateTime, default=utc_now)
    approved_at = Column(DateTime, nullable=True)

    sme_id = Column(Integer, ForeignKey("smes.id"), nullable=False)
    sme = relationship("SME", back_populates="finance_requests")

    # nullable=True + SET NULL: deleting an invoice no longer blocks or cascades
    invoice_id = Column(
        Integer,
        ForeignKey("invoices.id", ondelete="SET NULL"),
        nullable=True,
    )
    invoice = relationship("Invoice", back_populates="finance_requests")

    credit_score_id = Column(Integer, ForeignKey("credit_scores.id"))
    credit_score = relationship("CreditScore", back_populates="finance_requests")
    assessment_snapshot_id = Column(
        Integer,
        ForeignKey("assessment_snapshots.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    assessment_snapshot = relationship(
        "AssessmentSnapshot",
        back_populates="finance_requests",
    )
    lender = relationship("Lender", back_populates="approvals")
    outcome = relationship(
        "SmeOutcome",
        back_populates="finance_request",
        uselist=False,
        cascade="all, delete-orphan",
    )
