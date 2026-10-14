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
  /** background gradient stack; a stand-in for editorial photography */
  bg: string;
};

export default function ImageBand({
  eyebrow,
  title,
  subtitle,
  ctaLabel,
  ctaTo,
  secondCta,
  bg,
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
        style={{ background: bg }}
      />
      <div className="absolute inset-0 -z-10 bg-[rgba(0,7,39,0.42)]" />

      <div className="container-x">
        {eyebrow && (
          <p className="eyebrow !text-white/70 mb-4">{eyebrow}</p>
        )}
        <h2 className="h-section text-white mx-auto max-w-3xl">{title}</h2>
        <p className="mt-4 text-white/85 text-base md:text-lg mx-auto max-w-xl">{subtitle}</p>
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
