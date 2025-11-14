from sqlalchemy import Column, Integer, Float, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from database import Base
from datetime import datetime

class CreditScore(Base):
    __tablename__ = "credit_scores"

    id = Column(Integer, primary_key=True, index=True)
    sme_id = Column(Integer, ForeignKey("smes.id", ondelete="CASCADE"), nullable=False)
    score = Column(Float, nullable=False)
    rating = Column(Integer, nullable=True)  # Optional rating bucket (e.g., 1–5)
    created_at = Column(DateTime, default=datetime.utcnow)

    sme = relationship("SME", back_populates="credit_scores")

    def __repr__(self):
        return f"<CreditScore(id={self.id}, sme_id={self.sme_id}, score={self.score})>"
