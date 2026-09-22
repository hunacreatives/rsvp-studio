"""Step 5: remove text from the raster via IOPaint (LaMa model).

Runs locally on CPU/MPS, no GPU required at our volume (a few designs a
month). LaMa is Apache 2.0 — commercial-safe. This replaces the manual
color-distance keying entirely: inpainting fills the masked region using
the surrounding art's own texture, so it doesn't have the "ghosting vs.
eating real art" tradeoff color-keying hit on colors close to the
text/background line (e.g. pale pink flowers near cream text).
"""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

from PIL import Image


def inpaint(raster_png: Path, mask: Image.Image, out_png: Path) -> Path:
    mask_path = out_png.parent / "debug" / "text-mask.png"
    mask_path.parent.mkdir(parents=True, exist_ok=True)
    mask.save(mask_path)

    out_png.parent.mkdir(parents=True, exist_ok=True)

    # IOPaint's `run` subcommand processes one image against one mask in
    # batch mode without starting its web server — the right shape for a
    # one-off CLI step. See scripts/design-import/README.md for install
    # notes (first run downloads the LaMa weights, ~200MB, one-time).
    subprocess.run(
        [
            sys.executable,
            "-m",
            "iopaint",
            "run",
            "--model",
            "lama",
            "--device",
            "cpu",
            "--image",
            str(raster_png),
            "--mask",
            str(mask_path),
            "--output",
            str(out_png.parent),
        ],
        check=True,
    )

    # IOPaint names its output after the input file; normalize to our
    # expected out_png path if it differs.
    produced = out_png.parent / raster_png.name
    if produced.exists() and produced != out_png:
        produced.rename(out_png)

    return out_png
