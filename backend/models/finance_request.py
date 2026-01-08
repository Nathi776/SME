from sqlalchemy import Column, Integer, Float, ForeignKey, String
from sqlalchemy.orm import relationship
from database import Base

class FinanceRequest(Base):
    __tablename__ = 'finance_requests'

    id = Column(Integer, primary_key=True, index=True)
    amount_requested = Column(Float, nullable=False)
    status = Column(String, default="pending")
    sme_id = Column(Integer, ForeignKey("smes.id"))

    sme = relationship("SME", back_populates="finance_requests")

    credit_score_id = Column(Integer, ForeignKey("credit_scores.id"))
    credit_score = relationship("CreditScore", back_populates="finance_requests")