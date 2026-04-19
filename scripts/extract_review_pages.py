"""Render the PDF page(s) for each still-unresolved review item as a JPG
so a vision agent can inspect them.

For each of the 14 `see_figure` items, we:
  1. Look up the page number from the OCR raw JSON by searching the page's
     markdown for the question header.
  2. Extract that page + the following page (choices sometimes spill) from
     the original PDF as a JPEG using pdfimages -f/-l.
  3. Write to ocr_out/review_pages/<id>_pN.jpeg.

Finally, writes a manifest at ocr_out/review_pages/_manifest.json that a
vision agent can consume.
"""

from __future__ import annotations

import json
import re
import shutil
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MD_DIR = ROOT / "ocr_out" / "markdown"
PDF_DIR = ROOT / "download"
OUT = ROOT / "ocr_out" / "review_pages"
OUT.mkdir(parents=True, exist_ok=True)


def find_page_for_question(raw_json_path: Path, num: int) -> int | None:
    data = json.loads(raw_json_path.read_text())
    pattern = re.compile(rf"(?m)^[問開間図]\s*{num}\s+")
    for page in data.get("pages", []):
        if pattern.search(page.get("markdown", "")):
            return page.get("index")
    return None


def extract_pages(pdf: Path, pages: list[int], out_prefix: str) -> list[Path]:
    """Rasterize the given 0-indexed pages as JPEGs at 150 DPI."""
    results: list[Path] = []
    for p in pages:
        one_based = p + 1
        dst = OUT / f"{out_prefix}_p{p:03d}.jpeg"
        tmp = OUT / f"_tmp_{out_prefix}_{one_based}"
        subprocess.run(
            [
                "pdftoppm",
                "-jpeg",
                "-r", "150",
                "-f", str(one_based),
                "-l", str(one_based),
                str(pdf),
                str(tmp),
            ],
            check=True,
        )
        produced = sorted(OUT.glob(f"_tmp_{out_prefix}_{one_based}*.jpg"))
        if not produced:
            continue
        shutil.move(str(produced[0]), dst)
        for extra in produced[1:]:
            extra.unlink(missing_ok=True)
        results.append(dst)
    return results


def main() -> None:
    all_items = json.loads((ROOT / "ocr_out" / "json" / "_all.json").read_text())
    review = [it for it in all_items if it.get("needs_manual_review")]
    print(f"{len(review)} items to handle")

    manifest: list[dict] = []
    for it in review:
        code = it["exam_code"]
        num = it["number"]
        stem = f"{code}_ip_qs"
        pdf = PDF_DIR / f"{stem}.pdf"
        raw = MD_DIR / f"{stem}.raw.json"
        if not raw.exists() or not pdf.exists():
            print(f"  !! missing artifacts for {it['id']}")
            continue
        page_idx = find_page_for_question(raw, num)
        if page_idx is None:
            print(f"  !! could not locate {it['id']}")
            continue
        # Grab this page and the next (choices sometimes spill)
        pages = [page_idx]
        if page_idx + 1 < 200:
            pages.append(page_idx + 1)
        out_paths = extract_pages(pdf, pages, f"{it['id'].replace('-', '_')}")
        manifest.append(
            {
                "id": it["id"],
                "exam_code": code,
                "number": num,
                "answer": it["answer"],
                "question": it["question"],
                "pages": [str(p.relative_to(ROOT)) for p in out_paths],
                "existing_figures": [f["path"] for f in it.get("figures", [])],
            }
        )
        print(f"  {it['id']}: pages={[p.name for p in out_paths]}")

    (OUT / "_manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2)
    )
    print(f"\nmanifest -> {OUT / '_manifest.json'}")


if __name__ == "__main__":
    main()
