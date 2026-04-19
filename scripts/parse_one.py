"""Parse OCR markdown for one exam year (qs + ans) into structured JSON.

Schema per question:
  {
    "id": "2025r07-1",
    "exam_code": "2025r07",
    "year": 2025,
    "era": "reiwa", "era_year": 7,
    "season": "annual",
    "number": 1,
    "category": "strategy|management|technology|null",
    "question": "...markdown incl. any inline tables/figures...",
    "choices": {"ア": "...", "イ": "...", "ウ": "...", "エ": "..."},
    "answer": "ウ",
    "figures": [
      {"path": "ocr_out/figures/2025r07_ip_qs/p009_img-0.jpeg",
       "type": "diagram", "description": "..."}
    ],
    "choice_format": "inline|vertical|table_single|table_combo",
    "source_pdf": "2025r07_ip_qs.pdf"
  }

Usage:
  python scripts/parse_one.py 2025r07
  python scripts/parse_one.py --all
"""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MD_DIR = ROOT / "ocr_out" / "markdown"
PDF_DIR = ROOT / "download"
JSON_DIR = ROOT / "ocr_out" / "json"
JSON_DIR.mkdir(parents=True, exist_ok=True)

CHOICE_LETTERS = ["ア", "イ", "ウ", "エ"]


# ---------- helpers ---------------------------------------------------------


@dataclass
class ExamCode:
    code: str
    year: int
    era: str
    era_year: int
    season: str  # annual|spring|autumn|october|special

    @property
    def qs_stem(self) -> str:
        return f"{self.code}_ip_qs"

    @property
    def ans_stem(self) -> str:
        return f"{self.code}_ip_ans"


def parse_exam_code(code: str) -> ExamCode:
    """Parse exam codes like '2025r07', '2019h31h', '2011h23tokubetsu'."""
    m = re.match(r"(\d{4})(r|h)(\d+)([a-z]*)$", code)
    if not m:
        raise ValueError(f"bad exam code: {code}")
    year, era_letter, era_year_str, suffix = m.groups()
    era = "reiwa" if era_letter == "r" else "heisei"
    era_year = int(era_year_str)
    if suffix == "":
        season = "annual"
    elif suffix == "a":
        season = "autumn"
    elif suffix == "h":
        season = "spring"
    elif suffix == "o":
        season = "october"
    elif suffix == "tokubetsu":
        season = "special"
    else:
        season = suffix
    return ExamCode(code, int(year), era, era_year, season)


def strip_page_markers(text: str) -> str:
    text = re.sub(r"<!--\s*page\s+\d+\s*-->", "", text)
    text = re.sub(r"(?m)^\s*-\s*\d+\s*-\s*$", "", text)
    return text


def clean_lines(text: str) -> str:
    """Strip footer page numbers but keep structure."""
    return strip_page_markers(text)


# ---------- answer parsing --------------------------------------------------


ANS_ROW_RE = re.compile(r"\|\s*問\s*(\d+)\s*\|\s*([^|]+?)\s*\|")
ANS_PDFTEXT_RE = re.compile(r"問\s*(\d+)\s+([ア-エ](?:\s*[／/]\s*[ア-エ])*)")


def parse_answers_from_pdf(pdf_path: Path) -> dict[int, str]:
    """Extract answers from the PDF text layer via pdftotext -layout.

    Most IPA answer PDFs carry a proper text layer; OCR often mis-merges the
    multi-column layout so pdftotext is the reliable primary source.
    """
    try:
        txt = subprocess.check_output(
            ["pdftotext", "-layout", str(pdf_path), "-"], text=True
        )
    except (FileNotFoundError, subprocess.CalledProcessError):
        return {}
    out: dict[int, str] = {}
    for m in ANS_PDFTEXT_RE.finditer(txt):
        num = int(m.group(1))
        letters = re.findall(r"[ア-エ]", m.group(2))
        if letters:
            out[num] = "/".join(letters) if len(letters) > 1 else letters[0]
    return out


def parse_answers(md: str) -> dict[int, str]:
    """Return {question_number: answer_string}.

    Answer can be a single letter (\"ウ\") or a multi-answer accepted form
    (\"ア/ウ\") — the exam body occasionally accepts multiple answers as
    correct.
    """
    out: dict[int, str] = {}
    for m in ANS_ROW_RE.finditer(md):
        num = int(m.group(1))
        raw = m.group(2)
        letters = re.findall(r"[ア-エ]", raw)
        if letters:
            out[num] = "/".join(letters) if len(letters) > 1 else letters[0]
    return out


# ---------- question parsing ------------------------------------------------


