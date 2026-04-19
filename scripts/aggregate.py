"""Aggregate per-year JSON files into one corpus + a validation report.

Outputs:
  ocr_out/json/_all.json       — flat array, all 2800 items
  ocr_out/json/_stats.json     — per-exam counts + global stats
  ocr_out/json/_review.json    — just the items with needs_manual_review=True
"""

from __future__ import annotations

import json
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
JSON_DIR = ROOT / "ocr_out" / "json"


def main() -> None:
    files = sorted(p for p in JSON_DIR.glob("*.json") if not p.name.startswith("_"))

    all_items: list[dict] = []
    per_exam_stats: list[dict] = []
    for p in files:
        items = json.loads(p.read_text())
        all_items.extend(items)
        fmts = Counter(it["choice_format"] for it in items)
        cats = Counter(it["category"] for it in items)
        review = sum(1 for it in items if it.get("needs_manual_review"))
        figs = sum(len(it["figures"]) for it in items)
        per_exam_stats.append(
            {
                "exam_code": p.stem,
                "count": len(items),
                "with_figures": sum(1 for it in items if it["figures"]),
                "figure_count": figs,
                "needs_review": review,
                "choice_formats": dict(fmts),
                "categories": dict(cats),
            }
        )

    total = len(all_items)
    review_items = [it for it in all_items if it.get("needs_manual_review")]
    formats = Counter(it["choice_format"] for it in all_items)
    cats = Counter(it["category"] for it in all_items)
    answer_types = Counter(
        "multi" if it.get("answer") and "/" in it["answer"] else "single"
        for it in all_items
        if it.get("answer")
    )

    stats = {
        "total_items": total,
        "total_exams": len(files),
        "total_figures": sum(len(it["figures"]) for it in all_items),
        "needs_review": len(review_items),
        "review_rate": round(len(review_items) / max(total, 1), 4),
        "choice_formats": dict(formats),
        "categories": dict(cats),
        "answer_types": dict(answer_types),
        "per_exam": per_exam_stats,
    }

    (JSON_DIR / "_all.json").write_text(json.dumps(all_items, ensure_ascii=False, indent=2))
    (JSON_DIR / "_stats.json").write_text(json.dumps(stats, ensure_ascii=False, indent=2))
    (JSON_DIR / "_review.json").write_text(
        json.dumps(
            [
                {
                    "id": it["id"],
                    "source_pdf": it["source_pdf"],
                    "choice_format": it["choice_format"],
                    "has_answer": it.get("answer") is not None,
                    "choice_count": len(it.get("choices") or {}),
                    "figure_count": len(it["figures"]),
                    "question_snippet": it["question"][:120],
                }
                for it in review_items
            ],
            ensure_ascii=False,
            indent=2,
        )
    )

    print(f"aggregated {total} items from {len(files)} exams")
    print(f"  needs_review: {len(review_items)} ({len(review_items)/total:.2%})")
    print(f"  total figures: {sum(len(it['figures']) for it in all_items)}")
    print(f"  choice_formats: {dict(formats)}")
    print(f"  categories: {dict(cats)}")
    print(f"  answer_types: {dict(answer_types)}")


if __name__ == "__main__":
    main()
