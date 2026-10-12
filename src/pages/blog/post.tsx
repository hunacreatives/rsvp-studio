import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import AnnouncementBar from "../home/components/AnnouncementBar";
import Navbar from "../home/components/Navbar";
import FooterSection from "../home/components/FooterSection";
import { formatDate } from "@/pages/account/portal/format";
import Markdown from "./Markdown";
import { PostCover, PostMeta } from "./page";
import { loadPost, loadPublishedPosts, readMinutes, type BlogPost } from "./blogApi";

// /blog/:slug — one article: title, cover, the story, sharing, and more to read.
// Drafts open too for staff (RLS lets only them read unpublished posts).

function setHeadMeta(post: BlogPost) {
  document.title = `${post.title} — The RSVP Studio`;
  const desc = post.excerpt ?? "";
  for (const [sel, attr, key, val] of [
    ['meta[name="description"]', "name", "description", desc],
    ['meta[property="og:title"]', "property", "og:title", post.title],
    ['meta[property="og:description"]', "property", "og:description", desc],
    ...(post.cover_url ? [['meta[property="og:image"]', "property", "og:image", post.cover_url] as const] : []),
  ] as const) {
    let el = document.head.querySelector<HTMLMetaElement>(sel);
    if (!el) {
      el = document.createElement("meta");
      el.setAttribute(attr, key);
      document.head.appendChild(el);
    }
    el.content = val;
  }
}

