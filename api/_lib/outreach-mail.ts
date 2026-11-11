import type { SupabaseClient } from "@supabase/supabase-js";
import { REPLY_DOMAIN } from "./support-mail.js";

// Studio → Outreach, the email side that's left on the server. Outreach emails are now written by hand
// from Gmail (Studio → Outreach → Email), so replies go straight to hello@. Kept for the 30 the old daily
// job sent on Nov 11 2026, whose replies come back through out-<code>@reply.thersvpstudio.com
// (support-inbound): a "stop" closes them, anything else marks them Replied and is passed on to hello@.
// Resend bounces / spam reports for those emails close them too (api/support-inbound.ts).

export const OUT_ADDR = new RegExp(`^out-([a-f0-9]{8})@${REPLY_DOMAIN.replace(/\./g, "\\.")}$`, "i");

/** A reply that's a no: just "stop" / "unsubscribe", or a short note saying "remove me", "not interested",
 *  "no thanks", "stop emailing"… ("Can we stop by your office?" is not a no.) */
export function isStop(text: string, subject = "") {
  if (/^\s*(re:\s*)*(stop|unsubscribe)\W*$/i.test(subject)) return true;
  const t = text.trim();
  if (/^(please\s+)?(stop|unsubscribe)(\s+please)?[\s.!]*$/i.test(t)) return true;
  return (
    t.length <= 160 &&
    /\b(unsubscribe|remove (me|us)|take (me|us) off|not interested|no thanks?|no,? thank you|don'?t (email|contact|message) (me|us)|stop (emailing|messaging|contacting|sending))\b/i.test(t)
  );
}

/** Resend says an outreach email bounced or was marked as spam: never email them again. With a page or
 *  a mobile they go back to the team's list; otherwise they're closed. */
export async function outreachBounced(db: SupabaseClient, addresses: string[], complaint: boolean) {
  const emails = addresses.map((a) => a.trim().toLowerCase()).filter(Boolean);
  if (!emails.length) return 0;
  const { data } = await db.from("outreach_contacts").select("id, fb_key, ig_key, phone, website, status").in("email", emails).in("channel", ["email", "email_auto"]);
  let n = 0;
  for (const c of (data ?? []) as { id: string; fb_key: string | null; ig_key: string | null; phone: string | null; website: string | null; status: string }[]) {
    const other = !!(c.fb_key || c.ig_key || (c.phone ?? "").replace(/\D/g, "").length >= 7);
    const patch = complaint
      ? { status: "not_interested", stop_reason: "marked our email as spam", bounced_at: new Date().toISOString() }
      : other && c.status === "messaged"
        ? { status: "to_message", channel: null, messaged_at: null, followed_up_at: null, followups: 0, queued_on: null, queue_channel: null, bounced_at: new Date().toISOString(), stop_reason: "email bounced" }
        : { status: c.status === "messaged" ? "skipped" : c.status, bounced_at: new Date().toISOString(), stop_reason: "email bounced" };
    await db.from("outreach_contacts").update(patch).eq("id", c.id);
    n++;
  }
  return n;
}
