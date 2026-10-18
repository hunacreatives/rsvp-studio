import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import AnnouncementBar from "../home/components/AnnouncementBar";
import Navbar from "../home/components/Navbar";
import FooterSection from "../home/components/FooterSection";
import { formatDate } from "@/pages/account/portal/format";
import { BLOG_CATEGORIES, loadPublishedPosts, readMinutes, type BlogPost } from "./blogApi";

// /blog — the journal: a featured story, topics, the latest articles, and a way
// to get in touch. Posts are written in Studio → Blog (supabase/blog.sql).

const PAGE = 9;

const demoPost = (slug: string, title: string, excerpt: string, category: string, date: string, words: number, featured = false): BlogPost => ({
  id: slug, slug, title, excerpt, category, featured, body: "word ".repeat(words), cover_url: null, cover_alt: null, author: "The RSVP Studio",
  seo_title: null, seo_description: null, focus_keyword: null,
  status: "published", published_at: date, created_at: date, updated_at: date,
});
const DEMO_POSTS: BlogPost[] = [
  demoPost("wedding-invitation-wording", "A Guide to Wedding Invitation Wording", "From formal to modern, here’s everything you need to know about what to include in your wedding invitation.", "Wedding", "2026-07-08T00:00:00Z", 1600, true),
  demoPost("details-that-make-an-impression", "The Details That Make an Impression", "From paper choices to finishing touches, explore how thoughtful details elevate your event stationery.", "Stationery", "2026-06-30T00:00:00Z", 1200),
  demoPost("seamless-wedding-day-timeline", "A Seamless Wedding Day Timeline", "A practical guide to help you plan a relaxed and well-paced celebration.", "Planning", "2026-06-18T00:00:00Z", 1400),
  demoPost("celebration-venues-in-cebu", "Our Favorite Celebration Venues in Cebu", "A curated list of beautiful spaces for intimate gatherings and larger celebrations.", "Events", "2026-06-09T00:00:00Z", 1000),
];

export function PostCover({ post, className = "" }: { post: Pick<BlogPost, "cover_url" | "cover_alt" | "title">; className?: string }) {
  return post.cover_url ? (
    <img src={post.cover_url} alt={post.cover_alt ?? ""} loading="lazy" decoding="async" className={`h-full w-full object-cover ${className}`} />
  ) : (
    // No photo yet: a quiet paper panel with the monogram, never a broken image.
    <div className={`grid h-full w-full place-items-center bg-[var(--paper)] ${className}`} aria-hidden>
      <img src="/brand/monogram-dark.png" alt="" className="w-[22%] max-w-[90px] opacity-[0.12]" />
    </div>
  );
}

export function PostMeta({ post, className = "" }: { post: BlogPost; className?: string }) {
  return (
    <p className={`text-[12px] uppercase tracking-[0.12em] text-[var(--slate)] ${className}`}>
      {formatDate(post.published_at)} <span aria-hidden>·</span> {readMinutes(post.body)} min read
    </p>
  );
}