QKANA = "問開間図"  # OCR commonly mis-reads 問 as any of these
QKANA_PRIMARY = "問開"  # safe set; 間/図 are also legitimate figure/caption prefixes
Q_HEADER_PRIMARY_RE = re.compile(rf"(?m)^[{QKANA_PRIMARY}]\s*(\d+)\s+")
Q_HEADER_RE = re.compile(rf"(?m)^[{QKANA}]\s*(\d+)\s+")
CATEGORY_RE = re.compile(
    rf"[{QKANA}]\s*(\d+)\s*から\s*[{QKANA}]?\s*(\d+)\s*までは"
)
CATEGORY_NAME_RE = re.compile(
    rf"[{QKANA}]\s*\d+\s*から\s*[{QKANA}]?\s*\d+\s*までは[，、,]?\s*(ストラテジ|マネジメント|テクノロジ)"
)
CATEGORY_MAP = {
    "ストラテジ": "strategy",
    "マネジメント": "management",
    "テクノロジ": "technology",
}


def detect_category_ranges(md: str) -> list[tuple[int, int, str]]:
    ranges: list[tuple[int, int, str]] = []
    for m in CATEGORY_NAME_RE.finditer(md):
        # Re-match CATEGORY_RE to get the two numbers
        r = CATEGORY_RE.search(md, m.start())
        if not r:
            continue
        a, b = int(r.group(1)), int(r.group(2))
        name = CATEGORY_MAP[m.group(1)]
        ranges.append((a, b, name))
    return ranges


def category_for(num: int, ranges: list[tuple[int, int, str]]) -> str | None:
    for a, b, name in ranges:
        if a <= num <= b:
            return name
    # Old IT Passport exams (2009-2015) end the three explicit category blocks
    # before q100 and fill the tail with 中問 (multi-part integrated problems).
    # Anything beyond the max explicit range is integrated.
    if ranges:
        max_end = max(b for _, b, _ in ranges)
        if num > max_end:
            return "integrated"
    return None


def _is_category_sentence(md: str, pos: int) -> bool:
    peek = md[pos : pos + 40]
    return bool(re.search(
        rf"^[{QKANA}]\s*\d+\s*から\s*[{QKANA}]?\s*\d+\s*までは", peek
    ))


def split_questions(md: str) -> list[tuple[int, str]]:
    """Return list of (number, raw_block_text) sorted by number.

    Two-pass strategy:
      1. Primary: only 問/開 at line start + space. These are reliable.
      2. Secondary: 間/図 prefixes — OCR misreads of 問 — accepted only when
         the number is *not* already found in the primary pass (avoids false
         positives like legitimate `図 2 xxx` figure captions being treated as
         `問 2`).
    Skips headers that are category-range sentences ('問36から問55までは…').
    """
    primary = [
        m for m in Q_HEADER_PRIMARY_RE.finditer(md)
        if not _is_category_sentence(md, m.start())
    ]
    primary_nums = {int(m.group(1)) for m in primary}
    primary_positions = {m.start() for m in primary}
    all_matches = list(primary)
    for m in Q_HEADER_RE.finditer(md):
        num = int(m.group(1))
        if m.start() in primary_positions:
            continue
        if num in primary_nums:
            continue
        if _is_category_sentence(md, m.start()):
            continue
        all_matches.append(m)
    all_matches.sort(key=lambda m: m.start())

    blocks: list[tuple[int, str]] = []
    for i, m in enumerate(all_matches):
        num = int(m.group(1))
        start = m.start()
        end = all_matches[i + 1].start() if i + 1 < len(all_matches) else len(md)
        blocks.append((num, md[start:end]))
    return blocks


FIGURE_RE = re.compile(
    r"!\[(?P<alt>[^\]]+)\]\((?P<path>[^)]+)\)(?:\s*\n\s*>\s*_(?P<type>[^_]+)_:\s*(?P<desc>[^\n]+))?"
)


def extract_figures(block: str, qs_stem: str) -> list[dict]:
    figs: list[dict] = []
    for m in FIGURE_RE.finditer(block):
        rel_path = m.group("path")
        # Normalize: strip leading ../figures/ → ocr_out/figures/
        if rel_path.startswith("../figures/"):
            rel_path = "ocr_out/figures/" + rel_path[len("../figures/") :]
        figs.append(
            {
                "path": rel_path,
                "type": (m.group("type") or "").strip() or None,
                "description": (m.group("desc") or "").strip() or None,
            }
        )
    return figs


# --- choice extractors -------------------------------------------------------

# 4-row combination markdown table: first col is choice letter, rest are values.
# Header looks like: |   | a | b  |   then row: |  ア | NDA | SCM  |
COMBO_ROW_RE = re.compile(
    r"(?m)^\|\s*(?P<first>[^|\n]*?)\s*\|(?P<rest>(?:[^|\n]*\|)+)\s*$"
)
LETTER_ONLY_RE = re.compile(r"^[^ア-エ]*([ア-エ])[^ア-エ]*$")


