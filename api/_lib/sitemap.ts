import type { VercelResponse } from "@vercel/node";
import type { SupabaseClient } from "@supabase/supabase-js";

// /sitemap.xml (vercel.json → /api/invite-page?op=sitemap): the marketing pages and every
// published blog post, so Google finds new ones without anyone editing a file. Cached for an
// hour. Design previews (/build/preview/<id>) aren't listed: they're served with /build as
// their canonical, so listing them told Google two different things.
// Portfolio pages: keep PORTFOLIO in step with src/pages/portfolio/works.ts.

const SITE = "https://thersvpstudio.com";
const PAGES = [
  "/", "/build", "/services", "/services/milestone", "/services/monogram", "/services/save-the-date", "/services/stationery",
  "/services/rsvp", "/tools/seating-chart-maker", "/pickleball", "/collections", "/portfolio", "/faqs", "/contact", "/enquire", "/partners", "/privacy", "/terms",
  // (/blog joins once it has a published article: it's added below with them; /enquire/partner is /partners)
];
// Only works with a case-study page (a live site); the others redirect to the inquiry form.
const PORTFOLIO = ["claudy-at-30", "tercel-at-41", "gel-at-30", "frances-jash", "carlo-and-trixia"];

const url = (path: string, lastmod?: string | null) =>
  `  <url><loc>${SITE}${path}</loc>${lastmod ? `<lastmod>${lastmod.slice(0, 10)}</lastmod>` : ""}</url>`;

export async function sitemap(db: SupabaseClient, res: VercelResponse) {
  const posts = await db.from("blog_posts").select("slug, updated_at, published_at").eq("status", "published").lte("published_at", new Date().toISOString()).order("published_at", { ascending: false }).limit(1000);
  const lines = [
    ...PAGES.map((p) => url(p)),
    ...PORTFOLIO.map((s) => url(`/portfolio/${s}`)),
    ...((posts.data ?? []).length ? [url("/blog")] : []),
    ...((posts.data ?? []) as { slug: string; updated_at: string | null; published_at: string | null }[]).map((p) => url(`/blog/${p.slug}`, p.updated_at ?? p.published_at)),
  ];
  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
  return res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${lines.join("\n")}\n</urlset>\n`);
}
