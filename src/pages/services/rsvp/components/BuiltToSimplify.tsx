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
          className="mt-3 font-display font-semibold tracking-[-0.02em] leading-[1.15] text-[var(--ink)]"
          style={{ fontSize: "clamp(1.9rem, 4vw, 2.8rem)" }}
        >
          Everything you need,{" "}
          <span className="italic">beautifully organized.</span>
        </Reveal>

        <div className="mt-10 sm:mt-14 grid gap-3 sm:gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f, i) => (
            <Reveal
              key={f.title}
              delay={(i % 4) * 0.05}
              className="flex items-start gap-4 rounded-2xl bg-white p-5 text-left shadow-[0_18px_40px_-30px_rgba(0,7,39,0.2)] sm:block sm:p-7 sm:text-center"
            >
              <i className={`${f.icon} shrink-0 text-2xl leading-7 sm:text-3xl text-[var(--ink)]`} />
              <div>
                <h3 className="font-semibold text-[var(--ink)] sm:mt-4">{f.title}</h3>
                <p className="mt-1 sm:mt-2 text-sm text-[var(--slate)]">{f.copy}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
