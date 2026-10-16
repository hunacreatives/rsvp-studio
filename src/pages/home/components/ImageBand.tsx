import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { goTo } from "@/lib/goTo";

gsap.registerPlugin(ScrollTrigger);

type Props = {
  eyebrow?: string;
  title: ReactNode;
  subtitle: string;
  ctaLabel: string;
  ctaTo: string;
  /** A second button beside the first, same weight (e.g. one per audience). */
  secondCta?: { label: string; to: string };
  /** background photo */
  image?: string;
  /** gradient stack, where there's no photo yet */
  bg?: string;
  /** extra softening for the photo, in px */
  blur?: number;
};

export default function ImageBand({
  eyebrow,
  title,
  subtitle,
  ctaLabel,
  ctaTo,
  secondCta,
  image,
  bg,
  blur,
}: Props) {
  const navigate = useNavigate();
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
      className="relative overflow-hidden isolate flex items-center justify-center text-center min-h-[380px] md:min-h-[600px] py-20 md:py-28"
    >
      <div
        ref={layer}
        className="absolute inset-0 -z-10 scale-110"
        style={{
          background: image ? `url(${image}) center / cover no-repeat` : bg,
          // the layer is scaled 110% inside overflow-hidden, so blurred edges never show
          filter: blur ? `blur(${blur}px)` : undefined,
        }}
      />
      {/* Photos get shade only behind the text, so the edges keep their colour. */}
      <div
        className="absolute inset-0 -z-10"
        style={{
          background: image
            ? "radial-gradient(ellipse 55% 60% at 50% 50%, rgba(0,7,39,0.38), rgba(0,7,39,0.06) 100%)"
            : "rgba(0,7,39,0.42)",
        }}
      />

      <div className="container-x">
        {eyebrow && (
          <p className="eyebrow !text-white/70 mb-4">{eyebrow}</p>
        )}
        <h2 className="h-section text-white mx-auto max-w-3xl [text-shadow:0_2px_24px_rgba(0,7,39,0.35)]">{title}</h2>
        <p className="mt-4 text-white/90 [text-shadow:0_1px_12px_rgba(0,7,39,0.4)] text-base md:text-lg mx-auto max-w-xl">{subtitle}</p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          {[{ label: ctaLabel, to: ctaTo }, ...(secondCta ? [secondCta] : [])].map((c) => (
            <button
              key={c.to}
              className="btn btn-white max-w-full text-balance"
              onClick={() => goTo(navigate, c.to)}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
