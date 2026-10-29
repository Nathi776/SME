"""WBES benchmark builder: weighting, validity handling, suppression, and the shipped table."""
import numpy as np
import pandas as pd
import pytest

from data_pipeline import build_wbes_benchmarks as b
from services import market_data_service as mds


def _frame(n=40, **over):
    df = pd.DataFrame({
        "k6": 1, "k7": 2, "k8": 2, "k21": 2, "k30": 0,
        "b5": 2000, "l1": 10, "d2": 1_000_000, "n2a": 250_000,
        "a4a": 1, "wmedian": 1.0,
    }, index=range(n))
    for k, v in over.items():
        df[k] = v
    return df


def test_share_uses_weights_not_head_count():
    df = _frame(40)
    df["k8"] = [1] * 20 + [2] * 20            # half yes by count
    df["wmedian"] = [3.0] * 20 + [1.0] * 20   # but yes-firms stand for 3x as many
    cell = b._wshare(df, "k8", lambda s: s == 1, (1, 2))
    assert cell["value"] == pytest.approx(0.75)


def test_dont_know_is_dropped_not_counted_as_no():
    df = _frame(60)
    df["k21"] = [1] * 30 + [-9] * 30
    cell = b._wshare(df, "k21", lambda s: s == 1, (1, 2))
    assert cell["n"] == 30 and cell["value"] == 1.0


def test_small_cells_are_suppressed():
    cell = b._wshare(_frame(b.MIN_N - 1), "k6", lambda s: s == 1, (1, 2))
    assert cell["value"] is None and cell["n"] == b.MIN_N - 1


def test_weighted_median():
    assert b._wmedian(pd.Series([1, 2, 3]), pd.Series([1, 1, 10])) == 3
    assert b._wmedian(pd.Series([1, 2, 3]), pd.Series([10, 1, 1])) == 1


def test_derive_drops_invalid_values():
    df = _frame(5)
    df.loc[0, "b5"] = -9
    df.loc[1, "d2"] = -9
    df.loc[2, "n2a"] = 5_000_000          # labour cost above sales -> invalid ratio
    df.loc[3, "l1"] = -9
    d = b.derive(df)
    assert np.isnan(d.loc[0, "age"]) and np.isnan(d.loc[1, "sales"])
    assert np.isnan(d.loc[2, "labour_share"]) and np.isnan(d.loc[3, "size_band"])
    assert d.loc[4, "age"] == 20 and d.loc[4, "labour_share"] == pytest.approx(0.25)


def test_shipped_table_respects_suppression_and_is_context_only():
    t = mds.WBES_SA_2020_BENCHMARKS
    assert t["source"]["firms"] == 1097 and t["source"]["weight_variable"] == "wmedian"
    for group in ("by_size_band", "by_sector"):
        for cells in t[group].values():
            for m, c in cells.items():
                if isinstance(c, dict) and c["n"] < b.MIN_N:
                    assert c["value"] is None, (group, m)
    assert mds.wbes_benchmark("has_loan_or_credit_line")["value"] == pytest.approx(0.0478, abs=1e-4)
    assert mds.TABLE_PROVENANCE["wbes_sa_2020_benchmarks"]["independently_verified"] is False
    assert "loan_approval" not in str(t.keys())


def test_provenance_listed_in_public_sources():
    info = mds.market_data_sources()["tables"]["wbes_sa_2020_benchmarks"]
    assert info["basis"] == "derived_from_microdata"
    assert info["stale"] is True   # survey year 2020 is more than 12 months old
    assert "not published through any API" in info["note"]


def test_values_are_not_exposed_or_used_outside_the_data_layer():
    """Research-only data: no router or scoring code may read the benchmark values."""
    from pathlib import Path
    root = Path(__file__).resolve().parent.parent
    offenders = []
    for folder in ("routers", "services", "schemas.py", "main.py"):
        target = root / folder
        files = [target] if target.is_file() else list(target.rglob("*.py"))
        for f in files:
            if f.name == "market_data_service.py":
                continue
            text = f.read_text(encoding="utf-8", errors="ignore")
            if "wbes_benchmark" in text or "WBES_SA_2020_BENCHMARKS" in text:
                offenders.append(str(f.relative_to(root)))
    assert offenders == []


def test_source_is_cited_in_the_wording_the_protocol_requires():
    assert mds.WBES_SA_2020_BENCHMARKS["source"]["name"] == "Enterprise Surveys, The World Bank Group"
    assert mds.WBES_SA_2020_BENCHMARKS["source"]["licence_verified"] is False
