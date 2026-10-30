import { analyse, rasterize, type Analysis, type AnalysisInput, type Layout, type Prepared, type Run } from "./strokes";

/**
 * Ink and vows: the pen and its ink.
 *  - Each written line ([data-iv-ink]) is a canvas over its own (transparent) text. The text
 *    stays real, for reading aloud, finding and selecting; the canvas shows it in ink.
 *  - The ink is drawn by one shared WebGL context (an offscreen canvas), copied into each line's
 *    own 2D canvas, so a page with a dozen written lines still uses one context.
 *  - The shader shows each pixel from the moment the nib passes it (strokes.ts's time map), wet
 *    at first: a glossy bead, a little lighter and bluer, that dries over a second or two to a
 *    darker, matte ink with slightly darker rims, wicking a hair into the cotton's fibres.
 *  - One pen (pen.tsx) writes one line at a time: it comes down to the line, follows the
 *    strokes (lifting between them), and lifts away when the section is written.
 *  - A line is written once. Coming back to it shows its dry ink.
 *  - Working a line's strokes out (strokes.ts) runs in a worker: the page's thread only sets the
 *    text on a canvas (a few milliseconds), so a section arriving never waits on it.
 */

// ---- the strokes worker: one for the page, shared by every line
let worker: Worker | null | undefined;
let seq = 0;
const waiting = new Map<number, (a: Analysis | null) => void>();
function analyseOff(input: AnalysisInput): Promise<Analysis | null> {
  if (worker === undefined) {
    try {
      worker = new Worker(new URL("./strokes.worker.ts", import.meta.url), { type: "module" });
      worker.onmessage = (e: MessageEvent<{ id: number; out: Analysis | null }>) => { const cb = waiting.get(e.data.id); waiting.delete(e.data.id); cb?.(e.data.out); };
      worker.onerror = () => { worker = null; for (const cb of waiting.values()) cb(null); waiting.clear(); };
    } catch { worker = null; }
  }
  if (!worker) return new Promise((r) => setTimeout(() => r(analyse(input)), 0));
  const id = ++seq;
  return new Promise((r) => {
    waiting.set(id, r);
    worker!.postMessage({ id, input }, [input.alpha.buffer]);
  });
}

export type PenPose = { x: number; y: number; angle: number; height: number; press: number; shown: boolean; scale: number };
export type PenHandle = { set: (p: PenPose) => void; size: () => number };

type Job = {
  el: HTMLElement;
  canvas: HTMLCanvasElement;
  key: string;
  prep: Prepared | null;
  state: "blank" | "queued" | "writing" | "drying" | "dry";
  clock: number;
  tex: { g: WebGLTexture; t: WebGLTexture; b: WebGLTexture } | null;
  speed: number;
  maxDur: number;
  em: number;
  /** How long setting its text took on the page's thread (ms), for checking. */
  ms: number;
  /** Being worked out: the layout it's for, and when it's ready. */
  pending: { key: string; ready: Promise<Prepared | null> } | null;
  lastDraw: number;
};

