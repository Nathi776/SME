from sqlalchemy import Column, Integer, String, Numeric, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from database import Base


class SME(Base):
    __tablename__ = "smes"

    id           = Column(Integer, primary_key=True, index=True)
    name         = Column(String,  nullable=False)
    industry     = Column(String,  nullable=False)
    revenue      = Column(Numeric(18, 2), nullable=False)
    years_active = Column(Integer, nullable=False, default=0)
    user_id      = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)

    # ── Location (Track A — migration 010) ────────────────────────────────────
    province      = Column(String, nullable=True)
    business_city = Column(String, nullable=True)

    # ── Bank statement parsing signals (migration 009) ─────────────────────────
    bs_avg_monthly_balance  = Column(Numeric(18, 2), nullable=True)
    bs_avg_monthly_income   = Column(Numeric(18, 2), nullable=True)
    bs_avg_monthly_expenses = Column(Numeric(18, 2), nullable=True)
    bs_overdraft_count      = Column(Integer,        nullable=True)
    bs_income_regularity    = Column(Numeric(18, 4), nullable=True)
    bs_months_analysed      = Column(Integer,        nullable=True)
    bs_parsed_revenue       = Column(Numeric(18, 2), nullable=True)

    # ── CIPC verification state (Component 4 — migration 012) ─────────────────
    # Populated when an SME uploads a CIPC certificate.
    # cipc_registration_number: extracted from the document upload form
    # cipc_verified_at:         set when the live API confirms the company
    # cipc_company_name:        as returned by CIPC API (may differ slightly from sme.name)
    # cipc_status:              "In Business" | "Deregistered" | "Pending" | etc.
    cipc_registration_number = Column(String,   nullable=True)
    cipc_verified_at         = Column(DateTime, nullable=True)
    cipc_company_name        = Column(String,   nullable=True)
    cipc_status              = Column(String,   nullable=True)

    # ── Relationships ─────────────────────────────────────────────────────────
    user             = relationship("User",          back_populates="sme_profile")
    invoices         = relationship("Invoice",        back_populates="sme", cascade="all, delete-orphan")
    credit_scores    = relationship("CreditScore",    back_populates="sme", cascade="all, delete-orphan")
    finance_requests = relationship("FinanceRequest", back_populates="sme", cascade="all, delete-orphan")
    verifications    = relationship("Verification",   back_populates="sme", cascade="all, delete-orphan")
    founder_profile  = relationship("FounderProfile", back_populates="sme", uselist=False, cascade="all, delete-orphan")
    outcomes         = relationship("SmeOutcome",    back_populates="sme", cascade="all, delete-orphan")

    def __repr__(self):
        return (
            f"<SME(id={self.id}, name='{self.name}', "
            f"province='{self.province}', cipc='{self.cipc_registration_number}')>"
        )
