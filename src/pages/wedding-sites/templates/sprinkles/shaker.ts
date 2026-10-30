import { useEffect, type MutableRefObject, type RefObject } from "react";
import { createStopSnap, type SnapSpan } from "../shared/stopSnap";
import { createSprinkleGL } from "./gl";
import { colourWeights, glPalette, type Flavour } from "./flavours";
import { headingKey, paintStill, sampleHeading, STRIDE, type Targets } from "./sample";

/**
 * Sprinkles' page: one section a screen ([data-sp-stop]), each with its heading ([data-sp-h])
 * in the same place, so every section docks the same way.
 *  - One swipe, one stop: the shared spring (shared/stopSnap.ts). A section taller than the
 *    screen by more than a sixth (the open reply form on a phone) is read through.
 *  - When a section docks, its heading pours in: the sprinkles fall from above the screen in a
 *    sweep along the words, as if shaken from a jar, tumble, land with a little hop and settle on
 *    the letters (sample.ts gives each one its place). When the page leaves, they come off the
 *    icing with the page's own speed and fall away.
 *  - A finger or the pointer nudges the sprinkles near it; they spring back to their places.
 *  - A "yes" on the reply showers the screen with sprinkles.
 *  - The physics runs here, over typed arrays (a few thousand sprinkles take well under a
 *    millisecond); the drawing is two instanced draws (gl.ts). The frame is drawn only while
 *    something moves; fewer sprinkles on a phone, fewer again on a slow one, and fewer still if
 *    a pour drops frames.
 *  - The opening (published page and design preview): the name pours in on the first screen; the
 *    page is held (html overflow hidden) until it has settled. A tap, key or swipe only hurries it,
 *    and that swipe is used up.
 *  - Still (builder, gallery card, reduced motion, no WebGL2): every heading is drawn settled on
 *    its own canvas, redrawn when its words or size change.
 */

type Pool = {
  x: Float32Array; y: Float32Array; vx: Float32Array; vy: Float32Array; a: Float32Array; va: Float32Array;
  tx: Float32Array; ty: Float32Array; hl: Float32Array; rad: Float32Array; col: Uint8Array; st: Uint8Array; t0: Float32Array; n: number;
};
const pool = (cap: number): Pool => ({
  x: new Float32Array(cap), y: new Float32Array(cap), vx: new Float32Array(cap), vy: new Float32Array(cap), a: new Float32Array(cap), va: new Float32Array(cap),
  tx: new Float32Array(cap), ty: new Float32Array(cap), hl: new Float32Array(cap), rad: new Float32Array(cap), col: new Uint8Array(cap), st: new Uint8Array(cap), t0: new Float32Array(cap), n: 0,
});
// the active heading's sprinkles: 0 waiting to fall, 1 falling, 2 landing (on a spring), 3 settled
const WAIT = 0, FALL = 1, LAND = 2, REST = 3;
const G = 3000; // gravity, px/s²
const K = 380, C = 2 * Math.sqrt(K) * 0.5; // the landing spring: a little under-damped, so a hop

type Stop = { from: number; to: number; el: HTMLElement; h: HTMLElement | null; hx: number; hy: number; key: string; t: Targets | null };

export type ShakerApi = { celebrate: () => void };

