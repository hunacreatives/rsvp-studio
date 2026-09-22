"""Step 2: rasterize the SVG via rsvg-convert (Homebrew: `brew install librsvg`).

We shell out rather than use a Python SVG renderer because rsvg-convert is
what we already validated this session against these exact malformed/huge
export files (see the 26MB fixture) — cairosvg and similar pure-Python
renderers choke or differ subtly on complex clip-path nesting.
"""

import shutil
import subprocess
from pathlib import Path

from PIL import Image


def rasterize(svg_path: Path, out_png: Path, scale: float = 3.0) -> tuple[int, int]:
    """Renders svg_path to out_png at `scale`x the SVG's intrinsic size.
    Returns (width_px, height_px) of the produced raster."""
    if shutil.which("rsvg-convert") is None:
        raise RuntimeError(
            "rsvg-convert not found on PATH. Install it with `brew install librsvg` "
            "(see scripts/design-import/README.md)."
        )

    out_png.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        [
            "rsvg-convert",
            f"--zoom={scale}",
            "--keep-aspect-ratio",
            str(svg_path),
            "-o",
            str(out_png),
        ],
        check=True,
        capture_output=True,
    )

    with Image.open(out_png) as im:
        return im.size
