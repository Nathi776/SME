"""
Who may see which business. Lenders see other businesses' financial data, so access is:
  1. only for an APPROVED lender account (enforced centrally in get_current_user), and
  2. only for businesses with a finance request that is open to the pool (unassigned and pending)
     or assigned to that lender.
Admins are unrestricted. A lender never sees a business just because it exists.
"""
from __future__ import annotations

from sqlalchemy import or_
from sqlalchemy.orm import Session

from models.finance_request import FinanceRequest
from models.lender import Lender

APPROVED = "approved"


def lender_for_user(db: Session, user) -> Lender | None:
    return db.query(Lender).filter(Lender.user_id == user.id).first()


def related_requests(db: Session, lender: Lender):
    return db.query(FinanceRequest).filter(
        or_(
            FinanceRequest.lender_id == lender.id,
            (FinanceRequest.lender_id.is_(None)) & (FinanceRequest.status == "pending"),
        )
    )


def visible_sme_ids(db: Session, lender: Lender) -> set[int]:
    return {r.sme_id for r in related_requests(db, lender).with_entities(FinanceRequest.sme_id).all()}


def lender_can_view_sme(db: Session, lender: Lender | None, sme_id: int) -> bool:
    if lender is None or lender.approval_status != APPROVED:
        return False
    return related_requests(db, lender).filter(FinanceRequest.sme_id == sme_id).first() is not None


def can_view_sme(db: Session, user, sme_id: int) -> bool:
    """Admin: any. Lender: only related businesses. Anyone else: False (owners are checked by callers)."""
    if user.role == "admin":
        return True
    if user.role == "lender":
        return lender_can_view_sme(db, lender_for_user(db, user), sme_id)
    return False
