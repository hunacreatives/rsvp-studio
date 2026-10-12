import { supabase } from "@/lib/supabase";

// Where a customer came from, for Studio → Overview → "Where customers come from"
// and planner commissions (supabase/revenue.sql).
//
// • rememberVisit(): on the first page of a visit, note the source in this browser —
//   a planner's code (?partner=CODE), a free site's "Make your own" link
//   (/build?ref=<slug>&via=site|email), an ad or campaign (utm_*), or the site
//   that linked here (Google, Facebook…). The first source is kept for 90 days;
//   only a planner's code replaces it.
// • claimSignupRef(): once signed in, save it on a NEW account (made after the
//   visit; never overwritten).
// • visitSource(): attached to enquiries, so leads show their source too.

const KEY = "rsvp_visit_source";
const OLD_KEY = "rsvp_signup_ref";
const KEEP_DAYS = 90;

export type VisitSource = { source: string; detail: string; partner: string; at: string; claimed?: boolean };

function read(): VisitSource | null {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "null") as VisitSource | null;
    if (!v || Date.now() - new Date(v.at).getTime() > KEEP_DAYS * 864e5) return null;
    return v;
  } catch {
    return null;
  }
}
function write(v: VisitSource) {
  try {
    localStorage.setItem(KEY, JSON.stringify(v));
  } catch {
    /* private mode — not counted */
  }
}

function classify(search: string, referrer: string): Omit<VisitSource, "at"> | null {
  const q = new URLSearchParams(search);
  const partner = (q.get("partner") ?? "").trim().toUpperCase();
  if (/^[A-Z0-9]{3,20}$/.test(partner)) return { source: "partner", detail: partner, partner };
  const ref = (q.get("ref") ?? "").toLowerCase();
  if (/^[a-z0-9-]{1,80}$/.test(ref)) return { source: q.get("via") === "email" ? "email" : "site", detail: ref, partner: "" };
  const utmSource = (q.get("utm_source") ?? "").toLowerCase().slice(0, 40);
  if (utmSource) {
    const medium = (q.get("utm_medium") ?? "").toLowerCase();
    const detail = [utmSource, q.get("utm_campaign")].filter(Boolean).join(" · ").slice(0, 120);
    if (/cpc|ppc|paid|ads?$/.test(medium) || q.has("gclid")) return { source: "ads", detail, partner: "" };
    if (/facebook|instagram|tiktok|fb|ig|messenger/.test(utmSource)) return { source: "social", detail, partner: "" };
    if (/google/.test(utmSource)) return { source: "google", detail, partner: "" };
    return { source: "other", detail, partner: "" };
  }
  if (q.has("gclid")) return { source: "ads", detail: "google ads", partner: "" };
  let host = "";
  try {
    host = referrer ? new URL(referrer).hostname.replace(/^www\./, "") : "";
  } catch {
    host = "";
  }
  if (!host || host.endsWith("thersvpstudio.com")) return null;
  if (/(^|\.)google\./.test(host) || /bing\.com|duckduckgo|yahoo\./.test(host)) return { source: "google", detail: host, partner: "" };
  if (/facebook|instagram|tiktok|messenger|threads|pinterest|t\.co$|twitter|x\.com/.test(host)) return { source: "social", detail: host, partner: "" };
  return { source: "other", detail: host.slice(0, 120), partner: "" };
}

/** A partner's link was opened: count it (once a day per browser). */
function countPartnerClick(code: string) {
  const key = `rsvp_pclick_${code}`;
  const today = new Date().toISOString().slice(0, 10);
  try {
    if (localStorage.getItem(key) === today) return;
    localStorage.setItem(key, today);
  } catch {
    /* private mode — still counted */
  }
  void supabase.rpc("log_partner_click", { p_code: code });
}

/** Call on the first page of a visit. Guests opening an invite aren't counted. */
export function rememberVisit(search = window.location.search, referrer = document.referrer) {
  const found = classify(search, referrer);
  if (found?.partner) countPartnerClick(found.partner);
  const saved = read();
  if (found && (!saved || found.source === "partner" || saved.source === "direct")) write({ ...found, at: new Date().toISOString() });
  else if (!saved) write({ source: "direct", detail: "", partner: "", at: new Date().toISOString() });
}

/** Kept for the /build page, which used to be the only place that noted a free site's link. */
export function rememberSignupRef(search: string) {
  rememberVisit(search, "");
}

/** For enquiries: where this visitor came from. */
export function visitSource(): VisitSource | null {
  return read();
}

export async function claimSignupRef() {
  const v = read();
  if (!v || v.claimed) return;
  // A free site's link also feeds the older counter on Studio → Overview.
  if (v.source === "site" || v.source === "email")
    await supabase.rpc("record_signup_ref", { p_slug: v.detail, p_via: v.source, p_clicked_at: v.at });
  const { error } = await supabase.rpc("record_signup_source", { p_source: v.source, p_detail: v.detail, p_partner: v.partner, p_clicked_at: v.at });
  if (!error) write({ ...v, claimed: true });
  try {
    localStorage.removeItem(OLD_KEY);
  } catch {
    /* ignore */
  }
}