def try_combo_table(block: str) -> dict[str, str] | None:
    """Parse a markdown combination table where column 1 is a choice letter.

    Accepts:
      - Rows in any order (ア/イ/ウ/エ need not appear sequentially).
      - Decorated cells like `←ア→`, `[ア]`, `ア)` (anything where the cell is
        a single choice letter after stripping non-letter characters).
      - Interspersed separator rows (`| --- | --- |`) between choice rows.
    """
    seen: dict[str, str] = {}
    for m in COMBO_ROW_RE.finditer(block):
        first = m.group("first")
        if not first or set(first) <= {"-", " "}:
            continue  # separator row
        letter_m = LETTER_ONLY_RE.match(first)
        if not letter_m:
            continue
        letter = letter_m.group(1)
        if letter in seen:
            continue
        cells = [c.strip() for c in m.group("rest").split("|") if c.strip() != ""]
        seen[letter] = " / ".join(cells) if cells else ""
    if len(seen) == 4 and set(seen.keys()) == set(CHOICE_LETTERS):
        return {letter: seen[letter] for letter in CHOICE_LETTERS}
    return None


# Single-row markdown table where each of 4 cells begins with a choice letter.
SINGLE_CHOICE_CELL_RE = re.compile(r"([ア-エ])\s+([^|]+?)(?=\s*$|\s*\|)")


def try_single_row_table(block: str) -> dict[str, str] | None:
    for line in block.splitlines():
        line = line.strip()
        if not line.startswith("|"):
            continue
        cells = [c.strip() for c in line.strip("|").split("|")]
        if len(cells) != 4:
            continue
        choices: dict[str, str] = {}
        for cell in cells:
            mm = re.match(r"^([ア-エ])\s+(.+)$", cell)
            if not mm:
                break
            choices[mm.group(1)] = mm.group(2).strip()
        if len(choices) == 4 and list(choices) == CHOICE_LETTERS:
            return choices
    return None


# Inline / vertical choices starting with letter, possibly multiple on one line.
CHOICE_TOKEN_RE = re.compile(r"(?<![ぁ-んァ-ヶー一-龠a-zA-Z0-9])([ア-エ])(?=[\s\u3000])")


def try_inline_choices(block: str) -> tuple[dict[str, str], str] | None:
    """Split text at each ア/イ/ウ/エ token; accept any order.

    Keeps only the first occurrence of each letter. Segments a choice's text
    from its letter up to the next letter's position (in document order).
    Returns (choices, format_hint) where format_hint is 'inline'|'vertical'.
    """
    tokens = list(CHOICE_TOKEN_RE.finditer(block))
    if len(tokens) < 4:
        return None
    first_pos: dict[str, int] = {}
    for tk in tokens:
        c = tk.group(1)
        first_pos.setdefault(c, tk.start())
    if set(first_pos) != set(CHOICE_LETTERS):
        return None

    # Order tokens by position to compute end boundary for each segment
    ordered = sorted(first_pos.items(), key=lambda kv: kv[1])
    positions = [p for _, p in ordered] + [len(block)]
    segs: dict[str, str] = {}
    for i, (letter, start) in enumerate(ordered):
        end = positions[i + 1]
        seg = block[start:end]
        seg = re.sub(rf"^\s*{letter}\s*[\u3000 ]?", "", seg, count=1)
        seg = re.split(r"\n\s*\n", seg, maxsplit=1)[0]
        seg = seg.strip().strip("`").strip()
        seg = re.sub(r"\s+", " ", seg).strip()
        segs[letter] = seg
    choices = {letter: segs[letter] for letter in CHOICE_LETTERS}

    span_start = min(first_pos.values())
    span_end = max(first_pos.values())
    newlines = block[span_start:span_end].count("\n")
    fmt = "vertical" if newlines >= 3 else "inline"
    return choices, fmt


def parse_choices(block: str, figures: list[dict]) -> tuple[dict[str, str] | None, str]:
    combo = try_combo_table(block)
    if combo:
        return combo, "table_combo"
    single = try_single_row_table(block)
    if single:
        return single, "table_single"
    inline = try_inline_choices(block)
    if inline:
        choices, fmt = inline
        return choices, fmt
    # Fallback: exactly four inline figures with no text choices → each figure
    # IS a choice (common on 'pick the correct diagram' questions).
    if len(figures) == 4:
        choices = {letter: f"figure:{figures[i]['path']}" for i, letter in enumerate(CHOICE_LETTERS)}
        return choices, "figure_choices"
    return None, "unknown"