export function useShaker(
  refs: { root: RefObject<HTMLElement | null>; stage: RefObject<HTMLElement | null>; view: RefObject<HTMLCanvasElement | null>; api: MutableRefObject<ShakerApi | null> },
  { routeKey, animate, boot, snap: snapOn, flavour, editor, onOpened }: { routeKey: string; animate: boolean; boot: boolean; snap: boolean; flavour: Flavour; editor: boolean; onOpened: () => void },
) {
  useEffect(() => {
    const root = refs.root.current, stage = refs.stage.current, view = refs.view.current;
    if (!root) return;
    const phone = root.clientWidth <= 700;
    const nav = navigator as Navigator & { deviceMemory?: number };
    const slow = (nav.hardwareConcurrency || 8) <= 4 || (nav.deviceMemory ?? 8) <= 3;
    let budget = phone ? (slow ? 1500 : 2600) : slow ? 2600 : 4200;
    const weights = colourWeights(flavour);
    const colours = flavour.sprinkles.map((s) => s.c);
    const sampleOpts = () => ({ budget, weights, dots: flavour.dots, dotSize: flavour.dotSize, density: phone ? 1.75 : 2.1 });
    const gl = animate && view ? createSprinkleGL(view) : null;
    const html = document.documentElement, prevOverflow = html.style.overflow;
    let alive = true;
    const fontsReady = () => {
      const t = root.querySelector<HTMLElement>(".sp-h__t");
      const fam = t ? getComputedStyle(t).fontFamily : "";
      return Promise.race([
        Promise.all([document.fonts?.load(`800 80px ${fam}`).catch(() => undefined), document.fonts?.ready]),
        new Promise((r) => setTimeout(r, 3000)),
      ]);
    };

    // ---- the stops (both modes: the spring needs them)
    const snap = createStopSnap(root, snapOn);
    let stops: Stop[] = [];
    let H = 1, W = 1;
    const measure = () => {
      const rt = root.getBoundingClientRect();
      H = Math.max(1, stage?.getBoundingClientRect().height || window.innerHeight);
      W = Math.max(1, stage?.getBoundingClientRect().width || rt.width);
      const max = Math.max(0, rt.height - H);
      const clamp = (v: number) => Math.min(max, Math.max(0, Math.round(v)));
      const old = stops;
      stops = Array.from(root.querySelectorAll<HTMLElement>("[data-sp-stop]")).map((el, i) => {
        const r = el.getBoundingClientRect(), top = r.top - rt.top;
        const h = el.querySelector<HTMLElement>("[data-sp-h]");
        const hr = h?.getBoundingClientRect();
        const key = h ? headingKey(h) : "";
        const prev = old[i];
        return {
          from: clamp(top), to: r.height > H * 1.16 ? clamp(top + r.height - H) : clamp(top), el, h,
          hx: hr ? hr.left - rt.left : 0, hy: hr ? hr.top - rt.top : 0, key, t: prev && prev.h === h && prev.key === key ? prev.t : null,
        };
      });
      const spans: SnapSpan[] = stops.map((s) => (s.to > s.from + 8 ? { from: s.from, to: s.to } : { from: s.from }));
      snap.update(spans.length ? spans : [{ from: 0 }], H);
    };
    const targetsOf = (s: Stop) => {
      if (!s.h) return null;
      if (!s.t) s.t = sampleHeading(s.h, sampleOpts());
      return s.t;
    };

    // ================= still: every heading drawn settled, on its own canvas =================
    if (!gl) {
      if (boot) onOpened();
      let t = 0;
      const paintAll = () => {
        t = 0;
        if (!alive) return;
        measure();
        for (const s of stops) {
          const cv = s.h?.querySelector<HTMLCanvasElement>(".sp-h__c");
          const tg = targetsOf(s);
          if (cv && tg) paintStill(cv, tg, 40, colours, flavour.shadow);
        }
      };
      const kick = () => { clearTimeout(t); t = window.setTimeout(paintAll, editor ? 160 : 60); };
      void fontsReady().then(() => { if (alive) paintAll(); });
      const ro = new ResizeObserver(kick);
      ro.observe(root);
      // the builder: the words change as the host types
      const mo = new MutationObserver(kick);
      mo.observe(root, { childList: true, subtree: true, characterData: true });
      window.addEventListener("resize", kick);
      return () => {
        alive = false;
        clearTimeout(t);
        ro.disconnect();
        mo.disconnect();
        window.removeEventListener("resize", kick);
        snap.dispose();
      };
    }

    // ================= motion =================
    const A = pool(Math.ceil(budget * 1.05) + 8); // the heading on screen (its own coordinates)
    const F = pool(budget * 2 + 1200); // loose: leaving, or the shower (the frame's coordinates)
    const inst = new Float32Array((A.x.length + F.x.length) * STRIDE);
    const pal = glPalette(flavour);
    const rnd = Math.random;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    let current = -1, sizeL = phone ? 8 : 12;
    let opening = boot;
    let pourAt = 0, pourEnd = 0, timeScale = 1, poured = false;
    let ox = 0, oy = 0, lastOy = 0, pageV = 0;
    let sr = { left: 0, top: 0 };

    const resize = () => { gl.resize(W, H, dpr); };

    const pour = (i: number, sweep: number) => {
      const s = stops[i], t = s ? targetsOf(s) : null;
      A.n = 0;
      current = i;
      if (!t) return;
      const now = performance.now() / 1000;
      const n = Math.min(t.n, A.x.length);
      sizeL = t.L;
      for (let k = 0; k < n; k++) {
        const o = k * STRIDE;
        A.tx[k] = t.pts[o]; A.ty[k] = t.pts[o + 1]; A.a[k] = t.pts[o + 2]; A.hl[k] = t.pts[o + 3]; A.rad[k] = t.pts[o + 4]; A.col[k] = t.pts[o + 5];
        A.st[k] = WAIT;
        // a sweep along the words, a little later for a lower line, never quite in step
        A.t0[k] = now + sweep * (0.78 * (A.tx[k] / t.w) + 0.22 * (A.ty[k] / t.h)) + rnd() * sweep * 0.32;
      }
      A.n = n;
      pourAt = now;
      poured = true;
      pourEnd = now + sweep * 1.32 + 0.9;
      wake();
    };
    const settleAll = (i: number) => {
      const s = stops[i], t = s ? targetsOf(s) : null;
      current = i;
      A.n = 0;
      if (!t) return;
      const n = Math.min(t.n, A.x.length);
      for (let k = 0; k < n; k++) {
        const o = k * STRIDE;
        A.x[k] = A.tx[k] = t.pts[o]; A.y[k] = A.ty[k] = t.pts[o + 1]; A.a[k] = t.pts[o + 2]; A.hl[k] = t.pts[o + 3]; A.rad[k] = t.pts[o + 4]; A.col[k] = t.pts[o + 5];
        A.vx[k] = A.vy[k] = A.va[k] = 0;
        A.st[k] = REST;
      }
      A.n = n;
    };
    const addLoose = (x: number, y: number, vx: number, vy: number, a: number, va: number, hl: number, rad: number, col: number) => {
      if (F.n >= F.x.length) return;
      const k = F.n++;
      F.x[k] = x; F.y[k] = y; F.vx[k] = vx; F.vy[k] = vy; F.a[k] = a; F.va[k] = va; F.hl[k] = hl; F.rad[k] = rad; F.col[k] = col;
    };
    // the page leaves: the sprinkles come off the icing with its speed and fall away
    const release = () => {
      const t = stops[current]?.t;
      const cx = t ? t.w / 2 : 0;
      for (let k = 0; k < A.n; k++) {
        if (A.st[k] === WAIT) continue;
        const sx = A.x[k] + ox, sy = A.y[k] + oy;
        if (sy < -60 || sy > H + 60) continue;
        addLoose(sx, sy, ((A.x[k] - cx) / Math.max(1, cx)) * 140 + (rnd() - 0.5) * 220, Math.max(-2400, Math.min(2400, pageV)) * 0.9 - 60 - rnd() * 300, A.a[k], (rnd() - 0.5) * 22, A.hl[k], A.rad[k], A.col[k]);
      }
      A.n = 0;
      current = -1;
    };
    const celebrate = () => {
      const L = sizeL, rad = L * 0.16;
      for (let k = 0; k < (phone ? 700 : 1100); k++) {
        const dot = rnd() < flavour.dots;
        const r = dot ? rad * flavour.dotSize : rad;
        const c = weights.findIndex((w) => rnd() <= w);
        addLoose(rnd() * W, -20 - rnd() * H * 0.9, (rnd() - 0.5) * 90, 150 + rnd() * 350, rnd() * Math.PI, (rnd() - 0.5) * 20, dot ? 0 : Math.max(0.5, L / 2 - r), r, Math.max(0, c));
      }
      wake();
    };
    refs.api.current = { celebrate };

    // ---- a finger or the pointer
    const ptr = { x: -1e4, y: -1e4, vx: 0, vy: 0, t: 0 };
    const setPtr = (cx: number, cy: number) => {
      const x = cx - sr.left, y = cy - sr.top, now = performance.now();
      const dt = Math.max(8, now - ptr.t) / 1000;
      if (now - ptr.t < 120) { ptr.vx = (x - ptr.x) / dt; ptr.vy = (y - ptr.y) / dt; } else { ptr.vx = ptr.vy = 0; }
      ptr.x = x; ptr.y = y; ptr.t = now;
      wake();
    };
    const onPointer = (e: PointerEvent) => { if (e.pointerType !== "touch") setPtr(e.clientX, e.clientY); };
    const onTouch = (e: TouchEvent) => { const t = e.touches[0]; if (t) setPtr(t.clientX, t.clientY); };

    // ---- each frame
    let movers = 0;
    const step = (dt: number, now: number) => {
      const near = now * 1000 - ptr.t < 90;
      const R = phone ? 52 : 64, R2 = R * R;
      const px = ptr.x - ox, py = ptr.y - oy;
      const steer = 1 - Math.exp(-5 * dt);
      movers = 0;
      for (let k = 0; k < A.n; k++) {
        let st = A.st[k];
        if (st === WAIT) {
          if (now < A.t0[k]) { movers++; continue; }
          st = FALL;
          A.x[k] = A.tx[k] + (rnd() - 0.5) * sizeL * 4;
          A.y[k] = -oy - 16 - rnd() * 70;
          A.vx[k] = (rnd() - 0.5) * 60;
          A.vy[k] = 380 + rnd() * 420;
          A.va[k] = (rnd() - 0.5) * 26;
          A.a[k] += rnd() * Math.PI;
        }
        if (st === FALL) {
          A.vy[k] += G * dt;
          A.x[k] += (A.tx[k] - A.x[k]) * steer + A.vx[k] * dt;
          A.y[k] += A.vy[k] * dt;
          A.a[k] += A.va[k] * dt;
          if (A.y[k] >= A.ty[k]) {
            A.y[k] = A.ty[k];
            A.vy[k] = -A.vy[k] * (0.1 + rnd() * 0.16);
            A.vx[k] = A.vx[k] * 0.3 + (A.tx[k] - A.x[k]) * 3;
            A.va[k] *= 0.35;
            st = LAND;
          }
          movers++;
        } else if (st === LAND) {
          const dx = A.tx[k] - A.x[k], dy = A.ty[k] - A.y[k];
          A.vx[k] += (K * dx - C * A.vx[k]) * dt;
          A.vy[k] += (K * dy - C * A.vy[k]) * dt;
          A.x[k] += A.vx[k] * dt;
          A.y[k] += A.vy[k] * dt;
          A.va[k] *= Math.exp(-6 * dt);
          A.a[k] += A.va[k] * dt;
          if (Math.abs(dx) < 0.3 && Math.abs(dy) < 0.3 && A.vx[k] * A.vx[k] + A.vy[k] * A.vy[k] < 9 && Math.abs(A.va[k]) < 0.06) {
            A.x[k] = A.tx[k]; A.y[k] = A.ty[k]; A.vx[k] = A.vy[k] = A.va[k] = 0;
            st = REST;
          } else movers++;
        }
        // nudged: away from the finger, then back on the spring
        if (near && st >= LAND) {
          const dx = A.x[k] - px, dy = A.y[k] - py, d2 = dx * dx + dy * dy;
          if (d2 < R2) {
            const d = Math.sqrt(d2) || 1, f = 1 - d / R;
            A.vx[k] += ((dx / d) * f * 15000 + ptr.vx * f * 1.6) * dt;
            A.vy[k] += ((dy / d) * f * 15000 + ptr.vy * f * 1.6) * dt;
            A.va[k] += (rnd() - 0.5) * f * 60 * dt;
            if (st === REST) { st = LAND; movers++; }
          }
        }
        A.st[k] = st;
      }
      for (let k = 0; k < F.n; k++) {
        F.vy[k] += G * 0.85 * dt;
        F.vx[k] *= Math.exp(-0.8 * dt);
        F.x[k] += F.vx[k] * dt;
        F.y[k] += F.vy[k] * dt;
        F.a[k] += F.va[k] * dt;
        // gone off the screen (up with the page, or down)
        if (F.y[k] > H + 40 || (F.y[k] < -40 && F.vy[k] < 0) || F.x[k] < -80 || F.x[k] > W + 80) {
          const j = --F.n;
          F.x[k] = F.x[j]; F.y[k] = F.y[j]; F.vx[k] = F.vx[j]; F.vy[k] = F.vy[j]; F.a[k] = F.a[j]; F.va[k] = F.va[j]; F.hl[k] = F.hl[j]; F.rad[k] = F.rad[j]; F.col[k] = F.col[j];
          k--;
        }
      }
    };
    const draw = () => {
      let c = 0;
      for (let k = 0; k < A.n; k++) {
        if (A.st[k] === WAIT) continue;
        const x = A.x[k] + ox, y = A.y[k] + oy;
        if (y < -30 || y > H + 30) continue;
        const o = c++ * STRIDE;
        inst[o] = x; inst[o + 1] = y; inst[o + 2] = A.a[k]; inst[o + 3] = A.hl[k]; inst[o + 4] = A.rad[k]; inst[o + 5] = A.col[k];
      }
      for (let k = 0; k < F.n; k++) {
        if (F.y[k] < -30) continue;
        const o = c++ * STRIDE;
        inst[o] = F.x[k]; inst[o + 1] = F.y[k]; inst[o + 2] = F.a[k]; inst[o + 3] = F.hl[k]; inst[o + 4] = F.rad[k]; inst[o + 5] = F.col[k];
      }
      gl.draw(inst, c, pal, flavour.shadow, sizeL / 10);
    };

    // which section is docked (or nearly): its heading pours; the one left behind falls away
    const check = (s: number) => {
      if (opening) return;
      let at = -1;
      stops.forEach((st, i) => { if (s >= st.from - H * 0.24 && s <= st.to + H * 0.24) at = i; });
      if (at === current) return;
      if (current >= 0) release();
      if (at >= 0) pour(at, 0.62);
    };

    let raf = 0, last = 0, slowFrames = 0, frames = 0;
    const stats = { frames: 0, cpu: 0, worst: 0 };
    const frame = (tms: number) => {
      raf = 0;
      if (!alive) return;
      const dtRaw = Math.max(0, (tms - last) / 1000);
      last = tms;
      const t0 = performance.now();
      const rt = root.getBoundingClientRect(), srr = stage!.getBoundingClientRect();
      sr = { left: srr.left, top: srr.top };
      const s = -rt.top; // how far the page has moved past the root's top
      const cs = stops[current];
      lastOy = oy;
      ox = cs ? rt.left + cs.hx - srr.left : 0;
      oy = cs ? rt.top + cs.hy - srr.top : 0;
      const dt = Math.min(0.04, dtRaw);
      if (dt > 0) pageV = pageV * 0.6 + ((oy - lastOy) / dt) * 0.4;
      check(s);
      const now = performance.now() / 1000;
      const sdt = dt * timeScale;
      if (sdt > 0.02) { step(sdt / 2, now); step(sdt / 2, now); } else step(sdt, now);
      draw();
      const cpu = performance.now() - t0;
      stats.frames++; stats.cpu += cpu; stats.worst = Math.max(stats.worst, cpu);
      // a pour that drops frames: fewer sprinkles from the next heading on
      if (movers > 0) {
        frames++;
        if (dtRaw > 0.024) slowFrames++;
        if (frames >= 45) {
          if (slowFrames > 18 && budget > 700) { budget = Math.round(budget * 0.72); for (const st of stops) st.t = null; }
          frames = slowFrames = 0;
        }
      }
      // the opening ends once the name has settled
      if (opening && poured && (movers === 0 || now > pourEnd + 0.6)) {
        if (movers) settleAll(current);
        opening = false;
        timeScale = 1;
        unlock();
        onOpened();
      }
      const busy = movers > 0 || F.n > 0 || performance.now() - ptr.t < 700 || Math.abs(oy - lastOy) > 0.01;
      if (busy) raf = requestAnimationFrame(frame);
      else draw();
    };
    function wake() {
      if (!raf && alive) { last = performance.now(); raf = requestAnimationFrame(frame); }
    }

    // ---- the opening
    const evs = ["wheel", "touchstart", "keydown", "pointerdown"] as const;
    const hurry = () => { if (opening && performance.now() / 1000 - pourAt > 0.25) timeScale = 2.6; };
    function unlock() { html.style.overflow = prevOverflow; evs.forEach((e) => window.removeEventListener(e, hurry)); }
    if (opening) {
      html.style.overflow = "hidden";
      window.scrollTo(0, 0);
      evs.forEach((e) => window.addEventListener(e, hurry, { passive: true }));
    }

    const kick = () => { if (!alive) return; measure(); resize(); wake(); };
    const onScroll = () => wake();
    measure();
    resize();
    void fontsReady().then(() => {
      if (!alive) return;
      for (const s of stops) s.t = null;
      measure();
      resize();
      if (opening) {
        pour(0, phone ? 0.95 : 1.15);
        // the next heading's places, worked out now while nothing else moves
        window.setTimeout(() => { if (alive && stops[1]) targetsOf(stops[1]); }, 400);
      }
      wake();
      // the other headings, one per idle moment
      const ric = (cb: () => void) => (typeof window.requestIdleCallback === "function" ? window.requestIdleCallback(cb, { timeout: 2000 }) : window.setTimeout(cb, 300));
      let i = 0;
      const warm = () => { if (!alive) return; while (i < stops.length && stops[i].t) i++; if (i >= stops.length) return; if (!raf) targetsOf(stops[i]); ric(warm); };
      window.setTimeout(() => ric(warm), 2500);
    });

    const ro = new ResizeObserver(() => {
      kick();
      // a new size: the heading on screen lies settled in its new places
      if (current >= 0 && !opening) { const s = stops[current]; if (s && !s.t) settleAll(current); }
    });
    ro.observe(root);
    if (stage) ro.observe(stage);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", kick);
    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("pointerdown", onPointer, { passive: true });
    window.addEventListener("touchstart", onTouch, { passive: true });
    window.addEventListener("touchmove", onTouch, { passive: true });
    if (import.meta.env.DEV) (window as unknown as { __sp?: unknown }).__sp = { stats, stops: () => stops, count: () => A.n + F.n, loose: () => F.n, current: () => current, raf: () => raf, H: () => H, budget: () => budget };
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", kick);
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("touchstart", onTouch);
      window.removeEventListener("touchmove", onTouch);
      if (opening) unlock();
      refs.api.current = null;
      snap.dispose();
      gl.dispose();
    };
    // the refs are stable; routeKey stands for the sections on the page
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeKey, animate, boot, snapOn, flavour, editor]);
}
