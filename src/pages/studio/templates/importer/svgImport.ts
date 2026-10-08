import type { DetectedBox, Detection } from "./detect";
import { renderSvg, type SvgAnalysis } from "./svg";

// Glue between the one-SVG analysis (svg.ts) and the shared import steps:
// the AI sees numbered boxes on a render of the design, then the artwork is
// rendered with the confirmed text elements removed.

const ANALYSIS_W = 1000;
const ART_MAX_W = 1400;

/** Numbered tiles + full render, from the SVG's own letter lines. */
export async function svgDetection(a: SvgAnalysis): Promise<Omit<Detection, "art" | "artSize">> {
  const full = await renderSvg(a.tagged, ANALYSIS_W);
  const W = full.width;
  const H = full.height;
  const boxes: DetectedBox[] = a.candidates.map((c) => ({
    n: c.n,
    x: c.x,
    y: c.y,
    w: c.w,
    h: c.h,
    color: c.color,
    ...(c.rotate ? { rotate: c.rotate, cx: c.cx, cy: c.cy, rw: c.rw, rh: c.rh } : {}),
  }));

  const ann = document.createElement("canvas");
  ann.width = W;
  ann.height = H;
  const ctx = ann.getContext("2d")!;
  ctx.drawImage(full, 0, 0);
  ctx.lineWidth = 2;
  ctx.font = "bold 13px sans-serif";
  for (const b of boxes) {
    const x = b.x * W - 3;
    const y = b.y * H - 3;
    ctx.strokeStyle = "#ff00aa";
    ctx.strokeRect(x, y, b.w * W + 6, b.h * H + 6);
    const tag = String(b.n);
    const tw = ctx.measureText(tag).width + 8;
    const lx = x - tw - 2 >= 0 ? x - tw - 2 : x;
    const ly = x - tw - 2 >= 0 ? y : Math.max(0, y - 18);
    ctx.fillStyle = "#ff00aa";
    ctx.fillRect(lx, ly, tw, 17);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(tag, lx + 4, ly + 13);
  }
  // Pictures that could be photos: cyan outlines (tilt included), "P<n>".
  for (const p of a.pictures) {
    ctx.save();
    ctx.translate(p.cx * W, p.cy * H);
    ctx.rotate((p.rotate * Math.PI) / 180);
    ctx.strokeStyle = "#00c8ff";
    ctx.lineWidth = 3;
    ctx.strokeRect((-p.rw * W) / 2, (-p.rh * H) / 2, p.rw * W, p.rh * H);
    ctx.fillStyle = "#00c8ff";
    ctx.fillRect((-p.rw * W) / 2, (-p.rh * H) / 2, 34, 18);
    ctx.fillStyle = "#000";
    ctx.fillText(`P${p.n}`, (-p.rw * W) / 2 + 3, (-p.rh * H) / 2 + 14);
    ctx.restore();
  }
  // Long designs: band boundaries (green) and numbers "B<n>" down the left edge.
  if (a.cuts.length) {
    const edges = [0, ...a.cuts, 1];
    ctx.setLineDash([10, 6]);
    ctx.strokeStyle = "#00e04a";
    ctx.lineWidth = 2;
    edges.slice(1, -1).forEach((y) => (ctx.beginPath(), ctx.moveTo(0, y * H), ctx.lineTo(W, y * H), ctx.stroke()));
    ctx.setLineDash([]);
    edges.slice(0, -1).forEach((y, j) => {
      ctx.fillStyle = "#00e04a";
      ctx.fillRect(0, y * H + 4, 34, 18);
      ctx.fillStyle = "#000";
      ctx.fillText(`B${j + 1}`, 4, y * H + 18);
    });
  }

  const tileH = Math.max(600, Math.round(1_100_000 / W));
  const tiles: string[] = [];
  for (let top = 0; top < H; top += tileH - 60) {
    const h = Math.min(tileH, H - top);
    const t = document.createElement("canvas");
    t.width = W;
    t.height = h;
    t.getContext("2d")!.drawImage(ann, 0, top, W, h, 0, 0, W, h);
    tiles.push(t.toDataURL("image/jpeg", 0.85).split(",")[1]);
    if (top + h >= H) break;
  }
  return { width: W, height: H, boxes, tiles, designUrl: full.toDataURL("image/jpeg", 0.88) };
}

