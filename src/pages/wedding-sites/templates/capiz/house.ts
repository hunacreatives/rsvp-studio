import { useEffect, type RefObject } from "react";
import { createStopSnap } from "../shared/stopSnap";
import { loadMaterials, SIZES } from "./textures";

/**
 * Capiz's house: one bahay na bato at dusk, travelled from the eaves down to the street, one
 * part of the facade a stop ([data-cz-bay]).
 *  - Every part docks in the same place: its top at the top of the screen. A part a little
 *    taller than the screen is centred; a much taller one (a long entourage, the open reply form
 *    on a phone) is read through: it rests at its top and on down to its end.
 *  - One swipe, one stop: the shared spring (shared/stopSnap.ts, gentle), on the live page and
 *    the design preview.
 *  - The signature moment: the first window's two capiz sashes slide open, by hand (a heavy,
 *    critically damped spring of their own), and the couple are there. On a wide screen the
 *    sashes run out over the closed windows beside it, shell over shell, as they do in the real
 *    house; on a phone into the wall. Once open it stays open.
 *  - The lamp stays where it is in the room: each sash carries a backing of the room's light
 *    (clipped to its own window) whose lamp counter-moves, so the light never slides with the
 *    shell.
 *  - The opening (`intro`): the first window closed, the lamp coming up behind the shell; then
 *    the sashes slide open onto the couple's photo and names. The page is held (html overflow
 *    hidden) until it ends; a tap, key or swipe only hurries it, and that swipe is used up.
 *  - `animate` false (builder, gallery card, reduced motion): every window open (the CSS sets
 *    it, so there's no flash), nothing moves, no stops.
 *  - Cheap: transforms only, a few writes a frame, and only while something moves; the flicker
 *    of the lamps (CSS) runs only in the windows near the screen.
 */

const SASH_W = 4.4; // the sashes' spring: how quickly they close on where they're going
// the opening's beats (ms): the lamp comes up; the sashes; the names; the page let go
const SASH_AT = 850, SASH_MS = 2000, NAMES_AT = 1900, INTRO_MS = 3300;
const easeInOut = (k: number) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);

type Sash = { el: HTMLElement; back: HTMLElement | null; lamp: HTMLElement | null; dir: number };
type Bay = { el: HTMLElement; a: number; b: number; sashes: Sash[]; spill: HTMLElement[]; travel: number; p: number; v: number; near: boolean; opened: boolean };

