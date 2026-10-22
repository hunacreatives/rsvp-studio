import { useEffect, useMemo, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Link, useLocation, useNavigate } from "react-router-dom";
import AnnouncementBar from "@/pages/home/components/AnnouncementBar";
import Navbar from "@/pages/home/components/Navbar";
import FooterSection from "@/pages/home/components/FooterSection";
import { Reveal } from "@/lib/Reveal";
import { inquiryLink } from "@/pages/enquire/prefill";
import FilterTabs from "@/pages/portfolio/components/FilterTabs";

gsap.registerPlugin(ScrollTrigger);

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
  img: string;
};

const COLLECTIONS: Collection[] = [
  { name: "Garden", tagline: "Lush, romantic, and in full bloom.", events: ["Wedding", "Baby Shower", "Birthday"], img: "/collections/garden.webp" },
  { name: "Floral", tagline: "A charming floral suite for celebrations filled with beauty, colour, and moments to remember.", events: ["Wedding", "Baby Shower", "Birthday"], img: "/collections/floral.webp" },
  { name: "Coastal", tagline: "Airy. Effortless. Sunlit.", events: ["Wedding", "Engagement"], img: "/collections/coastal.webp" },
  { name: "Minimalist Polaroid", tagline: "Clean. Nostalgic. Effortless.", events: ["Wedding", "Engagement", "Birthday"], img: "/collections/minimalist-polaroid.webp" },
  { name: "Alpine", tagline: "Crisp mountain air and quiet, timeless whites.", events: ["Wedding", "Engagement"], img: "/collections/alpine.webp" },
  { name: "Classic", tagline: "Ivory, gold, and timeless refinement.", events: ["Wedding", "Birthday"], img: "/collections/classic.webp" },
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

        <div className="mx-auto mt-10 grid max-w-[960px] grid-cols-2 gap-x-3 gap-y-8 sm:mt-12 sm:gap-x-6 sm:gap-y-10 lg:grid-cols-3">
          {shown.map((c, i) => (
            <Reveal key={c.name} delay={(i % 3) * 0.05}>
              {/* The whole card asks about this design (Semi-Custom website, this collection). */}
              <button
                type="button"
                onClick={() => navigate(inquiryLink({ service: "website", design: "semi-custom", collection: c.name, occasion: filter === "All" ? undefined : filter }))}
                className="group block w-full text-left"
                aria-label={`Have us make the ${c.name} design`}
              >
                <div className="relative aspect-[298/408] overflow-hidden rounded-[18px] bg-[var(--paper)] sm:rounded-[22px]">
                  <img
                    src={c.img}
                    alt={`The ${c.name} collection`}
                    loading={i < 3 ? "eager" : "lazy"}
                    className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                  />
                  <span className="absolute inset-x-3 bottom-3 hidden rounded-full bg-white/90 px-4 py-2 text-center text-[13px] font-medium text-[var(--ink)] opacity-0 backdrop-blur transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 sm:block">
                    Have us make this →
                  </span>
                </div>
                <h3 className="mt-3 font-display text-lg font-semibold leading-snug text-[var(--ink)] sm:mt-4 sm:text-xl">
                  {c.name}
                </h3>
                <p className="mt-1 text-pretty text-[13px] leading-snug text-[var(--slate)] sm:text-sm sm:leading-normal">{c.tagline}</p>
                {/* Touch screens have no hover, so the card's action is spelled out. */}
                <span className="mt-2 inline-block text-[13px] font-medium text-[var(--acc-blue)] [@media(hover:hover)]:hidden">
                  Have us make this →
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

        {/* Real sites live on Portfolio; this page stays the menu of designs. */}
        <p className="mt-12 text-center">
          <Link to="/portfolio" className="btn btn-ghost">
            See websites we've made
          </Link>
        </p>
        <p className="mt-6 text-center text-[15px] text-[var(--slate)]">
          Rather make it yourself?{" "}
          <Link to="/build" className="font-medium text-[var(--acc-blue)] underline-offset-4 hover:underline">
            Build your own website, free to start →
          </Link>
        </p>
      </div>
    </section>
  );
}

// Custom = the premium tier. Same treatment as the Crest card on Monogram (warm
// champagne panel, warm ring), with a real Custom site we made instead of decoration.
function BespokeBanner() {
  const navigate = useNavigate();
  const root = useRef<HTMLElement | null>(null);

  // The laptop grows into place as the band scrolls in (the home hero's phone does the same).
  const shot = useRef<HTMLImageElement | null>(null);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        shot.current,
        { scale: 0.88 },
        { scale: 1, ease: "none", scrollTrigger: { trigger: root.current, start: "top 85%", end: "center 55%", scrub: true } },
      );
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={root} className="py-16 md:py-24" style={{ background: "var(--warm-white)" }}>
      <div className="container-x">
        <Reveal
          className="grid items-center gap-10 overflow-hidden rounded-[32px] px-6 py-10 ring-1 ring-[#e8dbc4] shadow-[0_40px_80px_-48px_rgba(120,90,40,0.45)] sm:px-10 md:grid-cols-[1fr_1.15fr] md:gap-8 md:px-14 md:py-16"
          style={{ background: "linear-gradient(160deg, #fbf6ec 0%, #f0e2ca 100%)" }}
        >
          <div className="text-center md:text-left">
            <h2 className="h-section text-balance text-[var(--ink)]">Looking for something uniquely yours?</h2>
            <p className="mt-4 max-w-md text-pretty text-lg text-[var(--slate)] max-md:mx-auto">
              Our Custom service starts from scratch, with every detail designed around your story, style, and celebration.
            </p>
            <ul className="mt-6 inline-grid gap-2 text-left text-[15px] text-[var(--ink)]">
              {["Designed from scratch, just for you", "3 rounds of changes", "RSVP management and a free domain included", "Ready in 3–4 weeks"].map((x) => (
                <li key={x} className="flex gap-2.5">
                  <i className="ri-check-line mt-px text-[17px] text-[#9a7432]" aria-hidden />
                  <span>{x}</span>
                </li>
              ))}
            </ul>
            <p className="mt-6 text-[15px] text-[var(--slate)]">
              From <strong className="text-[var(--ink)]">₱8,000</strong>
            </p>
            <div className="mt-5 flex flex-col items-center gap-3 sm:flex-row md:items-start">
              <button className="btn btn-primary whitespace-nowrap" onClick={() => navigate(inquiryLink({ service: "website", design: "custom" }))}>
                Ask about Custom design
              </button>
              <Link to="/portfolio" className="btn btn-ghost whitespace-nowrap">
                See our work
              </Link>
            </div>
          </div>

          <img
            ref={shot}
            src="/services/milestone/carlo-laptop.webp"
            alt="Carlo & Trixia's Custom wedding website on a laptop"
            loading="lazy"
            className="mx-auto w-full max-w-[560px] will-change-transform drop-shadow-[0_30px_40px_rgba(60,40,20,0.25)]"
          />
        </Reveal>
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
            <p className="mt-3 text-lg md:text-xl text-[var(--slate)] text-balance">
              Pick one of our signature designs. We make it yours.
            </p>
            {/* Same facts line as the Save the Date hero. Semi-Custom is done for you —
                not the do-it-yourself builder, which has its own templates. */}
            <p className="mt-3 text-[15px] text-[var(--ink)] text-balance">
              From <strong>₱3,000</strong> · We set it up with your details and photos · Ready in 5–7 business days
            </p>
          </div>
        </section>

        <CollectionsGrid />
        <BespokeBanner />
      </main>
      <FooterSection />
    </>
  );
}
