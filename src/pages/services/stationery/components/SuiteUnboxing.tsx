import { useEffect, useLayoutEffect, useRef } from "react";
import { gsap } from "gsap";

// A suite, unboxed: the envelope sits alone with the invitation tucked inside; the
// invitation lifts out and both settle, the cards slide out from behind it, and the
// illustrations rise in. It ends on exactly the original flat-lay.
//
// Each suite's layers are cut from its photo (public/services/stationery/<suite>): full-canvas
// transparent images sharing one coordinate system. Parts hidden in the photo (under another
// piece) were rebuilt, so any piece can move. "pocket" is the envelope's front, drawn in front
// of the invitation while it's still inside.

type Layer = { name: string; z: number; role: "env" | "pocket" | "inv" | "card" | "tile"; cx: number; cy: number };
type Pose = { x: number; y: number; scale: number; rot: number };
type Suite = {
  dir: string;
  w: number;
  h: number;
  alt: string;
  layers: Layer[];
  /** Where the envelope sits (centre, % of the canvas) and how big, at the start. */
  env: { x: number; y: number; scale: number };
  /** The invitation tucked in, then lifted clear of the pocket. */
  inv: { start: Pose; lift: Pose };
};

const L = (name: string, z: number, role: Layer["role"], cx: number, cy: number): Layer => ({ name, z, role, cx, cy });

const SUITES: Record<"essential" | "signature" | "heirloom", Suite> = {
  essential: {
    dir: "/services/stationery/essential",
    w: 1048,
    h: 1017,
    alt: "The Essential suite: an invitation, details card, RSVP card and three illustrations, with its envelope",
    layers: [
      L("envelope", 1, "env", 27.86, 51.47),
      L("pocket", 50, "pocket", 27.59, 57.39),
      L("tile1", 1, "tile", 23.42, 86.41),
      L("tile2", 1, "tile", 49.23, 86.29),
      L("tile3", 1, "tile", 74.29, 87.16),
      L("details", 3, "card", 83.14, 30.48),
      L("rsvp", 3, "card", 80.51, 65.23),
      L("invitation", 4, "inv", 49.15, 40.13),
    ],
    env: { x: 50, y: 55, scale: 1.12 },
    inv: { start: { x: 50, y: 54.6, scale: 0.62, rot: 6 }, lift: { x: 50, y: 20, scale: 0.75, rot: 3 } },
  },
  signature: {
    dir: "/services/stationery/signature",
    w: 1146,
    h: 1002,
    alt: "The Signature suite: an invitation, details, directions, RSVP and weekend cards and four illustrations, with its envelope",
    layers: [
      L("envelope", 1, "env", 27.36, 43.74),
      L("pocket", 50, "pocket", 27.23, 50.65),
      L("tile1", 1, "tile", 32.53, 84.1),
      L("tile2", 1, "tile", 49.39, 84.53),
      L("tile3", 1, "tile", 66.76, 85.13),
      L("tile4", 1, "tile", 85.91, 85.68),
      L("directions", 2, "card", 86.33, 32.43),
      L("reply", 2, "card", 76.17, 59.04),
      L("details", 3, "card", 71.26, 25.32),
      L("weekend", 3, "card", 13.39, 73.64),
      L("invitation", 3, "inv", 46.15, 40.35),
    ],
    env: { x: 50, y: 52, scale: 1.35 },
    inv: { start: { x: 50, y: 59.8, scale: 0.655, rot: 4 }, lift: { x: 50, y: 25.5, scale: 0.7, rot: 2 } },
  },
  heirloom: {
    dir: "/services/stationery/heirloom",
    w: 1026,
    h: 926,
    alt: "The Heirloom suite: a save the date, invitation, details, celebration map, RSVP, thank you card, tags, napkin, timeline and ten illustrations, with its envelope",
    layers: [
      L("envelope", 1, "env", 55.93, 24.6),
      L("pocket", 50, "pocket", 55.83, 30.8),
      ...Array.from({ length: 10 }, (_, i) => L(`tile${i + 1}`, 1, "tile", [11.31, 19.35, 27.14, 34.94, 45.32, 55.51, 63.21, 71.39, 80.07, 88.78][i], 86.56)),
      L("strip", 1, "card", 38.36, 14.9),
      L("savedate", 2, "card", 25.1, 24.41),
      L("celebration", 2, "card", 82.32, 34.63),
      L("thankyou", 2, "card", 21.59, 56.52),
      L("timeline", 2, "card", 49.77, 73.52),
      L("reply", 2, "card", 83.42, 68.53),
      L("napkin", 3, "card", 26.48, 75.06),
      L("invitation", 3, "inv", 44.11, 42.77),
      L("details", 4, "card", 63.49, 39.76),
      L("tag", 4, "card", 10.7, 71.72),
      L("giovanna", 4, "card", 64.94, 65.74),
    ],
    env: { x: 50, y: 52, scale: 1.6 },
    inv: { start: { x: 50, y: 58.6, scale: 0.7, rot: 4 }, lift: { x: 50, y: 34.4, scale: 0.85, rot: 2 } },
  },
};

