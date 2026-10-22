import type { CSSProperties } from "react";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import AnnouncementBar from "@/pages/home/components/AnnouncementBar";
import Navbar from "@/pages/home/components/Navbar";
import FooterSection from "@/pages/home/components/FooterSection";
import InvitePlaceholder from "@/pages/home/components/InvitePlaceholder";
import { Reveal } from "@/lib/Reveal";
import { WORKS, type Work } from "./works";
import { inquiryLink } from "@/pages/enquire/prefill";
import { inquiryFor } from "./inquiry";
import FilterTabs from "./components/FilterTabs";

type Category =
  | "All"
  | "Milestone Events Website"
  | "Monogram"
  | "Digital Save the Date"
  | "Stationery";

const CATEGORIES: Category[] = [
  "All",
  "Milestone Events Website",
  "Monogram",
  "Digital Save the Date",
  "Stationery",
];

type Group = { label: string; tags: string[] };

const EVENT_GROUPS: Group[] = [
  { label: "Type", tags: ["Semi-Custom", "Custom"] },
  { label: "Wedding", tags: ["Wedding"] },
  { label: "Birthday", tags: ["1st Birthday", "Kids Birthday", "Adult Birthday"] },
  {
    label: "Celebration",
    tags: ["Anniversary", "Bachelorette", "Lunch, Dinner & Cocktails", "Tinghun / Engagement", "Graduation"],
  },
  { label: "Showers", tags: ["Girl Baby Shower", "Boy Baby Shower", "Bridal Shower"] },
];

const MONOGRAM_GROUPS: Group[] = [
  { label: "Monogram", tags: ["Signature", "Duo", "Crest"] },
];

const SUBFILTERS: Record<Exclude<Category, "All">, Group[]> = {
  "Milestone Events Website": EVENT_GROUPS,
  "Digital Save the Date": EVENT_GROUPS.filter((g) => g.label !== "Type"),
  Stationery: EVENT_GROUPS,
  Monogram: MONOGRAM_GROUPS,
};

