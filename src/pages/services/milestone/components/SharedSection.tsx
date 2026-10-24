import { Reveal } from "@/lib/Reveal";
import ShareConversation from "./ShareConversation";

const CHANNELS = [
  { icon: "ri-messenger-line", label: "Messenger" },
  { icon: "ri-chat-3-line", label: "Viber" },
  { icon: "ri-mail-line", label: "Email" },
  { icon: "ri-share-forward-line", label: "Social" },
];

export default function SharedSection() {
  return (
    <section className="py-16 md:py-28 overflow-hidden" style={{ background: "var(--warm-white)" }}>
      <div className="container-x grid items-center gap-14 lg:max-w-[900px] lg:grid-cols-[1fr_auto] lg:gap-10">
        <Reveal>
          <h2
            className="font-display font-semibold tracking-[-0.02em] leading-[1.1] text-[var(--ink)] md:whitespace-nowrap"
            style={{ fontSize: "clamp(1.6rem, 3vw, 2.5rem)" }}
          >
            Made to be shared.
          </h2>
          {/* "Every screen" is the hero's line; this one is about sending it. */}
          <p className="mt-4 max-w-md text-lg text-[var(--slate)]">
            One link on Messenger, Viber or email,
            <br className="hidden sm:block" /> and everyone has it at once.
          </p>
          <div className="mt-8 grid max-w-sm grid-cols-4 gap-2 sm:mt-10 sm:flex sm:max-w-none sm:flex-wrap sm:gap-8">
            {CHANNELS.map((c) => (
              <div key={c.label} className="flex flex-col items-center gap-2">
                <span className="grid place-items-center w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[var(--paper)] text-2xl text-[var(--ink)]">
                  <i className={c.icon} />
                </span>
                <span className="text-[13px] sm:text-sm text-[var(--slate)]">{c.label}</span>
              </div>
            ))}
          </div>
        </Reveal>

        <Reveal delay={0.08} className="flex justify-center">
          <ShareConversation />
        </Reveal>
      </div>
    </section>
  );
}
