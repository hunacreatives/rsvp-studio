/**
 * Ink and vows: how a line of script is written. From the real glyphs of the script face (set
 * by the browser's own text engine, so any name or heading works), this finds the strokes a pen
 * would make and the order and speed it would make them in:
 *  - the text is set on a canvas at a working size, its ink thinned to a one-pixel skeleton
 *    (Zhang–Suen, then the staircase corners taken out), short spurs pruned;
 *  - the skeleton becomes a graph (ends, junctions, the strokes between), and each connected
 *    piece is written from its leftmost end, carrying on through each junction along the
 *    straightest way out; a dead end lifts the pen (or runs back over wet ink when the next
 *    stroke starts close by); dots and accents come after the word they sit on;
 *  - the pen slows on the thick, pressed downstrokes and through tight turns, and speeds up
 *    on the hairlines;
 *  - every pixel of ink then takes the time of the nearest point of its stroke (a geodesic
 *    flood inside the ink), so it appears exactly when the nib passes it.
 * The result: a time map (when each pixel is inked), a blurred coverage map (for the wet bead
 * and the bleed into the paper), the sharp glyphs at the screen's pixels, and the nib's path.
 */

export type Run = {
  text: string;
  /** Where the run starts and its baseline, in the canvas's CSS pixels. */
  x: number;
  baseline: number;
  /** CSS font shorthand parts. */
  style: string;
  weight: string;
  size: number;
  family: string;
  /** The run's box (CSS px, canvas coordinates), used to tell which run a stroke belongs to. */
  box: [number, number, number, number];
  /** Not text: a flourish drawn as a pointed pen would make it, filling `box`. */
  shape?: "flourish";
};

export type Layout = { w: number; h: number; runs: Run[]; em: number };

/** The text set on canvases (main thread): the sharp glyphs at the screen's pixels and the ink's
 *  coverage at the working size, for the analysis. */
export type Raster = {
  cssW: number;
  cssH: number;
  /** Device pixels per CSS pixel of the glyph canvas. */
  S: number;
  dW: number;
  dH: number;
  glyph: HTMLCanvasElement;
  /** Working pixels per CSS pixel (the working canvas has a one-pixel border). */
  ws: number;
  wW: number;
  wH: number;
};
/** What the analysis needs (plain data, so it can go to a worker). */
export type AnalysisInput = { alpha: Uint8Array; wW: number; wH: number; ws: number; em: number; boxes: [number, number, number, number][]; speed: number; maxDur: number };
/** What it finds. */
export type Analysis = {
  /** RGBA, working size: RG = time (16 bit, 65535 = never), B = distance from the stroke's
   *  centre over its half width (×100), A = 255. */
  time: Uint8Array;
  /** Luminance, working size: the ink's coverage, blurred. */
  soft: Uint8Array;
  /** The nib's path: x, y (CSS px), t (s), height above the paper (0 = writing), pressure. */
  path: Float32Array;
  /** Seconds from the first touch to the last lift. */
  dur: number;
};
export type Prepared = Raster & Analysis;

const font = (r: Run, k: number) => `${r.style} ${r.weight} ${(r.size * k).toFixed(2)}px ${r.family}`;

/** A flourish as a pointed pen makes it: a hairline that swells on the way down through one small
 *  loop, tapering at both ends; drawn as a filled outline into `ctx` (scaled by `k`). */
