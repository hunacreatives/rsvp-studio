import { Reveal } from "@/lib/Reveal";

// Real Save the Dates we've designed (public/services/save-the-date), each shown once.
const CARDS = [
  { img: "card-bear.jpg", occasion: "First birthday", who: "Oliver", w: 680, h: 952 },
  { img: "card-wildone.jpg", occasion: "Baby shower", who: "A little wild one", w: 680, h: 1024 },
  { img: "card-destiny.jpg", occasion: "Wedding", who: "Destiny & Austin", w: 680, h: 993 },
  { img: "card-studio.jpg", occasion: "Grand opening", who: "Lauren Belle Studio", w: 680, h: 850 },
  { img: "card-hudson.jpg", occasion: "Birthday", who: "Hudson", w: 680, h: 951 },
];

export default function Designs() {
  return (
    <section id="designs" className="scroll-mt-20 py-16 md:py-28" style={{ background: "var(--warm-white)" }}>
      <div className="container-x">
        <Reveal className="text-center">
          <h2 className="font-display font-semibold leading-[1.05] tracking-[-0.03em] text-[var(--ink)]" style={{ fontSize: "clamp(2rem, 4vw, 3.2rem)" }}>
            Designed for each celebration
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[17px] leading-relaxed text-[var(--slate)] text-balance md:text-[19px]">
            Weddings, birthdays, baby showers and openings. Every one starts from your names, your date and your colours.
          </p>
        </Reveal>
        <div className="std-cards mt-10 md:mt-14">
          {CARDS.map((c, i) => (
            <Reveal key={c.img} delay={i * 0.06} className="std-card">
              <span className="std-card-art">
                <img src={`/services/save-the-date/${c.img}`} alt={`${c.occasion} Save the Date for ${c.who}`} width={c.w} height={c.h} loading="lazy" />
              </span>
              <p>
                <b>{c.occasion}</b>
                {c.who}
              </p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
