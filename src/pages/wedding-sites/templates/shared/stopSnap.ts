import { useEffect, type RefObject } from "react";

/**
 * One swipe, one stop: the scroll designs (Level Up, Safari, Pixel Quest, Summit, The Blue,
 * Letterpress, Simbahan; Promenade has its own copy in stroll.ts) rest only at their stops, never
 * halfway between two.
 *  - The page is moved by one spring: each gesture sets where it's going (the next stop that way)
 *    and the page keeps its speed from one moment to the next, so it never stops and starts again,
 *    never jumps, and a second gesture on top of a glide just carries it on to the stop after.
 *  - Wheel and trackpad: the first sign of a gesture sets the page moving at once, toward the next
 *    stop; the rest of that gesture (a trackpad's momentum) is used up. A fresh flick, or a new
 *    gesture after a pause, goes one stop further.
 *  - Touch: the page follows the finger; on release it goes on to the next stop (or back), at the
 *    finger's own speed to start with.
 *  - Keys step a stop. Anything else that moves the page (a scrollbar, a link, find in page)
 *    settles to the nearest stop once it stops. Sideways swipes and form fields are left alone.
 *  - A stop taller than the screen (an open reply form on a phone) rests at its top and every
 *    three quarters of a screen down to its end, so it can be read through.
 * Positions are the design's own scroll offsets: how far the page has scrolled past the root's top.
 * Only on the live page and design preview with motion (the engines pass `enabled` = their
 * `animate`): never in the builder, the gallery card or with reduced motion.
 * `gentle` (the wedding designs): a softer spring, for a page that should move like a card turned
 * by hand, not a slide deck.
 */

export type SnapSpan = { from: number; to?: number };

