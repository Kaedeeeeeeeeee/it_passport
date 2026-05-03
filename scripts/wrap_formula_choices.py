#!/usr/bin/env python3
"""Wrap formula/code-like choice text in backticks so the Markdown
renderer treats them as inline code.

Multi-choice questions about spreadsheets, programming, and arithmetic
have choices like `B4 * (1 + B$1)` that contain `*` (multiplication)
and `$` (absolute cell reference). The current renderer pipes choice
text through the same Markdown component as question bodies, which
runs remark-emphasis (treats `*` as italic markers) and remark-math
(treats `$...$` as math). The result on screen is a half-italicized,
half-KaTeX-rendered formula that's both ugly and technically wrong.

Backticks bypass all of that: `` `B4 * (1 + B$1)` `` renders as a
monospace inline code span with no markdown processing inside, which
is exactly what spreadsheet formulas / pseudo-code need.

Detection (conservative — avoid wrapping prose):
  - text contains a cell reference (e.g. B4, B$4, AA12)
    AND
  - text contains a math operator (`*`, `=`, `<>`, `<=`, `>=`, `≦`, `≧`)
  OR
  - text contains a parenthesized-function pattern (IF(, MOD(, etc.)

Skip if:
  - already starts/ends with `` ` `` (already wrapped)
  - contains Japanese sentence punctuation (、 。) — natural language,
    not a formula
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
DATASET_JSON = REPO_ROOT / "dataset" / "questions.json"
LOG_PATH = REPO_ROOT / "scripts" / "wrap_formula_choices_log.json"

CELL_REF_RE = re.compile(r"\b[A-Z]+\$?\d+\b")
OP_RE = re.compile(r"[*=]|<>|<=|>=|≦|≧|≠")
FUNC_RE = re.compile(r"\b[A-Z]{2,}\(")
JP_PUNCT_RE = re.compile(r"[、。「」]")


def looks_like_formula(text: str) -> bool:
    if not text:
        return False
    s = text.strip()
    if len(s) < 3:
        return False
    if s.startswith("`") and s.endswith("`"):
        return False
    if "figure:" in s:  # already a figure reference
        return False
    if JP_PUNCT_RE.search(s):
        return False
    has_cell = bool(CELL_REF_RE.search(s))
    has_op = bool(OP_RE.search(s))
    has_func = bool(FUNC_RE.search(s))
    return (has_cell and has_op) or has_func


def main() -> int:
    questions = json.loads(DATASET_JSON.read_text("utf-8"))
    log = []
    for q in questions:
        choices = q.get("choices") or {}
        any_changed = False
        for letter, raw in list(choices.items()):
            if looks_like_formula(raw):
                # Use a single backtick — sufficient for inline code as
                # long as the text itself doesn't contain a backtick.
                # If it does, fall back to double-backtick fence.
                if "`" in raw:
                    fence = "``"
                    wrapped = f"{fence} {raw} {fence}"
                else:
                    wrapped = f"`{raw}`"
                choices[letter] = wrapped
                any_changed = True
        if any_changed:
            q["choices"] = choices
            log.append({
                "id": q["id"],
                "wrapped_choices": choices,
            })

    DATASET_JSON.write_text(
        json.dumps(questions, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    LOG_PATH.write_text(json.dumps(log, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"wrapped formula-like choices on {len(log)} questions")
    print(f"log → {LOG_PATH.relative_to(REPO_ROOT)}")
    if log:
        print("\nfirst 5 examples:")
        for entry in log[:5]:
            print(f"  {entry['id']}: {list(entry['wrapped_choices'].values())[0][:60]}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
