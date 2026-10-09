import { Reveal } from "@/lib/Reveal";

/**
 * Client testimonials, fanned like cards on a table (positions and tilts
 * follow the design, as % of a 700 × 470 stage, painted in this order).
 * Hovering a card straightens it and brings it to the front.
 */
type Quote = { quote: string; name: string; place: string; bg: string; ink: string; x: number; y: number; r: number };

const QUOTES: Quote[] = [
  {
    quote: "Our wedding website was literally perfect! 🫶 It looked beautiful, was so easy for our guests to use, and made keeping track of RSVPs so much less stressful for us. Highly recommend! ✨",
    name: "Mark & Nicole",
    place: "Philippines",
    bg: "#F1DAFF",
    ink: "#A85CE1",
    x: 2,
    y: 32.6,
    r: -10.26,
  },
  {
    quote: "I wanted something special for her birthday, and the website really brought the whole princess theme together. Everyone loved it!",
    name: "Radge",
    place: "Philippines",
    bg: "#D0FEDD",
    ink: "#6E9A12",
    x: 21.3,
    y: 49.4,
    r: -11.03,
  },
  {
    quote: "I loved that we could really make the website our own. 😭 It was so different and unique, and it matched my floral theme perfectly! 🌸",
    name: "Gel",
    place: "Philippines",
    bg: "#EAFF6B",
    ink: "#5F8410",
    x: 65.1,
    y: 7.3,
    r: 13.62,
  },
  {
    quote: "I wanted my birthday invitation to feel different, and this was exactly it. Everyone kept asking where I made it!",
    name: "Cloudy",
    place: "Philippines",
    bg: "#FFCDF6",
    ink: "#CB33A3",
    x: 28,
    y: 11.1,
    r: -10.52,
  },
  {
    quote: "I gave them our theme and they absolutely overdelivered. The website turned out even better than I imagined, it felt so us and brought the whole wedding vision together. 😭🤍",
    name: "Trixia",
    place: "Philippines",
    bg: "#CDEDFF",
    ink: "#3F86E6",
    x: 54.7,
    y: 30,
    r: 12.85,
  },
];

const CARD_CSS = `
.rs-tcard { transform: rotate(var(--r)); transform-origin: 0 0; transition: transform .35s cubic-bezier(.2,.7,.2,1), box-shadow .35s; }
.rs-tcard:hover, .rs-tcard:focus-within { transform: rotate(0deg) scale(1.04); z-index: 20; box-shadow: 0 24px 50px -20px rgba(0,7,39,.35); }
@media (prefers-reduced-motion: reduce) { .rs-tcard { transition: none; } }
`;

function Card({ q, className = "", style }: { q: Quote; className?: string; style?: React.CSSProperties }) {
  return (
    <figure className={`rounded-[24px] p-6 text-left shadow-[0_14px_34px_-22px_rgba(0,7,39,0.35)] ${className}`} style={{ background: q.bg, color: q.ink, ...style }} tabIndex={0}>
      <div className="flex gap-1 text-[17px]" aria-label="5 out of 5 stars">
        {Array.from({ length: 5 }, (_, i) => (
          <i key={i} className="ri-star-fill" aria-hidden />
        ))}
      </div>
      <blockquote className="mt-3 text-[13.5px] leading-[1.45]">&ldquo;{q.quote}&rdquo;</blockquote>
      <figcaption className="mt-4 border-t pt-3" style={{ borderColor: q.ink }}>
        <p className="text-[14px] font-semibold italic">{q.name}</p>
        <p className="text-[13px]">{q.place}</p>
      </figcaption>
    </figure>
  );
}

export default function Testimonials() {
  return (
    <section className="py-16 md:py-32 overflow-hidden" style={{ background: "var(--paper)" }}>
      <style>{CARD_CSS}</style>
      <div className="container-x text-center">
        <Reveal as="p" className="eyebrow">
          Testimonials
        </Reveal>
        <Reveal as="h2" className="h-section mt-3 text-[var(--ink)]">
          What people are saying.
        </Reveal>
      </div>

      {/* Desktop: the fanned stack */}
      <Reveal className="relative mx-auto mt-14 hidden h-[520px] w-[700px] md:block">
        {QUOTES.map((q) => (
          <Card
            key={q.name}
            q={q}
            className="rs-tcard absolute w-[262px]"
            style={{ left: `${q.x}%`, top: `${q.y - 4}%`, "--r": `${q.r}deg` } as React.CSSProperties}
          />
        ))}
      </Reveal>

      {/* Phones: one under another, slightly tilted */}
      <div className="container-x mt-10 grid gap-5 md:hidden">
        {QUOTES.map((q, i) => (
          <Card key={q.name} q={q} className="mx-auto w-full max-w-[340px]" style={{ transform: `rotate(${i % 2 ? 1.5 : -1.5}deg)` }} />
        ))}
      </div>
    </section>
  );
}