export default function PortfolioPage() {
  // Menu links (/portfolio#monogram …) pre-select a category.
  const { hash } = useLocation();
  const fromHash = (h: string): Category =>
    ({ "#milestone": "Milestone Events Website", "#monogram": "Monogram", "#save-the-date": "Digital Save the Date", "#stationery": "Stationery" } as Record<string, Category>)[h] ?? "All";
  const [category, setCategory] = useState<Category>(() => fromHash(hash));
  useEffect(() => setCategory(fromHash(hash)), [hash]);
  const [tag, setTag] = useState<string | null>(null);

  const shown = useMemo(() => {
    return WORKS.filter((w) => {
      if (category !== "All" && w.category !== category) return false;
      if (tag && !w.tags.includes(tag)) return false;
      return true;
    });
  }, [category, tag]);

  const groups = category !== "All" ? SUBFILTERS[category] : null;

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
              Featured Work
            </h1>
            <p className="mt-3 text-lg md:text-xl text-[var(--slate)]">
              Celebrations, thoughtfully brought to life.
            </p>
          </div>
        </section>

        <section className="py-12 md:py-16" style={{ background: "var(--warm-white)" }}>
          <div className="container-x">
            <FilterTabs
              options={CATEGORIES}
              value={category}
              onChange={(c) => {
                setCategory(c);
                setTag(null);
              }}
              label="Filter by service"
            />

            {groups && (
              // Phones: a full-bleed band where each group is one sideways-scrolling
              // row of chips, so the results stay close. sm+: the original list grid.
              <div className="-mx-6 mt-6 grid gap-4 bg-[var(--paper)] py-5 sm:mx-0 sm:mt-8 sm:grid-cols-2 sm:gap-6 sm:rounded-2xl sm:p-6 lg:grid-cols-5">
                {groups.map((g) => (
                  <div key={g.label}>
                    <p className="px-6 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--slate)] sm:px-0">
                      {g.label}
                    </p>
                    <ul className="mt-2 flex gap-2 overflow-x-auto px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mt-3 sm:block sm:space-y-2 sm:overflow-visible sm:px-0">
                      {g.tags.map((t) => (
                        <li key={t} className="shrink-0">
                          <button
                            type="button"
                            aria-pressed={tag === t}
                            onClick={() => setTag(tag === t ? null : t)}
                            className={`min-h-[40px] whitespace-nowrap rounded-full border px-4 text-sm transition-colors sm:min-h-0 sm:whitespace-normal sm:rounded-none sm:border-0 sm:bg-transparent sm:px-0 sm:text-left ${
                              tag === t
                                ? "border-[var(--ink)] bg-[var(--ink)] font-medium text-white sm:text-[var(--acc-blue)]"
                                : "border-[var(--line)] bg-white text-[var(--ink)] hover:text-[var(--acc-blue)]"
                            }`}
                          >
                            {t}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}

            {tag && (
              <p className="mt-5 flex items-center justify-center gap-3 text-sm text-[var(--slate)]" aria-live="polite">
                <span>
                  {shown.length} {shown.length === 1 ? "result" : "results"} for &ldquo;{tag}&rdquo;
                </span>
                <button
                  type="button"
                  onClick={() => setTag(null)}
                  className="inline-flex min-h-[40px] items-center px-2 font-medium text-[var(--ink)] underline underline-offset-4"
                >
                  Clear
                </button>
              </p>
            )}

            <div className="mt-8 grid grid-cols-2 gap-x-3 gap-y-8 sm:mt-12 sm:gap-6 lg:grid-cols-4">
              {shown.map((w, i) => {
                const card = (
                  <div>
                    <div className="relative overflow-hidden rounded-[14px]" style={{ boxShadow: "0 30px 60px -30px rgba(0,7,39,0.28)" }}>
                      {w.art ? (
                        <MonogramTile w={w} />
                      ) : w.thumbnail ? (
                        <img
                          src={w.thumbnail}
                          alt={w.title}
                          className="aspect-[3/4] w-full object-cover object-top transition-transform duration-300 group-hover:scale-[1.03]"
                        />
                      ) : (
                        <InvitePlaceholder seed={w.seed} className="w-full aspect-[3/4]" />
                      )}
                      <span className="absolute inset-0 hidden items-end justify-center bg-black/0 pb-6 opacity-0 sm:flex transition-all duration-200 group-hover:bg-black/20 group-hover:opacity-100 group-focus-visible:opacity-100">
                        <span className="rounded-full bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-[var(--ink)]">
                          {w.liveUrl ? "View Project" : "Ask about this"}
                        </span>
                      </span>
                    </div>
                    <h3 className="mt-3 font-display text-base font-semibold leading-snug text-[var(--ink)] sm:text-lg">
                      {w.title}
                    </h3>
                    <p className="mt-0.5 text-[13px] leading-snug text-[var(--slate)] sm:text-sm">{w.meta}</p>
                    {/* Touch screens have no hover, so the card's action is spelled out. */}
                    <span className="mt-2 inline-block text-[13px] font-medium text-[var(--acc-blue)] [@media(hover:hover)]:hidden">
                      {w.liveUrl ? "View project →" : "Ask about this →"}
                    </span>
                  </div>
                );
                return (
                  <Reveal key={w.slug} delay={(i % 4) * 0.04}>
                    {/* Live sites open their case study; the rest go straight to an inquiry like this one. */}
                    <Link className="group block" to={w.liveUrl ? `/portfolio/${w.slug}` : inquiryLink(inquiryFor(w))}>{card}</Link>
                  </Reveal>
                );
              })}
            </div>

            {shown.length === 0 && (
              <p className="mt-12 text-center text-sm text-[var(--slate)]">
                No work to show for this filter yet.
              </p>
            )}
          </div>
        </section>
      </main>
      <FooterSection />
    </>
  );
}

/** A monogram as it would be finished, filling the same 3:4 frame as the site screenshots. */
function MonogramTile({ w }: { w: Work }) {
  const zoom = "transition-transform duration-500 group-hover:scale-[1.04]";
  if (w.art === "cover")
    return (
      <div className="relative aspect-[3/4] w-full overflow-hidden">
        <img src={w.thumbnail} alt={w.title} className={`absolute inset-0 h-full w-full object-cover ${zoom}`} />
      </div>
    );
  if (w.art === "contain")
    return (
      <div className="relative aspect-[3/4] w-full overflow-hidden" style={{ background: "radial-gradient(120% 90% at 50% 35%, #fbf8f2 0%, #ece6db 100%)" }}>
        <img src={w.thumbnail} alt={w.title} className={`absolute inset-[9%] h-[82%] w-[82%] object-contain drop-shadow-[0_18px_28px_rgba(60,40,20,0.22)] ${zoom}`} />
      </div>
    );
  const foil = w.art === "foil";
  const mask = { WebkitMaskImage: `url(${w.mark})`, maskImage: `url(${w.mark})`, WebkitMaskSize: "contain", maskSize: "contain", WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat", WebkitMaskPosition: "center", maskPosition: "center" } as CSSProperties;
  return (
    <div
      role="img"
      aria-label={w.title}
      className="relative aspect-[3/4] w-full overflow-hidden"
      style={{
        background: foil
          ? "radial-gradient(110% 80% at 50% 30%, #23365c 0%, #101c35 70%, #0b1427 100%)"
          : "radial-gradient(120% 90% at 50% 30%, #fbf7f0 0%, #efe7da 100%)",
      }}
    >
      {/* the mark: wrapper casts the shadow (filters run before masks), child is the masked ink/foil */}
      <div
        className={`absolute inset-x-[16%] inset-y-[22%] ${zoom}`}
        style={{
          filter: foil
            ? "drop-shadow(0 2px 1px rgba(0,0,0,0.45)) drop-shadow(0 10px 18px rgba(0,0,0,0.35))"
            : "drop-shadow(0 1px 0 rgba(255,255,255,0.9)) drop-shadow(0 -1px 0 rgba(60,40,25,0.25))",
        }}
      >
        <div
          className="h-full w-full"
          style={{
            ...mask,
            background: foil
              ? "linear-gradient(135deg, #a9782c 0%, #f6e2a4 28%, #b98a3b 48%, #f1d68f 68%, #9c6d27 100%)"
              : "#4a3326",
          }}
        />
        {/* light catching the foil / ink on hover — the site's single-pass glint */}
        <span className="shine-pass shine-pass--hover shine-pass--contain" style={{ "--shine-mask": `url(${w.mark})` } as CSSProperties} aria-hidden />
      </div>
    </div>
  );
}
