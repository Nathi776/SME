"""
Viability Score vs Funding Readiness vs Evidence Confidence.

Viability measures the business itself; compliance paperwork moves Funding
Readiness and Evidence Confidence but must not move Viability.
"""
from decimal import Decimal
from dataclasses import replace

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from core.assessment_engine import VIABILITY_FACTORS, assess
from core.scoring import EvidencePackage, FounderSignalInput
from database import Base
from models import SME, User
from models.assessment_snapshot import AssessmentSnapshot
from services.scoring_service import create_assessment_for_sme, scores_summary


def base_evidence(**overrides) -> EvidencePackage:
    ev = EvidencePackage(
        revenue=300_000, years_active=4, industry="Retail",
        total_invoices=30, paid_on_time=27, unpaid_invoices=2,
        province="Gauteng",
        founder=FounderSignalInput(
            years_industry_experience=6, highest_qualification="degree",
            prior_business_owner=True, trade_association_member=True,
            reference_provided=True,
        ),
    )
    return replace(ev, **overrides) if overrides else ev


FULL_DOCS = {
    "cipc": "approved", "bank_statement": "approved",
    "tax_clearance": "approved", "registration_docs": "approved",
}


def test_paperwork_changes_readiness_and_confidence_but_not_viability():
    bare = assess(base_evidence())
    papered = assess(base_evidence(verifications=dict(FULL_DOCS)))

    assert papered.viability_score == bare.viability_score
    assert papered.funding_readiness_score > bare.funding_readiness_score
    assert papered.evidence_confidence > bare.evidence_confidence


def test_strong_business_without_paperwork_is_viable_but_not_ready():
    result = assess(base_evidence())
    assert result.viability_score > result.funding_readiness_score


def test_weak_trading_lowers_viability():
    strong = assess(base_evidence())
    weak = assess(base_evidence(revenue=5_000, paid_on_time=5, unpaid_invoices=20))
    assert weak.viability_score < strong.viability_score


def test_idea_stage_viability_uses_only_applicable_factors():
    idea = assess(EvidencePackage(
        revenue=0, years_active=0, industry="Retail",
        total_invoices=0, paid_on_time=0, unpaid_invoices=0, province="Gauteng",
    ))
    assert idea.profile.value == "idea"
    for name in ("Revenue Tier", "Invoice Timeliness", "Unpaid Invoice Ratio"):
        assert idea.breakdown[name]["applicable"] is False
    assert 0.0 <= idea.viability_score <= 100.0


def test_viability_excludes_compliance_documents():
    assert "Compliance Documents" not in VIABILITY_FACTORS


def test_alias_properties_and_summary_match_underlying_fields():
    r = assess(base_evidence(verifications=dict(FULL_DOCS)))
    assert r.funding_readiness_score == r.score
    assert r.evidence_confidence == r.confidence_score
    assert scores_summary(r) == {
        "viability_score": r.viability_score,
        "funding_readiness_score": r.score,
        "evidence_confidence": r.confidence_score,
    }
    assert r.breakdown["_assessment"]["viability_score"] == r.viability_score


@pytest.fixture()
def db():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False},
                           poolclass=StaticPool)
    Base.metadata.create_all(bind=engine)
    s = sessionmaker(bind=engine, autoflush=False)()
    yield s
    s.close()
    Base.metadata.drop_all(bind=engine)


def test_snapshot_persists_viability_score(db):
    user = User(username="v", email="v@t.com", hashed_password="x", role="sme")
    db.add(user); db.commit()
    sme = SME(name="V", industry="Retail", revenue=Decimal("300000"),
              years_active=4, user_id=user.id, province="Gauteng")
    db.add(sme); db.commit()

    result, _, snap_id = create_assessment_for_sme(sme, db)

    snap = db.get(AssessmentSnapshot, snap_id)
    assert snap.viability_score == result.viability_score
    assert snap.score == result.funding_readiness_score
    assert snap.evidence_depth == result.evidence_confidence
