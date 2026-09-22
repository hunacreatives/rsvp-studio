"""Step 6: extract chosen art sub-regions from the inpainted clean background.

v1 deliberately does NOT auto-segment "which blob of pixels is one
coherent decorative asset" — that's a design judgment call (see decision
log), not a solvable CV problem on its own, and a human already reviews
the output. Two supported modes:

  - manual (default): a human-authored regions.json (list of
    {id, bbox_px: [x,y,w,h], suggested_role}).
  - auto-bbox: a cheap connected-components pass over non-background
    alpha to PROPOSE a starting regions.json for the human to edit —
    written to disk and the run stops there (no crop yet) so the human
    can adjust before re-running with --regions manual.
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

from .config import ArtRegion
from .util_image import feathered_crop, save_webp, trim_to_content


def load_manual_regions(regions_file: Path) -> list[dict]:
    return json.loads(regions_file.read_text())["regions"]


def propose_auto_regions(clean_bg: Image.Image, background_hex: str, out_file: Path, min_area_px: int = 4000) -> Path:
    """Flood-fill-style background estimate + connected components to
    propose candidate bboxes. Intentionally coarse — a starting point for
    human review, not a final answer (see module docstring)."""
    bg_rgb = tuple(int(background_hex.lstrip("#")[i : i + 2], 16) for i in (0, 2, 4))
    arr = np.array(clean_bg.convert("RGB")).astype(np.int16)
    dist = np.sqrt(((arr - np.array(bg_rgb)) ** 2).sum(axis=2))
    foreground = dist > 24  # not-background pixels

    labeled, n = ndimage.label(foreground)
    proposals = []
    for i in range(1, n + 1):
        ys, xs = np.where(labeled == i)
        if len(xs) < min_area_px:
            continue
        x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
        proposals.append(
            {
                "id": f"region-{len(proposals):03d}",
                "bbox_px": [int(x0), int(y0), int(x1 - x0), int(y1 - y0)],
                "suggested_role": "",
            }
        )

    out_file.write_text(json.dumps({"regions": proposals}, indent=2))
    return out_file


def extract_regions(clean_bg: Image.Image, regions: list[dict], art_dir: Path) -> list[ArtRegion]:
    clean_bg = clean_bg.convert("RGBA")
    results: list[ArtRegion] = []
    for r in regions:
        bbox = tuple(r["bbox_px"])  # x, y, w, h
        cropped = feathered_crop(clean_bg, bbox)
        cropped = trim_to_content(cropped)

        filename = f"{r['id']}.webp"
        save_webp(cropped, art_dir / filename, max_width=1400)

        results.append(
            ArtRegion(
                id=r["id"],
                bbox_px=bbox,
                file=f"art/{filename}",
                suggested_role=r.get("suggested_role", ""),
            )
        )
    return results
