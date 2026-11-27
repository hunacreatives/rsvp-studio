import { useEffect, type RefObject } from "react";
import { createPainted, openingFrame, NAMES_FRAME, OPEN_N, SEG, STOP_AT, type FrameSet } from "./painted";
import { createStopSnap } from "../shared/stopSnap";

/**
 * Simbahan's walk: the painted church on the sticky frame (painted.ts: watercolour frames rendered
 * in Blender), the guest walking down the aisle as they scroll, one stop a section ([data-sb-stop]).
 *  - Every card ([data-sb-dock]) pauses in the same place, its dock: high on the right of a wide
 *    frame, on the bottom edge of a phone's (a card too tall for that docks by its bottom edge,
 *    so it can be read to the end). The card is sticky there for its hold, then scrolls away; the
 *    dock is measured here and set as the card's `top` (as in Level Up).
 *  - The camera stands still while a card is docked and walks on in the gap to the next stop,
 *    exactly where the page is each frame (the church and the cards move as one). A hidden
 *    section's stop is walked past.
 *  - One swipe, one stop (shared/stopSnap.ts) on the live page and the design preview.
 *  - The opening (`intro`): the plaza in the late sun, a breath, then the walk up the steps; the
 *    doors swing open into the light, the names appear once they're through, and the camera steps
 *    inside to the head of the aisle. It waits for its first frames; any scroll, tap or key
 *    finishes it.
 *  - Kept light: frames at a moving size while walking, the sharp frame once the camera has
 *    stopped (on a phone, only once the page has rested a moment and no finger is down); then a
 *    slow hand-held drift for a few seconds, and nothing after that until the page moves again.
 *    Only while on screen and the tab is shown.
 *  - `animate` false (builder, gallery card, reduced motion): the doors open, a still frame
 *    redrawn on scroll.
 */

export type StopKey = "door" | "story" | "day" | "sponsors" | "entourage" | "wear" | "details" | "rsvp";

const easeInOut = (k: number) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
// the opening (ms): a breath on the plaza, then the walk through the doors to the head of the aisle
const BREATH = 1000, WALK_MS = 9500, INTRO_MS = BREATH + WALK_MS;
// the opening waits for this many of its first frames (or this long, on a very slow connection)
const READY_FRAMES = 40, READY_WAIT = 8000;
// when each page's opening began (or that it's over: -1), so the setup running again (React does
// it twice in development; a change to the stops does it too) carries on with the same opening
// rather than showing the names, hiding them and starting over
const opened = new WeakMap<HTMLElement, number>();

