import { useEffect, type RefObject } from "react";
import { createStopSnap, type SnapSpan } from "../shared/stopSnap";

/**
 * Letterpress's table: the linen on the sticky frame, the suite's pieces laid on it, one piece a
 * stop ([data-lp-stop]).
 *  - Every piece pauses in the same place, its dock: its vignette ([data-lp-dock], the piece and
 *    the things lying round it) is sticky for its hold, then goes on up the table. A vignette
 *    taller than the frame (an open reply form on a phone) docks by its bottom edge, so it can be
 *    read to the end; its top is measured here (as in Level Up).
 *  - The linen moves with the pieces, one for one, and stands still while a piece is docked: the
 *    whole table glides under the camera in the gaps and nothing slides on it.
 *  - Foil catches the window as its piece crosses the frame (--sheen on each vignette).
 *  - One swipe, one stop (the shared helper), on the live page and the design preview.
 *  - Cheap: one transform and a few custom properties a scroll; no canvas, no WebGL.
 */

const TILE = { w: 2688, h: 1920 }; // the linen tile's pixels (shown at half, a third on a phone)

export function useTable(refs: { root: RefObject<HTMLElement | null>; stage: RefObject<HTMLElement | null>; table: RefObject<HTMLElement | null> }, { routeKey, snap: snapOn }: { routeKey: string; snap: boolean }) {
  useEffect(() => {
    const root = refs.root.current, stage = refs.stage.current, table = refs.table.current;
    if (!root || !stage || !table) return;
    const snap = createStopSnap(root, snapOn, { gentle: true });
    let holds: { a: number; b: number; top: number; V: number; el: HTMLElement }[] = [];
    let H = 1, tileH = 960, raf = 0, mraf = 0;
    const scrolled = () => stage.getBoundingClientRect().top - root.getBoundingClientRect().top;
    const measure = () => {
      mraf = 0;
      const rt = root.getBoundingClientRect();
      H = Math.max(1, stage.getBoundingClientRect().height);
      const phone = rt.width <= 700;
      const tw = phone ? 968 : 1344;
      tileH = (tw * TILE.h) / TILE.w;
      const bs = `${tw}px ${tileH.toFixed(1)}px`;
      if (table.style.backgroundSize !== bs) table.style.backgroundSize = bs;
      const th = `${Math.ceil(H + tileH + 4)}px`;
      if (table.style.height !== th) table.style.height = th;
      const max = Math.max(0, rt.height - H);
      const spans: SnapSpan[] = [];
      holds = [];
      for (const s of Array.from(root.querySelectorAll<HTMLElement>("[data-lp-stop]"))) {
        const wrap = s.querySelector<HTMLElement>(".lp-dock"), vig = wrap?.querySelector<HTMLElement>("[data-lp-dock]");
        if (!wrap || !vig) continue;
        const V = vig.offsetHeight;
        // a vignette a little taller than the frame (mostly its margin) is centred; a much
        // taller one docks by its bottom edge and is read through
        const over = V - H;
        const top = over <= 0 ? 0 : over < H * 0.16 ? -Math.round(over / 2) : -Math.round(over);
        const tall = over >= H * 0.16;
        if (vig.style.top !== `${top}px`) vig.style.top = `${top}px`;
        const w = wrap.getBoundingClientRect();
        const wt = w.top - rt.top;
        const a = Math.min(max, Math.max(0, wt - top));
        const b = Math.min(max, Math.max(a, wt + w.height - V - top));
        holds.push({ a, b, top, V, el: vig });
        spans.push(tall ? { from: Math.max(0, wt), to: a } : { from: a });
      }
      snap.update(spans, H);
      update();
    };
    const update = () => {
      raf = 0;
      const s = scrolled();
      let held = 0;
      for (const h of holds) held += Math.min(Math.max(s - h.a, 0), h.b - h.a);
      const ty = s - held;
      table.style.transform = `translate3d(0, ${(-(ty % tileH)).toFixed(1)}px, 0)`;
      // each vignette's place on the frame (from the holds, without reading the layout)
      for (const h of holds) {
        const y = h.top + Math.max(0, h.a - s) - Math.max(0, s - h.b);
        if (y > H * 1.6 || y + h.V < -H * 0.6) continue;
        const v = ((y + h.V / 2 - H / 2) / H).toFixed(3);
        if (h.el.style.getPropertyValue("--sheen") !== v) h.el.style.setProperty("--sheen", v);
      }
    };
    const onScroll = () => update();
    const kick = () => { if (!mraf) mraf = requestAnimationFrame(measure); };
    measure();
    const ro = new ResizeObserver(kick);
    ro.observe(root);
    ro.observe(stage);
    // the cards' heights change as fonts load and the reply form opens
    const mo = new MutationObserver(kick);
    mo.observe(root, { childList: true, subtree: true, characterData: true });
    window.addEventListener("scroll", onScroll, { passive: true, capture: true });
    window.addEventListener("resize", kick);
    document.fonts?.ready.then(kick).catch(() => {});
    return () => {
      snap.dispose();
      cancelAnimationFrame(raf);
      cancelAnimationFrame(mraf);
      ro.disconnect();
      mo.disconnect();
      window.removeEventListener("scroll", onScroll, { capture: true });
      window.removeEventListener("resize", kick);
    };
    // the refs are stable; routeKey stands for the stops on the page
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeKey, snapOn]);
}

