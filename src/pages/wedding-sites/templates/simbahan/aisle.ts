import { useEffect, type RefObject } from "react";
import { camOf, createChurch, type View } from "./church";
import { createStopSnap } from "../shared/stopSnap";

/**
 * Simbahan's walk: the church on the sticky frame, the guest walking down the aisle as they
 * scroll, one stop a section ([data-sb-stop]).
 *  - Every card ([data-sb-dock]) pauses in the same place, its dock: high on the right of a wide
 *    frame, on the bottom edge of a phone's (a card too tall for that docks by its bottom edge,
 *    so it can be read to the end). The card is sticky there for its hold, then scrolls away; the
 *    dock is measured here and set as the card's `top` (as in Level Up).
 *  - The camera stands still while a card is docked and walks on in the gap to the next stop,
 *    following the page with a light smoothing only.
 *  - One swipe, one stop (shared/stopSnap.ts) on the live page and the design preview.
 *  - The opening (`intro`): outside, before the closed doors in the late sun; the doors swing
 *    open into the light, the names appear, and the camera steps inside to the head of the
 *    aisle. Any scroll, tap or key finishes it.
 *  - Kept light: ≤ 30 frames a second, ≤ 1.25 device pixels (less if the phone can't keep up),
 *    the church drawn at a fraction of the size while moving and in full once it stops; only
 *    the flames and the dust after that. Only while on screen and the tab is shown.
 *  - `animate` false (builder, gallery card, reduced motion): the doors open, no flicker, a still
 *    frame redrawn on scroll.
 */

export type StopKey = "door" | "story" | "day" | "sponsors" | "entourage" | "wear" | "details" | "rsvp";
/** Where each stop is along the aisle (metres from the doors). */
export const PLACE_Z: Record<StopKey, number> = { door: 0.9, story: 7.2, day: 11.6, sponsors: 15.8, entourage: 20.0, wear: 24.0, details: 28.0, rsvp: 32.0 };

const DEG = Math.PI / 180;
// a small turn at each stop, so the walk looks round it: toward the flowers, up to the light
const LOOK: Record<StopKey, [number, number]> = { door: [0, 3], story: [-3, 2], day: [2, 6], sponsors: [-4, 3], entourage: [3, 4], wear: [-3, 3], details: [2, 5], rsvp: [0, 8.5] };
export function viewOf(key: StopKey, phone: boolean, wide = false): View {
  const z = PLACE_Z[key], door = key === "door";
  const [yaw, pitch] = LOOK[key];
  if (wide) return { x: 0, y: 1.7, z: -2.6, yaw: 0, pitch: 6 * DEG, fov: 58 * DEG, sx: 0, sy: 0 };
  return phone
    ? { x: 0, y: 1.62, z: door ? -0.6 : z, yaw: yaw * DEG * 0.5, pitch: (door ? 9 : pitch + 5) * DEG, fov: 66 * DEG, sx: 0, sy: door ? 0 : 0.36 }
    : { x: 0, y: 1.64, z, yaw: yaw * DEG, pitch: pitch * DEG, fov: (door ? 46 : 42) * DEG, sx: door ? 0 : -0.3, sy: 0 };
}
const outsideView = (phone: boolean): View =>
  phone ? { x: 0, y: 1.65, z: -15.5, yaw: 0, pitch: 19 * DEG, fov: 62 * DEG, sx: 0, sy: 0 } : { x: 0, y: 1.7, z: -14, yaw: 0, pitch: 17 * DEG, fov: 46 * DEG, sx: 0, sy: 0 };
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
function mixView(a: View, b: View, t: number): View {
  return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), z: lerp(a.z, b.z, t), yaw: lerp(a.yaw, b.yaw, t), pitch: lerp(a.pitch, b.pitch, t), fov: lerp(a.fov, b.fov, t), sx: lerp(a.sx, b.sx, t), sy: lerp(a.sy, b.sy, t) };
}
const smooth = (k: number) => k * k * (3 - 2 * k);
const easeInOut = (k: number) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
// the opening's beats (ms): a breath before the doors; the doors; the names; the step inside
const DOOR_AT = 1000, DOOR_MS = 3200, NAMES_AT = 2800, WALK_AT = 4000, WALK_MS = 3800;
const INTRO_MS = WALK_AT + WALK_MS;
/** How bright the picture is set: for the shade outside, then the church's own light. */
const exposureAt = (z: number) => lerp(0.6, 1.0, smooth(Math.min(1, Math.max(0, (z + 6) / 6.5))));