/** What the AI is told about pictures and bands (alongside the text boxes). */
export function svgContext(a: SvgAnalysis) {
  const r = (v: number) => +v.toFixed(3);
  const edges = [0, ...a.cuts, 1];
  return {
    pictures: a.pictures.map((p) => ({ p: p.n, x: r(p.x), y: r(p.y), w: r(p.w), h: r(p.h), format: p.format, tilt: Math.round(p.rotate) })),
    bands: a.cuts.length ? edges.slice(0, -1).map((y0, j) => ({ b: j + 1, y0: r(y0), y1: r(edges[j + 1]) })) : [],
  };
}

/** Elements (letters + their effects) behind the given box numbers. */
export function elementsFor(a: SvgAnalysis, boxNumbers: Iterable<number>): Set<number> {
  const byN = new Map(a.candidates.map((c) => [c.n, c]));
  const ks = new Set<number>();
  for (const n of boxNumbers) {
    const c = byN.get(n);
    if (!c) continue;
    c.ks.forEach((k) => ks.add(k));
    c.effects.forEach((k) => ks.add(k));
  }
  return ks;
}

/** The artwork without the text (WebP, compressed to a sensible weight). */
export async function renderArt(a: SvgAnalysis, remove: Set<number>): Promise<{ art: File; artSize: { w: number; h: number } }> {
  let w = Math.min(ART_MAX_W, Math.max(1000, Math.round(a.width)));
  let q = 0.86;
  for (let attempt = 0; ; attempt++) {
    const c = await renderSvg(a.tagged, w, { hide: remove, background: null });
    const blob = await new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("Couldn't encode the artwork."))), "image/webp", q));
    if (blob.size < 900_000 || attempt === 3) return { art: new File([blob], "artwork.webp", { type: "image/webp" }), artSize: { w: c.width, h: c.height } };
    q -= 0.08;
    w = Math.round(w * 0.85);
  }
}

export interface MeasuredShadow {
  x: number;
  y: number;
  blur: number;
  color: string;
}

/**
 * Turn a line's baked shadow picture back into a CSS text-shadow: colour
 * from its pixels, offset from how far its centre sits from the letters,
 * blur from how far it spreads beyond them. Units: % of design width.
 */
export async function measureShadow(a: SvgAnalysis, n: number): Promise<MeasuredShadow | null> {
  const c = a.candidates.find((x) => x.n === n);
  if (!c?.effects.length) return null;
  const canvas = await renderSvg(a.tagged, ANALYSIS_W, { only: new Set(c.effects), background: null });
  const W = canvas.width;
  const H = canvas.height;
  const px = canvas.getContext("2d")!.getImageData(0, 0, W, H).data;
  let x0 = W, y0 = H, x1 = 0, y1 = 0;
  let r = 0, g = 0, b = 0, wsum = 0;
  const alphas: number[] = [];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const p = (y * W + x) * 4;
      const al = px[p + 3];
      if (al < 10) continue;
      x0 = Math.min(x0, x);
      y0 = Math.min(y0, y);
      x1 = Math.max(x1, x);
      y1 = Math.max(y1, y);
      r += px[p] * al;
      g += px[p + 1] * al;
      b += px[p + 2] * al;
      wsum += al;
      alphas.push(al);
    }
  }
  if (!wsum) return null;
  alphas.sort((m, k) => m - k);
  const alpha = alphas[Math.floor(alphas.length * 0.9)] ?? 128;
  const hex = (v: number) => Math.round(v).toString(16).padStart(2, "0");
  const lx = c.x * W, ly = c.y * H, lw = c.w * W, lh = c.h * H;
  const unit = W / 100; // 1 canvas unit in px
  const spread = Math.max(0, (x1 - x0 - lw) / 2, (y1 - y0 - lh) / 2);
  const shadow = {
    x: +(((x0 + x1) / 2 - (lx + lw / 2)) / unit).toFixed(2),
    y: +(((y0 + y1) / 2 - (ly + lh / 2)) / unit).toFixed(2),
    blur: +Math.min(10, spread / unit).toFixed(2),
    color: `#${hex(r / wsum)}${hex(g / wsum)}${hex(b / wsum)}${hex(alpha)}`,
  };
  // Real text shadows are subtle; anything bigger wasn't a shadow.
  if (Math.abs(shadow.x) > 2 || Math.abs(shadow.y) > 2 || shadow.blur > 4) return null;
  return shadow;
}

