
from services.market_data_service import (
    INDUSTRY_ALIASES,
    INDUSTRY_PROVINCE_ADJUSTMENTS,
    PROVINCE_ECONOMIC_INDEX,
    PROVINCE_ALIASES,
    SECTOR_SURVIVAL_RATES,
    normalize_industry,
    normalize_province,
)


def main():
    canonical_industries = set(SECTOR_SURVIVAL_RATES)
    canonical_provinces = set(PROVINCE_ECONOMIC_INDEX)

    invalid_aliases = {
        alias: category
        for alias, category in INDUSTRY_ALIASES.items()
        if category not in canonical_industries
    }

    invalid_province_aliases = {
        alias: province
        for alias, province in PROVINCE_ALIASES.items()
        if province not in canonical_provinces
    }

    invalid_adjustments = {
        (industry, province): value
        for (industry, province), value
        in INDUSTRY_PROVINCE_ADJUSTMENTS.items()
        if industry not in canonical_industries
        or province not in canonical_provinces
    }

    invalid_survival_rates = {
        industry: value
        for industry, value in SECTOR_SURVIVAL_RATES.items()
        if not 0.0 <= value <= 1.0
    }

    invalid_province_scores = {
        province: value
        for province, value in PROVINCE_ECONOMIC_INDEX.items()
        if not 0.0 <= value <= 1.0
    }

    print("Canonical industries:", len(canonical_industries))
    print("Provinces:", len(canonical_provinces))
    print("Industry aliases:", len(INDUSTRY_ALIASES))
    print("Province aliases:", len(PROVINCE_ALIASES))
    print("Industry-province adjustments:", len(INDUSTRY_PROVINCE_ADJUSTMENTS))

    print("\nInvalid industry aliases:", invalid_aliases)
    print("Invalid province aliases:", invalid_province_aliases)
    print("Invalid adjustments:", invalid_adjustments)
    print("Invalid survival rates:", invalid_survival_rates)
    print("Invalid province scores:", invalid_province_scores)

    print("\nNormalization examples:")
    for industry in ["IT", "spaza", "tavern", "Hospitality", "Education"]:
        normalized = normalize_industry(industry)
        print(
            f"{industry!r} -> {normalized!r}; "
            f"survival category recognized: {normalized in canonical_industries}"
        )

    for province in ["gauteng", "KZN", "Northwest", "Atlantis"]:
        normalized = normalize_province(province)
        print(
            f"{province!r} -> {normalized!r}; "
            f"province recognized: {normalized in canonical_provinces}"
        )


if __name__ == "__main__":
    main()
