"""
services/evidence_selection.py

Single source of truth for which verification record is allowed to supply
financial signals. Both the scoring service and the business-observation
service call this, so they can never disagree about which bank statement
was used, and every consumer can record the verification ID it relied on.

POLICY (change it here, and only here):
    Scoring uses the *latest approved* bank statement. A newer upload that is
    still pending (or was rejected) never suppresses an older approved one,
    so a score is not disturbed while a fresh statement awaits review.
    `newer_unreviewed` tells callers when a more recent upload exists that is
    not the one being used, so the evidence can be flagged as possibly stale.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable

BANK_STATEMENT = "bank_statement"


@dataclass(frozen=True)
class BankStatementEvidence:
    # The most recent bank statement submitted (any status).
    governing: object | None
    # The statement whose metrics may be used; None when none is approved.
    approved: object | None

    @property
    def verification_id(self) -> int | None:
        """ID of the verification record the metrics came from."""
        return self.approved.id if self.approved is not None else None

    @property
    def newer_unreviewed(self) -> bool:
        """True when a newer, non-approved upload exists than the one in use."""
        return (
            self.governing is not None
            and self.approved is not None
            and self.governing is not self.approved
        )


def sort_verifications(verifications: Iterable) -> list:
    """Oldest -> newest. Tolerates missing timestamps and ID ties."""
    return sorted(
        verifications,
        key=lambda v: (v.submitted_at is not None, v.submitted_at, v.id or 0),
    )


def select_bank_statement_evidence(verifications: Iterable) -> BankStatementEvidence:
    ordered = [v for v in reversed(sort_verifications(verifications))
               if v.doc_type == BANK_STATEMENT]
    governing = ordered[0] if ordered else None
    approved = next((v for v in ordered if v.status == "approved"), None)
    return BankStatementEvidence(governing=governing, approved=approved)
