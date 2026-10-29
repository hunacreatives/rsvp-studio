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
  {
    // The Pickleball template: a cream court, a deep court-green for the
    // frame and type, and a soft pink for the stripes and accents.
    id: "court-pink",
    label: "Court Pink & Green",
    swatches: ["#f8f3ea", "#1f6f55", "#eeb8c6"],
  },
  {
    // The Debut template: an ivory card, deep wine for the envelope and type,
    // and an antique gold for the seal and fine lines.
    id: "wine-gold",
    label: "Wine & Gold",
    swatches: ["#f4ede1", "#6b1f2b", "#b8914a"],
  },
  {
    // The Love Letter template: cream paper, olive felt for the envelope and
    // type, and a deep red for the date card.
    id: "olive-cream",
    label: "Olive & Cream",
    swatches: ["#f6f1e6", "#5b6234", "#8c2632"],
  },
  {
    // The Promenade template: a warm cream page, soft brown type, and a muted
    // gold for the seal, rules and timeline.
    id: "cream-gold",
    label: "Cream & Gold",
    swatches: ["#fbf6ec", "#4b4036", "#c2a06a"],
  },
  {
    // The Open Play template: a classic blue acrylic court with white lines; the area
    // around it is green, and the ball is optic yellow (both set by the template).
    id: "open-court",
    label: "Court Blue",
    swatches: ["#2f5d9e", "#ffffff", "#d7e2f4"],
  },
  {
    // Open Play's second scheme: a court under floodlights.
    id: "night-court",
    label: "Night Court",
    swatches: ["#13203a", "#f3efe4", "#a8b3c6"],
  },
  {
    // The Capiz template: a lime-plaster wall and narra-dark ink (the capiz panes, the
    // wood and the brass are set by the template).
    id: "capiz-plaster",
    label: "Plaster & Narra",
    swatches: ["#ede6da", "#2a211b", "#7d7064"],
  },
  {
    // Capiz's second scheme: the same house at night, the panes lit from inside.
    id: "capiz-gabi",
    label: "Candlelight",
    swatches: ["#1f1a16", "#efe6d6", "#a99b88"],
  },
  {
    // Calado: unbleached cotton and charcoal ink; the thread (blue) is set by the template.
    id: "calado-cotton",
    label: "Cotton & Blue Thread",
    swatches: ["#f3eee5", "#2e3439", "#857f74"],
  },
  {
    // Calado's second scheme: the same cotton with rose thread.
    id: "calado-rose",
    label: "Cotton & Rose Thread",
    swatches: ["#f5efe9", "#3a302d", "#8f8078"],
  },
  // The three Tinghun (engagement) designs, two schemes each. Red, gold and the motifs are
  // set by each template; these are the paper and the ink.
  { id: "rice-paper", label: "Rice Paper & Vermilion", swatches: ["#faf6ef", "#1f1b18", "#8c847a"] },
  { id: "rice-blush", label: "Blush Paper", swatches: ["#f6e9e4", "#2a1f1c", "#8c7a74"] },
  { id: "lacquer-cinnabar", label: "Cinnabar & Leaf Gold", swatches: ["#f5eee2", "#221a16", "#8a7563"] },
  { id: "lacquer-night", label: "Lacquer by Lamplight", swatches: ["#2a0f0c", "#f3e6d2", "#b59a7e"] },
  { id: "porcelain-blue", label: "Blue & White Porcelain", swatches: ["#f6f3ec", "#1d2f5c", "#7f8aa3"] },
  { id: "porcelain-celadon", label: "Celadon", swatches: ["#eef2ec", "#253a35", "#7d8f86"] },
  {
    // Under Glass: warm cream paper and dark narra ink (the foil follows the milestone).
    id: "under-glass",
    label: "Cream & Narra",
    swatches: ["#f4efe6", "#2a211c", "#7d7064"],
  },
  {
    // Under Glass's second scheme: a rosier paper.
    id: "under-glass-rose",
    label: "Rose & Walnut",
    swatches: ["#f6efea", "#33211d", "#81665d"],
  },
  {
    // The Blue: white on the ocean, a pale plate at the bottom (the sea is the design's own).
    id: "freedive",
    label: "Open Water",
    swatches: ["#0b4a72", "#ffffff", "#bcd7e6"],
  },
  {
    // Level Up: a game's HUD on the island (the world and the HUD are the design's own).
    id: "levelup",
    label: "Island HUD",
    swatches: ["#0a1628", "#7ff0ff", "#c6ff5e"],
  },
  {
    // Pixel Quest: cream words in night-blue pixel windows (the level and the HUD are the
    // design's own).
    id: "pixel-quest",
    label: "Arcade Night",
    swatches: ["#14112e", "#fff1d0", "#c4bce9"],
  },
  {
    // Rally: white and optic yellow on the floodlit court (the court, the sky and the HUD are
    // the design's own).
    id: "rally",
    label: "Court Lights",
    swatches: ["#0b1522", "#f6f4ee", "#b9c3cf"],
  },
  {
    // Safari: paper colours (the savanna, the animals and the letters are the design's own).
    id: "safari",
    label: "Storybook Paper",
    swatches: ["#f5e6cd", "#3b2614", "#e0633f"],
  },
  {
    // Summit: white on the mountain, a pale card at the top (the mountain and the sky are the
    // design's own).
    id: "summit",
    label: "Summit Morning",
    swatches: ["#17222f", "#ffffff", "#7a5a36"],
  },
  {
    // Poolside: deep pool navy on light water, a peach tiled deck (the water and the deck are
    // the design's own).
    id: "poolside",
    label: "Pool Navy & Peach",
    swatches: ["#fff8f1", "#0e3555", "#5d4a42"],
  },
  {
    // Riviera: white deck and navy ink (the sea and the teak are the design's own).
    id: "riviera",
    label: "White Deck & Navy",
    swatches: ["#fbfbf9", "#1b2a38", "#5a6876"],
  },
  {
    // The Debut Issue: magazine paper and ink (the spot colour is her first motif colour).
    id: "debut-issue",
    label: "Gloss & Ink",
    swatches: ["#f6f3ee", "#151515", "#77716a"],
  },
  {
    // The Debut Issue's second scheme: a warmer, blush stock.
    id: "debut-issue-blush",
    label: "Blush Stock",
    swatches: ["#f5ebe6", "#22191a", "#86716c"],
  },
];

export const defaultPaletteId = palettes[0].id;
