import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export default function ServicesHero() {
  const root = useRef<HTMLDivElement | null>(null);
  const layer = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        layer.current,
        { yPercent: -12 },
        {
          yPercent: 12,
          ease: "none",
          scrollTrigger: {
            trigger: root.current,
            start: "top bottom",
            end: "bottom top",
            scrub: true,
          },
        },
      );
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={root}
      className="relative isolate overflow-hidden flex items-center min-h-[560px] md:min-h-[640px] pt-28 pb-20"
    >
      <div
        ref={layer}
        className="absolute inset-0 -z-10 scale-110"
        style={{
          background:
            "radial-gradient(120% 120% at 25% 15%, #efe0d4 0%, #e7c9c2 45%, #cdbcc9 100%)",
        }}
      />
      <div className="absolute inset-0 -z-10 bg-[rgba(0,7,39,0.4)]" />

      <div className="container-x text-center">
        <h1
          className="font-display font-semibold tracking-[-0.02em] leading-[1.1] text-white mx-auto max-w-4xl text-balance"
          style={{ fontSize: "clamp(2rem, 4.4vw, 3.6rem)" }}
        >
          Designed for Celebrations Worth Remembering
        </h1>
        <p className="mt-6 text-white/85 text-lg mx-auto max-w-2xl">
          We create digital experiences that feel intentional — from the very
          first impression to the very last detail.
        </p>
      </div>
    </section>
  );
}
