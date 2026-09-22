"""Shared config/dataclasses for the design-import pipeline.

Kept deliberately small — this is a v1 on-demand CLI, not a configurable
service. Add fields here only when a real second run needs them (see
v2-deferred list in docs/template-builder-decisions.md).
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Literal

OcrBackendName = Literal["doctr", "vision"]


@dataclass
class PipelineConfig:
    svg_path: Path
    out_dir: Path
    ocr_backend: OcrBackendName = "doctr"
    # Applied to the SVG's own declared intrinsic size (rsvg-convert
    # --zoom), which is often much smaller than its viewBox complexity
    # suggests — e.g. fixtures/1.svg declares ~397x559 units despite being
    # a 26MB file, so scale=3 alone only yields ~1200px wide. 6x targets
    # ~2300px wide for that fixture, in the range OCR/inpainting need.
    scale: float = 6.0
    # Pixels of dilation applied to each OCR bbox before inpainting, at
    # raster scale. Swallows anti-aliased text edges — this is what
    # structurally fixes the "ghosting" bug the color-key approach hit.
    text_mask_margin_px: int = 6
    regions_file: Path | None = None
    auto_bbox: bool = False

    @property
    def design_id(self) -> str:
        return self.svg_path.stem

    def resolved_out_dir(self) -> Path:
        d = self.out_dir
        d.mkdir(parents=True, exist_ok=True)
        (d / "art").mkdir(exist_ok=True)
        (d / "debug").mkdir(exist_ok=True)
        return d


@dataclass
class TextRegion:
    """One detected (or directly-read) text element, in RASTER pixel space."""

    bbox_px: tuple[int, int, int, int]  # x, y, width, height
    text: str
    confidence: float
    source: Literal["ocr", "svg-text-node"] = "ocr"
    approx_color_hex: str | None = None
    approx_font_size_px: float | None = None


@dataclass
class ArtRegion:
    id: str
    bbox_px: tuple[int, int, int, int]
    file: str
    has_alpha: bool = True
    suggested_role: str = ""
