"""
Analysis only (GAP 4): what happens to scores if revenue that no approved bank statement supports
("self-reported") is given less weight? Reads the engine, changes nothing.
Run: python testing/declared_revenue_analysis.py   (prints markdown)

Revenue Tier points are re-derived from the engine's own formula and checked against the engine for
every scenario first. Variants change only that factor's points.
"""
import json
import sys
from pathlib import Path
from types import ModuleType

for name in ["database", "models.sme", "models.invoice", "models.verification", "models.founder_profile",
             "models.sme_outcome", "models.credit_score", "models.finance_request", "models.lender",
             "models.user", "sqlalchemy", "sqlalchemy.orm"]:
    sys.modules.setdefault(name, ModuleType(name))
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from core.assessment_engine import assess, determine_decision, revenue_evidence_source  # noqa: E402
from testing.bank_behaviour_analysis import package  # noqa: E402

HERE = Path(__file__).resolve().parent


def pts(revenue, rmax, ceiling=None, credit=1.0):
    r = min(revenue, ceiling) if ceiling is not None else revenue
    return round(min(r / 500_000, 1.0) * rmax * credit, 1)


def main():
    scenarios = json.loads((HERE / "gold_dataset.json").read_text())
    variants = {
        "self-reported revenue counts at 50%": dict(credit=0.5),
        "self-reported revenue capped at R100k": dict(ceiling=100_000),
        "self-reported revenue capped at R250k": dict(ceiling=250_000),
    }
    rows = {k: dict(changed=0, dec=0, drop=0.0, ids=[]) for k in variants}
    mism = scored = selfrep = high = 0
    for sc in scenarios:
        if not sc.get("is_valid_evidence", True):
            continue
        inp = package(sc["evidence"])
        res = assess(inp)
        rt = res.breakdown["Revenue Tier"]
        if not rt.get("applicable", True):
            continue
        scored += 1
        if abs(pts(inp.revenue, rt["max"]) - rt["contribution"]) > 0.051:
            mism += 1
            continue
        if revenue_evidence_source(inp) != "self-reported":
            continue
        selfrep += 1
        high += inp.revenue > 100_000
        meta = res.breakdown["_assessment"]
        for name, kw in variants.items():
            new = pts(inp.revenue, rt["max"], **kw)
            score = round(min(max((meta["raw_score"] - rt["contribution"] + new) / meta["raw_max"] * 100, 0), 100), 1)
            if abs(score - res.score) >= 0.05:
                r = rows[name]
                r["changed"] += 1
                r["drop"] = min(r["drop"], round(score - res.score, 1))
                if determine_decision(score) != res.decision:
                    r["dec"] += 1
                    r["ids"].append(f"{sc['id']} {res.decision}->{determine_decision(score)}")
    print(f"Valid scenarios where revenue is scored: {scored}; re-derivation mismatches: {mism}")
    print(f"Of those, revenue is self-reported (no approved statement basis): {selfrep}; above R100k: {high}\n")
    print("| Option | Scores that change | Decisions that change | Largest drop |")
    print("|---|---|---|---|")
    for n, r in rows.items():
        print(f"| {n} | {r['changed']} | {r['dec']} | {r['drop']} |")
    for n, r in rows.items():
        if r["ids"]:
            print(f"\n{n}: " + "; ".join(r["ids"][:10]) + (" ..." if len(r["ids"]) > 10 else ""))


if __name__ == "__main__":
    main()
