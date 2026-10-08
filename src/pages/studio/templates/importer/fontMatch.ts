import type { FontSlot } from "@/pages/wedding-sites/spec/schema";
import type { AiFont, AiResult } from "./assemble";
import type { DetectedBox } from "./detect";
import { maskColor } from "./svgImport";

// Font matching by measurement. The AI suggests Google Fonts (a best guess
// plus alternatives for each face it sees). Every line of text is drawn in
// every candidate and weight, and compared with the design's actual letter
// shapes; each line gets its best match, then lines sharing a face are
// grouped into the template's font slots (up to 4). Also learns which
// weights/italics each family is really served in, so the template never
// requests one that doesn't exist (that breaks the font request).

const CSS = "https://fonts.googleapis.com/css2";
const TRY_WEIGHTS = [300, 400, 500, 600, 700, 800];
/** Comparison grid width: the line's own pixel width, within limits. */
const gridW = (w: number) => Math.max(120, Math.min(800, Math.round(w)));
const SLOTS: FontSlot[] = ["display", "body", "accent", "extra"];
/** Small head start for the AI's own pick, so a near-tie keeps its choice. */
const AI_BONUS = 0.02;
/** Popular design-tool faces that are free on Google Fonts: always tested, so
 *  a face the AI didn't think of (e.g. a sans-serif detail line) still matches. */
const HOUSE_SET: { family: string; fallback: AiFont["fallback"] }[] = [
  { family: "Montserrat", fallback: "sans-serif" },
  { family: "Poppins", fallback: "sans-serif" },
  { family: "Lato", fallback: "sans-serif" },
  { family: "Raleway", fallback: "sans-serif" },
  { family: "Josefin Sans", fallback: "sans-serif" },
  { family: "League Spartan", fallback: "sans-serif" },
  { family: "Playfair Display", fallback: "serif" },
  { family: "Cormorant Garamond", fallback: "serif" },
  { family: "Libre Baskerville", fallback: "serif" },
  { family: "Lora", fallback: "serif" },
  { family: "Great Vibes", fallback: "cursive" },
  { family: "Dancing Script", fallback: "cursive" },
  { family: "Allura", fallback: "cursive" },
  { family: "Alex Brush", fallback: "cursive" },
  { family: "Parisienne", fallback: "cursive" },
];

export interface Served {
  weights: number[];
  italic: boolean;
}

export interface FontMatch {
  fonts: Partial<Record<FontSlot, AiFont>>;
  /** Slot and weight for each AI layer (by index). */
  layers: Record<number, { font: FontSlot; weight: number }>;
  available: Record<string, Served>;
  /** Average match (0–1) per slot, and what else was tried, for review notes. */
  report: { slot: FontSlot; family: string; score: number; others: [string, number][] }[];
}

const familyParam = (f: string) => f.trim().replace(/ /g, "+");
const ok = async (url: string) => {
  try {
    return (await fetch(url)).ok;
  } catch {
    return false;
  }
};

/** Which weights (and whether italics) Google Fonts serves for a family. */
async function served(family: string): Promise<Served> {
  const f = familyParam(family);
  const [weights, italic] = await Promise.all([
    Promise.all(TRY_WEIGHTS.map(async (w) => ((await ok(`${CSS}?family=${f}:wght@${w}&display=swap`)) ? w : null))).then((ws) =>
      ws.filter((w): w is number => w !== null),
    ),
    ok(`${CSS}?family=${f}:ital@1&display=swap`),
  ]);
  if (weights.length) return { weights, italic };
  return { weights: (await ok(`${CSS}?family=${f}&display=swap`)) ? [400] : [], italic: false };
}

