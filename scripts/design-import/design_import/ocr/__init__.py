"""Pluggable OCR backend protocol.

`doctr` is the default: local, free, no credentials — the tool must work
end-to-end with zero cloud setup. `vision` (Google Cloud Vision) is an
opt-in upgrade for real ornate/script designs where docTR's recall is
too weak; it requires GOOGLE_APPLICATION_CREDENTIALS and the optional
`google-cloud-vision` package (see requirements-vision.txt).
"""

from __future__ import annotations

from pathlib import Path
from typing import Protocol

from ..config import OcrBackendName, TextRegion


class OcrBackend(Protocol):
    def detect(self, raster_png_path: Path) -> list[TextRegion]: ...


def get_backend(name: OcrBackendName) -> OcrBackend:
    if name == "vision":
        from .vision_backend import VisionOcrBackend

        return VisionOcrBackend()
    from .doctr_backend import DoctrOcrBackend

    return DoctrOcrBackend()
