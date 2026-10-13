import { useNavigate } from "react-router-dom";
import { Reveal } from "@/lib/Reveal";
import { inquiryLink } from "@/pages/enquire/prefill";

const PLANS = [
  {
    title: "Semi-Custom",
    price: "₱3,000",
    img: "/services/milestone/semicustom-page.webp",
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
    price: "₱8,000",
    img: "/services/milestone/tailored-page.webp",
    features: [
      { icon: "ri-quill-pen-line", title: "Designed from Scratch", copy: "Everything is designed exclusively for you" },
      { icon: "ri-team-line", title: "Collaborative Design", copy: "A hands-on experience from start to finish" },
      { icon: "ri-time-line", title: "Ready in 3–4 Weeks", copy: "Two rounds of changes included" },
      { icon: "ri-magic-line", title: "Custom Animations", copy: "Custom interactions and animations designed uniquely for your site" },
      { icon: "ri-mail-check-line", title: "RSVP Management Included", copy: "We follow up with guests and send you the headcount" },
      { icon: "ri-global-line", title: "Free Domain", copy: "A free .com or .net for the first year, subject to availability" },
    ],
  },
];

export default function ChooseExperience() {
  const navigate = useNavigate();
  return (
    <section className="py-16 md:py-32" style={{ background: "var(--paper)" }}>
      <div className="container-x">
        <Reveal as="h2" className="h-section text-center text-[var(--ink)]">
          Choose Your Experience.
        </Reveal>

        <div className="mt-10 md:mt-16 grid gap-6 md:gap-10 md:grid-cols-2 md:divide-x md:divide-[var(--line)]">
          {PLANS.map((p, i) => (
            <Reveal key={p.title} delay={i * 0.08} className="rounded-3xl bg-white p-4 min-[381px]:p-5 shadow-[0_18px_40px_-30px_rgba(0,7,39,0.2)] sm:p-8 md:rounded-none md:bg-transparent md:p-0 md:px-8 md:shadow-none first:md:pl-0 last:md:pr-0">
              <h3 className="font-display text-2xl font-semibold text-center text-[var(--ink)]">
                {p.title}
              </h3>
              <div className="mt-5 md:mt-6 overflow-hidden rounded-2xl shadow-[0_28px_56px_-30px_rgba(0,7,39,0.3)]">
                <img src={p.img} alt={`${p.title} example`} className="w-full h-[220px] sm:h-[300px] object-cover object-top" />
              </div>
              <p className="mt-5 md:mt-6 text-center text-[var(--slate)]">
                starts at{" "}
                <span className="font-semibold text-[var(--acc-blue)]">{p.price}</span>
              </p>
              <div className="mt-5 flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center">
                <button
                  className="btn btn-primary max-[380px]:px-4 max-[380px]:text-[12px] max-[380px]:tracking-[0.06em]"
                  onClick={() => navigate(inquiryLink({ service: "website", design: p.title === "Custom" ? "custom" : "semi-custom" }))}
                >
                  Get a {p.title} quote
                </button>
                {p.title === "Semi-Custom" ? (
                  <button className="btn btn-ghost" onClick={() => navigate("/collections")}>
                    See the designs
                  </button>
                ) : (
                  <button className="btn btn-ghost" onClick={() => navigate("/portfolio#milestone")}>
                    See our work
                  </button>
                )}
              </div>

              {/* Phones: compact left-aligned list; md+: centred stack. */}
              <ul className="mt-8 space-y-4 border-t border-[var(--line)] pt-6 md:mt-10 md:space-y-8 md:border-0 md:pt-0">
                {p.features.map((f) => (
                  <li key={f.title} className="flex items-start gap-3 text-left md:block md:text-center">
                    <i className={`${f.icon} shrink-0 text-xl leading-6 md:text-2xl text-[var(--ink)]`} />
                    <div>
                      <p className="font-semibold text-[var(--ink)] md:mt-2">{f.title}</p>
                      <p className="mt-0.5 md:mt-1 text-sm text-[var(--slate)] md:max-w-xs md:mx-auto">
                        {f.copy}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