/** The code colour line n is drawn in on the text mask (see renderTextMask). */
export const maskColor = (n: number) => [n % 256, 40 + Math.floor(n / 256), 200] as const;

/**
 * Only the text, each line in its own code colour, rendered sharp enough
 * that small text keeps its letter shapes (median line ≥ ~26px tall). The
 * font matcher reads one line's pixels by colour, so lines that overlap
 * (a script name over a small heading) don't contaminate each other.
 */
export async function renderTextMask(a: SvgAnalysis, boxNumbers: number[]) {
  const lines = a.candidates.filter((c) => boxNumbers.includes(c.n));
  const doc = new DOMParser().parseFromString(a.tagged, "image/svg+xml");
  const color = new Map<number, string>();
  for (const c of lines) {
    const [r, g, b] = maskColor(c.n);
    for (const k of c.ks) color.set(k, `rgb(${r},${g},${b})`);
  }
  for (const el of Array.from(doc.querySelectorAll("[data-k]"))) {
    const k = Number(el.getAttribute("data-k"));
    const col = color.get(k);
    if (!col) {
      el.remove();
      continue;
    }
    el.setAttribute("fill", col);
    el.setAttribute("fill-opacity", "1");
    el.setAttribute("opacity", "1");
    (el as SVGElement).style?.setProperty("fill", col);
    (el as SVGElement).style?.setProperty("fill-opacity", "1");
  }
  const hs = lines.map((c) => c.h * a.height).sort((x, y) => x - y);
  const medianH = hs[hs.length >> 1] || 20;
  const aspect = a.height / a.width;
  let width = Math.round(Math.min(2400, Math.max(ANALYSIS_W, (26 / medianH) * a.width)));
  while (width * width * aspect > 40_000_000) width = Math.round(width * 0.9);
  return renderSvg(new XMLSerializer().serializeToString(doc), width, { background: null });
}

// ---------------------------------------------------------------------------
// Photos, layers and bands (long designs).

export interface SvgBuild {
  /** Customer photo slots, in slot order. Positions normalized to the whole design. */
  photos: { slot: number; hint?: string; cx: number; cy: number; rw: number; rh: number; rotate: number; z: number; src: string }[];
  /** Artwork drawn ON TOP of photos (tape, stamps, overlapping frames). */
  overlays: { id: string; file: File; x: number; y: number; w: number; h: number; z: number }[];
  /** Bands top to bottom (one band = the whole design). Each has its own background art. */
  bands: { y0: number; y1: number; key?: string; color: string; art: File; artSize: { w: number; h: number } }[];
  /** The design's width in its own units (to pick a sensible max width). */
  designWidth: number;
  /** Per text box: how far it can widen while staying on the same background. */
  room: Record<number, { x0: number; x1: number }>;
}

/**
 * How far each text line can widen and still sit on the same background
 * (a cream panel inside a dark arch): walk left and right along the line's
 * rows until the colour behind it clearly changes.
 */
