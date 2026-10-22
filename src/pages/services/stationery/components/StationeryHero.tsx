import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Reveal } from "@/lib/Reveal";
import "./stationery-hero.css";

gsap.registerPlugin(ScrollTrigger);

// The collage: a real flat-lay. The pieces overlap like a stationery collection laid on a
// table, layered by z. On load they start as one neat stack in the middle and are dealt out
// into the pile, each turning to its own angle; then they bob gently, drift on scroll, and
// (with a mouse) shift a little by depth. Positions are % of a 16:10 box, so it scales.
//   depth: how far it follows the mouse. float: seconds per bob. z: stacking order.
type Piece = { src: string; x: number; y: number; w: number; z: number; rot: number; drift: number; depth: number; float: number };
const PIECES: Piece[] = [
  { src: "/services/stationery/hero-building.png", x: 29, y: 66, w: 42, z: 1, rot: 0, drift: -4, depth: 0.4, float: 9 },
  { src: "/services/stationery/hero-map.webp", x: 5, y: 12, w: 40, z: 2, rot: -7, drift: -6, depth: 0.6, float: 7 },
  { src: "/services/stationery/hero-heart.png", x: 59, y: 1, w: 22, z: 2, rot: 9, drift: 5, depth: 0.9, float: 6 },
  { src: "/services/stationery/hero-palm-invite.webp", x: 37, y: 5, w: 24, z: 4, rot: -2, drift: -5, depth: 0.8, float: 8 },
  { src: "/services/stationery/hero-ornate-invite.webp", x: 60, y: 25, w: 24, z: 5, rot: 6, drift: 6, depth: 0.9, float: 7 },
  { src: "/services/stationery/hero-rsvp-oval.png", x: 15, y: 43, w: 21, z: 5, rot: -9, drift: 6, depth: 0.9, float: 7.5 },
  { src: "/services/stationery/hero-flower.png", x: 31, y: 4, w: 11, z: 6, rot: 14, drift: 10, depth: 1.5, float: 5 },
  { src: "/services/stationery/hero-coconut.png", x: 34, y: 60, w: 11, z: 6, rot: -8, drift: -8, depth: 1.4, float: 5.5 },
  { src: "/services/stationery/hero-turtle.png", x: 67, y: 73, w: 16, z: 6, rot: 12, drift: 7, depth: 1.3, float: 6.5 },
  { src: "/services/stationery/hero-sparkle.png", x: 84, y: 12, w: 5, z: 6, rot: 0, drift: 14, depth: 1.8, float: 3.5 },
];

export default function StationeryHero() {
  const root = useRef<HTMLDivElement | null>(null);
  const stage = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let cleanup = () => {};
    const ctx = gsap.context(() => {
      const imgs = gsap.utils.toArray<HTMLElement>("[data-piece]");
      // Dealt out from one neat stack in the middle of the box, bottom of the pile first.
      const box = stage.current;
      if (box) {
        const b = box.getBoundingClientRect();
        const cx = b.left + b.width / 2;
        const cy = b.top + b.height / 2;
        imgs.forEach((el, i) => {
          const r = el.getBoundingClientRect();
          const rot = Number(el.dataset.rot || 0);
          gsap.from(el, {
            x: cx - (r.left + r.width / 2),
            y: cy - (r.top + r.height / 2) + 30,
            rotation: -rot,
            scale: 0.78,
            opacity: 0,
            duration: 1.15,
            ease: "power3.out",
            delay: 0.2 + i * 0.09,
          });
        });
      }
      // Scroll: each drifts at its own speed.
      imgs.forEach((el) => {
        gsap.to(el, {
          yPercent: Number(el.dataset.drift || 0),
          ease: "none",
          scrollTrigger: { trigger: root.current, start: "top top", end: "bottom top", scrub: true },
        });
      });
      // Mouse: a little depth, closer pieces move more.
      const area = root.current;
      if (area && window.matchMedia("(pointer: fine)").matches) {
        const layers = gsap.utils.toArray<HTMLElement>("[data-depth]").map((el) => ({
          depth: Number(el.dataset.depth || 1),
          x: gsap.quickTo(el, "x", { duration: 0.9, ease: "power3.out" }),
          y: gsap.quickTo(el, "y", { duration: 0.9, ease: "power3.out" }),
        }));
        const move = (e: PointerEvent) => {
          const r = area.getBoundingClientRect();
          const dx = (e.clientX - r.left) / r.width - 0.5;
          const dy = (e.clientY - r.top) / r.height - 0.5;
          layers.forEach((l) => (l.x(dx * 26 * l.depth), l.y(dy * 18 * l.depth)));
        };
        const leave = () => layers.forEach((l) => (l.x(0), l.y(0)));
        area.addEventListener("pointermove", move);
        area.addEventListener("pointerleave", leave);
        cleanup = () => {
          area.removeEventListener("pointermove", move);
          area.removeEventListener("pointerleave", leave);
        };
      }
    }, root);
    return () => {
      cleanup();
      ctx.revert();
    };
  }, []);

  return (
    <section
      ref={root}
      className="relative overflow-hidden pt-16 md:pt-28 pb-8"
      style={{ background: "var(--warm-white)" }}
    >
      <div className="container-x relative z-10 text-center">
        <h1
          className="font-display font-semibold leading-[1.1] tracking-[-0.02em] text-[var(--ink)]"
          style={{ fontSize: "clamp(2.4rem, 5vw, 3.6rem)" }}
        >
          Stationery Design
        </h1>
        <p className="mt-3 text-lg md:text-xl text-[var(--slate)]">
          Every detail, thoughtfully considered.
        </p>
      </div>

      <div className="container-x mt-8 md:mt-10">
        <div ref={stage} className="relative mx-auto aspect-[16/10] w-full max-w-[1000px] max-sm:w-[112%] max-sm:-mx-[6%]">
          {PIECES.map((p, i) => (
            <div
              key={p.src}
              data-depth={p.depth}
              className="pointer-events-none absolute"
              style={{ left: `${p.x}%`, top: `${p.y}%`, width: `${p.w}%`, zIndex: p.z, rotate: `${p.rot}deg` }}
            >
              <div className="sth-float" style={{ animationDuration: `${p.float}s`, animationDelay: `${-i * 0.9}s` }}>
                <img
                  data-piece
                  data-drift={p.drift}
                  data-rot={p.rot}
                  src={p.src}
                  alt=""
                  aria-hidden="true"
                  className="block h-auto w-full object-contain drop-shadow-[0_16px_28px_rgba(0,7,39,0.18)] will-change-transform"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="container-x mt-6 text-center">
        <Reveal
          as="h2"
          className="mx-auto max-w-2xl font-display text-[clamp(1.6rem,3vw,2.2rem)] font-semibold leading-[1.15] tracking-[-0.01em] text-[var(--ink)]"
        >
          Designed around <span className="text-[var(--slate)]">your story.</span>
        </Reveal>
        <Reveal as="p" delay={0.05} className="mx-auto mt-4 max-w-xl text-[var(--slate)]">
          Inspired by your story, every visual detail is thoughtfully curated and
          personalized to create a stationery suite that feels uniquely yours.
        </Reveal>
      </div>
    </section>
  );
}
