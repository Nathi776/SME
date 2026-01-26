from sqlalchemy import Column, Integer, String, Float, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

class Lender(Base):
    __tablename__ = 'lenders'

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    organization_name = Column(String, nullable=False)
    contact_email = Column(String, nullable=False)
    phone = Column(String, nullable=True)
    max_lending_amount = Column(Float, default=1000000)
    min_credit_score = Column(Integer, default=40)

    user = relationship("User", back_populates="lender_profile")
    approvals = relationship("FinanceRequest", back_populates="lender")
