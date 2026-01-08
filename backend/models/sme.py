from sqlalchemy import Column, Integer, String, Float, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

class SME(Base):
    __tablename__ = "smes"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    industry = Column(String, nullable=False)
    revenue = Column(Float, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    # ---------- Relationships ----------
    user = relationship("User", back_populates="sme_profile")
    invoices = relationship("Invoice", back_populates="sme", cascade="all, delete-orphan")
    credit_scores = relationship("CreditScore", back_populates="sme", cascade="all, delete-orphan")
    finance_requests = relationship("FinanceRequest", back_populates="sme", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<SME(id={self.id}, name='{self.name}', industry='{self.industry}', revenue={self.revenue})>"
