import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import AnnouncementBar from "@/pages/home/components/AnnouncementBar";
import Navbar from "@/pages/home/components/Navbar";
import FooterSection from "@/pages/home/components/FooterSection";
import InvitePlaceholder from "@/pages/home/components/InvitePlaceholder";
import { Reveal } from "@/lib/Reveal";
import { inquiryLink } from "@/pages/enquire/prefill";
import FilterTabs from "@/pages/portfolio/components/FilterTabs";

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

/** "#baby-shower" → "Baby Shower" (menu links pre-select a filter). */
const fromHash = <T extends string>(options: readonly T[], hash: string, fallback: T): T =>
  options.find((o) => o.toLowerCase().replace(/[^a-z]+/g, "-") === hash.replace(/^#/, "").toLowerCase()) ?? fallback;

function CollectionsGrid() {
  const { hash } = useLocation();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>(() => fromHash(FILTERS, hash, "All"));
  useEffect(() => setFilter(fromHash(FILTERS, hash, "All")), [hash]);
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
        <FilterTabs<(typeof FILTERS)[number]> options={FILTERS} value={filter} onChange={setFilter} label="Filter by event type" />

        <div className="mt-10 grid grid-cols-2 gap-x-3 gap-y-8 sm:mt-12 sm:gap-6 lg:grid-cols-3 md:gap-8">
          {shown.map((c, i) => (
            <Reveal key={c.name} delay={(i % 3) * 0.05}>
              {/* The whole card asks about this design (Semi-Custom website, this collection). */}
              <button
                type="button"
                onClick={() => navigate(inquiryLink({ service: "website", design: "semi-custom", collection: c.name, occasion: filter === "All" ? undefined : filter }))}
                className="group block w-full text-left"
                aria-label={`Ask about the ${c.name} collection`}
              >
                <div className="relative">
                  <InvitePlaceholder
                    seed={c.seed}
                    label={c.name}
                    className="w-full aspect-[3/4]"
                  />
                  <span className="absolute inset-x-3 bottom-3 hidden rounded-full bg-white/90 px-4 py-2 text-center text-[13px] font-medium text-[var(--ink)] opacity-0 backdrop-blur transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 sm:block">
                    Use this design →
                  </span>
                </div>
                <h3 className="mt-3 font-display text-lg font-semibold leading-snug text-[var(--ink)] sm:mt-4 sm:text-xl">
                  {c.name}
                </h3>
                <p className="mt-1 text-[13px] leading-snug text-[var(--slate)] sm:text-sm sm:leading-normal">{c.tagline}</p>
                {/* Touch screens have no hover, so the card's action is spelled out. */}
                <span className="mt-2 inline-block text-[13px] font-medium text-[var(--acc-blue)] [@media(hover:hover)]:hidden">
                  Use this design →
                </span>
              </button>
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

        <div className="relative mt-10 md:mt-14">
          <button
            aria-label="Previous"
            onClick={() => by(-1)}
            className="absolute -left-5 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-[var(--line)] bg-white/80 backdrop-blur hover:bg-white md:grid"
          >
            <i className="ri-arrow-left-s-line text-xl" />
          </button>
          <div
            ref={track}
            className="-mx-6 flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-px-6 px-6 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-6 md:mx-0 md:scroll-px-0 md:px-1"
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
            className="absolute -right-5 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-[var(--line)] bg-white/80 backdrop-blur hover:bg-white md:grid"
          >
            <i className="ri-arrow-right-s-line text-xl" />
          </button>
        </div>

        <div className="mt-12 text-center">
          <button className="btn btn-ghost" onClick={() => navigate("/portfolio#milestone")}>
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
        className="pointer-events-none absolute left-[4%] top-4 w-10 opacity-90 sm:left-[6%] sm:top-10 sm:w-16 md:w-24"
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
        className="pointer-events-none absolute right-[4%] top-4 w-9 opacity-90 sm:right-[6%] sm:top-12 sm:w-14 md:w-20"
      />

      <div className="container-x relative">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="h-section text-[var(--ink)]">
            Looking for something uniquely yours?
          </h2>
          <p className="mt-4 text-[var(--slate)]">
            Our Custom service starts from scratch, with every detail designed around
            your story, style, and celebration.
          </p>
          <button
            className="btn btn-primary mt-8"
            onClick={() => navigate(inquiryLink({ service: "website", design: "custom" }))}
          >
            Ask about Custom design
          </button>
        </div>

        <div className="mt-14 flex justify-center">
          <img
            src="/collections/bespoke-devices.png"
            alt="A custom wedding website on a tablet and phone"
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
              className="text-balance font-display font-semibold leading-[1.1] tracking-[-0.02em] text-[var(--ink)]"
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
