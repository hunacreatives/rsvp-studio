import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export default function MilestoneHero() {
  const root = useRef<HTMLDivElement | null>(null);
  const shot = useRef<HTMLImageElement | null>(null);
  const left = useRef<HTMLDivElement | null>(null);
  const right = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        shot.current,
        { scale: 0.9, y: 30 },
        {
          scale: 1,
          y: 0,
          ease: "none",
          scrollTrigger: {
            trigger: root.current,
            start: "top 75%",
            end: "top 25%",
            scrub: true,
          },
        },
      );
      gsap.to(left.current, {
        yPercent: -14,
        ease: "none",
        scrollTrigger: {
          trigger: root.current,
          start: "top bottom",
          end: "bottom top",
          scrub: true,
        },
      });
      gsap.to(right.current, {
        yPercent: 14,
        ease: "none",
        scrollTrigger: {
          trigger: root.current,
          start: "top bottom",
          end: "bottom top",
          scrub: true,
        },
      });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={root}
      className="relative pt-24 md:pt-32 pb-16 text-center overflow-hidden"
      style={{ background: "var(--warm-white)" }}
    >
      <div className="container-x relative z-10">
        <h1
          className="font-display font-semibold tracking-[-0.02em] leading-[1.1] text-[var(--ink)] mx-auto max-w-3xl text-balance"
          style={{ fontSize: "clamp(2rem, 4.6vw, 3.6rem)" }}
        >
          Milestone Event Websites
        </h1>
        <p className="mt-5 text-lg md:text-xl text-[var(--slate)] mx-auto max-w-xl">
          The website your guests experience before the celebration begins.
        </p>
      </div>

      <div className="relative mt-14 md:mt-20 px-4">
        {/* Flanking evite screens, drifting on scroll */}
        <div
          ref={left}
          className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 -translate-x-[38%] sm:-translate-x-[28%] lg:-translate-x-[14%] w-[190px] sm:w-[240px] lg:w-[280px] will-change-transform"
        >
          <img
            src="/services/milestone/semicustom-page.png"
            alt=""
            aria-hidden="true"
            className="w-full rounded-2xl shadow-[0_40px_80px_-40px_rgba(0,7,39,0.35)] opacity-95"
          />
        </div>
        <div
          ref={right}
          className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 translate-x-[38%] sm:translate-x-[28%] lg:translate-x-[14%] w-[190px] sm:w-[240px] lg:w-[280px] will-change-transform"
        >
          <img
            src="/services/milestone/tailored-page.png"
            alt=""
            aria-hidden="true"
            className="w-full rounded-2xl shadow-[0_40px_80px_-40px_rgba(0,7,39,0.35)] opacity-95"
          />
        </div>

        <img
          ref={shot}
          src="/services/milestone/carlo-laptop.png"
          alt="Carlo & Trixia wedding website shown on a laptop"
          className="relative z-10 mx-auto w-full max-w-4xl will-change-transform"
        />
        <p className="relative z-10 mt-8 font-display text-xl text-[var(--slate)]">
          Designed for every screen.
        </p>
      </div>
    </section>
  );
}
