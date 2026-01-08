from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime
from datetime import datetime
from database import Base
from sqlalchemy.orm import relationship

class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True)
    sme_id = Column(Integer, ForeignKey("smes.id"))
    client_name = Column(String)
    description = Column(String)
    amount = Column(Float)
    status = Column(String, default="Pending")
    created_at = Column(DateTime, default=datetime.utcnow)
    sme = relationship("SME", back_populates="invoices")
