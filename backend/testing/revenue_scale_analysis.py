"""
Analysis only: compares the current revenue scale with the proposed SESE-informed test bands across
the four stages. Reads the engine; changes nothing. Run: python testing/revenue_scale_analysis.py
Prints markdown tables to stdout.
"""
import random
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from core.assessment_engine import assess  # noqa: E402
from core.scoring import EvidencePackage, FounderSignalInput  # noqa: E402

BANDS = [(0, 10_000, "Very low"), (10_001, 25_000, "Lower micro"), (25_001, 50_000, "Upper lower-micro"),
         (50_001, 100_000, "Higher micro"), (100_001, 250_000, "Growing micro"),
         (250_001, 500_000, "Upper micro"), (500_001, None, "Larger turnover")]
EDGES = [0, 10_000, 10_001, 25_000, 25_001, 50_000, 50_001, 100_000, 100_001, 250_000, 250_001,
         500_000, 500_001, 1_000_000]

STAGE_SHAPE = {  # years_active, invoices, verifications -> lands in the stage
    "Idea": dict(years_active=0, total_invoices=0, verifications={}),
    "Startup": dict(years_active=0, total_invoices=0, verifications={"cipc": "approved"}),
    "Growth": dict(years_active=1, total_invoices=5, verifications={"cipc": "approved"}),
    "Established": dict(years_active=4, total_invoices=25, verifications={"cipc": "approved"}),
}


def band(rev):
    for lo, hi, name in BANDS:
        if rev >= lo and (hi is None or rev <= hi):
            return name


def pkg(stage, revenue, rng=None):
    s = dict(STAGE_SHAPE[stage])
    inv = s["total_invoices"]
    paid = inv if rng is None else rng.randint(0, inv)
    founder = FounderSignalInput(
        years_industry_experience=rng.randint(0, 8) if rng else 3,
        highest_qualification=(rng.choice(["none", "matric", "diploma", "degree"]) if rng else "diploma"),
        prior_business_owner=bool(rng.getrandbits(1)) if rng else False,
        trade_association_member=bool(rng.getrandbits(1)) if rng else False,
        reference_provided=bool(rng.getrandbits(1)) if rng else True)
    vers = dict(s["verifications"])
    if rng and vers:
        vers["tax_clearance"] = rng.choice(["approved", "pending", "rejected"])
    return EvidencePackage(revenue=float(revenue), years_active=s["years_active"], industry="Technology",
                           total_invoices=inv, paid_on_time=paid, unpaid_invoices=inv - paid,
                           verifications=vers, province="Gauteng", founder=founder)


def main():
    print("## A. Points at band edges (revenue factor only)\n")
    for stage in STAGE_SHAPE:
        r0 = assess(pkg(stage, 0))
        f0 = r0.breakdown["Revenue Tier"]
        applicable = f0.get("applicable", True)
        total = sum(v.get("max", 0) for k, v in r0.breakdown.items()
                    if not k.startswith("_") and v.get("applicable", True))
        print(f"### {stage} (profile={r0.profile.name}, revenue factor applicable={applicable}, "
              f"revenue max={f0['max']}, applicable raw max={total:.0f}, "
              f"revenue share of stage score={(f0['max'] / total * 100 if applicable and total else 0):.1f}%)\n")
        if not applicable:
            print("Revenue is not scored in this stage; all bands contribute 0.\n")
            continue
        print("| Revenue | Proposed band | Current label | Rev pts | Δ pts vs previous edge | Overall score |")
        print("|---|---|---|---|---|---|")
        prev = None
        for e in EDGES:
            r = assess(pkg(stage, e))
            f = r.breakdown["Revenue Tier"]
            d = "" if prev is None else f"{f['contribution'] - prev:+.1f}"
            print(f"| R{e:,} | {band(e)} | {f['label'].split(' (')[0]} | {f['contribution']} | {d} | {r.score} |")
            prev = f["contribution"]
        print()

    print("## B. Can revenue alone change the decision? (random other inputs, 400 profiles per stage)\n")
    print("| Stage | Decision changes R0→R100k | R0→R500k | Mean score gain R0→R100k | R0→R500k |")
    print("|---|---|---|---|---|")
    for stage in STAGE_SHAPE:
        rng = random.Random(42)
        ch100 = ch500 = 0
        g100 = g500 = 0.0
        n = 400
        for _ in range(n):
            seed = rng.random()
            def run(rev):
                return assess(pkg(stage, rev, random.Random(seed)))
            a, b, c = run(0), run(100_000), run(500_000)
            ch100 += a.decision != b.decision
            ch500 += a.decision != c.decision
            g100 += b.score - a.score
            g500 += c.score - a.score
        print(f"| {stage} | {ch100 / n:.1%} | {ch500 / n:.1%} | {g100 / n:.2f} | {g500 / n:.2f} |")

    print("\n## C. Micro range resolution (Growth stage, points per R10,000)\n")
    print("| Range | Points gained | Points per R10k |")
    print("|---|---|---|")
    pts = {r: assess(pkg("Growth", r)).breakdown["Revenue Tier"]["contribution"]
           for r in (0, 10_000, 25_000, 50_000, 100_000, 250_000, 500_000)}
    ks = list(pts)
    for a, b in zip(ks, ks[1:]):
        print(f"| R{a:,}–R{b:,} | {pts[b] - pts[a]:.1f} | {(pts[b] - pts[a]) / ((b - a) / 10_000):.2f} |")


if __name__ == "__main__":
    main()
