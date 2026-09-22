"""Step 7: emit extraction-report.json.

Deliberately hint-only where we can't be confident (suggestedEventContentField,
suggestedRole are free-text guesses, not an enum contract) — the human/Claude
assembling the actual template section still makes the final call. See
Architecture Decision 3 in the plan / decision log: this tool produces a
strong first draft, not a finished template.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

from .config import ArtRegion, OcrBackendName, TextRegion

# Very coarse content-role guesses from text shape alone — genuinely just
# a hint to speed up human review, not a classifier. Refine only once
# we've seen a second/third real design's patterns (v2-deferred: real
# auto-mapping).
def _guess_field(text: str) -> str:
    lowered = text.lower()
    if "&" in text or " and " in lowered:
        return "hosts[0].name + hosts[1].name"
    if any(month in lowered for month in ("jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec")):
        return "eventDate"
    if any(word in lowered for word in ("street", "st.", "avenue", "ave", "road", "rd", "venue", "location")):
        return "primaryLocation"
    if any(word in lowered for word in ("rsvp", "invit")):
        return "(decorative label, not event data)"
    return ""


def build_report(
    design_id: str,
    raster_size: tuple[int, int],
    scale_from_svg: float,
    ocr_backend: OcrBackendName,
    text_elements: list[TextRegion],
    art_regions: list[ArtRegion],
    full_clean_background: str,
) -> dict:
    width, height = raster_size
    warnings: list[str] = []

    low_confidence = [t for t in text_elements if t.confidence < 0.6]
    if low_confidence:
        warnings.append(f"{len(low_confidence)} text regions had confidence < 0.6 — manual transcription recommended")

    text_out = []
    for i, t in enumerate(text_elements):
        x, y, w, h = t.bbox_px
        text_out.append(
            {
                "id": f"text-{i:03d}",
                "source": t.source,
                "recoveredText": t.text,
                "confidence": round(t.confidence, 3),
                "needsHumanReview": t.confidence < 0.85 or t.source == "ocr",
                "bboxPx": {"x": x, "y": y, "width": w, "height": h},
                "bboxNormalized": {
                    "x": round(x / width, 4),
                    "y": round(y / height, 4),
                    "width": round(w / width, 4),
                    "height": round(h / height, 4),
                },
                "approxColorHex": t.approx_color_hex,
                "approxFontSizePx": t.approx_font_size_px,
                "suggestedEventContentField": _guess_field(t.text),
                "notes": "",
            }
        )

    art_out = []
    for r in art_regions:
        x, y, w, h = r.bbox_px
        art_out.append(
            {
                "id": r.id,
                "file": r.file,
                "bboxPx": {"x": x, "y": y, "width": w, "height": h},
                "bboxNormalized": {
                    "x": round(x / width, 4),
                    "y": round(y / height, 4),
                    "width": round(w / width, 4),
                    "height": round(h / height, 4),
                },
                "suggestedRole": r.suggested_role,
                "hasAlpha": r.has_alpha,
            }
        )

    return {
        "designId": design_id,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "raster": {"widthPx": width, "heightPx": height, "scaleFromSvg": scale_from_svg},
        "ocrBackend": ocr_backend,
        "textElements": text_out,
        "artRegions": art_out,
        "fullCleanBackground": full_clean_background,
        "warnings": warnings,
    }


def write_report(report: dict, out_file: Path) -> None:
    out_file.write_text(json.dumps(report, indent=2))
