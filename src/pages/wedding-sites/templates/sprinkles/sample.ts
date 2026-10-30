/**
 * Sprinkles: any heading, as the places its sprinkles come to rest.
 *  - The heading's words are drawn, white on clear, onto an offscreen canvas exactly where the
 *    page set them (each word's own box from a Range, in its own computed font), so any text the
 *    host types, in any font, at any wrap, comes out right.
 *  - Its covered pixels are the icing the sprinkles land on: enough of them, at random, to cover
 *    the letters about one and a half times over (so they read solid, with the odd gap, like real
 *    sprinkles), plus a few spilled just outside the strokes. Sizes come from the type size.
 *  - Seeded by the text, so the builder, the gallery card and the live page lay the same cake.
 *  - paintStill: the settled heading on a 2D canvas (the builder, the card, reduced motion).
 */

export const STRIDE = 6; // x, y, angle, half the rod's straight length (0: a dot), radius, colour
export type Targets = { pts: Float32Array; n: number; w: number; h: number; L: number };

export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const hash = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
};

let scratch: HTMLCanvasElement | null = null;

/** What a heading's sprinkles depend on: its words, its fonts, its size. */
export function headingKey(box: HTMLElement) {
  const r = box.getBoundingClientRect();
  const t = box.querySelector<HTMLElement>(".sp-h__t");
  const cs = t ? getComputedStyle(t) : null;
  return `${box.textContent ?? ""}|${cs?.font ?? ""}|${Math.round(r.width)}x${Math.round(r.height)}`;
}

export function sampleHeading(box: HTMLElement, o: { budget: number; weights: number[]; dots: number; dotSize: number; density?: number }): Targets | null {
  const br = box.getBoundingClientRect();
  const W = Math.ceil(br.width), H = Math.ceil(br.height);
  if (W < 4 || H < 4) return null;

  // ---- the words, where the page set them
  type Word = { t: string; x: number; y: number; h: number; font: string; ls: string; size: number };
  const words: Word[] = [];
  const walker = document.createTreeWalker(box, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
    const el = node.parentElement;
    if (!el || el.closest("canvas, [data-sp-skip]")) continue;
    const cs = getComputedStyle(el);
    const font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    const re = /\S+/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(node.data))) {
      range.setStart(node, m.index);
      range.setEnd(node, m.index + m[0].length);
      const r = range.getClientRects()[0];
      if (!r || r.width < 1) continue;
      words.push({ t: m[0], x: r.left - br.left, y: r.top - br.top, h: r.height, font, ls: cs.letterSpacing, size: parseFloat(cs.fontSize) || 16 });
    }
  }
  if (!words.length) return null;

  // ---- drawn offscreen (at most about a quarter of a million pixels)
  const k = Math.min(1, Math.sqrt(260000 / (W * H)));
  const cw = Math.max(1, Math.ceil(W * k)), ch = Math.max(1, Math.ceil(H * k));
  scratch ??= document.createElement("canvas");
  scratch.width = cw;
  scratch.height = ch;
  const ctx = scratch.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.clearRect(0, 0, cw, ch);
  ctx.setTransform(k, 0, 0, k, 0, 0);
  ctx.fillStyle = "#fff";
  ctx.textBaseline = "alphabetic";
  let minSize = Infinity;
  const c2 = ctx as CanvasRenderingContext2D & { letterSpacing?: string };
  for (const w of words) {
    ctx.font = w.font;
    if ("letterSpacing" in c2) c2.letterSpacing = w.ls === "normal" ? "0px" : w.ls;
    const m = ctx.measureText(w.t);
    const asc = m.fontBoundingBoxAscent ?? w.size * 0.8, desc = m.fontBoundingBoxDescent ?? w.size * 0.2;
    ctx.fillText(w.t, w.x, w.y + (w.h - (asc + desc)) / 2 + asc);
    minSize = Math.min(minSize, w.size);
  }
  const data = ctx.getImageData(0, 0, cw, ch).data;
  const cover: number[] = [];
  for (let i = 0, p = 3; i < cw * ch; i++, p += 4) if (data[p] >= 128) cover.push(i);
  if (!cover.length) return null;

  // ---- how many, how big
  const area = cover.length / (k * k);
  let L = Math.min(11, Math.max(5, minSize * 0.068)); // a rod's whole length
  let rad = L * 0.15;
  const density = o.density ?? 2.1;
  let n = Math.round((area * density) / (L * 2 * rad));
  if (n > o.budget) {
    const s = Math.sqrt(n / o.budget);
    L *= s;
    rad *= s;
    n = o.budget;
  }
  const spill = Math.round(n * 0.012);
  const total = n + spill;
  const rand = rng(hash(words.map((w) => w.t).join(" ")) ^ W);
  const pts = new Float32Array(total * STRIDE);
  const colour = () => {
    const r = rand();
    const i = o.weights.findIndex((w) => r <= w);
    return i < 0 ? o.weights.length - 1 : i;
  };
  // inside the letters (a sprinkle's ends must land on the icing, as if laid through a stencil)
  const inside = (x: number, y: number) => {
    const px = Math.floor(x * k), py = Math.floor(y * k);
    return px >= 0 && py >= 0 && px < cw && py < ch && data[(py * cw + px) * 4 + 3] >= 110;
  };
  for (let i = 0; i < total; i++) {
    const size = 0.86 + rand() * 0.28;
    const dot = rand() < o.dots;
    const r = dot ? rad * o.dotSize * (0.9 + rand() * 0.2) : rad * (0.92 + rand() * 0.16);
    let hl = dot ? 0 : Math.max(0.5, (L * size) / 2 - r);
    let x = 0, y = 0, a = 0;
    if (i >= n) {
      // a few spilled just past the strokes
      const c = cover[Math.floor(rand() * cover.length)];
      const t = rand() * Math.PI * 2, d = L * (0.6 + rand() * 1.6);
      x = (c % cw) / k + Math.cos(t) * d;
      y = Math.floor(c / cw) / k + Math.sin(t) * d;
      a = rand() * Math.PI;
    } else {
      let ok = false;
      for (let tries = 0; tries < 10 && !ok; tries++) {
        const c = cover[Math.floor(rand() * cover.length)];
        x = ((c % cw) + rand()) / k;
        y = (Math.floor(c / cw) + rand()) / k;
        a = rand() * Math.PI;
        const e = hl + r * 0.6, ex = Math.cos(a) * e, ey = Math.sin(a) * e;
        ok = dot || (inside(x + ex, y + ey) && inside(x - ex, y - ey));
      }
      // nowhere it fits whole (a hairline): a dot instead
      if (!ok) hl = 0;
    }
    pts.set([x, y, a, hl, r, colour()], i * STRIDE);
  }
  return { pts, n: total, w: W, h: H, L };
}

