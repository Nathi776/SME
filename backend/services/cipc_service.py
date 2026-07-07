"""
services/cipc_service.py

CIPC company verification service.

Architecture: three-layer lookup with graceful fallback.

Layer 1 — Live API (when CIPC_API_URL + CIPC_API_KEY are set in .env)
  Calls a configured REST endpoint (e.g. a Lexis Nexis / Compuscan data
  reseller, or the future official CIPC API). Returns structured company data.

Layer 2 — Pattern validation (always runs as a pre-check)
  Validates the registration number format (YYYY/NNNNNN/NN) before any
  network call. Rejects obviously malformed numbers immediately.

Layer 3 — Manual review fallback (when API is unavailable or not configured)
  Returns a structured result indicating manual review is needed.
  The registration number is stored on the SME record so the admin panel
  can display it during review without the admin needing to re-read the PDF.

Result contract:
  CIPCResult.verified     True | False | None
    True  → API confirmed the company exists and is in business
    False → API confirmed the company does NOT exist or is deregistered
    None  → Could not verify automatically; needs manual review

  CIPCResult.auto_approved  True only when verified=True from live API
  CIPCResult.company_data   dict of fields returned by the API (when available)
"""

from __future__ import annotations

import re
import os
import logging
from dataclasses import dataclass, field
from typing import Any

import httpx

logger = logging.getLogger(__name__)

# ── Registration number format ────────────────────────────────────────────────
# South African company registration: YYYY/NNNNNN/NN
# e.g. 2019/045321/07  or  2024/112233/07
_REG_RE = re.compile(r"^\d{4}/\d{6}/\d{2}$")


@dataclass
class CIPCResult:
    """Structured result from a CIPC verification attempt."""
    verified:       bool | None   # True=confirmed, False=not found, None=unknown
    auto_approved:  bool          # True only when live API confirmed the company
    registration_number: str
    company_name:   str | None    = None
    status:         str | None    = None   # "In Business", "Deregistered", etc.
    reg_date:       str | None    = None
    director:       str | None    = None
    source:         str           = "manual_review"  # "api" | "pattern_only" | "manual_review"
    error:          str | None    = None
    company_data:   dict[str, Any] = field(default_factory=dict)


def verify(registration_number: str, company_name: str | None = None) -> CIPCResult:
    """
    Main entry point. Call this when an SME uploads a CIPC certificate.

    Args:
        registration_number: as typed/parsed from the document
        company_name:        SME name from the SME record (used to cross-check)

    Returns:
        CIPCResult with verification outcome
    """
    reg = registration_number.strip()

    # ── Layer 2: format validation (always first) ─────────────────────────────
    if not _REG_RE.match(reg):
        return CIPCResult(
            verified=False,
            auto_approved=False,
            registration_number=reg,
            error=(
                f"'{reg}' is not a valid SA company registration number. "
                "Expected format: YYYY/NNNNNN/NN (e.g. 2019/045321/07)"
            ),
            source="pattern_only",
        )

    # ── Layer 1: live API (only if configured) ────────────────────────────────
    api_url = os.getenv("CIPC_API_URL", "").strip()
    api_key = os.getenv("CIPC_API_KEY", "").strip()

    if api_url and api_key:
        return _call_api(reg, company_name, api_url, api_key)

    # ── Layer 3: fallback — manual review ─────────────────────────────────────
    logger.info(
        "CIPC_API_URL/CIPC_API_KEY not configured — "
        "registration %s queued for manual review", reg
    )
    return CIPCResult(
        verified=None,
        auto_approved=False,
        registration_number=reg,
        source="manual_review",
        error=None,
    )


def _call_api(
    reg: str,
    company_name: str | None,
    api_url: str,
    api_key: str,
) -> CIPCResult:
    """
    Calls the configured CIPC data provider API.

    Expected response shape (provider-agnostic):
    {
      "found": true,
      "company_name": "Thabo Nkosi Engineering (Pty) Ltd",
      "registration_number": "2019/045321/07",
      "status": "In Business",
      "registration_date": "2019-06-12",
      "directors": [{"name": "Thabo Nkosi"}]
    }

    Adapt _parse_api_response() if your provider returns a different shape.
    """
    try:
        with httpx.Client(timeout=10.0) as client:
            response = client.get(
                api_url,
                params={"registration_number": reg},
                headers={
                    "X-API-Key": api_key,
                    "Accept":    "application/json",
                },
            )
            response.raise_for_status()
            data = response.json()
            return _parse_api_response(reg, company_name, data)

    except httpx.TimeoutException:
        logger.warning("CIPC API timeout for %s — falling back to manual review", reg)
        return CIPCResult(
            verified=None,
            auto_approved=False,
            registration_number=reg,
            source="manual_review",
            error="CIPC API timed out. Document queued for manual review.",
        )
    except httpx.HTTPStatusError as exc:
        logger.warning("CIPC API HTTP %s for %s", exc.response.status_code, reg)
        return CIPCResult(
            verified=None,
            auto_approved=False,
            registration_number=reg,
            source="manual_review",
            error=f"CIPC API returned HTTP {exc.response.status_code}. Queued for manual review.",
        )
    except Exception as exc:
        logger.exception("Unexpected CIPC API error for %s", reg)
        return CIPCResult(
            verified=None,
            auto_approved=False,
            registration_number=reg,
            source="manual_review",
            error=f"Unexpected error: {exc}. Queued for manual review.",
        )


def _parse_api_response(
    reg: str,
    expected_name: str | None,
    data: dict,
) -> CIPCResult:
    """
    Parses the API response into a CIPCResult.
    Adapt this function to match your data provider's response schema.
    """
    if not data.get("found", False):
        return CIPCResult(
            verified=False,
            auto_approved=False,
            registration_number=reg,
            source="api",
            error="Company not found in CIPC registry.",
        )

    company_name  = data.get("company_name")
    status        = data.get("status", "")
    reg_date      = data.get("registration_date")
    directors     = data.get("directors", [])
    director_name = directors[0].get("name") if directors else None

    # Company must be "In Business" to be verified
    is_active = "business" in status.lower() or "active" in status.lower()

    # Optional name cross-check — warn but don't fail on minor differences
    name_warning = None
    if expected_name and company_name:
        if expected_name.lower().strip() not in company_name.lower().strip():
            name_warning = (
                f"SME name '{expected_name}' does not exactly match "
                f"CIPC name '{company_name}'. Review recommended."
            )

    return CIPCResult(
        verified=is_active,
        auto_approved=is_active,   # auto-approve only when confirmed active
        registration_number=reg,
        company_name=company_name,
        status=status,
        reg_date=reg_date,
        director=director_name,
        source="api",
        error=name_warning,
        company_data=data,
    )
