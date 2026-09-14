import { Reveal } from "@/lib/Reveal";

const FEATURES = [
  {
    icon: "ri-link",
    title: "Your Own Event Link",
    copy: "One beautiful link, made just for your celebration.",
  },
  {
    icon: "ri-checkbox-circle-line",
    title: "RSVP",
    copy: "Make every response simple and seamless.",
  },
  {
    icon: "ri-group-line",
    title: "Guest Management",
    copy: "Keep every guest, all in one place.",
  },
  {
    icon: "ri-notification-3-line",
    title: "Guest Reminders",
    copy: "A gentle reminder, just before the big day.",
  },
  {
    icon: "ri-map-pin-line",
    title: "Digital Maps",
    copy: "Make getting there effortless with integrated location details.",
  },
  {
    icon: "ri-calendar-event-line",
    title: "Calendar Integration",
    copy: "Add your celebration to their calendar in one tap.",
  },
  {
    icon: "ri-music-2-line",
    title: "Music & Media",
    copy: "Bring your story to life with music, photos, and video.",
  },
  {
    icon: "ri-send-plane-line",
    title: "Easy Sharing",
    copy: "Share your invitation wherever your guests are.",
  },
];

export default function IncludedGrid() {
  return (
    <section className="py-16 md:py-32" style={{ background: "var(--warm-white)" }}>
      <div className="container-x">
        <Reveal as="h2" className="h-section max-w-2xl text-[var(--ink)]">
          All included in
          <br className="hidden sm:inline" />
          every invitation
        </Reveal>

        <div className="mt-12 md:mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {FEATURES.map((f, i) => (
            <Reveal
              key={f.title}
              delay={(i % 4) * 0.06}
              className="rounded-2xl border border-[var(--line)] bg-white p-7 shadow-[0_20px_40px_-28px_rgba(0,7,39,0.2)]"
            >
              <i className={`${f.icon} text-2xl text-[var(--acc-blue)]`} />
              <h3 className="mt-5 font-semibold text-[var(--ink)]">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--slate)]">
                {f.copy}
              </p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
