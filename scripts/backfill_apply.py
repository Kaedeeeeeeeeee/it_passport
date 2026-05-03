#!/usr/bin/env python3
"""Apply subagent vision results back into the dataset.

Reads:
  ocr_out/backfill_manifest.json
  ocr_out/backfill_results_{a,b,c,...}.json   (one per subagent chunk)

For each result with has_figure=true:
  1. Crop the bbox region from the rendered PDF page PNG.
  2. Save the crop as JPEG into dataset/figures/<exam>/p<NNN>_backfill.jpeg
  3. Update dataset/questions.json:
       - per-question: append a figures[] entry, append the markdown
         image ref to the question body.
       - 中問 group: append the figures[] entry to ALL members of the
         group AND append the markdown image ref to each member's
         integrated_context (next-intl renderer reads figures from the
         current question, so every member needs the entry too).

Idempotent: if the JPEG already exists or the markdown ref is already
in the text, the entry is skipped.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

from PIL import Image

REPO_ROOT = Path(__file__).resolve().parent.parent
MANIFEST_PATH = REPO_ROOT / "ocr_out" / "backfill_manifest.json"
DATASET_JSON = REPO_ROOT / "dataset" / "questions.json"
DATASET_FIGURES_DIR = REPO_ROOT / "dataset" / "figures"
LOG_PATH = REPO_ROOT / "scripts" / "backfill_log.json"
RESULTS_GLOB = "backfill_results_*.json"

# Bbox padding to apply on top of whatever the vision pass already
# included. The subagent prompt asks for 5% padding; this is a safety
# margin for cases where the model under-cropped.
EXTRA_PAD = 0.01

# Confidence below this is treated as "needs human review" — the figure
# is not auto-applied. Keep it permissive: 0.7 is the conventional cut
# in our paywall heuristic and below that the bbox tends to be off.
CONF_THRESHOLD = 0.7


def clamp(v: float, lo: float = 0.0, hi: float = 1.0) -> float:
    return max(lo, min(hi, v))


def load_results() -> dict[str, dict]:
    """Merge per-chunk result files into a single {question_id: result} map."""
    out: dict[str, dict] = {}
    for path in sorted((REPO_ROOT / "ocr_out").glob(RESULTS_GLOB)):
        rows = json.loads(path.read_text("utf-8"))
        for r in rows:
            qid = r.get("question_id")
            if qid:
                out[qid] = r
    return out


def crop_and_save(page_png: Path, bbox: list[float], out_path: Path) -> None:
    """Crop normalized bbox from the page PNG and save as JPEG."""
    with Image.open(page_png) as im:
        W, H = im.size
        x0 = int(clamp(bbox[0] - EXTRA_PAD) * W)
        y0 = int(clamp(bbox[1] - EXTRA_PAD) * H)
        x1 = int(clamp(bbox[2] + EXTRA_PAD) * W)
        y1 = int(clamp(bbox[3] + EXTRA_PAD) * H)
        if x1 - x0 < 20 or y1 - y0 < 20:
            raise ValueError(f"crop too small: {(x0, y0, x1, y1)}")
        cropped = im.crop((x0, y0, x1, y1))
        # Save JPEG matching the existing Mistral OCR figure convention.
        out_path.parent.mkdir(parents=True, exist_ok=True)
        cropped.convert("RGB").save(out_path, format="JPEG", quality=88)


def insert_figure_ref(text: str, figure_path: str, fig_type: str, description: str) -> str:
    """Append the markdown image ref + caption to the text in the same
    style as Mistral OCR output (so downstream parsers don't break)."""
    filename = figure_path.rsplit("/", 1)[-1]
    img_md = f"![{filename}](../{figure_path})"
    type_tag = fig_type or "figure"
    caption = description or ""
    block = f"\n\n{img_md}"
    if caption:
        block += f"\n\n> _{type_tag}_: {caption}"
    return text.rstrip() + block


def main() -> int:
    manifest = json.loads(MANIFEST_PATH.read_text("utf-8"))
    manifest_by_qid = {e["question_id"]: e for e in manifest}
    results = load_results()
    print(f"manifest entries: {len(manifest)}")
    print(f"result entries: {len(results)}")

    questions = json.loads(DATASET_JSON.read_text("utf-8"))
    by_id = {q["id"]: q for q in questions}

    log: list[dict] = []
    applied = 0
    skipped_no_figure = 0
    skipped_low_conf = 0
    failures: list[tuple[str, str]] = []

    for entry in manifest:
        qid = entry["question_id"]
        result = results.get(qid)
        if not result:
            log.append({"question_id": qid, "status": "no_result"})
            continue
        if not result.get("has_figure"):
            log.append({
                "question_id": qid,
                "status": "no_figure",
                "description": result.get("description") or "",
            })
            skipped_no_figure += 1
            continue
        confidence = float(result.get("confidence") or 0.0)
        if confidence < CONF_THRESHOLD:
            log.append({
                "question_id": qid,
                "status": "low_confidence",
                "confidence": confidence,
                "description": result.get("description") or "",
            })
            skipped_low_conf += 1
            continue

        bbox = result.get("bbox")
        if not (isinstance(bbox, list) and len(bbox) == 4):
            failures.append((qid, "missing/invalid bbox"))
            continue
        page_png = REPO_ROOT / entry["image_path"]
        if not page_png.exists():
            failures.append((qid, f"page png missing: {page_png}"))
            continue

        exam_dir = entry["exam_dir"]
        page_idx = entry["page_num_0idx"]
        # Use a backfill-distinctive suffix so the next OCR re-run
        # doesn't collide with these (Mistral writes p<NNN>_img-X).
        rel_figure_path = f"figures/{exam_dir}/p{page_idx + 1:03d}_backfill.jpeg"
        out_path = DATASET_FIGURES_DIR / f"{exam_dir}" / f"p{page_idx + 1:03d}_backfill.jpeg"

        try:
            crop_and_save(page_png, bbox, out_path)
        except Exception as e:
            failures.append((qid, f"crop failed: {e}"))
            continue

        figure_obj = {
            "path": rel_figure_path,
            "type": result.get("type") or "diagram",
            "description": result.get("description") or "",
        }

        # Apply to dataset
        targets = [by_id[m] for m in entry["group_members"] if m in by_id]
        is_group = entry["is_group_context"]
        for q in targets:
            # idempotency: skip if a backfill figure for this exact path
            # is already present.
            if any(f.get("path") == rel_figure_path for f in (q.get("figures") or [])):
                continue
            q.setdefault("figures", []).append(figure_obj)
            if is_group:
                # Append the markdown ref into integrated_context if
                # not already there (one shared block; we append to
                # each member's copy of the context).
                ctx = q.get("integrated_context") or ""
                if rel_figure_path not in ctx:
                    q["integrated_context"] = insert_figure_ref(
                        ctx, rel_figure_path, figure_obj["type"], figure_obj["description"]
                    )
            else:
                body = q.get("question") or ""
                if rel_figure_path not in body:
                    q["question"] = insert_figure_ref(
                        body, rel_figure_path, figure_obj["type"], figure_obj["description"]
                    )

        log.append({
            "question_id": qid,
            "status": "applied",
            "is_group": is_group,
            "members_updated": [m for m in entry["group_members"] if m in by_id],
            "figure_path": rel_figure_path,
            "type": figure_obj["type"],
            "description": figure_obj["description"],
            "confidence": confidence,
        })
        applied += 1

    DATASET_JSON.write_text(
        json.dumps(questions, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    LOG_PATH.write_text(json.dumps(log, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"\napplied: {applied}  no_figure: {skipped_no_figure}  "
          f"low_conf: {skipped_low_conf}  failures: {len(failures)}")
    if failures:
        for qid, reason in failures:
            print(f"  FAIL {qid}: {reason}")
    print(f"log → {LOG_PATH.relative_to(REPO_ROOT)}")
    print(f"figures → {DATASET_FIGURES_DIR.relative_to(REPO_ROOT)}/")
    return 0 if not failures else 1


if __name__ == "__main__":
    sys.exit(main())
