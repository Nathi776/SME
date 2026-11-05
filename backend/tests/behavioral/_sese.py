"""Shared builders for SESE-informed behavioural tests (see SESE_BENCHMARK.md)."""
from core.scoring import EvidencePackage, FounderSignalInput

FOUNDER = FounderSignalInput(years_industry_experience=3, highest_qualification="diploma",
                             prior_business_owner=False, trade_association_member=False,
                             reference_provided=True)


def pkg(**k) -> EvidencePackage:
    d = dict(revenue=100000.0, years_active=2, industry="Retail",
             total_invoices=10, paid_on_time=8, unpaid_invoices=2,
             verifications={"bank_statement": "approved"},
             overdraft_count=0, income_regularity=0.85, months_analysed=6,
             province="Gauteng", founder=FOUNDER)
    d.update(k)
    return EvidencePackage(**d)


NO_BANK = dict(overdraft_count=None, income_regularity=None, months_analysed=None)
NO_TRADING = dict(total_invoices=0, paid_on_time=0, unpaid_invoices=0, revenue=0.0, **NO_BANK)

# Proposed TEST bands (not Stats SA thresholds): lower edge, upper edge (None = open).
PROPOSED_BANDS = [(0, 10_000), (10_001, 25_000), (25_001, 50_000), (50_001, 100_000),
                  (100_001, 250_000), (250_001, 500_000), (500_001, None)]
TURNOVERS = [5_000, 10_000, 15_000, 25_000, 50_000, 75_000, 100_000, 250_000, 500_000]
# One fixture per stage: (label, years_active, total_invoices)
STAGES = [("startup", 1, 3), ("growth", 2, 10), ("established", 4, 10)]
