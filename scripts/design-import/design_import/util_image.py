"""Shared PIL/numpy helpers used across pipeline steps."""

from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

from .config import TextRegion


def build_text_mask(size: tuple[int, int], regions: list[TextRegion], margin_px: int) -> Image.Image:
    """A white-on-black L-mode mask marking pixels to inpaint away.

    Each region's bbox is expanded by `margin_px` on every side to
    swallow anti-aliased glyph edges — this is what structurally avoids
    the "ghosting" bug we hit color-keying by hand (that approach left
    partially-opaque text-edge pixels because they sat ON the color line
    between text and background color, not close enough to either
    endpoint). Inpainting only cares about the mask geometry, not color.
    """
    mask = Image.new("L", size, 0)
    draw = ImageDraw.Draw(mask)
    for region in regions:
        x, y, w, h = region.bbox_px
        # A flat pixel margin under-covers oversized display numerals/
        # display text, where OCR's detected bbox is often tighter than
        # the glyph's true rendered extent (seen on fixtures/1.svg's
        # large "23" date numeral) — scale the margin with region size
        # too, not just a fixed constant.
        margin = max(margin_px, int(h * 0.35))
        draw.rectangle(
            [x - margin, y - margin, x + w + margin, y + h + margin],
            fill=255,
        )
    # Soften the mask edge slightly so inpainting blends rather than
    # leaving a hard-edged patch seam.
    return mask.filter(ImageFilter.GaussianBlur(radius=2))


def feathered_crop(im: Image.Image, bbox_px: tuple[int, int, int, int], feather_px: int = 24) -> Image.Image:
    """Crop `bbox_px` from `im` (already RGBA) with the crop's own alpha
    channel feathered at the edges, so the result blends into a page
    instead of reading as a pasted-on rectangle (the "hard edge" bug from
    the hand-built corner-bloom asset)."""
    x, y, w, h = bbox_px
    cropped = im.crop((x, y, x + w, y + h)).convert("RGBA")

    # Build a feather mask: full alpha in the interior, fading to 0 within
    # `feather_px` of each edge — multiplied into the crop's existing alpha
    # so any transparency already present (e.g. from a prior inpaint edge)
    # is preserved, not overridden.
    feather = Image.new("L", cropped.size, 255)
    draw = ImageDraw.Draw(feather)
    for i in range(feather_px):
        alpha_val = int(255 * (i / feather_px))
        draw.rectangle([i, i, cropped.width - 1 - i, cropped.height - 1 - i], outline=alpha_val)
    feather = feather.filter(ImageFilter.GaussianBlur(radius=feather_px / 4))

    r, g, b, a = cropped.split()
    a_arr = np.minimum(np.array(a), np.array(feather))
    cropped.putalpha(Image.fromarray(a_arr))
    return cropped


def trim_to_content(im: Image.Image) -> Image.Image:
    """Tight-crop to the non-fully-transparent bounding box."""
    bbox = im.getbbox()
    return im.crop(bbox) if bbox else im


def save_webp(im: Image.Image, path: Path, max_width: int | None = None, quality: int = 88) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if max_width and im.width > max_width:
        scale = max_width / im.width
        im = im.resize((max_width, int(im.height * scale)), Image.LANCZOS)
    im.save(path, "WEBP", quality=quality, method=6)
