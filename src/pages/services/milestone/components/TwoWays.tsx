import { useNavigate } from "react-router-dom";
import { Reveal } from "@/lib/Reveal";

const OPTIONS = [
  {
    title: "Semi-Custom",
    lines: ["Beautifully refined.", "Built from our signature collection."],
    cta: "Explore Collection",
    to: "/collections",
    img: "/services/milestone/semicustom-page.png",
    alt: "Semi-custom wedding website — Mark & Nicole",
  },
  {
    title: "Tailored",
    lines: ["Designed around your story.", "Every detail, entirely yours."],
    cta: "Begin your project",
    to: "/enquire#start",
    img: "/services/milestone/tailored-page.png",
    alt: "Fully tailored wedding website — Our Story page",
  },
];

export default function TwoWays() {
  const navigate = useNavigate();
  const go = (to: string) => {
    const [p, h] = to.split("#");
    navigate(p || "/");
    if (h)
      setTimeout(
        () => document.getElementById(h)?.scrollIntoView({ behavior: "smooth" }),
        300,
      );
  };

  return (
    <section className="py-16 md:py-32" style={{ background: "var(--warm-white)" }}>
      <div className="container-x">
        <Reveal as="h2" className="h-section text-center text-[var(--ink)]">
          Two Ways to Celebrate
        </Reveal>

        <div className="mt-14 md:mt-16 grid gap-8 md:grid-cols-2">
          {OPTIONS.map((o, i) => (
            <Reveal
              key={o.title}
              delay={i * 0.08}
              className="rounded-3xl bg-[var(--paper)] p-8 md:p-10 text-center"
            >
              <h3 className="font-display text-2xl font-semibold text-[var(--ink)]">
                {o.title}
              </h3>
              <p className="mt-3 text-[var(--slate)]">
                {o.lines.map((l) => (
                  <span key={l} className="block">
                    {l}
                  </span>
                ))}
              </p>
              <button
                onClick={() => go(o.to)}
                className="mt-4 text-[var(--acc-blue)] font-medium hover:underline underline-offset-4"
              >
                {o.cta} ›
              </button>
              <div className="mt-8 overflow-hidden rounded-2xl shadow-[0_30px_60px_-30px_rgba(0,7,39,0.3)]">
                <img
                  src={o.img}
                  alt={o.alt}
                  className="w-full h-[360px] object-cover object-top"
                />
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
