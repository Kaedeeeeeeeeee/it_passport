#!/usr/bin/env python3
"""Prep manifest for `choice_format=figure_choices` questions whose
choices have lost their visual content during OCR.

For each broken question:
  1. Locate the question's page in the source PDF (via OCR markdown).
  2. Render that page to a PNG (re-uses backfill_pages/ from the
     context-backfill run, or renders fresh).
  3. Emit a manifest entry that downstream subagents will turn into
     four bboxes — one per choice letter (ア/イ/ウ/エ).

The followup apply script crops each bbox and rewrites the choice
text from a post-processed description back to the canonical
`figure:figures/<exam>/p<NNN>_choice_<letter>.jpeg` form.

Detection rule: choice_format=figure_choices AND any choice text
doesn't already start with "figure:" (the canonical visual-choice
encoding). Exception: questions where the choices are clearly plain
text (1-3 chars like "B" or simple terms like "企画") get classified
as "actually_text" and reported separately — those need a
choice_format fix, not a vision pass.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from collections import defaultdict
from dataclasses import dataclass, asdict
from pathlib import Path

import fitz  # PyMuPDF

REPO_ROOT = Path(__file__).resolve().parent.parent
DATASET_JSON = REPO_ROOT / "dataset" / "questions.json"
DOWNLOAD_DIR = REPO_ROOT / "download"
OCR_MD_DIR = REPO_ROOT / "ocr_out" / "markdown"
PAGES_DIR = REPO_ROOT / "ocr_out" / "backfill_pages"
MANIFEST_PATH = REPO_ROOT / "ocr_out" / "backfill_choices_manifest.json"
TEXT_QS_PATH = REPO_ROOT / "ocr_out" / "backfill_choices_text_only.json"

PAGE_SPLIT_RE = re.compile(r"<!-- page (\d+) -->")
RENDER_DPI = 150


@dataclass
class ChoicesEntry:
    question_id: str
    source_pdf: str
    exam_dir: str
    page_num_0idx: int
    page_size_px: list[int]
    image_path: str
    text_excerpt: str
    current_choices: dict[str, str]


def find_page_from_markdown(exam_stem: str, needle: str) -> int | None:
    md_path = OCR_MD_DIR / f"{exam_stem}.md"
    if not md_path.exists():
        return None
    md = md_path.read_text("utf-8")
    needle_compact = re.sub(r"\s+", "", needle)
    if not needle_compact:
        return None
    chunks = PAGE_SPLIT_RE.split(md)
    pairs = [(int(chunks[i]), re.sub(r"\s+", "", chunks[i + 1]) if i + 1 < len(chunks) else "")
             for i in range(1, len(chunks), 2)]
    for prefix_len in (60, 40, 25, 15):
        if len(needle_compact) < prefix_len:
            continue
        prefix = needle_compact[:prefix_len]
        for page_num, compact in pairs:
            if prefix in compact:
                return page_num
    return None


def looks_like_text_choice(choices: dict[str, str]) -> bool:
    """Heuristic: choices are plain text labels, not figure references.
    True if all choices are short (<= 12 chars) and contain no markdown
    image syntax — those are very likely mis-tagged as figure_choices."""
    if not choices:
        return False
    for txt in choices.values():
        t = (txt or "").strip()
        if not t or len(t) > 12 or "![" in t:
            return False
    return True


def render_page(doc: fitz.Document, page_idx: int, out_path: Path) -> tuple[int, int]:
    page = doc.load_page(page_idx)
    matrix = fitz.Matrix(RENDER_DPI / 72, RENDER_DPI / 72)
    pix = page.get_pixmap(matrix=matrix)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    pix.save(out_path)
    return pix.width, pix.height


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--limit", type=int, default=None)
    args = ap.parse_args()

    questions = json.loads(DATASET_JSON.read_text("utf-8"))
    by_id = {q["id"]: q for q in questions}

    broken: list[dict] = []
    text_only: list[dict] = []
    for q in questions:
        if q.get("choice_format") != "figure_choices":
            continue
        choices = q.get("choices") or {}
        # If every choice already starts with "figure:" the rendering
        # works fine — skip.
        if all((txt or "").startswith("figure:") for txt in choices.values()):
            continue
        # Choices that look like plain text (short labels) are probably
        # mis-classified as figure_choices.
        if looks_like_text_choice(choices):
            text_only.append({
                "question_id": q["id"],
                "choices": choices,
                "reason": "all-choices-look-like-plain-text",
            })
            continue
        broken.append(q)

    print(f"figure_choices needing vision recovery: {len(broken)}")
    print(f"figure_choices that should just be choice_format=vertical: {len(text_only)}")
    for t in text_only:
        print(f"  text-only: {t['question_id']}")

    pdf_cache: dict[str, fitz.Document] = {}
    def open_pdf(name: str) -> fitz.Document | None:
        if name in pdf_cache:
            return pdf_cache[name]
        path = DOWNLOAD_DIR / name
        if not path.exists():
            return None
        pdf_cache[name] = fitz.open(path)
        return pdf_cache[name]

    entries: list[ChoicesEntry] = []
    failures: list[tuple[str, str]] = []

    work = broken[: args.limit] if args.limit else broken

    for q in work:
        qid = q["id"]
        source_pdf = q["source_pdf"]
        exam_stem = source_pdf.rsplit(".", 1)[0]
        # Anchor on the question body — figure_choices questions usually
        # have all 4 choices on the same page as the question stem.
        body = q.get("question") or ""
        # Drop markdown image refs from the anchor text — we want to
        # find the page by stem prose.
        anchor = re.sub(r"!\[[^\]]*\]\([^)]+\)", "", body).strip()[:120]
        if not anchor:
            failures.append((qid, "empty question body"))
            continue
        md_page = find_page_from_markdown(exam_stem, anchor)
        if md_page is None:
            failures.append((qid, f"text not found in OCR markdown for {exam_stem}"))
            continue
        doc = open_pdf(source_pdf)
        if doc is None:
            failures.append((qid, f"PDF not found: {source_pdf}"))
            continue
        page_idx = md_page  # markdown page-N == 0-indexed PyMuPDF page-N (verified earlier)
        if page_idx >= doc.page_count:
            failures.append((qid, f"page {page_idx} out of range ({doc.page_count})"))
            continue
        out_path = PAGES_DIR / f"{exam_stem}_p{page_idx:03d}.png"
        if out_path.exists():
            from PIL import Image
            with Image.open(out_path) as im:
                w, h = im.size
        else:
            w, h = render_page(doc, page_idx, out_path)
        entries.append(ChoicesEntry(
            question_id=qid,
            source_pdf=source_pdf,
            exam_dir=exam_stem,
            page_num_0idx=page_idx,
            page_size_px=[w, h],
            image_path=str(out_path.relative_to(REPO_ROOT)),
            text_excerpt=anchor,
            current_choices=q.get("choices") or {},
        ))

    MANIFEST_PATH.write_text(
        json.dumps([asdict(e) for e in entries], ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    TEXT_QS_PATH.write_text(
        json.dumps(text_only, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"\nwrote {len(entries)} choices manifest entries → {MANIFEST_PATH.relative_to(REPO_ROOT)}")
    print(f"wrote {len(text_only)} text-only entries → {TEXT_QS_PATH.relative_to(REPO_ROOT)}")
    if failures:
        print(f"\n{len(failures)} failures:")
        for qid, reason in failures:
            print(f"  {qid}: {reason}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
