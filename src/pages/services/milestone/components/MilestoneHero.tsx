import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

// The active site plays on the laptop; the other two sit either side.
// Real sites we made (first screen at 1366×768; tercel/gel/frances captured live Oct 2026).
const SLIDES = [
  { src: "/services/milestone/hero-mark-nicole.webp", alt: "Mark & Nicole wedding website" },
  { src: "/services/milestone/hero-carlo.webp", alt: "Carlo & Trixia wedding website" },
  { src: "/services/milestone/hero-claudy.webp", alt: "Claudy Turns 30 birthday website" },
  { src: "/services/milestone/hero-frances.webp", alt: "Frances Jash’s first birthday website" },
  { src: "/services/milestone/hero-tercel.webp", alt: "Tercel’s 41st birthday website" },
  { src: "/services/milestone/hero-gel.webp", alt: "Gel Turns 30 birthday website" },
];
const START = 1;
const INTERVAL_MS = 3000;

export default function MilestoneHero() {
  const root = useRef<HTMLDivElement | null>(null);
  const laptop = useRef<HTMLDivElement | null>(null);
  const [active, setActive] = useState(START);

  const n = SLIDES.length;
  const prev = (active + n - 1) % n;
  const next = (active + 1) % n;

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        laptop.current,
        { scale: 0.92, y: 24 },
        {
          scale: 1,
          y: 0,
          ease: "none",
          scrollTrigger: { trigger: root.current, start: "top 75%", end: "top 25%", scrub: true },
        },
      );
      // Side screens rise together (slower than the page) — level at rest.
      gsap.fromTo(
        "[data-drift]",
        { yPercent: 0 },
        { yPercent: -14, ease: "none", scrollTrigger: { trigger: root.current, start: "top top", end: "bottom top", scrub: true } },
      );
    }, root);
    return () => ctx.revert();
  }, []);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Restarts after every change, so a click gets a full 3s before the next slide.
    const t = window.setTimeout(() => setActive((i) => (i + 1) % n), INTERVAL_MS);
    return () => window.clearTimeout(t);
  }, [active, n]);

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
        <p className="mt-5 text-lg md:text-xl text-[var(--slate)] mx-auto max-w-xl text-balance">
          The website your guests experience before the celebration begins.
        </p>
      </div>

      <div className="relative mx-auto mt-12 md:mt-16 max-w-[1440px]">
        {/* Side screens — the slides before and after the active one. */}
        <SideScreen side="left" index={prev} onPick={() => setActive(prev)} />
        <SideScreen side="right" index={next} onPick={() => setActive(next)} />

        {/* Laptop: the frame's own screen is covered by the active slide. */}
        <div
          ref={laptop}
          className="relative z-10 mx-auto w-[74%] sm:w-[58%] lg:w-[40%] will-change-transform"
        >
          <img
            src="/services/milestone/carlo-laptop.webp"
            alt=""
            aria-hidden="true"
            className="w-full"
          />
          {/* black strip around the camera notch (hides the frame's baked-in screen) */}
          <span aria-hidden="true" className="absolute bg-black" style={{ left: "10.07%", width: "79.93%", top: "3.29%", height: "3.4%" }} />
          <div className="absolute overflow-hidden" style={{ left: "10.07%", width: "79.93%", top: "6.58%", height: "81.79%" }}>
            {SLIDES.map((s, i) => (
              <img
                key={s.src}
                src={s.src}
                alt={i === active ? `${s.alt}, shown on a laptop` : ""}
                aria-hidden={i === active ? undefined : true}
                className={`absolute inset-0 h-full w-full object-cover object-top transition-opacity duration-700 ${
                  i === active ? "opacity-100" : "opacity-0"
                }`}
              />
            ))}
          </div>
        </div>

        <div className="relative z-10 mt-6 flex items-center justify-center gap-2" role="tablist" aria-label="Example websites">
          {SLIDES.map((s, i) => (
            <button
              key={s.src}
              type="button"
              role="tab"
              aria-selected={i === active}
              aria-label={s.alt}
              onClick={() => setActive(i)}
              className="grid h-6 place-items-center px-0.5"
            >
              <span
                className={`block h-2 rounded-full transition-all duration-500 ${
                  i === active ? "w-10 bg-[var(--ink)]/35" : "w-2 bg-[var(--ink)]/15 hover:bg-[var(--ink)]/30"
                }`}
              />
            </button>
          ))}
        </div>
      </div>

      <p className="relative z-10 mt-8 sm:mt-10 px-4 font-display text-xl text-[var(--slate)]">
        Designed for every screen.
      </p>
    </section>
  );
}

function SideScreen({ side, index, onPick }: { side: "left" | "right"; index: number; onPick: () => void }) {
  const left = side === "left";
  return (
    <button
      type="button"
      onClick={onPick}
      aria-label={`Show ${SLIDES[index].alt}`}
      tabIndex={-1}
      className={`absolute top-[46%] -translate-y-1/2 w-[38%] sm:w-[32%] lg:w-[30%] aspect-[1119/660] ${
        left
          ? "left-0 -translate-x-[42%] sm:-translate-x-[20%] lg:translate-x-0 lg:left-[2%]"
          : "right-0 translate-x-[42%] sm:translate-x-[20%] lg:translate-x-0 lg:right-[2%]"
      }`}
    >
      <span
        data-drift={side}
        className="absolute inset-0 block will-change-transform"
        style={{
          WebkitMaskImage: `linear-gradient(to ${left ? "right" : "left"}, transparent 0%, #000 22%), linear-gradient(to top, transparent 0%, #000 18%)`,
          WebkitMaskComposite: "source-in",
          maskImage: `linear-gradient(to ${left ? "right" : "left"}, transparent 0%, #000 22%), linear-gradient(to top, transparent 0%, #000 18%)`,
          maskComposite: "intersect",
        }}
      >
        {SLIDES.map((s, i) => (
          <img
            key={s.src}
            src={s.src}
            alt=""
            aria-hidden="true"
            className={`absolute inset-0 h-full w-full object-cover object-top transition-opacity duration-700 ${
              i === index ? "opacity-90" : "opacity-0"
            }`}
          />
        ))}
      </span>
    </button>
  );
}