const VS = `attribute vec2 p; varying vec2 vUv; void main(){ vUv = vec2(p.x * 0.5 + 0.5, 0.5 - p.y * 0.5); gl_Position = vec4(p, 0.0, 1.0); }`;
const FS = `precision highp float;
varying vec2 vUv;
uniform sampler2D uG; uniform sampler2D uT; uniform sampler2D uB;
uniform vec4 uWs; uniform vec2 uTx; uniform vec2 uCss;
uniform float uNow; uniform float uDur; uniform float uSeed;
uniform vec3 uInk; uniform vec3 uWet;
float h21(vec2 p){ p = fract(p * vec2(233.34, 851.73)); p += dot(p, p + 23.45); return fract(p.x * p.y); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(h21(i), h21(i + vec2(1.0, 0.0)), f.x), mix(h21(i + vec2(0.0, 1.0)), h21(i + vec2(1.0, 1.0)), f.x), f.y); }
float fibre(vec2 p){
  float a = vn(mat2(0.8, 0.6, -0.6, 0.8) * p * vec2(0.32, 2.4));
  float b = vn(mat2(0.3, -0.95, 0.95, 0.3) * p * vec2(0.28, 2.1) + 11.0);
  float c = vn(p * 0.8 + 5.0);
  return clamp(0.4 * a + 0.4 * b + 0.2 * c, 0.0, 1.0);
}
void main(){
  vec2 w = vUv * uWs.xy + uWs.zw;
  float g = texture2D(uG, vUv).a;
  vec4 t = texture2D(uT, w);
  float q = floor(t.r * 255.0 + 0.5) * 256.0 + floor(t.g * 255.0 + 0.5);
  if (q > 65100.0) { gl_FragColor = vec4(0.0); return; }
  float dr = t.b * 2.55;
  // the front of the ink is round, like the bead under a nib: its edges arrive a moment later
  float age = uNow - q / 65000.0 * uDur - min(dr, 1.4) * 0.03;
  if (age < -0.015) { gl_FragColor = vec4(0.0); return; }
  float shown = smoothstep(-0.015, 0.015, age);
  float ag = max(age, 0.0);
  float wet = exp(-ag / 0.95);
  float bleed = 1.0 - exp(-ag / 0.55);
  vec2 p = vUv * uCss;
  float b = texture2D(uB, w).r;
  float fib = fibre(p + uSeed);
  // the bleed: as it dries the ink wicks a hair past its edge, along the fibres
  float halo = smoothstep(0.32, 0.62, b) * (1.0 - g) * smoothstep(0.5, 0.85, fib + b * 0.2) * bleed * 0.24;
  float gs = clamp(g * (1.0 + 0.22 * bleed), 0.0, 1.0);
  float a = max(gs, halo);
  // the paper's tooth: thinner ink on its ridges, full in the pools
  float tooth = vn(p * 1.4 + 3.0) * 0.6 + vn(p * 3.1 + 9.0) * 0.4;
  float dens = mix(0.84 + 0.16 * smoothstep(0.2, 0.8, tooth), 1.0, smoothstep(0.55, 0.95, b));
  // dry: darker where it dried at the rims
  float rim = smoothstep(0.3, 0.95, g) * (1.0 - smoothstep(0.4, 0.92, b));
  vec3 dry = uInk * (1.0 - 0.28 * rim) * (0.96 + 0.08 * fib);
  // wet: a glossy bead catching the window
  float bx = texture2D(uB, w + vec2(uTx.x, 0.0)).r - texture2D(uB, w - vec2(uTx.x, 0.0)).r;
  float by = texture2D(uB, w + vec2(0.0, uTx.y)).r - texture2D(uB, w - vec2(0.0, uTx.y)).r;
  vec3 n = normalize(vec3(-bx * 1.7, -by * 1.7, 1.0));
  vec3 H = normalize(normalize(vec3(-0.45, -0.6, 0.66)) + vec3(0.0, 0.0, 1.0));
  float nh = max(dot(n, H), 0.0);
  float spec = pow(nh, 40.0) * 0.42 + pow(nh, 8.0) * 0.03;
  vec3 col = mix(dry, uWet + spec * vec3(0.9, 0.93, 1.0) * smoothstep(0.2, 0.7, b), wet * 0.9);
  float alpha = clamp(a * shown * mix(dens, 1.0, wet * 0.7), 0.0, 1.0);
  gl_FragColor = vec4(col * alpha, alpha);
}`;

function makeGL() {
  const cv = document.createElement("canvas");
  cv.width = cv.height = 16;
  const gl = cv.getContext("webgl", { premultipliedAlpha: true, alpha: true, antialias: false, preserveDrawingBuffer: true }) as WebGLRenderingContext | null;
  if (!gl) return null;
  const sh = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn(gl.getShaderInfoLog(s)); return null; }
    return s;
  };
  const vs = sh(gl.VERTEX_SHADER, VS), fs = sh(gl.FRAGMENT_SHADER, FS);
  if (!vs || !fs) return null;
  const pr = gl.createProgram()!;
  gl.attachShader(pr, vs);
  gl.attachShader(pr, fs);
  gl.linkProgram(pr);
  if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return null;
  gl.useProgram(pr);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(pr, "p");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = (n: string) => gl.getUniformLocation(pr, n);
  const u = { G: U("uG"), T: U("uT"), B: U("uB"), Ws: U("uWs"), Tx: U("uTx"), Css: U("uCss"), Now: U("uNow"), Dur: U("uDur"), Seed: U("uSeed"), Ink: U("uInk"), Wet: U("uWet") };
  gl.uniform1i(u.G, 0);
  gl.uniform1i(u.T, 1);
  gl.uniform1i(u.B, 2);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  return { gl, cv, u };
}
type GL = NonNullable<ReturnType<typeof makeGL>>;