/** The settled heading, drawn once on a 2D canvas laid over it (with `pad` round it). */
export function paintStill(canvas: HTMLCanvasElement, t: Targets, pad: number, colours: string[], shadow: [number, number, number, number]) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const W = t.w + pad * 2, H = t.h + pad * 2;
  canvas.width = Math.ceil(W * dpr);
  canvas.height = Math.ceil(H * dpr);
  canvas.style.width = `${W}px`;
  canvas.style.height = `${H}px`;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, pad * dpr, pad * dpr);
  ctx.clearRect(-pad, -pad, W, H);
  ctx.lineCap = "round";
  const seg = (i: number, dx: number, dy: number, grow: number) => {
    const o = i * STRIDE, x = t.pts[o] + dx, y = t.pts[o + 1] + dy, a = t.pts[o + 2], hl = t.pts[o + 3], r = t.pts[o + 4] + grow;
    const c = Math.cos(a) * hl, s = Math.sin(a) * hl;
    ctx.lineWidth = r * 2;
    ctx.beginPath();
    ctx.moveTo(x - c, y - s);
    ctx.lineTo(x + c + (hl ? 0 : 0.01), y + s);
    ctx.stroke();
  };
  const L = t.L;
  ctx.strokeStyle = `rgba(${shadow[0]}, ${shadow[1]}, ${shadow[2]}, ${shadow[3]})`;
  for (let i = 0; i < t.n; i++) seg(i, L * 0.04, L * 0.1, 0.3);
  for (let i = 0; i < t.n; i++) {
    ctx.strokeStyle = colours[t.pts[i * STRIDE + 5]] ?? colours[0];
    seg(i, 0, 0, 0);
  }
  // a little light along the top of each
  ctx.strokeStyle = "rgba(255, 255, 255, 0.28)";
  for (let i = 0; i < t.n; i++) {
    const o = i * STRIDE, hl = t.pts[o + 3], r = t.pts[o + 4];
    const x = t.pts[o], y = t.pts[o + 1], a = t.pts[o + 2];
    const c = Math.cos(a) * hl * 0.8, s = Math.sin(a) * hl * 0.8;
    ctx.lineWidth = r * 0.6;
    ctx.beginPath();
    ctx.moveTo(x - c - r * 0.2, y - s - r * 0.4);
    ctx.lineTo(x + c - r * 0.2 + 0.01, y + s - r * 0.4);
    ctx.stroke();
  }
}
