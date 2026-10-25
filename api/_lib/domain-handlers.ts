// Custom domain endpoints (see ./domains.ts). They run inside api/pay-checkout.ts —
// Vercel's Hobby plan allows 12 functions per deploy — and vercel.json keeps their
// public URLs: /api/domain-search and /api/domain-status.
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";
import { makeSendMail } from "./support-mail.js";
import { RateLimited, advanceDomain, domainsReady, loadSettings, pesoPrice, searchDomains } from "./domains.js";

const db = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

// Custom domain search for the builder / dashboard (api/_lib/domains.ts).
//   GET                      → { enabled }  (is the feature switched on?)
//   POST { eventId, query }  → { results: [{ domain, php }], taken }  (the six endings in ENDINGS)
// Prices shown are the all-in customer price; Vercel's cost never leaves the server.


async function canAccess(eventId: string, userId: string) {
  const { data: ev } = await db.from("events").select("owner_id, deleted_at").eq("id", eventId).maybeSingle();
  if (!ev || ev.deleted_at) return false;
  if (ev.owner_id === userId) return true;
  // Buying a domain is billing: the couple and cohosts (coordinator-mode.sql).
  const { data: m } = await db.from("event_members").select("role").eq("event_id", eventId).eq("profile_id", userId).maybeSingle();
  if (m?.role === "cohost") return true;
  const { data: p } = await db.from("profiles").select("is_staff").eq("id", userId).maybeSingle();
  return !!p?.is_staff;
}

export async function domainSearchHandler(req: VercelRequest, res: VercelResponse) {
  const settings = await loadSettings(db);
  if (req.method === "GET") return res.status(200).json({ enabled: domainsReady(settings) });
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!domainsReady(settings)) return res.status(503).json({ error: "Custom domains aren’t available yet." });

  const token = (req.headers.authorization ?? "").replace(/^Bearer\s+/i, "");
  const { data: auth } = await db.auth.getUser(token);
  if (!auth?.user) return res.status(401).json({ error: "Please sign in again." });
  const body = (req.body ?? {}) as { eventId?: string; query?: string };
  if (!body.eventId || !(await canAccess(body.eventId, auth.user.id))) return res.status(404).json({ error: "We couldn’t find that event." });
  const query = String(body.query ?? "").slice(0, 80);
  if (query.replace(/[^a-z0-9]/gi, "").length < 2) return res.status(400).json({ error: "Type at least 2 letters or numbers." });

  try {
    const { results, taken } = await searchDomains(db, settings, query);
    return res.status(200).json({ results: results.map((r) => ({ domain: r.domain, php: r.php })), taken });
  } catch (e) {
    if (e instanceof RateLimited) return res.status(429).json({ error: "Lots of people are searching right now — try again in a minute." });
    console.error("domain search failed", e);
    return res.status(502).json({ error: "Domain search isn’t responding — please try again in a moment." });
  }
}


// Where a site's custom domain is at — and nudges it one step further each call
// (the customer's screen polls this after paying; Studio's Retry uses it too).
//   GET ?eventId=…           → { domain, status, expiresAt } | { status: "none" }
//   POST { id, retry: true } → staff only: a failed domain goes back to its last step

const sendMail = makeSendMail(process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null);

export async function domainStatusHandler(req: VercelRequest, res: VercelResponse) {
  const token = (req.headers.authorization ?? "").replace(/^Bearer\s+/i, "");
  const { data: auth } = await db.auth.getUser(token);
  if (!auth?.user) return res.status(401).json({ error: "Please sign in again." });
  const { data: me } = await db.from("profiles").select("is_staff").eq("id", auth.user.id).maybeSingle();
  const staff = !!me?.is_staff;

  if (req.method === "POST") {
    if (!staff) return res.status(403).json({ error: "Staff only." });
    const { id } = (req.body ?? {}) as { id?: string };
    const { data: row } = await db.from("site_domains").select("*").eq("id", id ?? "").maybeSingle();
    if (!row) return res.status(404).json({ error: "Not found." });
    // A failed one restarts where it stopped: never bought → paid; bought → connecting.
    const restart = row.status === "failed" ? (row.purchased_at ? "connecting" : row.vercel_order_id ? "buying" : "paid") : row.status;
    await db.from("site_domains").update({ status: restart, last_error: null, updated_at: new Date().toISOString() }).eq("id", row.id);
    const status = await advanceDomain(db, sendMail, { ...row, status: restart });
    return res.status(200).json({ status });
  }

  const eventId = String(req.query.eventId ?? "");
  if (!staff) {
    const { data: ev } = await db.from("events").select("owner_id").eq("id", eventId).maybeSingle();
    // The couple and cohosts (who pay for it); coordinators and viewers don't see the domain.
    const { data: m } = await db.from("event_members").select("profile_id").eq("event_id", eventId).eq("profile_id", auth.user.id).eq("role", "cohost").maybeSingle();
    if (!ev || (ev.owner_id !== auth.user.id && !m)) return res.status(404).json({ error: "We couldn’t find that event." });
  }
  const { data: row } = await db.from("site_domains").select("*").eq("event_id", eventId).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!row) return res.status(200).json({ status: "none" });
  const status = ["paid", "buying", "connecting"].includes(row.status) ? await advanceDomain(db, sendMail, row) : row.status;
  const s = await loadSettings(db);
  // What renewing costs today (shown from 30 days before it expires).
  const renewalPhp = s ? pesoPrice(Number(row.renewal_usd ?? row.price_usd), s) : null;
  return res.status(200).json({ domain: row.domain, status, expiresAt: row.expires_at, renewalPhp });
}
