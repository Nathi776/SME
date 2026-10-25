from sqlalchemy import Column, DateTime, Integer, String
from sqlalchemy.orm import relationship
from database import Base

class User(Base):
    __tablename__ = 'users'

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=True)
    hashed_password = Column(String, nullable=False)
    role = Column(String, default="sme")
    email_verified_at = Column(DateTime, nullable=True)

    sme_profile = relationship("SME", back_populates="user", uselist=False)
    lender_profile = relationship("Lender", back_populates="user", uselist=False)
