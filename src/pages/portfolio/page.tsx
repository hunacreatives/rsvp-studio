import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AnnouncementBar from "@/pages/home/components/AnnouncementBar";
import Navbar from "@/pages/home/components/Navbar";
import FooterSection from "@/pages/home/components/FooterSection";
import InvitePlaceholder from "@/pages/home/components/InvitePlaceholder";
import { Reveal } from "@/lib/Reveal";
import { WORKS } from "./works";

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
  { label: "Type", tags: ["Semi-Custom", "Tailored"] },
  { label: "Wedding", tags: ["Wedding"] },
  { label: "Birthday", tags: ["1st Birthday", "Kids Birthday", "Adult Birthday"] },
  {
    label: "Celebration",
    tags: ["Anniversary", "Bachelorette", "Lunch, Dinner & Cocktails", "Tinghun / Engagement", "Graduation"],
  },
  { label: "Showers", tags: ["Girl Baby Shower", "Boy Baby Shower", "Bridal Shower"] },
];

const MONOGRAM_GROUPS: Group[] = [
  { label: "Monogram", tags: ["Single", "Couple", "Crest"] },
];

const SUBFILTERS: Record<Exclude<Category, "All">, Group[]> = {
  "Milestone Events Website": EVENT_GROUPS,
  "Digital Save the Date": EVENT_GROUPS.filter((g) => g.label !== "Type"),
  Stationery: EVENT_GROUPS,
  Monogram: MONOGRAM_GROUPS,
};

export default function PortfolioPage() {
  const [category, setCategory] = useState<Category>("All");
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
              className="font-display font-semibold tracking-[-0.02em] text-[var(--ink)]"
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
            <div className="flex flex-wrap justify-center gap-x-8 gap-y-3">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => {
                    setCategory(c);
                    setTag(null);
                  }}
                  className={`text-sm font-medium uppercase tracking-[0.12em] transition-colors pb-1 ${
                    category === c
                      ? "text-[var(--ink)] border-b border-[var(--ink)]"
                      : "text-[var(--slate)] hover:text-[var(--ink)]"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>

            {groups && (
              <div className="mt-8 grid gap-6 rounded-2xl bg-[var(--paper)] p-6 sm:grid-cols-2 lg:grid-cols-5">
                {groups.map((g) => (
                  <div key={g.label}>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--slate)]">
                      {g.label}
                    </p>
                    <ul className="mt-3 space-y-2">
                      {g.tags.map((t) => (
                        <li key={t}>
                          <button
                            onClick={() => setTag(tag === t ? null : t)}
                            className={`text-sm transition-colors ${
                              tag === t
                                ? "font-medium text-[var(--acc-blue)]"
                                : "text-[var(--ink)] hover:text-[var(--acc-blue)]"
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

            <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {shown.map((w, i) => {
                const card = (
                  <div className="group">
                    <div className="relative overflow-hidden rounded-[14px]" style={{ boxShadow: "0 30px 60px -30px rgba(0,7,39,0.28)" }}>
                      {w.thumbnail ? (
                        <img
                          src={w.thumbnail}
                          alt={w.title}
                          className="aspect-[3/4] w-full object-cover object-top transition-transform duration-300 group-hover:scale-[1.03]"
                        />
                      ) : (
                        <InvitePlaceholder seed={w.seed} className="w-full aspect-[3/4]" />
                      )}
                      {w.liveUrl && (
                        <span className="absolute inset-0 flex items-end justify-center bg-black/0 pb-6 opacity-0 transition-all duration-200 group-hover:bg-black/20 group-hover:opacity-100">
                          <span className="rounded-full bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-[var(--ink)]">
                            View Project
                          </span>
                        </span>
                      )}
                    </div>
                    <h3 className="mt-3 font-display text-lg font-semibold text-[var(--ink)]">
                      {w.title}
                    </h3>
                    <p className="mt-0.5 text-sm text-[var(--slate)]">{w.meta}</p>
                  </div>
                );
                return (
                  <Reveal key={w.slug} delay={(i % 4) * 0.04}>
                    {w.liveUrl ? <Link to={`/portfolio/${w.slug}`}>{card}</Link> : card}
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
