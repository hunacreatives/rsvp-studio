import { useEffect, useRef, type RefObject } from "react";
import { createStopSnap } from "../shared/stopSnap";
import { camOf, createGarden, FOUNTAIN, project, type Garden, type View } from "./garden";

/**
 * Promenade's stroll: the garden on the sticky frame, the camera gliding down the promenade as
 * the guest scrolls, one stop a section ([data-pm-stop]).
 *  - Every card ([data-pm-dock]) pauses in the same place, its dock: high on the right of a wide
 *    frame, on the bottom edge of a phone's (a card too tall for that docks by its bottom edge,
 *    so it can be read to the end). The card is sticky there for its hold, then scrolls away;
 *    the dock is measured here and set as the card's `top` (as in Level Up).
 *  - The camera holds while a card is docked and glides in the gap to the next stop (eased along
 *    the gap), exactly where the page is each frame, so the garden and the cards move as one.
 *  - The opening (`intro`): high over the whole garden, turned across the frame, the camera comes
 *    down and round to the gate while the names appear. Any scroll, tap or key finishes it.
 *  - Kept light: every frame while the page moves (≤ 30 a second for the water at rest), ≤ 1.25
 *    device pixels (less if the screen can't keep up), only while on screen and the tab is shown. The garden itself is redrawn only while the
 *    camera moves; between moves only the water is, and only while the fountain is in view.
 *  - `animate` false (builder, gallery card, reduced motion): no easing, no water moving, a still
 *    frame redrawn on scroll.
 */

export type StopKey = "gate" | "story" | "pictures" | "day" | "dress" | "details" | "rsvp";
/** Where each stop is along the promenade (metres from the gate). */
export const PLACE_Z: Record<StopKey, number> = { gate: -6, story: 45.4, pictures: 79.2, day: 110.7, dress: 145.2, details: 186.5, rsvp: 228 };

const DEG = Math.PI / 180;
export function viewOf(key: StopKey, phone: boolean, wide = false): View {
  const z = PLACE_Z[key], gate = key === "gate";
  // the gallery card: higher, the forecourt, the gate and the monogram court all in the frame
  if (wide) return { x: 0, z: 1.5, dist: 108, pitch: 62 * DEG, yaw: 0, fov: 26 * DEG, sx: 0, sy: 0 };
  return phone
    ? { x: 0, z: gate ? -11 : z, dist: 64, pitch: 64 * DEG, yaw: 0, fov: 38 * DEG, sx: 0, sy: gate ? 0.06 : 0.44 }
    : { x: 0, z: gate ? -7 : z, dist: 78, pitch: 59 * DEG, yaw: 0, fov: 26 * DEG, sx: gate ? 0 : -0.3, sy: gate ? 0 : 0.02 };
}
const introView = (phone: boolean): View =>
  phone
    ? { x: 0, z: 108, dist: 470, pitch: 89.6 * DEG, yaw: 0, fov: 46 * DEG, sx: 0, sy: 0 }
    : { x: 0, z: 112, dist: 440, pitch: 89.6 * DEG, yaw: 90 * DEG, fov: 33 * DEG, sx: 0, sy: 0 };
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
function mixView(a: View, b: View, t: number, k = t): View {
  return {
    x: lerp(a.x, b.x, t),
    z: lerp(a.z, b.z, t),
    dist: Math.exp(lerp(Math.log(a.dist), Math.log(b.dist), t)),
    pitch: lerp(a.pitch, b.pitch, k),
    yaw: lerp(a.yaw, b.yaw, t),
    fov: lerp(a.fov, b.fov, t),
    sx: lerp(a.sx, b.sx, t),
    sy: lerp(a.sy, b.sy, t),
  };
}
const INTRO_MS = 6200;