async function load(family: string, s: Served) {
  const ws = s.weights;
  const spec = s.italic ? `ital,wght@${[...ws.map((w) => `0,${w}`), ...ws.map((w) => `1,${w}`)].join(";")}` : `wght@${ws.join(";")}`;
  const href = `${CSS}?family=${familyParam(family)}:${spec}&display=swap`;
  if (!document.querySelector(`link[data-font-match="${window.CSS.escape(href)}"]`)) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.dataset.fontMatch = href;
    const done = new Promise<void>((r) => ((link.onload = () => r()), (link.onerror = () => r())));
    document.head.appendChild(link);
    await Promise.race([done, new Promise((r) => setTimeout(r, 6000))]);
  }
  await Promise.race([
    Promise.all(ws.flatMap((w) => [document.fonts.load(`${w} 100px "${family}"`, "AaBbGg&123"), s.italic ? document.fonts.load(`italic ${w} 100px "${family}"`, "AaBb") : null])),
    new Promise((r) => setTimeout(r, 6000)),
  ]);
}

type Mask = { on: (x: number, y: number) => boolean; x0: number; y0: number; w: number; h: number };

function cropToInk(on: (x: number, y: number) => boolean, w: number, h: number): Mask | null {
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (on(x, y)) ((x0 = Math.min(x0, x)), (y0 = Math.min(y0, y)), (x1 = Math.max(x1, x)), (y1 = Math.max(y1, y)));
  return x1 < 0 ? null : { on, x0, y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

/** This line's letters on the text mask: only pixels in its own code colour. */
export function originalMask(mask: ImageData, box: DetectedBox, xEnd?: number) {
  const W = mask.width;
  const H = mask.height;
  const [cr, cg, cb] = maskColor(box.n);
  const pad = 3;
  const bx0 = Math.max(0, Math.floor(box.x * W) - pad);
  const by0 = Math.max(0, Math.floor(box.y * H) - pad);
  const bx1 = Math.min(W, Math.ceil((xEnd ?? box.x + box.w) * W) + pad);
  const by1 = Math.min(H, Math.ceil((box.y + box.h) * H) + pad);
  return cropToInk(
    (x, y) => {
      const p = ((by0 + y) * W + bx0 + x) * 4;
      return mask.data[p + 3] > 110 && Math.abs(mask.data[p] - cr) <= 2 && Math.abs(mask.data[p + 1] - cg) <= 2 && Math.abs(mask.data[p + 2] - cb) <= 2;
    },
    bx1 - bx0,
    by1 - by0,
  );
}

export function candidateMask(text: string, css: string, letterSpacingEm: number) {
  const size = 160;
  const m = document.createElement("canvas").getContext("2d")!;
  m.font = css;
  const spacing = letterSpacingEm * size;
  const chars = [...text];
  const widths = chars.map((ch) => m.measureText(ch).width);
  const total = widths.reduce((s, v) => s + v, 0) + spacing * Math.max(0, chars.length - 1);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.ceil(total + size * 1.5));
  canvas.height = Math.ceil(size * 2.2);
  const d = canvas.getContext("2d", { willReadFrequently: true })!;
  d.font = css;
  d.fillStyle = "#000";
  if (spacing) {
    let x = size * 0.5;
    chars.forEach((ch, i) => {
      d.fillText(ch, x, size * 1.5);
      x += widths[i] + spacing;
    });
  } else d.fillText(text, size * 0.5, size * 1.5);
  const img = d.getImageData(0, 0, canvas.width, canvas.height);
  return cropToInk((x, y) => img.data[(y * img.width + x) * 4 + 3] > 110, img.width, img.height);
}

function grid(m: Mask, gw: number, gh: number) {
  const g = new Uint8Array(gw * gh);
  for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) g[y * gw + x] = m.on(m.x0 + Math.floor(((x + 0.5) * m.w) / gw), m.y0 + Math.floor(((y + 0.5) * m.h) / gh)) ? 1 : 0;
  return g;
}

/** Grow a mask by r pixels (separable max filter). */
function dilate(g: Uint8Array, w: number, h: number, r: number) {
  const tmp = new Uint8Array(g.length);
  const out = new Uint8Array(g.length);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let v = 0;
      for (let d = -r; d <= r && !v; d++) {
        const xx = x + d;
        if (xx >= 0 && xx < w) v = g[y * w + xx];
      }
      tmp[y * w + x] = v;
    }
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let v = 0;
      for (let d = -r; d <= r && !v; d++) {
        const yy = y + d;
        if (yy >= 0 && yy < h) v = tmp[yy * w + x];
      }
      out[y * w + x] = v;
    }
  return out;
}

