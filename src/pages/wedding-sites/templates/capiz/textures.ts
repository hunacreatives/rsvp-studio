import { paint, type PaintJob } from "./materials";
import { drawBougainvillea } from "./flora";

/**
 * Capiz's material tiles (materials.ts), drawn once a page in a worker and handed to the CSS as
 * image URLs (custom properties on the root): the shell lattice, narra along and across, the
 * balusters, the adobe and the roof tiles. Sized to the layout (phone or wide) and the screen's
 * pixels, so they stay sharp; drawn again only when that changes. Until a tile arrives the CSS
 * shows a plain stand-in.
 */

// ---- the workers: two for the page, so the big stone tiles are drawn side by side
let pool: Worker[] | null | undefined;
let seq = 0, turn = 0;
const waiting = new Map<number, (url: string | null) => void>();
const jobs = new Map<number, PaintJob>();
const toUrl = (data: { blob?: Blob; buf?: Uint8ClampedArray }, w: number, h: number): Promise<string | null> => {
  if (data.blob) return Promise.resolve(URL.createObjectURL(data.blob));
  if (!data.buf) return Promise.resolve(null);
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const x = c.getContext("2d");
  if (!x) return Promise.resolve(null);
  x.putImageData(new ImageData(new Uint8ClampedArray(data.buf), w, h), 0, 0);
  return new Promise((r) => c.toBlob((b) => r(b ? URL.createObjectURL(b) : null), "image/png"));
};
function draw(job: PaintJob): Promise<string | null> {
  if (pool === undefined) {
    try {
      pool = [0, 1].map(() => {
        const wk = new Worker(new URL("./materials.worker.ts", import.meta.url), { type: "module" });
        wk.onmessage = (e: MessageEvent<{ id: number; blob?: Blob; buf?: Uint8ClampedArray }>) => {
          const cb = waiting.get(e.data.id), j = jobs.get(e.data.id);
          waiting.delete(e.data.id);
          jobs.delete(e.data.id);
          if (cb) toUrl(e.data, j?.w ?? 1, j?.h ?? 1).then(cb);
        };
        wk.onerror = () => { pool = null; for (const cb of waiting.values()) cb(null); waiting.clear(); };
        return wk;
      });
    } catch {
      pool = null;
    }
  }
  // no worker: on this thread, a moment later
  if (!pool)
    return new Promise((r) => setTimeout(() => { const buf = new Uint8ClampedArray(job.w * job.h * 4); paint(buf, job); toUrl({ buf }, job.w, job.h).then(r); }, 0));
  const id = ++seq;
  const wk = pool[turn++ % pool.length];
  return new Promise((r) => {
    waiting.set(id, r);
    jobs.set(id, job);
    wk.postMessage({ id, job });
  });
}

/** Each tile's size in CSS pixels, by layout. */
export const SIZES = {
  wide: { pane: 54, muntin: 5.5, bal: [40, 100], stone: [1500, 920], course: 118, tiles: [324, 118], flora: [620, 520] },
  phone: { pane: 40, muntin: 4.5, bal: [30, 74], stone: [640, 900], course: 82, tiles: [216, 80], flora: [390, 380] },
} as const;
export const PANES = 8; // the shell tile is 8 × 8 panes

const cache = new Map<string, Promise<string | null>>();
const once = (key: string, job: PaintJob) => {
  let p = cache.get(key);
  if (!p) { p = draw(job); cache.set(key, p); }
  return p;
};
/** The bougainvillea: vectors, quick, drawn on this thread. */
const flora = (key: string, w: number, h: number, k: number, seed = 11) => {
  let p = cache.get(key);
  if (!p) {
    p = new Promise((r) => setTimeout(() => {
      const c = document.createElement("canvas");
      c.width = w;
      c.height = h;
      const x = c.getContext("2d");
      if (!x) { r(null); return; }
      drawBougainvillea(x, w, h, seed, k);
      c.toBlob((b) => r(b ? URL.createObjectURL(b) : null), "image/png");
    }, 0));
    cache.set(key, p);
  }
  return p;
};

/**
 * Draw the tiles for this layout and set them on `root` as they arrive. `first` resolves once the
 * ones the opening needs (the shell and the narra) are on.
 */
