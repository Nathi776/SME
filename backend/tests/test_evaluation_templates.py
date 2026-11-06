"""Keeps the evaluation templates and the labelling guide consistent (docs only; no pipeline code)."""
import csv
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parents[2]
LABELS = ["CUSTOMER_SALE", "CUSTOMER_REFUND", "OWNER_CONTRIBUTION", "LOAN_RECEIPT", "INTERNAL_TRANSFER",
          "ASSET_DISPOSAL", "OTHER_NON_REVENUE", "UNCLASSIFIED", "REVIEW_REQUIRED"]


def header(name):
    with open(ROOT / "docs" / "evaluation" / name, newline="") as f:
        return next(csv.reader(f))


def test_transaction_template_header_matches_the_documented_columns():
    doc = (ROOT / "docs" / "BANK_STATEMENT_EVALUATION_SET.md").read_text()
    documented = re.search(r"## 2\. Transaction file columns\n`([^`]+)`", doc).group(1)
    assert header("transactions_template.csv") == [c.strip() for c in documented.split(",")]


def test_manifest_template_header_matches_the_documented_columns():
    doc = (ROOT / "docs" / "BANK_STATEMENT_EVALUATION_SET.md").read_text()
    documented = re.search(r"## 3\. Statement manifest columns\n`([^`]+)`", doc).group(1)
    assert header("statement_manifest_template.csv") == [c.strip() for c in documented.split(",")]


def test_templates_contain_no_data_rows():
    for name in ("transactions_template.csv", "statement_manifest_template.csv"):
        assert len((ROOT / "docs" / "evaluation" / name).read_text().strip().splitlines()) == 1


def test_guide_defines_every_label():
    guide = (ROOT / "docs" / "BANK_STATEMENT_LABELLING_GUIDE.md").read_text()
    for label in LABELS:
        assert f"`{label}`" in guide


def test_raw_evaluation_data_is_gitignored():
    assert "evaluation_data/" in (ROOT / ".gitignore").read_text()