export default function SuiteUnboxing({ suite }: { suite: keyof typeof SUITES }) {
  const S = SUITES[suite];
  const box = useRef<HTMLDivElement | null>(null);
  const tl = useRef<gsap.core.Timeline | null>(null);

  // The opening pose is set before the first paint, so the finished picture never flashes.
  useLayoutEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !box.current) return;
    const q = gsap.utils.selector(box);
    const one = (n: string) => q(`[data-l="${n}"]`);
    const env = S.layers.find((l) => l.role === "env")!;
    const inv = S.layers.find((l) => l.role === "inv")!;
    const envEls = [...one(env.name), ...one("pocket")];
    const invEl = one(inv.name);
    const cards = S.layers.filter((l) => l.role === "card").sort((a, b) => a.z - b.z || Math.hypot(a.cx - inv.cx, a.cy - inv.cy) - Math.hypot(b.cx - inv.cx, b.cy - inv.cy));
    const tiles = S.layers.filter((l) => l.role === "tile").sort((a, b) => a.cx - b.cx);
    // Every layer is the full canvas, so xPercent / yPercent are % of the canvas.
    const pose = (l: Layer, p: Pose) => ({ xPercent: p.x - l.cx, yPercent: p.y - l.cy, scale: p.scale, rotation: p.rot, transformOrigin: `${l.cx}% ${l.cy}%` });
    const ctx = gsap.context(() => {
      gsap.set(envEls, { xPercent: S.env.x - env.cx, yPercent: S.env.y - env.cy, scale: S.env.scale, transformOrigin: `${env.cx}% ${env.cy}%` });
      gsap.set(invEl, { ...pose(inv, S.inv.start), zIndex: 450 });
      cards.forEach((c) => gsap.set(one(c.name), { xPercent: (inv.cx - c.cx) * 0.18, yPercent: (inv.cy - c.cy) * 0.18, opacity: 0 }));
      gsap.set(tiles.flatMap((t) => one(t.name)), { yPercent: 6, opacity: 0 });
      const t = gsap.timeline({ paused: true, defaults: { ease: "power3.inOut" } });
      // Out of the envelope, growing a little; once clear of the pocket it comes in front.
      t.to(invEl, { ...pose(inv, S.inv.lift), duration: 0.9, ease: "power2.out" }, 0.45)
        .set(invEl, { zIndex: 550 }, 1.35)
        // Both settle into the flat-lay; then the pocket (the same pixels as the envelope)
        // steps away and the invitation takes its own place in the stack.
        .to(envEls, { xPercent: 0, yPercent: 0, scale: 1, duration: 0.95 }, 1.3)
        .to(invEl, { xPercent: 0, yPercent: 0, scale: 1, rotation: 0, duration: 0.95 }, 1.35)
        .set(one("pocket"), { autoAlpha: 0 }, 2.3)
        .set(invEl, { zIndex: inv.z * 10 }, 2.3);
      // The cards slide out from behind the invitation, lower ones first, then the illustrations.
      const step = Math.min(0.12, 0.9 / Math.max(cards.length, 1));
      cards.forEach((c, i) => t.to(one(c.name), { xPercent: 0, yPercent: 0, opacity: 1, duration: 0.8, ease: "power3.out" }, 1.95 + i * step));
      t.to(tiles.flatMap((x) => one(x.name)), { yPercent: 0, opacity: 1, duration: 0.65, ease: "power2.out", stagger: Math.min(0.12, 0.8 / tiles.length) }, 1.95 + cards.length * step + 0.1);
      tl.current = t;
    }, box);
    return () => ctx.revert();
  }, [S]);

  // Plays when the picture is well into view.
  useEffect(() => {
    const el = box.current;
    if (!el || !tl.current) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          tl.current?.play();
          io.disconnect();
        }
      },
      { threshold: 0.45 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [S]);

  return (
    <div ref={box} className="relative w-full" style={{ aspectRatio: `${S.w} / ${S.h}` }} role="img" aria-label={S.alt}>
      {S.layers.map((l) => (
        <img
          key={l.name}
          data-l={l.name}
          src={`${S.dir}/${l.name}.webp`}
          alt=""
          aria-hidden
          draggable={false}
          className="pointer-events-none absolute inset-0 h-full w-full select-none will-change-transform"
          style={{ zIndex: l.z * 10 }}
        />
      ))}
    </div>
  );
}
