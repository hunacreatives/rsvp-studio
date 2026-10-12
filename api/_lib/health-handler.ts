// Studio → Overview "Site health": open Sentry errors and UptimeRobot status, read
// server-side so the tokens never reach the browser. Runs inside api/pay-checkout.ts
// (?op=site-health; the Hobby plan allows 12 functions). Staff only, read only.
//   SENTRY_AUTH_TOKEN      — a Sentry personal token with event:read, org:read, project:read
//   SENTRY_ORG             — optional; found from the token when not set
//   UPTIMEROBOT_API_KEY    — optional; UptimeRobot's Read-Only API key
// Each part reports { configured: false } when its env var is missing, and an error
// message (not a failure) when the service doesn't answer.
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const db = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

// The DSN says which Sentry region the account is in (…ingest.us.sentry.io → us.sentry.io).
const SENTRY_API = (() => {
  const region = /\.ingest\.([a-z]{2})\.sentry\.io/.exec(process.env.SENTRY_DSN ?? "")?.[1];
  return `https://${region ? `${region}.` : ""}sentry.io/api/0`;
})();

let orgSlug: string | null = process.env.SENTRY_ORG?.trim() || null;

export type HealthIssue = { id: string; shortId: string; title: string; culprit: string; count: number; users: number; firstSeen: string; lastSeen: string; level: string; url: string };
export type HealthMonitor = { name: string; url: string; status: "up" | "down" | "paused" | "pending"; uptime30: number | null };

async function sentryIssues() {
  const token = process.env.SENTRY_AUTH_TOKEN?.trim();
  if (!token) return { configured: false as const };
  const get = (path: string) =>
    fetch(`${SENTRY_API}${path}`, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(6000) }).then(async (r) => {
      if (!r.ok) throw new Error(r.status === 401 || r.status === 403 ? "The Sentry token was refused — check SENTRY_AUTH_TOKEN and its scopes." : `Sentry answered ${r.status}.`);
      return r.json();
    });
  try {
    if (!orgSlug) {
      const orgs = (await get("/organizations/")) as { slug: string }[];
      orgSlug = orgs[0]?.slug ?? null;
      if (!orgSlug) throw new Error("No Sentry organization found for this token.");
    }
    // Real visitors only (local testing reports as "development").
    const q = new URLSearchParams({ query: "is:unresolved environment:production", statsPeriod: "14d", sort: "date", limit: "8" });
    const rows = (await get(`/organizations/${orgSlug}/issues/?${q}`)) as {
      id: string; shortId: string; title: string; culprit: string; count: string; userCount: number; firstSeen: string; lastSeen: string; level: string; permalink: string;
    }[];
    const issues: HealthIssue[] = rows.map((i) => ({
      id: i.id, shortId: i.shortId, title: i.title, culprit: i.culprit, count: Number(i.count) || 0, users: i.userCount ?? 0,
      firstSeen: i.firstSeen, lastSeen: i.lastSeen, level: i.level, url: i.permalink,
    }));
    return { configured: true as const, issues, allUrl: `https://${orgSlug}.sentry.io/issues/?query=is%3Aunresolved%20environment%3Aproduction` };
  } catch (e) {
    return { configured: true as const, issues: [] as HealthIssue[], error: e instanceof Error ? e.message : "Sentry didn’t answer." };
  }
}

async function uptime() {
  const key = process.env.UPTIMEROBOT_API_KEY?.trim();
  if (!key) return { configured: false as const };
  try {
    const r = await fetch("https://api.uptimerobot.com/v2/getMonitors", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ api_key: key, format: "json", custom_uptime_ratios: "30" }),
      signal: AbortSignal.timeout(6000),
    });
    const json = (await r.json()) as { stat: string; error?: { message?: string }; monitors?: { friendly_name: string; url: string; status: number; custom_uptime_ratio?: string }[] };
    if (json.stat !== "ok") throw new Error(json.error?.message ?? "UptimeRobot refused the key.");
    const monitors: HealthMonitor[] = (json.monitors ?? []).map((m) => ({
      name: m.friendly_name,
      url: m.url,
      // 0 paused · 1 not checked yet · 2 up · 8 seems down · 9 down
      status: m.status === 2 ? "up" : m.status === 0 ? "paused" : m.status === 1 ? "pending" : "down",
      uptime30: m.custom_uptime_ratio ? Number(m.custom_uptime_ratio) : null,
    }));
    return { configured: true as const, monitors, dashboardUrl: "https://dashboard.uptimerobot.com/monitors" };
  } catch (e) {
    return { configured: true as const, monitors: [] as HealthMonitor[], error: e instanceof Error ? e.message : "UptimeRobot didn’t answer." };
  }
}

export async function siteHealthHandler(req: VercelRequest, res: VercelResponse) {
  const token = (req.headers.authorization ?? "").replace(/^Bearer\s+/i, "");
  const { data: auth } = await db.auth.getUser(token);
  if (!auth?.user) return res.status(401).json({ error: "Please sign in again." });
  const { data: me } = await db.from("profiles").select("is_staff").eq("id", auth.user.id).maybeSingle();
  if (!me?.is_staff) return res.status(403).json({ error: "Staff only." });
  const [sentry, up] = await Promise.all([sentryIssues(), uptime()]);
  res.setHeader("Cache-Control", "private, no-store");
  return res.status(200).json({ sentry, uptime: up });
}
