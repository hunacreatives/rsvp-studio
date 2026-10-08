import type { BindingField } from "@/pages/wedding-sites/spec/bindings";
import type { BlockType, ColorToken, FontSlot } from "@/pages/wedding-sites/spec/schema";
import type { DetectedBox, Detection } from "./detect";
import type { Served } from "./fontMatch";
import type { LineMetrics } from "./measure";
import type { SvgBuild } from "./svgImport";

// AI import, step 3 (deterministic): measured boxes + the AI's judgment →
// a template file. Positions and colours come from the measurement; text
// sizes are derived from each line's measured ink height, so nothing about
// placement is left to the AI.

export interface AiFont {
  family: string;
  fallback: "serif" | "sans-serif" | "cursive";
  weights: number[];
  italic: boolean;
  alternatives?: string[];
}
export interface AiLayer {
  boxes: number[];
  lines: string[];
  role: "field" | "static" | "ignore";
  field?: BindingField;
  format?: string;
  joiner?: string;
  font: FontSlot;
  weight: number;
  italic: boolean;
  uppercase: boolean;
  align: "left" | "center" | "right";
  letterSpacing: number;
  hostCount: "any" | "two";
  editorHint?: string;
  /** Review-screen size nudge (1 = as measured). */
  scale?: number;
  /** Measured from the design (SVG import): the text's shadow/glow. */
  shadow?: { x: number; y: number; blur: number; color: string };
}
export interface AiResult {
  eventTypes: ("wedding" | "birthday" | "anniversary" | "other")[];
  paletteLabel: string;
  palette: Record<ColorToken, string>;
  fonts: { display: AiFont; body: AiFont; accent?: AiFont; extra?: AiFont };
  radius: "none" | "soft" | "round";
  layers: AiLayer[];
  sections: { block: BlockType; heading?: string; band: "bg" | "surface"; divider: "none" | "line" | "leaf" | "dots" }[];
  notes: string[];
  /** SVG import: P-boxes that are customer photos, most important first. */
  photos?: { p: number; hint?: string }[];
  /** SVG import, long designs: what each B-band is. */
  bands?: { b: number; key: string }[];
  /** Filled in after font matching: average match of the chosen fonts (0–1). */
  fontScore?: number;
  /** Filled in after font matching: weights/italics Google Fonts serves per family. */
  available?: Record<string, Served>;
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

/** Horizontal room for a layer: as wide as its neighbours on the same row
 *  (and, for SVG imports, the background panel it sits on) allow. */
function widen(ink: Rect, align: AiLayer["align"], others: Rect[], room?: { x0: number; x1: number }) {
  const row = others.filter((o) => overlapsRow(ink, o));
  const leftLimit = Math.max(0.04, room ? room.x0 + 0.008 : 0, ...row.filter((o) => o.x + o.w <= ink.x + 0.002).map((o) => o.x + o.w + 0.012));
  const rightLimit = Math.min(0.96, room ? room.x1 - 0.008 : 1, ...row.filter((o) => o.x >= ink.x + ink.w - 0.002).map((o) => o.x - 0.012));
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

/** Repeating content fields (schedule.0.label …): hidden when the customer has fewer items. */
const isRepeating = (field: string) => /^(schedule|faqs|travel|stay|people|registry|story)\.\d+\./.test(field);
const BLOCK_KEY: Partial<Record<BlockType, string>> = { story: "hostIntro", keyPeople: "hostIntro", schedule: "schedule", venue: "venue", gallery: "gallery", registry: "registry", faqs: "faqs" };

export function assembleSpec(det: Detection, ai: AiResult, metrics: LineMetrics[] = [], build?: SvgBuild) {
  const byN = new Map(det.boxes.map((b) => [b.n, b]));
  const aspect = det.height / det.width; // height in width units
  const fontOf = (f: FontSlot) => ai.fonts[f] ?? ai.fonts.body;
  const script = (f: FontSlot) => fontOf(f).fallback === "cursive";

  const live = ai.layers.filter((l) => l.role !== "ignore" && l.boxes.some((n) => byN.has(n)));
  const inks = live.map((l) => union(l.boxes.map((n) => byN.get(n)!).filter(Boolean)));

  const layers: Record<string, unknown>[] = [];
  /** Where each text layer's letters are in the original (whole-design coordinates). */
  const sources: Record<string, { x: number; y: number; w: number; h: number }> = {};
  const twoOnly: { rect: Rect; layer: Record<string, unknown> }[] = [];
  const usedWeights: Record<FontSlot, Set<number>> = { display: new Set(), body: new Set(), accent: new Set(), extra: new Set() };
  // A layer pointing at a slot the design doesn't define falls back to body.
  const slotOf = (f: FontSlot): FontSlot => (ai.fonts[f] ? f : "body");

  live.forEach((l, i) => {
    // Tilted lines are laid out level (true length/height) and rotated back.
    const tilted = l.boxes.map((n) => byN.get(n)).find((b) => b?.rotate);
    const level = (b: DetectedBox): DetectedBox =>
      b.rotate && b.rw !== undefined ? { ...b, x: b.cx! - b.rw / 2, y: b.cy! - b.rh! / 2, w: b.rw, h: b.rh! } : b;
    // Boxes that share most of their height are ONE visual line (rising
    // handwriting can split a name into two boxes); merge them.
    const raw = l.boxes
      .map((n, k) => ({ b: byN.get(n), text: l.lines[k] ?? "", idx: k }))
      .filter((x): x is { b: DetectedBox; text: string; idx: number } => !!x.b)
      .map((x) => ({ ...x, b: level(x.b) }))
      .sort((p, q) => p.b.y - q.b.y);
    const merged: { b: DetectedBox; text: string; idx: number }[] = [];
    for (const x of raw) {
      const prev = merged[merged.length - 1];
      const ov = prev ? Math.min(prev.b.y + prev.b.h, x.b.y + x.b.h) - Math.max(prev.b.y, x.b.y) : 0;
      if (prev && ov > 0.5 * Math.min(prev.b.h, x.b.h)) {
        const u = union([prev.b, x.b]);
        const longer = x.text.length > prev.text.length ? x : prev;
        merged[merged.length - 1] = { b: { ...prev.b, ...u }, text: longer.text, idx: longer.idx };
      } else merged.push(x);
    }
    const members = merged.map((x) => x.b);
    const lineText = merged.map((x) => x.text);
    const ink = tilted ? union(members) : inks[i];
    // Font size (in canvas units = % of width). Best: the measured width of
    // each line against the same words measured in the chosen font. Fallback
    // (font didn't load): estimate from the line's ink height.
    const m = metrics[ai.layers.indexOf(l)];
    const ems = members.map((b, k) => {
      const lm = m?.[merged[k].idx];
      if (lm && lm.w > 0) return b.w / (lm.w / 100);
      return (b.h * aspect) / inkRatio(lineText[k] ?? lineText[0] ?? "Ag", l.uppercase, script(l.font));
    });
    const em = median(ems) * (l.scale ?? 1);
    const size = round(em * 100, 2);
    const pitches = members.slice(1).map((b, k) => (b.y + b.h / 2 - (members[k].y + members[k].h / 2)) * aspect);
    const lineHeight = pitches.length ? Math.min(2.2, Math.max(0.9, round(median(pitches) / em, 2))) : 1.15;
    const lineCount = Math.max(members.length, l.role === "field" && l.format === "stacked" ? 2 : 1);
    const needH = (lineCount * em * lineHeight) / aspect;
    const h = Math.max(ink.h, needH) * 1.15 + 0.004;
    // Multi-line text keeps the design's line breaks: box as wide as its
    // widest line (plus a little), not widened to the neighbours.
    // Paragraph = several lines, or long lines: it re-wraps naturally.
    // Short stacked lines (an address, "GUEST / ARRIVAL") keep their breaks.
    const avgLen = lineText.reduce((s, t) => s + t.length, 0) / Math.max(1, lineText.length);
    const paragraph = members.length >= 3 || (members.length > 1 && avgLen > 25);
    const { x, w } =
      members.length > 1
        ? l.align === "left"
          ? { x: ink.x, w: ink.w * 1.12 }
          : l.align === "right"
            ? { x: ink.x - ink.w * 0.12, w: ink.w * 1.12 }
            : { x: ink.x - ink.w * 0.06, w: ink.w * 1.12 }
        : tilted
          ? { x: ink.x - ink.w * 0.04, w: ink.w * 1.08 }
          : widen(
              ink,
              l.align,
              inks.filter((_, j) => j !== i),
              // The narrowest room of this layer's lines.
              build
                ? l.boxes
                    .map((n) => build.room[n])
                    .filter(Boolean)
                    .reduce<{ x0: number; x1: number } | undefined>((r, q) => (r ? { x0: Math.max(r.x0, q.x0), x1: Math.min(r.x1, q.x1) } : q), undefined)
                : undefined,
            );
    usedWeights[slotOf(l.font)].add(l.weight);

    const id = `${l.role === "field" ? l.field?.replace(/\W+/g, "-") : "text"}-${i + 1}`;
    // Multi-line text anchors at its first line: if it wraps into an extra
    // line it grows downward, never up into the heading above it.
    const multi = members.length > 1;
    const top = ink.y - (em * (lineHeight - 1) * 0.5) / aspect - 0.002;
    const layer: Record<string, unknown> = {
      id,
      type: "text",
      box: { x: round(x), y: round(multi ? top : ink.y + ink.h / 2 - h / 2), w: round(w), h: round(h) },
      ...(multi ? { valign: "top" } : {}),
      ...(tilted ? { rotate: tilted.rotate } : {}),
      font: slotOf(l.font),
      size,
      color: colorRef(members[0].color, ai.palette),
      align: l.align,
      weight: l.weight,
      italic: l.italic,
      uppercase: l.uppercase,
      letterSpacing: round(Math.min(1, Math.max(-0.1, l.letterSpacing || 0)), 3),
      lineHeight,
      // Text sits above photos and on-top art.
      ...(build ? { z: 40 } : {}),
      ...(l.shadow ? { shadow: l.shadow } : {}),
    };
    if (l.role === "field" && l.field) {
      // Times keep the design's style: "08:00 PM" (padded) or "16:00" (24-hour).
      let format = l.format;
      const sample = l.lines[0] ?? "";
      if ((l.field === "eventDate" || /\.time$/.test(l.field)) && (!format || format === "time")) {
        if (/^0\d:\d\d\s*[ap]/i.test(sample)) format = "timePadded";
        else if (/^\d{2}:\d\d$/.test(sample.trim())) format = "time24";
      }
      // A full date without a weekday in the design shouldn't gain one.
      if (l.field === "eventDate" && (!format || format === "long") && !/(mon|tues|wednes|thurs|fri|satur|sun)day/i.test(sample)) {
        if (/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{1,2},?\s+\d{4}/i.test(sample)) format = "medium";
        else if (/^\d{1,2}[./-]\d{1,2}[./-]\d{2,4}$/.test(sample.trim())) format = "numeric";
      }
      layer.bind = { field: l.field, ...(format ? { format } : {}), ...(l.joiner ? { joiner: l.joiner } : {}) };
      layer.minSize = round(size * 0.55, 2);
      if (l.editorHint) layer.editorHint = l.editorHint.slice(0, 60);
      if (l.field.startsWith("venue") || l.field === "eventDate" || l.field === "story.first" || isRepeating(l.field)) layer.hideWhenEmpty = true;
    } else {
      // A paragraph re-wraps naturally; short multi-line text keeps its breaks.
      layer.text = paragraph ? lineText.join(" ") : lineText.join("\n");
      layer.minSize = round(size * (paragraph ? 0.7 : 0.8), 2);
    }
    if (l.hostCount === "two") {
      layer.when = { minHosts: 2 };
      twoOnly.push({ rect: ink, layer });
    }
    layers.push(layer);
    sources[id] = { x: ink.x, y: ink.y, w: ink.w, h: ink.h };
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

  // SVG import: customer photo slots and the art that sits on top of them.
  const assets: Record<string, { url: string; w: number; h: number }> = {};
  if (build) {
    for (const ph of build.photos) {
      layers.push({
        id: `photo-${ph.slot + 1}`,
        type: "photo",
        slot: ph.slot,
        box: { x: round(ph.cx - ph.rw / 2), y: round(ph.cy - ph.rh / 2), w: round(ph.rw), h: round(ph.rh) },
        rotate: ph.rotate,
        z: ph.z,
        ...(ph.hint ? { editorHint: ph.hint.slice(0, 60) } : {}),
      });
    }
    for (const o of build.overlays) {
      assets[o.id] = { url: o.file.name, w: Math.round(o.w * 1000), h: Math.round(o.h * 1000 * aspect) };
      layers.push({ id: o.id, type: "image", assetId: o.id, box: { x: round(o.x), y: round(o.y), w: round(o.w), h: round(o.h) }, z: o.z });
    }
  }

  // Bands: a long design becomes one edge-to-edge canvas per band, so
  // customers can hide a band and standard sections can sit between them.
  const bands = build?.bands.length ? build.bands : [{ y0: 0, y1: 1, key: undefined, color: "", art: det.art, artSize: det.artSize }];
  const maxWidth = build ? (build.designWidth < 700 ? 600 : Math.min(1200, Math.round(build.designWidth))) : det.width > det.height ? 1200 : 600;
  const single = bands.length === 1;
  const canvases = bands.map((band, j) => {
    const span = band.y1 - band.y0;
    const assetId = single ? "artwork" : `artwork-${j + 1}`;
    assets[assetId] = { url: band.art.name || "artwork.webp", w: band.artSize.w, h: band.artSize.h };
    const mine = layers.filter((l) => {
      const bx = l.box as { y: number; h: number };
      const cy = bx.y + bx.h / 2;
      return single || (cy >= band.y0 && (cy < band.y1 || j === bands.length - 1));
    });
    return {
      id: single ? "hero" : `band-${j + 1}`,
      kind: "canvas",
      visibilityKey: single ? "hero" : (band.key ?? (j === 0 ? "hero" : undefined)),
      aspect: [band.artSize.w, band.artSize.h],
      maxWidth,
      band: single || !band.color ? "bg" : band.color,
      ...(single ? {} : { padding: "none" }),
      backgroundAssetId: assetId,
      layers: single
        ? mine
        : mine.map((l) => {
            const bx = l.box as { x: number; y: number; w: number; h: number };
            return { ...l, box: { x: bx.x, y: round((bx.y - band.y0) / span), w: bx.w, h: round(bx.h / span) } };
          }),
    };
  });

  // Standard sections: skip what the design already draws; the RSVP form
  // goes right after the design's own RSVP band (or at the end).
  const drawn = new Set(bands.map((b) => b.key).filter(Boolean));
  const blocks = ai.sections.filter((s) => s.block !== "rsvp" && s.block !== "footer" && !(BLOCK_KEY[s.block] && drawn.has(BLOCK_KEY[s.block]!)));
  const rsvp = ai.sections.find((s) => s.block === "rsvp") ?? { block: "rsvp" as const, heading: "RSVP", band: "bg" as const, divider: "line" as const };
  const toBlock = (s: AiResult["sections"][number], i: number) => ({
    id: `${s.block}-${i + 1}`,
    kind: "block",
    block: s.block,
    ...(VISIBILITY[s.block] ? { visibilityKey: VISIBILITY[s.block] } : {}),
    band: s.band,
    ...(s.heading ? { heading: s.heading.slice(0, 60) } : {}),
    divider: s.divider,
  });
  const rsvpAt = bands.findIndex((b) => b.key === "rsvp");
  const sections =
    rsvpAt >= 0
      ? [...canvases.slice(0, rsvpAt + 1), toBlock(rsvp, 0), ...canvases.slice(rsvpAt + 1), ...blocks.map((s, i) => toBlock(s, i + 1))]
      : [...canvases, ...[...blocks, rsvp].map((s, i) => toBlock(s, i))];
  sections.push({ id: "footer", kind: "block", block: "footer" } as never);

  // Only request weights/italics Google Fonts actually serves for the
  // family — one that doesn't exist makes the font request fail.
  const fontRef = (key: FontSlot) => {
    const f = fontOf(key);
    const family = f.family.trim() || (key === "display" ? "Playfair Display" : "Lato");
    const served = ai.available?.[family];
    let weights = [...usedWeights[key], 400].filter((w, i, a) => w >= 100 && w <= 900 && a.indexOf(w) === i).sort((a, b) => a - b);
    if (served?.weights.length) {
      const ok = weights.filter((w) => served.weights.includes(w));
      weights = ok.length ? ok : [served.weights.includes(400) ? 400 : served.weights[0]];
    }
    const wantsItalic = f.italic || live.some((l) => l.italic && slotOf(l.font) === key);
    return {
      family,
      weights: weights.slice(0, 6),
      italic: wantsItalic && (served ? served.italic : true),
      fallback: f.fallback === "cursive" ? "cursive" : f.fallback === "serif" ? "Georgia, serif" : "system-ui, sans-serif",
    };
  };
  const extraSlots = (["accent", "extra"] as const).filter((k) => ai.fonts[k] && live.some((l) => slotOf(l.font) === k));

  // Re-express sources in each canvas's own coordinates (bands).
  const sourcesByCanvas: Record<string, { canvas: string; x: number; y: number; w: number; h: number }> = {};
  for (const [id, r] of Object.entries(sources)) {
    const j = bands.findIndex((b, k) => r.y + r.h / 2 >= b.y0 && (r.y + r.h / 2 < b.y1 || k === bands.length - 1));
    const b = bands[Math.max(0, j)];
    const span = b.y1 - b.y0;
    sourcesByCanvas[id] = { canvas: canvases[Math.max(0, j)].id, x: r.x, y: (r.y - b.y0) / span, w: r.w, h: r.h / span };
  }

  return {
    /** Not part of the template (dropped on validation): for the match score. */
    __sources: sourcesByCanvas,
    specVersion: 1,
    meta: { eventTypes: ai.eventTypes },
    tokens: {
      palettes: [{ id: "original", label: ai.paletteLabel.slice(0, 40) || "Original", colors: ai.palette }],
      defaultPaletteId: "original",
      allowGlobalPalettes: false,
      fonts: { display: fontRef("display"), body: fontRef("body"), ...Object.fromEntries(extraSlots.map((k) => [k, fontRef(k)])) },
      radius: ai.radius,
    },
    assets,
    sections,
  };
}
