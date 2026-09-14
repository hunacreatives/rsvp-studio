import { useRef } from "react";
import { Reveal } from "@/lib/Reveal";
import InvitePlaceholder from "./InvitePlaceholder";

const CARDS = [
  { title: "Interactive", copy: "The wow starts with the first click." },
  { title: "Personal", copy: "Designed around you." },
  { title: "Effortless", copy: "RSVPs made simple." },
  { title: "Unique Invitation", copy: "Hand-crafted, only for you." },
  { title: "Custom RSVP", copy: "Seamless guest confirmations." },
  { title: "Multi-Language", copy: "One invitation, in every language." },
];

export default function ValueProps() {
  const track = useRef<HTMLDivElement | null>(null);

  const scrollBy = (dir: 1 | -1) => {
    const el = track.current;
    if (!el) return;
    el.scrollBy({ left: dir * (el.clientWidth * 0.7), behavior: "smooth" });
  };

  return (
    <section className="py-16 md:py-32" style={{ background: "var(--paper)" }}>
      <div className="container-x">
        <Reveal
          as="h2"
          className="h-section max-w-3xl text-[var(--ink)]"
        >
          Everything you need to make your celebration unforgettable.
        </Reveal>

        <div className="mt-12 md:mt-16 flex items-center justify-end gap-3">
          <button
            aria-label="Previous"
            onClick={() => scrollBy(-1)}
            className="grid place-items-center w-11 h-11 rounded-full border border-[var(--line)] bg-white hover:bg-black/5 transition-colors"
          >
            <i className="ri-arrow-left-line text-lg" />
          </button>
          <button
            aria-label="Next"
            onClick={() => scrollBy(1)}
            className="grid place-items-center w-11 h-11 rounded-full bg-[var(--ink)] text-white hover:opacity-90 transition-opacity"
          >
            <i className="ri-arrow-right-line text-lg" />
          </button>
        </div>

        <div
          ref={track}
          className="mt-6 flex gap-6 md:gap-8 overflow-x-auto snap-x snap-mandatory pb-4 -mx-6 px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {CARDS.map((c, i) => (
            <div
              key={c.title}
              className="snap-start shrink-0 w-[76%] sm:w-[44%] lg:w-[31%]"
            >
              <InvitePlaceholder
                seed={i + 2}
                className="w-full aspect-[3/4]"
              />
              <h3 className="mt-5 font-display text-xl font-semibold text-[var(--ink)]">
                {c.title}
              </h3>
              <p className="mt-1 text-[var(--slate)]">{c.copy}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
