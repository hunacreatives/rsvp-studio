import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Reveal } from "@/lib/Reveal";

type Props = {
  id?: string;
  title: string;
  subtitle: string;
  body?: string;
  ctaLabel?: string;
  ctaTo?: string;
  comingSoon?: boolean;
  reverse?: boolean;
  tone?: "white" | "paper";
  visual: ReactNode;
};

export default function ServiceRow({
  id,
  title,
  subtitle,
  body,
  ctaLabel,
  ctaTo,
  comingSoon,
  reverse,
  tone = "white",
  visual,
}: Props) {
  const navigate = useNavigate();
  const go = () => {
    if (!ctaTo) return;
    const [p, h] = ctaTo.split("#");
    navigate(p || "/");
    if (h)
      setTimeout(
        () => document.getElementById(h)?.scrollIntoView({ behavior: "smooth" }),
        300,
      );
  };

  return (
    <section
      id={id}
      className="py-20 md:py-28 overflow-hidden"
      style={{
        background:
          tone === "paper" ? "var(--paper)" : "var(--warm-white)",
      }}
    >
      <div
        className={`container-x grid items-center gap-12 md:gap-16 lg:grid-cols-2 ${
          reverse ? "lg:[&>*:first-child]:order-2" : ""
        }`}
      >
        <Reveal>
          {comingSoon && (
            <span className="inline-block rounded-full border border-[var(--line)] bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--slate)]">
              Coming Soon
            </span>
          )}
          <h2 className="h-section mt-4 text-[var(--ink)]">{title}</h2>
          <p className="mt-3 text-lg text-[var(--slate)]">{subtitle}</p>
          {body && (
            <p className="mt-4 max-w-md text-[var(--slate)]">{body}</p>
          )}
          {ctaLabel && ctaTo && (
            <button className="btn btn-primary mt-8" onClick={go}>
              {ctaLabel}
            </button>
          )}
        </Reveal>

        <Reveal delay={0.08} className="flex justify-center lg:justify-end">
          {visual}
        </Reveal>
      </div>
    </section>
  );
}
