import { Reveal } from "@/lib/Reveal";

const CARDS = [
  { icon: "ri-map-pin-2-line", title: "Venue", copy: "Address, parking, and a live map your guests can open in one tap." },
  { icon: "ri-calendar-event-line", title: "Timeline", copy: "Every moment of the day, from welcome drinks to last dance." },
  { icon: "ri-route-line", title: "Maps", copy: "Directions and travel notes for every part of the celebration." },
  { icon: "ri-mail-check-line", title: "RSVP", copy: "A simple form that feeds straight into your guest dashboard." },
  { icon: "ri-gift-line", title: "Registry", copy: "Link every registry and gifting option in one tidy place." },
  { icon: "ri-hotel-line", title: "Accommodations", copy: "Recommended stays, room blocks, and booking links." },
  { icon: "ri-book-2-line", title: "Story", copy: "Your story, told the way you want it — words, photos, and film." },
  { icon: "ri-question-answer-line", title: "FAQ", copy: "Answer the questions before they land in your inbox." },
];

export default function BuiltAround() {
  return (
    <section className="py-16 md:py-32" style={{ background: "var(--warm-white)" }}>
      <div className="container-x">
        <Reveal as="h2" className="h-section text-center text-[var(--ink)]">
          Built around your celebration
        </Reveal>

        <div className="mt-16 grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <div className="hidden lg:block">
            <div className="sticky top-28">
              <div className="mx-auto w-[250px] aspect-[9/19] rounded-[38px] border-[10px] border-[#111] bg-[#111] overflow-hidden shadow-[0_50px_90px_-30px_rgba(0,7,39,0.4)]">
                <img
                  src="/services/milestone/claudy-hero.png"
                  alt="An event website on a phone"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>

          <div className="space-y-5">
            {CARDS.map((c, i) => (
              <Reveal
                key={c.title}
                delay={(i % 2) * 0.05}
                className="rounded-2xl border border-[var(--line)] bg-white p-6 shadow-[0_18px_40px_-30px_rgba(0,7,39,0.2)]"
              >
                <div className="flex items-start gap-4">
                  <span className="grid place-items-center w-11 h-11 rounded-xl bg-[var(--paper)] text-xl text-[var(--acc-blue)] shrink-0">
                    <i className={c.icon} />
                  </span>
                  <div>
                    <h3 className="font-semibold text-[var(--ink)]">{c.title}</h3>
                    <p className="mt-1 text-sm text-[var(--slate)]">{c.copy}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
