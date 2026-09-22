import type { FontPairingOption } from "./types";

// Curated font pairings only — no open font picker, no independent
// heading/body selection (a pairing is swapped as a unit; see
// docs/template-builder-decisions.md). Starts from RSVP Studio's own
// existing --font-display/--font-body tokens (src/index.css) as the
// default, then adds two more vetted pairings.

export const fontPairings: FontPairingOption[] = [
  {
    id: "lora-inter",
    label: "Lora & Inter",
    displayFont: '"Lora", Georgia, "Times New Roman", serif',
    bodyFont: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  {
    id: "playfair-source-sans",
    label: "Playfair Display & Source Sans",
    displayFont: '"Playfair Display", Georgia, serif',
    bodyFont: '"Source Sans 3", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  {
    id: "cormorant-work-sans",
    label: "Cormorant & Work Sans",
    displayFont: '"Cormorant Garamond", Georgia, serif',
    bodyFont: '"Work Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  {
    id: "dancing-cormorant",
    label: "Dancing Script & Cormorant",
    displayFont: '"Dancing Script", cursive',
    bodyFont: '"Cormorant Garamond", Georgia, serif',
  },
  {
    // The scrapbook reference's casual handwriting headings pair with a
    // plain sans body (not a serif) — a genuinely different combination
    // from the other script pairing above.
    id: "dancing-inter",
    label: "Dancing Script & Inter",
    displayFont: '"Dancing Script", cursive',
    bodyFont: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  {
    // From the "gel-at-30" reference: a heavier brush-script headline
    // ("Homemade Apple") over a lighter, looser handwritten body
    // ("Caveat") — both cursive, unlike every other pairing here which
    // sets one script/serif display against a plain sans/serif body.
    id: "homemade-caveat",
    label: "Homemade Apple & Caveat",
    displayFont: '"Homemade Apple", cursive',
    bodyFont: '"Caveat", cursive',
  },
];

export const defaultFontPairingId = fontPairings[0].id;
