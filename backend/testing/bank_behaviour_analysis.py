"""
HISTORICAL (describes the pre-v3 engine; run it on a checkout before PR "Fix gaps 3 and 6" to reproduce).
Analysis only: what would the options for GAP 3 (poor bank behaviour vs no statement) and GAP 6
(overdrafts beyond 2) change across the gold scenarios? Reads the engine, changes nothing.
Run: python testing/bank_behaviour_analysis.py   (prints markdown)

The Compliance Documents factor is re-derived here from the same inputs and checked against the
engine for every scenario before any variant is computed, so the variants start from the engine's
own numbers. Option scores are derived by changing only that factor's points.
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

from core.assessment_engine import assess, determine_decision  # noqa: E402
from core.scoring import COMPLIANCE_POINTS, MAX_COMPLIANCE_POINTS, EvidencePackage, FounderSignalInput  # noqa: E402

HERE = Path(__file__).resolve().parent


def package(ev):
    f = ev.get("founder")
    return EvidencePackage(**{**{k: v for k, v in ev.items() if k != "founder"},
                              "founder": FounderSignalInput(**f) if f else None})


def compliance_points(inp, cmax, *, cap=2, statement_credit=None):
    """Mirror of the engine's rule. statement_credit: None = as engine; else fraction of the bank
    statement's base credit earned when behaviour is poor."""
    scale = cmax / MAX_COMPLIANCE_POINTS
    pts = 0.0
    for doc, base in COMPLIANCE_POINTS.items():
        st = inp.verifications.get(doc)
        if st == "approved":
            pts += round(base * scale, 1)
        elif st != "rejected":
            pts += round(base * scale * 0.5, 1)
    bonus = 0.0
    parsed = inp.verifications.get("bank_statement") == "approved" and inp.months_analysed is not None
    if parsed:
        if inp.months_analysed >= 6:
            bonus += 2 * scale
        elif inp.months_analysed >= 3:
            bonus += 1 * scale
        if inp.income_regularity is not None:
            bonus += 2 * scale if inp.income_regularity >= 0.8 else (1 * scale if inp.income_regularity >= 0.6 else 0)
        if inp.overdraft_count:
            bonus -= min(inp.overdraft_count, cap) * scale
        if statement_credit is not None and is_poor(inp):
            base = COMPLIANCE_POINTS["bank_statement"] * scale
            pts += round(base * statement_credit, 1) - round(base, 1)
    return round(min(pts + bonus, cmax), 1)


def is_poor(inp):
    return (inp.overdraft_count or 0) >= 3 or (inp.income_regularity is not None and inp.income_regularity < 0.4)


def main():
    scenarios = json.loads((HERE / "gold_dataset.json").read_text())
    variants = {
        "current": dict(),
        "G6: overdraft cap 4": dict(cap=4),
        "G6: overdraft cap 6": dict(cap=6),
        "G3-B: poor statement = same as missing (half base credit)": dict(statement_credit=0.5),
        "G3-A: poor statement = below missing (no base credit)": dict(statement_credit=0.0),
        "G3-B + G6 cap 4": dict(statement_credit=0.5, cap=4),
    }
    rows = {k: dict(changed=0, decision_changed=0, max_drop=0.0, details=[]) for k in variants}
    mismatches = 0
    bank_cases = poor_cases = 0
    for sc in scenarios:
        if not sc.get("is_valid_evidence", True):
            continue   # deliberately invalid inputs are rejected by the engine
        inp = package(sc["evidence"])
        res = assess(inp)
        meta = res.breakdown["_assessment"]
        comp = res.breakdown.get("Compliance Documents", {})
        if not comp.get("applicable", True):
            continue
        cmax, rawmax = comp["max"], meta["raw_max"]
        cur = compliance_points(inp, cmax)
        if abs(cur - comp["contribution"]) > 0.051:
            mismatches += 1
            continue
        if inp.verifications.get("bank_statement") == "approved" and inp.months_analysed is not None:
            bank_cases += 1
            poor_cases += is_poor(inp)
        for name, kw in variants.items():
            new = compliance_points(inp, cmax, **kw)
            score = round(min(max((meta["raw_score"] - cur + new) / rawmax * 100, 0), 100), 1)
            if abs(score - res.score) >= 0.05:
                rows[name]["changed"] += 1
                rows[name]["max_drop"] = min(rows[name]["max_drop"], round(score - res.score, 1))
                if determine_decision(score) != res.decision:
                    rows[name]["decision_changed"] += 1
                    rows[name]["details"].append(f"{sc['id']}: {res.decision} -> {determine_decision(score)}")
    valid = sum(1 for s in scenarios if s.get("is_valid_evidence", True))
    print(f"Scenarios: {len(scenarios)} ({valid} valid); with an approved, parsed bank statement: {bank_cases}; "
          f"of those with poor behaviour (3+ overdrafts or regularity < 0.4): {poor_cases}")
    print(f"Self-check: Compliance Documents re-derivation mismatched the engine in {mismatches} scenarios "
          f"(excluded)\n")
    print("| Option | Scenarios whose score changes | Decisions that change | Largest score drop |")
    print("|---|---|---|---|")
    for name, r in rows.items():
        print(f"| {name} | {r['changed']} | {r['decision_changed']} | {r['max_drop']} |")
    for name, r in rows.items():
        if r["details"]:
            print(f"\n{name}: " + "; ".join(r["details"][:12]) + (" ..." if len(r["details"]) > 12 else ""))


if __name__ == "__main__":
    main()