export function createStopSnap(root: HTMLElement, enabled: boolean, { gentle = false }: { gentle?: boolean } = {}) {
  if (!enabled || typeof window === "undefined") return { update: () => {}, dispose: () => {} };
  let rests: number[] = [0];
  const here = () => -root.getBoundingClientRect().top;
  const nowMs = () => performance.now();
  const maxY = () => Math.max(0, document.documentElement.scrollHeight - window.innerHeight);

  // ---- the spring: critically damped (no overshoot), solved exactly each frame
  const W = gentle ? 5.6 : 8.5; // its stiffness: how quickly it closes on the stop
  let anim = 0, goal = -1, y = 0, v = 0, lastT = 0, origin = 0; // goal and origin: page offsets
  const toPage = (rel: number) => Math.max(0, Math.min(maxY(), window.scrollY + (rel - here())));
  const stop = () => { cancelAnimationFrame(anim); anim = 0; goal = -1; v = 0; };
  const step = (t: number) => {
    const dt = Math.min(0.05, Math.max(0.001, (t - lastT) / 1000));
    lastT = t;
    const d = y - goal, e = Math.exp(-W * dt), k = v + W * d;
    y = goal + (d + k * dt) * e;
    v = (v - k * W * dt) * e;
    if (Math.abs(y - goal) < 0.4 && Math.abs(v) < 8) { window.scrollTo(0, goal); anim = 0; goal = -1; v = 0; return; }
    window.scrollTo(0, y);
    anim = requestAnimationFrame(step);
  };
  /** Glide to the stop at `rel` (a design offset). `speed`: the page's speed to start with, in
   *  px/s (a finger's); otherwise a gesture starts it at a lively share of the spring's own pace. */
  const glide = (rel: number, speed?: number) => {
    const to = toPage(rel);
    if (!anim) {
      y = window.scrollY;
      if (Math.abs(to - y) < 1) { goal = -1; return; }
      v = speed ?? (to - y) * W * 0.55;
      lastT = nowMs();
      anim = requestAnimationFrame(step);
    } else if (speed !== undefined) v = speed;
    goal = to;
    origin = rel;
  };
  const target = () => (anim && goal >= 0 ? origin : here()); // where the page is going (design offset)
  const nearest = (yy: number) => rests.reduce((best, r) => (Math.abs(r - yy) < Math.abs(best - yy) ? r : best), rests[0] ?? 0);
  const next = (dir: number, at = target()) => {
    // counted from the stop the page is on, when it's all but on one (a page that loads at the
    // very top while its first stop sits a little lower is on that stop: one swipe moves on)
    const n = nearest(at), from = Math.abs(n - at) < 80 ? n : at;
    const r = dir > 0 ? rests.find((x) => x > from + 4) : [...rests].reverse().find((x) => x < from - 4);
    return r ?? (dir > 0 ? rests[rests.length - 1] : rests[0]);
  };
  // past the last stop (the credit line under the reply): scroll normally
  const pastEnd = () => here() > (rests[rests.length - 1] ?? 0) + 4;
  const inField = (t: EventTarget | null) => t instanceof Element && !!t.closest("input, textarea, select, [contenteditable], [data-snap-free]");
  const locked = () => document.documentElement.style.overflow === "hidden" || document.body.style.overflow === "hidden"; // an opening holding the page

  // ---- wheel and trackpad
  let quietAt = 0, acc = 0, fired = false, firedAt = 0, lastAbs = 0, spent = false;
  const onWheel = (e: WheelEvent) => {
    // a gesture that began while an opening held the page (the swipe that opened the envelope) is
    // used up: its momentum, still running once the page is free, doesn't move it
    if (locked()) { spent = true; quietAt = nowMs() + 140; lastAbs = Math.abs(e.deltaY); return; }
    if (e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY) || inField(e.target)) return;
    if (pastEnd() && e.deltaY > 0 && !anim) return;
    const dy = e.deltaMode === 1 ? e.deltaY * 33 : e.deltaMode === 2 ? e.deltaY * window.innerHeight : e.deltaY, ad = Math.abs(dy);
    const now = nowMs();
    // a fresh flick while the last one's momentum is still running: a sudden jump in speed, a
    // moment after that one set off (its own build-up in the first few events doesn't count)
    const fresh = ad > 18 && ad > lastAbs * 1.8 && now - firedAt > 240;
    if (spent) { if (now <= quietAt && !fresh) { quietAt = now + 140; lastAbs = ad; e.preventDefault(); return; } spent = false; }
    if (now > quietAt || fresh) { acc = 0; fired = false; }
    quietAt = now + 140;
    lastAbs = ad;
    e.preventDefault();
    if (fired) return; // the rest of this gesture is used up
    acc += dy;
    // enough to mean it (a wheel click at once; a brush of the trackpad isn't a swipe)
    if (Math.abs(acc) < 28) return;
    fired = true;
    firedAt = now;
    glide(next(Math.sign(acc)));
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || inField(e.target) || locked()) return;
    if (e.key === " " && e.target instanceof Element && e.target.closest("button, a, summary")) return;
    const dir = e.key === "PageDown" || e.key === "ArrowDown" || (e.key === " " && !e.shiftKey) ? 1 : e.key === "PageUp" || e.key === "ArrowUp" || (e.key === " " && e.shiftKey) ? -1 : e.key === "End" ? 9 : e.key === "Home" ? -9 : 0;
    if (!dir) return;
    e.preventDefault();
    glide(dir === 9 ? rests[rests.length - 1] : dir === -9 ? 0 : next(dir));
  };

  // ---- touch: the finger, then the spring at the finger's speed
  let touchY = -1, touchX = 0, touchFrom = 0, dragging = false, settleT = 0, touchCatch = -1;
  let track: [number, number][] = []; // the finger's last moments: time, page offset
  const onStart = (e: TouchEvent) => {
    if (e.touches.length !== 1 || locked()) { touchY = -1; return; }
    const was = anim ? origin : -1, wasV = v;
    stop();
    touchY = e.touches[0].clientY; touchX = e.touches[0].clientX; touchFrom = window.scrollY; dragging = false;
    track = [[nowMs(), touchFrom]];
    // a finger that catches a glide and lets go without moving: it carries on where it was going
    touchCatch = was >= 0 && Math.abs(wasV) > 60 ? was : -1;
  };
  const onMove = (e: TouchEvent) => {
    if (touchY < 0 || e.touches.length !== 1) return;
    const dy = touchY - e.touches[0].clientY, dx = touchX - e.touches[0].clientX;
    if (!dragging) {
      if (Math.abs(dy) < 8 && Math.abs(dx) < 8) return;
      if (Math.abs(dx) > Math.abs(dy) || inField(e.target) || (pastEnd() && dy > 0)) { touchY = -1; return; }
      dragging = true;
    }
    e.preventDefault();
    const to = Math.max(0, Math.min(maxY(), touchFrom + dy));
    window.scrollTo(0, to);
    const t = nowMs();
    track.push([t, to]);
    while (track.length > 2 && t - track[0][0] > 90) track.shift();
  };
  const onEnd = () => {
    if (touchY < 0) return;
    touchY = -1;
    if (!dragging) { if (touchCatch >= 0) glide(touchCatch); touchCatch = -1; return; }
    dragging = false;
    touchCatch = -1;
    const moved = window.scrollY - touchFrom;
    const [t0, y0] = track[0], [t1, y1] = track[track.length - 1];
    const speed = t1 - t0 > 8 ? ((y1 - y0) / (t1 - t0)) * 1000 : 0; // px/s at release
    const from = here() - moved;
    const go = Math.abs(moved) > 36 || (Math.abs(speed) > 250 && Math.abs(moved) > 12);
    const to = go ? next(Math.sign(moved), from) : nearest(from);
    // keep the finger's speed only if it's heading for the stop; a flick back toward where it
    // started is the spring's to bring round
    glide(to, Math.sign(speed) === Math.sign(toPage(to) - window.scrollY) ? speed : 0);
  };
  const onAnyScroll = () => {
    clearTimeout(settleT);
    settleT = window.setTimeout(() => {
      if (anim || nowMs() < quietAt || dragging || touchY >= 0 || locked() || pastEnd()) return;
      const yy = here(), r = nearest(yy);
      if (Math.abs(r - yy) > 2) glide(r, 0);
    }, 260);
  };
  window.addEventListener("wheel", onWheel, { passive: false });
  window.addEventListener("keydown", onKey);
  window.addEventListener("touchstart", onStart, { passive: true });
  window.addEventListener("touchmove", onMove, { passive: false });
  window.addEventListener("touchend", onEnd);
  window.addEventListener("touchcancel", onEnd);
  window.addEventListener("scroll", onAnyScroll, { passive: true });

  return {
    /** The stops' resting positions (and the spans of stops taller than the screen). */
    update(spans: SnapSpan[], screen: number) {
      const H = Math.max(1, screen);
      const list: number[] = [];
      for (const s of spans) {
        const from = Math.max(0, s.from), to = Math.max(from, s.to ?? s.from);
        list.push(from);
        for (let y = from + H * 0.75; y < to - 8; y += H * 0.75) list.push(y);
        if (to > from + 8) list.push(to);
      }
      rests = list.map(Math.round).sort((a, b) => a - b).filter((v, i, a) => i === 0 || v - a[i - 1] > 4);
      if (!rests.length) rests = [0];
      root.dataset.snapRests = rests.join(",");
    },
    dispose() {
      cancelAnimationFrame(anim);
      clearTimeout(settleT);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onEnd);
      window.removeEventListener("scroll", onAnyScroll);
    },
  };
}

