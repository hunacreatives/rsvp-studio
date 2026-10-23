import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { esc } from "./_lib/email.js";
import { sitemap } from "./_lib/sitemap.js";
import { qrHandler } from "./_lib/qr.js";
import { blogPage } from "./_lib/blog-page.js";
import { SEATING_NAME, SEATING_DESCRIPTION, SEATING_FACTS, SEATING_FAQ, SEATING_H1, SEATING_LAYOUT, SEATING_PATH, SEATING_STEPS, SEATING_SUB, SEATING_TITLE } from "./_lib/seating-copy.js";

// /invite/:slug, served with the event's own title, description and photo in the
// page head — so a link shared on Messenger / Viber / Facebook shows "Mia & Noah",
// the date and the cover photo instead of the generic site preview. The page itself
// is the normal app (same index.html); only the <head> tags differ.
// vercel.json rewrites /invite/:slug here — and every page of a customer's own domain
// (?domain=1), where the site is found from the host (get_site_by_domain).

const db = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);
let shell: { html: string; at: number } | null = null;

type Img = { masterUrl?: string; width?: number; height?: number; alt?: string };
type Content = {
  hosts?: { name?: string }[];
  eventDate?: string;
  occasion?: string;
  primaryLocation?: { name?: string; addressLine?: string };
  galleries?: { items?: { order?: number; image?: Img }[] }[];
  custom?: Record<string, string>;
};

const KIND: Record<string, string> = { wedding: "Wedding", birthday: "Birthday", anniversary: "Anniversary" };
// Baby sites say which day it is themselves (custom "babyEvent": christening, first birthday…).
const BABY: Record<string, string> = { christening: "Christening", birthday: "First birthday", both: "Christening & first birthday", dedication: "Dedication" };

/** "Ana & Ben", or "Ana, Ben & Cy". */
const joinNames = (n: string[]) => (n.length > 2 ? `${n.slice(0, -1).join(", ")} & ${n[n.length - 1]}` : n.join(" & "));

/** "Saturday, December 4, 2027" from the event's date (no time zone games: the date as written). */
function longDate(iso?: string) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}/.test(iso)) return "";
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
}

// The preview card: names in the title; the description is the facts a guest looks for
// (what, when, where) and kept under ~110 characters, where Messenger and Facebook cut it.
function describe(c: Content, ended: boolean) {
  const names = joinNames((c.hosts ?? []).map((h) => h.name?.trim() ?? "").filter(Boolean));
  const title = names ? `${names} — You’re Invited` : "You’re Invited";
  const loc = c.primaryLocation;
  // The town from the address: "Tagaytay, Cavite" → Tagaytay; "32nd Street, BGC, Taguig" → Taguig.
  const parts = (loc?.addressLine ?? "").split(",").map((p) => p.trim()).filter(Boolean);
  const town = parts.length >= 3 ? parts[parts.length - 1] : parts[0] ?? "";
  const where = loc?.name?.trim() ? (town && !loc.name.includes(town) ? `${loc.name.trim()}, ${town}` : loc.name.trim()) : loc?.addressLine?.trim() ?? "";
  const kind = c.occasion === "baby" ? BABY[c.custom?.babyEvent ?? ""] ?? "Christening" : c.occasion ? KIND[c.occasion] ?? "" : "";
  const facts = [kind, longDate(c.eventDate), where].filter(Boolean).join(" · ");
  const ask = ended ? "Thank you for celebrating with us." : "Tap for the details and to RSVP.";
  return { title, description: facts ? `${facts}. ${ask}` : ask };
}

/** The photo guests see first: the design's cover photo, else the first photo in the couple's order. */
/** A short, stable fingerprint of a URL (for cache-busting the preview photo). */
function shortHash(s: string) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

/**
 * /og/<slug>.jpg: the site's preview photo (its cover, or the live Save the Date card),
 * fetched from wherever it's stored and passed on with headers link previews accept.
 */
async function ogImage(req: VercelRequest, res: VercelResponse) {
  const slug = String(req.query.slug ?? "").toLowerCase().replace(/\.jpg$/, "");
  const fail = () => {
    res.setHeader("Cache-Control", "public, max-age=300");
    res.status(302).setHeader("Location", "https://thersvpstudio.com/og-default.jpg").end();
  };
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) return fail();
  const { data } = await db.rpc("get_public_site", { p_slug: slug });
  const row = (Array.isArray(data) ? data[0] : data) as { state?: string; published_content?: Content; published_presentation?: Presentation; std?: Std | null; std_live?: boolean } | null;
  if (!row || row.state === "ended") return fail();
  const url = row.std_live && row.std?.image?.url ? row.std.image.url : row.published_content ? coverOf(row.published_content, row.published_presentation)?.masterUrl : undefined;
  if (!url || !/^https:\/\//.test(url)) return fail();
  const r = await fetch(url).catch(() => null);
  const type = r?.headers.get("content-type") ?? "";
  if (!r?.ok || !type.startsWith("image/")) return fail();
  const body = Buffer.from(await r.arrayBuffer());
  if (body.length > 8_000_000) return fail(); // Facebook's limit
  res.setHeader("Content-Type", type);
  res.setHeader("Content-Length", String(body.length));
  res.setHeader("Cache-Control", "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800");
  res.status(200).send(body);
}

