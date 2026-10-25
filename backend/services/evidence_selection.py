"""
services/evidence_selection.py

Single source of truth for which verification record is allowed to supply
financial signals. Both the scoring service and the business-observation
service call this, so they can never disagree about which bank statement
was used, and every consumer can record the verification ID it relied on.

POLICY (change it here, and only here):
    The *latest submitted* bank statement governs. Its metrics are eligible
    only if that statement is approved. A newer pending/rejected upload
    therefore suspends the older approved statement's metrics.

    If you would rather score from "the latest *approved* statement" even
    while a newer upload is pending, change `_governing_bank_statement`.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable

BANK_STATEMENT = "bank_statement"


@dataclass(frozen=True)
class BankStatementEvidence:
    # The statement that governs eligibility (may be pending/rejected).
    governing: object | None
    # The statement whose metrics may be used; None when not eligible.
    approved: object | None

    @property
    def verification_id(self) -> int | None:
        """ID of the verification record the metrics came from."""
        return self.approved.id if self.approved is not None else None


def sort_verifications(verifications: Iterable) -> list:
    """Oldest -> newest. Tolerates missing timestamps and ID ties."""
    return sorted(
        verifications,
        key=lambda v: (v.submitted_at is not None, v.submitted_at, v.id or 0),
    )


def _governing_bank_statement(sorted_verifications: list):
    return next(
        (v for v in reversed(sorted_verifications) if v.doc_type == BANK_STATEMENT),
        None,
    )


def select_bank_statement_evidence(verifications: Iterable) -> BankStatementEvidence:
    governing = _governing_bank_statement(sort_verifications(verifications))
    approved = governing if governing is not None and governing.status == "approved" else None
    return BankStatementEvidence(governing=governing, approved=approved)
