import { Reveal } from "@/lib/Reveal";

const CHANNELS = [
  { icon: "ri-whatsapp-line", label: "WhatsApp" },
  { icon: "ri-message-3-line", label: "iMessage" },
  { icon: "ri-mail-line", label: "Email" },
  { icon: "ri-share-forward-line", label: "Social" },
];

export default function SharedSection() {
  return (
    <section className="py-16 md:py-32 overflow-hidden" style={{ background: "var(--paper)" }}>
      <div className="container-x grid items-center gap-14 lg:grid-cols-2">
        <Reveal>
          <h2
            className="font-display font-semibold tracking-[-0.02em] leading-[1.1] text-[var(--ink)] md:whitespace-nowrap"
            style={{ fontSize: "clamp(1.6rem, 3vw, 2.5rem)" }}
          >
            Designed to be shared.
          </h2>
          <p className="mt-3 text-lg text-[var(--slate)]">Beautiful on every screen.</p>
          <p className="mt-5 max-w-md text-[var(--slate)]">
            Share through your favorite apps and platforms, so everyone receives
            your announcement instantly.
          </p>
          <div className="mt-10 flex flex-wrap gap-8">
            {CHANNELS.map((c) => (
              <div key={c.label} className="flex flex-col items-center gap-2">
                <span className="grid place-items-center w-14 h-14 rounded-full bg-white border border-[var(--line)] text-2xl text-[var(--ink)]">
                  <i className={c.icon} />
                </span>
                <span className="text-sm text-[var(--slate)]">{c.label}</span>
              </div>
            ))}
          </div>
        </Reveal>

        <Reveal delay={0.08} className="flex justify-center lg:justify-end">
          <img
            src="/services/milestone/imessage-share.png"
            alt="An invitation link shared in a message thread"
            className="w-[280px] md:w-[320px] drop-shadow-[0_30px_60px_rgba(0,7,39,0.18)]"
          />
        </Reveal>
      </div>
    </section>
  );
}