/**
 * How alike two letter shapes are once scaled to the same box: the share of
 * each one's strokes that lie within a pixel or two of the other's (so a
 * one-pixel offset on 2px-wide strokes isn't scored as a miss), penalised
 * for a different overall proportion (a wider/narrower face) and a
 * different stroke weight (regular vs bold).
 */
export function similarity(orig: Mask, cand: Mask) {
  const gw = gridW(orig.w);
  const gh = Math.max(12, Math.round((gw * orig.h) / orig.w));
  const a = grid(orig, gw, gh);
  const b = grid(cand, gw, gh);
  const r = Math.max(1, Math.round(gh / 16));
  const da = dilate(a, gw, gh, r);
  const db = dilate(b, gw, gh, r);
  let ia = 0, ib = 0, aNearB = 0, bNearA = 0;
  for (let i = 0; i < a.length; i++) {
    ia += a[i];
    ib += b[i];
    aNearB += a[i] & db[i];
    bNearA += b[i] & da[i];
  }
  if (!ia || !ib) return 0;
  const recall = aNearB / ia;
  const precision = bNearA / ib;
  const f1 = (2 * recall * precision) / (recall + precision || 1);
  const ar = cand.w / cand.h / (orig.w / orig.h);
  return f1 * Math.exp(-1.5 * Math.abs(Math.log(ar))) * Math.exp(-0.8 * Math.abs(Math.log(ib / ia)));
}

/** Letters compared per line: enough to identify a face, few enough that small
 *  spacing differences don't accumulate across a long line. */
const PREFIX_LETTERS = 12;

/**
 * Compare a prefix of the line when we know where each letter is (SVG
 * import: one shape per letter). Returns the text to draw and where the
 * matching letters end on the design; null when letters and characters
 * don't line up (ligatures etc.) — then the whole line is compared.
 */
function prefixOf(text: string, glyphs: { x: number; w: number }[] | undefined) {
  if (!glyphs) return null;
  const chars = [...text];
  const visible = chars.filter((ch) => ch.trim()).length;
  if (visible !== glyphs.length || visible <= PREFIX_LETTERS) return null;
  let seen = 0;
  let cut = chars.length;
  for (let i = 0; i < chars.length; i++) {
    if (chars[i].trim()) seen++;
    if (seen === PREFIX_LETTERS) {
      cut = i + 1;
      break;
    }
  }
  const g = glyphs.slice(0, PREFIX_LETTERS);
  return { text: chars.slice(0, cut).join(""), xEnd: Math.max(...g.map((q) => q.x + q.w)) };
}

