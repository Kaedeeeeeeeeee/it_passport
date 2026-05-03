#!/usr/bin/env python3
"""Fix choices that contain raw markdown-table pipe contamination.

Mistral OCR sometimes laid out 4 multiple-choice options as a 2×2
markdown table (`| ア | text | イ | text |` row, separator, `| ウ |
text | エ | text |` row). When parse_one.py extracted choices it
copied the raw cell contents back, leaving:

    ア: '| コンパイラ |'
    イ: '| デバイスドライバ | | --- | --- | --- | --- | |'

This script fixes 28 affected questions. Two patterns:

1. SIMPLE: a choice that's just `| <text> |` with no `---` is
   collapsed plain text — strip the wrapping pipes.

2. COMPLEX: a choice that's a real markdown table whose newlines
   were lost during OCR (database schemas, network ACLs, etc.).
   Re-insert newlines around the separator row(s) and between data
   rows so the Markdown renderer can build the table.

For complex cases we apply three regex passes:
  - end-of-header-row + start-of-separator
  - end-of-separator-row + start-of-next-data-row
  - subsequent data-row boundaries (` | | ` with space on both sides
    of the boundary `|`, after at least one non-space char)
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
DATASET_JSON = REPO_ROOT / "dataset" / "questions.json"
LOG_PATH = REPO_ROOT / "scripts" / "fix_choice_pipes_log.json"


def _data_cells_in_row(line: str) -> list[str]:
    """Strip outer pipes and return non-empty cell contents."""
    return [c.strip() for c in line.strip().strip("|").split("|") if c.strip()]


def _looks_like_separator(line: str) -> bool:
    cells = [c.strip() for c in line.strip().strip("|").split("|")]
    return len(cells) > 0 and all(c.startswith("-") and set(c) <= set("- ") for c in cells if c)


def _try_collapse_garbage_table(restored: str) -> str | None:
    """If the restored text is just a 1-cell data row plus a wider
    separator (and optional empty trailer), return the cell as plain
    text. Catches the ア/イ/ウ/エ-laid-out-as-2x2-markdown-table
    fragments that parse_one.py captured per-cell."""
    lines = [ln for ln in restored.split("\n") if ln.strip()]
    if not lines:
        return None
    first_data = _data_cells_in_row(lines[0])
    if len(first_data) != 1:
        return None
    # Subsequent lines should all be separators or empty residue
    for ln in lines[1:]:
        cells = _data_cells_in_row(ln)
        if cells and not all(c.startswith("-") for c in cells):
            return None  # has real data → keep the table
    return first_data[0]


def fix_choice(text: str) -> tuple[str, str]:
    """Return (fixed_text, action). action ∈ {kept, stripped, restored,
    collapsed_garbage}."""
    if not text or "|" not in text:
        return text, "kept"

    # Simple case: no markdown separator anywhere → it's collapsed plain
    # text wrapped in stray pipes.
    if "---" not in text:
        cleaned = text.strip().strip("|").strip()
        if "|" not in cleaned:
            return cleaned, "stripped"
        # Multi-cell single row (a comparison choice like
        # `| concept-A | concept-B |`). Join cells with a slash so the
        # rendered output reads naturally instead of leaving raw pipes.
        cells = [c.strip() for c in cleaned.split("|") if c.strip()]
        if len(cells) >= 2:
            return " / ".join(cells), "joined_cells"
        return text, "kept"

    # Complex case: contains a markdown separator. Restore newlines.
    fixed = text
    fixed = re.sub(r"\|\s*\|\s*(---\s*\|)", r"|\n| \1", fixed)
    fixed = re.sub(r"(---\s*\|)\s*\|\s*", r"\1\n| ", fixed)
    fixed = re.sub(r"(\S)\s*\|\s+\|\s+", r"\1 |\n| ", fixed)

    # If after restoration the "table" turns out to be a single-cell
    # data row plus a wider separator (parse_one.py per-cell capture
    # of a 2×2 choice layout), collapse to the bare cell text.
    collapsed = _try_collapse_garbage_table(fixed)
    if collapsed is not None:
        return collapsed, "collapsed_garbage"

    return fixed, "restored"


def main() -> int:
    questions = json.loads(DATASET_JSON.read_text("utf-8"))
    log = []
    for q in questions:
        choices = q.get("choices") or {}
        any_changed = False
        for letter, raw in list(choices.items()):
            fixed, action = fix_choice(raw or "")
            if fixed != raw:
                choices[letter] = fixed
                any_changed = True
        if any_changed:
            q["choices"] = choices
            log.append({
                "id": q["id"],
                "choice_format": q.get("choice_format"),
                "fixed_choices": choices,
            })
    DATASET_JSON.write_text(
        json.dumps(questions, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    LOG_PATH.write_text(json.dumps(log, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"fixed choices on {len(log)} questions")
    print(f"log → {LOG_PATH.relative_to(REPO_ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
