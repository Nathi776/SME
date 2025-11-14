from sqlalchemy import Column, Integer, String, Float, ForeignKey, Date
from sqlalchemy.orm import relationship
from database import Base
from datetime import date

class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True)
    sme_id = Column(Integer, ForeignKey("smes.id", ondelete="CASCADE"), nullable=False)
    client_name = Column(String, nullable=False)
    amount = Column(Float, nullable=False)
    due_date = Column(Date, default=date.today)
    status = Column(String, default="pending")  # pending, paid, overdue

    sme = relationship("SME", back_populates="invoices")

    def __repr__(self):
        return f"<Invoice(id={self.id}, client_name='{self.client_name}', amount={self.amount}, status='{self.status}')>"
