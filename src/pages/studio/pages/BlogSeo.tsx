import { useMemo, useState } from "react";
import { Input, Modal, Textarea } from "@/pages/account/portal/ui";
import { seoDescription, seoTitle, slugify, type BlogPost, type PostInput } from "@/pages/blog/blogApi";

// Studio → Blog: the "Search engines" card (what Google shows, plus a checklist) and the
// "Add link" picker for linking to our own articles and pages.

const TITLE_MAX = 60;
const DESC_MAX = 160;

/** Our main pages, for internal links. Keep in step with the sitemap (api/_lib/sitemap.ts). */
const SITE_PAGES: { title: string; path: string }[] = [
  { title: "Make your own event website", path: "/build" },
  { title: "Services", path: "/services" },
  { title: "Event websites", path: "/services/milestone" },
  { title: "Monogram design", path: "/services/monogram" },
  { title: "Digital save the date", path: "/services/save-the-date" },
  { title: "Stationery design", path: "/services/stationery" },
  { title: "RSVP management", path: "/services/rsvp" },
  { title: "Mesa: free seating chart maker", path: "/tools/seating-chart-maker" },
  { title: "Collections", path: "/collections" },
  { title: "Portfolio", path: "/portfolio" },
  { title: "FAQ", path: "/faqs" },
  { title: "Get a quote", path: "/enquire" },
  { title: "Partner program", path: "/partners" },
];

const norm = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim();

/** Links in the body to our own site: "/…" or a full thersvpstudio.com address, as paths. */
export function internalLinks(body: string) {
  const out: string[] = [];
  for (const m of body.matchAll(/\[[^\]]+\]\(([^)\s]+)\)/g)) {
    const u = m[1];
    if (/^\/(?!\/)/.test(u)) out.push(u);
    else if (/^https?:\/\/(www\.)?thersvpstudio\.com(\/|$)/i.test(u)) out.push(u.replace(/^https?:\/\/(www\.)?thersvpstudio\.com/i, "") || "/");
  }
  return out;
}

function Counter({ n, max, min }: { n: number; max: number; min: number }) {
  const tone = n === 0 ? "text-[var(--slate)]" : n > max ? "text-[#c2412d]" : n < min ? "text-[#a86a00]" : "text-[#3d5a12]";
  return (
    <span className={`text-[12px] tabular-nums ${tone}`}>
      {n}/{max}
    </span>
  );
}

