import type { VercelResponse } from "@vercel/node";
import type { SupabaseClient } from "@supabase/supabase-js";
import { esc } from "./email.js";

// /blog/:slug (vercel.json → /api/invite-page?op=blog&slug=…): the article's own title,
// description, canonical, link-preview tags and BlogPosting data in the <head>, and the
// article itself as plain HTML inside #root — so Google and Messenger / Facebook read it
// without running the app. The app replaces #root on load with the same words.
// Drafts and scheduled posts aren't readable here (RLS), so they get a 404 + noindex.

const SITE = "https://thersvpstudio.com";

type Post = {
  slug: string;
  title: string;
  excerpt: string | null;
  body: string;
  category: string;
  cover_url: string | null;
  cover_alt: string | null;
  author: string;
  seo_title: string | null;
  seo_description: string | null;
  published_at: string | null;
  updated_at: string;
};

const safeUrl = (u: string) => (/^(https?:\/\/|\/|mailto:)/i.test(u.trim()) ? u.trim() : "#");

/** **bold**, *italic*, [text](link) on already-split text; everything escaped. */
function inline(text: string): string {
  const re = /\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*/;
  let out = "";
  let rest = text;
  for (let m = re.exec(rest); m; m = re.exec(rest)) {
    out += esc(rest.slice(0, m.index));
    if (m[1] !== undefined) out += `<a href="${esc(safeUrl(m[2]))}">${inline(m[1])}</a>`;
    else if (m[3] !== undefined) out += `<strong>${inline(m[3])}</strong>`;
    else out += `<em>${inline(m[4])}</em>`;
    rest = rest.slice(m.index + m[0].length);
  }
  return out + esc(rest);
}

/** The same simple Markdown as src/pages/blog/Markdown.tsx, as HTML. */
export function markdownToHtml(source: string): string {
  const out: string[] = [];
  let para: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  let quote: string[] = [];
  const flush = () => {
    if (para.length) out.push(`<p>${inline(para.join(" "))}</p>`);
    if (list) out.push(`<${list.ordered ? "ol" : "ul"}>${list.items.map((i) => `<li>${inline(i)}</li>`).join("")}</${list.ordered ? "ol" : "ul"}>`);
    if (quote.length) out.push(`<blockquote>${inline(quote.join(" "))}</blockquote>`);
    para = [];
    list = null;
    quote = [];
  };
  for (const raw of source.replace(/\r\n/g, "\n").split("\n")) {
    const t = raw.trim();
    let m: RegExpExecArray | null;
    if (!t) flush();
    else if ((m = /^(#{1,3})\s+(.*)$/.exec(t))) {
      flush();
      const tag = m[1].length === 3 ? "h3" : "h2";
      out.push(`<${tag}>${inline(m[2])}</${tag}>`);
    } else if ((m = /^!\[([^\]]*)\]\(([^)\s]+)\)$/.exec(t))) {
      flush();
      out.push(`<figure><img src="${esc(safeUrl(m[2]))}" alt="${esc(m[1])}" loading="lazy" />${m[1] ? `<figcaption>${esc(m[1])}</figcaption>` : ""}</figure>`);
    } else if (/^(-{3,}|\*{3,})$/.test(t)) {
      flush();
      out.push("<hr />");
    } else if ((m = /^[-*]\s+(.*)$/.exec(t)) || (m = /^\d+[.)]\s+(.*)$/.exec(t))) {
      const ordered = /^\d/.test(t);
      if (para.length || quote.length || (list && list.ordered !== ordered)) flush();
      list ??= { ordered, items: [] };
      list.items.push(m[1]);
    } else if ((m = /^>\s?(.*)$/.exec(t))) {
      if (para.length || list) flush();
      quote.push(m[1]);
    } else {
      if (list || quote.length) flush();
      para.push(t);
    }
  }
  flush();
  return out.join("\n");
}

const strip = (html: string) =>
  html
    .replace(/<title>[\s\S]*?<\/title>/, "")
    .replace(/<meta\s+name="description"[\s\S]*?\/>/, "")
    .replace(/<link\s+rel="canonical"[\s\S]*?\/>/, "")
    .replace(/<meta\s+property="og:(title|description|type|url|site_name)"[\s\S]*?\/>/g, "");

