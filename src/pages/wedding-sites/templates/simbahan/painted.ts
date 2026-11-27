/**
 * Simbahan's church, painted: watercolour frames rendered in Blender (the walk from the plaza
 * through the doors, then down the aisle one stop at a time), played on a 2D canvas.
 *  - Two sets: `wide` (computers, landscape) and `tall` (phones: the church sits high, the
 *    programme card docks on the bottom edge). Picked by the stage's shape.
 *  - Each set: the opening (`o`, OPEN_N frames) and the aisle (`a`, AISLE_N frames, SEG between
 *    each pair of stops; its first frame is the opening's last), at a light size for moving, plus
 *    a sharper frame at each stop (`rest`), drawn once the camera has stopped there.
 *  - Loading: whatever is asked for first (the opening in order, or the stop the page is at), then
 *    the aisle coarse to fine (stops, halves, quarters…), so a gap is always bridged by the
 *    nearest frames we have. Between two frames the next is cross-faded in.
 */

export const OPEN_N = 96;
export const SEG = 24;
export const AISLE_N = SEG * 7 + 1;
/** The opening frame on which the doors are open enough for the names. */
export const NAMES_FRAME = 74;
/** Where each stop is along the aisle frames (in stops). */
export const STOP_AT: Record<string, number> = { door: 0, story: 1, day: 2, sponsors: 3, entourage: 4, wear: 5, details: 6, rsvp: 7 };

export type FrameSet = "wide" | "tall";
const BASE = "/event-templates/simbahan/frames";
const pad = (i: number) => String(i).padStart(4, "0");

// the opening's pacing: even, from how much each pair of frames differs (measured on the renders)
const D = [0.36, 0.48, 0.63, 0.76, 0.89, 1.06, 1.25, 1.42, 1.61, 1.89, 2.08, 2.36, 2.7, 2.96, 3.3, 3.65, 4.0, 4.36, 4.84, 5.25, 5.72, 6.23, 6.79, 7.34, 7.89, 8.53, 9.19, 9.82, 10.53, 11.24, 11.94, 12.57, 13.27, 13.78, 14.46, 15.13, 15.93, 17.25, 18.26, 18.85, 21.72, 22.1, 21.26, 19.21, 16.23, 14.24, 11.87, 9.97, 9.7, 9.43, 9.46, 9.6, 9.52, 9.32, 8.25, 6.63, 6.25, 5.79, 6.15, 7.09, 6.13, 5.91, 5.77, 5.65, 4.96, 6.45, 4.35, 4.16, 4.15, 4.11, 4.06, 3.9, 3.82, 3.7, 3.43, 3.33, 3.16, 3.09, 2.93, 2.74, 2.55, 2.36, 2.2, 2.07, 1.9, 1.79, 1.62, 1.51, 1.39, 1.3, 1.26, 1.14, 1.07, 1.0, 0.86];
const C = [0];
for (const d of D) C.push(C[C.length - 1] + Math.pow(Math.max(d, 4), 0.8));
/** The opening frame (fractional) for a share of the walk, 0..1. */
export function openingFrame(k: number) {
  const v = Math.min(1, Math.max(0, k)) * C[OPEN_N - 1];
  let i = 0;
  while (i < OPEN_N - 2 && C[i + 1] < v) i++;
  return i + Math.min(1, Math.max(0, (v - C[i]) / Math.max(1e-6, C[i + 1] - C[i])));
}

type Img = HTMLImageElement;
type Set_ = { o: (Img | undefined)[]; a: (Img | undefined)[]; rest: (Img | undefined)[]; got: number; queue: [string, number][]; flying: Set<string>; busy: number };

export type Painted = {
  /** Which set fits a stage of this size. */
  setFor(w: number, h: number): FrameSet;
  /** Ask for frames first (src "o" for the opening, "a" for the aisle around stop `near`). */
  want(set: FrameSet, src: "o" | "a", near?: number): void;
  /** How many opening frames have arrived, in order from the first. */
  openingReady(set: FrameSet): number;
  size(scale: number): void;
  /** Draw frame `f` of `src`; `rest` asks for the sharp frame at a stop (when there is one). */
  draw(set: FrameSet, src: "o" | "a", f: number, opts: { rest: boolean; sway: [number, number] }): void;
  /** Called whenever a frame arrives (to redraw). */
  onLoad(fn: () => void): void;
  dispose(): void;
};

