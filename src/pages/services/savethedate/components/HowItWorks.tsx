import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Reveal } from "@/lib/Reveal";
import ReviewChat from "./ReviewChat";
import ShareLink from "./ShareLink";

// Three steps; the section's colour follows the one in the middle of the screen, and each
// step's picture animates when it's reached. Pictures are real: Oliver's card with the
// colours it's made of, the review thread as it plays out in the client dashboard's Messages (ReviewChat), and the files you get.
const BEAR = "/services/save-the-date/card-bear.jpg";

// Sampled from card-bear.jpg.
const PALETTE = [
  ["#c8dbe1", "Powder blue"],
  ["#a07652", "Teddy brown"],
  ["#d7cdba", "Sand"],
  ["#f4efeb", "Cream"],
];

const STEPS: { title: string; copy: string; tint: string; accent: string; art: ReactNode }[] = [
  {
    title: "We design it",
    copy: "Send us your names, the date and a few photos or colours you love. We design your Save the Date around them, as a still or an animated one.",
    tint: "#f2f7fa",
    accent: "#3d7f97",
    art: (
      <div className="std-design">
        <img src={BEAR} alt="Oliver’s first birthday Save the Date" loading="lazy" />
        <div className="std-swatches" aria-hidden>
          {PALETTE.map(([hex, name]) => (
            <span key={hex} className="std-swatch">
              <i style={{ background: hex }} />
              {name}
            </span>
          ))}
        </div>
      </div>
    ),
  },
  {
    title: "You review it",
    copy: "Your drafts arrive in Messages in your dashboard. Tell us what to change, and we send the next version there too.",
    tint: "#eef2ff",
    accent: "#2f61d5",
    art: (
      <ReviewChat />
    ),
  },
  {
    title: "You share it",
    copy: "In 3–5 business days you get your own Save the Date link. Guests tap it to add the date to their calendar and ask for the invitation. You also get the JPEG and PDF, or the video, to post anywhere.",
    tint: "#fdecf1",
    accent: "#c2416b",
    art: <ShareLink />,
  },
];

export default function HowItWorks() {
  const [active, setActive] = useState(0);
  // Each step's picture animates the first time it's reached, then stays.
  const [seen, setSeen] = useState<Set<number>>(() => new Set());
  const rows = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const i = Number((e.target as HTMLElement).dataset.step);
          setActive(i);
          setSeen((s) => (s.has(i) ? s : new Set(s).add(i)));
        }
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    rows.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <section className="std-how py-16 md:py-28" style={{ backgroundColor: STEPS[active].tint }}>
      <div className="container-x">
        <Reveal className="text-center">
          <h2 className="font-display font-semibold leading-[1.05] tracking-[-0.03em] text-[var(--ink)]" style={{ fontSize: "clamp(2rem, 4vw, 3.2rem)" }}>
            How it works
          </h2>
        </Reveal>
        <ol className="mt-12 space-y-20 md:mt-16 md:space-y-28">
          {STEPS.map((s, i) => (
            <li
              key={s.title}
              ref={(el) => {
                rows.current[i] = el;
              }}
              data-step={i}
              className={`grid items-center gap-10 md:grid-cols-2 md:gap-16 ${seen.has(i) ? "is-on" : ""}`}
            >
              <div className={`text-center md:text-left ${i % 2 ? "md:order-2" : ""}`}>
                <span className="std-step-n" style={{ color: s.accent }}>
                  {i + 1}
                </span>
                <h3 className="mt-4 font-display text-[1.6rem] font-semibold leading-tight text-[var(--ink)] md:text-[2rem]">{s.title}</h3>
                <p className="mx-auto mt-3 max-w-[44ch] text-[16px] leading-relaxed text-[var(--slate)] md:mx-0 md:text-[17px]" style={{ textWrap: "pretty" }}>
                  {s.copy}
                </p>
              </div>
              <Reveal delay={0.06} className={i % 2 ? "md:order-1" : ""}>
                {s.art}
              </Reveal>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