function flourish(ctx: CanvasRenderingContext2D, [x, y, w, h]: [number, number, number, number], k: number) {
  const n = 220, L: [number, number][] = [], R: [number, number][] = [];
  const r = h * 0.34, mid = y + h * 0.62;
  const pts: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    let px = x + w * t, py = mid - h * 0.16 * Math.sin(Math.PI * 2 * t);
    // the loop, between 44% and 58% of the way along
    const a = (t - 0.44) / 0.14;
    if (a > 0 && a < 1) {
      const e = a * a * (3 - 2 * a), th = e * Math.PI * 2;
      px += Math.sin(th) * r * 1.15 + w * 0.14 * (e - a);
      py -= (1 - Math.cos(th)) * r;
    }
    pts.push([px, py]);
  }
  const hair = Math.max(0.5, h * 0.035), thick = h * 0.17;
  for (let i = 0; i <= n; i++) {
    const p = pts[Math.max(0, i - 1)], q = pts[Math.min(n, i + 1)];
    const dx = q[0] - p[0], dy = q[1] - p[1], l = Math.hypot(dx, dy) || 1;
    const t = i / n, taper = Math.min(1, t / 0.12, (1 - t) / 0.16);
    const down = Math.max(0, dy / l);
    const hw = (hair + (thick - hair) * Math.pow(down, 1.4) * Math.min(1, taper * 1.3)) * 0.5 * Math.max(0.25, taper);
    const nx = -dy / l, ny = dx / l;
    L.push([(pts[i][0] + nx * hw) * k, (pts[i][1] + ny * hw) * k]);
    R.push([(pts[i][0] - nx * hw) * k, (pts[i][1] - ny * hw) * k]);
  }
  ctx.beginPath();
  ctx.moveTo(L[0][0], L[0][1]);
  for (const p of L) ctx.lineTo(p[0], p[1]);
  for (let i = R.length - 1; i >= 0; i--) ctx.lineTo(R[i][0], R[i][1]);
  ctx.closePath();
  ctx.fill("nonzero");
}

// ---------------------------------------------------------------------------------------------
// the skeleton

// neighbours, clockwise from the top left
const DX = [-1, 0, 1, 1, 1, 0, -1, -1];
const DY = [-1, -1, -1, 0, 1, 1, 1, 0];

/** How many 8-connected groups the set neighbours of a pixel form (by their bit mask). */
const GROUPS = (() => {
  const t = new Uint8Array(256);
  for (let m = 0; m < 256; m++) {
    const seen = new Array(8).fill(false);
    let g = 0;
    for (let i = 0; i < 8; i++) {
      if (!(m & (1 << i)) || seen[i]) continue;
      g++;
      const st = [i];
      seen[i] = true;
      while (st.length) {
        const a = st.pop()!;
        for (let j = 0; j < 8; j++) {
          if (seen[j] || !(m & (1 << j))) continue;
          if (Math.max(Math.abs(DX[a] - DX[j]), Math.abs(DY[a] - DY[j])) === 1) { seen[j] = true; st.push(j); }
        }
      }
    }
    t[m] = g;
  }
  return t;
})();

function thin(img: Uint8Array, w: number, h: number) {
  let cand: number[] = [];
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) if (img[y * w + x]) cand.push(y * w + x);
  const del: number[] = [];
  for (let changed = true; changed; ) {
    changed = false;
    for (let pass = 0; pass < 2; pass++) {
      del.length = 0;
      for (const i of cand) {
        if (!img[i]) continue;
        const p2 = img[i - w], p3 = img[i - w + 1], p4 = img[i + 1], p5 = img[i + w + 1], p6 = img[i + w], p7 = img[i + w - 1], p8 = img[i - 1], p9 = img[i - w - 1];
        const B = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9;
        if (B < 2 || B > 6) continue;
        const A = +(!p2 && !!p3) + +(!p3 && !!p4) + +(!p4 && !!p5) + +(!p5 && !!p6) + +(!p6 && !!p7) + +(!p7 && !!p8) + +(!p8 && !!p9) + +(!p9 && !!p2);
        if (A !== 1) continue;
        if (pass === 0 ? p2 * p4 * p6 || p4 * p6 * p8 : p2 * p4 * p8 || p2 * p6 * p8) continue;
        del.push(i);
      }
      for (const i of del) img[i] = 0;
      if (del.length) changed = true;
    }
    cand = cand.filter((i) => img[i]);
  }
  // the staircase corners: a pixel whose neighbours stay joined without it, and that isn't an end
  for (const i of cand) {
    let m = 0, n = 0;
    for (let k = 0; k < 8; k++) if (img[i + DY[k] * w + DX[k]]) { m |= 1 << k; n++; }
    if (n >= 2 && GROUPS[m] === 1) img[i] = 0;
  }
  return cand.filter((i) => img[i]);
}

