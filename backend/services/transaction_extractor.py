"""
Extracts transactions from a text-layer PDF bank statement (date, description, debit, credit, balance).

STANDALONE: not connected to bank_statement_parser, scoring_service, the engine, the database or the
API. Built and tested against SYNTHETIC statements only. Layouts it understands: a header row with
"Date / Description / Debit / Credit / Balance", numbers right-aligned under their headers, dates like
"05 Jan 2026", "Opening Balance" and "Closing Balance" rows, optional wrapped description lines.
Scanned (image) PDFs, other layouts and other date formats are NOT supported and are reported as
failures, never guessed.

Rule: nothing is dropped silently. Any line that cannot be read becomes an ExtractionFailure, and a
statement is only `trustworthy` when there are no failures and the balances reconcile.
"""
from __future__ import annotations

import io
import re
from dataclasses import dataclass, field
from datetime import date, datetime
from decimal import Decimal, InvalidOperation

import pdfplumber

from services.deposit_classifier import ClassifiedTransaction, Transaction, classify_deposits
from services.revenue_normalisation import RevenueObservation, normalise_revenue

MONEY_RE = re.compile(r"^-?(?:\d{1,3}(?:,\d{3})+|\d+)\.\d{2}$")
DATE_RE = re.compile(r"^\d{2}$")
MONTHS = {m: i for i, m in enumerate(
    ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"], 1)}
PERIOD_RE = re.compile(r"Statement period:\s*(\d{2} \w{3} \d{4})\s+to\s+(\d{2} \w{3} \d{4})", re.I)
PAGE_RE = re.compile(r"^Page \d+ of \d+$")
X_TOLERANCE = 6.0   # points between a number's right edge and its column header's right edge
LINE_TOLERANCE = 2.5
DESC_ZONE_GAP = 60.0  # description words must end this far left of the Debit column's right edge


@dataclass(frozen=True)
class ExtractedRow:
    date: date
    description: str            # as printed (wrapped lines joined with one space)
    debit: Decimal | None
    credit: Decimal | None
    balance: Decimal
    page: int


@dataclass(frozen=True)
class ExtractionFailure:
    page: int
    text: str
    reason: str


@dataclass
class Reconciliation:
    opening_balance: Decimal | None
    closing_balance: Decimal | None
    total_credits: Decimal
    total_debits: Decimal
    expected_closing: Decimal | None
    difference: Decimal | None           # printed closing minus computed closing
    statement_reconciles: bool
    row_balance_mismatches: list[int]    # row indexes whose printed balance breaks the running chain


@dataclass
class ExtractionResult:
    period_start: date | None
    period_end: date | None
    rows: list[ExtractedRow] = field(default_factory=list)
    failures: list[ExtractionFailure] = field(default_factory=list)
    reconciliation: Reconciliation | None = None

    @property
    def trustworthy(self) -> bool:
        r = self.reconciliation
        return bool(not self.failures and r and r.statement_reconciles and not r.row_balance_mismatches
                    and self.period_start and self.period_end)

    def problems(self) -> list[str]:
        out = [f"page {f.page}: {f.reason}: {f.text!r}" for f in self.failures]
        r = self.reconciliation
        if r is None:
            out.append("no reconciliation possible")
        else:
            if not r.statement_reconciles:
                out.append(f"opening + credits - debits does not equal closing (difference {r.difference})")
            if r.row_balance_mismatches:
                out.append(f"running balance breaks at row(s) {r.row_balance_mismatches}")
        if not (self.period_start and self.period_end):
            out.append("statement period not found")
        return out


@dataclass
class ExtractionOutcome:
    result: ExtractionResult
    classified: list[ClassifiedTransaction]
    observation: RevenueObservation | None   # None when the extraction is not trustworthy
    blocked_reason: list[str]


def _money(text: str) -> Decimal:
    return Decimal(text.replace(",", ""))


def _parse_date(day: str, mon: str, year: str) -> date | None:
    try:
        return date(int(year), MONTHS[mon.title()], int(day))
    except (KeyError, ValueError):
        return None


def _parse_long_date(text: str) -> date | None:
    try:
        return datetime.strptime(text.title(), "%d %b %Y").date()
    except ValueError:
        return None


def _group_lines(words: list[dict]) -> list[list[dict]]:
    lines: list[list[dict]] = []
    for w in sorted(words, key=lambda w: (w["top"], w["x0"])):
        if lines and abs(lines[-1][0]["top"] - w["top"]) <= LINE_TOLERANCE:
            lines[-1].append(w)
        else:
            lines.append([w])
    return [sorted(l, key=lambda w: w["x0"]) for l in lines]


def extract_transactions(pdf_bytes: bytes) -> ExtractionResult:
    result = ExtractionResult(period_start=None, period_end=None)
    opening = closing = None
    try:
        pdf = pdfplumber.open(io.BytesIO(pdf_bytes))
    except Exception as exc:  # unreadable / not a PDF
        result.failures.append(ExtractionFailure(0, "", f"cannot open PDF: {type(exc).__name__}"))
        return result

    with pdf:
        for page_no, page in enumerate(pdf.pages, 1):
            words = page.extract_words(keep_blank_chars=False)
            if not words:
                result.failures.append(ExtractionFailure(page_no, "", "page has no text layer (scanned?)"))
                continue
            anchors = None  # header column anchors for THIS page
            prev_row_failed = False
            for line in _group_lines(words):
                text = " ".join(w["text"] for w in line)
                labels = [w["text"] for w in line]

                m = PERIOD_RE.search(text)
                if m:
                    result.period_start, result.period_end = _parse_long_date(m.group(1)), _parse_long_date(m.group(2))
                    continue
                if labels[:2] == ["Date", "Description"] and labels[-3:] == ["Debit", "Credit", "Balance"]:
                    anchors = {w["text"].lower(): w for w in line}
                    continue
                if PAGE_RE.match(text) or text.startswith(("SYNTHETIC", "Account holder")):
                    continue
                if anchors is None:
                    result.failures.append(ExtractionFailure(page_no, text, "content before column header"))
                    continue

                right = {k: anchors[k]["x1"] for k in ("debit", "credit", "balance")}
                desc_x0 = anchors["description"]["x0"] - 2

                def column_of(w):
                    if not MONEY_RE.match(w["text"]):
                        return None
                    for k, x1 in right.items():
                        if abs(w["x1"] - x1) <= X_TOLERANCE:
                            return k
                    return None

                if text.startswith(("Opening Balance", "Closing Balance")):
                    nums = [w for w in line if column_of(w) == "balance"]
                    if len(nums) != 1:
                        result.failures.append(ExtractionFailure(page_no, text, "unreadable balance row"))
                    elif text.startswith("Opening"):
                        opening = _money(nums[0]["text"])
                    else:
                        closing = _money(nums[0]["text"])
                    continue

                # transaction row: starts with "DD Mon YYYY"
                if len(line) >= 3 and DATE_RE.match(labels[0]) and labels[1].title() in MONTHS:
                    d = _parse_date(labels[0], labels[1], labels[2])
                    cols: dict[str, list[Decimal]] = {"debit": [], "credit": [], "balance": []}
                    desc_words, bad = [], []
                    for w in line[3:]:
                        col = column_of(w)
                        if col:
                            cols[col].append(_money(w["text"]))
                        elif w["x1"] > right["debit"] - DESC_ZONE_GAP:
                            bad.append(w["text"])   # in the amount area but not a valid, aligned amount
                        else:
                            desc_words.append(w["text"])
                    desc = " ".join(desc_words)
                    if d is None:
                        reason = "unparseable date"
                    elif bad:
                        reason = f"unreadable amount {bad}"
                    elif len(cols["balance"]) != 1:
                        reason = "missing or duplicate balance"
                    elif len(cols["debit"]) + len(cols["credit"]) != 1:
                        reason = "row must have exactly one debit or credit"
                    elif not desc:
                        reason = "empty description"
                    else:
                        reason = ""
                    if reason:
                        result.failures.append(ExtractionFailure(page_no, text, reason))
                        prev_row_failed = True
                        continue
                    prev_row_failed = False
                    result.rows.append(ExtractedRow(
                        d, desc, cols["debit"][0] if cols["debit"] else None,
                        cols["credit"][0] if cols["credit"] else None, cols["balance"][0], page_no))
                    continue

                # wrapped description line: only description-column words, no date, no amounts
                if all(w["x0"] >= desc_x0 and not MONEY_RE.match(w["text"]) for w in line) and result.rows \
                        and not prev_row_failed:
                    last = result.rows[-1]
                    result.rows[-1] = ExtractedRow(last.date, f"{last.description} {text}", last.debit,
                                                   last.credit, last.balance, last.page)
                    continue
                result.failures.append(ExtractionFailure(page_no, text, "unrecognised line"))

    result.reconciliation = _reconcile(result.rows, opening, closing)
    return result


def _reconcile(rows: list[ExtractedRow], opening: Decimal | None, closing: Decimal | None) -> Reconciliation:
    zero = Decimal("0")
    credits = sum((r.credit or zero for r in rows), zero)
    debits = sum((r.debit or zero for r in rows), zero)
    expected = opening + credits - debits if opening is not None else None
    diff = closing - expected if (closing is not None and expected is not None) else None
    mismatches, running = [], opening
    for i, r in enumerate(rows):
        if running is not None:
            running = running + (r.credit or zero) - (r.debit or zero)
            if running != r.balance:
                mismatches.append(i)
                running = r.balance  # resync so one bad row is not reported for every later row
        else:
            running = r.balance
    return Reconciliation(opening, closing, credits, debits, expected, diff,
                          statement_reconciles=diff == zero if diff is not None else False,
                          row_balance_mismatches=mismatches)


def to_transactions(result: ExtractionResult) -> list[Transaction]:
    """Credits positive, debits negative (what the deposit classifier expects)."""
    return [Transaction(r.date, r.description, r.credit if r.credit is not None else -(r.debit or Decimal("0")))
            for r in result.rows]


def extract_and_classify(pdf_bytes: bytes) -> ExtractionOutcome:
    result = extract_transactions(pdf_bytes)
    classified = classify_deposits(to_transactions(result))
    if not result.trustworthy:
        return ExtractionOutcome(result, classified, None, result.problems())
    return ExtractionOutcome(result, classified,
                             normalise_revenue(classified, result.period_start, result.period_end), [])