// ---------------------------------------------------------------------------------------------
// The opening: the envelope lies sealed in the middle of the frame. A tap, a key or a swipe
// breaks the seal; the flap lifts and folds back over its hinge, showing the painted liner; the
// invitation slides out, lifts and settles on the envelope, where it stays (the first stop).
// Everything is laid out in its final, resting place; the opening runs from the sealed pose back
// to it (transforms only, on the compositor).

const ease = (k: number) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const easeOut = (k: number) => 1 - Math.pow(1 - k, 3);
const seg = (t: number, a: number, b: number) => Math.min(1, Math.max(0, (t - a) / (b - a)));
const deg = (el: Element) => parseFloat(getComputedStyle(el).rotate) || 0;

type Frame = Record<string, string | number>;
type AnimOpts = { duration: number; delay?: number; fill?: "both" | "forwards" | "none"; easing?: string };

export type Opening = { play: () => void; hurry: () => void; cancel: () => void };

export function buildOpening(root: HTMLElement, onDone: () => void): Opening | null {
  const vig = root.querySelector<HTMLElement>("[data-lp-key='invite'] [data-lp-dock]");
  const env = vig?.querySelector<HTMLElement>(".lp-env");
  const card = vig?.querySelector<HTMLElement>("[data-lp-invite]");
  const flap = env?.querySelector<HTMLElement>(".lp-flap");
  if (!vig || !env || !card || !flap) return null;
  const shade = card.querySelector<HTMLElement>(".lp-shade");
  const sealB = env.querySelector<HTMLElement>(".lp-seal-b");
  const sealA = env.querySelector<HTMLElement>(".lp-seal-a");
  const flapShadow = env.querySelector<HTMLElement>(".lp-flapshadow");
  const openShadow = env.querySelector<HTMLElement>(".lp-openshadow");
  const phone = root.getBoundingClientRect().width <= 700;
  // measure the resting layout, free of any earlier run's transforms
  for (const el of [env, card, flap, shade, sealA, sealB, flapShadow, openShadow]) el?.getAnimations().forEach((a) => a.cancel());

  const vr = vig.getBoundingClientRect(), er = env.getBoundingClientRect(), cr = card.getBoundingClientRect();
  const E = { x: er.left + er.width / 2, y: er.top + er.height / 2, r: deg(env) };
  const C = { x: cr.left + cr.width / 2, y: cr.top + cr.height / 2, r: deg(card) };
  // sealed: the envelope in the middle of the frame above the prompt, nearly square to it, made
  // smaller when a short frame (a phone, the preview page under its bar) has no room for it
  const pr = root.querySelector<HTMLElement>(".lp-prompt")?.getBoundingClientRect();
  const fTop = vr.top + 12, fBot = pr && pr.height ? pr.top - 14 : vr.top + Math.min(vr.height, window.innerHeight) * 0.9;
  const S = { x: vr.left + vr.width / 2, y: (fTop + fBot) / 2, r: -2 };
  const Ss = Math.max(0.6, Math.min(1, (fBot - fTop) / er.height));
  const envW = env.offsetWidth, cardW = card.offsetWidth;
  const outX = (envW / 2 + cardW / 2 + 10) * (phone ? 0.62 : 1);
  const T = 3300;
  const N = 72;
  const envF: Frame[] = [], cardF: Frame[] = [], shadeF: Frame[] = [];
  let swapped = false;
  for (let i = 0; i <= N; i++) {
    const t = (i / N) * T;
    const ke = ease(seg(t, 950, 2650));
    const ex = S.x + (E.x - S.x) * ke, ey = S.y + (E.y - S.y) * ke, erot = S.r + (E.r - S.r) * ke;
    const sc = Ss + (1 - Ss) * ke;
    envF.push({ offset: i / N, translate: `${(ex - E.x).toFixed(2)}px ${(ey - E.y).toFixed(2)}px`, rotate: `${erot.toFixed(3)}deg`, scale: `${sc.toFixed(4)}` });
    // the card: in the envelope, then out along its opening, then up and onto the envelope
    const ko = ease(seg(t, 1250, 2300));
    const a = (erot * Math.PI) / 180;
    const ox = ex + Math.cos(a) * outX * sc * ko, oy = ey + Math.sin(a) * outX * sc * ko;
    const ks = seg(t, 2300, 3300), kf = easeOut(ks);
    const cx = ox + (C.x - ox) * kf, cy = oy + (C.y - oy) * kf - Math.sin(Math.PI * ks) * 10;
    const crot = ks > 0 ? erot + (C.r - erot) * kf : erot;
    const lift = (1 + 0.035 * Math.sin(Math.PI * Math.min(1, ks * 1.15))) * sc;
    const out = t >= 2300;
    const frame: Frame = { offset: i / N, translate: `${(cx - C.x).toFixed(2)}px ${(cy - C.y).toFixed(2)}px`, rotate: `${crot.toFixed(3)}deg`, scale: `${lift.toFixed(4)}`, zIndex: out ? 6 : 1 };
    if (out && !swapped) {
      swapped = true;
      cardF.push({ ...frame, offset: Math.max(0, i / N - 0.0001), zIndex: 1 });
    }
    cardF.push(frame);
    const lifted = Math.sin(Math.PI * Math.min(1, ks * 1.15));
    shadeF.push({ offset: i / N, translate: `${(lifted * 10).toFixed(2)}px ${(lifted * 16).toFixed(2)}px`, scale: `${(1 + lifted * 0.02).toFixed(4)}`, opacity: `${(1 - lifted * 0.35).toFixed(3)}` });
  }
  const opts = (o: Partial<AnimOpts> = {}): AnimOpts => ({ duration: T, fill: "both", easing: "linear", ...o });
  const anims: Animation[] = [
    env.animate(envF, opts()),
    card.animate(cardF, opts()),
    flap.animate([{ transform: "rotateY(0deg)" }, { transform: "rotateY(180deg)" }], { duration: 1050, delay: 260, fill: "both", easing: "cubic-bezier(.5,0,.28,1)" }),
  ];
  if (shade) anims.push(shade.animate(shadeF, opts()));
  if (sealB) anims.push(sealB.animate([{ translate: "0 0", rotate: "0deg" }, { translate: "-2px 1px", rotate: "-4deg" }], { duration: 260, fill: "both", easing: "cubic-bezier(.2,.9,.3,1.3)" }));
  if (sealA) anims.push(sealA.animate([{ translate: "0 0" }, { translate: "1.5px -0.5px" }], { duration: 220, fill: "both", easing: "ease-out" }));
  if (flapShadow) anims.push(flapShadow.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 420, delay: 260, fill: "both" }));
  if (openShadow) anims.push(openShadow.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 360, delay: 1050, fill: "both" }));
  for (const a of anims) a.pause();
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    for (const a of anims) a.cancel();
    onDone();
  };
  anims[1].onfinish = finish;
  return {
    play: () => { for (const a of anims) a.play(); },
    hurry: () => { for (const a of anims) a.updatePlaybackRate(3.2); },
    cancel: () => { done = true; for (const a of anims) a.cancel(); },
  };
}