/**
 * Resting positions for designs whose sections flow (Summit's camps, The Blue's depths): each
 * element centred on the screen, or, when it's taller than the screen, a free zone from its top
 * to its bottom.
 */
export function centredSpans(root: HTMLElement, els: HTMLElement[], screen: number): SnapSpan[] {
  const rt = root.getBoundingClientRect();
  const max = Math.max(0, rt.height - screen);
  const clamp = (v: number) => Math.min(max, Math.max(0, v));
  return els.map((el) => {
    const r = el.getBoundingClientRect(), top = r.top - rt.top;
    if (r.height > screen * 0.92) return { from: clamp(top - screen * 0.04), to: clamp(top + r.height - screen * 0.96) };
    return { from: clamp(top + r.height / 2 - screen / 2) };
  });
}

/**
 * For designs whose sections flow: snap to the top of the page, to each element matching
 * `selector` (centred, or a free zone when it's taller than the screen) and to the very end.
 * `screen` is the design's frame (its sticky stage), or the window.
 */
export function useFlowSnap(rootRef: RefObject<HTMLElement | null>, enabled: boolean, selector: string, key: string, frame?: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root || !enabled) return;
    const snap = createStopSnap(root, true);
    let raf = 0;
    const measure = () => {
      raf = 0;
      const H = frame?.current?.getBoundingClientRect().height || window.innerHeight;
      const end = Math.max(0, root.getBoundingClientRect().height - H);
      const els = Array.from(root.querySelectorAll<HTMLElement>(selector));
      snap.update([{ from: 0 }, ...centredSpans(root, els, H), { from: end }], H);
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(measure); };
    measure();
    // the page's height changes as fonts load and the reply form opens
    const ro = new ResizeObserver(kick);
    ro.observe(root);
    window.addEventListener("resize", kick);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); window.removeEventListener("resize", kick); snap.dispose(); };
    // the refs are stable; key stands for the design's sections
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, selector, key]);
}