export function loadMaterials(root: HTMLElement, phone: boolean): { first: Promise<void>; all: Promise<void> } {
  const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
  const S = phone ? SIZES.phone : SIZES.wide;
  const k = `${phone ? "m" : "d"}${dpr}`;
  const set = (name: string, size: string) => (url: string | null) => {
    if (!url) return;
    root.style.setProperty(name, `url("${url}")`);
    root.style.setProperty(`${name}-size`, size);
  };
  const P = Math.round(S.pane * dpr);
  const shell = once(`shell${k}`, { kind: "shell", w: P * PANES, h: P * PANES, opts: { cols: PANES, rows: PANES, pitch: P, muntin: S.muntin * dpr, seed: 3 } }).then((u) => {
    if (u) root.style.setProperty("--cz-shell", `url("${u}")`);
  });
  const woodH = once(`wh${dpr}`, { kind: "wood", w: Math.round(512 * dpr), h: Math.round(128 * dpr), opts: { seed: 5 } }).then(set("--cz-wood-h", "512px 128px"));
  const woodV = once(`wv${dpr}`, { kind: "wood", w: Math.round(128 * dpr), h: Math.round(512 * dpr), opts: { seed: 8, vertical: true } }).then(set("--cz-wood-v", "128px 512px"));
  const tiles = once(`tiles${k}`, { kind: "tiles", w: Math.round(S.tiles[0] * dpr), h: Math.round(S.tiles[1] * dpr), opts: { seed: 1 } }).then(set("--cz-tiles", `${S.tiles[0]}px ${S.tiles[1]}px`));
  const first = Promise.all([shell, woodH, woodV, tiles]).then(() => {});
  const all = first.then(() => {
    const sd = Math.min(dpr, 1.5);
    return Promise.all([
      once(`bal${k}`, { kind: "balusters", w: Math.round(S.bal[0] * dpr), h: Math.round(S.bal[1] * dpr), opts: { seed: 2 } }).then(set("--cz-bal", `${S.bal[0]}px ${S.bal[1]}px`)),
      once(`plaster${sd}`, { kind: "plaster", w: Math.round(600 * sd), h: Math.round(600 * sd), opts: { seed: 6 } }).then(set("--cz-plaster", "600px 600px")),
      // three walls of stone, each a different mix (more coral, more render, more moss), so no two
      // stops show the same stones
      ...[
        { seed: 4, coral: 0.12, render: 0.18, moss: 0.55 },
        { seed: 21, coral: 0.4, render: 0.06, moss: 0.4 },
        { seed: 37, coral: 0.22, render: 0.12, moss: 0.75 },
      ].map((o, i) => {
        const ss = phone ? 1.25 : 1;
        return once(`stone${i}${phone ? "m" : "d"}`, { kind: "stone", w: Math.round(S.stone[0] * ss), h: Math.round(S.stone[1] * ss), opts: { ...o, course: S.course * ss } }).then(set(`--cz-stone${i ? i + 1 : ""}`, `${S.stone[0]}px ${S.stone[1]}px`));
      }),
      once(`marble${sd}`, { kind: "marble", w: Math.round(480 * sd), h: Math.round(480 * sd), opts: { seed: 9 } }).then(set("--cz-marble", "480px 480px")),
      once(`cobbles${sd}`, { kind: "cobbles", w: Math.round(480 * sd), h: Math.round(480 * sd), opts: { seed: 12, cells: 9 } }).then(set("--cz-cobbles", "480px 480px")),
      flora(`flora${k}`, Math.round(S.flora[0] * dpr), Math.round(S.flora[1] * dpr), dpr).then(set("--cz-flora", `${S.flora[0]}px ${S.flora[1]}px`)),
      flora(`flora2${k}`, Math.round(S.flora[0] * 0.66 * dpr), Math.round(S.flora[1] * 0.62 * dpr), dpr, 29).then(set("--cz-flora2", `${Math.round(S.flora[0] * 0.66)}px ${Math.round(S.flora[1] * 0.62)}px`)),
    ]).then(() => {});
  });
  return { first, all };
}