function coverOf(c: Content, pres: Presentation | undefined): Img | undefined {
  const hero = pres?.byTemplate?.[pres.activeTemplateId ?? ""]?.heroImage;
  if (hero?.masterUrl) return hero;
  return (c.galleries ?? []).flatMap((g) => [...(g.items ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))).find((i) => i.image?.masterUrl)?.image;
}
type Presentation = { activeTemplateId?: string; byTemplate?: Record<string, { heroImage?: Img }> };

type Std = { names?: string[]; occasion?: string; eventDate?: string; venue?: string; image?: { url?: string; width?: number; height?: number } };

function describeStd(s: Std) {
  const names = joinNames((s.names ?? []).map((x) => x?.trim()).filter(Boolean) as string[]);
  const title = names ? `${names} — Save the Date` : "Save the Date";
  const facts = [s.occasion ? KIND[s.occasion] ?? "" : "", longDate(s.eventDate), s.venue?.trim() ?? ""].filter(Boolean).join(" · ");
  return { title, description: `${facts ? `${facts}. ` : ""}Tap to add it to your calendar.` };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // /sitemap.xml shares this function (vercel.json): the Hobby plan allows 12.
  if (req.query.op === "sitemap") return sitemap(db, res);
  // /qr/<slug>.png: the photo page's QR code for the hosts' emails.
  if (req.query.op === "qr") return qrHandler(req, res);
  // /og/<slug>.jpg: the link preview's photo, from our own domain (see ogImage).
  if (req.query.op === "og") return ogImage(req, res);
  const host = String(req.headers["x-forwarded-host"] ?? req.headers.host ?? "");
  const origin = `https://${host}`;
  let slug = String(req.query.slug ?? "").toLowerCase();
  if (req.query.domain === "1") {
    const { data } = await db.rpc("get_site_by_domain", { p_host: host });
    slug = typeof data === "string" ? data : "";
    // Event sites stay out of search engines, on their own domain too.
    res.setHeader("X-Robots-Tag", "noindex, nofollow");
  }

  // The app's own index.html (cached for a few minutes per instance).
  if (!shell || Date.now() - shell.at > 5 * 60_000) {
    const r = await fetch(`${origin}/index.html`).catch(() => null);
    const text = r?.ok ? await r.text() : "";
    if (text.includes("<div id=\"root\">")) shell = { html: text, at: Date.now() };
  }
  if (!shell) {
    // Couldn't fetch the app shell: send people to the plain page instead (no preview tags).
    res.setHeader("Cache-Control", "no-store");
    return res.status(503).send(`<!doctype html><meta charset="utf-8"><meta http-equiv="refresh" content="2"><p style="font-family:sans-serif">Loading the invitation…</p>`);
  }
  let html = shell.html;

  // Our own tool pages (?op=page): their title, description and text in the HTML itself.
  if (req.query.op === "page") return toolPage(req, res, html, origin);
  // Blog articles (?op=blog): their own title, description, preview and text in the HTML.
  if (req.query.op === "blog") return blogPage(db, req.query.slug, res, html);

  if (/^[a-z0-9-]{1,80}$/.test(slug)) {
    const { data } = await db.rpc("get_public_site", { p_slug: slug });
    const row = (Array.isArray(data) ? data[0] : data) as { state?: string; published_content?: Content; published_presentation?: Presentation; std?: Std | null; std_live?: boolean } | null;
    // A studio Save the Date (supabase/save-the-date.sql): the card itself is the preview.
    const std = row?.std_live && row.std?.image?.url ? row.std : null;
    if (std || row?.published_content) {
      const c = row?.published_content ?? {};
      const ended = row?.state === "ended";
      const { title, description } = std ? describeStd(std) : describe(c, ended);
      const cover: Img | undefined = std ? { masterUrl: std.image!.url!, width: std.image!.width, height: std.image!.height } : coverOf(c, row?.published_presentation);
      // Ended sites' photos are removed later, so their previews don't use them.
      const image = !ended && cover?.masterUrl && /^https:\/\//.test(cover.masterUrl) ? cover : null;
      const tags = [
        `<title>${esc(title)}</title>`,
        `<meta name="description" content="${esc(description)}" />`,
        `<meta property="og:title" content="${esc(title)}" />`,
        `<meta property="og:description" content="${esc(description)}" />`,
        `<meta property="og:type" content="website" />`,
        `<meta property="og:site_name" content="The RSVP Studio" />`,
        `<meta property="og:url" content="${esc(req.query.domain === "1" ? origin : `${origin}/invite/${slug}`)}" />`,
        // Served from thersvpstudio.com (/og/<slug>.jpg), not the storage host: Supabase storage
        // answers "x-robots-tag: none, private" and Messenger skips images like that. ?v= changes
        // with the photo, so a new cover gets a new preview instead of Facebook's cached one.
        image ? `<meta property="og:image" content="${esc(`https://thersvpstudio.com/og/${slug}.jpg?v=${shortHash(image.masterUrl!)}`)}" />` : "",
        image ? `<meta property="og:image:type" content="image/jpeg" />` : "",
        // Its size, so Messenger and Facebook show the photo the first time a link is shared.
        image?.width && image.height ? `<meta property="og:image:width" content="${Math.round(image.width)}" />` : "",
        image?.width && image.height ? `<meta property="og:image:height" content="${Math.round(image.height)}" />` : "",
        image?.alt ? `<meta property="og:image:alt" content="${esc(image.alt)}" />` : "",
        image ? `<meta name="twitter:card" content="summary_large_image" />` : "",
      ].join("\n    ");
      html = html
        .replace(/<title>[\s\S]*?<\/title>/, "")
        .replace(/<meta\s+name="description"[\s\S]*?\/>/, "")
        .replace(/<meta\s+property="og:(title|description|type|url|site_name)"[\s\S]*?\/>/g, "")
        .replace(image ? /<meta\s+(property="og:image(:\w+)?"|name="twitter:card")[\s\S]*?\/>/g : /$^/, "")
        .replace("</head>", `    ${tags}\n  </head>`);
    }
  }

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=3600");
  return res.status(200).send(html);
}

