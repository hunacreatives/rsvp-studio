"""Step 1: cheap short-circuit for real <text> nodes.

Most real-world exports we've hit (see fixtures/1.svg) have text already
outlined to paths — no <text>/<tspan> survives. But when a source SVG
DOES still have real text nodes, reading them directly is free and exact,
so always try this first before paying for rasterize+OCR.
"""

from __future__ import annotations

from pathlib import Path

from lxml import etree

from .config import TextRegion

SVG_NS = "http://www.w3.org/2000/svg"


def probe_text_nodes(svg_path: Path) -> list[TextRegion]:
    """Return any real <text> elements found in the SVG, in SVG user-space
    coordinates (NOT raster pixels — caller must scale if mixing with
    OCR-derived regions, which are always in raster pixel space)."""
    try:
        tree = etree.parse(str(svg_path))
    except etree.XMLSyntaxError:
        return []

    root = tree.getroot()
    regions: list[TextRegion] = []

    for text_el in root.iter(f"{{{SVG_NS}}}text"):
        content = "".join(text_el.itertext()).strip()
        if not content:
            continue

        x = float(text_el.get("x", "0") or "0")
        y = float(text_el.get("y", "0") or "0")
        font_size = text_el.get("font-size")
        fill = text_el.get("fill")

        # <text> has no intrinsic width/height attribute — bbox here is a
        # rough estimate (font-size-driven), good enough as a starting
        # hint; a human refines exact placement when wiring the template.
        approx_size = float(font_size) if font_size else 16.0
        approx_width = approx_size * 0.6 * len(content)

        regions.append(
            TextRegion(
                bbox_px=(int(x), int(y - approx_size), int(approx_width), int(approx_size * 1.2)),
                text=content,
                confidence=1.0,
                source="svg-text-node",
                approx_color_hex=fill,
                approx_font_size_px=approx_size,
            )
        )

    return regions
