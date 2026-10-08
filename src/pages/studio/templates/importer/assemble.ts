import type { BindingField } from "@/pages/wedding-sites/spec/bindings";
import type { BlockType, ColorToken } from "@/pages/wedding-sites/spec/schema";
import type { DetectedBox, Detection } from "./detect";
import type { LineMetrics } from "./measure";

// AI import, step 3 (deterministic): measured boxes + the AI's judgment →
// a template file. Positions and colours come from the measurement; text
// sizes are derived from each line's measured ink height, so nothing about
// placement is left to the AI.

export interface AiFont {
  family: string;
  fallback: "serif" | "sans-serif" | "cursive";
  weights: number[];
  italic: boolean;
}
export interface AiLayer {
  boxes: number[];
  lines: string[];
  role: "field" | "static" | "ignore";
  field?: BindingField;
  format?: string;
  joiner?: string;
  font: "display" | "body";
  weight: number;
  italic: boolean;
  uppercase: boolean;
  align: "left" | "center" | "right";
  letterSpacing: number;
  hostCount: "any" | "two";
  editorHint?: string;
  /** Review-screen size nudge (1 = as measured). */
  scale?: number;
}
export interface AiResult {
  eventTypes: ("wedding" | "birthday" | "anniversary" | "other")[];
  paletteLabel: string;
  palette: Record<ColorToken, string>;
  fonts: { display: AiFont; body: AiFont };
  radius: "none" | "soft" | "round";
  layers: AiLayer[];
  sections: { block: BlockType; heading?: string; band: "bg" | "surface"; divider: "none" | "line" | "leaf" | "dots" }[];
  notes: string[];
}

const VISIBILITY: Partial<Record<BlockType, string>> = {
  story: "hostIntro",
  keyPeople: "hostIntro",
  schedule: "schedule",
  venue: "venue",
  gallery: "gallery",
  registry: "registry",
  faqs: "faqs",
  rsvp: "rsvp",
};

const round = (n: number, d = 4) => Math.round(n * 10 ** d) / 10 ** d;
const median = (a: number[]) => [...a].sort((m, n) => m - n)[a.length >> 1];

function union(bs: DetectedBox[]) {
  const x0 = Math.min(...bs.map((b) => b.x));
  const y0 = Math.min(...bs.map((b) => b.y));
  const x1 = Math.max(...bs.map((b) => b.x + b.w));
  const y1 = Math.max(...bs.map((b) => b.y + b.h));
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}
type Rect = ReturnType<typeof union>;

/** Ink height of a line as a fraction of its font size (em). */
function inkRatio(text: string, uppercase: boolean, script: boolean) {
  const t = uppercase ? text.toUpperCase() : text;
  const tall = /[A-Z0-9bdfhklt]/.test(t);
  const deep = /[gjpqy]/.test(t);
  return ((tall ? 0.72 : 0.5) + (deep ? 0.22 : 0)) * (script ? 1.08 : 1);
}

function colorRef(hexColor: string, palette: Record<ColorToken, string>): string {
  const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [r, g, b] = rgb(hexColor);
  let best: { token: ColorToken; d: number } | null = null;
  for (const token of ["ink", "bg", "accent", "onAccent", "muted", "surface"] as ColorToken[]) {
    const [r2, g2, b2] = rgb(palette[token]);
    const d = Math.hypot(r - r2, g - g2, b - b2);
    if (!best || d < best.d) best = { token, d };
  }
  return best && best.d < 30 ? best.token : hexColor;
}

const overlapsRow = (a: Rect, b: Rect) => Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y) > 0.3 * Math.min(a.h, b.h);

/** Horizontal room for a layer: as wide as its neighbours on the same row allow. */
function widen(ink: Rect, align: AiLayer["align"], others: Rect[]) {
  const row = others.filter((o) => overlapsRow(ink, o));
  const leftLimit = Math.max(0.04, ...row.filter((o) => o.x + o.w <= ink.x + 0.002).map((o) => o.x + o.w + 0.012));
  const rightLimit = Math.min(0.96, ...row.filter((o) => o.x >= ink.x + ink.w - 0.002).map((o) => o.x - 0.012));
  if (align === "left") {
    const x = Math.max(0, ink.x);
    return { x, w: Math.max(ink.w * 1.05, rightLimit - x) };
  }
  if (align === "right") {
    const x1 = Math.min(1, ink.x + ink.w);
    const x = Math.min(leftLimit, ink.x);
    return { x, w: x1 - x };
  }
  const cx = ink.x + ink.w / 2;
  const half = Math.max((ink.w / 2) * 1.08, Math.min(cx - leftLimit, rightLimit - cx));
  return { x: cx - half, w: half * 2 };
}

