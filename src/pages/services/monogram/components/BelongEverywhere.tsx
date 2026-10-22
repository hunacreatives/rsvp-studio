import { useEffect, useRef } from "react";
import type { CSSProperties } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Reveal } from "@/lib/Reveal";
import Carousel from "./Carousel";

gsap.registerPlugin(ScrollTrigger);

const PLACES = [
  { label: "Website", img: "/services/monogram/phone-seal.png" },
  { label: "Invitations", img: "/services/monogram/invitation-crest.png" },
  { label: "Envelope", img: "/services/monogram/envelope-green.webp" },
  { label: "Wax Seal", img: "/services/monogram/seal-sf-blue.png" },
  { label: "Menu", img: "/services/monogram/menu-silk.webp", cover: true },
  { label: "Napkin", img: "/services/monogram/seal-r-pair.png" },
];

export default function BelongEverywhere() {
  const root = useRef<HTMLElement | null>(null);

  // Each object sits a little deeper than its card and drifts as the row
  // scrolls by (the ImageBand parallax, scaled down for a card).
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>("[data-depth]").forEach((el) => {
        const cover = el.dataset.depth === "cover";
        gsap.fromTo(
          el,
          { yPercent: cover ? 0 : 7 },
          {
            yPercent: cover ? -10 : -7,
            ease: "none",
            scrollTrigger: { trigger: root.current, start: "top bottom", end: "bottom top", scrub: true },
          },
        );
      });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={root} className="overflow-hidden py-16 md:py-28" style={{ background: "var(--warm-white)" }}>
      <div className="container-x">
        <Reveal as="h2" className="h-section text-[var(--slate)]">
          Designed to belong <span className="text-[var(--ink)]">everywhere.</span>
        </Reveal>

        <div className="mt-10 md:mt-12">
          <Carousel ariaLabel="Where your monogram appears">
            {PLACES.map((p, i) => (
              <Reveal
                as="figure"
                key={p.label}
                delay={(i % 4) * 0.06}
                className="group relative snap-start shrink-0 w-[74%] sm:w-[44%] lg:w-[23.5%] aspect-[274/318] overflow-hidden rounded-[22px] bg-[#f4f4f6]"
              >
                <figcaption className="relative z-10 px-6 pt-6 text-[22px] font-bold tracking-[-0.01em] text-[var(--ink)]">
                  {p.label}
                </figcaption>
                {p.cover ? (
                  // Real photo fills the lower card and pans inside it.
                  <div className="absolute bottom-0 left-[8%] right-0 top-[26%] overflow-hidden rounded-tl-lg">
                    <div className="h-full w-full transition-transform duration-700 ease-out group-hover:scale-[1.03]">
                      <img
                        data-depth="cover"
                        src={p.img}
                        alt={`Monogram on ${p.label.toLowerCase()}`}
                        className="h-[112%] w-full object-cover object-top"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="absolute inset-x-0 bottom-0 top-[26%] px-8 pb-6">
                    <div data-depth="object" className="h-full w-full">
                      {/* Object + its light share one box; both use "contain", so
                          the hover shine lines up with the object exactly. */}
                      <div
                        className="relative h-full w-full transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                        style={{ "--shine-mask": `url(${p.img})` } as CSSProperties}
                      >
                        <img
                          src={p.img}
                          alt={`Monogram on ${p.label.toLowerCase()}`}
                          className="h-full w-full object-contain"
                        />
                        <span className="shine-pass shine-pass--hover shine-pass--contain" aria-hidden />
                      </div>
                    </div>
                  </div>
                )}
              </Reveal>
            ))}
          </Carousel>
        </div>
      </div>
    </section>
  );
}
