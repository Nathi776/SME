from sqlalchemy import Column, Integer, String, Numeric, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

class SME(Base):
    __tablename__ = "smes"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    industry = Column(String, nullable=False)
    revenue = Column(Numeric(18, 2), nullable=False)
    years_active = Column(Integer, nullable=False, default=0)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    # ---------- Bank Statement Parsing Signals ----------
    bs_avg_monthly_balance = Column(Numeric(18, 2), nullable=True)
    bs_avg_monthly_income = Column(Numeric(18, 2), nullable=True)
    bs_avg_monthly_expenses = Column(Numeric(18, 2), nullable=True)
    bs_overdraft_count = Column(Integer, nullable=True)
    bs_income_regularity = Column(Numeric(18, 4), nullable=True)
    bs_months_analysed = Column(Integer, nullable=True)
    bs_parsed_revenue = Column(Numeric(18, 2), nullable=True)

    # ---------- Relationships ----------
    user = relationship("User", back_populates="sme_profile")
    invoices = relationship("Invoice", back_populates="sme", cascade="all, delete-orphan")
    credit_scores = relationship("CreditScore", back_populates="sme", cascade="all, delete-orphan")
    finance_requests = relationship("FinanceRequest", back_populates="sme", cascade="all, delete-orphan")
    verifications = relationship("Verification", back_populates="sme", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<SME(id={self.id}, name='{self.name}', industry='{self.industry}', revenue={self.revenue})>"