/** Chamfer (3-4) distance to the background, in pixels. */
function distance(bin: Uint8Array, w: number, h: number) {
  const d = new Float32Array(w * h);
  const BIG = 1e6;
  for (let i = 0; i < w * h; i++) d[i] = bin[i] ? BIG : 0;
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x;
    if (!d[i]) continue;
    d[i] = Math.min(d[i], d[i - 1] + 3, d[i - w] + 3, d[i - w - 1] + 4, d[i - w + 1] + 4);
  }
  for (let y = h - 2; y > 0; y--) for (let x = w - 2; x > 0; x--) {
    const i = y * w + x;
    if (!d[i]) continue;
    d[i] = Math.min(d[i], d[i + 1] + 3, d[i + w] + 3, d[i + w + 1] + 4, d[i + w - 1] + 4);
  }
  for (let i = 0; i < w * h; i++) d[i] /= 3;
  return d;
}

type Node = { pix: number[]; x: number; y: number; edges: number[] };
type Edge = { a: number; b: number; px: number[]; len: number };

function graph(sk: Uint8Array, pixels: number[], w: number) {
  const count = (i: number) => { let n = 0; for (let k = 0; k < 8; k++) if (sk[i + DY[k] * w + DX[k]]) n++; return n; };
  const nodeOf = new Map<number, number>();
  const nodes: Node[] = [];
  const isNode = (i: number) => { const c = count(i); return c !== 2; };
  for (const i of pixels) {
    if (nodeOf.has(i) || !isNode(i)) continue;
    const id = nodes.length, pix: number[] = [], st = [i];
    nodeOf.set(i, id);
    while (st.length) {
      const p = st.pop()!;
      pix.push(p);
      for (let k = 0; k < 8; k++) {
        const q = p + DY[k] * w + DX[k];
        if (sk[q] && !nodeOf.has(q) && isNode(q)) { nodeOf.set(q, id); st.push(q); }
      }
    }
    let sx = 0, sy = 0;
    for (const p of pix) { sx += p % w; sy += (p / w) | 0; }
    nodes.push({ pix, x: sx / pix.length, y: sy / pix.length, edges: [] });
  }
  const edgeOf = new Map<number, number>();
  const edges: Edge[] = [];
  const step = (a: number, b: number) => (Math.abs(a - b) === 1 || Math.abs(a - b) === w ? 1 : Math.SQRT2);
  const walk = (start: number, first: number, startNode: number) => {
    const px = [start, first];
    let prev = start, cur = first, end = -1;
    edgeOf.set(first, edges.length);
    for (let guard = 0; guard < 100000; guard++) {
      let next = -1;
      for (let k = 0; k < 8; k++) {
        const q = cur + DY[k] * w + DX[k];
        if (!sk[q] || q === prev || px[px.length - 2] === q) continue;
        if (nodeOf.has(q)) { if (q !== start || px.length > 3) { next = q; break; } continue; }
        if (!edgeOf.has(q)) { next = q; }
      }
      if (next < 0) break;
      px.push(next);
      if (nodeOf.has(next)) { end = nodeOf.get(next)!; break; }
      edgeOf.set(next, edges.length);
      prev = cur;
      cur = next;
    }
    if (end < 0) {
      // a chain that just stops (a broken bit of skeleton): its last pixel is an end
      const last = px[px.length - 1];
      end = nodes.length;
      nodeOf.set(last, end);
      nodes.push({ pix: [last], x: last % w, y: (last / w) | 0, edges: [] });
    }
    let len = 0;
    for (let i = 1; i < px.length; i++) len += step(px[i - 1], px[i]);
    const id = edges.length;
    edges.push({ a: startNode, b: end, px, len });
    nodes[startNode].edges.push(id);
    if (end !== startNode) nodes[end].edges.push(id);
    else nodes[end].edges.push(id);
  };
  for (let n = 0; n < nodes.length; n++) {
    for (const p of [...nodes[n].pix]) {
      for (let k = 0; k < 8; k++) {
        const q = p + DY[k] * w + DX[k];
        if (sk[q] && !nodeOf.has(q) && !edgeOf.has(q)) walk(p, q, n);
      }
    }
  }
  // closed loops with no end or junction (an o on its own): a node anywhere on them
  for (const i of pixels) {
    if (!sk[i] || nodeOf.has(i) || edgeOf.has(i)) continue;
    const id = nodes.length;
    nodeOf.set(i, id);
    nodes.push({ pix: [i], x: i % w, y: (i / w) | 0, edges: [] });
    for (let k = 0; k < 8; k++) {
      const q = i + DY[k] * w + DX[k];
      if (sk[q] && !nodeOf.has(q) && !edgeOf.has(q)) { walk(i, q, id); break; }
    }
  }
  return { nodes, edges, nodeOf };
}