export function useHouse(rootRef: RefObject<HTMLElement | null>, { routeKey, animate, intro, snap }: { routeKey: string; animate: boolean; intro: boolean; snap: boolean }) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let phone = root.getBoundingClientRect().width <= 700;
    let mats = loadMaterials(root, phone);
    const stepper = createStopSnap(root, snap, { gentle: true });
    const state = new WeakMap<HTMLElement, { p: number; v: number; opened: boolean }>();
    let bays: Bay[] = [];
    let H = 1, rootTop = 0, raf = 0, mraf = 0, prevT = 0, alive = true;
    const offset = () => window.scrollY - rootTop; // how far the page has scrolled past the root's top

    // ---- the intro
    let introOn = intro && animate;
    let introT = 0, introStarted = false, speed = 1, named = false;
    const html = document.documentElement, prevOverflow = html.style.overflow;
    const evs = ["wheel", "touchstart", "keydown", "pointerdown"] as const;
    const hurry = () => {
      if (!introOn) return;
      if (!introStarted) begin();
      speed = 3.2;
      kick();
    };
    const begin = () => {
      if (introStarted || !introOn) return;
      introStarted = true;
      root.classList.add("cz-lit");
      prevT = 0;
      kick();
    };
    const endIntro = () => {
      introOn = false;
      html.style.overflow = prevOverflow;
      root.classList.remove("cz-intro");
      root.classList.add("cz-named", "cz-lit");
      evs.forEach((e) => window.removeEventListener(e, hurry));
    };
    if (introOn) {
      html.style.overflow = "hidden";
      window.scrollTo(0, 0);
      evs.forEach((e) => window.addEventListener(e, hurry, { passive: true }));
      // the lamp comes up once the shell (and the photo behind it) are there, or soon anyway
      const img = root.querySelector<HTMLImageElement>("[data-cz-hero-img]");
      const photo = img && !img.complete ? new Promise<void>((r) => { img.addEventListener("load", () => r(), { once: true }); img.addEventListener("error", () => r(), { once: true }); }) : Promise.resolve();
      const late = new Promise<void>((r) => setTimeout(r, 1600));
      Promise.race([Promise.all([mats.first, photo]), late]).then(() => { if (alive) setTimeout(begin, 220); });
    }

    // ---- measuring
    const measure = () => {
      mraf = 0;
      const rt = root.getBoundingClientRect();
      const nowPhone = rt.width <= 700;
      if (nowPhone !== phone) { phone = nowPhone; mats = loadMaterials(root, phone); }
      H = Math.max(1, window.innerHeight);
      rootTop = rt.top + window.scrollY;
      const max = Math.max(0, rt.height - H);
      const clamp = (v: number) => Math.min(max, Math.max(0, Math.round(v)));
      // every pane square, whatever the window's size: a whole number of panes each way
      const pane = (phone ? SIZES.phone : SIZES.wide).pane;
      for (const g of Array.from(root.querySelectorAll<HTMLElement>("[data-cz-glass]"))) {
        const w = g.clientWidth, h = g.clientHeight;
        if (!w || !h) continue;
        const cols = Number(g.dataset.czCols) || Math.max(1, Math.round(w / pane));
        const pw = `${(w / cols).toFixed(3)}px`, ph = `${(h / Math.max(1, Math.round(h / pane))).toFixed(3)}px`;
        if (g.style.getPropertyValue("--pw") !== pw) g.style.setProperty("--pw", pw);
        if (g.style.getPropertyValue("--ph") !== ph) g.style.setProperty("--ph", ph);
      }
      bays = Array.from(root.querySelectorAll<HTMLElement>("[data-cz-bay]")).map((el) => {
        const r = el.getBoundingClientRect(), top = r.top - rt.top;
        // a little taller than the screen (mostly its frame): one stop, centred; much taller: read through
        const over = r.height - H;
        const a = clamp(over > 0 && over < H * 0.22 ? top + over / 2 : top), b = over >= H * 0.22 ? clamp(top + over) : a;
        const sashes = Array.from(el.querySelectorAll<HTMLElement>("[data-cz-sash]")).map((s) => {
          const dir = s.dataset.czSash === "l" ? -1 : 1;
          const back = el.querySelector<HTMLElement>(`[data-cz-back="${s.dataset.czSash}"]`);
          return { el: s, back, lamp: back?.firstElementChild as HTMLElement | null, dir };
        });
        const post = el.querySelector<HTMLElement>(".cz-post")?.offsetWidth ?? 0;
        const travel = (sashes[0]?.el.offsetWidth ?? 0) + post + 6;
        const st = state.get(el) ?? { p: animate ? 0 : 1, v: 0, opened: !animate };
        state.set(el, st);
        return { el, a, b, sashes, spill: Array.from(el.querySelectorAll<HTMLElement>("[data-cz-spill]")), travel, p: st.p, v: st.v, near: el.classList.contains("is-near"), opened: st.opened };
      });
      // the stops: each window, then the stone at the very end
      stepper.update(bays.map((x) => (x.b > x.a + 8 ? { from: x.a, to: x.b } : { from: x.a })), H);
      for (const x of bays) put(x, true);
      kick();
    };

    const put = (x: Bay, force = false) => {
      if (!animate) return;
      const st = state.get(x.el);
      if (st) { st.p = x.p; st.v = x.v; st.opened = x.opened; }
      const t = x.p * x.travel;
      for (const s of x.sashes) {
        const tx = `translate3d(${(s.dir * t).toFixed(2)}px, 0, 0)`;
        if (force || s.el.style.transform !== tx) {
          s.el.style.transform = tx;
          if (s.back) s.back.style.transform = tx;
          if (s.lamp) s.lamp.style.transform = `translate3d(${(-s.dir * t).toFixed(2)}px, 0, 0)`;
        }
      }
      const o = (0.15 + 0.85 * x.p).toFixed(3);
      for (const sp of x.spill) if (sp.style.opacity !== o) sp.style.opacity = o;
    };

    // ---- the loop: the sashes' springs (and the opening), only while something moves
    const loop = (now: number) => {
      raf = 0;
      if (!alive || !animate) return;
      const dt = Math.min(0.05, prevT ? (now - prevT) / 1000 : 0.016);
      prevT = now;
      const y = offset();
      let moving = false;
      if (introOn && introStarted) {
        introT += dt * 1000 * speed;
        if (introT >= NAMES_AT && !named) { named = true; root.classList.add("cz-named"); }
        if (introT >= INTRO_MS) endIntro();
        moving = true;
      }
      for (let i = 0; i < bays.length; i++) {
        const x = bays[i];
        const d = y < x.a ? x.a - y : y > x.b ? y - x.b : 0;
        const near = d < H * 1.25;
        if (near !== x.near) { x.near = near; x.el.classList.toggle("is-near", near); }
        if (i === 0 && (introOn || (intro && introT < INTRO_MS))) {
          // the opening drives the first window itself
          const k = introStarted ? easeInOut(Math.min(1, Math.max(0, (introT - SASH_AT) / SASH_MS))) : 0;
          if (k !== x.p) { x.p = k; x.v = 0; x.opened = true; put(x); }
          continue;
        }
        // a window opens as the page reaches it, and stays open
        if (!x.sashes.length) continue;
        if (d < H * 0.42) x.opened = true;
        const goal = x.opened ? 1 : 0;
        if (x.p === goal && x.v === 0) continue;
        // a critically damped spring, solved exactly for the frame
        const dd = x.p - goal, e = Math.exp(-SASH_W * dt), k = x.v + SASH_W * dd;
        x.p = goal + (dd + k * dt) * e;
        x.v = (x.v - k * SASH_W * dt) * e;
        if (Math.abs(x.p - goal) < 0.0015 && Math.abs(x.v) < 0.02) { x.p = goal; x.v = 0; }
        else moving = true;
        put(x);
      }
      if (moving || introOn) raf = requestAnimationFrame(loop);
    };
    const kick = () => { if (!raf && animate && alive) { prevT = 0; raf = requestAnimationFrame(loop); } };
    const remeasure = () => { if (!mraf) mraf = requestAnimationFrame(measure); };

    if (introOn) root.classList.add("cz-intro");
    measure();
    if (!animate) root.classList.add("cz-named", "cz-lit");
    else if (!introOn) root.classList.add("cz-named", "cz-lit");
    mats.all.then(remeasure).catch(() => {});
    const ro = new ResizeObserver(remeasure);
    ro.observe(root);
    // content changes (the builder, the reply form opening) change the windows' heights
    const mo = new MutationObserver(remeasure);
    mo.observe(root, { childList: true, subtree: true, characterData: true });
    window.addEventListener("scroll", kick, { passive: true });
    window.addEventListener("resize", remeasure);
    document.fonts?.ready.then(remeasure).catch(() => {});
    return () => {
      alive = false;
      stepper.dispose();
      cancelAnimationFrame(raf);
      cancelAnimationFrame(mraf);
      ro.disconnect();
      mo.disconnect();
      window.removeEventListener("scroll", kick);
      window.removeEventListener("resize", remeasure);
      evs.forEach((e) => window.removeEventListener(e, hurry));
      if (introOn) { html.style.overflow = prevOverflow; root.classList.remove("cz-intro"); root.classList.add("cz-named", "cz-lit"); }
    };
    // the ref is stable; routeKey stands for the windows on the page
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeKey, animate, intro, snap]);
}