export function useAisle(
  refs: { root: RefObject<HTMLElement | null>; stage: RefObject<HTMLElement | null>; gl: RefObject<HTMLCanvasElement | null> },
  { stops, animate, intro, wide = false, snap = false }: { stops: string; animate: boolean; intro: boolean; wide?: boolean; snap?: boolean },
) {
  useEffect(() => {
    const root = refs.root.current, stage = refs.stage.current, cv = refs.gl.current;
    if (!root || !stage || !cv) return;
    const church = createChurch(cv);
    if (!church) { cv.style.display = "none"; root.classList.add("sb-nogl"); }
    const keys = stops.split(",") as StopKey[];

    // ---- the stops: each one's hold, the scroll range [a, b] while its card is docked
    let holds: { a: number; b: number; x?: number }[] = [{ a: 0, b: 0 }], H = 1, phone = false;
    const stepper = createStopSnap(root, snap, { gentle: true });
    const scrolled = () => stage.getBoundingClientRect().top - root.getBoundingClientRect().top;
    const measure = () => {
      const rt = root.getBoundingClientRect();
      H = Math.max(1, stage.getBoundingClientRect().height);
      const max = Math.max(0, rt.height - H);
      phone = rt.width <= 700;
      const T = Math.round(Math.min(104, Math.max(44, H * 0.1)));
      const dockTop = (h: number) => Math.round(phone ? H - h - 12 : h > H - T - 24 ? H - h - 24 : T);
      const all = Array.from(root.querySelectorAll<HTMLElement>("[data-sb-stop]"));
      // the last card must be able to reach its dock before the page ends, however short it is
      const lastWrap = all[all.length - 1]?.querySelector<HTMLElement>(".sb-dock"), lastCard = lastWrap?.querySelector<HTMLElement>("[data-sb-dock]");
      const lastHold = lastWrap?.querySelector<HTMLElement>(".sb-hold");
      if (lastCard && lastHold) {
        const h = lastCard.offsetHeight, top = dockTop(h);
        const want = `${Math.round(Math.max(H * 0.16, H - top - h + 2))}px`;
        if (lastHold.style.height !== want) lastHold.style.height = want;
      }
      holds = all.map((s) => {
        const wrap = s.querySelector<HTMLElement>(".sb-dock"), card = wrap?.querySelector<HTMLElement>("[data-sb-dock]");
        if (!wrap || !card) { const r = s.getBoundingClientRect(); const y = Math.min(max, Math.max(0, r.top - rt.top + Math.min(r.height, H) / 2 - H / 2)); return { a: y, b: y }; }
        const h = card.offsetHeight, top = dockTop(h);
        card.style.top = `${top}px`;
        const w = wrap.getBoundingClientRect(), y0 = w.top - rt.top - top;
        return { a: Math.min(max, Math.max(0, y0)), b: Math.min(max, Math.max(0, y0 + w.height - h)), x: top < 0 ? -top : 0 };
      });
      if (!holds.length) holds = [{ a: 0, b: 0 }];
      stepper.update(holds.map((h) => ({ from: h.a - (h.x ?? 0), to: h.x ? h.b : undefined })), H);
    };
    // the camera's place along the stops for a scroll position: still while a card is docked,
    // walking (eased) through the gap to the next, arriving a little before that card docks
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
      const a = viewOf(keys[i] ?? "door", phone, wide);
      return i >= n || f === 0 ? a : mixView(a, viewOf(keys[i + 1], phone), f);
    };

    // ---- the opening
    let introOn = intro && !!church;
    const t0 = performance.now();
    let introStart = t0, skipFrom = -1, skipAt = 0, named = false;
    const html = document.documentElement, prevOverflow = html.style.overflow;
    const unlock = () => { html.style.overflow = prevOverflow; };
    const introK = (now: number) => {
      const ms = now - introStart;
      if (skipFrom >= 0) return Math.min(INTRO_MS, skipFrom + (INTRO_MS - skipFrom) * Math.min(1, (now - skipAt) / 1100));
      return Math.min(INTRO_MS, ms);
    };
    const skip = () => {
      if (!introOn || skipFrom >= 0) return;
      skipFrom = introK(performance.now());
      skipAt = performance.now();
      // the page stays held until the doors finish: the swipe that skipped (its momentum) is used up
      kick();
    };
    const evs = ["wheel", "touchstart", "keydown", "pointerdown"] as const;
    if (introOn) {
      html.style.overflow = "hidden";
      root.classList.add("sb-intro");
      root.classList.remove("sb-named");
      evs.forEach((e) => window.addEventListener(e, skip, { passive: true }));
    } else root.classList.add("sb-named");

    // ---- the loop
    let target = 0, X = 0, prevT = 0, lastDraw = -1e9, raf = 0, visible = true, lastKey = "", adapt = 1, settled = 0;
    const slow: number[] = [];
    const scale = () => Math.min(window.devicePixelRatio || 1, 1.25) * adapt;
    const loop = (now: number) => {
      raf = 0;
      const dt = Math.min(0.1, prevT ? (now - prevT) / 1000 : 0.016);
      prevT = now;
      if (!animate) X = target;
      // the camera keeps up with the page (its glide is already eased): a light smoothing only
      else { const d = target - X; X = Math.abs(d) < 0.0004 ? target : X + d * (1 - Math.exp(-dt / 0.09)); }
      let view = viewAt(X), door = 1;
      if (introOn) {
        if (introStart === t0 && now - t0 < 60) introStart = now; // start on the first real frame
        const ms = introK(now);
        door = easeInOut(Math.min(1, Math.max(0, (ms - DOOR_AT) / DOOR_MS)));
        const w = easeInOut(Math.min(1, Math.max(0, (ms - WALK_AT) / WALK_MS)));
        // a slow drift toward the doors while they open, then the steps inside
        const out = outsideView(phone), near = { ...out, z: out.z + 1.6 * smooth(Math.min(1, ms / (WALK_AT + 200))) };
        view = mixView(near, view, w);
        if (ms >= NAMES_AT && !named) { named = true; root.classList.add("sb-named"); }
        if (ms >= INTRO_MS) {
          introOn = false;
          root.classList.remove("sb-intro");
          unlock();
          evs.forEach((ev) => window.removeEventListener(ev, skip));
        }
      }
      const cam = camOf(view, Math.max(0.1, (stage.clientWidth || 1) / Math.max(1, stage.clientHeight || 1)));
      const key = `${view.x.toFixed(3)}|${view.y.toFixed(3)}|${view.z.toFixed(3)}|${view.pitch.toFixed(4)}|${view.yaw.toFixed(4)}|${view.fov.toFixed(4)}|${view.sx.toFixed(3)}|${view.sy.toFixed(3)}|${door.toFixed(4)}`;
      const still = key === lastKey;
      settled = still ? settled + 1 : 0;
      // once the camera rests, only the flames and the dust move: a gentler pace for those
      // while walking, every frame on a desktop (the cards move every frame: the church keeps pace)
      const gap = still && settled > 2 ? 48 : phone ? 32 : 15;
      if (church && now - lastDraw >= gap) {
        // a phone that can't keep up draws fewer pixels
        if (!still && animate && lastDraw > 0) {
          slow.push(now - lastDraw);
          if (slow.length > 10) slow.shift();
          if (slow.length === 10 && [...slow].sort((p, q) => p - q)[5] > 60 && adapt > 0.55) { adapt = Math.max(0.55, adapt * 0.85); slow.length = 0; church.size(scale()); }
        }
        // a hand-held camera at rest: the slowest drift, a few pixels at most (moved in the light
        // pass, so the church itself isn't redrawn for it)
        const ts = (now - t0) / 1000, hold = animate && !introOn ? 1 : 0;
        const sway: [number, number, number] = [hold * (Math.sin(ts * 0.37) * 0.0011 + Math.sin(ts * 0.83 + 1.3) * 0.0004), hold * (Math.sin(ts * 0.29 + 2.1) * 0.0009 + Math.sin(ts * 0.61) * 0.0003), 1.012];
        church.draw(cam, { time: animate ? ts : 3, door, exposure: exposureAt(view.z), outside: view.z < -0.2, still, frac: still && settled > 14 ? 1 : 0.62, live: animate, focus: view.z < -0.2 ? 13 : 9, sway });
        lastDraw = now;
        lastKey = key;
      }
      if (visible && !document.hidden && (introOn || X !== target || animate || !still)) raf = requestAnimationFrame(loop);
    };
    const kick = () => { if (!raf) { prevT = 0; raf = requestAnimationFrame(loop); } };
    const onScroll = () => { target = stopAt(scrolled()); kick(); };

    church?.size(scale());
    measure();
    target = stopAt(scrolled());
    X = target;
    kick();
    const ro = new ResizeObserver(() => { church?.size(scale()); measure(); onScroll(); lastKey = ""; lastDraw = -1e9; kick(); });
    ro.observe(stage);
    ro.observe(root);
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) kick(); });
    io.observe(stage);
    const onVis = () => { if (!document.hidden) kick(); };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("scroll", onScroll, { passive: true, capture: true });
    // the cards' heights change as fonts load and the reply form opens
    let mraf = 0;
    const mo = new MutationObserver(() => { if (!mraf) mraf = requestAnimationFrame(() => { mraf = 0; measure(); onScroll(); }); });
    mo.observe(root, { childList: true, subtree: true });
    return () => {
      stepper.dispose();
      cancelAnimationFrame(raf);
      cancelAnimationFrame(mraf);
      ro.disconnect(); io.disconnect(); mo.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("scroll", onScroll, { capture: true });
      evs.forEach((e) => window.removeEventListener(e, skip));
      if (introOn) { unlock(); root.classList.remove("sb-intro"); root.classList.add("sb-named"); }
      church?.dispose();
    };
  }, [refs.root, refs.stage, refs.gl, stops, animate, intro, wide, snap]);
}
