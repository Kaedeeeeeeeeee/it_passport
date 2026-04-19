"""Package the corpus into a self-contained dataset/ directory for upload.

Layout produced:
  dataset/
    README.md               — dataset card (stub; fill license + source attribution)
    questions.json          — array form (same as _all.json, rewritten paths)
    questions.jsonl         — JSON Lines (one item per line, nicer for `datasets`)
    figures/<exam>/<file>   — copied from ocr_out/figures/

Paths inside questions.json are rewritten from
  "ocr_out/figures/<exam>/<file>" → "figures/<exam>/<file>"
so the dataset is self-contained.
"""

from __future__ import annotations

import json
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC_JSON = ROOT / "ocr_out" / "json" / "_all.json"
SRC_FIG_DIR = ROOT / "ocr_out" / "figures"
OUT = ROOT / "dataset"


README_STUB = """---
license: cc-by-nc-sa-4.0
language:
  - ja
size_categories:
  - 1K<n<10K
task_categories:
  - question-answering
  - multiple-choice
tags:
  - japanese
  - it-passport
  - exam
  - ipa
pretty_name: IT Passport Past Exam Questions
---

# IT Passport Past Exam Questions (ITパスポート試験 過去問)

Structured dataset of 2,800 questions from 28 publicly released Japanese
IT Passport exams (平成21年春〜令和7年), including question text, four
multiple-choice options, the official answer, and 228 extracted figures.

## Source

Original exams and answer keys published by the Information-technology
Promotion Agency, Japan (IPA) at
https://www3.jitec.ipa.go.jp/JitesCbt/html/openinfo/questions.html

Copyright of the underlying exam content belongs to IPA. This dataset is a
derivative work: OCR-extracted text + cropped diagram images + per-question
structured metadata. Please cite IPA when using this dataset.

## Schema (one record)

| field | type | notes |
|---|---|---|
| `id` | string | e.g. `2025r07-42` |
| `exam_code` | string | e.g. `2025r07`, `2019h31h`, `2011h23tokubetsu` |
| `year` | int | western year |
| `era` | string | `reiwa` or `heisei` |
| `era_year` | int | 1-indexed in era |
| `season` | string | `annual`, `spring`, `autumn`, `october`, `special` |
| `number` | int | 1..100 |
| `category` | string | `strategy` / `management` / `technology` / `integrated` |
| `question` | string | markdown (may contain tables, pseudocode blocks) |
| `choices` | object | keys `ア イ ウ エ` → option text (empty when `choice_format == see_figure`) |
| `answer` | string | `ア`/`イ`/`ウ`/`エ` or multi-answer like `ア/ウ` |
| `figures` | array | each: `{path, type, description}` — path relative to dataset root |
| `choice_format` | string | `vertical`/`inline`/`table_combo`/`table_single`/`figure_choices`/`see_figure` |
| `source_pdf` | string | original IPA PDF filename |
| `needs_manual_review` | bool | always `false` for released data |

## Stats

- 2,800 items across 28 exams (100 per exam)
- 228 figures automatically cropped + captioned by Mistral OCR
- Answer distribution: ア=644 (23%), イ=714 (25%), ウ=752 (27%), エ=688 (25%), multi=2
- Categories: strategy=906, management=566, technology=1128, integrated=200

## Example

```python
from datasets import load_dataset
ds = load_dataset("ZhangShifeng/it-passport", split="train")
print(ds[0]["question"], ds[0]["choices"], ds[0]["answer"])
```

## Construction pipeline

Scanned PDFs → Mistral OCR (`mistral-ocr-latest` with `bbox_annotation_format`)
→ markdown + cropped figures → regex-based parser → JSON. Fourteen diagram-
dependent items whose choices are printed inside figures were recovered by a
vision pass. Full pipeline and audit scripts: TBA.

## License

CC BY-NC-SA 4.0 for the derivative structure and extraction work in this
repository. The underlying exam content remains © IPA; see their terms of use
at https://www.ipa.go.jp/.
"""


def main() -> None:
    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir(parents=True)

    items = json.loads(SRC_JSON.read_text())
    rewritten = []
    copied_figs = 0
    for it in items:
        new_it = dict(it)
        figs = []
        for fig in it.get("figures") or []:
            src_path = ROOT / fig["path"]
            if not src_path.exists():
                figs.append(fig)
                continue
            rel = fig["path"].replace("ocr_out/figures/", "figures/", 1)
            dst_path = OUT / rel
            dst_path.parent.mkdir(parents=True, exist_ok=True)
            if not dst_path.exists():
                shutil.copy2(src_path, dst_path)
                copied_figs += 1
            figs.append({**fig, "path": rel})
        new_it["figures"] = figs
        rewritten.append(new_it)

    (OUT / "questions.json").write_text(
        json.dumps(rewritten, ensure_ascii=False, indent=2)
    )
    with (OUT / "questions.jsonl").open("w") as f:
        for it in rewritten:
            f.write(json.dumps(it, ensure_ascii=False) + "\n")
    (OUT / "README.md").write_text(README_STUB)

    print(f"packaged {len(rewritten)} items, {copied_figs} figures -> {OUT}")
    total_bytes = sum(p.stat().st_size for p in OUT.rglob("*") if p.is_file())
    print(f"total size: {total_bytes / 1024 / 1024:.1f} MB")


if __name__ == "__main__":
    main()
