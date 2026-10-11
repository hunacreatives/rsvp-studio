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
    icon: "ri-group-fill",
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
    icon: "ri-calendar-2-line",
    title: "Calendar Integration",
    copy: "Add your celebration to their calendar in one tap.",
  },
  {
    icon: "ri-music-2-fill",
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
          All included in{" "}
          <br className="hidden sm:inline" />
          every invitation
        </Reveal>

        <div className="mt-10 md:mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
          {FEATURES.map((f, i) => (
            <Reveal
              key={f.title}
              delay={(i % 4) * 0.06}
              className="flex items-start gap-4 rounded-2xl border border-[var(--line)] bg-white p-5 text-left shadow-[0_20px_40px_-28px_rgba(0,7,39,0.2)] sm:flex-col sm:items-center sm:gap-0 sm:p-7 sm:text-center"
            >
              {/* Phones: compact row (icon beside text); sm+: the centred card. */}
              <i className={`${f.icon} shrink-0 text-[1.75rem] sm:text-[2.2rem] leading-none text-[var(--ink)]`} />
              <div className="sm:flex sm:flex-col sm:items-center">
                <h3 className="font-semibold leading-snug text-[var(--ink)] sm:mt-5">{f.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-[var(--slate)] sm:mt-2 sm:max-w-[15rem]">
                  {f.copy}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
