"""
Market tables are versioned and sourced; they cannot change silently.
"""
from datetime import date
from decimal import Decimal

import pytest

from services import market_data_service as mds

# If this test fails you changed a market table. Do all three:
#   1. bump MARKET_DATA_VERSION in services/market_data_service.py
#   2. update that table's TABLE_PROVENANCE entry (basis, sources, as_of)
#   3. replace the value below with the new fingerprint
PINNED_VERSION = "2026.10.1"
PINNED_FINGERPRINT = "1d5bc5fed499a488"


def test_tables_have_not_changed_without_a_version_bump():
    assert mds.market_data_fingerprint() == PINNED_FINGERPRINT, (
        "Market data changed. Bump MARKET_DATA_VERSION, update TABLE_PROVENANCE, "
        "then update PINNED_FINGERPRINT (see comment above)."
    )
    assert mds.MARKET_DATA_VERSION == PINNED_VERSION


def test_fingerprint_reacts_to_any_value_change(monkeypatch):
    before = mds.market_data_fingerprint()
    monkeypatch.setitem(mds.SECTOR_SURVIVAL_RATES, "Retail", 0.49)
    assert mds.market_data_fingerprint() != before


def test_fingerprint_covers_adjustments_and_default_index(monkeypatch):
    before = mds.market_data_fingerprint()
    monkeypatch.setitem(mds.INDUSTRY_PROVINCE_ADJUSTMENTS, ("Retail", "Gauteng"), 1.05)
    assert mds.market_data_fingerprint() != before
    monkeypatch.delitem(mds.INDUSTRY_PROVINCE_ADJUSTMENTS, ("Retail", "Gauteng"))
    assert mds.market_data_fingerprint() == before
    monkeypatch.setattr(mds, "UNSPECIFIED_PROVINCE_INDEX", 0.6)
    assert mds.market_data_fingerprint() != before


def test_every_table_has_provenance_and_none_claims_verification():
    assert set(mds.TABLE_PROVENANCE) == set(mds._canonical_tables())
    allowed = {"published_statistic", "informed_index", "cited_benchmark",
               "expert_judgement", "taxonomy", "design_default", "derived_from_microdata"}
    for name, info in mds.TABLE_PROVENANCE.items():
        assert info["basis"] in allowed, name
        assert info["as_of"], name
        # Flip this only after someone has checked values against the source.
        assert info["independently_verified"] is False, name


def test_default_province_index_still_used_when_province_missing():
    assert mds.province_market_score(None, "Retail") == pytest.approx(0.52)


def test_scoring_behaviour_unchanged_by_refactor():
    # Spot values from the model specification (Technology 0.72, Gauteng 1.0 x 1.10 capped).
    assert mds.sector_survival_score("tech") == 0.72
    assert mds.province_market_score("Gauteng", "Technology") == 1.0
    assert mds.province_market_score("Free State", "Agriculture") == pytest.approx(0.50)


@pytest.mark.parametrize("as_of,today,stale", [
    ("2023", date(2025, 1, 1), True),       # period ended Dec 2023, >12 months ago
    ("2023", date(2024, 12, 31), False),    # exactly 12 months
    ("2025-10", date(2026, 10, 26), False),
    ("2025-10", date(2026, 12, 1), True),
])
def test_staleness(as_of, today, stale):
    assert mds.is_stale(as_of, today) is stale


def test_sources_summary_is_public_safe_and_flags_stale_data():
    info = mds.market_data_sources(today=date(2026, 10, 26))
    assert info["version"] == PINNED_VERSION and info["fingerprint"] == PINNED_FINGERPRINT
    assert info["tables"]["sector_survival_rates"]["stale"] is True
    assert info["tables"]["province_economic_index"]["stale"] is False
    assert "review_note" not in str(info)            # internal notes stay internal
    assert "discontinued" not in str(info)


def test_intelligence_output_carries_data_version():
    assert mds.get_market_intelligence("Retail", "Gauteng")["data_version"] == PINNED_VERSION


# ── Snapshots record the data version ────────────────────────────────────────

def test_snapshot_records_market_data_version(api):
    from models import SME, User
    from models.assessment_snapshot import AssessmentSnapshot
    from services.scoring_service import create_assessment_for_sme

    user = api.make_user("sme")
    db = api.Session()
    sme = SME(name="M", industry="Retail", revenue=Decimal("1000"), years_active=1,
              user_id=user.id, province="Gauteng")
    db.add(sme)
    db.commit()

    _, _, snap_id = create_assessment_for_sme(sme, db)

    snap = db.get(AssessmentSnapshot, snap_id)
    assert snap.market_context["market_data"] == {
        "version": PINNED_VERSION, "fingerprint": PINNED_FINGERPRINT}
    db.close()


def test_data_sources_endpoint_requires_api_key_and_returns_public_view(api):
    from models.api_key import APIKey
    from services.api_key_service import generate_api_key

    assert api.client.get("/api/v1/market/data-sources").status_code in (401, 403, 422)

    admin = api.make_user("admin")
    raw, hashed = generate_api_key()
    db = api.Session()
    db.add(APIKey(key_hash=hashed, key_prefix=raw[:12], name="t", consumer_type="lender",
                  created_by_user_id=admin.id))
    db.commit()
    db.close()

    r = api.client.get("/api/v1/market/data-sources", headers={"X-API-Key": raw})
    assert r.status_code == 200
    body = r.json()
    assert body["version"] == PINNED_VERSION
    assert body["tables"]["sector_survival_rates"]["stale"] is True
    assert "review_note" not in r.text

    v = api.client.get("/api/v1/market/viability?industry=Retail&province=Gauteng",
                       headers={"X-API-Key": raw}).json()
    assert v["data_version"] == PINNED_VERSION
