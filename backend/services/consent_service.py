"""
services/consent_service.py

Consent for using a business's assessment and outcome data to evaluate and
improve the scoring model.

Rules:
* Opt-in. No record means no consent; nothing is pre-ticked.
* Append-only. Granting and withdrawing both add a row, so there is always
  evidence of what was agreed, under which policy text, and when.
* Withdrawal takes effect immediately for future use: analyses read the
  current state each time they run. It cannot undo analysis already done.

The wording below is plain-language product copy, not legal advice. Have it
reviewed against POPIA before relying on it, and bump CONSENT_POLICY_VERSION
whenever the text changes so earlier consents stay tied to the text the user saw.
"""
from __future__ import annotations

from sqlalchemy import func
from sqlalchemy.orm import Session

from models.data_consent import DataConsent

PURPOSE_MODEL_IMPROVEMENT = "model_improvement"
CONSENT_POLICY_VERSION = "2026-10"

PURPOSES: dict[str, str] = {
    PURPOSE_MODEL_IMPROVEMENT: (
        "Allow NEPTECH SYSTEMS to use your business's assessment results and later "
        "check-in outcomes (for example whether the business is still operating and "
        "whether a loan was repaid) to evaluate and improve the scoring model. "
        "This is optional and does not affect your assessment or any funding "
        "request. You can withdraw at any time; withdrawing stops future use but "
        "cannot undo analysis that has already been completed."
    ),
}


class UnknownPurpose(ValueError):
    pass


def _check_purpose(purpose: str) -> None:
    if purpose not in PURPOSES:
        raise UnknownPurpose(purpose)


def record_consent(
    db: Session,
    user_id: int,
    purpose: str,
    granted: bool,
    source: str,
) -> DataConsent:
    """Append a consent decision (grant or withdrawal) and commit it."""
    _check_purpose(purpose)
    row = DataConsent(
        user_id=user_id,
        purpose=purpose,
        granted=bool(granted),
        policy_version=CONSENT_POLICY_VERSION,
        source=source,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def latest_consent(db: Session, user_id: int, purpose: str) -> DataConsent | None:
    return (
        db.query(DataConsent)
        .filter(DataConsent.user_id == user_id, DataConsent.purpose == purpose)
        .order_by(DataConsent.id.desc())
        .first()
    )


def has_consent(db: Session, user_id: int, purpose: str) -> bool:
    row = latest_consent(db, user_id, purpose)
    return bool(row and row.granted)


def consenting_user_ids(db: Session, purpose: str) -> set[int]:
    """Users whose most recent decision for this purpose is a grant."""
    _check_purpose(purpose)
    newest = (
        db.query(func.max(DataConsent.id))
        .filter(DataConsent.purpose == purpose)
        .group_by(DataConsent.user_id)
        .subquery()
    )
    rows = (
        db.query(DataConsent.user_id)
        .filter(DataConsent.id.in_(newest), DataConsent.granted.is_(True))
        .all()
    )
    return {user_id for (user_id,) in rows}
