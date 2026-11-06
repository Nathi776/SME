"""
Prints the technical baseline (weights, thresholds, rule versions, constants) as markdown, read from
the live code so the record cannot drift from it. Changes nothing.
Run: DATABASE_URL=sqlite:///./ci.db python testing/generate_baseline.py
"""
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from core.assessment_engine import STRATEGIES, VIABILITY_FACTORS, StrategyFactory  # noqa: E402
from services import deposit_classifier as dc, revenue_normalisation as rn  # noqa: E402
from services.market_data_service import MARKET_DATA_VERSION  # noqa: E402


def git(*a):
    return subprocess.run(["git", *a], capture_output=True, text=True,
                          cwd=Path(__file__).resolve().parent).stdout.strip()


def main():
    print(f"commit: {git('rev-parse', 'HEAD')}  ({git('log', '-1', '--format=%cd', '--date=short')})")
    print(f"engine strategy version: {StrategyFactory.get_strategy(next(iter(STRATEGIES)))[1]}")
    print(f"market data version: {MARKET_DATA_VERSION}")
    print(f"deposit classifier: {dc.CLASSIFIER_VERSION} (min sale confidence {dc.MIN_SALE_CONFIDENCE}, "
          f"low-confidence below {dc.LOW_CONFIDENCE_BELOW}, strong sale {dc.STRONG_SALE_CONFIDENCE})")
    print(f"normalisation: min months to annualise {rn.MIN_MONTHS_TO_ANNUALISE}, max unresolved share "
          f"{rn.MAX_UNRESOLVED_SHARE}, 12-month tolerance {rn.TWELVE_MONTH_TOLERANCE}")
    print("\n## Stage weights (max points)\n")
    fields = ["revenue_max", "timeliness_max", "age_max", "unpaid_max", "industry_max", "market_max",
              "compliance_max", "intent_max", "founder_max"]
    print("| Stage | " + " | ".join(f.replace("_max", "") for f in fields) + " | raw_max | context-only |")
    print("|---|" + "---|" * (len(fields) + 2))
    for prof, st in STRATEGIES.items():
        scored = st.raw_max - st.industry_max - st.market_max
        print(f"| {prof.value} | " + " | ".join(str(getattr(st, f)) for f in fields) +
              f" | {st.raw_max:g} | industry+market = {st.industry_max + st.market_max:g}; scored max {scored:g} |")
    print(f"\nViability factors: {', '.join(VIABILITY_FACTORS)}")
    print("\n## Deposit rules\n")
    for rid, cat, conf, pat in dc._RULES:
        print(f"- `{rid}` -> {cat.value} ({conf}): `{pat.pattern}`")
    print(f"- weak owner word (review only): `{dc._WEAK_OWNER.pattern}`")


if __name__ == "__main__":
    main()
