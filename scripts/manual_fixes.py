"""Apply explicit overlay fixes for known-but-unparseable questions.

Only items where the original PDF unambiguously contains the choices but OCR
misread them (e.g. pseudocode font where ア was recognized as 'P'). Items whose
choices are rendered inside a figure are left for user inspection and are not
fixed here.
"""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
JSON_DIR = ROOT / "ocr_out" / "json"
VISION_DIR = ROOT / "ocr_out" / "vision_results"

# Hand-curated fixes that don't come from the vision pass.
HAND_FIXES: dict[str, dict] = {
    # Pseudocode question. OCR mis-read the inline choice letters as P/r/r/r
    # (the exam PDF uses a pseudocode font that looks like P for ア and r for
    # イ/ウ/エ). Values and answer confirmed against the IPA answer PDF.
    "2025r07-99": {
        "choices": {"ア": "1,000", "イ": "1,500", "ウ": "3,000", "エ": "5,500"},
        "choice_format": "inline",
    },
}


def load_vision_fixes() -> dict[str, dict]:
    out: dict[str, dict] = {}
    if not VISION_DIR.exists():
        return out
    for f in VISION_DIR.glob("*.json"):
        d = json.loads(f.read_text())
        out[d["id"]] = {
            "choices": d["choices"],
            "choice_format": d["choice_format"],
            "vision_confidence": d.get("confidence"),
            "vision_notes": d.get("notes"),
        }
    return out


def main() -> None:
    items = json.loads((JSON_DIR / "_all.json").read_text())
    fixes = {**load_vision_fixes(), **HAND_FIXES}
    changed = 0
    by_exam: dict[str, list[dict]] = {}

    for it in items:
        if it["id"] in fixes:
            patch = dict(fixes[it["id"]])
            it.update(patch)
            # If all four choices look valid, clear the review flag.
            ch = it.get("choices") or {}
            if len(ch) == 4 and all(isinstance(v, str) and v.strip() for v in ch.values()):
                it["needs_manual_review"] = False
            changed += 1
        by_exam.setdefault(it["exam_code"], []).append(it)

    (JSON_DIR / "_all.json").write_text(json.dumps(items, ensure_ascii=False, indent=2))
    for code, lst in by_exam.items():
        lst.sort(key=lambda x: x["number"])
        (JSON_DIR / f"{code}.json").write_text(json.dumps(lst, ensure_ascii=False, indent=2))

    print(f"applied {changed} fixes ({len(fixes)} rules)")


if __name__ == "__main__":
    main()