export default function BlogPostPage() {
  const { slug = "" } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<BlogPost | null | undefined>(undefined);
  const [more, setMore] = useState<BlogPost[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setPost(undefined);
    Promise.all([loadPost(slug), loadPublishedPosts()]).then(([p, all]) => {
      setPost(p);
      if (p) setHeadMeta(p);
      const others = (all ?? []).filter((o) => o.slug !== slug);
      // Same topic first, then the newest.
      setMore([...others.filter((o) => o.category === p?.category), ...others].filter((o, i, a) => a.indexOf(o) === i).slice(0, 3));
    });
    window.scrollTo(0, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const url = typeof window !== "undefined" ? `${window.location.origin}/blog/${slug}` : "";
  const copy = async () => {
    await navigator.clipboard.writeText(url).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <>
      <AnnouncementBar />
      <Navbar />
      <main className="pb-20 md:pb-28">
        {post === undefined ? (
          <div className="container-x mx-auto mt-16 max-w-3xl space-y-4" aria-hidden>
            <div className="h-4 w-32 animate-pulse rounded bg-[var(--paper)]" />
            <div className="h-12 w-full animate-pulse rounded bg-[var(--paper)]" />
            <div className="aspect-[16/9] w-full animate-pulse rounded-[28px] bg-[var(--paper)]" />
          </div>
        ) : post === null ? (
          <section className="container-x mt-24 text-center">
            <h1 className="font-display text-[2rem] font-semibold text-[var(--ink)]">We couldn’t find that article</h1>
            <p className="mt-3 text-[var(--slate)]">It may have moved. The latest articles are on the journal.</p>
            <Link to="/blog" className="btn btn-primary mt-8 inline-flex">
              Go to the journal
            </Link>
          </section>
        ) : (
          <article>
            <header className="container-x mx-auto max-w-3xl pt-8 text-center md:pt-14">
              <Link to="/blog" className="inline-flex min-h-11 items-center gap-1.5 text-[14px] text-[var(--slate)] hover:text-[var(--ink)]">
                <i className="ri-arrow-left-line" aria-hidden /> The Journal
              </Link>
              {post.status !== "published" ? (
                <p className="mx-auto mt-3 w-fit rounded-full bg-[var(--acc-yellow)] px-3 py-1 text-[12px] font-semibold text-[var(--ink)]">Draft — only the studio can see this</p>
              ) : null}
              <p className="eyebrow mt-4">{post.category}</p>
              <h1 className="mt-3 font-display font-semibold leading-[1.1] tracking-[-0.02em] text-[var(--ink)] text-balance" style={{ fontSize: "clamp(2rem, 5vw, 3.2rem)" }}>
                {post.title}
              </h1>
              {post.excerpt ? <p className="mx-auto mt-5 max-w-2xl text-[17px] leading-relaxed text-[var(--slate)] text-balance md:text-[19px]">{post.excerpt}</p> : null}
              <p className="mt-6 text-[14px] text-[var(--slate)]">
                By {post.author} <span aria-hidden>·</span> {post.published_at ? formatDate(post.published_at) : "Not published"} <span aria-hidden>·</span> {readMinutes(post.body)} min read
              </p>
            </header>

            {post.cover_url ? (
              <div className="container-x mt-10 md:mt-14">
                <div className="mx-auto aspect-[16/9] max-w-5xl overflow-hidden rounded-[28px]">
                  <PostCover post={post} />
                </div>
              </div>
            ) : null}

            <div className="container-x mt-10 md:mt-14">
              <div className="mx-auto max-w-[68ch] space-y-5 text-[17px] leading-[1.75] text-[#2a2c3d] md:text-[18px]">
                {post.body.trim() ? <Markdown source={post.body} /> : <p className="text-[var(--slate)]">This article is still being written.</p>}
              </div>

              {/* Share */}
              <div className="mx-auto mt-12 flex max-w-[68ch] flex-wrap items-center gap-3 border-t border-[var(--line)] pt-6">
                <p className="mr-auto text-[14px] font-semibold text-[var(--ink)]">Share this article</p>
                <a
                  href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Share on Facebook"
                  className="grid h-11 w-11 place-items-center rounded-full border border-[var(--line)] text-[var(--ink)] hover:border-[var(--ink)]"
                >
                  <i className="ri-facebook-fill text-lg" />
                </a>
                <a
                  href={`fb-messenger://share/?link=${encodeURIComponent(url)}`}
                  aria-label="Send in Messenger"
                  className="grid h-11 w-11 place-items-center rounded-full border border-[var(--line)] text-[var(--ink)] hover:border-[var(--ink)] md:hidden"
                >
                  <i className="ri-messenger-line text-lg" />
                </a>
                <button onClick={copy} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[var(--line)] px-4 text-[14px] font-medium text-[var(--ink)] hover:border-[var(--ink)]">
                  <i className="ri-link" aria-hidden /> {copied ? "Copied" : "Copy link"}
                </button>
              </div>
            </div>
          </article>
        )}

        {/* More to read */}
        {post && more.length ? (
          <section className="container-x mt-20 md:mt-24">
            <h2 className="text-[13px] font-semibold uppercase tracking-[0.14em] text-[var(--ink)]">More from the journal</h2>
            <ul className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {more.map((p) => (
                <li key={p.id}>
                  <Link to={`/blog/${p.slug}`} className="group flex h-full flex-col rounded-[24px] bg-[var(--paper)] p-3 transition-colors hover:bg-[#efeee8]">
                    <div className="aspect-[16/10] overflow-hidden rounded-[18px]">
                      <PostCover post={p} className="transition-transform duration-500 group-hover:scale-[1.03]" />
                    </div>
                    <div className="flex flex-1 flex-col px-2 pb-2 pt-4">
                      <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--slate)]">{p.category}</p>
                      <h3 className="mt-2 font-display text-[1.3rem] font-semibold leading-snug text-[var(--ink)] text-balance">{p.title}</h3>
                      <PostMeta post={p} className="mt-auto pt-4" />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {post ? (
          <section className="container-x mt-20 md:mt-24">
            <div className="rounded-[28px] bg-[var(--paper)] px-6 py-14 text-center md:py-20">
              <h2 className="mx-auto max-w-xl font-display font-semibold leading-tight text-[var(--ink)] text-balance" style={{ fontSize: "clamp(1.8rem, 3.6vw, 2.5rem)" }}>
                Planning something special?
              </h2>
              <p className="mx-auto mt-3 max-w-lg text-[16px] text-[var(--slate)] text-balance">Tell us about your celebration and we’ll take it from there.</p>
              <button className="btn btn-primary mt-7" onClick={() => navigate("/enquire#start")}>
                Inquire now
              </button>
            </div>
          </section>
        ) : null}
      </main>
      <FooterSection />
    </>
  );
}
