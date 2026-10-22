import { useEffect, useLayoutEffect, useRef } from "react";
import type { CSSProperties } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Reveal } from "@/lib/Reveal";

gsap.registerPlugin(ScrollTrigger);

/**
 * Monogram / seal / botanical cluster under the title, laid out from the
 * design (positions are % of the cluster box, listed back to front).
 *
 * Motion follows the site's vocabulary: pieces fade up with the Reveal timing
 * (centre crest first), drift on scroll like the Stationery hero, and the
 * metal pieces float with a sweep of light — the same motion as the Monogram
 * tile on the Services page.
 */
const PIECES: { name: string; left: number; top: number; width: number; drift: number; metal?: boolean }[] = [
  { name: "calla", left: 7.14, top: 0, width: 12.97, drift: -18 },
  { name: "circle-f", left: 0, top: 22.76, width: 18.97, drift: 10 },
  { name: "seal-ao", left: 2.97, top: 61.38, width: 13.02, drift: -12, metal: true },
  { name: "oval-bk", left: 17.82, top: 16.87, width: 15.26, drift: 14 },
  { name: "card-ajl", left: 14.14, top: 53.17, width: 14.45, drift: -8 },
  { name: "pearl-flower", left: 23.57, top: 80.94, width: 8.5, drift: 16 },
  { name: "crest-lc", left: 29.72, top: 18.41, width: 34.6, drift: 6 },
  { name: "birds", left: 59.65, top: 18.59, width: 15.81, drift: -20, metal: true },
  { name: "peony", left: 64.63, top: 35.29, width: 10.98, drift: 12 },
  { name: "seal-g", left: 62.77, top: 56.28, width: 14.03, drift: -10, metal: true },
  { name: "iris", left: 87.88, top: 31.43, width: 12.12, drift: 18 },
  { name: "circle-am", left: 76.86, top: 54.18, width: 18, drift: -14 },
  { name: "seal-t", left: 73.83, top: 20.23, width: 15.54, drift: 10, metal: true },
];

// Entrance order: nearest the centre crest first (Reveal spec: 28px, 0.9s, stagger 0.04).
const CENTRE = { x: 47, y: 45 };
const ORDER = [...PIECES]
  .map((p) => ({ name: p.name, d: Math.hypot(p.left + p.width / 2 - CENTRE.x, p.top + 20 - CENTRE.y) }))
  .sort((a, b) => a.d - b.d)
  .map((p) => p.name);

const src = (name: string) => `/services/monogram/hero/${name}.webp`;
const still = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export default function MonogramHero() {
  const root = useRef<HTMLDivElement | null>(null);

  // Hidden before first paint, then faded up — no flash of the settled cluster.
  useLayoutEffect(() => {
    if (still()) return;
    const ctx = gsap.context(() => {
      ORDER.forEach((name, i) => {
        gsap.from(`[data-piece="${name}"]`, {
          opacity: 0,
          y: 28,
          duration: 0.9,
          ease: "expo.out", // ≈ the Reveal curve cubic-bezier(0.16, 1, 0.3, 1)
          delay: 0.15 + i * 0.04,
        });
      });
    }, root);
    return () => ctx.revert();
  }, []);

  useEffect(() => {
    if (still()) return;
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>("[data-piece-drift]").forEach((el) => {
        gsap.to(el, {
          yPercent: Number(el.dataset.pieceDrift || 0),
          ease: "none",
          scrollTrigger: { trigger: root.current, start: "top top", end: "bottom top", scrub: true },
        });
      });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={root}
      className="relative overflow-hidden pt-16 md:pt-24 pb-16 md:pb-24"
      style={{ background: "var(--warm-white)" }}
    >
      <Reveal className="container-x relative z-10 text-center">
        <h1
          className="font-display font-semibold leading-[1.1] tracking-[-0.02em] text-[var(--ink)]"
          style={{ fontSize: "clamp(2.4rem, 5vw, 3.6rem)" }}
        >
          Monograms
        </h1>
        <p className="mt-3 text-lg md:text-xl text-[var(--slate)]">A signature, made personal.</p>
      </Reveal>

      {/* Wider than the screen on phones so the pieces stay legible; edges clip. */}
      <div
        className="relative left-1/2 mt-6 md:mt-4 w-[min(1000px,135vw)] -translate-x-1/2"
        style={{ aspectRatio: "954 / 446" }}
      >
        {PIECES.map((p, i) => (
          <div
            key={p.name}
            data-piece-drift={p.drift}
            className="absolute will-change-transform"
            style={{ left: `${p.left}%`, top: `${p.top}%`, width: `${p.width}%` }}
          >
            <div data-piece={p.name}>
              {p.metal ? (
                // Float + light sweep masked to this piece's own shape; staggered so
                // the four never shine at once.
                <div
                  className="svc-mono"
                  style={
                    {
                      "--shine-mask": `url(${src(p.name)})`,
                      animationDelay: `${-i * 1.1}s`,
                    } as CSSProperties
                  }
                >
                  <img src={src(p.name)} alt="" aria-hidden="true" className={IMG} />
                  <span className="svc-mono-shine" aria-hidden style={{ animationDelay: `${1 + i * 0.6}s` }} />
                </div>
              ) : (
                <img src={src(p.name)} alt="" aria-hidden="true" className={IMG} />
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

const IMG = "pointer-events-none block w-full drop-shadow-[0_18px_30px_rgba(0,7,39,0.12)]";
