import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Reveal } from "@/lib/Reveal";
import { inquiryLink } from "@/pages/enquire/prefill";

gsap.registerPlugin(ScrollTrigger);

// "Two Ways to Celebrate" + "Choose Your Experience" in one: each plan is a
// single card — what it is, an example, the price, how to start, what's in it.
const PLANS = [
  {
    title: "Semi-Custom",
    lines: ["Beautifully refined.", "Built from our signature collection."],
    price: "₱3,000",
    img: "/services/milestone/semicustom-site.webp",
    alt: "Semi-custom wedding website — Mark & Nicole",
    design: "semi-custom",
    second: { label: "See the designs", to: "/collections" },
    features: [
      { icon: "ri-layout-2-line", title: "Signature Layouts", copy: "Thoughtfully designed templates from our signature collection" },
      { icon: "ri-user-heart-line", title: "Personalized Content", copy: "We tailor the content to your story and celebration" },
      { icon: "ri-time-line", title: "Ready in 5–7 Business Days", copy: "From when we have your details and photos" },
      { icon: "ri-sparkling-line", title: "Elegant & Refined", copy: "Timeless designs with a curated, elevated look" },
      { icon: "ri-cursor-line", title: "Curated Interactions", copy: "Carefully selected animations and interactive elements" },
      { icon: "ri-global-line", title: "Own Domain (Add-on)", copy: "Add your own web address from ₱1,499 a year" },
    ],
  },
  {
    title: "Custom",
    lines: ["Designed around your story.", "Every detail, entirely yours."],
    price: "₱8,000",
    img: "/services/milestone/custom-site.webp",
    alt: "Custom wedding website — Carlo & Trixia’s homepage",
    design: "custom",
    second: { label: "See our work", to: "/portfolio#milestone" },
    features: [
      { icon: "ri-quill-pen-line", title: "Designed from Scratch", copy: "Everything is designed exclusively for you" },
      { icon: "ri-team-line", title: "Collaborative Design", copy: "A hands-on experience from start to finish" },
      { icon: "ri-time-line", title: "Ready in 3–4 Weeks", copy: "Three rounds of changes included" },
      { icon: "ri-magic-line", title: "Custom Animations", copy: "Custom interactions and animations designed uniquely for your site" },
      { icon: "ri-mail-check-line", title: "RSVP Management Included", copy: "We follow up with guests and send you the headcount" },
      { icon: "ri-global-line", title: "Free Domain", copy: "A free .com or .net for the first year, subject to availability" },
    ],
  },
] as const;

export default function ExperienceSection() {
  const navigate = useNavigate();
  const root = useRef<HTMLElement | null>(null);

  // Each example site pans slowly inside its frame as the section scrolls by.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>("[data-pan]").forEach((el) => {
        gsap.fromTo(
          el,
          { yPercent: 0 },
          { yPercent: -10, ease: "none", scrollTrigger: { trigger: el.parentElement, start: "top bottom", end: "bottom top", scrub: true } },
        );
      });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={root} className="py-16 md:py-28" style={{ background: "var(--paper)" }}>
      <div className="container-x">
        <Reveal className="text-center">
          <h2 className="h-section text-[var(--ink)]">Two Ways to Celebrate</h2>
          <p className="mt-3 text-lg text-[var(--slate)]">Choose your experience.</p>
        </Reveal>

        <div className="mx-auto mt-10 grid max-w-[1040px] gap-6 md:mt-14 md:grid-cols-2 md:gap-8">
          {PLANS.map((p, i) => (
            <Reveal key={p.title} delay={i * 0.12} className="h-full">
              <article className="flex h-full flex-col rounded-[28px] bg-white p-5 shadow-[0_18px_40px_-30px_rgba(0,7,39,0.25)] transition-[transform,box-shadow] duration-500 ease-out hover:-translate-y-1.5 hover:shadow-[0_30px_60px_-30px_rgba(0,7,39,0.35)] sm:p-8 md:p-10">
                <header className="text-center">
                  <h3 className="font-display text-2xl font-semibold text-[var(--ink)]">{p.title}</h3>
                  <p className="mt-2 text-[var(--slate)]">
                    {p.lines.map((l) => (
                      <span key={l} className="block">
                        {l}
                      </span>
                    ))}
                  </p>
                </header>

                <div className="mt-6 aspect-[4/3] overflow-hidden rounded-2xl bg-[var(--paper)]">
                  <img
                    data-pan
                    src={p.img}
                    alt={p.alt}
                    className="h-[112%] w-full object-cover object-top will-change-transform"
                  />
                </div>

                <p className="mt-6 text-center text-[var(--slate)]">
                  starts at <span className="font-semibold text-[var(--acc-blue)]">{p.price}</span>
                </p>
                <div className="mt-4 flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center">
                  <button
                    className="btn btn-primary max-[380px]:px-4 max-[380px]:text-[12px] max-[380px]:tracking-[0.06em]"
                    aria-label={`Get a ${p.title} quote`}
                    onClick={() => navigate(inquiryLink({ service: "website", design: p.design }))}
                  >
                    Get a quote
                  </button>
                  <button className="btn btn-ghost" onClick={() => navigate(p.second.to)}>
                    {p.second.label}
                  </button>
                </div>

                <ul className="mt-8 space-y-5 border-t border-[var(--line)] pt-7">
                  {p.features.map((f, j) => (
                    <Reveal as="li" key={f.title} delay={0.05 * j} className="flex items-start gap-3.5 text-left">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--paper)] text-lg text-[var(--ink)]">
                        <i className={f.icon} />
                      </span>
                      <div>
                        <p className="font-semibold text-[var(--ink)]">{f.title}</p>
                        <p className="mt-0.5 text-sm text-[var(--slate)]">{f.copy}</p>
                      </div>
                    </Reveal>
                  ))}
                </ul>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
