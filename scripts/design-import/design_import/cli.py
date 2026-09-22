"""Entrypoint: python -m design_import <svg> --out <dir> [options]

See README.md for setup and the worked fixtures/1.svg example.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from PIL import Image

from .config import PipelineConfig
from .ocr import get_backend
from .rasterize import rasterize
from .region_extract import extract_regions, load_manual_regions, propose_auto_regions
from .report import build_report, write_report
from .svg_text_probe import probe_text_nodes
from .util_image import build_text_mask


def parse_args(argv: list[str]) -> PipelineConfig:
    parser = argparse.ArgumentParser(description="Extract editable text + clean art from a design SVG.")
    parser.add_argument("svg", type=Path)
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--ocr-backend", choices=["doctr", "vision"], default="doctr")
    parser.add_argument("--scale", type=float, default=6.0)
    parser.add_argument("--regions", choices=["manual", "auto-bbox"], default="manual")
    parser.add_argument("--regions-file", type=Path, default=None)
    args = parser.parse_args(argv)

    return PipelineConfig(
        svg_path=args.svg,
        out_dir=args.out,
        ocr_backend=args.ocr_backend,
        scale=args.scale,
        regions_file=args.regions_file,
        auto_bbox=args.regions == "auto-bbox",
    )


def run(config: PipelineConfig) -> None:
    out_dir = config.resolved_out_dir()

    # Step 1: cheap short-circuit for real <text> nodes (SVG user-space,
    # not raster pixels — kept separate from OCR regions until report time).
    svg_text_regions = probe_text_nodes(config.svg_path)
    if svg_text_regions:
        print(f"[design-import] found {len(svg_text_regions)} real <text> node(s) — skipping OCR for those.")

    # Step 2: rasterize.
    raster_path = out_dir / "debug" / "01-raster.png"
    width, height = rasterize(config.svg_path, raster_path, scale=config.scale)
    print(f"[design-import] rasterized at {width}x{height} (scale={config.scale})")

    # Step 3: OCR (only needed when the SVG had no usable real text nodes,
    # or to catch anything the probe missed within a mixed document).
    ocr_regions = []
    if not svg_text_regions:
        backend = get_backend(config.ocr_backend)
        print(f"[design-import] running OCR backend '{config.ocr_backend}'...")
        ocr_regions = backend.detect(raster_path)
        print(f"[design-import] OCR found {len(ocr_regions)} text region(s).")

    all_text_regions = svg_text_regions + ocr_regions

    # Step 4-5: mask + inpaint (raster-space regions only — svg-text-node
    # regions from a NON-outlined source have nothing baked into the
    # raster to remove, so they're excluded from the mask).
    raster_only_regions = [r for r in all_text_regions if r.source == "ocr"]
    with Image.open(raster_path) as im:
        mask = build_text_mask(im.size, raster_only_regions, config.text_mask_margin_px)

    clean_bg_path = out_dir / "full-clean.webp"
    if raster_only_regions:
        from .inpaint import inpaint

        inpainted_png = out_dir / "debug" / "04-inpainted.png"
        inpaint(raster_path, mask, inpainted_png)
        with Image.open(inpainted_png) as im:
            im.convert("RGBA").save(clean_bg_path, "WEBP", quality=90, method=6)
        print(f"[design-import] inpainted clean background -> {clean_bg_path}")
    else:
        with Image.open(raster_path) as im:
            im.convert("RGBA").save(clean_bg_path, "WEBP", quality=90, method=6)
        print("[design-import] no raster text found to inpaint — clean background is the raw raster.")

    # Step 6: region extraction.
    art_regions = []
    if config.auto_bbox:
        proposal_file = out_dir / "regions.json"
        with Image.open(clean_bg_path) as clean_bg:
            # Rough background estimate: sample the corner pixel.
            corner = clean_bg.convert("RGB").getpixel((2, 2))
            bg_hex = "#%02x%02x%02x" % corner
        propose_auto_regions(Image.open(clean_bg_path), bg_hex, proposal_file)
        print(f"[design-import] wrote candidate regions to {proposal_file} — review/edit, then re-run with --regions manual --regions-file {proposal_file}")
    elif config.regions_file:
        manual_regions = load_manual_regions(config.regions_file)
        with Image.open(clean_bg_path) as clean_bg:
            art_regions = extract_regions(clean_bg, manual_regions, out_dir / "art")
        print(f"[design-import] extracted {len(art_regions)} art region(s).")
    else:
        print("[design-import] no --regions-file given — skipping region extraction (pass --regions-file or --regions auto-bbox).")

    # Step 7: report.
    report = build_report(
        design_id=config.design_id,
        raster_size=(width, height),
        scale_from_svg=config.scale,
        ocr_backend=config.ocr_backend,
        text_elements=all_text_regions,
        art_regions=art_regions,
        full_clean_background=clean_bg_path.name,
    )
    report_path = out_dir / "extraction-report.json"
    write_report(report, report_path)
    print(f"[design-import] wrote {report_path}")


def main() -> None:
    config = parse_args(sys.argv[1:])
    run(config)


if __name__ == "__main__":
    main()
