from sqlalchemy import Column, Integer, Float, ForeignKey, String, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class FinanceRequest(Base):
    __tablename__ = 'finance_requests'

    id = Column(Integer, primary_key=True, index=True)
    amount_requested = Column(Float, nullable=False)
    approved_amount = Column(Float, nullable=True)
    fee_rate = Column(Float, default=0)
    status = Column(String, default="pending")
    lender_id = Column(Integer, ForeignKey("lenders.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    approved_at = Column(DateTime, nullable=True)
    
    sme_id = Column(Integer, ForeignKey("smes.id"))
    sme = relationship("SME", back_populates="finance_requests")

    credit_score_id = Column(Integer, ForeignKey("credit_scores.id"))
    credit_score = relationship("CreditScore", back_populates="finance_requests")
    
    lender = relationship("Lender", back_populates="approvals")