"""
Build weighted context benchmarks from the World Bank Enterprise Survey,
South Africa 2020 (microdata licensed to the user; NOT stored in this repo).

Usage (pyreadstat is only needed to run this script, not the app):
    pip install pyreadstat
    python data_pipeline/build_wbes_benchmarks.py "<South Africa-2020-full data.dta>"

Output: data/wbes_sa_2020_benchmarks.json  (aggregates only, no firm records)

Rules
  * Weights: `wmedian` (the World Bank's own default for published indicators).
  * Valid answers only: Yes/No for shares; "don't know" / not-applicable codes
    (negative values) are dropped, never treated as "No".
  * Cells with fewer than MIN_N unweighted firms are suppressed (value = null).
  * Margin of error is APPROXIMATE: 1.96*sqrt(p(1-p)/n_eff) with Kish effective
    n from the weights. It ignores stratification, so treat it as indicative.
"""
from __future__ import annotations

import json
import math
import sys
from pathlib import Path

import numpy as np
import pandas as pd

MIN_N = 30
WEIGHT = "wmedian"
SURVEY_YEAR = 2020
OUT = Path(__file__).resolve().parent.parent / "data" / "wbes_sa_2020_benchmarks.json"

SECTORS = {1: "Food", 2: "Textiles and Garments", 3: "Fabricated Metal Products",
           4: "Motor Vehicles", 5: "Other Manufacturing", 6: "Construction",
           7: "Retail", 8: "Other Services"}

# measure -> (column, predicate on the valid-answer frame)
SHARES = {
    "has_bank_account": ("k6", lambda s: s == 1, (1, 2)),
    "has_overdraft": ("k7", lambda s: s == 1, (1, 2)),
    "has_loan_or_credit_line": ("k8", lambda s: s == 1, (1, 2)),
    "audited_financial_statements": ("k21", lambda s: s == 1, (1, 2)),
    "finance_major_or_severe_obstacle": ("k30", lambda s: s >= 3, (0, 1, 2, 3, 4)),
}


def _wshare(df: pd.DataFrame, col: str, pred, valid) -> dict:
    s = df[df[col].isin(valid) & df[WEIGHT].notna() & (df[WEIGHT] > 0)]
    n = int(len(s))
    if n < MIN_N:
        return {"n": n, "value": None, "margin_95": None}
    w = s[WEIGHT].to_numpy(float)
    p = float((w * pred(s[col]).to_numpy()).sum() / w.sum())
    n_eff = float(w.sum() ** 2 / (w ** 2).sum())
    return {"n": n, "value": round(p, 4),
            "margin_95": round(1.96 * math.sqrt(max(p * (1 - p), 0) / n_eff), 4)}


def _wmedian(values: pd.Series, weights: pd.Series) -> float:
    order = np.argsort(values.to_numpy())
    v, w = values.to_numpy()[order], weights.to_numpy(float)[order]
    cum = np.cumsum(w)
    return float(v[np.searchsorted(cum, cum[-1] / 2.0)])


def _wmed_cell(df: pd.DataFrame, series: pd.Series) -> dict:
    ok = series.notna() & df[WEIGHT].notna() & (df[WEIGHT] > 0)
    n = int(ok.sum())
    if n < MIN_N:
        return {"n": n, "value": None}
    return {"n": n, "value": round(_wmedian(series[ok], df.loc[ok, WEIGHT]), 2)}


def derive(df: pd.DataFrame) -> pd.DataFrame:
    d = df.copy()
    d["age"] = (SURVEY_YEAR - d["b5"]).where((d["b5"] > 1900) & (d["b5"] <= SURVEY_YEAR))
    d["emp"] = d["l1"].where(d["l1"] >= 0)
    d["sales"] = d["d2"].where(d["d2"] > 0)
    d["labour"] = d["n2a"].where(d["n2a"] > 0)
    d["sales_per_emp"] = (d["sales"] / d["emp"]).where(d["emp"] > 0)
    ratio = d["labour"] / d["sales"]
    d["labour_share"] = ratio.where(ratio <= 1.0)   # labour cost above sales is treated as invalid
    d["size_band"] = pd.cut(d["emp"], [-0.5, 19.5, 99.5, 1e9],
                            labels=["1-19", "20-99", "100+"])
    d["sector"] = d["a4a"].map(SECTORS)
    return d


def cell_stats(d: pd.DataFrame) -> dict:
    out = {"firms": int(len(d))}
    for name, (col, pred, valid) in SHARES.items():
        out[name] = _wshare(d, col, pred, valid)
    for name, col in [("median_firm_age_years", "age"), ("median_permanent_employees", "emp"),
                      ("median_annual_sales_zar", "sales"),
                      ("median_sales_per_employee_zar", "sales_per_emp"),
                      ("median_labour_cost_share_of_sales", "labour_share")]:
        out[name] = _wmed_cell(d, d[col])
    return out


def build(df: pd.DataFrame) -> dict:
    d = derive(df)
    return {
        "source": {
            "name": "Enterprise Surveys, The World Bank Group",   # citation wording required by the data protocol
            "survey": "South Africa 2020",
            "publisher": "The World Bank Group",
            "fieldwork": "December 2019 - February 2021 (about 94% of interviews after the COVID-19 outbreak)",
            "firms": int(len(d)),
            "coverage": "Formal non-agricultural firms with 5+ employees in Eastern Cape, Gauteng, "
                        "KwaZulu-Natal and Western Cape",
            "weight_variable": WEIGHT,
            "licence_verified": False,
            "permitted_use": "research only until the World Bank gives written permission for product use",
        },
        "method": {
            "min_n_per_cell": MIN_N,
            "margin_95": "approximate, Kish effective n from weights; ignores stratification",
            "dropped": "don't-know / not-applicable codes; invalid sales, start year; labour cost above sales",
            "sector_basis": "sampling stratum (a4a), consistent with how the weights were built",
            "size_basis": "permanent full-time employees (l1), not the sampling size stratum",
        },
        "caveats": [
            "Firms are larger and older than typical SMEs: not representative of micro or informal businesses.",
            "Provinces outside the four surveyed are not covered.",
            "2020 is an abnormal year; do not read these as long-run norms.",
            "Only 63 firms report a loan; loan-approval and collateral rates are not published (too few).",
        ],
        "overall": cell_stats(d),
        "by_size_band": {str(k): cell_stats(g) for k, g in d.groupby("size_band", observed=True)},
        "by_sector": {str(k): cell_stats(g) for k, g in d.groupby("sector")},
    }


if __name__ == "__main__":
    import pyreadstat

    if len(sys.argv) != 2:
        sys.exit(__doc__)
    frame, _ = pyreadstat.read_dta(sys.argv[1])
    result = build(frame)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(result, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(f"wrote {OUT} ({result['source']['firms']} firms)")
