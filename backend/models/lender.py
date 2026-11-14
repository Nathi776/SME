from sqlalchemy import Column, DateTime, Integer, String, Numeric, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

class Lender(Base):
    __tablename__ = 'lenders'

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    organization_name = Column(String, nullable=False)
    contact_email = Column(String, nullable=False)
    phone = Column(String, nullable=True)
    max_lending_amount = Column(Numeric(18, 2), default=1000000)
    min_credit_score = Column(Integer, default=40)

    # Lenders see other businesses' data, so a new lender has NO access until an admin approves it.
    # approval_status: "pending" | "approved" | "rejected" | "suspended"
    approval_status = Column(String, nullable=False, default="pending", server_default="pending")
    approved_at = Column(DateTime, nullable=True)
    approved_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    user = relationship("User", back_populates="lender_profile", foreign_keys=[user_id])
    approvals = relationship("FinanceRequest", back_populates="lender")
    verifications = relationship("Verification", back_populates="lender", cascade="all, delete-orphan")