export async function blogPage(db: SupabaseClient, slugParam: unknown, res: VercelResponse, shellHtml: string) {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  const slug = String(slugParam ?? "").toLowerCase();
  const { data } = /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)
    ? await db
        .from("blog_posts")
        .select("slug, title, excerpt, body, category, cover_url, cover_alt, author, seo_title, seo_description, published_at, updated_at")
        .eq("slug", slug)
        .eq("status", "published")
        .lte("published_at", new Date().toISOString())
        .maybeSingle()
    : { data: null };
  const post = data as Post | null;

  if (!post) {
    // Not live (or no such article): the app shows its "couldn't find" page. Staff still
    // see drafts there, since the app reads them with their own login.
    res.setHeader("X-Robots-Tag", "noindex");
    res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
    return res.status(404).send(shellHtml);
  }

  const url = `${SITE}/blog/${post.slug}`;
  const title = post.seo_title?.trim() || post.title;
  const description = post.seo_description?.trim() || post.excerpt?.trim() || "";
  const image = post.cover_url && /^https:\/\//.test(post.cover_url) ? post.cover_url : "";
  const ld = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BlogPosting",
        headline: post.title,
        description: description || undefined,
        image: image || undefined,
        datePublished: post.published_at,
        dateModified: post.updated_at,
        articleSection: post.category,
        author: post.author === "The RSVP Studio" ? { "@type": "Organization", name: post.author, url: SITE } : { "@type": "Person", name: post.author },
        publisher: { "@type": "Organization", name: "The RSVP Studio", url: SITE, logo: { "@type": "ImageObject", url: `${SITE}/brand/monogram-dark.png` } },
        mainEntityOfPage: url,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: `${SITE}/` },
          { "@type": "ListItem", position: 2, name: "The Journal", item: `${SITE}/blog` },
          { "@type": "ListItem", position: 3, name: post.title, item: url },
        ],
      },
    ],
  };
  const tags = [
    `<title>${esc(`${title} — The RSVP Studio`)}</title>`,
    description ? `<meta name="description" content="${esc(description)}" />` : "",
    `<link rel="canonical" href="${esc(url)}" />`,
    `<meta property="og:title" content="${esc(title)}" />`,
    description ? `<meta property="og:description" content="${esc(description)}" />` : "",
    `<meta property="og:type" content="article" />`,
    `<meta property="og:site_name" content="The RSVP Studio" />`,
    `<meta property="og:url" content="${esc(url)}" />`,
    image ? `<meta property="og:image" content="${esc(image)}" />` : "",
    image && post.cover_alt ? `<meta property="og:image:alt" content="${esc(post.cover_alt)}" />` : "",
    post.published_at ? `<meta property="article:published_time" content="${esc(post.published_at)}" />` : "",
    `<meta property="article:modified_time" content="${esc(post.updated_at)}" />`,
    `<meta property="article:section" content="${esc(post.category)}" />`,
    `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, "\\u003c")}</script>`,
  ]
    .filter(Boolean)
    .join("\n    ");

  let html = strip(shellHtml);
  // The cover replaces the site's default preview image (and its fixed 1200×630 size).
  if (image) html = html.replace(/<meta\s+property="og:image(:\w+)?"[\s\S]*?\/>/g, "");
  const body = [
    `<main><article>`,
    `<p><a href="/blog">The Journal</a> · ${esc(post.category)}</p>`,
    `<h1>${esc(post.title)}</h1>`,
    post.excerpt ? `<p>${esc(post.excerpt)}</p>` : "",
    `<p>By ${esc(post.author)}</p>`,
    image ? `<img src="${esc(image)}" alt="${esc(post.cover_alt ?? "")}" />` : "",
    markdownToHtml(post.body),
    `</article></main>`,
  ].join("\n");
  html = html.replace("</head>", `    ${tags}\n  </head>`).replace('<div id="root"></div>', `<div id="root">${body}</div>`);
  res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=3600");
  return res.status(200).send(html);
}
