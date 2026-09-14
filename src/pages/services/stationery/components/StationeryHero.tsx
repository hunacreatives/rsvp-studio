import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Reveal } from "@/lib/Reveal";

gsap.registerPlugin(ScrollTrigger);

const PIECES: { src: string; className: string; drift: number }[] = [
  { src: "/services/stationery/hero-map.png", className: "left-[2%] top-[2%] w-[35%] min-w-[240px]", drift: -10 },
  { src: "/services/stationery/hero-heart.png", className: "left-[47%] top-[5%] w-[22%] min-w-[150px]", drift: 6 },
  { src: "/services/stationery/hero-palm-invite.png", className: "right-[16%] top-[1%] w-[21%] min-w-[150px]", drift: -8 },
  { src: "/services/stationery/hero-flower.png", className: "left-[31%] top-[29%] w-[12%] min-w-[80px]", drift: 12 },
  { src: "/services/stationery/hero-rsvp-oval.png", className: "left-[-2%] top-[44%] w-[19%] min-w-[130px]", drift: 9 },
  { src: "/services/stationery/hero-coconut.png", className: "left-[21%] top-[47%] w-[11%] min-w-[72px]", drift: -12 },
  { src: "/services/stationery/hero-sparkle.png", className: "left-[34%] top-[54%] w-[5%] min-w-[30px]", drift: 16 },
  { src: "/services/stationery/hero-turtle.png", className: "left-[24%] top-[68%] w-[15%] min-w-[100px]", drift: 8 },
  { src: "/services/stationery/hero-building.png", className: "left-[55%] top-[56%] w-[34%] min-w-[240px]", drift: -6 },
  { src: "/services/stationery/hero-ornate-invite.png", className: "right-[1%] top-[33%] w-[22%] min-w-[150px]", drift: 10 },
];

export default function StationeryHero() {
  const root = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>("[data-piece]").forEach((el) => {
        gsap.to(el, {
          yPercent: Number(el.dataset.drift || 0),
          ease: "none",
          scrollTrigger: { trigger: root.current, start: "top bottom", end: "bottom top", scrub: true },
        });
      });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={root}
      className="relative overflow-hidden pt-16 md:pt-28 pb-8"
      style={{ background: "var(--warm-white)" }}
    >
      <div className="container-x relative z-10 text-center">
        <h1
          className="font-display font-semibold tracking-[-0.02em] text-[var(--ink)]"
          style={{ fontSize: "clamp(2.4rem, 5vw, 3.6rem)" }}
        >
          Stationery Design
        </h1>
        <p className="mt-3 text-lg md:text-xl text-[var(--slate)]">
          Every detail, thoughtfully considered.
        </p>
      </div>

      <div className="container-x relative mt-8 h-[420px] sm:h-[520px] md:h-[600px] lg:h-[640px]">
        {PIECES.map((p) => (
          <img
            key={p.src}
            data-piece
            data-drift={p.drift}
            src={p.src}
            alt=""
            aria-hidden="true"
            className={`pointer-events-none absolute object-contain drop-shadow-[0_18px_40px_rgba(0,7,39,0.14)] will-change-transform ${p.className}`}
          />
        ))}
      </div>

      <div className="container-x mt-6 text-center">
        <Reveal
          as="h2"
          className="mx-auto max-w-2xl font-display text-[clamp(1.6rem,3vw,2.2rem)] font-semibold tracking-[-0.01em] text-[var(--ink)]"
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
