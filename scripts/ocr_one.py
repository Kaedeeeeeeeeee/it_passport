"""Run Mistral OCR on a single PDF and save Markdown + extracted figures.

Uses bbox_annotation so Mistral crops every detected figure/diagram/chart and
inserts ![img-N.jpeg](img-N.jpeg) into the markdown at the right place. We
save the crops under ocr_out/figures/<stem>/ and rewrite the markdown links
to point at them.

Usage: python scripts/ocr_one.py <pdf_path>
Output:
  ocr_out/markdown/<stem>.md
  ocr_out/markdown/<stem>.raw.json
  ocr_out/figures/<stem>/*.jpeg
"""

from __future__ import annotations

import base64
import json
import os
import re
import sys
from pathlib import Path

from dotenv import load_dotenv
from mistralai.client.sdk import Mistral
from mistralai.extra import response_format_from_pydantic_model
from pydantic import BaseModel, Field

ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / ".env")

MD_DIR = ROOT / "ocr_out" / "markdown"
FIG_DIR = ROOT / "ocr_out" / "figures"
MD_DIR.mkdir(parents=True, exist_ok=True)
FIG_DIR.mkdir(parents=True, exist_ok=True)


class FigureAnno(BaseModel):
    figure_type: str = Field(
        description="One of: diagram, table, pseudocode, chart, photo, formula, other"
    )
    short_description: str = Field(
        description="Japanese, one sentence, describing the figure content"
    )


def ocr_pdf(pdf_path: Path) -> dict:
    client = Mistral(api_key=os.environ["MISTRAL_API_KEY"])

    uploaded = client.files.upload(
        file={"file_name": pdf_path.name, "content": pdf_path.read_bytes()},
        purpose="ocr",
    )
    url = client.files.get_signed_url(file_id=uploaded.id).url

    resp = client.ocr.process(
        model="mistral-ocr-latest",
        document={"type": "document_url", "document_url": url},
        include_image_base64=True,
        image_min_size=0,
        image_limit=500,
        bbox_annotation_format=response_format_from_pydantic_model(FigureAnno),
    )
    return resp.model_dump()


def save_outputs(pdf_stem: str, ocr: dict) -> None:
    (MD_DIR / f"{pdf_stem}.raw.json").write_text(
        json.dumps(ocr, ensure_ascii=False, indent=2)
    )

    fig_subdir = FIG_DIR / pdf_stem
    fig_subdir.mkdir(parents=True, exist_ok=True)

    md_parts: list[str] = []
    for page in ocr.get("pages", []):
        idx = page.get("index", 0)
        page_md = page.get("markdown", "")

        for img in page.get("images", []):
            img_id = img.get("id")
            b64 = img.get("image_base64") or ""
            if not (img_id and b64):
                continue
            if b64.startswith("data:"):
                b64 = b64.split(",", 1)[1]
            new_name = f"p{idx:03d}_{img_id}"
            (fig_subdir / new_name).write_bytes(base64.b64decode(b64))
            rel = f"../figures/{pdf_stem}/{new_name}"
            page_md = re.sub(
                rf"!\[{re.escape(img_id)}\]\({re.escape(img_id)}\)",
                f"![{new_name}]({rel})",
                page_md,
            )

            anno = img.get("image_annotation")
            if anno:
                try:
                    parsed = json.loads(anno) if isinstance(anno, str) else anno
                    desc = parsed.get("short_description", "")
                    ftype = parsed.get("figure_type", "")
                    if desc:
                        page_md = page_md.replace(
                            f"![{new_name}]({rel})",
                            f"![{new_name}]({rel})\n\n> _{ftype}_: {desc}",
                        )
                except Exception:
                    pass

        md_parts.append(f"\n\n<!-- page {idx} -->\n\n{page_md}")

    (MD_DIR / f"{pdf_stem}.md").write_text("".join(md_parts))


def main() -> None:
    if len(sys.argv) != 2:
        print(__doc__)
        sys.exit(1)
    pdf_path = Path(sys.argv[1]).resolve()
    if not pdf_path.exists():
        print(f"not found: {pdf_path}", file=sys.stderr)
        sys.exit(1)

    print(f"OCR -> {pdf_path.name}")
    ocr = ocr_pdf(pdf_path)
    save_outputs(pdf_path.stem, ocr)
    pages = len(ocr.get("pages", []))
    imgs = sum(len(p.get("images", [])) for p in ocr.get("pages", []))
    print(
        f"  pages={pages}  figures={imgs}  "
        f"md=ocr_out/markdown/{pdf_path.stem}.md"
    )


if __name__ == "__main__":
    main()
