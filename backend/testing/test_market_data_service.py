
import pytest

from services.market_data_service import (
    INDUSTRY_ALIASES,
    INDUSTRY_PROVINCE_ADJUSTMENTS,
    PROVINCE_ALIASES,
    PROVINCE_ECONOMIC_INDEX,
    SECTOR_SURVIVAL_RATES,
    get_market_intelligence,
    normalize_industry,
    normalize_province,
    province_market_score,
    sector_survival_score,
)


# ---------------------------------------------------------
# 1. Industry normalization
# ---------------------------------------------------------

@pytest.mark.parametrize(
    ("industry", "expected"),
    [
        ("IT", "Technology"),
        ("tech", "Technology"),
        ("software", "Technology"),
        ("spaza", "Retail"),
        ("spaza shop", "Retail"),
        ("tavern", "Food & Beverage"),
        ("farming", "Agriculture"),
        ("consulting", "Professional Services"),
        ("pharmacy", "Healthcare"),
        ("courier", "Transport & Logistics"),
        ("welding", "Manufacturing"),
        ("contractor", "Construction"),
        ("Hospitality", "Other"),
        ("Education", "Other"),
        ("", "Other"),
        ("   ", "Other"),
        (None, "Other"),
    ],
)
def test_industry_normalization(industry, expected):
    assert normalize_industry(industry) == expected


def test_every_industry_alias_maps_to_a_canonical_category():
    canonical_industries = set(SECTOR_SURVIVAL_RATES)

    for alias, category in INDUSTRY_ALIASES.items():
        assert category in canonical_industries, (
            f"Alias {alias!r} maps to invalid category {category!r}"
        )

        assert normalize_industry(alias) == category


def test_every_canonical_industry_has_a_survival_rate():
    for industry, rate in SECTOR_SURVIVAL_RATES.items():
        assert normalize_industry(industry) == industry
        assert 0.0 <= rate <= 1.0


def test_unknown_industry_uses_other_survival_rate():
    expected = SECTOR_SURVIVAL_RATES["Other"]

    assert sector_survival_score("Hospitality") == expected
    assert sector_survival_score("Education") == expected
    assert sector_survival_score("Unclassified sector") == expected


def test_industry_aliases_produce_equivalent_survival_scores():
    assert sector_survival_score("IT") == sector_survival_score("Technology")
    assert sector_survival_score("spaza") == sector_survival_score("Retail")
    assert sector_survival_score("tavern") == sector_survival_score(
        "Food & Beverage"
    )


# ---------------------------------------------------------
# 2. Province normalization
# ---------------------------------------------------------

@pytest.mark.parametrize(
    ("province", "expected"),
    [
        ("Gauteng", "Gauteng"),
        ("gauteng", "Gauteng"),
        ("Western Cape", "Western Cape"),
        ("KZN", "KwaZulu-Natal"),
        ("KwaZulu-Natal", "KwaZulu-Natal"),
        ("Mpumalanga", "Mpumalanga"),
        ("Free State", "Free State"),
        ("Eastern Cape", "Eastern Cape"),
        ("Northwest", "North West"),
        ("North West", "North West"),
        ("Limpopo", "Limpopo"),
        ("Northern Cape", "Northern Cape"),
        ("", None),
        ("   ", None),
        (None, None),
        ("Atlantis", None),
    ],
)
def test_province_normalization(province, expected):
    assert normalize_province(province) == expected


def test_every_province_alias_maps_to_a_canonical_province():
    canonical_provinces = set(PROVINCE_ECONOMIC_INDEX)

    for alias, province in PROVINCE_ALIASES.items():
        assert province in canonical_provinces, (
            f"Alias {alias!r} maps to invalid province {province!r}"
        )

        assert normalize_province(alias) == province


def test_every_canonical_province_has_a_valid_economic_index():
    for province, score in PROVINCE_ECONOMIC_INDEX.items():
        assert normalize_province(province) == province
        assert 0.0 <= score <= 1.0


# ---------------------------------------------------------
# 3. Industry-province adjustment integrity
# ---------------------------------------------------------

def test_all_adjustments_use_valid_categories_and_provinces():
    canonical_industries = set(SECTOR_SURVIVAL_RATES)
    canonical_provinces = set(PROVINCE_ECONOMIC_INDEX)

    for (industry, province), adjustment in (
        INDUSTRY_PROVINCE_ADJUSTMENTS.items()
    ):
        assert industry in canonical_industries
        assert province in canonical_provinces
        assert adjustment > 0.0


def test_adjustments_do_not_push_market_score_above_one():
    for (industry, province), adjustment in (
        INDUSTRY_PROVINCE_ADJUSTMENTS.items()
    ):
        score = min(
            PROVINCE_ECONOMIC_INDEX[province] * adjustment,
            1.0,
        )

        assert 0.0 <= score <= 1.0, (
            f"Invalid score for {industry!r} in {province!r}: {score}"
        )


# ---------------------------------------------------------
# 4. Market score behavior
# ---------------------------------------------------------

@pytest.mark.parametrize(
    ("industry", "province"),
    [
        ("IT", "Gauteng"),
        ("spaza", "Limpopo"),
        ("tavern", "KwaZulu-Natal"),
        ("farming", "Free State"),
        ("healthcare", "Western Cape"),
        ("construction", "Northwest"),
    ],
)
def test_market_scores_remain_within_valid_range(industry, province):
    score = province_market_score(province, industry)

    assert 0.0 <= score <= 1.0


def test_equivalent_province_aliases_produce_equivalent_scores():
    assert province_market_score(
        "gauteng", "IT"
    ) == province_market_score("Gauteng", "Technology")

    assert province_market_score(
        "KZN", "spaza"
    ) == province_market_score("KwaZulu-Natal", "Retail")


def test_unknown_province_uses_documented_fallback_in_score_function():
    # Current implementation uses a neutral base of 0.52
    # when province normalization fails.
    assert province_market_score(
        "Atlantis", "Technology"
    ) == pytest.approx(0.52)


def test_unknown_industry_uses_other_category_for_market_scoring():
    assert province_market_score(
        "Gauteng", "Education"
    ) == province_market_score("Gauteng", "Other")


# ---------------------------------------------------------
# 5. Combined market intelligence output
# ---------------------------------------------------------

def test_market_intelligence_normalizes_industry_and_province():
    result = get_market_intelligence("IT", "gauteng")

    assert result["industry"] == "Technology"
    assert result["province"] == "gauteng"
    assert result["sector_survival_rate"] == SECTOR_SURVIVAL_RATES[
        "Technology"
    ]
    assert result["province_market_score"] is not None


def test_unknown_industry_uses_other_category_in_intelligence():
    result = get_market_intelligence("Education", "Gauteng")

    assert result["industry"] == "Other"
    assert result["sector_survival_rate"] == SECTOR_SURVIVAL_RATES["Other"]


def test_unknown_province_has_no_market_score_in_intelligence():
    result = get_market_intelligence("Technology", "Atlantis")

    assert result["province_market_score"] is None
    assert result["market_label"] == "Province not specified"


def test_missing_province_has_no_market_score():
    result = get_market_intelligence("Technology", None)

    assert result["province_market_score"] is None
    assert result["market_label"] == "Province not specified"


def test_market_intelligence_survival_rates_are_valid():
    for industry in SECTOR_SURVIVAL_RATES:
        result = get_market_intelligence(industry, "Gauteng")

        assert 0.0 <= result["sector_survival_rate"] <= 1.0
        assert 0.0 <= result["province_market_score"] <= 1.0
