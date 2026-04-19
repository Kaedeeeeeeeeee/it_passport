"""Run Mistral OCR on every PDF under download/ in parallel.

- Skips PDFs whose .md output already exists (idempotent re-runs).
- Uses a thread pool with CONCURRENCY workers.
- Writes per-PDF status to stdout and a summary at the end.
"""

from __future__ import annotations

import sys
import time
import traceback
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))

from ocr_one import MD_DIR, ocr_pdf, save_outputs

DOWNLOAD_DIR = ROOT / "download"
CONCURRENCY = 6


def process(pdf: Path) -> tuple[str, str, int, int]:
    md_path = MD_DIR / f"{pdf.stem}.md"
    if md_path.exists():
        return (pdf.name, "skip", 0, 0)
    t0 = time.time()
    ocr = ocr_pdf(pdf)
    save_outputs(pdf.stem, ocr)
    pages = len(ocr.get("pages", []))
    figs = sum(len(p.get("images", [])) for p in ocr.get("pages", []))
    dt = int(time.time() - t0)
    return (pdf.name, f"ok {dt}s", pages, figs)


def main() -> None:
    pdfs = sorted(DOWNLOAD_DIR.glob("*.pdf"))
    print(f"{len(pdfs)} PDFs, concurrency={CONCURRENCY}")

    total_pages = 0
    total_figs = 0
    errors: list[tuple[str, str]] = []

    with ThreadPoolExecutor(max_workers=CONCURRENCY) as ex:
        futures = {ex.submit(process, p): p for p in pdfs}
        done = 0
        for fut in as_completed(futures):
            pdf = futures[fut]
            done += 1
            try:
                name, status, pages, figs = fut.result()
                total_pages += pages
                total_figs += figs
                print(f"[{done:2d}/{len(pdfs)}] {name:<32} {status}  pages={pages} figs={figs}")
            except Exception as e:
                errors.append((pdf.name, f"{type(e).__name__}: {e}"))
                print(f"[{done:2d}/{len(pdfs)}] {pdf.name:<32} FAIL {e!r}")
                traceback.print_exc()

    print("---")
    print(f"total_pages={total_pages}  total_figures={total_figs}  errors={len(errors)}")
    for name, err in errors:
        print(f"  ERR {name}: {err}")


if __name__ == "__main__":
    main()
