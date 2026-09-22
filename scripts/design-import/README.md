# design-import

Internal CLI that extracts editable text + clean decorative art from a
flat SVG design export (typically an auto-traced/outlined file with no
real `<text>` nodes — see `docs/template-builder-decisions.md` for why
this exists and what problem it replaces).

It does **not** produce a finished template. It produces:
- clean, transparent-background art assets (`art/region-NNN.webp`)
- a full inpainted background with all text removed (`full-clean.webp`)
- `extraction-report.json`: recovered text (content, position, approx
  color/size) and art region metadata, as hints for a human (or Claude,
  in a later session) to hand-wire into a real template section — the
  same way `src/pages/wedding-sites/templates/botanical/sections/Hero.tsx`
  was hand-built, just without the manual cropping/color-keying pain.

## Setup

Prerequisite: `rsvg-convert` — `brew install librsvg` (already installed
if you did the botanical template work this session).

```bash
cd scripts/design-import
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
# optional, only if you want the Google Cloud Vision OCR backend:
.venv/bin/pip install -r requirements-vision.txt
```

First run of docTR and IOPaint each download model weights once
(a few hundred MB total) — this is normal and only happens once.

## Usage

```bash
# Step A: run OCR + inpaint, and get a starting set of candidate art regions
.venv/bin/python -m design_import fixtures/1.svg \
  --out output/botanical-1 \
  --regions auto-bbox

# Review output/botanical-1/regions.json against
# output/botanical-1/debug/01-raster.png, adjust bboxes/ids by hand.

# Step B: re-run with your reviewed regions to actually crop the art
.venv/bin/python -m design_import fixtures/1.svg \
  --out output/botanical-1 \
  --regions manual --regions-file output/botanical-1/regions.json
```

Use `--ocr-backend vision` for stronger recall on ornate/script fonts
(requires `requirements-vision.txt` installed and
`GOOGLE_APPLICATION_CREDENTIALS` set to a service-account key — costs
~$1.50/1000 images, negligible at our volume of a few designs a month).

## Output

```
output/<design-id>/
├── extraction-report.json   # recovered text + art region metadata (see shape below)
├── full-clean.webp          # full canvas, text removed via inpainting
├── regions.json             # candidate or hand-edited art region bboxes
├── art/
│   └── region-NNN.webp      # one cropped, feathered-edge art asset per region
└── debug/
    ├── 01-raster.png        # the rasterized SVG
    └── 04-inpainted.png     # pre-webp inpaint result, for QA
```

`extraction-report.json` shape (abridged — see `design_import/report.py`
for the exact fields):

```jsonc
{
  "designId": "1",
  "raster": { "widthPx": 2382, "heightPx": 3354, "scaleFromSvg": 6.0 },
  "ocrBackend": "doctr",
  "textElements": [
    {
      "source": "ocr",                 // or "svg-text-node" if the SVG had real text
      "recoveredText": "Dani Martinez",
      "confidence": 0.71,
      "needsHumanReview": true,
      "bboxNormalized": { "x": 0.33, "y": 0.31, "width": 0.35, "height": 0.06 },
      "suggestedEventContentField": ""  // best-guess hint only, always confirm by hand
    }
  ],
  "artRegions": [
    { "id": "region-000", "file": "art/region-000.webp", "bboxNormalized": { ... } }
  ]
}
```

`bboxNormalized` (0..1) is deliberate: it maps directly onto the CSS
`%`/`clamp()` positioning already used in `Hero.tsx`, regardless of the
final rendered size.

## What this tool deliberately does NOT do (v1 scope)

- Does not attempt to reverse-engineer "this SVG path cluster used to be
  `<text>`" — research confirmed that's not reliably solvable once text
  has been outlined. It always falls back to rasterize+OCR+inpaint.
- Does not auto-map recovered text onto `EventContent` fields —
  `suggestedEventContentField` is a coarse hint (see `report.py:_guess_field`),
  a human confirms the real mapping.
- Does not auto-segment art regions from scratch — `--regions auto-bbox`
  proposes candidates, a human reviews/adjusts before the final crop.
- Does not write the final template TSX — that stays hand-authored,
  same process as `templates/botanical/`.

See the plan doc / decision log for the full v1-vs-v2 scope rationale.

## Why Python, not Node

This is a pure image-processing pipeline (OCR + inpainting); nothing in
`package.json` handles images today (no `sharp`/`svgo`/etc.), and the
Python ecosystem (`python-doctr`, `iopaint`) is where this tooling
actually lives. It never runs as part of the Vite build or ships to
users — it's a standalone terminal tool, like `supabase/` and `api/` are
their own non-bundled top-level directories in this repo.
