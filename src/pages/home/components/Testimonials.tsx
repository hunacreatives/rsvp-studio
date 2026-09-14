import { Reveal } from "@/lib/Reveal";

/**
 * Placeholder testimonial copy — swap for real client quotes.
 * Only "Kei C., Brisbane" is specified in the design mockup.
 */
type Quote = { quote: string; name: string; place: string; color: string };

const QUOTES: Quote[] = [
  {
    quote:
      "They only had a week to put everything together, and RSVP Studio made the whole process so easy. The website turned out even more beautiful than I imagined, our guests loved it!",
    name: "Kei C.",
    place: "Brisbane, Australia",
    color: "#f4a99c",
  },
  {
    quote:
      "Every detail felt considered. The invitation set the tone for the whole wedding before anyone arrived.",
    name: "Marielle & Tom",
    place: "Auckland, NZ",
    color: "#f8cfa0",
  },
  {
    quote:
      "The RSVP tracking alone saved me hours. I could see exactly who was coming at a glance.",
    name: "Priya S.",
    place: "Singapore",
    color: "#f7e08f",
  },
  {
    quote:
      "Multi-language invites for both sides of the family — done in one link. Incredible.",
    name: "Ana & Diego",
    place: "Manila, PH",
    color: "#b6e3bf",
  },
  {
    quote:
      "It looked like an Apple product. Guests kept asking how we made it.",
    name: "Jordan L.",
    place: "Melbourne, AU",
    color: "#a9d3f0",
  },
  {
    quote:
      "From first message to final invite in under two weeks. Calm, clear, and gorgeous.",
    name: "The Okafors",
    place: "London, UK",
    color: "#c9b8f2",
  },
  {
    quote:
      "Our little one's first birthday deserved something special, and this delivered.",
    name: "Sam & Bea",
    place: "Cebu, PH",
    color: "#f3b6d8",
  },
  {
    quote:
      "The whole thing just felt effortless. We shared one link and the replies rolled in.",
    name: "Hannah W.",
    place: "Dublin, IE",
    color: "#f4a99c",
  },
];

function Card({ q }: { q: Quote }) {
  return (
    <figure
      className="shrink-0 w-[300px] sm:w-[380px] rounded-2xl p-7 flex flex-col"
      style={{ background: q.color }}
    >
      <blockquote className="text-[15px] leading-relaxed text-[#1a1a2e] flex-1">
        "{q.quote}"
      </blockquote>
      <figcaption className="mt-6">
        <p className="font-semibold italic text-[#1a1a2e]">{q.name}</p>
        <p className="text-sm text-[#1a1a2e]/65">{q.place}</p>
      </figcaption>
    </figure>
  );
}

function Row({
  items,
  reverse,
  duration,
}: {
  items: Quote[];
  reverse?: boolean;
  duration: number;
}) {
  return (
    <div className="marquee-mask overflow-hidden">
      <div
        className={`marquee-track flex gap-5 w-max ${
          reverse ? "marquee-track--reverse" : ""
        }`}
        style={{ animationDuration: `${duration}s` }}
      >
        {[...items, ...items].map((q, i) => (
          <Card key={`${q.name}-${i}`} q={q} />
        ))}
      </div>
    </div>
  );
}

export default function Testimonials() {
  const rowA = QUOTES;
  const rowB = [...QUOTES.slice(4), ...QUOTES.slice(0, 4)];

  return (
    <section className="py-16 md:py-32 overflow-hidden" style={{ background: "var(--paper)" }}>
      <div className="container-x text-center">
        <Reveal as="p" className="eyebrow">
          Testimonials
        </Reveal>
        <Reveal as="h2" className="h-section mt-3 text-[var(--ink)]">
          What people are saying.
        </Reveal>
        <Reveal as="p" className="mt-4 text-[var(--slate)] text-lg">
          Don't just take our word for it. Hear it from our clients.
        </Reveal>
      </div>

      <div className="marquee-group mt-14 md:mt-16 space-y-5">
        <Row items={rowA} duration={46} />
        <Row items={rowB} duration={54} reverse />
      </div>
    </section>
  );
}
