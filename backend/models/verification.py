from sqlalchemy import (
    Column, Integer, String, DateTime, ForeignKey, Boolean, Numeric
)
from sqlalchemy.orm import relationship
from core.time_utils import utc_now
from database import Base


class Verification(Base):
    __tablename__ = 'verifications'

    id = Column(Integer, primary_key=True, index=True)

    # type: e.g. cipc, tax_clearance, bank_statement, financial_license, registration_docs, banking_docs
    doc_type = Column(String, nullable=False)
    status = Column(
        String,
        nullable=False,
        default="pending",
        server_default="pending",
    )
    document_url = Column(String, nullable=True)
    submitted_at = Column(DateTime, default=utc_now)
    reviewed_at = Column(DateTime, nullable=True)
    reviewer_notes = Column(String, nullable=True)

    # Set by admin during review of letter_of_intent documents only.
    # True  â†’ counterparty is a recognised/known company (e.g. listed corp, govt entity)
    # False â†’ counterparty unknown or unverifiable
    # None  â†’ not applicable (non-LOI doc) or not yet reviewed
    loi_counterparty_known = Column(Boolean, nullable=True, default=None)

    # Relations
    sme_id = Column(Integer, ForeignKey('smes.id'), nullable=True)
    lender_id = Column(Integer, ForeignKey('lenders.id'), nullable=True)

    sme = relationship('SME', back_populates='verifications')
    lender = relationship('Lender', back_populates='verifications')

    # Bank-statement metrics belong to this specific uploaded document.
    # Null values mean parsing did not produce a usable metric.
    bs_avg_monthly_balance = Column(Numeric(18, 2), nullable=True)
    bs_avg_monthly_income = Column(Numeric(18, 2), nullable=True)
    bs_avg_monthly_expenses = Column(Numeric(18, 2), nullable=True)
    bs_overdraft_count = Column(Integer, nullable=True)
    bs_income_regularity = Column(Numeric(18, 4), nullable=True)
    bs_months_analysed = Column(Integer, nullable=True)
    bs_parsed_revenue = Column(Numeric(18, 2), nullable=True)

