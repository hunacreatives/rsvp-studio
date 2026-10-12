import { useEffect, useRef, useState } from "react";
import { usePortal } from "@/pages/account/portal/PortalContext";
import { formatDate } from "@/pages/account/portal/format";
import { FilterTabs, Input, PillButton, Select, Textarea, Toggle } from "@/pages/account/portal/ui";
import Markdown from "@/pages/blog/Markdown";
import { BLOG_CATEGORIES, deletePost, loadAllPosts, readMinutes, savePost, slugify, uploadBlogImage, type BlogPost, type PostInput } from "@/pages/blog/blogApi";
import { StudioHeader } from "../StudioLayout";

// Studio → Blog: write, preview and publish articles for /blog (supabase/blog.sql).
// Articles are plain text with a little Markdown (headings, lists, bold, links,
// photos) so anyone on the team can write one.

type Filter = "all" | "published" | "draft";

const toLocalInput = (iso: string | null) => {
  const d = iso ? new Date(iso) : new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const blank = (): PostInput => ({ slug: "", title: "", excerpt: "", body: "", category: "Tips & Guides", cover_url: null, cover_alt: "", author: "The RSVP Studio", featured: false, status: "draft", published_at: null });

export default function BlogPage() {
  const { demo } = usePortal();
  const [posts, setPosts] = useState<BlogPost[] | null | undefined>(undefined);
  const [filter, setFilter] = useState<Filter>("all");
  const [editing, setEditing] = useState<{ id: string | null; p: PostInput } | null>(null);
  const reload = () => loadAllPosts().then(setPosts);
  useEffect(() => {
    if (demo) return setPosts([]);
    reload();
  }, [demo]);

  if (posts === undefined) return <StudioHeader title="Blog" sub="Loading…" />;
  if (posts === null)
    return (
      <>
        <StudioHeader title="Blog" />
        <p className="text-[14px] text-[var(--slate)]">Run supabase/blog.sql on the live database to switch on the blog.</p>
      </>
    );

  if (editing)
    return (
      <PostEditor
        initial={editing}
        onDone={async () => {
          setEditing(null);
          await reload();
        }}
      />
    );

  const shown = posts.filter((p) => filter === "all" || p.status === filter);
  return (
    <>
      <StudioHeader title="Blog" sub="Articles for thersvpstudio.com/blog. Write them here, preview, then publish." />
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <FilterTabs<Filter>
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: `All (${posts.length})` },
            { value: "published", label: `Published (${posts.filter((p) => p.status === "published").length})` },
            { value: "draft", label: `Drafts (${posts.filter((p) => p.status === "draft").length})` },
          ]}
        />
        <PillButton tone="dark" onClick={() => setEditing({ id: null, p: blank() })}>
          New article
        </PillButton>
      </div>
      {shown.length === 0 ? (
        <p className="rounded-[22px] border border-[var(--line)] bg-white px-5 py-10 text-center text-[14px] text-[var(--slate)]">No articles here yet.</p>
      ) : (
        <ul className="divide-y divide-[var(--line)] rounded-[22px] border border-[var(--line)] bg-white">
          {shown.map((p) => {
            const scheduled = p.status === "published" && p.published_at && new Date(p.published_at) > new Date();
            return (
              <li key={p.id}>
                <button onClick={() => setEditing({ id: p.id, p: { ...p } })} className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 px-5 py-4 text-left hover:bg-[#fafafb]">
                  <div className="min-w-0 flex-1 basis-[220px]">
                    <p className="text-[15px] font-semibold text-[var(--ink)]">
                      {p.title || "Untitled"}
                      {p.featured ? <span className="ml-2 text-[12px] font-semibold uppercase tracking-[0.06em] text-[var(--acc-blue)]">Featured</span> : null}
                    </p>
                    <p className="text-[13px] text-[var(--slate)]">
                      {p.category} · {readMinutes(p.body)} min read · edited {formatDate(p.updated_at)}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-[12px] font-semibold uppercase tracking-[0.06em] ${
                      p.status === "published" && !scheduled ? "bg-[#ecfbcc] text-[#3d5a12]" : scheduled ? "bg-[#e4ecff] text-[#2f61d5]" : "bg-[#ececec] text-[#55556a]"
                    }`}
                  >
                    {p.status === "draft" ? "Draft" : scheduled ? `Scheduled ${formatDate(p.published_at)}` : `Live ${formatDate(p.published_at)}`}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

function PostEditor({ initial, onDone }: { initial: { id: string | null; p: PostInput }; onDone: () => void }) {
  const [id, setId] = useState(initial.id);
  const [p, setP] = useState<PostInput>({ ...initial.p, excerpt: initial.p.excerpt ?? "", cover_alt: initial.p.cover_alt ?? "" });
  const [slugTouched, setSlugTouched] = useState(!!initial.id);
  const [tab, setTab] = useState<"write" | "preview">("write");
  const [when, setWhen] = useState(toLocalInput(initial.p.published_at));
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const coverRef = useRef<HTMLInputElement>(null);
  const photoRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const set = (patch: Partial<PostInput>) => (setP((x) => ({ ...x, ...patch })), setSaved(false));

  const save = async (status: "draft" | "published") => {
    setError(null);
    if (!p.title.trim()) return setError("Give the article a title.");
    const slug = p.slug || slugify(p.title);
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) return setError("The web address can only use lowercase letters, numbers and dashes.");
    if (status === "published" && !p.body.trim()) return setError("Write the article before publishing it.");
    setBusy(status === "published" ? "Publishing…" : "Saving…");
    try {
      const published_at = status === "published" ? new Date(when).toISOString() : p.published_at;
      const newId = await savePost(id, { ...p, slug, title: p.title.trim(), excerpt: p.excerpt?.trim() || null, cover_alt: p.cover_alt?.trim() || null, status, published_at });
      setId(newId);
      setP((x) => ({ ...x, slug, status, published_at }));
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t save.");
    }
    setBusy(null);
  };

  const upload = async (file: File, where: "cover" | "body") => {
    setBusy("Uploading photo…");
    setError(null);
    try {
      const url = await uploadBlogImage(file);
      if (where === "cover") set({ cover_url: url });
      else {
        // Drop the photo in where the cursor is, on its own line.
        const ta = bodyRef.current;
        const at = ta?.selectionStart ?? p.body.length;
        const line = `\n\n![](${url})\n\n`;
        set({ body: (p.body.slice(0, at) + line + p.body.slice(at)).replace(/\n{3,}/g, "\n\n") });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t upload.");
    }
    setBusy(null);
  };

  const remove = async () => {
    if (!id) return onDone();
    if (!window.confirm(`Delete “${p.title || "this article"}”? This can’t be undone.`)) return;
    setBusy("Deleting…");
    try {
      await deletePost(id);
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t delete.");
      setBusy(null);
    }
  };

  const live = p.status === "published";
  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <button onClick={onDone} className="inline-flex min-h-11 items-center gap-1.5 text-[14px] text-[var(--slate)] hover:text-[var(--ink)]">
          <i className="ri-arrow-left-line" aria-hidden /> All articles
        </button>
        <div className="flex flex-wrap items-center gap-2">
          {id && p.slug ? (
            <a href={`/blog/${p.slug}`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[44px] items-center rounded-full border border-[var(--line)] px-4 text-[14px] text-[var(--ink)] md:min-h-[38px]">
              {live ? "View on site" : "Preview on site"}
            </a>
          ) : null}
          <PillButton onClick={() => save("draft")} disabled={!!busy}>
            {live ? "Unpublish" : "Save draft"}
          </PillButton>
          <PillButton tone="dark" onClick={() => save("published")} disabled={!!busy}>
            {live ? "Update" : "Publish"}
          </PillButton>
        </div>
      </div>
      {busy || saved || error ? (
        <p className={`mb-4 text-[14px] ${error ? "text-[#c2412d]" : "text-[var(--slate)]"}`} role="status">
          {error ?? busy ?? (live ? "Saved — it’s live." : "Saved as a draft.")}
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <section className="min-w-0 rounded-[22px] border border-[var(--line)] bg-white p-5">
          <input
            value={p.title}
            onChange={(e) => set({ title: e.target.value, ...(slugTouched ? {} : { slug: slugify(e.target.value) }) })}
            placeholder="Article title"
            aria-label="Title"
            className="w-full bg-transparent font-display text-[1.7rem] font-semibold leading-tight text-[var(--ink)] outline-none placeholder:text-[#c4c4cc]"
          />
          <Textarea
            value={p.excerpt ?? ""}
            onChange={(e) => set({ excerpt: e.target.value })}
            placeholder="One or two lines that sum it up (shown on the blog and in link previews)"
            rows={2}
            className="mt-3 w-full"
          />

          <div className="mt-5 flex items-center justify-between gap-3">
            <div role="tablist" className="inline-flex rounded-full border border-[var(--line)] p-0.5 text-[14px]">
              {(["write", "preview"] as const).map((t) => (
                <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`min-h-[40px] rounded-full px-4 md:min-h-[32px] ${tab === t ? "bg-[var(--ink)] text-white" : "text-[var(--ink)]"}`}>
                  {t === "write" ? "Write" : "Preview"}
                </button>
              ))}
            </div>
            {tab === "write" ? (
              <button onClick={() => photoRef.current?.click()} disabled={!!busy} className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-[var(--line)] px-4 text-[14px] text-[var(--ink)] md:min-h-[36px]">
                <i className="ri-image-add-line" aria-hidden /> Add photo
              </button>
            ) : null}
          </div>
          <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={(e) => (e.target.files?.[0] && upload(e.target.files[0], "body"), (e.target.value = ""))} />

          {tab === "write" ? (
            <>
              <textarea
                ref={bodyRef}
                value={p.body}
                onChange={(e) => set({ body: e.target.value })}
                placeholder={"Start writing…\n\n## A heading\nA paragraph. **Bold**, *italic*, [a link](https://thersvpstudio.com).\n\n- A list item\n- Another one"}
                className="mt-3 min-h-[460px] w-full resize-y rounded-2xl border border-[var(--line)] bg-[#fcfcfa] p-4 font-mono text-[15px] leading-relaxed text-[var(--ink)] outline-none focus:border-[var(--ink)] md:text-[14px]"
              />
              <p className="mt-2 text-[13px] text-[var(--slate)]">
                ## heading · **bold** · *italic* · [text](link) · - list · &gt; quote · a blank line between paragraphs · {readMinutes(p.body)} min read
              </p>
            </>
          ) : (
            <div className="mt-4 min-h-[460px] space-y-5 rounded-2xl border border-[var(--line)] p-5 text-[17px] leading-[1.75] text-[#2a2c3d]">
              {p.body.trim() ? <Markdown source={p.body} /> : <p className="text-[var(--slate)]">Nothing written yet.</p>}
            </div>
          )}
        </section>

        <aside className="space-y-4">
          <div className="rounded-[22px] border border-[var(--line)] bg-white p-5">
            <p className="text-[14px] font-semibold text-[var(--ink)]">Cover photo</p>
            {p.cover_url ? (
              <img src={p.cover_url} alt="" className="mt-3 aspect-[16/10] w-full rounded-xl object-cover" />
            ) : (
              <div className="mt-3 grid aspect-[16/10] w-full place-items-center rounded-xl bg-[var(--paper)] text-[13px] text-[var(--slate)]">No photo yet</div>
            )}
            <div className="mt-3 flex gap-2">
              <PillButton onClick={() => coverRef.current?.click()} disabled={!!busy}>
                {p.cover_url ? "Change" : "Upload"}
              </PillButton>
              {p.cover_url ? <PillButton onClick={() => set({ cover_url: null })}>Remove</PillButton> : null}
            </div>
            <input ref={coverRef} type="file" accept="image/*" className="hidden" onChange={(e) => (e.target.files?.[0] && upload(e.target.files[0], "cover"), (e.target.value = ""))} />
            <label className="mt-3 block text-[14px] text-[var(--ink)] md:text-[13px]">
              Describe the photo (for screen readers)
              <Input value={p.cover_alt ?? ""} onChange={(e) => set({ cover_alt: e.target.value })} className="mt-1 w-full" />
            </label>
          </div>

          <div className="space-y-3 rounded-[22px] border border-[var(--line)] bg-white p-5">
            <label className="block text-[14px] text-[var(--ink)] md:text-[13px]">
              Topic
              <Select value={p.category} onChange={(e) => set({ category: e.target.value })} className="mt-1 w-full">
                {[...new Set([...BLOG_CATEGORIES, p.category])].map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </label>
            <label className="block text-[14px] text-[var(--ink)] md:text-[13px]">
              Web address
              <div className="mt-1 flex items-center rounded-xl border border-[var(--line)] bg-white pl-3 text-[14px] text-[var(--slate)]">
                /blog/
                <input
                  value={p.slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    set({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") });
                  }}
                  className="min-w-0 flex-1 bg-transparent py-2.5 pr-3 text-[16px] text-[var(--ink)] outline-none md:text-[14px]"
                  aria-label="Web address"
                />
              </div>
            </label>
            <label className="block text-[14px] text-[var(--ink)] md:text-[13px]">
              Written by
              <Input value={p.author} onChange={(e) => set({ author: e.target.value })} className="mt-1 w-full" />
            </label>
            <label className="block text-[14px] text-[var(--ink)] md:text-[13px]">
              Publish date
              <Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className="mt-1 w-full" />
              <span className="mt-1 block text-[12px] text-[var(--slate)]">A future date schedules it.</span>
            </label>
            <label className="flex min-h-[44px] items-center justify-between gap-3 text-[14px] text-[var(--ink)]">
              Featured at the top of the blog
              <Toggle checked={p.featured} onChange={(v) => set({ featured: v })} label="Featured" />
            </label>
          </div>

          <button onClick={remove} disabled={!!busy} className="min-h-[44px] px-1 text-[14px] text-[#b3382c] hover:underline">
            Delete article
          </button>
        </aside>
      </div>
    </>
  );
}
