import { Reveal } from "@/lib/Reveal";

const PLANS = [
  {
    title: "Semi-Custom",
    price: "₱3,000",
    img: "/services/milestone/semicustom-page.png",
    features: [
      { icon: "ri-layout-2-line", title: "Signature Layouts", copy: "Thoughtfully designed templates from our signature collection" },
      { icon: "ri-user-heart-line", title: "Personalized Content", copy: "We tailor the content to your story and celebration" },
      { icon: "ri-time-line", title: "Faster Turnaround", copy: "Streamlined process for a quicker delivery" },
      { icon: "ri-sparkling-line", title: "Elegant & Refined", copy: "Timeless designs with a curated, elevated look" },
      { icon: "ri-cursor-line", title: "Curated Interactions", copy: "Carefully selected animations and interactive elements" },
    ],
  },
  {
    title: "Tailored",
    price: "₱8,000",
    img: "/services/milestone/tailored-page.png",
    features: [
      { icon: "ri-quill-pen-line", title: "Designed from Scratch", copy: "Everything is designed exclusively for you" },
      { icon: "ri-team-line", title: "Collaborative Design", copy: "A hands-on experience from start to finish" },
      { icon: "ri-book-open-line", title: "Editorial Storytelling", copy: "Bespoke storytelling that brings your vision to life" },
      { icon: "ri-magic-line", title: "Custom Animations", copy: "Custom interactions and animations designed uniquely for your site" },
      { icon: "ri-fingerprint-line", title: "Signature Design", copy: "Thoughtfully designed with your story at the center" },
    ],
  },
];

export default function ChooseExperience() {
  return (
    <section className="py-16 md:py-32" style={{ background: "var(--paper)" }}>
      <div className="container-x">
        <Reveal as="h2" className="h-section text-center text-[var(--ink)]">
          Choose Your Experience.
        </Reveal>

        <div className="mt-14 md:mt-16 grid gap-10 md:grid-cols-2 md:divide-x md:divide-[var(--line)]">
          {PLANS.map((p, i) => (
            <Reveal key={p.title} delay={i * 0.08} className="md:px-8 first:md:pl-0 last:md:pr-0">
              <h3 className="font-display text-2xl font-semibold text-center text-[var(--ink)]">
                {p.title}
              </h3>
              <div className="mt-6 overflow-hidden rounded-2xl shadow-[0_28px_56px_-30px_rgba(0,7,39,0.3)]">
                <img src={p.img} alt={`${p.title} example`} className="w-full h-[300px] object-cover object-top" />
              </div>
              <p className="mt-6 text-center text-[var(--slate)]">
                starts at{" "}
                <span className="font-semibold text-[var(--acc-blue)]">{p.price}</span>
              </p>

              <ul className="mt-10 space-y-8">
                {p.features.map((f) => (
                  <li key={f.title} className="text-center">
                    <i className={`${f.icon} text-2xl text-[var(--ink)]`} />
                    <p className="mt-2 font-semibold text-[var(--ink)]">{f.title}</p>
                    <p className="mt-1 text-sm text-[var(--slate)] max-w-xs mx-auto">
                      {f.copy}
                    </p>
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
