#!/usr/bin/env python3
"""Prepare a backfill manifest of questions whose body or
integrated_context references a numbered figure (図N / 表N) but whose
`figures` list is empty.

For each candidate:
  1. locate the page in the source PDF where the question text lives
  2. render that page as PNG into ocr_out/backfill_pages/
  3. emit a row into ocr_out/backfill_manifest.json with everything a
     downstream subagent needs to identify the figure region

The Mistral OCR pipeline (ocr_one.py) handled most figures, but
gracefully degrades certain visual elements — notably gantt charts
where the visual bars become empty markdown table cells. This script
finds those gaps; a follow-up pass uses Sonnet vision to recover the
figure crops, and `backfill_apply.py` writes the new figures back
into the dataset.

Usage:
    .venv/bin/python scripts/backfill_prep.py
    .venv/bin/python scripts/backfill_prep.py --limit 5     # for smoke testing
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from collections import defaultdict
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Iterable

import fitz  # PyMuPDF

REPO_ROOT = Path(__file__).resolve().parent.parent
DATASET_JSON = REPO_ROOT / "dataset" / "questions.json"
DOWNLOAD_DIR = REPO_ROOT / "download"
OCR_MD_DIR = REPO_ROOT / "ocr_out" / "markdown"
OUT_DIR = REPO_ROOT / "ocr_out" / "backfill_pages"
MANIFEST_PATH = REPO_ROOT / "ocr_out" / "backfill_manifest.json"
PRIOR_LOG_PATH = REPO_ROOT / "scripts" / "backfill_log.json"

PAGE_SPLIT_RE = re.compile(r"<!-- page (\d+) -->")

NUMBERED_FIG_RE = re.compile(r"図\s*[0-9０-９]")
NUMBERED_TABLE_RE = re.compile(r"表\s*[0-9０-９]")
# Less-ambiguous patterns that strongly indicate a visual element on the
# same page: directional references, named diagram types, etc.
RELAXED_FIG_RE = re.compile(
    r"次の(図|表)|下図|下表|下記の(図|表)|(図|表)のように|"
    r"以下の(図|表)|状態遷移図|フローチャート|"
    r"ER\s*図|E[-－]R\s*図|アローダイアグラム|"
    r"散布図|ヒストグラム|系統図|パレート図|レーダーチャート"
)
MARKDOWN_IMG_RE = re.compile(r"!\[[^\]]*\]\([^)]+\)")
RENDER_DPI = 150


def references_figure(text: str) -> bool:
    """True when the text references a visual element via either an
    explicit numbered reference (図1, 表2) or the broader set of
    directional / named-diagram-type patterns. Bare 図/表 are still
    excluded — too ambiguous (図書館, 意図, 代表, 表す etc.)."""
    if not text:
        return False
    return bool(
        NUMBERED_FIG_RE.search(text)
        or NUMBERED_TABLE_RE.search(text)
        or RELAXED_FIG_RE.search(text)
    )


# Backwards-compatible alias for any external callers.
references_numbered_figure = references_figure


def context_has_image(text: str) -> bool:
    return bool(text and MARKDOWN_IMG_RE.search(text))


@dataclass
class ManifestEntry:
    question_id: str
    is_group_context: bool
    group_id: str | None
    group_members: list[str]
    source_pdf: str
    exam_dir: str  # e.g. "2013h25a_ip_qs" (no .pdf), matches existing figure dir layout
    page_num_0idx: int
    page_size_px: list[int]  # [W, H] of the rendered PNG
    image_path: str  # relative to repo root
    text_excerpt: str  # ~300 chars for the subagent prompt


def find_candidates(questions: list[dict]) -> tuple[list[dict], list[tuple[str, list[dict]]]]:
    """Return (per_question_cands, group_cands).
    group_cands is a list of (group_id, members[]) — one row per group, since
    every member shares the same integrated_context and the figure attaches
    to the context."""
    # Group questions by integrated_group_id
    groups: dict[str, list[dict]] = defaultdict(list)
    for q in questions:
        gid = q.get("integrated_group_id")
        if gid:
            groups[gid].append(q)

    # Per-question: body says 図N/表N, no figures, NOT part of a group
    per_q: list[dict] = []
    for q in questions:
        if (q.get("figures") or []):
            continue
        if q.get("integrated_group_id"):
            continue
        if references_figure(q.get("question") or ""):
            per_q.append(q)

    # Group: integrated_context says 図N/表N, no image markdown in context
    # yet. (We don't filter on per-member figures — the per-question
    # figures might cover a different figure within that question, while
    # the shared context still needs its own.)
    group_rows: list[tuple[str, list[dict]]] = []
    for gid, members in groups.items():
        ctx = members[0].get("integrated_context") or ""
        if not references_figure(ctx):
            continue
        if context_has_image(ctx):
            continue
        group_rows.append((gid, members))

    return per_q, group_rows


def find_page_from_markdown(exam_stem: str, needle: str) -> int | None:
    """Return the page number (matching `<!-- page N -->` markers,
    which align with PyMuPDF's 0-indexed page) where `needle` first
    appears in the OCR markdown.

    The IPA PDFs are scanned images with no embedded text layer, so
    PyMuPDF's `page.get_text()` returns empty. The OCR pipeline however
    emitted `<!-- page N -->` markers in the rendered markdown — we
    split on those and check which page chunk contains the text.
    Whitespace is collapsed on both sides since OCR markdown wraps
    lines and inserts full-width spaces."""
    md_path = OCR_MD_DIR / f"{exam_stem}.md"
    if not md_path.exists():
        return None
    md = md_path.read_text("utf-8")
    needle_compact = re.sub(r"\s+", "", needle)
    if not needle_compact:
        return None

    chunks = PAGE_SPLIT_RE.split(md)  # [before-first, "n1", content1, "n2", content2, ...]
    pairs = [(int(chunks[i]), re.sub(r"\s+", "", chunks[i + 1]) if i + 1 < len(chunks) else "")
             for i in range(1, len(chunks), 2)]

    for prefix_len in (60, 40, 25, 15):
        if len(needle_compact) < prefix_len:
            continue
        prefix = needle_compact[:prefix_len]
        for page_num, compact_content in pairs:
            if prefix in compact_content:
                return page_num
    return None


# Picks an anchor inside a (potentially multi-page) integrated_context
# such that the page the anchor maps to is most likely the page
# containing the actual figure. Heuristic: prefer the position of the
# first "図N" / "表N" reference, fall back to the start of the text.
FIGURE_REF_RE = re.compile(r"(図|表)\s*[0-9０-９]")


def best_anchor_for_figure(text: str) -> str:
    if not text:
        return ""
    m = FIGURE_REF_RE.search(text)
    if m:
        # 60 chars starting at the figure reference. The figure
        # caption + first row of the markdown table for the chart
        # usually lives within this window — and it lives on the same
        # page as the figure image in the original PDF.
        return text[m.start(): m.start() + 60]
    return text


def render_page(doc: fitz.Document, page_idx: int, out_path: Path) -> tuple[int, int]:
    """Render to PNG. Returns (width, height) in pixels."""
    page = doc.load_page(page_idx)
    matrix = fitz.Matrix(RENDER_DPI / 72, RENDER_DPI / 72)
    pix = page.get_pixmap(matrix=matrix)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    pix.save(out_path)
    return pix.width, pix.height


def excerpt_for_subagent(text: str, max_chars: int = 300) -> str:
    """Trim and clean text so the subagent prompt stays focused. Strip
    markdown image markers — the subagent gets the visual via the image
    file, not via prose."""
    cleaned = MARKDOWN_IMG_RE.sub("", text or "").strip()
    if len(cleaned) <= max_chars:
        return cleaned
    return cleaned[:max_chars] + "…"


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--limit", type=int, default=None,
                    help="Process only the first N candidates (for smoke testing)")
    args = ap.parse_args()

    questions = json.loads(DATASET_JSON.read_text(encoding="utf-8"))
    by_id = {q["id"]: q for q in questions}
    per_q, group_rows = find_candidates(questions)
    print(f"per-question candidates: {len(per_q)}")
    print(f"group-context candidates: {len(group_rows)} groups, "
          f"{sum(len(m) for _, m in group_rows)} member questions")

    # Skip anything already processed in a previous backfill run — both
    # successes (status=applied) and definitive vision rejections
    # (status=no_figure). low_confidence / failures stay in the queue
    # so they get retried.
    prior_skip: set[str] = set()
    if PRIOR_LOG_PATH.exists():
        try:
            prior = json.loads(PRIOR_LOG_PATH.read_text("utf-8"))
            for entry in prior:
                if entry.get("status") in ("applied", "no_figure"):
                    prior_skip.add(entry["question_id"])
            if prior_skip:
                print(f"skipping {len(prior_skip)} already-processed entries from prior log")
        except Exception as e:
            print(f"WARN: could not read prior log: {e}")
    per_q = [q for q in per_q if q["id"] not in prior_skip]
    group_rows = [(gid, members) for gid, members in group_rows
                  if members[0]["id"] not in prior_skip]

    # Open each source PDF only once and cache it.
    pdf_cache: dict[str, fitz.Document] = {}
    def open_pdf(name: str) -> fitz.Document | None:
        if name in pdf_cache:
            return pdf_cache[name]
        path = DOWNLOAD_DIR / name
        if not path.exists():
            return None
        pdf_cache[name] = fitz.open(path)
        return pdf_cache[name]

    entries: list[ManifestEntry] = []
    failures: list[tuple[str, str]] = []

    def process(qid: str, source_pdf: str, search_text: str,
                excerpt_text: str, is_group_context: bool,
                group_id: str | None, members: list[str]) -> None:
        doc = open_pdf(source_pdf)
        if doc is None:
            failures.append((qid, f"PDF not found: {source_pdf}"))
            return
        exam_stem = source_pdf.rsplit(".", 1)[0]  # "2013h25a_ip_qs"
        md_page = find_page_from_markdown(exam_stem, search_text)
        if md_page is None:
            failures.append((qid, f"text not found in OCR markdown for {exam_stem}"))
            return
        # The OCR pipeline numbers markdown pages such that
        # `<!-- page N -->` aligns with PyMuPDF's 0-indexed page N
        # (i.e. physical page N+1). Empirically verified by rendering
        # 2012h24a markdown-page 32 (中間A intro) and seeing the
        # 売上分析ワークシート on PyMuPDF page 32 / physical page 33.
        # If a future PDF has a different cover-page offset, this will
        # need a per-exam calibration step.
        page_idx = md_page
        if page_idx < 0 or page_idx >= doc.page_count:
            failures.append((qid, f"derived page index {page_idx} out of range "
                                  f"(doc has {doc.page_count} pages)"))
            return
        out_path = OUT_DIR / f"{exam_stem}_p{page_idx:03d}.png"
        if not out_path.exists():
            w, h = render_page(doc, page_idx, out_path)
        else:
            from PIL import Image
            with Image.open(out_path) as im:
                w, h = im.size
        entries.append(ManifestEntry(
            question_id=qid,
            is_group_context=is_group_context,
            group_id=group_id,
            group_members=members,
            source_pdf=source_pdf,
            exam_dir=exam_stem,
            page_num_0idx=page_idx,
            page_size_px=[w, h],
            image_path=str(out_path.relative_to(REPO_ROOT)),
            text_excerpt=excerpt_for_subagent(excerpt_text),
        ))

    work: list[tuple] = []
    # per-question: anchor on the 図N/表N reference if any (better
    # localizes the figure when the question body spans page wrap),
    # else on the body start.
    for q in per_q:
        body = q.get("question") or ""
        anchor = best_anchor_for_figure(body)
        work.append((q["id"], q["source_pdf"], anchor, body, False, None, [q["id"]]))
    # group-context: integrated_context often spans 2 pages — the
    # introduction prose on one page, the figure on the next. Anchor
    # on 図N to land on the figure's page, not the prose page.
    for gid, members in group_rows:
        ctx = members[0].get("integrated_context") or ""
        anchor = best_anchor_for_figure(ctx)
        primary = members[0]
        member_ids = [m["id"] for m in members]
        work.append((primary["id"], primary["source_pdf"], anchor, ctx, True, gid, member_ids))

    if args.limit is not None:
        work = work[: args.limit]
        print(f"--limit {args.limit}: trimming to {len(work)} candidates")

    for i, item in enumerate(work, 1):
        process(*item)
        if i % 20 == 0:
            print(f"  prep progress: {i}/{len(work)}")

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    MANIFEST_PATH.write_text(
        json.dumps([asdict(e) for e in entries], ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"\nwrote {len(entries)} manifest entries → {MANIFEST_PATH.relative_to(REPO_ROOT)}")
    print(f"rendered pages → {OUT_DIR.relative_to(REPO_ROOT)}/")
    if failures:
        print(f"\n{len(failures)} failures (text not found / PDF missing):")
        for qid, reason in failures[:10]:
            print(f"  {qid}: {reason}")
        if len(failures) > 10:
            print(f"  ... +{len(failures) - 10} more")
    return 0


if __name__ == "__main__":
    sys.exit(main())