export function SeoPanel({ p, set, posts, selfId }: { p: PostInput; set: (patch: Partial<PostInput>) => void; posts: BlogPost[]; selfId: string | null }) {
  const title = seoTitle(p);
  const desc = seoDescription(p);
  const kw = norm(p.focus_keyword ?? "");

  const checks = useMemo(() => {
    const body = p.body;
    const words = body.trim() ? body.trim().split(/\s+/).length : 0;
    const firstPara = body.split(/\n\s*\n/).map((b) => b.trim()).find((b) => b && !/^(#|!\[)/.test(b)) ?? "";
    const links = internalLinks(body);
    // Links to articles that don't exist (or aren't live yet) — they'd 404 for readers.
    const live = new Set(posts.filter((o) => o.id !== selfId && o.status === "published").map((o) => `/blog/${o.slug}`));
    const broken = [...new Set(links.filter((l) => l.startsWith("/blog/") && !live.has(l.replace(/[?#].*$/, "").replace(/\/$/, ""))))];
    const photosNoAlt = [...body.matchAll(/^!\[\s*\]\(/gm)].length;
    const list: { ok: boolean; warn?: boolean; text: string }[] = [];
    if (!kw) list.push({ ok: false, text: "Add a focus keyphrase: the words people would search for" });
    else {
      list.push({ ok: norm(title).includes(kw), text: "Keyphrase in the search title" });
      list.push({ ok: norm(desc).includes(kw), text: "Keyphrase in the description" });
      list.push({ ok: p.slug.includes(slugify(kw)), text: "Keyphrase in the web address" });
      list.push({ ok: norm(firstPara).includes(kw), text: "Keyphrase in the first paragraph" });
    }
    list.push({ ok: title.length >= 30 && title.length <= TITLE_MAX, text: `Search title ${title.length < 30 ? "is short" : title.length > TITLE_MAX ? "gets cut off" : "fits"} (30–${TITLE_MAX} characters)` });
    list.push({ ok: desc.length >= 120 && desc.length <= DESC_MAX, text: !desc ? "Add a description" : `Description ${desc.length < 120 ? "is short" : desc.length > DESC_MAX ? "gets cut off" : "fits"} (120–${DESC_MAX} characters)` });
    list.push({ ok: words >= 600, warn: words >= 300 && words < 600, text: `${words} words (600+ ranks best for guides)` });
    list.push({ ok: /^##\s/m.test(body), text: "Subheadings (## …) break up the article" });
    list.push({ ok: links.length >= 2, warn: links.length === 1, text: `${links.length} link${links.length === 1 ? "" : "s"} to our own pages (aim for 2 or more)` });
    if (broken.length) list.push({ ok: false, text: `Not live yet, or no such article: ${broken.join(", ")}` });
    list.push({ ok: !!p.cover_url && !!p.cover_alt?.trim(), text: !p.cover_url ? "Add a cover photo (used in link previews)" : "Describe the cover photo" });
    if (photosNoAlt) list.push({ ok: false, text: `${photosNoAlt} photo${photosNoAlt === 1 ? "" : "s"} in the article without a description: type it between ![ and ]` });
    return list;
  }, [p, title, desc, kw, posts, selfId]);

  const done = checks.filter((c) => c.ok).length;
  const url = `thersvpstudio.com › blog › ${p.slug || "…"}`;

  return (
    <div className="rounded-[22px] border border-[var(--line)] bg-white p-5">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[14px] font-semibold text-[var(--ink)]">Search engines</p>
        <span className="text-[12px] text-[var(--slate)]">
          {done}/{checks.length} done
        </span>
      </div>

      <div className="mt-4 grid gap-6 md:grid-cols-2">
        <div className="space-y-3">
          <label className="block text-[14px] text-[var(--ink)] md:text-[13px]">
            <span className="flex items-center justify-between">
              Search title <Counter n={title.length} max={TITLE_MAX} min={30} />
            </span>
            <Input value={p.seo_title ?? ""} onChange={(e) => set({ seo_title: e.target.value })} placeholder={p.title || "Same as the article title"} className="mt-1 w-full" />
          </label>
          <label className="block text-[14px] text-[var(--ink)] md:text-[13px]">
            <span className="flex items-center justify-between">
              Description <Counter n={desc.length} max={DESC_MAX} min={120} />
            </span>
            <Textarea value={p.seo_description ?? ""} onChange={(e) => set({ seo_description: e.target.value })} placeholder={p.excerpt || "Same as the summary under the title"} rows={4} className="mt-1 w-full" />
          </label>
          <label className="block text-[14px] text-[var(--ink)] md:text-[13px]">
            Focus keyphrase
            <Input value={p.focus_keyword ?? ""} onChange={(e) => set({ focus_keyword: e.target.value })} placeholder="e.g. wedding invitation wording" className="mt-1 w-full" />
          </label>
          <p className="text-[12px] text-[var(--slate)]">Leave the title and description blank to use the article’s own.</p>
        </div>

        <div>
          {/* Roughly how Google lists it. */}
          <div className="rounded-xl bg-[var(--paper)] p-3" aria-label="Google preview">
            <p className="truncate text-[12px] text-[#4d5156]">{url}</p>
            <p className="mt-0.5 line-clamp-2 text-[17px] leading-snug text-[#1a0dab]">{title ? (title.length > TITLE_MAX ? `${title.slice(0, TITLE_MAX - 1)}…` : title) : "Article title"}</p>
            <p className="mt-1 line-clamp-2 text-[13px] leading-snug text-[#4d5156]">{desc || "Add a description: one or two lines on what the reader will get."}</p>
          </div>
          <ul className="mt-4 space-y-2">
            {checks.map((c) => (
              <li key={c.text} className="flex gap-2 text-[13px] leading-snug text-[var(--ink)]">
                <i
                  className={`mt-px shrink-0 ${c.ok ? "ri-checkbox-circle-fill text-[#4f7a16]" : c.warn ? "ri-error-warning-fill text-[#a86a00]" : "ri-close-circle-fill text-[#c2412d]"}`}
                  aria-label={c.ok ? "Done" : "To do"}
                />
                <span className={c.ok ? "text-[var(--slate)]" : ""}>{c.text}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

/** "Add link": search our articles and pages, then insert [text](/path) at the cursor. */
export function LinkPicker({ open, onClose, onPick, posts, selfId }: { open: boolean; onClose: () => void; onPick: (path: string, title: string) => void; posts: BlogPost[]; selfId: string | null }) {
  const [q, setQ] = useState("");
  const [custom, setCustom] = useState("");
  const query = norm(q);
  const articles = posts
    .filter((o) => o.id !== selfId)
    .filter((o) => !query || norm(`${o.title} ${o.category} ${o.focus_keyword ?? ""}`).includes(query))
    // Live first, then newest.
    .sort((a, b) => Number(b.status === "published") - Number(a.status === "published") || (b.published_at ?? b.updated_at).localeCompare(a.published_at ?? a.updated_at));
  const pages = SITE_PAGES.filter((s) => !query || norm(s.title).includes(query));
  const close = () => (setQ(""), setCustom(""), onClose());
  const pick = (path: string, title: string) => (onPick(path, title), close());
  const row = "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-[var(--paper)] min-h-[44px]";

  return (
    <Modal open={open} onClose={close} title="Add a link" width={560}>
      <Input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search articles and pages" aria-label="Search articles and pages" className="w-full" />
      <div className="mt-4 max-h-[50vh] overflow-y-auto">
        {articles.length ? (
          <>
            <p className="px-3 text-[12px] font-semibold uppercase tracking-[0.1em] text-[var(--slate)]">Articles</p>
            <ul className="mt-1">
              {articles.slice(0, 30).map((o) => (
                <li key={o.id}>
                  <button className={row} onClick={() => pick(`/blog/${o.slug}`, o.title)}>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] text-[var(--ink)]">{o.title || "Untitled"}</span>
                      <span className="block text-[12px] text-[var(--slate)]">
                        {o.category} · /blog/{o.slug}
                      </span>
                    </span>
                    {o.status !== "published" ? <span className="shrink-0 rounded-full bg-[#ececec] px-2 py-0.5 text-[11px] font-semibold uppercase text-[#55556a]">Draft</span> : null}
                  </button>
                </li>
              ))}
            </ul>
          </>
        ) : null}
        {pages.length ? (
          <>
            <p className="mt-3 px-3 text-[12px] font-semibold uppercase tracking-[0.1em] text-[var(--slate)]">Pages</p>
            <ul className="mt-1">
              {pages.map((s) => (
                <li key={s.path}>
                  <button className={row} onClick={() => pick(s.path, s.title)}>
                    <span className="min-w-0 flex-1 truncate text-[15px] text-[var(--ink)]">{s.title}</span>
                    <span className="shrink-0 text-[12px] text-[var(--slate)]">{s.path}</span>
                  </button>
                </li>
              ))}
            </ul>
          </>
        ) : null}
        {!articles.length && !pages.length ? <p className="px-3 py-4 text-[14px] text-[var(--slate)]">Nothing matches “{q}”.</p> : null}
      </div>
      <form
        className="mt-4 flex gap-2 border-t border-[var(--line)] pt-4"
        onSubmit={(e) => {
          e.preventDefault();
          const u = custom.trim();
          if (u) pick(/^(https?:\/\/|\/|mailto:)/i.test(u) ? u : `https://${u}`, "");
        }}
      >
        <Input value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Or paste a web address" aria-label="Web address" className="min-w-0 flex-1" />
        <button type="submit" className="min-h-[44px] shrink-0 rounded-full border border-[var(--line)] px-4 text-[14px] text-[var(--ink)] hover:border-[var(--ink)]">
          Add
        </button>
      </form>
    </Modal>
  );
}