function roomFor(base: HTMLCanvasElement, boxes: { n: number; x: number; y: number; w: number; h: number }[]) {
  const W = base.width;
  const H = base.height;
  const data = base.getContext("2d", { willReadFrequently: true })!.getImageData(0, 0, W, H).data;
  const luma = (x: number, y: number) => {
    const p = (Math.min(H - 1, Math.max(0, y)) * W + Math.min(W - 1, Math.max(0, x))) * 4;
    return data[p + 3] < 20 ? -1 : 0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2];
  };
  const out: Record<number, { x0: number; x1: number }> = {};
  for (const b of boxes) {
    const rows = [0.25, 0.5, 0.75].map((f) => Math.round((b.y + b.h * f) * H));
    const x0 = Math.round(b.x * W);
    const x1 = Math.round((b.x + b.w) * W);
    // The background right next to the text, on each side.
    const ref = rows.map((y) => [luma(x0 - 3, y), luma(x1 + 3, y)]);
    const walk = (dir: -1 | 1) => {
      let x = dir < 0 ? x0 : x1;
      for (let run = 0; x > 0 && x < W - 1; x += dir) {
        const off = rows.some((y, i) => {
          const r = ref[i][dir < 0 ? 0 : 1];
          const v = luma(x, y);
          return r >= 0 && v >= 0 && Math.abs(v - r) > 70;
        });
        // A few changed pixels in a row = a real edge (not a speck or a letter).
        run = off ? run + 1 : 0;
        if (run > 4) return x - dir * 5;
      }
      return x;
    };
    out[b.n] = { x0: walk(-1) / W, x1: walk(1) / W };
  }
  return out;
}

async function encodeWebp(c: HTMLCanvasElement, name: string) {
  let canvas = c;
  let q = 0.86;
  for (let attempt = 0; ; attempt++) {
    const blob = await new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("Couldn't encode the artwork."))), "image/webp", q));
    if (blob.size < 900_000 || attempt === 3) return { file: new File([blob], name, { type: "image/webp" }), w: canvas.width, h: canvas.height };
    q -= 0.08;
    const smaller = document.createElement("canvas");
    smaller.width = Math.round(canvas.width * 0.85);
    smaller.height = Math.round(canvas.height * 0.85);
    smaller.getContext("2d")!.drawImage(canvas, 0, 0, smaller.width, smaller.height);
    canvas = smaller;
  }
}

function crop(c: HTMLCanvasElement, x: number, y: number, w: number, h: number) {
  const out = document.createElement("canvas");
  out.width = Math.max(1, Math.round(w));
  out.height = Math.max(1, Math.round(h));
  out.getContext("2d")!.drawImage(c, Math.round(x), Math.round(y), out.width, out.height, 0, 0, out.width, out.height);
  return out;
}

