import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { domainsReady, loadSettings, RateLimited, searchDomains } from "./_lib/domains.js";

// Custom domain search for the builder / dashboard (api/_lib/domains.ts).
//   GET                      → { enabled }  (is the feature switched on?)
//   POST { eventId, query }  → { results: [{ domain, php }], taken }  (the six endings in ENDINGS)
// Prices shown are the all-in customer price; Vercel's cost never leaves the server.

const db = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function canAccess(eventId: string, userId: string) {
  const { data: ev } = await db.from("events").select("owner_id, deleted_at").eq("id", eventId).maybeSingle();
  if (!ev || ev.deleted_at) return false;
  if (ev.owner_id === userId) return true;
  const { data: m } = await db.from("event_members").select("profile_id").eq("event_id", eventId).eq("profile_id", userId).maybeSingle();
  if (m) return true;
  const { data: p } = await db.from("profiles").select("is_staff").eq("id", userId).maybeSingle();
  return !!p?.is_staff;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
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