export function useAisle(
  refs: { root: RefObject<HTMLElement | null>; stage: RefObject<HTMLElement | null>; gl: RefObject<HTMLCanvasElement | null> },
  { stops, animate, intro, wide = false, snap = false }: { stops: string; animate: boolean; intro: boolean; wide?: boolean; snap?: boolean },
) {
  useEffect(() => {
    const root = refs.root.current, stage = refs.stage.current, cv = refs.gl.current;
    if (!root || !stage || !cv) return;
    const church = createPainted(cv);
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
    // where along the aisle frames (in stops) the camera is, for a place along this page's stops
    const aisleAt = (x: number) => {
      const n = keys.length - 1, i = Math.max(0, Math.min(n, Math.floor(x))), f = Math.min(1, Math.max(0, x - i));
      const a = STOP_AT[keys[i] ?? "door"] ?? 0;
      return i >= n || f === 0 ? a : a + ((STOP_AT[keys[i + 1]] ?? a) - a) * f;
    };
    const setOf = (): FrameSet => (wide ? "wide" : church ? church.setFor(stage.clientWidth || 1, stage.clientHeight || 1) : "wide");

    // ---- the opening
    const begun = opened.get(root);
    let introOn = intro && !!church && begun !== -1;
    const t0 = performance.now();
    let introStart = begun ?? t0, skipFrom = -1, skipAt = 0, named = begun !== undefined && root.classList.contains("sb-named");
    const html = document.documentElement, prevOverflow = html.style.overflow;
    const unlock = () => { html.style.overflow = prevOverflow; };
    const introK = (now: number) => {
      const ms = now - introStart;
      if (skipFrom >= 0) return Math.min(INTRO_MS, skipFrom + (INTRO_MS - skipFrom) * Math.min(1, (now - skipAt) / 1100));
      return Math.min(INTRO_MS, ms);
    };
    const skip = () => {
      if (!introOn || skipFrom >= 0) return;
      skipFrom = Math.max(introK(performance.now()), BREATH);
      skipAt = performance.now();
      // the page stays held until the doors finish: the swipe that skipped (its momentum) is used up
      kick();
    };
    const evs = ["wheel", "touchstart", "keydown", "pointerdown"] as const;
    if (introOn) {
      html.style.overflow = "hidden";
      if (window.scrollY > 0) window.scrollTo(0, 0);
      root.classList.add("sb-intro");
      if (!named) root.classList.remove("sb-named");
      evs.forEach((e) => window.addEventListener(e, skip, { passive: true }));
    } else root.classList.add("sb-named");

    // ---- the loop
    let target = 0, X = 0, XV = 0, lastStep = performance.now(), lastFade = "", raf = 0, visible = true, lastKey = "", settled = 0, lastSet: FrameSet | "" = "", lastNear = -1;
    // the camera's walk: a critically damped follow, about two seconds from one stop to the next
    const WALK = 2.6;
    // the last time the page or a finger moved (the sharp frame and the drift wait on it)
    let active = performance.now(), touching = false, dirty = true;
    const IDLE_MS = 4000;
    const scale = () => Math.min(window.devicePixelRatio || 1, 2);
    const loop = (now: number) => {
      raf = 0;
      // the opening looks straight down the aisle, wherever the page happens to start (Safari can
      // restore a page part-way down). After it, the camera walks to wherever the page is at its
      // own unhurried pace, so the church between the stops can be seen; each card comes up as the
      // camera arrives at it
      if (introOn || !animate) { X = introOn ? 0 : target; XV = 0; }
      else {
        const dt = Math.min(0.05, Math.max(0.001, (now - lastStep) / 1000)), d = X - target, e = Math.exp(-WALK * dt), k = XV + WALK * d;
        X = target + (d + k * dt) * e;
        XV = (XV - k * WALK * dt) * e;
        if (Math.abs(X - target) < 0.0015 && Math.abs(XV) < 0.01) { X = target; XV = 0; }
      }
      lastStep = now;
      const arrive = 1 - Math.min(1, Math.max(0, (Math.abs(target - X) - 0.06) / 0.3));
      const fade = arrive.toFixed(2);
      if (fade !== lastFade) { root.style.setProperty("--sb-arrive", fade); lastFade = fade; }

      const set = setOf();
      let src: "o" | "a" = "a", f = wide ? 0 : aisleAt(X) * SEG;
      if (introOn && church) {
        if (begun === undefined && introStart === t0 && now - t0 < 60) introStart = now; // start on the first real frame
        // hold on the plaza until the first frames are in (a slow connection shouldn't skip the walk up)
        if (skipFrom < 0 && church.openingReady(set) < READY_FRAMES && now - t0 < READY_WAIT) introStart = Math.max(introStart, now - BREATH * 0.5);
        if (opened.get(root) !== introStart) opened.set(root, introStart);
        const ms = introK(now);
        src = "o";
        f = ms <= BREATH ? 0 : openingFrame(easeInOut((ms - BREATH) / WALK_MS));
        if (f >= NAMES_FRAME && !named) { named = true; root.classList.add("sb-named"); }
        if (ms >= INTRO_MS) {
          introOn = false;
          opened.set(root, -1);
          if (!named) { named = true; root.classList.add("sb-named"); }
          // (the opening's class stays: the names are still coming up; once they're in it changes nothing)
          unlock();
          evs.forEach((ev) => window.removeEventListener(ev, skip));
          src = "a"; f = 0;
        }
        if (src === "o" && f >= OPEN_N - 1) f = OPEN_N - 1;
      }
      // ask for this set's frames: the opening, or the stop the page is at
      const near = Math.round(f / SEG);
      if (church && (set !== lastSet || (src === "a" && near !== lastNear))) {
        church.want(set, src, src === "a" ? f / SEG : 0);
        lastSet = set; lastNear = src === "a" ? near : -1;
      }
      const key = `${set}|${src}|${f.toFixed(3)}`;
      const still = key === lastKey && !introOn;
      settled = still ? settled + 1 : 0;
      if (!still) active = now;
      const tall = set === "tall";
      // the sharp frame once the camera rests: on a computer a quarter second on; on a phone once
      // the page has rested 0.7s with no finger down
      const rest = !animate || (still && (tall ? !touching && now - active > 700 : settled > 14));
      const idle = animate && !introOn && now - active < IDLE_MS;
      if (church && (dirty || !still || idle || rest)) {
        // a hand-held camera at rest: the slowest drift, a few pixels at most
        const ts = (now - t0) / 1000, hold = animate && !introOn ? 1 : 0;
        const sway: [number, number] = [hold * (Math.sin(ts * 0.37) * 0.0011 + Math.sin(ts * 0.83 + 1.3) * 0.0004), hold * (Math.sin(ts * 0.29 + 2.1) * 0.0009 + Math.sin(ts * 0.61) * 0.0003)];
        church.draw(set, src, f, { rest, sway });
        dirty = false;
      }
      lastKey = key;
      if (visible && !document.hidden && (introOn || X !== target || idle || !still || (!rest && animate))) raf = requestAnimationFrame(loop);
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(loop); };
    const wake = () => { active = performance.now(); kick(); };
    const onScroll = () => { target = stopAt(scrolled()); wake(); };
    const onTouch = (e: TouchEvent) => { touching = e.touches.length > 0; wake(); };
    church?.onLoad(() => { dirty = true; kick(); });

    church?.size(scale());
    measure();
    target = stopAt(scrolled());
    X = target;
    kick();
    const ro = new ResizeObserver(() => { church?.size(scale()); measure(); onScroll(); lastKey = ""; dirty = true; kick(); });
    ro.observe(stage);
    ro.observe(root);
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) kick(); });
    io.observe(stage);
    const onVis = () => { if (!document.hidden) { dirty = true; kick(); } };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("scroll", onScroll, { passive: true, capture: true });
    for (const ev of ["touchstart", "touchend", "touchcancel"] as const) window.addEventListener(ev, onTouch, { passive: true });
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
      for (const ev of ["touchstart", "touchend", "touchcancel"] as const) window.removeEventListener(ev, onTouch);
      evs.forEach((e) => window.removeEventListener(e, skip));
      // the opening's classes stay as they are: if this runs again it carries on from here
      if (introOn) unlock();
      church?.dispose();
    };
  }, [refs.root, refs.stage, refs.gl, stops, animate, intro, wide, snap]);
}
