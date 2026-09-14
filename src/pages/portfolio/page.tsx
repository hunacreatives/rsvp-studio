import { useMemo, useState } from "react";
import AnnouncementBar from "@/pages/home/components/AnnouncementBar";
import Navbar from "@/pages/home/components/Navbar";
import FooterSection from "@/pages/home/components/FooterSection";
import InvitePlaceholder from "@/pages/home/components/InvitePlaceholder";
import { Reveal } from "@/lib/Reveal";

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

type Work = {
  title: string;
  category: Exclude<Category, "All">;
  meta: string;
  tags: string[];
  seed: number;
};

const WORKS: Work[] = [
  { title: "Clara & Étienne", category: "Milestone Events Website", meta: "Bespoke Web Design · Monogram", tags: ["Tailored", "Wedding"], seed: 1 },
  { title: "Mika & JP", category: "Milestone Events Website", meta: "Semi-Custom Website · Monogram // Single", tags: ["Semi-Custom", "Wedding"], seed: 2 },
  { title: "Baby Sofia", category: "Milestone Events Website", meta: "Semi-Custom Website", tags: ["Semi-Custom", "Girl Baby Shower"], seed: 3 },
  { title: "Aria Turns One", category: "Milestone Events Website", meta: "Semi-Custom Website · Monogram // Single", tags: ["Semi-Custom", "1st Birthday"], seed: 4 },
  { title: "T & H", category: "Monogram", meta: "Monogram // Couple", tags: ["Couple"], seed: 5 },
  { title: "Monogram M", category: "Monogram", meta: "Monogram // Single", tags: ["Single"], seed: 6 },
  { title: "R & A Crest", category: "Monogram", meta: "Monogram // Crest", tags: ["Crest"], seed: 7 },
  { title: "Destiny & Austin", category: "Digital Save the Date", meta: "Digital Save the Date · Wedding", tags: ["Wedding"], seed: 8 },
  { title: "Gelis Turns 30", category: "Digital Save the Date", meta: "Digital Save the Date · Adult Birthday", tags: ["Adult Birthday"], seed: 9 },
  { title: "Camille & Rafael", category: "Stationery", meta: "Signature Suite · Tinghun / Engagement", tags: ["Semi-Custom", "Tinghun / Engagement"], seed: 10 },
  { title: "Arianne & Marco", category: "Stationery", meta: "Essential Suite · Wedding", tags: ["Semi-Custom", "Wedding"], seed: 11 },
  { title: "The Bautistas", category: "Stationery", meta: "Heirloom Suite · Anniversary", tags: ["Tailored", "Anniversary"], seed: 12 },
];

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
              {shown.map((w, i) => (
                <Reveal key={w.title} delay={(i % 4) * 0.04}>
                  <div className="group">
                    <div className="relative">
                      <InvitePlaceholder
                        seed={w.seed}
                        className="w-full aspect-[3/4]"
                      />
                      <span className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full bg-white/85 text-[var(--ink)] backdrop-blur">
                        <i className="ri-instagram-line text-sm" />
                      </span>
                    </div>
                    <h3 className="mt-3 font-display text-lg font-semibold text-[var(--ink)]">
                      {w.title}
                    </h3>
                    <p className="mt-0.5 text-sm text-[var(--slate)]">{w.meta}</p>
                  </div>
                </Reveal>
              ))}
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