export function useStroll(
  refs: { root: RefObject<HTMLElement | null>; stage: RefObject<HTMLElement | null>; gl: RefObject<HTMLCanvasElement | null> },
  { stops, animate, intro, monogram, font, wide = false, snap = false }: { stops: string; animate: boolean; intro: boolean; monogram: string; font: string; wide?: boolean; snap?: boolean },
) {
  // the renderer lives as long as the canvas (toggling a section or retyping the initials
  // doesn't rebuild it)
  const gardenRef = useRef<Garden | null>(null);
  const redraw = useRef<() => void>(() => {});
  const monoRef = useRef({ monogram, font });
  monoRef.current = { monogram, font };
  useEffect(() => {
    const cv = refs.gl.current;
    if (!cv) return;
    const g = createGarden(cv);
    gardenRef.current = g;
    if (!g) { cv.style.display = "none"; refs.root.current?.classList.add("pm-nogl"); return; }
    g.monogram(monoRef.current.monogram, monoRef.current.font);
    return () => { gardenRef.current = null; g.dispose(); };
  }, [refs.gl, refs.root]);
  useEffect(() => {
    const g = gardenRef.current;
    if (!g) return;
    let alive = true;
    g.monogram(monogram, font);
    redraw.current();
    // again once the display face has loaded
    document.fonts?.load(`italic 500 120px ${font}`).then(() => { if (alive) { g.monogram(monogram, font); redraw.current(); } }).catch(() => {});
    return () => { alive = false; };
  }, [monogram, font]);

  useEffect(() => {
    const root = refs.root.current, stage = refs.stage.current;
    const garden = gardenRef.current;
    if (!root || !stage) return;
    const keys = stops.split(",") as StopKey[];

    // ---- where the page comes to rest (one swipe, one stop): each card in its dock, the opening,
    // and for a card taller than the frame, its top and every ¾ frame down it
    let rests: number[] = [0];
    // the shared one-swipe-one-stop spring (the same feel as every scroll design)
    const snapper = createStopSnap(root, snap, { gentle: true });
    // ---- the stops: each one's hold, the scroll range [a, b] while its card is docked
    let holds: { a: number; b: number }[] = [{ a: 0, b: 0 }], H = 1, phone = false;
    const scrolled = () => stage.getBoundingClientRect().top - root.getBoundingClientRect().top;
    const measure = () => {
      const rt = root.getBoundingClientRect();
      H = Math.max(1, stage.getBoundingClientRect().height);
      const max = Math.max(0, rt.height - H);
      phone = rt.width <= 700;
      const T = Math.round(Math.min(120, Math.max(40, H * 0.1)));
      const marks: number[] = [];
      const all = Array.from(root.querySelectorAll<HTMLElement>("[data-pm-stop]"));
      // the last card must be able to reach its dock before the page ends, however short it is
      const lastWrap = all[all.length - 1]?.querySelector<HTMLElement>(".pm-dock"), lastCard = lastWrap?.querySelector<HTMLElement>("[data-pm-dock]");
      const lastHold = lastWrap?.querySelector<HTMLElement>(".pm-hold");
      if (lastCard && lastHold) {
        const h = lastCard.offsetHeight, top = phone ? H - h - 12 : h > H - T - 28 ? H - h - 28 : T;
        const want = `${Math.round(Math.max(H * 0.18, H - top - h + 2))}px`;
        if (lastHold.style.height !== want) lastHold.style.height = want;
      }
      holds = all.map((s) => {
        const wrap = s.querySelector<HTMLElement>(".pm-dock"), card = wrap?.querySelector<HTMLElement>("[data-pm-dock]");
        if (!wrap || !card) { const r = s.getBoundingClientRect(); const y = Math.min(max, Math.max(0, r.top - rt.top + Math.min(r.height, H) / 2 - H / 2)); marks.push(y); return { a: y, b: y }; }
        const h = card.offsetHeight;
        const top = Math.round(phone ? H - h - 12 : h > H - T - 28 ? H - h - 28 : T);
        card.style.top = `${top}px`;
        const w = wrap.getBoundingClientRect(), y0 = w.top - rt.top - top;
        const a = Math.min(max, Math.max(0, y0));
        // a card taller than the frame docks by its bottom edge: it also stops with its top in
        // view, and every ¾ frame between, so all of it can be read at rest
        if (top < 12) { const from = a - (16 - top); for (let y = from; y < a - H * 0.3; y += H * 0.75) marks.push(Math.max(0, y)); }
        marks.push(a);
        return { a, b: Math.min(max, Math.max(0, y0 + w.height - h)) };
      });
      if (!holds.length) holds = [{ a: 0, b: 0 }];
      rests = marks.map(Math.round).sort((p, q) => p - q).filter((y, i, l) => i === 0 || y - l[i - 1] > 40);
      snapper.update(rests.map((from) => ({ from })), H);
    };
    // the camera's place along the stops for a scroll position: still while a card is docked,
    // gliding (eased) through the gap to the next, arriving a little before that card docks
    const stopAt = (y: number) => {
      if (y <= holds[0].b) return 0;
      for (let i = 0; i < holds.length - 1; i++) {
        const { b } = holds[i], { a } = holds[i + 1];
        if (y <= a) { const t = Math.min(1, Math.max(0, (y - b) / Math.max(1, a - b))); const m = Math.min(1, t / 0.88); return i + m * m * (3 - 2 * m); }
        if (y <= holds[i + 1].b) return i + 1;
      }
      return holds.length - 1;
    };
    const viewAt = (x: number): View => {
      const n = keys.length - 1, i = Math.max(0, Math.min(n, Math.floor(x))), f = Math.min(1, Math.max(0, x - i));
      const a = viewOf(keys[i] ?? "gate", phone, wide);
      return i >= n || f === 0 ? a : mixView(a, viewOf(keys[i + 1], phone), f);
    };

    // ---- the opening
    let introOn = intro && !!garden;
    const t0 = performance.now();
    let introStart = t0, skipFrom = -1, skipAt = 0, named = false;
    const html = document.documentElement, prevOverflow = html.style.overflow;
    const unlock = () => { html.style.overflow = prevOverflow; };
    const skip = () => {
      if (!introOn || skipFrom >= 0) return;
      skipFrom = introK(performance.now());
      skipAt = performance.now();
      // the page stays held until the opening ends: the swipe that skipped it (its momentum) is used up
      kick();
    };
    const introK = (now: number) => {
      if (skipFrom >= 0) return Math.min(1, skipFrom + (1 - skipFrom) * Math.min(1, (now - skipAt) / 900));
      return Math.min(1, (now - introStart) / INTRO_MS);
    };
    const evs = ["wheel", "touchstart", "keydown", "pointerdown"] as const;
    if (introOn) {
      html.style.overflow = "hidden";
      root.classList.add("pm-intro");
      root.classList.remove("pm-named");
      evs.forEach((e) => window.addEventListener(e, skip, { passive: true }));
    } else root.classList.add("pm-named");

    // ---- the loop
    let target = 0, X = 0, lastDraw = -1e9, raf = 0, visible = true, lastKey = "", adapt = 1;
    const slow: number[] = [];
    const scale = () => Math.min(window.devicePixelRatio || 1, 1.25) * adapt;
    const loop = (now: number) => {
      raf = 0;
      // the camera goes where the page is, the same frame (its glide between stops is already eased;
      // a smoothing on top of that left the garden trailing the cards)
      X = target;
      let view = viewAt(X);
      let k = 1;
      if (introOn) {
        if (introStart === t0 && now - t0 < 60) introStart = now; // start on the first real frame
        k = introK(now);
        const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
        // straight down for most of the way, tilting forward only as it comes in to the gate
        view = mixView(introView(phone), view, e, Math.pow(Math.max(0, (e - 0.45) / 0.55), 1.6));
        if (k > 0.66 && !named) { named = true; root.classList.add("pm-named"); }
        if (k >= 1) {
          introOn = false;
          root.classList.remove("pm-intro");
          unlock();
          evs.forEach((ev) => window.removeEventListener(ev, skip));
        }
      }
      const cam = camOf(view, Math.max(0.1, (stage.clientWidth || 1) / Math.max(1, stage.clientHeight || 1)));
      const key = `${view.x.toFixed(3)}|${view.z.toFixed(3)}|${view.dist.toFixed(3)}|${view.pitch.toFixed(4)}|${view.yaw.toFixed(4)}|${view.sx.toFixed(3)}|${view.sy.toFixed(3)}`;
      const still = key === lastKey;
      const f = project(cam, FOUNTAIN);
      const water = animate && f[2] > 0 && Math.abs(f[0]) < 1.25 && Math.abs(f[1]) < 1.35;
      // while moving, every frame, phones too (the cards move every frame: the garden keeps pace);
      // at rest only the water moves, at ≤ 30 frames a second
      if (garden && now - lastDraw >= (still ? 32 : 0)) {
        // a screen that can't keep up (frames slower than ~50 a second) draws fewer pixels
        if (!still && animate && lastDraw > 0) {
          slow.push(now - lastDraw);
          if (slow.length > 10) slow.shift();
          if (slow.length === 10 && [...slow].sort((p, q) => p - q)[5] > 20 && adapt > 0.6) { adapt = Math.max(0.6, adapt * 0.85); slow.length = 0; garden.size(scale()); }
        }
        if (!still || water || lastDraw < 0) garden.draw(cam, animate ? (now - t0) / 1000 : 4, still);
        lastDraw = now;
        lastKey = key;
      }
      if (visible && !document.hidden && (introOn || X !== target || water || !still)) raf = requestAnimationFrame(loop);
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(loop); };
    const onScroll = () => { target = stopAt(scrolled()); kick(); };

    garden?.size(scale());
    measure();
    target = stopAt(scrolled());
    X = target;
    redraw.current = () => { lastKey = ""; kick(); };
    kick();
    const ro = new ResizeObserver(() => { garden?.size(scale()); measure(); onScroll(); lastKey = ""; lastDraw = -1e9; kick(); });
    ro.observe(stage);
    ro.observe(root);
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) kick(); });
    io.observe(stage);
    const onVis = () => { if (!document.hidden) kick(); };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("scroll", onScroll, { passive: true, capture: true });
    // the cards' heights change as fonts load and the reply form opens
    const mo = new MutationObserver(() => { measure(); onScroll(); });
    mo.observe(root, { childList: true, subtree: true });
    return () => {
      snapper.dispose();
      redraw.current = () => {};
      cancelAnimationFrame(raf);
      ro.disconnect(); io.disconnect(); mo.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("scroll", onScroll, { capture: true });
      evs.forEach((e) => window.removeEventListener(e, skip));
      if (introOn) { unlock(); root.classList.remove("pm-intro"); root.classList.add("pm-named"); }
    };
  }, [refs.root, refs.stage, stops, animate, intro, wide, snap]);
}
