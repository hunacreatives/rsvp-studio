import { Reveal } from "@/lib/Reveal";

const FEATURES = [
  {
    icon: "ri-group-line",
    title: "Track Responses",
    copy: "Keep every guest response organized in one place, without chasing replies through messages.",
  },
  {
    icon: "ri-checkbox-circle-line",
    title: "Email Confirmations",
    copy: "Guests receive a personalized email confirming their RSVP.",
  },
  {
    icon: "ri-notification-3-line",
    title: "Automated Reminders",
    copy: "Automatically send a gentle email reminder a few days before your event.",
  },
  {
    icon: "ri-download-2-line",
    title: "Export with Ease",
    copy: "Easily export your RSVP data for planning and coordination.",
  },
];

export default function BuiltToSimplify() {
  return (
    <section className="py-16 md:py-32" style={{ background: "var(--paper)" }}>
      <div className="container-x text-center">
        <Reveal as="p" className="eyebrow">
          Built to Simplify
        </Reveal>
        <Reveal
          as="h2"
          delay={0.05}
          className="mt-3 font-display font-semibold tracking-[-0.02em] text-[var(--ink)]"
          style={{ fontSize: "clamp(1.9rem, 4vw, 2.8rem)" }}
        >
          Everything you need,{" "}
          <span className="italic">beautifully organized.</span>
        </Reveal>

        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f, i) => (
            <Reveal
              key={f.title}
              delay={(i % 4) * 0.05}
              className="rounded-2xl bg-white p-7 text-center shadow-[0_18px_40px_-30px_rgba(0,7,39,0.2)]"
            >
              <i className={`${f.icon} text-3xl text-[var(--ink)]`} />
              <h3 className="mt-4 font-semibold text-[var(--ink)]">{f.title}</h3>
              <p className="mt-2 text-sm text-[var(--slate)]">{f.copy}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
