import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { advanceDomain, loadSettings, pesoPrice } from "./_lib/domains.js";
import { makeSendMail } from "./_lib/support-mail.js";

// Where a site's custom domain is at — and nudges it one step further each call
// (the customer's screen polls this after paying; Studio's Retry uses it too).
//   GET ?eventId=…           → { domain, status, expiresAt } | { status: "none" }
//   POST { id, retry: true } → staff only: a failed domain goes back to its last step

const db = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const sendMail = makeSendMail(process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null);

export default async function handler(req: VercelRequest, res: VercelResponse) {
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
    const { data: m } = await db.from("event_members").select("profile_id").eq("event_id", eventId).eq("profile_id", auth.user.id).maybeSingle();
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
