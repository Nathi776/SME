from decimal import Decimal

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from database import Base
from models import AssessmentSnapshot, BusinessObservation, SME, User
from services.scoring_service import create_assessment_for_sme, score_sme


engine = create_engine("sqlite:///:memory:")
TestingSessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)


@pytest.fixture(scope="function")
def db():
    Base.metadata.create_all(bind=engine)
    db_session = TestingSessionLocal()
    try:
        yield db_session
    finally:
        db_session.close()
        Base.metadata.drop_all(bind=engine)


def create_test_sme(db):
    user = User(
        username="snapshot_test_user",
        email="snapshot_test@example.com",
        hashed_password="pw",
        role="sme",
    )
    db.add(user)
    db.flush()

    sme = SME(
        name="Snapshot Test SME",
        industry="Technology",
        revenue=Decimal("300000"),
        years_active=3,
        user_id=user.id,
    )
    db.add(sme)
    db.commit()
    return sme


def test_score_sme_creates_linked_observation_and_snapshot(db):
    sme = create_test_sme(db)

    result = score_sme(sme, db)

    snapshot = (
        db.query(AssessmentSnapshot)
        .filter(AssessmentSnapshot.sme_id == sme.id)
        .order_by(AssessmentSnapshot.assessed_at.desc())
        .first()
    )
    observation = (
        db.query(BusinessObservation)
        .filter(BusinessObservation.id == snapshot.business_observation_id)
        .first()
    ) if snapshot else None

    assert result is not None
    assert snapshot is not None
    assert snapshot.business_observation_id is not None
    assert observation is not None
    assert observation.sme_id == sme.id
    assert observation.source == "assessment"


def test_create_assessment_for_sme_creates_linked_history(db):
    sme = create_test_sme(db)

    result, observation_id, snapshot_id = create_assessment_for_sme(sme, db)

    observation = (
        db.query(BusinessObservation)
        .filter(BusinessObservation.id == observation_id)
        .first()
    )
    snapshot = (
        db.query(AssessmentSnapshot)
        .filter(AssessmentSnapshot.id == snapshot_id)
        .first()
    )

    assert result is not None
    assert observation is not None
    assert snapshot is not None
    assert snapshot.business_observation_id == observation.id
    assert snapshot.sme_id == sme.id
