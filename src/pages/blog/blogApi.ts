import { supabase } from "@/lib/supabase";
import { compressImage } from "@/lib/compressImage";

// Blog posts (supabase/blog.sql). The public reads published posts; staff write
// them in Studio → Blog.

export const BLOG_CATEGORIES = ["Wedding", "Invitations", "Planning", "Stationery", "Events", "Tips & Guides", "Behind the Scenes"] as const;

export type BlogPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  body: string;
  category: string;
  cover_url: string | null;
  cover_alt: string | null;
  author: string;
  featured: boolean;
  /** Search engines and link previews (supabase/blog-seo.sql). Blank = title / excerpt. */
  seo_title: string | null;
  seo_description: string | null;
  focus_keyword: string | null;
  status: "draft" | "published";
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

/** About 200 words a minute, at least 1. */
export const readMinutes = (body: string) => Math.max(1, Math.round(body.trim().split(/\s+/).filter(Boolean).length / 200));

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

const COLS = "id, slug, title, excerpt, body, category, cover_url, cover_alt, author, featured, seo_title, seo_description, focus_keyword, status, published_at, created_at, updated_at";

/** What Google and link previews show: the SEO fields, else the title and excerpt. */
export const seoTitle = (p: Pick<BlogPost, "seo_title" | "title">) => p.seo_title?.trim() || p.title;
export const seoDescription = (p: Pick<BlogPost, "seo_description" | "excerpt">) => p.seo_description?.trim() || p.excerpt?.trim() || "";

let publishedCache: Promise<BlogPost[] | null> | null = null;
/** Published posts, newest first. null = the blog isn't set up yet. Cached per page load. */
export function loadPublishedPosts(): Promise<BlogPost[] | null> {
  publishedCache ??= Promise.resolve(
    supabase.from("blog_posts").select(COLS).eq("status", "published").lte("published_at", new Date().toISOString()).order("published_at", { ascending: false }).limit(200),
  ).then(({ data, error }) => (error ? null : ((data ?? []) as BlogPost[])));
  return publishedCache;
}

export async function loadPost(slug: string): Promise<BlogPost | null> {
  const { data } = await supabase.from("blog_posts").select(COLS).eq("slug", slug).maybeSingle();
  return (data as BlogPost | null) ?? null;
}

// ── Studio ────────────────────────────────────────────────────────────────
export async function loadAllPosts(): Promise<BlogPost[] | null> {
  const { data, error } = await supabase.from("blog_posts").select(COLS).order("updated_at", { ascending: false }).limit(500);
  return error ? null : ((data ?? []) as BlogPost[]);
}

export type PostInput = Pick<
  BlogPost,
  "slug" | "title" | "excerpt" | "body" | "category" | "cover_url" | "cover_alt" | "author" | "featured" | "seo_title" | "seo_description" | "focus_keyword" | "status" | "published_at"
>;

export async function savePost(id: string | null, p: PostInput): Promise<string> {
  const row = { ...p, updated_at: new Date().toISOString() };
  // Only one featured story at a time.
  if (p.featured) await supabase.from("blog_posts").update({ featured: false }).neq("id", id ?? "00000000-0000-0000-0000-000000000000").eq("featured", true);
  const res = id ? await supabase.from("blog_posts").update(row).eq("id", id).select("id").single() : await supabase.from("blog_posts").insert(row).select("id").single();
  if (res.error) throw new Error(/duplicate|unique/i.test(res.error.message) ? "Another post already uses that web address." : /slug/i.test(res.error.message) ? "The web address can only use lowercase letters, numbers and dashes." : "Couldn’t save the post.");
  publishedCache = null;
  return (res.data as { id: string }).id;
}

export async function deletePost(id: string) {
  const { error } = await supabase.from("blog_posts").delete().eq("id", id);
  if (error) throw new Error("Couldn’t delete the post.");
  publishedCache = null;
}

export async function uploadBlogImage(file: File): Promise<string> {
  const small = await compressImage(file, { maxEdge: 2000, quality: 0.85, stripLocation: true });
  const ext = small.type === "image/png" ? "png" : small.type === "image/webp" ? "webp" : "jpg";
  const path = `blog/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from("project-covers").upload(path, small, { contentType: small.type, upsert: false });
  if (error) throw new Error("Couldn’t upload the image.");
  return supabase.storage.from("project-covers").getPublicUrl(path).data.publicUrl;
}