export function createPainted(cv: HTMLCanvasElement): Painted | null {
  const ctx = cv.getContext("2d", { alpha: false });
  if (!ctx) return null;
  const sets: Partial<Record<FrameSet, Set_>> = {};
  let listener: () => void = () => {};
  let dead = false;
  const loading = new Set<Img>();

  const make = (): Set_ => ({ o: new Array(OPEN_N), a: new Array(AISLE_N), rest: new Array(8), got: 0, queue: [], flying: new Set(), busy: 0 });
  const urlOf = (set: FrameSet, k: string, i: number) => (k === "r" ? `${BASE}/${set}/rest/${pad(i)}.webp` : `${BASE}/${set}/${k}/${pad(i)}.webp`);

  const pump = (set: FrameSet) => {
    const s = sets[set]!;
    while (!dead && s.busy < 6 && s.queue.length) {
      const [k, i] = s.queue.shift()!;
      const arr = k === "o" ? s.o : k === "a" ? s.a : s.rest;
      if (arr[i] || s.flying.has(k + i)) continue;
      s.busy++;
      s.flying.add(k + i);
      const im = new Image();
      im.decoding = "async";
      loading.add(im);
      const done = (ok: boolean) => {
        loading.delete(im);
        s.busy--;
        s.flying.delete(k + i);
        if (dead) return;
        if (ok) { arr[i] = im; s.got++; listener(); }
        pump(set);
      };
      im.onload = () => { (im.decode ? im.decode() : Promise.resolve()).catch(() => {}).then(() => done(true)); };
      im.onerror = () => done(false);
      im.src = urlOf(set, k, i);
    }
  };
  // jobs go in front of what's already waiting (the latest ask wins); duplicates are skipped
  const ask = (set: FrameSet, jobs: [string, number][]) => {
    const s = (sets[set] ??= make());
    const front = new Set<string>(), head: [string, number][] = [];
    for (const [k, i] of jobs) if (!front.has(k + i)) { front.add(k + i); head.push([k, i]); }
    s.queue = [...head, ...s.queue.filter(([k, i]) => !front.has(k + i))];
    pump(set);
  };
  const aisleOrder = (near: number) => {
    const out: [string, number][] = [];
    const c = Math.round(near * SEG);
    // the frames either side of where the page is, then the rest coarse to fine
    for (let d = 0; d <= SEG; d += 2) for (const i of [c - d, c + d]) if (i >= 0 && i < AISLE_N) out.push(["a", i]);
    for (let step = SEG; step >= 1; step = Math.floor(step / 2)) for (let i = 0; i < AISLE_N; i += step) out.push(["a", i]);
    return out;
  };

  return {
    setFor: (w, h) => (h > w * 1.05 ? "tall" : "wide"),
    want(set, src, near = 0) {
      if (src === "o") {
        const jobs: [string, number][] = [];
        for (let i = 0; i < OPEN_N; i++) jobs.push(["o", i]);
        ask(set, [...jobs, ["r", 0], ...aisleOrder(0), ...[1, 2, 3, 4, 5, 6, 7].map((k) => ["r", k] as [string, number])]);
      } else {
        const r = Math.max(0, Math.min(7, Math.round(near)));
        ask(set, [["r", r], ...aisleOrder(near), ...[0, 1, 2, 3, 4, 5, 6, 7].map((k) => ["r", k] as [string, number])]);
      }
    },
    openingReady(set) {
      const s = sets[set];
      if (!s) return 0;
      let n = 0;
      while (n < OPEN_N && s.o[n]) n++;
      return n;
    },
    size(scale) {
      const w = Math.round(cv.clientWidth * scale), h = Math.round(cv.clientHeight * scale);
      if (cv.width !== w || cv.height !== h) { cv.width = Math.max(1, w); cv.height = Math.max(1, h); }
    },
    draw(set, src, f, { rest, sway }) {
      const s = sets[set];
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#f6efe0";
      ctx.fillRect(0, 0, cv.width, cv.height);
      if (!s) return;
      const arr = src === "o" ? s.o : s.a, n = arr.length;
      const cover = (im: Img, a: number) => {
        // cover the frame, centred, a touch over-size so the hand-held drift never shows an edge
        const sc = Math.max(cv.width / im.naturalWidth, cv.height / im.naturalHeight) * 1.012;
        const w = im.naturalWidth * sc, h = im.naturalHeight * sc;
        ctx.globalAlpha = a;
        ctx.drawImage(im, (cv.width - w) / 2 + sway[0] * cv.width, (cv.height - h) / 2 + sway[1] * cv.height, w, h);
      };
      // at a stop, its sharp frame
      const stop = src === "a" ? Math.round(f / SEG) : -1;
      if (rest && stop >= 0 && Math.abs(f - stop * SEG) < 0.02 && s.rest[stop]) { cover(s.rest[stop]!, 1); ctx.globalAlpha = 1; return; }
      if (rest && src === "o" && f >= OPEN_N - 1.02 && s.rest[0]) { cover(s.rest[0]!, 1); ctx.globalAlpha = 1; return; }
      // otherwise the nearest frame we have at or below f, and the next one faded in over it
      const a = Math.max(0, Math.min(n - 1, Math.floor(f))), t = f - a;
      let i0 = -1;
      for (let k = a; k >= 0; k--) if (arr[k]) { i0 = k; break; }
      if (i0 < 0) for (let k = a + 1; k < n; k++) if (arr[k]) { i0 = k; break; }
      if (i0 < 0) {
        // nothing of this walk yet: the nearest sharp stop frame, if any
        const r = src === "a" ? s.rest[Math.max(0, Math.min(7, stop))] : s.rest[0];
        if (r) cover(r, 1);
        ctx.globalAlpha = 1;
        return;
      }
      let i1 = -1;
      for (let k = Math.max(i0, a) + 1; k < n; k++) if (arr[k]) { i1 = k; break; }
      cover(arr[i0]!, 1);
      if (i1 > 0) {
        const span = i1 - i0, u = (f - i0) / span;
        if (u > 0.01) cover(arr[i1]!, Math.min(1, u));
      } else if (t > 0.01 && a + 1 < n && arr[a + 1]) cover(arr[a + 1]!, t);
      ctx.globalAlpha = 1;
    },
    onLoad(fn) { listener = fn; },
    dispose() {
      dead = true;
      loading.forEach((im) => { im.onload = im.onerror = null; im.src = ""; });
      loading.clear();
    },
  };
}
