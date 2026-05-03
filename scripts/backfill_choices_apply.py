#!/usr/bin/env python3
"""Apply figure_choices backfill.

Inputs:
  ocr_out/backfill_choices_manifest.json
  ocr_out/backfill_choices_results.json (per-letter bboxes from subagent)
  ocr_out/backfill_choices_text_only.json (questions mis-tagged as figure_choices)

Three actions:
  1. For each manifest entry whose result has all 4 choice bboxes:
     - Crop ア/イ/ウ/エ from the page PNG
     - Save as dataset/figures/<exam>/p<NNN>_choice_<letter>.jpeg
     - Set choices[letter] = "figure:figures/<exam>/p<NNN>_choice_<letter>.jpeg"
     - Replace the figures array with the 4 new entries
  2. For each text-only entry: change choice_format from "figure_choices"
     to "vertical" so the renderer treats them as plain text choices.
  3. Existing-bug fix: any question whose choices reference
     "figure:ocr_out/figures/..." paths gets rewritten to
     "figure:figures/..." (the actual served path).
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

from PIL import Image

REPO_ROOT = Path(__file__).resolve().parent.parent
MANIFEST_PATH = REPO_ROOT / "ocr_out" / "backfill_choices_manifest.json"
RESULTS_PATH = REPO_ROOT / "ocr_out" / "backfill_choices_results.json"
TEXT_ONLY_PATH = REPO_ROOT / "ocr_out" / "backfill_choices_text_only.json"
DATASET_JSON = REPO_ROOT / "dataset" / "questions.json"
DATASET_FIGURES_DIR = REPO_ROOT / "dataset" / "figures"
LOG_PATH = REPO_ROOT / "scripts" / "backfill_choices_log.json"

LETTERS = ["ア", "イ", "ウ", "エ"]


def clamp(v: float, lo: float = 0.0, hi: float = 1.0) -> float:
    return max(lo, min(hi, v))


def crop_to_jpeg(page_png: Path, bbox: list[float], out_path: Path) -> None:
    with Image.open(page_png) as im:
        W, H = im.size
        x0 = int(clamp(bbox[0]) * W)
        y0 = int(clamp(bbox[1]) * H)
        x1 = int(clamp(bbox[2]) * W)
        y1 = int(clamp(bbox[3]) * H)
        if x1 - x0 < 20 or y1 - y0 < 20:
            raise ValueError(f"crop too small: {(x0, y0, x1, y1)}")
        out_path.parent.mkdir(parents=True, exist_ok=True)
        im.crop((x0, y0, x1, y1)).convert("RGB").save(out_path, format="JPEG", quality=88)


def main() -> int:
    manifest = json.loads(MANIFEST_PATH.read_text("utf-8"))
    manifest_by_qid = {e["question_id"]: e for e in manifest}
    results = {r["question_id"]: r for r in json.loads(RESULTS_PATH.read_text("utf-8"))}
    text_only = json.loads(TEXT_ONLY_PATH.read_text("utf-8"))

    questions = json.loads(DATASET_JSON.read_text("utf-8"))
    by_id = {q["id"]: q for q in questions}

    log: list[dict] = []

    # 1. Apply choice backfills
    applied = 0
    skipped = 0
    failures: list[tuple[str, str]] = []
    for entry in manifest:
        qid = entry["question_id"]
        result = results.get(qid)
        if not result:
            log.append({"question_id": qid, "status": "no_result"})
            continue
        bboxes = result.get("choice_bboxes") or {}
        if not result.get("all_choices_found") or not all(L in bboxes for L in LETTERS):
            log.append({
                "question_id": qid,
                "status": "incomplete_choices",
                "letters_found": list(bboxes.keys()),
                "notes": result.get("notes") or "",
            })
            skipped += 1
            continue
        page_png = REPO_ROOT / entry["image_path"]
        if not page_png.exists():
            failures.append((qid, f"page png missing: {page_png}"))
            continue
        exam_dir = entry["exam_dir"]
        page_idx = entry["page_num_0idx"]
        page_one = page_idx + 1

        new_figures = []
        new_choices = {}
        try:
            for L in LETTERS:
                bbox = bboxes[L]
                rel_path = f"figures/{exam_dir}/p{page_one:03d}_choice_{L}.jpeg"
                out_path = DATASET_FIGURES_DIR / exam_dir / f"p{page_one:03d}_choice_{L}.jpeg"
                crop_to_jpeg(page_png, bbox, out_path)
                new_figures.append({
                    "path": rel_path,
                    "type": result.get("type") or "diagram",
                    "description": (result.get("description_template") or "") + f" ({L})",
                })
                new_choices[L] = f"figure:{rel_path}"
        except Exception as e:
            failures.append((qid, f"crop error: {e}"))
            continue

        q = by_id[qid]
        # Preserve any non-choice figures already on the question (the
        # question-stem [表記法] notation diagram, etc.) and append the
        # 4 new choice figures.
        existing_non_choice = [
            f for f in (q.get("figures") or [])
            if "_choice_" not in (f.get("path") or "")
        ]
        q["figures"] = existing_non_choice + new_figures
        q["choices"] = new_choices

        log.append({
            "question_id": qid,
            "status": "applied",
            "type": result.get("type"),
            "confidence": result.get("confidence"),
            "figures_added": [f["path"] for f in new_figures],
            "preserved_stem_figures": len(existing_non_choice),
        })
        applied += 1

    # 2. Mis-tagged text-only questions: switch to vertical
    fixed_format = 0
    for t in text_only:
        qid = t["question_id"]
        q = by_id.get(qid)
        if not q:
            continue
        if q.get("choice_format") == "figure_choices":
            q["choice_format"] = "vertical"
            fixed_format += 1
            log.append({
                "question_id": qid,
                "status": "choice_format_fixed",
                "from": "figure_choices",
                "to": "vertical",
            })

    # 3. Existing-bug fix: rewrite stale "figure:ocr_out/figures/..." paths
    rewritten_paths = 0
    for q in questions:
        choices = q.get("choices") or {}
        for letter, raw in list(choices.items()):
            if isinstance(raw, str) and raw.startswith("figure:ocr_out/figures/"):
                # ocr_out/figures/<exam>/<file> → figures/<exam>/<file>
                new_val = "figure:" + raw[len("figure:ocr_out/"):]
                choices[letter] = new_val
                rewritten_paths += 1
        if rewritten_paths:
            q["choices"] = choices
    if rewritten_paths:
        log.append({
            "status": "stale_path_rewrites",
            "count": rewritten_paths,
            "notes": "rewrote 'figure:ocr_out/figures/...' → 'figure:figures/...' so the existing paths align with what /public/figures actually serves",
        })

    DATASET_JSON.write_text(
        json.dumps(questions, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    LOG_PATH.write_text(json.dumps(log, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"applied figure_choices backfill: {applied}")
    print(f"skipped (incomplete bboxes): {skipped}")
    print(f"choice_format text-only fixes: {fixed_format}")
    print(f"stale ocr_out/figures path rewrites: {rewritten_paths}")
    if failures:
        print(f"failures: {len(failures)}")
        for qid, reason in failures:
            print(f"  {qid}: {reason}")
    print(f"log → {LOG_PATH.relative_to(REPO_ROOT)}")
    return 0 if not failures else 1


if __name__ == "__main__":
    sys.exit(main())
