"""Smoke-test Mistral OCR bbox_annotation on our scanned IT-Passport PDF.

Goal: verify whether bbox-level figure detection + in-markdown ![]() image
references work on a PDF whose every page is a single big JPEG scan.
"""

from __future__ import annotations

import base64
import json
import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from mistralai.client.sdk import Mistral
from mistralai.extra import response_format_from_pydantic_model
from pydantic import BaseModel, Field

ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / ".env")

OUT = ROOT / "ocr_out" / "bbox_test"
OUT.mkdir(parents=True, exist_ok=True)


class FigureAnno(BaseModel):
    figure_type: str = Field(description="e.g. diagram, table, pseudocode, chart, photo, none")
    short_description: str = Field(description="<= 1 sentence in Japanese describing the figure content")


def main() -> None:
    pdf = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "download" / "2025r07_ip_qs.pdf"
    pages_arg = sys.argv[2] if len(sys.argv) > 2 else "0-10"
    # parse pages_arg like "0-10" or "5,6,7"
    if "-" in pages_arg:
        a, b = (int(x) for x in pages_arg.split("-"))
        pages = list(range(a, b + 1))
    else:
        pages = [int(x) for x in pages_arg.split(",")]

    client = Mistral(api_key=os.environ["MISTRAL_API_KEY"])
    up = client.files.upload(
        file={"file_name": pdf.name, "content": pdf.read_bytes()}, purpose="ocr"
    )
    url = client.files.get_signed_url(file_id=up.id).url

    print(f"OCR {pdf.name} pages={pages}")
    resp = client.ocr.process(
        model="mistral-ocr-latest",
        document={"type": "document_url", "document_url": url},
        pages=pages,
        include_image_base64=True,
        image_min_size=0,
        image_limit=200,
        bbox_annotation_format=response_format_from_pydantic_model(FigureAnno),
    )
    data = resp.model_dump()

    (OUT / f"{pdf.stem}_bbox.raw.json").write_text(json.dumps(data, ensure_ascii=False, indent=2))

    total_imgs = 0
    for page in data.get("pages", []):
        imgs = page.get("images", [])
        total_imgs += len(imgs)
        print(f"  page {page['index']}: images={len(imgs)}")
        for img in imgs:
            anno = img.get("image_annotation")
            bbox = (img.get("top_left_x"), img.get("top_left_y"), img.get("bottom_right_x"), img.get("bottom_right_y"))
            print(f"    - id={img.get('id')} bbox={bbox} anno={anno}")
            b64 = img.get("image_base64") or ""
            if b64.startswith("data:"):
                b64 = b64.split(",", 1)[1]
            if b64 and img.get("id"):
                (OUT / img["id"]).write_bytes(base64.b64decode(b64))
    print(f"TOTAL IMAGES: {total_imgs}")


if __name__ == "__main__":
    main()
