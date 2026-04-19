# IT Passport Exam Pipeline

Pipeline to turn scanned **IT Passport (ITパスポート試験)** past-exam PDFs
released by IPA into a structured JSON question bank — covering 28 exams,
2,800 questions, with automatically cropped diagrams.

**Pipeline**: `PDF → Mistral OCR (bbox annotation) → regex parser → JSON + figures → HF dataset`.

The dataset itself is not committed to this repo (see *Data & Copyright*
below). Use the scripts to reproduce it locally.

## Repo layout

```
scripts/
├── ocr_one.py              Run Mistral OCR on one PDF (markdown + figures + bbox annotations)
├── ocr_batch.py            Parallel OCR over the full download/ set (6 workers)
├── parse_one.py            Markdown → structured JSON for one exam; --all for batch
├── aggregate.py            Combine per-exam JSON into _all.json + _stats.json
├── manual_fixes.py         Apply vision-extracted and hand-curated overlays
├── qa_check.py             Four-part audit: answer cross-validation, distribution, cross-year duplicates, structural invariants
├── extract_review_pages.py Rasterize PDF pages for items needing vision review
└── pack_dataset.py         Produce a self-contained dataset/ folder for upload

push_hf.py                  Upload dataset/ to Hugging Face (private repo)
```

Expected at runtime (all gitignored):

```
download/            28 IT Passport past-exam PDFs (qs + ans; fetched via ocr_batch URLs)
ocr_out/markdown/    Mistral OCR output per PDF (*.md + *.raw.json)
ocr_out/figures/     228 auto-cropped diagrams
ocr_out/json/        _all.json (2800 items) + per-exam files + _qa_report.json
ocr_out/vision_results/  14 JSON overlays from the Sonnet vision pass
dataset/             HF-ready package (questions.json + questions.jsonl + figures/ + README)
```

## Reproduce from scratch

```bash
python3 -m venv .venv
.venv/bin/pip install mistralai python-dotenv huggingface_hub pydantic

# .env
# MISTRAL_API_KEY=...
# HF_TOKEN=hf_...   (only needed for push_hf.py)

# 1. Download the 56 IPA PDFs (URLs are the full list from https://www3.jitec.ipa.go.jp/JitesCbt/html/openinfo/questions.html)
#    See ocr_batch.py for a script that pulls them into download/.

# 2. OCR everything in parallel (~90s, ~$1-2 in Mistral credits)
.venv/bin/python scripts/ocr_batch.py

# 3. Parse markdown → JSON for every exam
.venv/bin/python scripts/parse_one.py --all

# 4. Apply vision / hand overlays and aggregate
.venv/bin/python scripts/manual_fixes.py
.venv/bin/python scripts/aggregate.py

# 5. Quality audit (should report 0 real issues)
.venv/bin/python scripts/qa_check.py

# 6. Package + (optionally) push to HF
.venv/bin/python scripts/pack_dataset.py
.venv/bin/python scripts/push_hf.py
```

## Schema (per question)

| field | type | notes |
|---|---|---|
| `id` | string | e.g. `2025r07-42` |
| `exam_code` | string | e.g. `2025r07`, `2011h23tokubetsu` |
| `year`, `era`, `era_year`, `season` | | decomposed from the exam code |
| `number` | int | 1–100 |
| `category` | enum | `strategy` / `management` / `technology` / `integrated` |
| `question` | markdown | may include tables / pseudocode blocks |
| `choices` | `{ア, イ, ウ, エ}` | option text; empty when `choice_format == see_figure` |
| `answer` | string | `ア`/`イ`/`ウ`/`エ` or multi-answer like `ア/ウ` |
| `figures` | array | `{path, type, description}` per detected diagram |
| `choice_format` | enum | `vertical` / `inline` / `table_combo` / `table_single` / `figure_choices` / `see_figure` |
| `source_pdf`, `needs_manual_review` | | |

## Audit summary (current state)

- 28 exams × 100 items = 2,800 total
- 228 figures cropped and captioned (Mistral `bbox_annotation_format`)
- Answer distribution: ア ≈ 23%, イ ≈ 25%, ウ ≈ 27%, エ ≈ 25%, multi = 2
- `answer_mismatch` across sources (pdftotext vs OCR md vs JSON): **0**
- `cross_year_conflict` (same question text, different answers): **0**
- Structural invariant failures: **0**

See `scripts/qa_check.py` for details.

## Data & copyright

The IT Passport past-exam questions and answer keys are © **独立行政法人情報処理推進機構 (IPA)** and are published at
<https://www3.jitec.ipa.go.jp/JitesCbt/html/openinfo/questions.html>.

**This repository contains no IPA content** — only the pipeline code. Original PDFs, OCR markdown, cropped figures, and the structured JSON are excluded via `.gitignore` and are not redistributed here. The dataset produced by this pipeline is stored in a **private** Hugging Face repository (`ZhangShifeng/it-passport`).

If you fork this, please cite IPA for any derived dataset you publish and review IPA's terms of use before public redistribution.

## License

Code in this repository: **MIT**.
Anything produced from IPA PDFs is a derivative work and falls under IPA's terms; do not assume MIT covers generated artifacts.
