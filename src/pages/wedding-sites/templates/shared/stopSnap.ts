import { useEffect, type RefObject } from "react";

/**
 * One swipe, one stop: the scroll designs (Level Up, Safari, Pixel Quest, Summit, The Blue; Promenade
 * has its own copy in stroll.ts) rest only at their stops, never halfway between two.
 *  - A wheel or trackpad gesture, a flick or a key moves the page to the next stop in that direction
 *    in one eased glide. A trackpad's momentum runs out before the next gesture counts.
 *  - Touch: the page follows the finger, then goes on to the next stop (or back) on release.
 *    Sideways swipes (photo rows) and drags that start in a form field are left alone.
 *  - Anything else that moves the page (a scrollbar, a link, find in page) settles to the nearest
 *    stop once it stops.
 *  - A stop taller than the screen (an open reply form on a phone) rests at its top and every
 *    three quarters of a screen down to its end, so it can be read through.
 * Positions are the design's own scroll offsets: how far the page has scrolled past the root's top.
 * Only on the live page and design preview with motion (the engines pass `enabled` = their
 * `animate`): never in the builder, the gallery card or with reduced motion.
 */

export type SnapSpan = { from: number; to?: number };

export function createStopSnap(root: HTMLElement, enabled: boolean) {
  if (!enabled || typeof window === "undefined") return { update: () => {}, dispose: () => {} };
  let rests: number[] = [0];
  const here = () => -root.getBoundingClientRect().top;
  const nowMs = () => performance.now();
  let anim = 0, animTo = -1, quietAt = 0, touchY = -1, touchX = 0, touchFrom = 0, touchT = 0, dragging = false, settleT = 0;
  const glide = (rel: number) => {
    cancelAnimationFrame(anim);
    const y0 = window.scrollY, y1 = Math.max(0, Math.min(document.documentElement.scrollHeight - window.innerHeight, y0 + (rel - here())));
    const d = Math.abs(y1 - y0);
    if (d < 2) { animTo = -1; return; }
    const D = Math.min(900, Math.max(520, 420 + d * 0.22)), t0 = nowMs();
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
  // past the last stop (the credit line under the reply): scroll normally
  const pastEnd = () => here() > (rests[rests.length - 1] ?? 0) + 4;
  const busy = () => anim !== 0 || nowMs() < quietAt;
  const inField = (t: EventTarget | null) => t instanceof Element && !!t.closest("input, textarea, select, [contenteditable], [data-snap-free]");
  const locked = () => document.documentElement.style.overflow === "hidden" || document.body.style.overflow === "hidden"; // an opening holding the page
  let acc = 0, fired = false, lastAbs = 0;
  const onWheel = (e: WheelEvent) => {
    if (e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY) || inField(e.target) || locked()) return;
    if (pastEnd() && e.deltaY > 0) return;
    e.preventDefault();
    // a gesture lasts until the wheel goes quiet (a trackpad's momentum included); it moves one stop
    // once it has travelled far enough to mean it, and never more
    if (nowMs() > quietAt && !anim) { acc = 0; fired = false; }
    quietAt = nowMs() + 140;
    const dy = e.deltaMode === 1 ? e.deltaY * 33 : e.deltaY;
    // a fresh flick while the last one's momentum is still fading: a sudden jump in speed
    if (fired && !anim && Math.abs(dy) > 18 && Math.abs(dy) > lastAbs * 1.8) { acc = 0; fired = false; }
    lastAbs = Math.abs(dy);
    acc += dy;
    if (fired || anim || Math.abs(acc) < 6) return;
    fired = true;
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
  const onStart = (e: TouchEvent) => {
    if (e.touches.length !== 1 || locked()) { touchY = -1; return; }
    cancelAnimationFrame(anim); anim = 0; animTo = -1;
    touchY = e.touches[0].clientY; touchX = e.touches[0].clientX; touchFrom = window.scrollY; touchT = nowMs(); dragging = false;
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
    window.scrollTo(0, Math.max(0, touchFrom + dy));
  };
  const onEnd = () => {
    if (touchY < 0) return;
    const moved = window.scrollY - touchFrom, ms = nowMs() - touchT;
    touchY = -1;
    if (!dragging) return;
    dragging = false;
    const from = here() - moved;
    const fast = Math.abs(moved) / Math.max(ms, 1) > 0.25;
    glide(Math.abs(moved) > 36 || (fast && Math.abs(moved) > 12) ? next(Math.sign(moved), from) : nearest(here()));
  };
  const onAnyScroll = () => {
    clearTimeout(settleT);
    settleT = window.setTimeout(() => {
      if (busy() || dragging || touchY >= 0 || locked() || pastEnd()) return;
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