def extract_question_text(block: str, num: int) -> str:
    # Strip the leading "問N " header (tolerate OCR variants 問/開/間/図)
    body = re.sub(rf"^[{QKANA}]\s*{num}\s*", "", block, count=1)
    # Truncate at the first ア that starts a choice
    m = re.search(r"(?<![ぁ-んァ-ヶー一-龠a-zA-Z0-9])ア(?=[\s\u3000])", body)
    if m:
        body = body[: m.start()]
    # Strip trailing combo-table header row/separator if that was the choice box
    # (covered by already slicing at first ア)
    # Compact whitespace but preserve paragraph breaks
    body = re.sub(r"\n{3,}", "\n\n", body).strip()
    return body


# ---------- main driver -----------------------------------------------------


def parse_year(code: str) -> tuple[list[dict], list[str]]:
    ec = parse_exam_code(code)
    qs_md = (MD_DIR / f"{ec.qs_stem}.md").read_text()
    ans_pdf = PDF_DIR / f"{ec.ans_stem}.pdf"
    ans_md_path = MD_DIR / f"{ec.ans_stem}.md"
    ans_md = ans_md_path.read_text() if ans_md_path.exists() else ""

    qs_md = clean_lines(qs_md)
    # Primary: parse answers from PDF text layer. Fall back to OCR markdown
    # for any question numbers the pdftotext extraction missed.
    answers = parse_answers_from_pdf(ans_pdf) if ans_pdf.exists() else {}
    for num, letter in parse_answers(ans_md).items():
        answers.setdefault(num, letter)
    categories = detect_category_ranges(qs_md)
    blocks = split_questions(qs_md)

    items: list[dict] = []
    warnings: list[str] = []
    seen: set[int] = set()

    for num, block in blocks:
        if num in seen:
            continue
        # Rough sanity: skip blocks that are appendix references like "問1から問35..."
        if CATEGORY_RE.search(block[: len(block) - len(block.lstrip())] + block[:120]):
            # category sentence got picked up; skip if no choices
            pass
        seen.add(num)
        figures = extract_figures(block, ec.qs_stem)
        choices, fmt = parse_choices(block, figures)
        question = extract_question_text(block, num)
        ans = answers.get(num)

        if choices is None:
            warnings.append(f"{code}-{num}: choices not parsed")
        elif len(choices) != 4:
            warnings.append(f"{code}-{num}: only {len(choices)} choices")
        if ans is None:
            warnings.append(f"{code}-{num}: answer missing")

        # Quality check: if parser produced 4 choices but they're all empty or
        # all identical (e.g. ER-diagram questions where the real choices live
        # inside a figure), flag as figure-dependent.
        if choices and len(choices) == 4:
            vals = [v.strip() for v in choices.values()]
            if all(v == "" for v in vals) or len(set(vals)) == 1:
                choices = None
                fmt = "see_figure"
        if choices is None and figures:
            fmt = "see_figure"
        needs_review = (
            choices is None
            or (choices and len(choices) != 4)
            or ans is None
        )
        items.append(
            {
                "id": f"{code}-{num}",
                "exam_code": code,
                "year": ec.year,
                "era": ec.era,
                "era_year": ec.era_year,
                "season": ec.season,
                "number": num,
                "category": category_for(num, categories),
                "question": question,
                "choices": choices or {},
                "answer": ans,
                "figures": figures,
                "choice_format": fmt,
                "source_pdf": f"{ec.qs_stem}.pdf",
                "needs_manual_review": needs_review,
            }
        )

    # Drop items that obviously aren't questions (no choices AND no answer)
    items = [it for it in items if it["choices"] or it["answer"]]
    # Verify count
    nums = sorted(it["number"] for it in items)
    if nums:
        if nums[0] != 1:
            warnings.append(f"{code}: first question is {nums[0]}")
        if nums[-1] != 100:
            warnings.append(f"{code}: last question is {nums[-1]}")
        missing = [n for n in range(1, nums[-1] + 1) if n not in nums]
        if missing:
            warnings.append(f"{code}: missing question numbers {missing}")
    return items, warnings


def write_year(code: str) -> None:
    items, warnings = parse_year(code)
    out = JSON_DIR / f"{code}.json"
    out.write_text(json.dumps(items, ensure_ascii=False, indent=2))
    print(f"{code}: {len(items)} items, {len(warnings)} warnings  -> {out}")
    for w in warnings[:20]:
        print(f"  ! {w}")
    if len(warnings) > 20:
        print(f"  ... {len(warnings) - 20} more")


def all_exam_codes() -> list[str]:
    codes = set()
    for p in MD_DIR.glob("*_ip_qs.md"):
        codes.add(p.stem.replace("_ip_qs", ""))
    return sorted(codes)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("code", nargs="?")
    ap.add_argument("--all", action="store_true")
    args = ap.parse_args()
    if args.all:
        for c in all_exam_codes():
            write_year(c)
    elif args.code:
        write_year(args.code)
    else:
        ap.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()
