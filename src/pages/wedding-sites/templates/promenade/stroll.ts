import { useEffect, useRef, type RefObject } from "react";
import { camOf, createGarden, FOUNTAIN, project, type Garden, type View } from "./garden";

/**
 * Promenade's stroll: the garden on the sticky frame, the camera gliding down the promenade as
 * the guest scrolls, one stop a section ([data-pm-stop]).
 *  - Every card ([data-pm-dock]) pauses in the same place, its dock: high on the right of a wide
 *    frame, on the bottom edge of a phone's (a card too tall for that docks by its bottom edge,
 *    so it can be read to the end). The card is sticky there for its hold, then scrolls away;
 *    the dock is measured here and set as the card's `top` (as in Level Up).
 *  - The camera holds while a card is docked and glides in the gap to the next stop, easing in
 *    behind the scroll, so the garden moves with the page and settles a beat after it.
 *  - The opening (`intro`): high over the whole garden, turned across the frame, the camera comes
 *    down and round to the gate while the names appear. Any scroll, tap or key finishes it.
 *  - Kept light: ≤ 30 frames a second, ≤ 1.25 device pixels (less if the phone can't keep up),
 *    only while on screen and the tab is shown. The garden itself is redrawn only while the
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
      unlock();
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
    let target = 0, X = 0, prevT = 0, lastDraw = -1e9, raf = 0, visible = true, lastKey = "", adapt = 1;
    const slow: number[] = [];
    const scale = () => Math.min(window.devicePixelRatio || 1, 1.25) * adapt;
    const loop = (now: number) => {
      raf = 0;
      const dt = Math.min(0.1, prevT ? (now - prevT) / 1000 : 0.016);
      prevT = now;
      if (!animate) X = target;
      // the camera keeps up with the page (its glide is already eased): a light smoothing only
      else { const d = target - X; X = Math.abs(d) < 0.0004 ? target : X + d * (1 - Math.exp(-dt / 0.09)); }
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
          if (skipFrom < 0) unlock();
          evs.forEach((ev) => window.removeEventListener(ev, skip));
        }
      }
      const cam = camOf(view, Math.max(0.1, (stage.clientWidth || 1) / Math.max(1, stage.clientHeight || 1)));
      const key = `${view.x.toFixed(3)}|${view.z.toFixed(3)}|${view.dist.toFixed(3)}|${view.pitch.toFixed(4)}|${view.yaw.toFixed(4)}|${view.sx.toFixed(3)}|${view.sy.toFixed(3)}`;
      const still = key === lastKey;
      const f = project(cam, FOUNTAIN);
      const water = animate && f[2] > 0 && Math.abs(f[0]) < 1.25 && Math.abs(f[1]) < 1.35;
      if (garden && now - lastDraw >= 32) {
        // a phone that can't keep up draws fewer pixels
        if (!still && animate && lastDraw > 0) {
          slow.push(now - lastDraw);
          if (slow.length > 10) slow.shift();
          if (slow.length === 10 && [...slow].sort((p, q) => p - q)[5] > 55 && adapt > 0.6) { adapt = Math.max(0.6, adapt * 0.85); slow.length = 0; garden.size(scale()); }
        }
        if (!still || water || lastDraw < 0) garden.draw(cam, animate ? (now - t0) / 1000 : 4, still);
        lastDraw = now;
        lastKey = key;
      }
      if (visible && !document.hidden && (introOn || X !== target || water || !still)) raf = requestAnimationFrame(loop);
    };
    const kick = () => { if (!raf) { prevT = 0; raf = requestAnimationFrame(loop); } };
    const onScroll = () => { target = stopAt(scrolled()); kick(); };

    // ---- one swipe, one stop: every wheel or trackpad gesture, flick, or key moves the page to
    // the next rest in that direction, in one eased glide; a trackpad's momentum is let run out
    // before the next gesture counts; anything else (a scrollbar drag, a link) settles to the
    // nearest rest once it stops
    function stepper() {
      const here = () => -root!.getBoundingClientRect().top; // the page's scroll, from the root's top
      let anim = 0, animTo = -1, quietAt = 0, touchY = -1, touchX = 0, touchFrom = 0, touchT = 0, dragging = false, settleT = 0;
      const nowMs = () => performance.now();
      const glide = (rel: number) => {
        cancelAnimationFrame(anim);
        const y0 = window.scrollY, y1 = Math.max(0, y0 + (rel - here()));
        const d = Math.abs(y1 - y0);
        if (d < 2) { animTo = -1; return; }
        const D = Math.min(900, Math.max(520, 420 + d * 0.2)), t0 = nowMs();
        animTo = rel;
        const step = () => {
          const k = Math.min(1, (nowMs() - t0) / D), e = 1 - Math.pow(1 - k, 4); // moves at once, settles softly
          window.scrollTo(0, y0 + (y1 - y0) * e);
          if (k < 1) anim = requestAnimationFrame(step); else { anim = 0; animTo = -1; }
        };
        anim = requestAnimationFrame(step);
      };
      const nearest = (y: number) => rests.reduce((best, r) => (Math.abs(r - y) < Math.abs(best - y) ? r : best), rests[0] ?? 0);
      const next = (dir: number, from = animTo >= 0 ? animTo : here()) => {
        const r = dir > 0 ? rests.find((v) => v > from + 4) : [...rests].reverse().find((v) => v < from - 4);
        return r ?? (dir > 0 ? rests[rests.length - 1] : rests[0]);
      };
      const busy = () => introOn || anim !== 0 || nowMs() < quietAt;
      const inField = (t: EventTarget | null) => t instanceof Element && !!t.closest("input, textarea, select, [contenteditable], .pm-carousel__track");
      let acc = 0, fired = false, lastAbs = 0;
      const onWheel = (e: WheelEvent) => {
        if (e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY) || inField(e.target)) return;
        e.preventDefault();
        // a gesture lasts until the wheel goes quiet (a trackpad's momentum included); it moves
        // one stop once it has travelled far enough to mean it, and never more
        if (nowMs() > quietAt && !anim) { acc = 0; fired = false; }
        quietAt = nowMs() + 140;
        const dy = e.deltaMode === 1 ? e.deltaY * 33 : e.deltaY;
        // a fresh flick while the last one's momentum is still fading: a sudden jump in speed
        if (fired && !anim && Math.abs(dy) > 18 && Math.abs(dy) > lastAbs * 1.8) { acc = 0; fired = false; }
        lastAbs = Math.abs(dy);
        acc += dy;
        if (fired || introOn || anim || Math.abs(acc) < 6) return;
        fired = true;
        glide(next(Math.sign(acc)));
      };
      const onKey = (e: KeyboardEvent) => {
        if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || inField(e.target)) return;
        if (e.key === " " && e.target instanceof Element && e.target.closest("button, a, summary")) return;
        const dir = e.key === "PageDown" || e.key === "ArrowDown" || (e.key === " " && !e.shiftKey) ? 1 : e.key === "PageUp" || e.key === "ArrowUp" || (e.key === " " && e.shiftKey) ? -1 : e.key === "End" ? 9 : e.key === "Home" ? -9 : 0;
        if (!dir) return;
        e.preventDefault();
        if (introOn) return;
        glide(dir === 9 ? rests[rests.length - 1] : dir === -9 ? 0 : next(dir));
      };
      // touch: the page follows the finger, then goes on to the next rest (or back) on release
      const onStart = (e: TouchEvent) => {
        if (e.touches.length !== 1 || introOn) { touchY = -1; return; }
        cancelAnimationFrame(anim); anim = 0;
        touchY = e.touches[0].clientY; touchX = e.touches[0].clientX; touchFrom = window.scrollY; touchT = nowMs(); dragging = false;
        animTo = -1;
      };
      const onMove = (e: TouchEvent) => {
        if (touchY < 0 || e.touches.length !== 1) return;
        const dy = touchY - e.touches[0].clientY, dx = touchX - e.touches[0].clientX;
        if (!dragging) {
          if (Math.abs(dy) < 8 && Math.abs(dx) < 8) return;
          if (Math.abs(dx) > Math.abs(dy) || inField(e.target)) { touchY = -1; return; } // a sideways swipe (the photos) is its own
          dragging = true;
        }
        e.preventDefault();
        window.scrollTo(0, Math.max(0, touchFrom + dy));
      };
      const onEnd = () => {
        if (touchY < 0) return;
        const moved = window.scrollY - touchFrom, ms = nowMs() - touchT;
        touchY = -1;
        if (!dragging) return;
        dragging = false;
        const from = here() - moved; // where the drag began
        const fast = Math.abs(moved) / Math.max(ms, 1) > 0.25;
        glide(Math.abs(moved) > 36 || (fast && Math.abs(moved) > 12) ? next(Math.sign(moved), from) : nearest(here()));
      };
      // anything else that moves the page (a scrollbar, a link, find in page): settle once it stops
      const onAnyScroll = () => {
        clearTimeout(settleT);
        settleT = window.setTimeout(() => {
          if (busy() || dragging || touchY >= 0) return;
          const y = here(), r = nearest(y);
          if (Math.abs(r - y) > 2) glide(r);
        }, 260);
      };
      window.addEventListener("wheel", onWheel, { passive: false });
      window.addEventListener("keydown", onKey);
      window.addEventListener("touchstart", onStart, { passive: true });
      window.addEventListener("touchmove", onMove, { passive: false });
      window.addEventListener("touchend", onEnd);
      window.addEventListener("touchcancel", onEnd);
      window.addEventListener("scroll", onAnyScroll, { passive: true });
      return () => {
        cancelAnimationFrame(anim);
        clearTimeout(settleT);
        window.removeEventListener("wheel", onWheel);
        window.removeEventListener("keydown", onKey);
        window.removeEventListener("touchstart", onStart);
        window.removeEventListener("touchmove", onMove);
        window.removeEventListener("touchend", onEnd);
        window.removeEventListener("touchcancel", onEnd);
        window.removeEventListener("scroll", onAnyScroll);
      };
    }

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
    const unsnap = snap ? stepper() : () => {};
    return () => {
      unsnap();
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
