import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

type Props = {
  eyebrow?: string;
  title: ReactNode;
  subtitle: string;
  ctaLabel: string;
  ctaTo: string;
  /** background gradient stack; a stand-in for editorial photography */
  bg: string;
};

export default function ImageBand({
  eyebrow,
  title,
  subtitle,
  ctaLabel,
  ctaTo,
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
      className="relative overflow-hidden isolate flex items-center justify-center text-center min-h-[520px] md:min-h-[600px] py-28"
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
        <p className="mt-4 text-white/85 text-lg mx-auto max-w-xl">{subtitle}</p>
        <button
          className="btn btn-white mt-8"
          onClick={() => {
            const [path, hash] = ctaTo.split("#");
            navigate(path || "/");
            if (hash)
              setTimeout(
                () =>
                  document
                    .getElementById(hash)
                    ?.scrollIntoView({ behavior: "smooth" }),
                300,
              );
          }}
        >
          {ctaLabel}
        </button>
      </div>
    </section>
  );
}
