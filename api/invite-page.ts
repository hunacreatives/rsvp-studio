import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { esc } from "./_lib/email.js";
import { sitemap } from "./_lib/sitemap.js";
import { qrHandler } from "./_lib/qr.js";
import { SEATING_NAME, SEATING_DESCRIPTION, SEATING_FACTS, SEATING_FAQ, SEATING_H1, SEATING_LAYOUT, SEATING_PATH, SEATING_STEPS, SEATING_SUB, SEATING_TITLE } from "./_lib/seating-copy.js";

// /invite/:slug, served with the event's own title, description and photo in the
// page head — so a link shared on Messenger / Viber / Facebook shows "Mia & Noah",
// the date and the cover photo instead of the generic site preview. The page itself
// is the normal app (same index.html); only the <head> tags differ.
// vercel.json rewrites /invite/:slug here — and every page of a customer's own domain
// (?domain=1), where the site is found from the host (get_site_by_domain).

const db = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);
let shell: { html: string; at: number } | null = null;

type Content = {
  hosts?: { name?: string }[];
  eventDate?: string;
  occasion?: string;
  primaryLocation?: { name?: string; addressLine?: string };
  galleries?: { items?: { image?: { masterUrl?: string } }[] }[];
};

const INVITE: Record<string, string> = { wedding: "Wedding", birthday: "Birthday", anniversary: "Anniversary" };

function describe(c: Content) {
  const names = (c.hosts ?? []).map((h) => h.name?.trim()).filter(Boolean).join(" & ");
  const kind = c.occasion && INVITE[c.occasion] ? `${INVITE[c.occasion]} ` : "";
  const title = names ? `${names} — You’re Invited` : "You’re Invited";
  let when = "";
  if (c.eventDate && /^\d{4}-\d{2}-\d{2}/.test(c.eventDate)) {
    const d = new Date(`${c.eventDate.slice(0, 10)}T00:00:00Z`);
    when = d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
  }
  const where = c.primaryLocation?.name || c.primaryLocation?.addressLine || "";
  const description = [`${kind}celebration${names ? ` of ${names}` : ""}`, when, where].filter(Boolean).join(" · ") + ". Tap to see the details and RSVP. Made with love by The RSVP Studio.";
  return { title, description: description.charAt(0).toUpperCase() + description.slice(1) };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // /sitemap.xml shares this function (vercel.json): the Hobby plan allows 12.
  if (req.query.op === "sitemap") return sitemap(db, res);
  // /qr/<slug>.png: the photo page's QR code for the hosts' emails.
  if (req.query.op === "qr") return qrHandler(req, res);
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

  if (/^[a-z0-9-]{1,80}$/.test(slug)) {
    const { data } = await db.rpc("get_public_site", { p_slug: slug });
    const row = (Array.isArray(data) ? data[0] : data) as { state?: string; published_content?: Content; published_presentation?: { activeTemplateId?: string; byTemplate?: Record<string, { heroImage?: { masterUrl?: string } }> } } | null;
    if (row?.published_content) {
      const c = row.published_content;
      const { title, description } = describe(c);
      const pres = row.published_presentation;
      const cover = pres?.byTemplate?.[pres.activeTemplateId ?? ""]?.heroImage?.masterUrl || c.galleries?.[0]?.items?.[0]?.image?.masterUrl || "";
      // Ended sites' photos are removed later, so their previews don't use them.
      const image = row.state !== "ended" && /^https:\/\//.test(cover) ? cover : "";
      const tags = [
        `<title>${esc(title)}</title>`,
        `<meta name="description" content="${esc(description)}" />`,
        `<meta property="og:title" content="${esc(title)}" />`,
        `<meta property="og:description" content="${esc(description)}" />`,
        `<meta property="og:type" content="website" />`,
        `<meta property="og:site_name" content="The RSVP Studio" />`,
        `<meta property="og:url" content="${esc(req.query.domain === "1" ? origin : `${origin}/invite/${slug}`)}" />`,
        image ? `<meta property="og:image" content="${esc(image)}" />` : "",
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
