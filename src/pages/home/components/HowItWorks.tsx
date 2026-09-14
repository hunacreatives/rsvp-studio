import { Reveal } from "@/lib/Reveal";
import InvitePlaceholder from "./InvitePlaceholder";

const STEPS = [
  {
    n: 1,
    title: "Choose your service",
    copy: "Pick your type of service.",
  },
  {
    n: 2,
    title: "Share your details",
    copy: "Tell us about your celebration. Names, date, venue, and the details that matter.",
  },
  {
    n: 3,
    title: "Leave the rest to us",
    copy: "We'll bring it all together, beautifully designed and ready to share.",
  },
];

export default function HowItWorks() {
  return (
    <section className="py-16 md:py-32" style={{ background: "var(--warm-white)" }}>
      <div className="container-x text-center">
        <Reveal as="p" className="eyebrow">
          How It Works
        </Reveal>
        <Reveal as="h2" className="h-section mt-3 text-[var(--ink)]">
          How we bring your story to life
        </Reveal>
      </div>

      <div className="container-x mt-14 md:mt-20 grid gap-10 md:grid-cols-3">
        {STEPS.map((s, i) => (
          <Reveal key={s.n} delay={i * 0.08}>
            <div className="relative">
              <InvitePlaceholder seed={i + 4} className="w-full aspect-[3/4]" />
              <span className="absolute left-4 top-4 grid place-items-center w-8 h-8 rounded-full bg-white text-[var(--ink)] text-sm font-semibold shadow">
                {s.n}
              </span>
            </div>
            <h3 className="mt-6 font-display text-xl font-semibold text-[var(--ink)]">
              {s.title}
            </h3>
            <p className="mt-2 text-[var(--slate)]">{s.copy}</p>
          </Reveal>
        ))}
      </div>

      <Reveal
        as="p"
        className="container-x mt-20 text-center font-display text-2xl md:text-3xl text-[var(--slate)] max-w-3xl mx-auto"
      >
        "The first impression of your event starts with the invitation. Make it
        unforgettable."
      </Reveal>
    </section>
  );
}
