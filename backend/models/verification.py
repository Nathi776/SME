from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


class Verification(Base):
    __tablename__ = 'verifications'

    id = Column(Integer, primary_key=True, index=True)

    # type: e.g. cipc, tax_clearance, bank_statement, financial_license, registration_docs, banking_docs
    doc_type = Column(String, nullable=False)
    document_url = Column(String, nullable=True)

    status = Column(String, default="pending")
    submitted_at = Column(DateTime, default=datetime.utcnow)
    reviewed_at = Column(DateTime, nullable=True)
    reviewer_notes = Column(String, nullable=True)

    # Relations
    sme_id = Column(Integer, ForeignKey('smes.id'), nullable=True)
    lender_id = Column(Integer, ForeignKey('lenders.id'), nullable=True)

    sme = relationship('SME', back_populates='verifications')
    lender = relationship('Lender', back_populates='verifications')