export async function matchFonts(
  ai: AiResult,
  boxes: DetectedBox[],
  textMask: HTMLCanvasElement,
  /** SVG import: each line's letter boxes, left to right. */
  glyphs?: Map<number, { x: number; w: number }[]>,
): Promise<FontMatch> {
  const mask = textMask.getContext("2d", { willReadFrequently: true })!.getImageData(0, 0, textMask.width, textMask.height);
  const byN = new Map(boxes.map((b) => [b.n, b]));

  // Candidate families, remembering which AI slot suggested each (for its fallback).
  const origin = new Map<string, AiFont>();
  for (const slot of SLOTS) {
    const f = ai.fonts[slot];
    if (!f) continue;
    for (const name of [f.family, ...(f.alternatives ?? [])].map((x) => x.trim()).filter(Boolean)) if (!origin.has(name)) origin.set(name, f);
  }
  for (const h of HOUSE_SET) if (!origin.has(h.family)) origin.set(h.family, { family: h.family, fallback: h.fallback, weights: [400], italic: false });
  const families = [...origin.keys()].slice(0, 28);
  const available: Record<string, Served> = {};
  await Promise.all(
    families.map(async (f) => {
      available[f] = await served(f);
      if (available[f].weights.length) await load(f, available[f]).catch(() => undefined);
    }),
  );

  // Score every text layer against every family × weight.
  const live = ai.layers.map((l, i) => ({ l, i })).filter(({ l }) => l.role !== "ignore");
  const best = new Map<number, Map<string, { score: number; weight: number }>>();
  for (const { l, i } of live) {
    const per = new Map<string, { score: number; weight: number }>();
    const lines = l.boxes
      .map((n, k) => ({ box: byN.get(n), text: (l.uppercase ? (l.lines[k] ?? "").toUpperCase() : l.lines[k] ?? "").trim() }))
      // Tilted lines are slanted on the design; comparing them level would mislead.
      .filter((x): x is { box: DetectedBox; text: string } => !!x.box && !!x.text && !x.box.rotate)
      .map((x) => {
        const pre = prefixOf(x.text, glyphs?.get(x.box.n));
        return { ...x, text: pre?.text ?? x.text, orig: originalMask(mask, x.box, pre?.xEnd) };
      })
      .filter((x) => x.orig)
      // Long paragraphs: a few lines are plenty to identify the face.
      .slice(0, 4);
    if (!lines.length) continue;
    for (const f of families) {
      for (const w of available[f]?.weights ?? []) {
        let total = 0;
        for (const x of lines) {
          const cand = candidateMask(x.text, `${l.italic && available[f].italic ? "italic " : ""}${w} 160px "${f}"`, l.letterSpacing || 0);
          total += cand ? similarity(x.orig!, cand) : 0;
        }
        const score = total / lines.length;
        if (score > (per.get(f)?.score ?? -1)) per.set(f, { score, weight: w });
      }
    }
    best.set(i, per);
  }

  // Choose up to 4 families that together fit the most text best (a greedy
  // set cover weighted by amount of text), so near-identical serifs don't
  // each take a slot. The AI's own pick for a layer gets a small head start.
  const isScript = (f: string) => origin.get(f)?.fallback === "cursive";
  const fit = (i: number, f: string) => {
    const l = ai.layers[i];
    const v = best.get(i)?.get(f)?.score ?? 0;
    // Script lines stay script and print stays print: a poor script match
    // must not be "fixed" by a sans-serif that happens to fill the box.
    const aiScript = (ai.fonts[l.font] ?? ai.fonts.body).fallback === "cursive";
    const sameClass = isScript(f) === aiScript;
    return (sameClass ? v : v * 0.4) + (ai.fonts[l.font]?.family.trim() === f ? AI_BONUS : 0);
  };
  // Weigh each line by how much of the design it covers: a big "23" matters
  // as much as a paragraph, far more than its two characters suggest.
  const weightOf = (i: number) => Math.max(1e-6, ai.layers[i].boxes.reduce((s, n) => s + (byN.get(n) ? byN.get(n)!.w * byN.get(n)!.h : 0), 0));
  const scored = live.filter(({ i }) => best.get(i)?.size);
  const total = (set: string[]) => scored.reduce((s, { i }) => s + weightOf(i) * Math.max(0, ...set.map((f) => fit(i, f))), 0);
  const picked: string[] = [];
  const hostLayers = scored.filter(({ l }) => l.field?.startsWith("hosts"));
  // Host names that couldn't be scored keep the AI's face for them.
  const unscoredHost = live.find(({ l, i }) => l.field?.startsWith("hosts") && !best.get(i)?.size);
  if (!hostLayers.length && unscoredHost) {
    const f = (ai.fonts[unscoredHost.l.font] ?? ai.fonts.display).family.trim();
    if (families.includes(f)) picked.push(f);
  }
  if (hostLayers.length) {
    const host = families.map((f) => [f, hostLayers.reduce((s, { i }) => s + fit(i, f), 0)] as const).sort((a, b) => b[1] - a[1])[0];
    if (host) picked.push(host[0]);
  }
  const all = scored.reduce((s, { i }) => s + weightOf(i), 0) || 1;
  while (picked.length < 4) {
    const base = total(picked);
    const next = families.filter((f) => !picked.includes(f)).map((f) => [f, total([...picked, f]) - base] as const).sort((a, b) => b[1] - a[1])[0];
    // Stop when another face would improve the overall fit by < 2 points.
    if (!next || (picked.length && next[1] / all < 0.02)) break;
    picked.push(next[0]);
  }
  // Spare slots go to a face that fits some line clearly better than every
  // face chosen so far (a small sans-serif detail line in a serif design).
  while (picked.length < 4) {
    const gain = (f: string) => Math.max(0, ...scored.map(({ i }) => fit(i, f) - Math.max(0, ...picked.map((p) => fit(i, p)))));
    const next = families.filter((f) => !picked.includes(f)).map((f) => [f, gain(f)] as const).sort((a, b) => b[1] - a[1])[0];
    if (!next || next[1] < 0.1) break;
    picked.push(next[0]);
  }

  // Slots: display = the host names' face (else the AI's display pick if
  // chosen, else the first); body = most text among the rest; then accent/extra.
  const assign = (i: number) => picked.map((f) => [f, fit(i, f)] as const).sort((a, b) => b[1] - a[1])[0]?.[0];
  const usage = new Map<string, number>();
  for (const { i } of scored) {
    const f = assign(i);
    if (f) usage.set(f, (usage.get(f) ?? 0) + weightOf(i));
  }
  const used = picked.filter((f) => usage.has(f));
  const aiDisplay = ai.fonts.display.family.trim();
  if (unscoredHost && picked[0] && !used.includes(picked[0])) used.unshift(picked[0]);
  const display = hostLayers.length || unscoredHost ? used[0] : used.includes(aiDisplay) ? aiDisplay : used[0];
  const rest = used.filter((f) => f !== display).sort((a, b) => (usage.get(b) ?? 0) - (usage.get(a) ?? 0));
  const slotOf = new Map<string, FontSlot>();
  [display, ...rest].filter(Boolean).slice(0, 4).forEach((f, k) => slotOf.set(f!, SLOTS[k]));
  if (!slotOf.size) slotOf.set(ai.fonts.body.family.trim(), "body");

  const fonts: Partial<Record<FontSlot, AiFont>> = {};
  for (const [f, slot] of slotOf) fonts[slot] = { ...(origin.get(f) ?? ai.fonts.body), family: f, alternatives: [] };
  if (!fonts.display) fonts.display = ai.fonts.display;
  if (!fonts.body) fonts.body = fonts.display;

  // Every layer uses whichever chosen face fits it best. A layer that
  // couldn't be compared (tilted) keeps the AI's face, or the closest chosen
  // face of the same kind (script / print).
  const layers: FontMatch["layers"] = {};
  for (const { l, i } of live) {
    const own = (ai.fonts[l.font] ?? ai.fonts.body).family.trim();
    const aiScript = (ai.fonts[l.font] ?? ai.fonts.body).fallback === "cursive";
    const f = !best.get(i)?.size
      ? slotOf.has(own)
        ? own
        : ([...slotOf.keys()].find((sf) => isScript(sf) === aiScript) ?? [...slotOf.keys()][0])
      : [...slotOf.keys()].map((sf) => [sf, fit(i, sf)] as const).sort((a, b) => b[1] - a[1])[0]?.[0];
    if (!f) continue;
    layers[i] = { font: slotOf.get(f) ?? l.font, weight: best.get(i)?.get(f)?.weight ?? l.weight };
  }

  const report = [...slotOf.entries()].map(([f, slot]) => {
    const mine = live.filter(({ i }) => layers[i]?.font === slot);
    const avg = (fam: string) => {
      const v = mine.map(({ i }) => best.get(i)?.get(fam)?.score ?? 0);
      return v.length ? v.reduce((s, x) => s + x, 0) / v.length : 0;
    };
    const others = families.filter((x) => x !== f).map((x) => [x, +avg(x).toFixed(2)] as [string, number]).sort((a, b) => b[1] - a[1]).slice(0, 3);
    return { slot, family: f, score: +avg(f).toFixed(2), others };
  });

  return { fonts, layers, available, report };
}