// ---------------------------------------------------------------------------------------------

/** Sets the text (and any flourish) on canvases: the glyphs at the screen's pixels, and the
 *  coverage at the working size. Main thread (it needs the page's fonts); a few milliseconds. */
export function rasterize(layout: Layout, { speed = 6, maxDur = 3, dpr = 1 }: { speed?: number; maxDur?: number; dpr?: number }): { raster: Raster; input: AnalysisInput } | null {
  const { w: cssW, h: cssH, runs, em } = layout;
  if (cssW < 4 || cssH < 4 || !runs.length) return null;
  // the screen's pixels for the glyphs: sharp on retina, never more than 2 (the ink is drawn
  // every frame while it's written), and capped for very large canvases
  let S = Math.max(1, Math.min(2, dpr));
  S = Math.min(S, 4096 / cssW, 4096 / cssH, Math.sqrt(7e6 / (cssW * cssH)));
  const dW = Math.max(1, Math.round(cssW * S)), dH = Math.max(1, Math.round(cssH * S));
  const glyph = document.createElement("canvas");
  glyph.width = dW;
  glyph.height = dH;
  const gc = glyph.getContext("2d");
  if (!gc) return null;
  const set = (c: CanvasRenderingContext2D, k: number, o: number) => {
    c.fillStyle = "#fff";
    c.textBaseline = "alphabetic";
    for (const r of runs) {
      if (r.shape === "flourish") { c.save(); c.translate(o, o); flourish(c, r.box, k); c.restore(); continue; }
      c.font = font(r, k);
      c.fillText(r.text, r.x * k + o, r.baseline * k + o);
    }
  };
  set(gc, S, 0);
  // the working size: an em of about 120 pixels, whatever the size on screen
  let ws = Math.min(4, Math.max(0.5, 120 / em));
  ws = Math.min(ws, Math.sqrt(1.6e6 / (cssW * cssH)));
  const wW = Math.max(3, Math.round(cssW * ws)) + 2, wH = Math.max(3, Math.round(cssH * ws)) + 2;
  const wc = document.createElement("canvas");
  wc.width = wW;
  wc.height = wH;
  const wx = wc.getContext("2d", { willReadFrequently: true });
  if (!wx) return null;
  set(wx, ws, 1);
  const img = wx.getImageData(0, 0, wW, wH).data;
  const alpha = new Uint8Array(wW * wH);
  for (let i = 0; i < alpha.length; i++) alpha[i] = img[i * 4 + 3];
  return { raster: { cssW, cssH, S, dW, dH, glyph, ws, wW, wH }, input: { alpha, wW, wH, ws, em, boxes: runs.map((r) => r.box), speed, maxDur } };
}

/** The whole thing on this thread (when there's no worker). */
export function prepare(layout: Layout, opts: { speed?: number; maxDur?: number; dpr?: number }): Prepared | null {
  const r = rasterize(layout, opts);
  if (!r) return null;
  const an = analyse(r.input);
  return an ? { ...r.raster, ...an } : null;
}

/** The strokes, their order and timing, and the time map. Plain data in and out: runs in a
 *  worker (strokes.worker.ts), so working it out never holds up the page. */