/** /tools/seating-chart-maker: the Seat Planner's head tags, structured data and its guide and
 *  FAQ as plain HTML inside #root (the app replaces it on load with the same words).
 *  Shared plans (/view/<token>) get the plain app, kept out of search results. */
function toolPage(req: VercelRequest, res: VercelResponse, shellHtml: string, origin: string) {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  if (req.query.path === "view") {
    res.setHeader("X-Robots-Tag", "noindex, nofollow");
    res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=3600");
    return res.status(200).send(shellHtml);
  }
  const url = `${origin}${SEATING_PATH}`;
  const ld = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebApplication", name: `${SEATING_NAME} by The RSVP Studio`, alternateName: "Free seating chart maker", url, applicationCategory: "LifestyleApplication", operatingSystem: "Any (web browser)", description: SEATING_DESCRIPTION, offers: { "@type": "Offer", price: "0", priceCurrency: "PHP" } },
      { "@type": "FAQPage", mainEntity: SEATING_FAQ.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) },
    ],
  };
  const tags = [
    `<title>${esc(SEATING_TITLE)}</title>`,
    `<meta name="description" content="${esc(SEATING_DESCRIPTION)}" />`,
    `<link rel="canonical" href="${esc(url)}" />`,
    `<meta property="og:title" content="${esc(SEATING_TITLE)}" />`,
    `<meta property="og:description" content="${esc(SEATING_DESCRIPTION)}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="The RSVP Studio" />`,
    `<meta property="og:url" content="${esc(url)}" />`,
    `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, "\\u003c")}</script>`,
  ].join("\n    ");
  const body = [
    `<main>`,
    `<p>${esc(SEATING_NAME)} by The RSVP Studio · Free seating chart maker</p>`,
    `<h1>${esc(SEATING_H1)}</h1>`,
    `<p>${esc(SEATING_SUB)}</p>`,
    `<p>${esc(SEATING_FACTS)}</p>`,
    `<h2>How it works</h2><ol>${SEATING_STEPS.map(([h, p]) => `<li><h3>${esc(h)}</h3><p>${esc(p)}</p></li>`).join("")}</ol>`,
    `<h2>How a Filipino reception is usually seated</h2><dl>${SEATING_LAYOUT.map(([h, p]) => `<dt>${esc(h)}</dt><dd>${esc(p)}</dd>`).join("")}</dl>`,
    `<h2>Questions</h2>${SEATING_FAQ.map(([q, a]) => `<h3>${esc(q)}</h3><p>${esc(a)}</p>`).join("")}`,
    `<p><a href="/build">Make your event website</a> · <a href="/enquire?service=stationery">Printed seating boards and stationery</a></p>`,
    `</main>`,
  ].join("");
  const html = shellHtml
    .replace(/<title>[\s\S]*?<\/title>/, "")
    .replace(/<meta\s+name="description"[\s\S]*?\/>/, "")
    .replace(/<meta\s+property="og:(title|description|type|url|site_name)"[\s\S]*?\/>/g, "")
    .replace("</head>", `    ${tags}\n  </head>`)
    .replace('<div id="root"></div>', `<div id="root">${body}</div>`);
  res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=3600");
  return res.status(200).send(html);
}
