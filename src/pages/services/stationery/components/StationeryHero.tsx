import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Reveal } from "@/lib/Reveal";
import "./stationery-hero.css";

gsap.registerPlugin(ScrollTrigger);

// The collage: a real flat-lay. The pieces overlap like a stationery collection laid on a
// table, layered by z. On load they start as one neat stack in the middle and are dealt out
// into the pile, each turning to its own angle; then they bob gently, drift on scroll, and
// (with a mouse) shift a little by depth. Two layouts, both % of their box so they scale:
//   wide (md and up): spread across a 1160×640 box, pieces just touching.
//   phone: the tight cluster from Francis's "Stationery Design (Essentials)" mockup, 800×683.
//   depth: how far it follows the mouse. float: seconds per bob. z: stacking order.
type Spot = { x: number; y: number; w: number; z: number; rot: number };
type Piece = { src: string; wide: Spot; phone: Spot; drift: number; depth: number; float: number };
const PIECES: Piece[] = [
  { src: "/services/stationery/hero-sun-lucia.webp", wide: { x: 0, y: 61.19, w: 31.9, z: 2, rot: -10 }, phone: { x: 60.7, y: 65.1, w: 34.97, z: 5, rot: 18.8 }, drift: 7, depth: 1.3, float: 6.5 },
  { src: "/services/stationery/hero-hibiscus-daniela.webp", wide: { x: 2.16, y: 7.01, w: 24.14, z: 1, rot: -6 }, phone: { x: 4.16, y: 6.82, w: 31.68, z: 2, rot: -6.7 }, drift: -6, depth: 0.6, float: 7 },
  { src: "/services/stationery/hero-orchid-isabella.webp", wide: { x: 19.18, y: 14.05, w: 32.33, z: 3, rot: 12 }, phone: { x: 21.56, y: 10.86, w: 42.99, z: 3, rot: 19.1 }, drift: -5, depth: 0.8, float: 8 },
  { src: "/services/stationery/hero-tassel-alessandra.webp", wide: { x: 24.57, y: 42.95, w: 17.24, z: 4, rot: 5 }, phone: { x: 12.77, y: 41.95, w: 21.49, z: 9, rot: -8.4 }, drift: 6, depth: 1.2, float: 7.5 },
  { src: "/services/stationery/hero-fan-natalia.webp", wide: { x: 40.3, y: 16.41, w: 29.74, z: 5, rot: 4 }, phone: { x: 41.85, y: 15.05, w: 36.26, z: 10, rot: 7.8 }, drift: -6, depth: 1.4, float: 6 },
  { src: "/services/stationery/hero-lace-camille.webp", wide: { x: 34.91, y: 46.86, w: 33.62, z: 7, rot: -3 }, phone: { x: 29.83, y: 36.59, w: 43.15, z: 1, rot: 0 }, drift: -4, depth: 0.4, float: 9 },
  { src: "/services/stationery/hero-heart-sofia.webp", wide: { x: 62.07, y: 14.23, w: 22.41, z: 8, rot: 8 }, phone: { x: 61.63, y: 3.92, w: 24.51, z: 4, rot: 9.4 }, drift: 5, depth: 0.9, float: 6 },
  { src: "/services/stationery/hero-shore-andrea.webp", wide: { x: 57.54, y: 51.04, w: 28.02, z: 6, rot: 6 }, phone: { x: 29.76, y: 68.22, w: 32.41, z: 7, rot: 3.9 }, drift: -8, depth: 1.1, float: 5.5 },
  { src: "/services/stationery/hero-diamond-bianca.webp", wide: { x: 79.09, y: 11.9, w: 19.4, z: 9, rot: 9 }, phone: { x: 64.25, y: 25.33, w: 23.56, z: 6, rot: 11.1 }, drift: 6, depth: 0.9, float: 7 },
  { src: "/services/stationery/hero-orchid-gabriela.webp", wide: { x: 77.16, y: 54.08, w: 22.41, z: 10, rot: -6 }, phone: { x: 54.34, y: 55.91, w: 24.52, z: 8, rot: 0 }, drift: 10, depth: 1.5, float: 5 },
];

// The CSS variables stationery-hero.css reads; it switches from phone to wide at 768px.
const spotVars = ({ wide: d, phone: m }: Piece) =>
  ({
    "--x": `${d.x}%`, "--y": `${d.y}%`, "--w": `${d.w}%`, "--z": d.z, "--r": `${d.rot}deg`,
    "--mx": `${m.x}%`, "--my": `${m.y}%`, "--mw": `${m.w}%`, "--mz": m.z, "--mr": `${m.rot}deg`,
  }) as React.CSSProperties;

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
        const wide = window.matchMedia("(min-width: 768px)").matches;
        imgs.forEach((el, i) => {
          const r = el.getBoundingClientRect();
          const rot = Number((wide ? el.dataset.rot : el.dataset.mrot) || 0);
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
        <div ref={stage} className="relative mx-auto aspect-[800/683] w-full max-w-[800px] max-sm:w-[112%] max-sm:-mx-[6%] md:aspect-[1160/640] md:max-w-[1160px]">
          {PIECES.map((p, i) => (
            <div key={p.src} data-depth={p.depth} className="sth-piece pointer-events-none absolute" style={spotVars(p)}>
              <div className="sth-float" style={{ animationDuration: `${p.float}s`, animationDelay: `${-i * 0.9}s` }}>
                <img
                  data-piece
                  data-drift={p.drift}
                  data-rot={p.wide.rot}
                  data-mrot={p.phone.rot}
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