function texture(g: GL, unit: number, nearest: boolean, src: HTMLCanvasElement | { w: number; h: number; data: Uint8Array; lum?: boolean }) {
  const { gl } = g;
  const t = gl.createTexture()!;
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(gl.TEXTURE_2D, t);
  const f = nearest ? gl.NEAREST : gl.LINEAR;
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, f);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, f);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
  if ("w" in src) {
    const fmt = src.lum ? gl.LUMINANCE : gl.RGBA;
    gl.texImage2D(gl.TEXTURE_2D, 0, fmt, src.w, src.h, 0, fmt, gl.UNSIGNED_BYTE, src.data);
  } else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
  return t;
}

const hex = (c: string): [number, number, number] => {
  const m = /^#?([0-9a-f]{6})$/i.exec(c.trim());
  const n = m ? parseInt(m[1], 16) : 0x1b2130;
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

/** The text of a written line, as the browser laid it out: one run per line of each text node. */
export function measure(el: HTMLElement): { layout: Layout; pad: [number, number, number, number]; key: string } | null {
  // a flourish: no text, a pen-made mark filling the element
  if (el.dataset.ivShape === "flourish") {
    const r = el.getBoundingClientRect();
    if (r.width < 4 || r.height < 2) return null;
    const p = r.height * 0.6;
    const pad: [number, number, number, number] = [p, p, p, p];
    const layout: Layout = { w: r.width + 2 * p, h: r.height + 2 * p, em: r.height * 2.4, runs: [{ text: "", x: p, baseline: 0, style: "normal", weight: "400", size: r.height, family: "serif", box: [p, p, r.width, r.height], shape: "flourish" }] };
    return { layout, pad, key: `f${Math.round(r.width)}x${Math.round(r.height)}` };
  }
  const holder = el.querySelector<HTMLElement>("[data-iv-text]") ?? el;
  const er = holder.getBoundingClientRect();
  if (er.width < 2 || er.height < 2) return null;
  const walker = document.createTreeWalker(holder, NodeFilter.SHOW_TEXT);
  const pieces: { node: Text; cs: CSSStyleDeclaration }[] = [];
  // ([data-iv-skip]: something set inside the line that the pen doesn't write, like the gilded &)
  for (let n = walker.nextNode(); n; n = walker.nextNode()) if ((n.textContent ?? "").trim() && n.parentElement && !n.parentElement.closest("[data-iv-skip]")) pieces.push({ node: n as Text, cs: getComputedStyle(n.parentElement) });
  if (!pieces.length) return null;
  const em = Math.max(...pieces.map((p) => parseFloat(p.cs.fontSize) || 16));
  const pad: [number, number, number, number] = [em * 0.62, em * 0.5, em * 0.78, em * 0.5]; // top, right, bottom, left
  const ox = er.left - pad[3], oy = er.top - pad[0];
  const runs: Run[] = [];
  const range = document.createRange();
  const mc = document.createElement("canvas").getContext("2d")!;
  for (const { node, cs } of pieces) {
    const text = node.textContent ?? "";
    const size = parseFloat(cs.fontSize) || 16;
    const f = { style: cs.fontStyle || "normal", weight: cs.fontWeight || "400", size, family: cs.fontFamily };
    mc.font = `${f.style} ${f.weight} ${size}px ${f.family}`;
    const m = mc.measureText("Hg");
    const asc = m.fontBoundingBoxAscent ?? size * 0.8, desc = m.fontBoundingBoxDescent ?? size * 0.25;
    const words = [...text.matchAll(/\S+/g)];
    let cur: { s: number; e: number; top: number; left: number; r: DOMRect } | null = null;
    const flush = () => {
      if (!cur) return;
      const r = cur.r;
      // the baseline sits where the font's ascent puts it in the line's content box
      const baseline = r.top + (r.height - (asc + desc)) / 2 + asc - oy;
      runs.push({ text: text.slice(cur.s, cur.e), x: cur.left - ox, baseline, ...f, box: [cur.left - ox, r.top - oy, r.right - cur.left, r.height] });
      cur = null;
    };
    for (const w of words) {
      const s = w.index ?? 0, e = s + w[0].length;
      range.setStart(node, s);
      range.setEnd(node, e);
      const r = range.getClientRects()[0];
      if (!r) continue;
      if (cur && Math.abs(r.top - cur.top) < size * 0.3) { cur.e = e; cur.r = new DOMRect(cur.left, Math.min(cur.r.top, r.top), r.right - cur.left, Math.max(cur.r.height, r.height)); }
      else { flush(); cur = { s, e, top: r.top, left: r.left, r: new DOMRect(r.left, r.top, r.width, r.height) }; }
    }
    flush();
  }
  const layout: Layout = { w: er.width + pad[1] + pad[3], h: er.height + pad[0] + pad[2], runs, em };
  const key = `${Math.round(layout.w)}x${Math.round(layout.h)}|${runs.map((r) => `${r.text}@${r.x.toFixed(1)},${r.baseline.toFixed(1)},${r.size}`).join("|")}`;
  return { layout, pad, key };
}

export function createInker({ ink, wet, pen, stage }: { ink: string; wet: string; pen: () => PenHandle | null; stage: () => HTMLElement | null }) {
  const g = makeGL();
  const INK = hex(ink), WET = hex(wet);
  const jobs = new Map<HTMLElement, Job>();
  let raf = 0, last = 0, rate = 1, alive = true;
  // the pen's own state, in the stage's pixels
  let penX = -1, penY = -1, penH = 1, penShown = false, penScale = 1;
  type Leg = { job: Job; phase: "wait" | "travel" | "write"; t: number; from: [number, number, number]; T: number };
  let queue: Job[] = [];
  let leg: Leg | null = null;
  let leaving: { t: number; from: [number, number, number] } | null = null;
  let onQueueDone: (() => void) | null = null;
  const dpr = () => Math.min(2, window.devicePixelRatio || 1);

  const release = (j: Job) => {
    if (j.tex && g) { g.gl.deleteTexture(j.tex.g); g.gl.deleteTexture(j.tex.t); g.gl.deleteTexture(j.tex.b); }
    j.tex = null;
  };
  const place = (j: Job, m: NonNullable<ReturnType<typeof measure>>) => {
    const [pt, , , pl] = m.pad;
    const c = j.canvas;
    c.style.left = `${-pl}px`;
    c.style.top = `${-pt}px`;
    c.style.width = `${m.layout.w}px`;
    c.style.height = `${m.layout.h}px`;
    if (j.prep) { c.width = j.prep.dW; c.height = j.prep.dH; }
  };
  /** Lays the line out and has its strokes worked out (once for the same text at the same size). */
  const prep = (j: Job): Promise<Prepared | null> => {
    const m = measure(j.el);
    if (!m) return Promise.resolve(null);
    if (j.prep && j.key === m.key) return Promise.resolve(j.prep);
    if (j.pending && j.pending.key === m.key) return j.pending.ready;
    const t0 = performance.now();
    const r = rasterize(m.layout, { speed: j.speed, maxDur: j.maxDur, dpr: dpr() });
    j.ms = performance.now() - t0;
    j.em = m.layout.em;
    if (!r) return Promise.resolve(null);
    const ready = analyseOff(r.input).then((an) => {
      if (!alive || j.pending?.ready !== ready) return j.prep;
      j.pending = null;
      release(j);
      j.key = m.key;
      j.prep = an ? { ...r.raster, ...an } : null;
      place(j, m);
      return j.prep;
    });
    j.pending = { key: m.key, ready };
    return ready;
  };
  const ready = (j: Job) => { const m = measure(j.el); return !!(j.prep && m && j.key === m.key); };
  const upload = (j: Job) => {
    if (!g || !j.prep || j.tex) return;
    const P = j.prep;
    j.tex = {
      g: texture(g, 0, false, P.glyph),
      t: texture(g, 1, true, { w: P.wW, h: P.wH, data: P.time }),
      b: texture(g, 2, false, { w: P.wW, h: P.wH, data: P.soft, lum: true }),
    };
  };
  const draw = (j: Job, now: number) => {
    const P = j.prep;
    const ctx = j.canvas.getContext("2d");
    if (!P || !ctx) return;
    if (!g) {
      // no WebGL: the finished ink, flat
      ctx.clearRect(0, 0, P.dW, P.dH);
      ctx.drawImage(P.glyph, 0, 0);
      ctx.globalCompositeOperation = "source-in";
      ctx.fillStyle = ink;
      ctx.fillRect(0, 0, P.dW, P.dH);
      ctx.globalCompositeOperation = "source-over";
      return;
    }
    upload(j);
    const { gl, cv, u } = g;
    if (cv.width < P.dW || cv.height < P.dH) { cv.width = Math.max(cv.width, P.dW); cv.height = Math.max(cv.height, P.dH); }
    gl.viewport(0, 0, P.dW, P.dH);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, j.tex!.g);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, j.tex!.t);
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, j.tex!.b);
    gl.uniform4f(u.Ws, (P.cssW * P.ws) / P.wW, (P.cssH * P.ws) / P.wH, 1 / P.wW, 1 / P.wH);
    gl.uniform2f(u.Tx, 1 / P.wW, 1 / P.wH);
    gl.uniform2f(u.Css, P.cssW, P.cssH);
    gl.uniform1f(u.Now, now);
    gl.uniform1f(u.Dur, P.dur);
    gl.uniform1f(u.Seed, (j.key.length * 37.1) % 100);
    gl.uniform3f(u.Ink, INK[0], INK[1], INK[2]);
    gl.uniform3f(u.Wet, WET[0], WET[1], WET[2]);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    ctx.clearRect(0, 0, P.dW, P.dH);
    ctx.drawImage(cv, 0, cv.height - P.dH, P.dW, P.dH, 0, 0, P.dW, P.dH);
  };
  /** The finished ink, once its strokes are ready. */
  const dryNow = (j: Job) => {
    j.state = "dry";
    const paint = () => { if (!alive || j.state !== "dry" || !j.prep) return; draw(j, 1e4); release(j); };
    if (ready(j)) paint();
    else void prep(j).then(paint);
  };

  // ---- the pen
  const away = (): [number, number] => {
    const s = stage();
    const W = s?.clientWidth ?? window.innerWidth, H = s?.clientHeight ?? window.innerHeight;
    return [W + 90, H * 0.18];
  };
  /** The nib's place on its line at a time in its writing (stage px), its height and pressure. */
  const onPath = (j: Job, t: number): [number, number, number, number] => {
    const P = j.prep!, a = P.path, n = a.length / 5;
    const cr = j.canvas.getBoundingClientRect(), sr = stage()?.getBoundingClientRect();
    const ox = cr.left - (sr?.left ?? 0), oy = cr.top - (sr?.top ?? 0);
    if (!n) return [ox, oy, 0, 0];
    let lo = 0, hi = n - 1;
    if (t <= a[2]) return [ox + a[0], oy + a[1], a[3], a[4]];
    if (t >= a[(n - 1) * 5 + 2]) { const k = (n - 1) * 5; return [ox + a[k], oy + a[k + 1], a[k + 3], 0]; }
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (a[m * 5 + 2] <= t) lo = m; else hi = m; }
    const i = lo * 5, k = hi * 5, f = (t - a[i + 2]) / Math.max(1e-6, a[k + 2] - a[i + 2]);
    return [ox + a[i] + (a[k] - a[i]) * f, oy + a[i + 1] + (a[k + 1] - a[i + 1]) * f, a[i + 3] + (a[k + 3] - a[i + 3]) * f, a[i + 4] + (a[k + 4] - a[i + 4]) * f];
  };
  let wob = 0;
  const pose = (x: number, y: number, h: number, press: number) => {
    penX = x; penY = y; penH = h;
    pen()?.set({ x, y, angle: 33 + Math.sin(wob * 1.1) * 1.6 + Math.sin(wob * 2.9 + 1) * 0.5, height: h, press, shown: penShown, scale: penScale });
  };

  const ease = (k: number) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
  const next = () => {
    const j = queue.shift();
    if (!j) {
      leg = null;
      if (penShown) leaving = { t: 0, from: [penX, penY, penH] };
      const cb = onQueueDone; onQueueDone = null; cb?.();
      return;
    }
    // not worked out yet (it's on its way from the worker): the pen waits where it is
    if (!ready(j)) {
      leg = { job: j, phase: "wait", t: 0, from: [penX, penY, penH], T: 0 };
      void prep(j).then((P) => {
        if (!alive || leg?.job !== j) return;
        if (!P) { j.state = "dry"; next(); kick(); return; }
        start(j);
        kick();
      });
      return;
    }
    start(j);
  };
  const start = (j: Job) => {
    j.state = "writing";
    j.clock = 0;
    upload(j);
    draw(j, -1);
    const s0 = onPath(j, 0);
    // the pen at its real size beside letters this big
    if (!penShown) penScale = Math.min(1.3, Math.max(0.5, j.em * 0.0086));
    if (!penShown) { const [ax, ay] = away(); penX = ax; penY = ay; penH = 1; penShown = true; }
    const d = Math.hypot(s0[0] - penX, s0[1] - penY);
    leg = { job: j, phase: "travel", t: 0, from: [penX, penY, penH], T: 0.26 + 0.24 * Math.min(1, d / 700) };
    leaving = null;
  };

  const frame = (now: number) => {
    raf = 0;
    if (!alive) return;
    const dt = Math.min(0.05, last ? (now - last) / 1000 : 0.016) * rate;
    last = now;
    wob += dt;
    // the pen
    if (leg) {
      const j = leg.job;
      leg.t += dt;
      if (leg.phase === "wait") { /* its strokes are on their way */ }
      else if (leg.phase === "travel") {
        const k = Math.min(1, leg.t / leg.T), e = ease(k);
        const [tx, ty] = onPath(j, 0);
        const h = leg.from[2] * (1 - e) + 0.5 * Math.sin(Math.PI * Math.min(1, k * 1.15)) * Math.min(1, leg.from[2] + 0.3) * (1 - e);
        pose(leg.from[0] + (tx - leg.from[0]) * e, leg.from[1] + (ty - leg.from[1]) * e, Math.max(0, h * (1 - e * e) + (1 - k) * 0.02), 0);
        if (k >= 1) { leg.phase = "write"; leg.t = 0; }
      } else {
        j.clock += dt;
        const [x, y, h, p] = onPath(j, j.clock);
        pose(x, y, h, p);
        if (j.clock >= j.prep!.dur) { j.state = "drying"; next(); }
      }
    } else if (leaving) {
      leaving.t += dt;
      const k = Math.min(1, leaving.t / 0.62), e = ease(k);
      const [ax, ay] = away();
      pose(leaving.from[0] + (ax - leaving.from[0]) * e, leaving.from[1] + (ay - leaving.from[1]) * e, Math.min(1, leaving.from[2] + e * 1.1), 0);
      if (k >= 1) { leaving = null; penShown = false; pose(ax, ay, 1, 0); }
    }
    // the ink: the line being written, and the lines still drying
    let busy = !!leg || !!leaving;
    for (const j of jobs.values()) {
      if (j.state === "writing") { if (leg?.phase === "write" && leg.job === j) draw(j, j.clock); busy = true; }
      else if (j.state === "drying") {
        j.clock += dt;
        busy = true;
        if (j.clock > j.prep!.dur + 3.2) dryNow(j);
        // drying is slow: twenty frames a second is plenty
        else if (now - j.lastDraw > 48) { draw(j, j.clock); j.lastDraw = now; }
      }
    }
    if (busy) raf = requestAnimationFrame(frame);
    else last = 0;
  };
  const kick = () => { if (!raf && alive) { last = 0; raf = requestAnimationFrame(frame); } };

  return {
    /** Adds a line to write. `speed`: ems a second; `maxDur`: the most it may take. */
    add(el: HTMLElement, canvas: HTMLCanvasElement, opts: { speed?: number; maxDur?: number } = {}) {
      if (jobs.has(el)) return;
      jobs.set(el, { el, canvas, key: "", prep: null, state: "blank", clock: 0, tex: null, speed: opts.speed ?? 6.5, maxDur: opts.maxDur ?? 2.6, em: 40, ms: 0, pending: null, lastDraw: 0 });
    },
    remove(el: HTMLElement) {
      const j = jobs.get(el);
      if (!j) return;
      release(j);
      jobs.delete(el);
      queue = queue.filter((q) => q !== j);
    },
    has: (el: HTMLElement) => jobs.has(el),
    state: (el: HTMLElement) => jobs.get(el)?.state ?? "blank",
    /** Works a line's strokes out ahead of time; resolves when they're ready. */
    warm(el: HTMLElement): Promise<unknown> { const j = jobs.get(el); return j && j.state === "blank" ? prep(j) : Promise.resolve(); },
    /** True when the line's strokes are worked out for its current layout. */
    ready(el: HTMLElement) { const j = jobs.get(el); return !!j && ready(j); },
    /** Writes these lines in turn with the pen; `done` once the last is written. */
    write(els: HTMLElement[], done?: () => void) {
      const todo = els.map((e) => jobs.get(e)).filter((j): j is Job => !!j && j.state === "blank");
      if (!todo.length) { done?.(); return; }
      for (const j of todo) j.state = "queued";
      queue.push(...todo);
      const prev = onQueueDone;
      onQueueDone = () => { prev?.(); done?.(); };
      if (!leg) next();
      kick();
    },
    /** The finished, dry ink at once (the builder's static pages, the gallery card, returning). */
    dry(el: HTMLElement) { const j = jobs.get(el); if (j) dryNow(j); },
    /** Everything being written finishes now; the pen lifts away. */
    finish() {
      if (!leg && !queue.length) return;
      for (const j of [...(leg ? [leg.job] : []), ...queue]) dryNow(j);
      queue = [];
      if (leg) { leg = null; leaving = { t: 0, from: [penX, penY, penH] }; }
      const cb = onQueueDone; onQueueDone = null; cb?.();
      kick();
    },
    writing: () => !!leg || queue.length > 0,
    /** Whether the strokes are worked out off the page's thread (for checking). */
    offThread: () => !!worker,
    /** Hurries the hand (a tap during the opening). */
    hurry(k = 3) { rate = k; },
    calm() { rate = 1; },
    /** The line's size changed: lay it out again (a dry line is redrawn dry). */
    relayout(el: HTMLElement) {
      const j = jobs.get(el);
      if (!j) return;
      if (j.state !== "dry") return; // a blank line is worked out again when it's needed
      // only when its layout really changed (the page grows as the reply form opens)
      const m = measure(j.el);
      if (m && m.key !== j.key) dryNow(j);
    },
    gl: !!g,
    /** For checking the hand frame by frame (dev only): holds the clock at `t` seconds into the line. */
    seek(t: number) { rate = 0; if (leg && leg.phase !== "wait") { if (leg.phase === "travel") { leg.phase = "write"; leg.t = 0; } leg.job.clock = t; } kick(); },
    stats: () => [...jobs.values()].map((j) => ({ text: j.el.textContent, state: j.state, dur: j.prep?.dur, em: j.em, ms: Math.round(j.ms), ready: ready(j), n: j.prep ? j.prep.path.length / 5 : 0 })),
    dispose() {
      alive = false;
      cancelAnimationFrame(raf);
      for (const j of jobs.values()) release(j);
      jobs.clear();
      if (g) g.gl.getExtension("WEBGL_lose_context")?.loseContext();
    },
  };
}
export type Inker = ReturnType<typeof createInker>;
