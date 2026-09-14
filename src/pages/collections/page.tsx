import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import AnnouncementBar from "@/pages/home/components/AnnouncementBar";
import Navbar from "@/pages/home/components/Navbar";
import FooterSection from "@/pages/home/components/FooterSection";
import InvitePlaceholder from "@/pages/home/components/InvitePlaceholder";
import { Reveal } from "@/lib/Reveal";

type EventType = "Wedding" | "Baby Shower" | "Birthday" | "Engagement";

const FILTERS: ("All" | EventType)[] = [
  "All",
  "Wedding",
  "Baby Shower",
  "Birthday",
  "Engagement",
];

type Collection = {
  name: string;
  tagline: string;
  events: EventType[];
  seed: number;
};

const COLLECTIONS: Collection[] = [
  { name: "Garden", tagline: "Lush, romantic, and in full bloom.", events: ["Wedding", "Baby Shower", "Birthday"], seed: 1 },
  { name: "Floral", tagline: "A charming floral suite for celebrations filled with beauty, colour, and moments to remember.", events: ["Wedding", "Baby Shower", "Birthday"], seed: 2 },
  { name: "Coastal", tagline: "Airy. Effortless. Sunlit.", events: ["Wedding", "Engagement"], seed: 3 },
  { name: "Minimalist Polaroid", tagline: "Clean. Nostalgic. Effortless.", events: ["Wedding", "Engagement", "Birthday"], seed: 4 },
  { name: "Alpine", tagline: "Crisp mountain air and quiet, timeless whites.", events: ["Wedding", "Engagement"], seed: 5 },
  { name: "Classic", tagline: "Ivory, gold, and timeless refinement.", events: ["Wedding", "Birthday"], seed: 6 },
];

const BROUGHT_TO_LIFE = [
  { couple: "Clara & Étienne", base: "Garden", seed: 1 },
  { couple: "Mia & Noah", base: "Coastal", seed: 3 },
  { couple: "Aria & Daniel", base: "Minimalist Polaroid", seed: 4 },
  { couple: "Sofia & Luca", base: "Alpine", seed: 5 },
  { couple: "Isabella & James", base: "Classic", seed: 6 },
];

