"""Google Cloud Vision OCR backend — opt-in, requires:
  - `pip install -r requirements-vision.txt`
  - GOOGLE_APPLICATION_CREDENTIALS env var pointing at a service-account key

Stronger general recall than docTR (~$1.50/1000 images, negligible at our
volume) but still not specialized for calligraphy — expect to still
manually correct recovered text on ornate designs.
"""

from __future__ import annotations

from pathlib import Path

from ..config import TextRegion


class VisionOcrBackend:
    def detect(self, raster_png_path: Path) -> list[TextRegion]:
        try:
            from google.cloud import vision
        except ImportError as exc:
            raise RuntimeError(
                "google-cloud-vision is not installed. Run "
                "`pip install -r requirements-vision.txt` and set "
                "GOOGLE_APPLICATION_CREDENTIALS to use --ocr-backend vision."
            ) from exc

        client = vision.ImageAnnotatorClient()
        with open(raster_png_path, "rb") as f:
            content = f.read()

        image = vision.Image(content=content)
        response = client.document_text_detection(image=image)
        if response.error.message:
            raise RuntimeError(f"Vision API error: {response.error.message}")

        regions: list[TextRegion] = []
        for page in response.full_text_annotation.pages:
            for block in page.blocks:
                for paragraph in block.paragraphs:
                    text = "".join(
                        symbol.text for word in paragraph.words for symbol in word.symbols
                    )
                    if not text.strip():
                        continue
                    confidences = [word.confidence for word in paragraph.words]
                    confidence = sum(confidences) / len(confidences) if confidences else 0.0

                    xs = [v.x for v in paragraph.bounding_box.vertices]
                    ys = [v.y for v in paragraph.bounding_box.vertices]
                    x0, x1 = min(xs), max(xs)
                    y0, y1 = min(ys), max(ys)

                    regions.append(
                        TextRegion(
                            bbox_px=(x0, y0, x1 - x0, y1 - y0),
                            text=text,
                            confidence=float(confidence),
                            source="ocr",
                        )
                    )

        return regions
