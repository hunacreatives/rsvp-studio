"""Local, free, zero-credential OCR backend using docTR.

Weaker than Google Cloud Vision on ornate script/calligraphy fonts (see
docs/template-builder-decisions.md decision log for this tool), but keeps
the default path fully offline. Model weights download once on first use
(~few hundred MB) and are cached by docTR itself.
"""

from __future__ import annotations

from pathlib import Path

from ..config import TextRegion


class DoctrOcrBackend:
    def __init__(self) -> None:
        self._model = None

    def _load(self):
        if self._model is None:
            from doctr.models import ocr_predictor

            self._model = ocr_predictor(pretrained=True)
        return self._model

    def detect(self, raster_png_path: Path) -> list[TextRegion]:
        from doctr.io import DocumentFile
        from PIL import Image

        with Image.open(raster_png_path) as im:
            width, height = im.size

        model = self._load()
        doc = DocumentFile.from_images(str(raster_png_path))
        result = model(doc)

        regions: list[TextRegion] = []
        for page in result.pages:
            for block in page.blocks:
                for line in block.lines:
                    words = [w.value for w in line.words]
                    if not words:
                        continue
                    text = " ".join(words)
                    confidences = [w.confidence for w in line.words]
                    confidence = sum(confidences) / len(confidences)

                    (x0, y0), (x1, y1) = line.geometry
                    bbox_px = (
                        int(x0 * width),
                        int(y0 * height),
                        int((x1 - x0) * width),
                        int((y1 - y0) * height),
                    )
                    regions.append(
                        TextRegion(
                            bbox_px=bbox_px,
                            text=text,
                            confidence=float(confidence),
                            source="ocr",
                        )
                    )

        return regions