function CollectionsGrid() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const shown = useMemo(
    () =>
      filter === "All"
        ? COLLECTIONS
        : COLLECTIONS.filter((c) => c.events.includes(filter as EventType)),
    [filter],
  );

  return (
    <section className="py-16 md:py-24" style={{ background: "var(--warm-white)" }}>
      <div className="container-x">
        <div className="flex flex-wrap justify-center gap-x-8 gap-y-3">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-sm font-medium uppercase tracking-[0.14em] transition-colors ${
                filter === f
                  ? "text-[var(--ink)] border-b border-[var(--ink)] pb-1"
                  : "text-[var(--slate)] hover:text-[var(--ink)] pb-1"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 md:gap-8">
          {shown.map((c, i) => (
            <Reveal key={c.name} delay={(i % 3) * 0.05}>
              <div className="group">
                <div className="relative">
                  <InvitePlaceholder
                    seed={c.seed}
                    label={c.name}
                    className="w-full aspect-[3/4]"
                  />
                  <span className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/85 text-[var(--ink)] opacity-0 backdrop-blur transition-opacity group-hover:opacity-100">
                    <i className="ri-eye-line" />
                  </span>
                </div>
                <h3 className="mt-4 font-display text-xl font-semibold text-[var(--ink)]">
                  {c.name}
                </h3>
                <p className="mt-1 text-sm text-[var(--slate)]">{c.tagline}</p>
              </div>
            </Reveal>
          ))}
          {shown.length === 0 && (
            <p className="col-span-full py-10 text-center text-sm text-[var(--slate)]">
              No collections for this event type yet.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function BroughtToLife() {
  const navigate = useNavigate();
  const track = useRef<HTMLDivElement | null>(null);
  const by = (dir: 1 | -1) => {
    const el = track.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  };

  return (
    <section
      className="py-16 md:py-32"
      style={{ background: "var(--warm-white)", borderTop: "1px solid var(--line)" }}
    >
      <div className="container-x">
        <Reveal as="h2" className="h-section text-center text-[var(--ink)]">
          Collections, brought to life.
        </Reveal>

        <div className="relative mt-14">
          <button
            aria-label="Previous"
            onClick={() => by(-1)}
            className="absolute -left-2 top-1/2 z-10 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-[var(--line)] bg-white/80 backdrop-blur hover:bg-white md:-left-5"
          >
            <i className="ri-arrow-left-s-line text-xl" />
          </button>
          <div
            ref={track}
            className="flex gap-6 overflow-x-auto snap-x snap-mandatory pb-4 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {BROUGHT_TO_LIFE.map((b) => (
              <figure
                key={b.couple}
                className="w-[70%] shrink-0 snap-center sm:w-[44%] lg:w-[30%]"
              >
                <InvitePlaceholder seed={b.seed} className="w-full aspect-[3/4]" />
                <figcaption className="mt-4 text-center">
                  <p className="font-semibold text-[var(--ink)]">{b.couple}</p>
                  <p className="text-sm italic text-[var(--slate)]">
                    Based on {b.base}
                  </p>
                </figcaption>
              </figure>
            ))}
          </div>
          <button
            aria-label="Next"
            onClick={() => by(1)}
            className="absolute -right-2 top-1/2 z-10 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-[var(--line)] bg-white/80 backdrop-blur hover:bg-white md:-right-5"
          >
            <i className="ri-arrow-right-s-line text-xl" />
          </button>
        </div>

        <div className="mt-12 text-center">
          <button className="btn btn-ghost" onClick={() => navigate("/portfolio")}>
            See More
          </button>
        </div>
      </div>
    </section>
  );
}

function BespokeBanner() {
  const navigate = useNavigate();
  return (
    <section
      className="relative overflow-hidden py-16 md:py-28"
      style={{ background: "var(--paper)" }}
    >
      <img
        src="/collections/sparkles.png"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute left-[6%] top-10 w-16 opacity-90 md:w-24"
      />
      <img
        src="/collections/leaf-sprig.png"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute left-[3%] bottom-8 hidden w-20 opacity-80 md:block md:w-28"
      />
      <img
        src="/collections/champagne.png"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute right-[6%] top-12 w-14 opacity-90 md:w-20"
      />

      <div className="container-x relative">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="h-section text-[var(--ink)]">
            Looking for something uniquely yours?
          </h2>
          <p className="mt-4 text-[var(--slate)]">
            Our bespoke service starts from scratch, with every detail tailored to
            your story, style, and celebration.
          </p>
          <button
            className="btn btn-primary mt-8"
            onClick={() => navigate("/enquire#start")}
          >
            Explore Bespoke Design
          </button>
        </div>

        <div className="mt-14 flex justify-center">
          <img
            src="/collections/bespoke-devices.png"
            alt="A bespoke wedding website on a tablet and phone"
            className="w-full max-w-[440px] drop-shadow-[0_40px_80px_rgba(0,7,39,0.2)]"
          />
        </div>
      </div>
    </section>
  );
}

export default function CollectionsPage() {
  return (
    <>
      <AnnouncementBar />
      <Navbar />
      <main>
        <section
          className="pt-16 md:pt-28 pb-4 text-center"
          style={{ background: "var(--warm-white)" }}
        >
          <div className="container-x">
            <h1
              className="font-display font-semibold tracking-[-0.02em] text-[var(--ink)]"
              style={{ fontSize: "clamp(2.4rem, 5vw, 3.6rem)" }}
            >
              Semi-Custom Website Collections
            </h1>
            <p className="mt-3 text-lg md:text-xl text-[var(--slate)]">
              Our signature designs, personalized for your event.
            </p>
          </div>
        </section>

        <CollectionsGrid />
        <BroughtToLife />
        <BespokeBanner />
      </main>
      <FooterSection />
    </>
  );
}
