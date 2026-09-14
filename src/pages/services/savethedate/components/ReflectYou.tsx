import { Reveal } from "@/lib/Reveal";

const PHONES = [
  { img: "/services/save-the-date/card-wildone.jpg", alt: "Baby shower save the date" },
  { img: "/services/save-the-date/card-studio.jpg", alt: "Grand opening save the date" },
  { img: "/services/save-the-date/card-destiny.jpg", alt: "Wedding save the date" },
];

export default function ReflectYou() {
  return (
    <section className="py-16 md:py-32 overflow-hidden" style={{ background: "var(--paper)" }}>
      <div className="container-x text-center">
        <Reveal as="h2" className="h-section text-[var(--ink)]">
          Made to reflect your celebration.
        </Reveal>
        <Reveal as="p" delay={0.05} className="mt-4 text-lg text-[var(--slate)]">
          Every design is customized to tell your story.
        </Reveal>

        <div className="mt-16 flex items-end justify-center gap-4 sm:gap-8">
          {PHONES.map((p, i) => (
            <Reveal
              key={p.img}
              delay={i * 0.08}
              className={`w-[30%] max-w-[220px] shrink-0 ${
                i === 1 ? "-translate-y-6 md:-translate-y-10" : ""
              }`}
            >
              <div className="relative aspect-[9/19] rounded-[30px] border-[9px] border-[#111] bg-[#111] shadow-[0_40px_80px_-32px_rgba(0,7,39,0.38)]">
                <div className="absolute left-1/2 top-1.5 -translate-x-1/2 h-1 w-10 rounded-full bg-black/50" />
                <div className="absolute inset-0 m-[2px] overflow-hidden rounded-[22px]">
                  <img src={p.img} alt={p.alt} className="h-full w-full object-cover" />
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
