"""
Outcome tracking: linkage to the assessment the decision was based on,
immutable training labels, side-effect-free reads, and model calibration.
"""
from decimal import Decimal

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from database import Base
from models import SME, FinanceRequest, SmeOutcome, User
from models.assessment_snapshot import AssessmentSnapshot
from models.business_observation import BusinessObservation
from services.assessment_evaluation_service import get_model_calibration
from services.outcome_service import (
    compute_followed_recommendations,
    create_outcome,
    update_checkin,
)
from services.scoring_service import score_sme


@pytest.fixture()
def db():
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    Base.metadata.create_all(bind=engine)
    session = sessionmaker(bind=engine, autoflush=False)()
    yield session
    session.close()
    Base.metadata.drop_all(bind=engine)


def _sme(db, name="Acme"):
    user = User(username=f"u_{name}", email=f"{name}@t.com", hashed_password="x", role="sme")
    db.add(user)
    db.commit()
    sme = SME(name=name, industry="Retail", revenue=Decimal("200000"),
              years_active=3, user_id=user.id)
    db.add(sme)
    db.commit()
    return sme


def _funded_request(db, sme, snapshot_score=72.0, version="v-test"):
    """A request linked to an *earlier* assessment, as in the real flow."""
    snap = AssessmentSnapshot(
        sme_id=sme.id, profile="established", score=snapshot_score,
        decision="approve", strategy_version=version,
        factor_breakdown=score_sme(sme, db).breakdown,
    )
    db.add(snap)
    db.commit()
    req = FinanceRequest(sme_id=sme.id, amount_requested=Decimal("10000"),
                         approved_amount=Decimal("10000"), status="funded",
                         assessment_snapshot_id=snap.id)
    db.add(req)
    db.commit()
    return req, snap


def test_outcome_uses_linked_snapshot_without_rescoring(db):
    sme = _sme(db)
    req, snap = _funded_request(db, sme, snapshot_score=72.0)
    snapshots_before = db.query(AssessmentSnapshot).count()

    outcome = create_outcome(db, req.id)
    db.commit()

    assert outcome.score_at_funding == 72.0          # the score the lender saw
    assert db.query(AssessmentSnapshot).count() == snapshots_before  # no new snapshot


def test_followed_recommendations_read_has_no_side_effects(db):
    sme = _sme(db)
    req, _ = _funded_request(db, sme)
    outcome = create_outcome(db, req.id)
    db.commit()
    snaps = db.query(AssessmentSnapshot).count()
    obs = db.query(BusinessObservation).count()

    compute_followed_recommendations(db, outcome)
    compute_followed_recommendations(db, outcome)

    assert db.query(AssessmentSnapshot).count() == snaps
    assert db.query(BusinessObservation).count() == obs


def test_checkin_records_observation(db):
    sme = _sme(db)
    req, _ = _funded_request(db, sme)
    outcome = create_outcome(db, req.id)
    db.commit()

    update_checkin(db, outcome.id, 90, True, 50000, False)

    obs = db.query(BusinessObservation).filter_by(source="outcome_checkin").one()
    assert obs.still_operating is True
    assert obs.additional_data["interval_days"] == 90
    assert obs.additional_data["self_reported_revenue"] == 50000.0


def test_labels_written_at_365_and_immutable(db):
    sme = _sme(db)
    req, _ = _funded_request(db, sme)
    outcome = create_outcome(db, req.id)
    db.commit()

    update_checkin(db, outcome.id, 90, True, 40000, False)
    assert outcome.y1_survived_12m is None            # not before day 365

    update_checkin(db, outcome.id, 365, True, 120000, True)
    assert outcome.y1_survived_12m is True
    assert outcome.y3_reached_100k is True
    assert outcome.y4_revenue_grew is True
    assert outcome.y5_defaulted is False
    assert outcome.y2_survived_18m is None            # needs 540-day check-in

    # A later correction must not rewrite the label.
    update_checkin(db, outcome.id, 365, False, 0, False)
    assert outcome.y1_survived_12m is True


def test_default_label(db):
    sme = _sme(db)
    req, _ = _funded_request(db, sme)
    outcome = create_outcome(db, req.id)
    db.commit()
    update_checkin(db, outcome.id, 365, True, 10000, False)
    assert outcome.y5_defaulted is True
    assert outcome.y3_reached_100k is False


def test_calibration_groups_by_version_and_band_and_flags_small_samples(db):
    for i, (score, survived) in enumerate([(72.0, True), (75.0, False), (45.0, False)]):
        sme = _sme(db, name=f"B{i}")
        req, _ = _funded_request(db, sme, snapshot_score=score, version="v1")
        outcome = create_outcome(db, req.id)
        db.commit()
        update_checkin(db, outcome.id, 365, survived, 1000, survived)

    report = get_model_calibration(db)

    assert report["labelled_outcomes"] == 3
    by_band = {g["score_band"]: g for g in report["groups"]}
    assert by_band["60-79"]["n"] == 2
    assert by_band["60-79"]["survival_rate_12m"] == 0.5
    assert by_band["40-59"]["survival_rate_12m"] == 0.0
    assert all(g["sufficient_sample"] is False for g in report["groups"])
