from sqlalchemy import Column, Integer, String, Numeric, ForeignKey, DateTime
from datetime import datetime
from database import Base
from sqlalchemy.orm import relationship

class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True)
    sme_id = Column(Integer, ForeignKey("smes.id"))
    client_name = Column(String)
    description = Column(String)
    amount = Column(Numeric(18, 2))
    status = Column(String, default="pending")
    invoice_number = Column(String, nullable=True)
    issue_date = Column(DateTime, nullable=True)
    due_date = Column(DateTime, nullable=True)
    currency = Column(String, default="ZAR")
    customer_company = Column(String, nullable=True)
    contact_person = Column(String, nullable=True)
    email = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    customer_industry = Column(String, nullable=True)
    payment_terms = Column(Integer, nullable=True)
    pdf_url = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    sme = relationship("SME", back_populates="invoices")
    finance_requests = relationship("FinanceRequest", back_populates="invoice", cascade="all, delete-orphan")