export default function Blog() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [posts, setPosts] = useState<BlogPost[] | null | undefined>(undefined);
  const [shown, setShown] = useState(PAGE);
  const [searchOpen, setSearchOpen] = useState(false);
  const topic = params.get("topic") ?? "All";
  const q = params.get("q") ?? "";
  useEffect(() => {
    // ?demo on localhost: the design's sample articles, to see the layout.
    if (import.meta.env.DEV && params.has("demo")) return setPosts(DEMO_POSTS);
    loadPublishedPosts().then(setPosts);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Only topics that have articles, in the order of the design.
  const topics = useMemo(() => {
    const used = new Set((posts ?? []).map((p) => p.category));
    return ["All", ...BLOG_CATEGORIES.filter((c) => used.has(c)), ...[...used].filter((c) => !(BLOG_CATEGORIES as readonly string[]).includes(c))];
  }, [posts]);

  const list = posts ?? [];
  const filtered = list.filter(
    (p) => (topic === "All" || p.category === topic) && (!q || `${p.title} ${p.excerpt ?? ""} ${p.category}`.toLowerCase().includes(q.toLowerCase())),
  );
  const browsing = topic !== "All" || !!q;
  const featured = browsing ? null : list.find((p) => p.featured) ?? list[0] ?? null;
  const rest = filtered.filter((p) => p !== featured);

  const setParam = (k: string, v: string | null) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v);
    else next.delete(k);
    setParams(next, { replace: true });
    setShown(PAGE);
  };

  return (
    <>
      <AnnouncementBar />
      <Navbar />
      <main className="pb-20 md:pb-28">
        {/* Hero */}
        <section className="container-x pt-6 md:pt-10">
          <div className="rounded-[28px] bg-[var(--paper)] px-6 py-16 text-center md:py-28">
            <p className="eyebrow">The Journal</p>
            <h1 className="mx-auto mt-4 max-w-2xl font-display font-semibold leading-[1.1] tracking-[-0.02em] text-[var(--ink)] text-balance" style={{ fontSize: "clamp(2rem, 5vw, 3.2rem)" }}>
              Inspiration for meaningful celebrations
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-[16px] leading-relaxed text-[var(--slate)] text-balance md:text-[18px]">
              Ideas, guides and stories on invitations, events, and everything in between.
            </p>
          </div>
        </section>

        {/* Topics + search */}
        {list.length ? (
          <section className="container-x mt-8 md:mt-10">
            <div className="flex items-center gap-3">
              <p className="hidden shrink-0 text-[15px] font-semibold text-[var(--ink)] md:block">Explore by topic</p>
              <div className="relative min-w-0 flex-1">
                <div role="group" aria-label="Topics" className="-mx-1 flex gap-2 overflow-x-auto px-1 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {topics.map((t) => (
                    <button
                      key={t}
                      aria-pressed={topic === t}
                      onClick={() => setParam("topic", t === "All" ? null : t)}
                      className={`min-h-[44px] shrink-0 whitespace-nowrap rounded-full border px-4 text-[14px] font-medium transition-colors md:min-h-[38px] ${
                        topic === t ? "border-[var(--ink)] bg-[var(--ink)] text-white" : "border-[var(--line)] bg-white text-[var(--ink)] hover:border-[var(--ink)]"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <button
                onClick={() => setSearchOpen((v) => !v)}
                aria-label="Search articles"
                aria-expanded={searchOpen || !!q}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-[var(--line)] text-[var(--ink)] hover:border-[var(--ink)]"
              >
                <i className="ri-search-line text-lg" />
              </button>
            </div>
            {searchOpen || q ? (
              <input
                autoFocus
                value={q}
                onChange={(e) => setParam("q", e.target.value || null)}
                placeholder="Search articles"
                aria-label="Search articles"
                className="mt-3 h-12 w-full rounded-full border border-[var(--line)] bg-white px-5 text-[16px] text-[var(--ink)] outline-none focus:border-[var(--ink)]"
              />
            ) : null}
          </section>
        ) : null}

        {posts === undefined ? (
          <div className="container-x mt-12 grid gap-6 md:grid-cols-3" aria-hidden>
            {[0, 1, 2].map((i) => (
              <div key={i} className="aspect-[4/5] animate-pulse rounded-[24px] bg-[var(--paper)]" />
            ))}
          </div>
        ) : !list.length ? (
          <section className="container-x mt-14 text-center">
            <p className="text-[16px] text-[var(--slate)]">Our first articles are on the way.</p>
          </section>
        ) : (
          <>
            {/* Featured */}
            {featured ? (
              <section className="container-x mt-12 md:mt-16">
                <Link to={`/blog/${featured.slug}`} className="group grid items-center gap-6 md:grid-cols-2 md:gap-12">
                  <div className="order-2 md:order-1">
                    <p className="eyebrow">Featured · {featured.category}</p>
                    <h2 className="mt-3 font-display font-semibold leading-[1.12] tracking-[-0.01em] text-[var(--ink)] text-balance group-hover:underline group-hover:decoration-1 group-hover:underline-offset-[6px]" style={{ fontSize: "clamp(1.8rem, 3.6vw, 2.6rem)" }}>
                      {featured.title}
                    </h2>
                    {featured.excerpt ? <p className="mt-4 max-w-[46ch] text-[17px] leading-relaxed text-[var(--slate)]">{featured.excerpt}</p> : null}
                    <PostMeta post={featured} className="mt-6" />
                  </div>
                  <div className="order-1 aspect-[4/3] overflow-hidden rounded-[28px] md:order-2">
                    <PostCover post={featured} className="transition-transform duration-500 group-hover:scale-[1.02]" />
                  </div>
                </Link>
              </section>
            ) : null}

            {/* Latest */}
            <section className="container-x mt-14 md:mt-20">
              <h2 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[var(--ink)]">
                {browsing ? (q ? `Results for “${q}”` : topic) : "Latest articles"}
              </h2>
              {rest.length ? (
                <ul className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {rest.slice(0, shown).map((p) => (
                    <li key={p.id}>
                      <Link to={`/blog/${p.slug}`} className="group flex h-full flex-col rounded-[24px] bg-[var(--paper)] p-3 transition-colors hover:bg-[#efeee8]">
                        <div className="aspect-[16/10] overflow-hidden rounded-[18px]">
                          <PostCover post={p} className="transition-transform duration-500 group-hover:scale-[1.03]" />
                        </div>
                        <div className="flex flex-1 flex-col px-2 pb-2 pt-4">
                          <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--slate)]">{p.category}</p>
                          <h3 className="mt-2 font-display text-[1.3rem] font-semibold leading-snug text-[var(--ink)] text-balance">{p.title}</h3>
                          {p.excerpt ? <p className="mt-2 line-clamp-3 text-[15px] leading-relaxed text-[var(--slate)]">{p.excerpt}</p> : null}
                          <PostMeta post={p} className="mt-auto pt-4" />
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-5 text-[15px] text-[var(--slate)]">{browsing ? "No articles match yet." : "More articles soon."}</p>
              )}
              {rest.length > shown ? (
                <div className="mt-8 text-center">
                  <button onClick={() => setShown((n) => n + PAGE)} className="btn btn-ghost">
                    More articles
                  </button>
                </div>
              ) : null}
            </section>
          </>
        )}

        {/* Get in touch */}
        <section className="container-x mt-20 md:mt-28">
          <div className="rounded-[28px] bg-[var(--paper)] px-6 py-16 text-center md:py-24">
            <h2 className="mx-auto max-w-xl font-display font-semibold leading-tight text-[var(--ink)] text-balance" style={{ fontSize: "clamp(1.9rem, 4vw, 2.8rem)" }}>
              Planning something special?
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-[16px] leading-relaxed text-[var(--slate)] text-balance md:text-[18px]">
              Explore our services or get in touch. We’d love to help bring your celebration to life.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <button className="btn btn-primary w-full max-w-[280px] sm:w-auto" onClick={() => navigate("/enquire#start")}>
                Inquire now
              </button>
              <button
                className="group inline-flex min-h-11 items-center gap-1.5 px-2 text-[15px] font-medium text-[var(--ink)]"
                onClick={() => navigate("/services")}
              >
                <span className="underline-offset-[5px] group-hover:underline">Explore our services</span>
                <i className="ri-arrow-right-line" aria-hidden />
              </button>
            </div>
          </div>
        </section>
      </main>
      <FooterSection />
    </>
  );
}
