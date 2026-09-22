import type { PaletteOption } from "./types";

// Curated palettes only — no open color picker. Swatches are drawn from
// RSVP Studio's existing --acc-* design tokens (src/index.css) plus its
// neutral --ink/--warm-white/--paper tokens, so a wedding site's palette
// always stays visually related to the platform's own brand system rather
// than introducing arbitrary hex values per couple.
//
// Convention (see templates/editorial-formal/theme.ts): swatches[0] =
// background, swatches[1] = ink/primary, swatches[2] = muted TEXT color —
// must stay legible against swatches[0], so use --slate (#868697), never
// --line (#e7e7e0), which is a border color, not a text color.

export const palettes: PaletteOption[] = [
  {
    id: "ivory-ink",
    label: "Ivory & Ink",
    swatches: ["#fffff9", "#000727", "#868697"],
  },
  {
    id: "paper-indigo",
    label: "Paper & Indigo",
    swatches: ["#f5f5f2", "#25265e", "#868697"],
  },
  {
    id: "warm-coral",
    label: "Warm Coral",
    swatches: ["#fffff9", "#ff7052", "#868697"],
  },
  {
    id: "sky-slate",
    label: "Sky & Slate",
    swatches: ["#f5f5f2", "#3fb6dc", "#868697"],
  },
  {
    // Sampled directly from the reference invitation design (Figma /
    // downloads/Templates/Wedding/1.svg) rather than picked by eye —
    // background #fff4e4 and ink #520606 are exact pixel samples.
    id: "burgundy-cream",
    label: "Burgundy & Cream",
    swatches: ["#fff4e4", "#520606", "#8a7060"],
  },
  {
    // Sampled directly from the "Dark Red Beige Romantic Scrapbook"
    // reference design (scripts/design-import worked example).
    id: "maroon-linen",
    label: "Maroon & Linen",
    swatches: ["#e5d7c1", "#7c2120", "#8a6a58"],
  },
  {
    // From the "gel-at-30" reference site's real Tailwind tokens
    // (tailwind.config.ts: cream/blush/sage), not picked by eye — a
    // rose/mauve primary against sage-green secondary, the one palette
    // in this set using two distinct accent hues rather than one ink
    // color plus a neutral gray.
    id: "blush-sage",
    label: "Blush & Sage",
    swatches: ["#faf6f1", "#c0606e", "#8b9a6e"],
  },
];

export const defaultPaletteId = palettes[0].id;
