import type { EventContent } from "../../content/types";
import { customValue } from "../../content/custom";

/**
 * Sprinkles' cakes: the frosting is the page, the sprinkles its colours. Each sprinkle colour
 * carries a sheen (0 matt sugar, 1 metallic dragée) for the renderer's highlight.
 */
export type FlavourId = "strawberry" | "chocolate" | "vanilla";
export type Flavour = {
  id: FlavourId;
  frosting: string;
  ink: string;
  muted: string;
  line: string;
  field: string;
  /** The button: its fill and its text. */
  btn: string;
  btnInk: string;
  /** The little shadow each sprinkle casts on the icing (rgba). */
  shadow: [number, number, number, number];
  sprinkles: { c: string; w: number; sheen?: number }[];
  /** The share of round nonpareils (the rest are rods) and their size against a rod's width. */
  dots: number;
  dotSize: number;
};

export const FLAVOURS: Record<FlavourId, Flavour> = {
  // strawberry frosting, rainbow jimmies
  strawberry: {
    id: "strawberry",
    frosting: "#f7c6d1",
    ink: "#4a1730",
    muted: "#7d3f55",
    line: "rgba(74, 23, 48, 0.2)",
    field: "rgba(255, 255, 255, 0.5)",
    btn: "#4a1730",
    btnInk: "#fff4f6",
    shadow: [128, 34, 66, 0.3],
    sprinkles: [
      { c: "#e8383f", w: 1 },
      { c: "#ff8b1f", w: 1 },
      { c: "#ffd23a", w: 1 },
      { c: "#25b26f", w: 1 },
      { c: "#2f7be0", w: 1 },
      { c: "#8a5cf0", w: 0.9 },
      { c: "#ffffff", w: 0.9 },
    ],
    dots: 0.16,
    dotSize: 1.25,
  },
  // chocolate ganache, pastel jimmies
  chocolate: {
    id: "chocolate",
    frosting: "#4b2a1d",
    ink: "#fcefe2",
    muted: "#dcc1ab",
    line: "rgba(252, 239, 226, 0.22)",
    field: "rgba(255, 255, 255, 0.08)",
    btn: "#fcefe2",
    btnInk: "#3a1f15",
    shadow: [16, 6, 2, 0.5],
    sprinkles: [
      { c: "#f8b4c6", w: 1 },
      { c: "#ffe08c", w: 1 },
      { c: "#b2e2c2", w: 1 },
      { c: "#a6cff3", w: 1 },
      { c: "#d4bcf6", w: 0.9 },
      { c: "#fff6ea", w: 0.8 },
    ],
    dots: 0.16,
    dotSize: 1.25,
  },
  // vanilla buttercream, gold and white (for the grown-ups)
  vanilla: {
    id: "vanilla",
    frosting: "#f5eee0",
    ink: "#33281c",
    muted: "#6f5e49",
    line: "rgba(51, 40, 28, 0.18)",
    field: "rgba(255, 255, 255, 0.6)",
    btn: "#33281c",
    btnInk: "#f8f2e6",
    shadow: [112, 86, 46, 0.3],
    sprinkles: [
      { c: "#c69a3e", w: 1.2, sheen: 1 },
      { c: "#e2c476", w: 1, sheen: 1 },
      { c: "#a57b2c", w: 0.7, sheen: 1 },
      { c: "#ffffff", w: 1.1, sheen: 0.4 },
      { c: "#ece0c4", w: 0.7, sheen: 0.4 },
    ],
    dots: 0.42,
    dotSize: 1.5,
  },
};

/** The cake: the host's choice, else the palette picked in Look & Feel, else strawberry. */
export function flavourOf(content: EventContent, paletteId: string | undefined): Flavour {
  const pick = customValue(content, "frosting") as FlavourId;
  if (pick && FLAVOURS[pick]) return FLAVOURS[pick];
  if (paletteId === "sprinkles-chocolate") return FLAVOURS.chocolate;
  if (paletteId === "sprinkles-vanilla") return FLAVOURS.vanilla;
  return FLAVOURS.strawberry;
}

const hex = (c: string) => {
  const n = parseInt(c.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

/** The sprinkle colours for the renderer: rgb 0..1 and the sheen, four floats each (8 max). */
export function glPalette(f: Flavour): Float32Array {
  const out = new Float32Array(32);
  f.sprinkles.slice(0, 8).forEach((s, i) => {
    const [r, g, b] = hex(s.c);
    out.set([r / 255, g / 255, b / 255, s.sheen ?? 0], i * 4);
  });
  return out;
}

/** Cumulative weights, for picking a sprinkle's colour. */
export const colourWeights = (f: Flavour) => {
  const total = f.sprinkles.reduce((a, s) => a + s.w, 0);
  let acc = 0;
  return f.sprinkles.slice(0, 8).map((s) => (acc += s.w / total));
};
