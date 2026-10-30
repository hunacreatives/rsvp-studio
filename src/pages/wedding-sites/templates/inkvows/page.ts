import { useEffect, type RefObject } from "react";
import { createStopSnap, type SnapSpan } from "../shared/stopSnap";
import { createInker, type PenHandle } from "./ink";

/**
 * Ink and vows' page: one long sheet of cotton paper, one section a screen ([data-iv-stop]).
 *  - Every section is laid out the same way from the top of its screen, so each one docks in
 *    the same place and the pen always writes its heading on the same line of the screen.
 *  - One swipe, one stop: the shared spring (shared/stopSnap.ts, gentle). A section taller than
 *    the screen (the open reply form, a long entourage on a phone) is read through.
 *  - A section's lines ([data-iv-ink]) are written when it arrives, once; a section the page
 *    leaves before its pen has finished is finished at once, so coming back shows dry ink.
 *  - The opening (published page and design preview): the pen writes the couple's names on
 *    the first screen. The page is held (html overflow hidden) until the last stroke is down;
 *    a tap, key or swipe only hurries the hand, and that swipe is used up.
 *  - `animate` false (builder, gallery card, reduced motion): every line is shown dry.
 */
export function useInkPage(
  refs: { root: RefObject<HTMLElement | null>; stage: RefObject<HTMLElement | null>; pen: RefObject<PenHandle | null> },
  { routeKey, animate, boot, snap: snapOn, ink, wet, editor, onOpened }: { routeKey: string; animate: boolean; boot: boolean; snap: boolean; ink: string; wet: string; editor: boolean; onOpened: () => void },
) {
  useEffect(() => {
    const root = refs.root.current, stage = refs.stage.current;
    if (!root || !stage || editor) return;
    const inker = createInker({ ink, wet, pen: () => refs.pen.current, stage: () => refs.stage.current });
    const lines = () => Array.from(root.querySelectorAll<HTMLElement>("[data-iv-ink]"));
    const add = () => {
      for (const el of lines()) {
        const cv = el.querySelector<HTMLCanvasElement>("canvas");
        if (cv && !inker.has(el)) inker.add(el, cv, { speed: Number(el.dataset.ivSpeed) || 9, maxDur: Number(el.dataset.ivMax) || 2.2 });
      }
    };
    let alive = true, raf = 0, mraf = 0, idle = 0;
    const html = document.documentElement, prevOverflow = html.style.overflow;
    let opening = boot && animate && inker.gl;
    // the gilded ampersand is laid once the names are written (on an element React leaves alone)
    const gild = () => root.querySelector(".iv-names-wrap")?.classList.add("iv-gilt-on");

    // the fonts the lines are set in: wait for them, so the strokes come from the real glyphs
    const fontsReady = () => {
      const fams = new Set<string>();
      for (const el of lines()) fams.add(getComputedStyle(el).fontFamily);
      const loads = [...fams].map((f) => document.fonts?.load(`400 64px ${f}`).catch(() => undefined));
      return Promise.race([Promise.all(loads).then(() => document.fonts?.ready), new Promise((r) => setTimeout(r, 3500))]);
    };

    // ---- the stops
    const snap = createStopSnap(root, snapOn, { gentle: true });
    let stops: { from: number; to: number; el: HTMLElement }[] = [];
    let H = 1;
    const scrolled = () => -root.getBoundingClientRect().top;
    const measure = () => {
      mraf = 0;
      const rt = root.getBoundingClientRect();
      H = Math.max(1, stage.getBoundingClientRect().height);
      const max = Math.max(0, rt.height - H);
      const clamp = (v: number) => Math.min(max, Math.max(0, Math.round(v)));
      stops = Array.from(root.querySelectorAll<HTMLElement>("[data-iv-stop]")).map((el) => {
        const r = el.getBoundingClientRect(), top = r.top - rt.top;
        if (r.height <= H + 2) return { from: clamp(top), to: clamp(top), el };
        // taller than the screen (mostly its margins): the page itself, centred, if it fits with a
        // little paper round it; otherwise read through from its top to its end
        const c = el.querySelector<HTMLElement>(".iv-spread, .iv-invite")?.getBoundingClientRect() ?? r;
        const ct = c.top - rt.top, m = Math.min(28, H * 0.04);
        if (c.height + 2 * m <= H) { const y = clamp(ct + c.height / 2 - H / 2); return { from: y, to: y, el }; }
        return { from: clamp(ct - m), to: clamp(ct + c.height + m - H), el };
      });
      const spans: SnapSpan[] = stops.map((s) => (s.to > s.from + 8 ? { from: s.from, to: s.to } : { from: s.from }));
      snap.update(spans.length ? spans : [{ from: 0 }], H);
      check();
    };

    // ---- writing a section when it arrives
    let current = -1;
    const linesOf = (el: HTMLElement) => Array.from(el.querySelectorAll<HTMLElement>("[data-iv-ink]"));
    // work every line's strokes out ahead, one per idle moment, nearest sections first; never while
    // the page is moving
    let movedAt = 0;
    const ric = (cb: () => void) => (typeof window.requestIdleCallback === "function" ? window.requestIdleCallback(cb, { timeout: 1500 }) : window.setTimeout(cb, 200));
    const warmNext = (i: number) => {
      clearTimeout(idle);
      const order = stops.map((_, k) => k).filter((k) => k !== i).sort((a, b) => Math.abs(a - i) - Math.abs(b - i) || b - a);
      const todo = order.flatMap((k) => linesOf(stops[k].el)).filter((l) => inker.state(l) === "blank");
      const one = () => {
        if (!alive || !todo.length) return;
        // (only setting the text on a canvas happens here, a millisecond or two; the rest is the worker's)
        if (performance.now() - movedAt < 250) { idle = window.setTimeout(() => ric(one), 300); return; }
        const l = todo.shift()!;
        void inker.warm(l);
        ric(one);
      };
      idle = window.setTimeout(() => ric(one), 150);
    };
    const check = () => {
      if (!animate || opening || !alive) return;
      const s = scrolled();
      let at = -1;
      stops.forEach((st, i) => { if (s >= st.from - H * 0.1 && s <= st.to + H * 0.1) at = i; });
      if (at === current) return;
      // left mid-word: the rest goes down at once
      if (inker.writing()) inker.finish();
      current = at;
      if (at < 0) return;
      const ls = linesOf(stops[at].el).filter((l) => inker.state(l) === "blank");
      const el0 = stops[at].el;
      if (ls.length) inker.write(ls, () => { if (el0.classList.contains("iv-stop--invite")) gild(); warmNext(at); });
      else warmNext(at);
    };
    const onScroll = () => { movedAt = performance.now(); if (!raf) raf = requestAnimationFrame(() => { raf = 0; check(); }); };
    const kick = () => { if (!mraf) mraf = requestAnimationFrame(measure); };

    // ---- the opening
    const evs = ["wheel", "touchstart", "keydown", "pointerdown"] as const;
    const hurry = () => inker.hurry(3.2);
    const unlock = () => { html.style.overflow = prevOverflow; evs.forEach((e) => window.removeEventListener(e, hurry)); };
    if (opening) {
      html.style.overflow = "hidden";
      window.scrollTo(0, 0);
      evs.forEach((e) => window.addEventListener(e, hurry, { passive: true }));
    }

    add();
    measure();
    void fontsReady().then(() => {
      if (!alive) return;
      add();
      measure();
      if (!animate) {
        gild();
        // still pages: every line dry, one at a time so the page stays responsive
        const todo = lines();
        const one = () => { if (!alive) return; const el = todo.shift(); if (!el) return; inker.dry(el); idle = window.setTimeout(one, 0); };
        one();
        return;
      }
      if (opening) {
        const first = stops[0]?.el;
        const ls = first ? linesOf(first) : [];
        current = 0;
        // the next section's strokes too, now, before the pen appears (nothing moves yet)
        if (stops[1]) for (const l of linesOf(stops[1].el)) void inker.warm(l);
        inker.write(ls, () => {
          gild();
          opening = false;
          inker.calm();
          unlock();
          onOpened();
          warmNext(0);
          check();
        });
        return;
      }
      onOpened();
      check();
    });

    const ro = new ResizeObserver(() => {
      kick();
      for (const el of lines()) inker.relayout(el);
    });
    ro.observe(root);
    ro.observe(stage);
    // the reply form opening, a section shown or hidden
    const mo = new MutationObserver(() => { add(); kick(); });
    mo.observe(root, { childList: true, subtree: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", kick);
    if (import.meta.env.DEV) (window as unknown as { __iv?: unknown }).__iv = { inker, stops: () => stops };
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      cancelAnimationFrame(mraf);
      clearTimeout(idle);
      ro.disconnect();
      mo.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", kick);
      if (opening) unlock();
      snap.dispose();
      inker.dispose();
    };
    // the refs are stable; routeKey stands for the sections on the page
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeKey, animate, boot, snapOn, ink, wet, editor]);
}
