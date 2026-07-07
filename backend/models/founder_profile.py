"""
models/founder_profile.py

Stores Layer 1 founder signals — who is the person behind this business?

Linked one-to-one with the SME record.
Populated during registration (step 2 extended) or via profile update.

These signals feed the Founder Signal factor in core/scoring.py.
They are intentionally self-declared at this stage — future integration
with Home Affairs (ID verification) and credit bureaus (TransUnion/Experian)
will allow external verification of these fields.
"""

from sqlalchemy import Column, Integer, String, ForeignKey, Boolean, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base


class FounderProfile(Base):
    __tablename__ = "founder_profiles"

    id     = Column(Integer, primary_key=True, index=True)
    sme_id = Column(Integer, ForeignKey("smes.id", ondelete="CASCADE"),
                   nullable=False, unique=True)

    # ── Identity ──────────────────────────────────────────────────────────────
    # Collected for future ID verification integration (Home Affairs / SARS).
    # Not currently verified — stored as self-declared.
    id_number = Column(String, nullable=True)  # SA ID number (13 digits)

    # ── Employment & experience ───────────────────────────────────────────────
    # What did this person do before starting this business?
    prior_employer        = Column(String,  nullable=True)  # Most recent employer name
    prior_job_title       = Column(String,  nullable=True)  # Most recent job title
    prior_industry        = Column(String,  nullable=True)  # Industry of prior employment
    years_industry_experience = Column(Integer, nullable=True)  # Total years in this industry
    prior_business_owner  = Column(Boolean, nullable=True)  # Has run a business before?
    prior_business_name   = Column(String,  nullable=True)  # Name of prior business (optional)

    # ── Education ─────────────────────────────────────────────────────────────
    # Highest qualification achieved.
    # Values: "none" | "matric" | "certificate" | "diploma" | "degree" | "postgraduate"
    highest_qualification = Column(String, nullable=True)
    field_of_study        = Column(String, nullable=True)  # e.g. "Civil Engineering", "Accounting"

    # ── Network & references ──────────────────────────────────────────────────
    # Social capital — trade associations, chamber membership, business references.
    trade_association_member = Column(Boolean, nullable=True)  # Member of any trade body?
    trade_association_name   = Column(String,  nullable=True)  # e.g. "SACCI", "Master Builders SA"
    reference_name           = Column(String,  nullable=True)  # Business reference contact name
    reference_company        = Column(String,  nullable=True)  # Their company
    reference_phone          = Column(String,  nullable=True)  # Contact number

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # ── Relationship ──────────────────────────────────────────────────────────
    sme = relationship("SME", back_populates="founder_profile")