export function assembleSpec(det: Detection, ai: AiResult, metrics: LineMetrics[] = []) {
  const byN = new Map(det.boxes.map((b) => [b.n, b]));
  const aspect = det.height / det.width; // height in width units
  const script = (f: "display" | "body") => ai.fonts[f].fallback === "cursive";

  const live = ai.layers.filter((l) => l.role !== "ignore" && l.boxes.some((n) => byN.has(n)));
  const inks = live.map((l) => union(l.boxes.map((n) => byN.get(n)!).filter(Boolean)));

  const layers: Record<string, unknown>[] = [];
  const twoOnly: { rect: Rect; layer: Record<string, unknown> }[] = [];
  const usedWeights = { display: new Set(ai.fonts.display.weights), body: new Set(ai.fonts.body.weights) };

  live.forEach((l, i) => {
    const members = l.boxes.map((n) => byN.get(n)).filter((b): b is DetectedBox => !!b).sort((a, b) => a.y - b.y);
    const ink = inks[i];
    // Font size (in canvas units = % of width). Best: the measured width of
    // each line against the same words measured in the chosen font. Fallback
    // (font didn't load): estimate from the line's ink height.
    const m = metrics[ai.layers.indexOf(l)];
    const ems = members.map((b, k) => {
      const lm = m?.[k];
      if (lm && lm.w > 0) return b.w / (lm.w / 100);
      return (b.h * aspect) / inkRatio(l.lines[k] ?? l.lines[0] ?? "Ag", l.uppercase, script(l.font));
    });
    const em = median(ems) * (l.scale ?? 1);
    const size = round(em * 100, 2);
    const pitches = members.slice(1).map((b, k) => (b.y + b.h / 2 - (members[k].y + members[k].h / 2)) * aspect);
    const lineHeight = pitches.length ? Math.min(2.2, Math.max(0.9, round(median(pitches) / em, 2))) : 1.15;
    const lineCount = Math.max(members.length, l.role === "field" && l.format === "stacked" ? 2 : 1);
    const needH = (lineCount * em * lineHeight) / aspect;
    const h = Math.max(ink.h, needH) * 1.15 + 0.004;
    const { x, w } = widen(ink, l.align, inks.filter((_, j) => j !== i));
    usedWeights[l.font].add(l.weight);

    const id = `${l.role === "field" ? l.field?.replace(/\W+/g, "-") : "text"}-${i + 1}`;
    const layer: Record<string, unknown> = {
      id,
      type: "text",
      box: { x: round(x), y: round(ink.y + ink.h / 2 - h / 2), w: round(w), h: round(h) },
      font: l.font,
      size,
      color: colorRef(members[0].color, ai.palette),
      align: l.align,
      weight: l.weight,
      italic: l.italic,
      uppercase: l.uppercase,
      letterSpacing: round(Math.min(1, Math.max(-0.1, l.letterSpacing || 0)), 3),
      lineHeight,
    };
    if (l.role === "field" && l.field) {
      layer.bind = { field: l.field, ...(l.format ? { format: l.format } : {}), ...(l.joiner ? { joiner: l.joiner } : {}) };
      layer.minSize = round(size * 0.55, 2);
      if (l.editorHint) layer.editorHint = l.editorHint.slice(0, 60);
      if (l.field.startsWith("venue") || l.field === "eventDate" || l.field === "story.first") layer.hideWhenEmpty = true;
    } else {
      layer.text = l.lines.join("\n");
      layer.minSize = round(size * 0.8, 2);
    }
    if (l.hostCount === "two") {
      layer.when = { minHosts: 2 };
      twoOnly.push({ rect: ink, layer });
    }
    layers.push(layer);
  });

  // Separate name boxes only work for two hosts: add the one-host version
  // (all names in one box, styled like the first name) automatically.
  const firstName = twoOnly.find((t) => (t.layer.bind as { field?: string } | undefined)?.field === "hosts.0.name");
  if (firstName && !layers.some((l) => (l.bind as { field?: string } | undefined)?.field === "hosts.names" && !l.when)) {
    const r = union(twoOnly.map((t) => ({ ...t.rect, n: 0, color: "" })));
    const { x, w } = widen(r, "center", []);
    layers.push({
      ...firstName.layer,
      id: "hosts-solo",
      bind: { field: "hosts.names" },
      when: { maxHosts: 1 },
      align: "center",
      editorHint: "Your name",
      box: { x: round(x), y: round(r.y), w: round(w), h: round(r.h) },
    });
  }

  const blocks = ai.sections.filter((s) => s.block !== "rsvp" && s.block !== "footer");
  const rsvp = ai.sections.find((s) => s.block === "rsvp") ?? { block: "rsvp" as const, heading: "RSVP", band: "bg" as const, divider: "line" as const };
  const sections = [
    {
      id: "hero",
      kind: "canvas",
      visibilityKey: "hero",
      aspect: [det.artSize.w, det.artSize.h],
      maxWidth: det.width > det.height ? 1200 : 600,
      band: "bg",
      backgroundAssetId: "artwork",
      layers,
    },
    ...[...blocks, rsvp].map((s, i) => ({
      id: `${s.block}-${i + 1}`,
      kind: "block",
      block: s.block,
      ...(VISIBILITY[s.block] ? { visibilityKey: VISIBILITY[s.block] } : {}),
      band: s.band,
      ...(s.heading ? { heading: s.heading.slice(0, 60) } : {}),
      divider: s.divider,
    })),
    { id: "footer", kind: "block", block: "footer" },
  ];

  const fontRef = (key: "display" | "body") => ({
    family: ai.fonts[key].family.trim() || (key === "display" ? "Playfair Display" : "Lato"),
    weights: [...usedWeights[key], 400].filter((w, i, a) => w >= 100 && w <= 900 && a.indexOf(w) === i).sort((a, b) => a - b).slice(0, 6),
    italic: ai.fonts[key].italic || live.some((l) => l.italic && l.font === key),
    fallback: ai.fonts[key].fallback === "cursive" ? "cursive" : ai.fonts[key].fallback === "serif" ? "Georgia, serif" : "system-ui, sans-serif",
  });

  return {
    specVersion: 1,
    meta: { eventTypes: ai.eventTypes },
    tokens: {
      palettes: [{ id: "original", label: ai.paletteLabel.slice(0, 40) || "Original", colors: ai.palette }],
      defaultPaletteId: "original",
      allowGlobalPalettes: false,
      fonts: { display: fontRef("display"), body: fontRef("body") },
      radius: ai.radius,
    },
    assets: { artwork: { url: "artwork.webp", w: det.artSize.w, h: det.artSize.h } },
    sections,
  };
}