export function analyse({ alpha, wW, wH, ws, em, boxes, speed, maxDur }: AnalysisInput): Analysis | null {
  const N = wW * wH;
  const a = new Float32Array(N), bin = new Uint8Array(N);
  for (let i = 0; i < N; i++) { a[i] = alpha[i] / 255; }
  for (let y = 1; y < wH - 1; y++) for (let x = 1; x < wW - 1; x++) { const i = y * wW + x; bin[i] = a[i] > 0.3 ? 1 : 0; }
  const dist = distance(bin, wW, wH);
  const sk = new Uint8Array(bin);
  let pixels = thin(sk, wW, wH);
  const emW = em * ws;

  // prune the spurs thinning leaves at corners and blunt ends
  let g = graph(sk, pixels, wW);
  for (let pass = 0; pass < 2; pass++) {
    let cut = false;
    for (const e of g.edges) {
      const na = g.nodes[e.a], nb = g.nodes[e.b];
      const da = na.edges.length, db = nb.edges.length;
      const end = da === 1 && db >= 3 ? 0 : db === 1 && da >= 3 ? 1 : -1;
      if (end < 0) continue;
      const j = end === 0 ? nb : na;
      const rj = dist[j.pix[0]] || 1;
      if (e.len < Math.max(3, 1.5 * rj)) {
        const jn = end === 0 ? e.b : e.a;
        for (const p of e.px) if (g.nodeOf.get(p) !== jn) sk[p] = 0;
        cut = true;
      }
    }
    if (!cut) break;
    pixels = pixels.filter((i) => sk[i]);
    g = graph(sk, pixels, wW);
  }
  const { nodes, edges } = g;
  if (!edges.length && !nodes.length) return null;

  // the connected pieces, each with its run (line) and its extent
  const comp = new Int32Array(nodes.length).fill(-1);
  const pieces: { nodes: number[]; edges: number[]; minX: number; maxX: number; cx: number; cy: number; len: number; run: number }[] = [];
  for (let n = 0; n < nodes.length; n++) {
    if (comp[n] >= 0) continue;
    const id = pieces.length, st = [n], ns: number[] = [], es = new Set<number>();
    comp[n] = id;
    while (st.length) {
      const m = st.pop()!;
      ns.push(m);
      for (const e of nodes[m].edges) {
        es.add(e);
        const o = edges[e].a === m ? edges[e].b : edges[e].a;
        if (comp[o] < 0) { comp[o] = id; st.push(o); }
      }
    }
    let minX = 1e9, maxX = -1e9, sx = 0, sy = 0, cnt = 0, len = 0;
    for (const e of es) { len += edges[e].len; for (const p of edges[e].px) { const x = p % wW; minX = Math.min(minX, x); maxX = Math.max(maxX, x); sx += x; sy += (p / wW) | 0; cnt++; } }
    for (const m of ns) for (const p of nodes[m].pix) { const x = p % wW; minX = Math.min(minX, x); maxX = Math.max(maxX, x); sx += x; sy += (p / wW) | 0; cnt++; }
    const cx = (sx / cnt - 1) / ws, cy = (sy / cnt - 1) / ws;
    // its run: the one whose box holds its middle, or the nearest
    let run = 0, best = 1e9;
    boxes.forEach(([bx, by, bw, bh], k) => {
      const dx = Math.max(bx - cx, 0, cx - bx - bw), dy = Math.max(by - cy, 0, cy - by - bh);
      const d = dx + dy * 1.5;
      if (d < best) { best = d; run = k; }
    });
    pieces.push({ nodes: ns, edges: [...es], minX, maxX, cx, cy, len, run });
  }
  // the order: run by run; in a run, left to right, a dot or an accent after the stroke it sits on
  const small = (p: (typeof pieces)[number]) => p.len < emW * 0.22;
  const order: number[] = [];
  for (let r = 0; r < boxes.length; r++) {
    const big = pieces.map((p, i) => i).filter((i) => pieces[i].run === r && !small(pieces[i])).sort((p, q) => pieces[p].minX - pieces[q].minX);
    const dots = pieces.map((p, i) => i).filter((i) => pieces[i].run === r && small(pieces[i]));
    const after = new Map<number, number[]>();
    for (const d of dots) {
      const cx = pieces[d].cx * ws;
      let host = -1;
      for (const b of big) if (pieces[b].minX <= cx + 2) host = b;
      if (host < 0) host = big[0] ?? -1;
      if (!after.has(host)) after.set(host, []);
      after.get(host)!.push(d);
    }
    if (after.has(-1)) order.push(...after.get(-1)!);
    for (const b of big) { order.push(b); for (const d of (after.get(b) ?? []).sort((p, q) => pieces[p].cx - pieces[q].cx)) order.push(d); }
  }

  // ---- write each piece: the pen's moves, pixel by pixel
  type Move = { px: number[]; kind: 0 | 1 }; // 0: writing, 1: running back over wet ink
  type Stroke = Move[];
  const strokes: Stroke[] = [];
  const done = new Uint8Array(edges.length);
  const xy = (p: number): [number, number] => [p % wW, (p / wW) | 0];
  const dirAt = (e: Edge, from: number): [number, number] => {
    const px = e.a === from ? e.px : [...e.px].reverse();
    const k = Math.min(px.length - 1, 7);
    const [x0, y0] = xy(px[0]), [x1, y1] = xy(px[k]);
    const l = Math.hypot(x1 - x0, y1 - y0) || 1;
    return [(x1 - x0) / l, (y1 - y0) / l];
  };
  const endDir = (px: number[]): [number, number] => {
    const k = Math.max(0, px.length - 8);
    const [x0, y0] = xy(px[k]), [x1, y1] = xy(px[px.length - 1]);
    const l = Math.hypot(x1 - x0, y1 - y0) || 1;
    return [(x1 - x0) / l, (y1 - y0) / l];
  };
  for (const pi of order) {
    const P = pieces[pi];
    const left = new Set(P.edges);
    if (!left.size) {
      // a lone dot
      strokes.push([{ px: nodes[P.nodes[0]].pix.slice(0, 1), kind: 0 }]);
      continue;
    }
    const ends = P.nodes.filter((n) => nodes[n].edges.length === 1);
    const pickStart = (cands: number[]) => cands.reduce((b, n) => (nodes[n].x + nodes[n].y * 0.15 < nodes[b].x + nodes[b].y * 0.15 ? n : b), cands[0]);
    let cur = pickStart(ends.length ? ends : P.nodes);
    let dir: [number, number] | null = null;
    let stroke: Stroke = [];
    while (left.size) {
      const out = nodes[cur].edges.filter((e) => left.has(e));
      if (out.length) {
        let best = out[0], bs = -1e9;
        for (const e of out) {
          const d = dirAt(edges[e], cur);
          // straight on through a junction; to start with, the way that heads right
          const s = dir ? d[0] * dir[0] + d[1] * dir[1] : d[0] * 0.8 - d[1] * 0.2;
          if (s > bs) { bs = s; best = e; }
        }
        const e = edges[best];
        const px = e.a === cur ? e.px : [...e.px].reverse();
        stroke.push({ px, kind: 0 });
        left.delete(best);
        done[best] = 1;
        dir = endDir(px);
        cur = e.a === cur ? e.b : e.a;
        continue;
      }
      // nowhere left to go from here: run back over the wet stroke if the next one starts close
      // by along it, otherwise lift
      const want = new Set(P.nodes.filter((n) => nodes[n].edges.some((e) => left.has(e))));
      const dd = new Map<number, number>([[cur, 0]]), via = new Map<number, number>();
      const q = [cur];
      let found = -1;
      while (q.length) {
        q.sort((m, n) => dd.get(m)! - dd.get(n)!);
        const m = q.shift()!;
        if (want.has(m)) { found = m; break; }
        if (dd.get(m)! > emW * 0.5) break;
        for (const e of nodes[m].edges) {
          if (left.has(e)) continue;
          const o = edges[e].a === m ? edges[e].b : edges[e].a;
          const nd = dd.get(m)! + edges[e].len;
          if (nd < (dd.get(o) ?? 1e9)) { dd.set(o, nd); via.set(o, e); q.push(o); }
        }
      }
      if (found >= 0) {
        const chain: number[][] = [];
        for (let n = found; n !== cur; ) {
          const e = edges[via.get(n)!];
          const o = e.a === n ? e.b : e.a;
          chain.unshift(e.a === o ? e.px : [...e.px].reverse());
          n = o;
        }
        for (const px of chain) stroke.push({ px, kind: 1 });
        dir = chain.length ? endDir(chain[chain.length - 1]) : dir;
        cur = found;
        continue;
      }
      strokes.push(stroke);
      stroke = [];
      const from = nodes[cur];
      cur = [...want].reduce((b, n) => (Math.hypot(nodes[n].x - from.x, nodes[n].y - from.y) < Math.hypot(nodes[b].x - from.x, nodes[b].y - from.y) ? n : b), [...want][0]);
      dir = null;
    }
    if (stroke.length) strokes.push(stroke);
  }

  // ---- the pen's speed and the time of every pixel
  const tau = new Float32Array(N).fill(-1);
  const path: number[] = [];
  let t = 0;
  const thick = (p: number) => Math.min(1, Math.max(0, ((dist[p] || 0.5) / emW - 0.012) / 0.04));
  const toCss = (v: number) => (v - 1) / ws;
  let lastXY: [number, number] | null = null;
  const lifts: number[] = [];
  for (const st of strokes) {
    const seq: { p: number; kind: number }[] = [];
    for (const m of st) for (let i = 0; i < m.px.length; i++) if (!seq.length || seq[seq.length - 1].p !== m.px[i]) seq.push({ p: m.px[i], kind: m.kind });
    if (!seq.length) continue;
    // smoothed positions for the nib
    const xs = seq.map((s) => s.p % wW), ys = seq.map((s) => (s.p / wW) | 0);
    const sx = xs.map((_, i) => { let v = 0, wsum = 0; for (let k = -4; k <= 4; k++) { const j = Math.min(xs.length - 1, Math.max(0, i + k)), ww = Math.exp(-(k * k) / 6); v += xs[j] * ww; wsum += ww; } return v / wsum; });
    const sy = ys.map((_, i) => { let v = 0, wsum = 0; for (let k = -4; k <= 4; k++) { const j = Math.min(ys.length - 1, Math.max(0, i + k)), ww = Math.exp(-(k * k) / 6); v += ys[j] * ww; wsum += ww; } return v / wsum; });
    const first: [number, number] = [toCss(sx[0]), toCss(sy[0])];
    if (lastXY) {
      // a lift: up off the paper, across, and down
      const dx = first[0] - lastXY[0], dy = first[1] - lastXY[1];
      const dl = Math.hypot(dx, dy) / em;
      const lt = 0.1 + 0.07 * Math.min(4, dl);
      const n = 8;
      for (let k = 1; k < n; k++) {
        const f = k / n, e = f * f * (3 - 2 * f);
        path.push(lastXY[0] + dx * e, lastXY[1] + dy * e, t + lt * f, 0.45 * Math.sin(Math.PI * f) * Math.min(1, 0.4 + dl), 0);
      }
      lifts.push(lt);
      t += lt;
    } else t += 0.04;
    // a touch: the nib settles and the ink starts to flow
    for (let i = 0; i < seq.length; i++) {
      const p = seq[i].p;
      if (i > 0) {
        const q = seq[i - 1].p;
        const ds = (Math.abs(p - q) === 1 || Math.abs(p - q) === wW ? 1 : Math.SQRT2) / emW;
        const a0 = Math.max(0, i - 5), a1 = Math.min(seq.length - 1, i + 5);
        const v1x = sx[i] - sx[a0], v1y = sy[i] - sy[a0], v2x = sx[a1] - sx[i], v2y = sy[a1] - sy[i];
        const l1 = Math.hypot(v1x, v1y) || 1, l2 = Math.hypot(v2x, v2y) || 1;
        const turn = Math.acos(Math.max(-1, Math.min(1, (v1x * v2x + v1y * v2y) / (l1 * l2))));
        const press = thick(p);
        let v = (1.3 - 0.62 * press) / (1 + 0.9 * turn);
        if (seq[i].kind === 1) v *= 2.4;
        t += ds / (v * speed);
      }
      if (tau[p] < 0 && seq[i].kind === 0) tau[p] = t;
      if (i % 2 === 0 || i === seq.length - 1) path.push(toCss(sx[i]), toCss(sy[i]), t, 0, thick(p));
    }
    lastXY = [toCss(sx[sx.length - 1]), toCss(sy[sy.length - 1])];
  }
  // junction pixels, and anything the walk skipped, take the time of a written neighbour
  for (const n of nodes) {
    let tt = -1;
    for (const p of n.pix) if (tau[p] >= 0) tt = tt < 0 ? tau[p] : Math.min(tt, tau[p]);
    if (tt < 0) for (const p of n.pix) for (let k = 0; k < 8; k++) { const q = p + DY[k] * wW + DX[k]; if (tau[q] >= 0) tt = tt < 0 ? tau[q] : Math.min(tt, tau[q]); }
    for (const p of n.pix) if (tau[p] < 0 && tt >= 0) tau[p] = tt;
  }
  // too long? the whole hand quickens (lifts too, a little less)
  let dur = t + 0.02;
  if (dur > maxDur) {
    const k = maxDur / dur;
    for (let i = 0; i < N; i++) if (tau[i] >= 0) tau[i] *= k;
    for (let i = 2; i < path.length; i += 5) path[i] *= k;
    dur = maxDur;
  }

  // ---- every pixel of ink (and a margin round it, for the bleed) takes its stroke's time
  const region = new Uint8Array(N);
  for (let i = 0; i < N; i++) if (a[i] > 0.015) region[i] = 1;
  for (let pass = 0; pass < 3; pass++) {
    const r0 = region.slice();
    for (let y = 1; y < wH - 1; y++) for (let x = 1; x < wW - 1; x++) {
      const i = y * wW + x;
      if (r0[i]) continue;
      if (r0[i - 1] || r0[i + 1] || r0[i - wW] || r0[i + wW]) region[i] = 1;
    }
  }
  const dd = new Int32Array(N).fill(1 << 30), seed = new Int32Array(N).fill(-1);
  const buckets: number[][] = [];
  const push = (d: number, i: number) => { (buckets[d] ??= []).push(i); };
  for (let i = 0; i < N; i++) if (tau[i] >= 0 && sk[i]) { dd[i] = 0; seed[i] = i; push(0, i); }
  const W5 = [7, 5, 7, 5, 7, 5, 7, 5];
  for (let d = 0; d < buckets.length; d++) {
    const b = buckets[d];
    if (!b) continue;
    for (let k = 0; k < b.length; k++) {
      const i = b[k];
      if (dd[i] !== d) continue;
      const x = i % wW, y = (i / wW) | 0;
      if (x < 1 || y < 1 || x >= wW - 1 || y >= wH - 1) continue;
      for (let n = 0; n < 8; n++) {
        const j = i + DY[n] * wW + DX[n];
        if (!region[j]) continue;
        const nd = d + W5[n];
        if (nd < dd[j]) { dd[j] = nd; seed[j] = seed[i]; push(nd, j); }
      }
    }
    buckets[d] = [];
  }
  const time = new Uint8Array(N * 4);
  for (let i = 0; i < N; i++) {
    const o = i * 4;
    time[o + 3] = 255;
    const s = seed[i];
    if (s < 0 || !region[i]) { time[o] = 255; time[o + 1] = 255; time[o + 2] = 255; continue; }
    const q = Math.min(65000, Math.round((tau[s] / dur) * 65000));
    time[o] = q >> 8;
    time[o + 1] = q & 255;
    const r = Math.max(0.8, dist[s] || 0.8);
    time[o + 2] = Math.min(254, Math.round((dd[i] / 5 / r) * 100));
  }
  // ink the flood never reached (no skeleton of its own): with the last stroke
  for (let i = 0; i < N; i++) if (a[i] > 0.05 && seed[i] < 0) { const o = i * 4; time[o] = 65000 >> 8; time[o + 1] = 65000 & 255; time[o + 2] = 50; }

  // ---- the coverage, blurred: the bead of wet ink, and where it can bleed
  const rb = Math.max(1, Math.round(emW * 0.016));
  let sa = a;
  for (let pass = 0; pass < 2; pass++) {
    const tmp = new Float32Array(N), out = new Float32Array(N);
    for (let y = 0; y < wH; y++) {
      let acc = 0;
      const row = y * wW;
      for (let x = -rb; x <= rb; x++) acc += sa[row + Math.min(wW - 1, Math.max(0, x))];
      for (let x = 0; x < wW; x++) {
        tmp[row + x] = acc / (2 * rb + 1);
        acc += sa[row + Math.min(wW - 1, x + rb + 1)] - sa[row + Math.max(0, x - rb)];
      }
    }
    for (let x = 0; x < wW; x++) {
      let acc = 0;
      for (let y = -rb; y <= rb; y++) acc += tmp[Math.min(wH - 1, Math.max(0, y)) * wW + x];
      for (let y = 0; y < wH; y++) {
        out[y * wW + x] = acc / (2 * rb + 1);
        acc += tmp[Math.min(wH - 1, y + rb + 1) * wW + x] - tmp[Math.max(0, y - rb) * wW + x];
      }
    }
    sa = out;
  }
  const soft = new Uint8Array(N);
  for (let i = 0; i < N; i++) soft[i] = Math.round(Math.min(1, sa[i]) * 255);
  void lifts;
  return { time, soft, path: new Float32Array(path), dur };
}
