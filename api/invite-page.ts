import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { esc } from "./_lib/email.js";

// /invite/:slug, served with the event's own title, description and photo in the
// page head — so a link shared on Messenger / Viber / Facebook shows "Mia & Noah",
// the date and the cover photo instead of the generic site preview. The page itself
// is the normal app (same index.html); only the <head> tags differ.
// vercel.json rewrites /invite/:slug here.

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
  const description = [`${kind}celebration${names ? ` of ${names}` : ""}`, when, where].filter(Boolean).join(" · ") + ". Tap to see the details and RSVP. Made with The RSVP Studio.";
  return { title, description: description.charAt(0).toUpperCase() + description.slice(1) };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const slug = String(req.query.slug ?? "").toLowerCase();
  const host = req.headers["x-forwarded-host"] ?? req.headers.host;
  const origin = `https://${host}`;

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

  if (/^[a-z0-9-]{1,80}$/.test(slug)) {
    const { data } = await db.rpc("get_public_site", { p_slug: slug });
    const row = (Array.isArray(data) ? data[0] : data) as { published_content?: Content; published_presentation?: { activeTemplateId?: string; byTemplate?: Record<string, { heroImage?: { masterUrl?: string } }> } } | null;
    if (row?.published_content) {
      const c = row.published_content;
      const { title, description } = describe(c);
      const pres = row.published_presentation;
      const cover = pres?.byTemplate?.[pres.activeTemplateId ?? ""]?.heroImage?.masterUrl || c.galleries?.[0]?.items?.[0]?.image?.masterUrl || "";
      const image = /^https:\/\//.test(cover) ? cover : "";
      const tags = [
        `<title>${esc(title)}</title>`,
        `<meta name="description" content="${esc(description)}" />`,
        `<meta property="og:title" content="${esc(title)}" />`,
        `<meta property="og:description" content="${esc(description)}" />`,
        `<meta property="og:type" content="website" />`,
        `<meta property="og:site_name" content="The RSVP Studio" />`,
        `<meta property="og:url" content="${esc(`${origin}/invite/${slug}`)}" />`,
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