function alphaBox(c: HTMLCanvasElement) {
  const d = c.getContext("2d", { willReadFrequently: true })!.getImageData(0, 0, c.width, c.height).data;
  let x0 = c.width, y0 = c.height, x1 = -1, y1 = -1;
  for (let y = 0; y < c.height; y++)
    for (let x = 0; x < c.width; x++) if (d[(y * c.width + x) * 4 + 3] > 4) ((x0 = Math.min(x0, x)), (y0 = Math.min(y0, y)), (x1 = Math.max(x1, x)), (y1 = Math.max(y1, y)));
  return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

/** Dominant colour along a band's left and right edges (what to extend it with on wide screens). */
function edgeColor(c: HTMLCanvasElement, y0: number, y1: number) {
  const ctx = c.getContext("2d", { willReadFrequently: true })!;
  const h = Math.max(1, Math.round(y1 - y0));
  const px = [...ctx.getImageData(0, Math.round(y0), 3, h).data, ...ctx.getImageData(c.width - 3, Math.round(y0), 3, h).data];
  const rs: number[] = [], gs: number[] = [], bs: number[] = [];
  for (let i = 0; i < px.length; i += 4) if (px[i + 3] > 200) (rs.push(px[i]), gs.push(px[i + 1]), bs.push(px[i + 2]));
  if (!rs.length) return "#ffffff";
  const med = (a: number[]) => a.sort((m, n) => m - n)[a.length >> 1];
  return "#" + [med(rs), med(gs), med(bs)].map((v) => v.toString(16).padStart(2, "0")).join("");
}

const overlaps = (a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) =>
  Math.min(a.x + a.w, b.x + b.w) > Math.max(a.x, b.x) && Math.min(a.y + a.h, b.y + b.h) > Math.max(a.y, b.y);

/**
 * Split the design into: background art per band, customer photo slots,
 * and art that sits on top of photos — keeping the original paint order, so
 * a customer's photo slides in exactly where the sample photo was.
 */
export async function buildSvgLayers(
  a: SvgAnalysis,
  textBoxes: number[],
  photoPicks: { p: number; hint?: string }[],
  bandKeys: Record<number, string>,
): Promise<SvgBuild> {
  const ART_W = Math.min(ART_MAX_W, Math.max(1000, Math.round(a.width)));
  const text = elementsFor(a, textBoxes);
  const byP = new Map(a.pictures.map((p) => [p.n, p]));
  const photos = photoPicks.map((x) => ({ ...x, pic: byP.get(x.p) })).filter((x): x is typeof x & { pic: NonNullable<typeof x.pic> } => !!x.pic);
  const photoKs = new Set(photos.map((x) => x.pic.k));
  const byPaint = [...photos].sort((m, n) => m.pic.k - n.pic.k);

  // Each later element that overlaps an earlier photo belongs above it:
  // group it with the topmost such photo (one overlay layer per photo).
  const chunks = byPaint.map(() => new Set<number>());
  for (const l of a.leaves) {
    if (text.has(l.k) || photoKs.has(l.k) || l.w > 0.95) continue;
    let top = -1;
    byPaint.forEach((ph, i) => {
      if (ph.pic.k < l.k && overlaps(l, ph.pic)) top = i;
    });
    if (top >= 0) chunks[top].add(l.k);
  }

  const overlays: SvgBuild["overlays"] = [];
  for (let i = 0; i < chunks.length; i++) {
    if (!chunks[i].size) continue;
    const c = await renderSvg(a.tagged, ART_W, { only: chunks[i], background: null });
    const box = alphaBox(c);
    if (!box) continue;
    const enc = await encodeWebp(crop(c, box.x, box.y, box.w, box.h), `overlay-${i + 1}.webp`);
    overlays.push({ id: `overlay-${i + 1}`, file: enc.file, x: box.x / c.width, y: box.y / c.height, w: box.w / c.width, h: box.h / c.height, z: 3 + i * 2 });
  }

  // Background art: everything except text, photos and on-top art.
  const hide = new Set([...text, ...photoKs, ...chunks.flatMap((c) => [...c])]);
  const base = await renderSvg(a.tagged, ART_W, { hide, background: null });
  const edges = [0, ...a.cuts, 1];
  const bands: SvgBuild["bands"] = [];
  for (let j = 0; j < edges.length - 1; j++) {
    const y0 = edges[j];
    const y1 = edges[j + 1];
    const slice = edges.length === 2 ? base : crop(base, 0, y0 * base.height, base.width, (y1 - y0) * base.height);
    const enc = await encodeWebp(slice, edges.length === 2 ? "artwork.webp" : `artwork-${j + 1}.webp`);
    bands.push({ y0, y1, key: bandKeys[j + 1], color: edgeColor(base, y0 * base.height, y1 * base.height), art: enc.file, artSize: { w: enc.w, h: enc.h } });
  }

  const room = roomFor(base, a.candidates.filter((c) => textBoxes.includes(c.n)));

  return {
    room,
    photos: photos.map((x, slot) => {
      const order = byPaint.findIndex((b) => b.p === x.p);
      return { slot, hint: x.hint, cx: x.pic.cx, cy: x.pic.cy, rw: x.pic.rw, rh: x.pic.rh, rotate: x.pic.rotate, z: 2 + order * 2, src: x.pic.src };
    }),
    overlays,
    bands,
    designWidth: a.width,
  };
}
