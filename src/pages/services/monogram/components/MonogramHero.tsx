import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/** Scattered monogram / seal / botanical collage behind the title. */
const PIECES: {
  src: string;
  className: string;
  drift: number;
  alt?: string;
}[] = [
  { src: "/services/monogram/botanical-calla.png", className: "left-[9%] top-[8%] w-[9%] min-w-[70px]", drift: -20 },
  { src: "/services/monogram/mono-am.png", className: "left-[15%] top-[28%] w-[14%] min-w-[110px]", drift: 12 },
  { src: "/services/monogram/seal-am-bronze.png", className: "left-[12%] top-[50%] w-[11%] min-w-[90px]", drift: -14 },
  { src: "/services/monogram/crest-jl.png", className: "left-[26%] top-[16%] w-[12%] min-w-[100px]", drift: 16 },
  { src: "/services/monogram/seal-r-pair.png", className: "left-[27%] top-[52%] w-[12%] min-w-[100px]", drift: -10 },
  { src: "/services/monogram/crest-b.png", className: "left-1/2 -translate-x-1/2 top-[6%] w-[21%] min-w-[180px]", drift: 8 },
  { src: "/services/monogram/botanical-birds.png", className: "left-[59%] top-[8%] w-[11%] min-w-[90px]", drift: 18 },
  { src: "/services/monogram/botanical-rose.png", className: "left-[60%] top-[32%] w-[9%] min-w-[70px]", drift: -16 },
  { src: "/services/monogram/seal-a-gold.png", className: "right-[20%] top-[46%] w-[11%] min-w-[90px]", drift: 14 },
  { src: "/services/monogram/crest-cj.png", className: "right-[10%] top-[18%] w-[14%] min-w-[110px]", drift: -12 },
  { src: "/services/monogram/botanical-iris.png", className: "right-[8%] top-[4%] w-[9%] min-w-[70px]", drift: 20 },
  { src: "/services/monogram/seal-sf-blue.png", className: "right-[16%] top-[38%] w-[10%] min-w-[76px]", drift: -18 },
];

export default function MonogramHero() {
  const root = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>("[data-piece]").forEach((el) => {
        const drift = Number(el.dataset.drift || 0);
        gsap.to(el, {
          yPercent: drift,
          ease: "none",
          scrollTrigger: {
            trigger: root.current,
            start: "top bottom",
            end: "bottom top",
            scrub: true,
          },
        });
      });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={root}
      className="relative flex flex-col overflow-hidden pt-16 md:pt-28 pb-8 min-h-[calc(100svh-6.5rem)]"
      style={{ background: "var(--warm-white)" }}
    >
      <div className="container-x relative z-10 text-center">
        <h1
          className="font-display font-semibold tracking-[-0.02em] text-[var(--ink)]"
          style={{ fontSize: "clamp(2.4rem, 5vw, 3.6rem)" }}
        >
          Monograms
        </h1>
        <p className="mt-3 text-lg md:text-xl text-[var(--slate)]">
          A signature, made personal.
        </p>
      </div>

      <div className="relative mt-10 md:mt-14 h-[360px] sm:h-[440px] md:h-[500px]">
        {PIECES.map((p) => (
          <img
            key={p.src}
            data-piece
            data-drift={p.drift}
            src={p.src}
            alt={p.alt ?? ""}
            aria-hidden={p.alt ? undefined : "true"}
            className={`pointer-events-none absolute object-contain drop-shadow-[0_20px_40px_rgba(0,7,39,0.14)] will-change-transform ${p.className}`}
          />
        ))}
      </div>
    </section>
  );
}
