import type { EventContent } from "../../content/types";
import { customValue } from "../../content/custom";

/**
 * Sprinkles' cakes. The frosting is the top of the cake (the opening); cut open, the page goes
 * down through its sponge and fillings to the board it stands on. Each sprinkle colour carries a
 * sheen (0 matt sugar, 1 metallic dragée) for the renderer's highlight.
 */
export type FlavourId = "strawberry" | "chocolate" | "vanilla";
export type Filling = { c: string; hi: string; kind: "jam" | "cream" | "ganache" | "caramel" };
export type Flavour = {
  id: FlavourId;
  frosting: string;
  /** the frosting in shadow, and lit */
  frostLo: string;
  frostHi: string;
  /** the drip over the top edge */
  drip: string;
  dripHi: string;
  /** two sponges, so the layers alternate */
  sponge: [string, string];
  /** the fillings between them, in order */
  fillings: Filling[];
  /** the buttercream layer the photos are pressed into */
  cream: string;
  /** the cake board (the reply sits on it) and the table round the cake */
  board: string;
  boardHi: string;
  table: string;
  /** the number candle: wax, its stripe */
  wax: string;
  waxStripe: string;
  ink: string;
  muted: string;
  /** words on the board, when it's dark (else ink) */
  boardInk: string;
  boardMuted: string;
  line: string;
  field: string;
  btn: string;
  btnInk: string;
  shadow: [number, number, number, number];
  sprinkles: { c: string; w: number; sheen?: number }[];
  dots: number;
  dotSize: number;
};

export const FLAVOURS: Record<FlavourId, Flavour> = {
  // strawberry buttercream, vanilla and strawberry sponge, jam and cream, rainbow jimmies
  strawberry: {
    id: "strawberry",
    frosting: "#f6c1cd", frostLo: "#e29fb0", frostHi: "#fde3e9",
    drip: "#c81f43", dripHi: "#ff7a92",
    sponge: ["#f2d8ad", "#f1c9b6"],
    fillings: [
      { c: "#b3122e", hi: "#ff6680", kind: "jam" },
      { c: "#fff3ee", hi: "#ffffff", kind: "cream" },
      { c: "#c4223f", hi: "#ff7d92", kind: "jam" },
    ],
    cream: "#fbe7ea",
    board: "#eeecef", boardHi: "#ffffff", table: "#f3dcd9",
    wax: "#ffffff", waxStripe: "#ee6f8e",
    ink: "#4a1730", muted: "#7d3f55", boardInk: "#4a1730", boardMuted: "#7d3f55",
    line: "rgba(74, 23, 48, 0.2)", field: "rgba(255, 255, 255, 0.62)",
    btn: "#4a1730", btnInk: "#fff4f6",
    shadow: [128, 34, 66, 0.3],
    sprinkles: [
      { c: "#e8383f", w: 1 }, { c: "#ff8b1f", w: 1 }, { c: "#ffd23a", w: 1 }, { c: "#25b26f", w: 1 },
      { c: "#2f7be0", w: 1 }, { c: "#8a5cf0", w: 0.9 }, { c: "#ffffff", w: 0.9 },
    ],
    dots: 0.16, dotSize: 1.25,
  },
  // chocolate buttercream, chocolate sponge, ganache and salted caramel, pastel jimmies
  chocolate: {
    id: "chocolate",
    frosting: "#5b3423", frostLo: "#3e2116", frostHi: "#7d4d35",
    drip: "#24110a", dripHi: "#6d4535",
    sponge: ["#5e3624", "#6c3f29"],
    fillings: [
      { c: "#2a140c", hi: "#7a5040", kind: "ganache" },
      { c: "#f3e3cf", hi: "#ffffff", kind: "cream" },
      { c: "#b0631f", hi: "#f0a860", kind: "caramel" },
    ],
    cream: "#efdcc4",
    board: "#2a211d", boardHi: "#4a3d36", table: "#3a261c",
    wax: "#a7d0f2", waxStripe: "#ffffff",
    ink: "#fcefe2", muted: "#e2c8b2", boardInk: "#fcefe2", boardMuted: "#d9c2ae",
    line: "rgba(252, 239, 226, 0.24)", field: "rgba(255, 255, 255, 0.1)",
    btn: "#fcefe2", btnInk: "#3a1f15",
    shadow: [16, 6, 2, 0.5],
    sprinkles: [
      { c: "#f8b4c6", w: 1 }, { c: "#ffe08c", w: 1 }, { c: "#b2e2c2", w: 1 }, { c: "#a6cff3", w: 1 },
      { c: "#d4bcf6", w: 0.9 }, { c: "#fff6ea", w: 0.8 },
    ],
    dots: 0.16, dotSize: 1.25,
  },
  // vanilla buttercream, golden sponge, cream and apricot, a gold drip, gold and white sprinkles
  vanilla: {
    id: "vanilla",
    frosting: "#f6efe1", frostLo: "#e3d6bd", frostHi: "#fffaf0",
    drip: "#c3963b", dripHi: "#f4dc93",
    sponge: ["#f5e8c9", "#f0dfb8"],
    fillings: [
      { c: "#fbf3e2", hi: "#ffffff", kind: "cream" },
      { c: "#e39a4c", hi: "#ffd08f", kind: "jam" },
      { c: "#fbf3e2", hi: "#ffffff", kind: "cream" },
    ],
    cream: "#f8f0df",
    board: "#d6b768", boardHi: "#f6e3a8", table: "#ece3d2",
    wax: "#d9b25a", waxStripe: "#fff6dc",
    ink: "#33281c", muted: "#6f5e49", boardInk: "#2c2216", boardMuted: "#56462f",
    line: "rgba(51, 40, 28, 0.2)", field: "rgba(255, 255, 255, 0.6)",
    btn: "#33281c", btnInk: "#f8f2e6",
    shadow: [112, 86, 46, 0.3],
    sprinkles: [
      { c: "#b8862b", w: 1.4, sheen: 1 }, { c: "#d6ab4c", w: 1.1, sheen: 1 }, { c: "#8c661c", w: 0.9, sheen: 1 },
      { c: "#ffffff", w: 0.9, sheen: 0.4 }, { c: "#e8d9b4", w: 0.5, sheen: 0.4 },
    ],
    dots: 0.42, dotSize: 1.5,
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

export const hexRgb = (c: string): [number, number, number] => {
  const n = parseInt(c.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
export const rgba = (c: string, a: number) => {
  const [r, g, b] = hexRgb(c);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
};
/** a colour mixed toward another (0..1) */
export const mix = (a: string, b: string, k: number) => {
  const x = hexRgb(a), y = hexRgb(b);
  return `#${x.map((v, i) => Math.round(v + (y[i] - v) * k).toString(16).padStart(2, "0")).join("")}`;
};

/** The sprinkle colours for the renderer: rgb 0..1 and the sheen, four floats each (8 max). */
export function glPalette(f: Flavour): Float32Array {
  const out = new Float32Array(32);
  f.sprinkles.slice(0, 8).forEach((s, i) => {
    const [r, g, b] = hexRgb(s.c);
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
