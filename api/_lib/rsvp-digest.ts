import type { SupabaseClient } from "@supabase/supabase-js";
import { esc } from "./email.js";
import { formatHostNames, hostRecipients } from "./hosts.js";
import { claimRsvpEmails, isPremium } from "./rsvp-budget.js";
import { FROM, layout } from "./support-mail.js";

// The daily RSVP summary for FREE sites (~9 AM Manila, run by api/support-cron.ts).
// Premium sites and studio projects already got an email per RSVP, so they're skipped.
// Each event remembers where its last summary left off (events.rsvp_digest_sent_at);
// it only moves forward after the email is sent, so a failed day rolls into the next.
// Resend's idempotency key stops a double run on the same day from double-sending.

type SendMail = (payload: Parameters<typeof import("./email.js").sendChecked>[1], idempotencyKey?: string) => Promise<unknown>;

type Reply = { name: string; attending: boolean | null; guest_count: number | null; created_at: string; updated_at: string };

const LOOKBACK_DAYS = 8;
const LIST_MAX = 15;

export async function sendRsvpDigests(db: SupabaseClient, sendMail: SendMail, site: string, dayKey: string) {
  const report = { sent: 0, skipped: 0, errors: [] as string[] };
  // Only replies up to now go in; anything arriving mid-run waits for tomorrow.
  const cutoff = new Date().toISOString();

  // Events with replies in the last few days (shared rsvps table = DIY sites only).
  const { data: recent, error } = await db
    .from("rsvps")
    .select("event_id")
    .gt("updated_at", new Date(Date.now() - LOOKBACK_DAYS * 86_400_000).toISOString())
    .lte("updated_at", cutoff)
    .limit(10_000);
  if (error) {
    report.errors.push(`rsvp digest: ${error.message}`);
    return report;
  }
  const eventIds = [...new Set((recent ?? []).map((r) => r.event_id as string))];

  for (const eventId of eventIds) {
    try {
      const { data: ev } = await db.from("events").select("id, managed_by_studio, rsvp_digest_sent_at").eq("id", eventId).maybeSingle();
      if (!ev || ev.managed_by_studio || (await isPremium(db, eventId))) continue;
      const { data: siteRow } = await db.from("wedding_sites").select("published_at, published_content").eq("event_id", eventId).maybeSingle();
      const since = (ev.rsvp_digest_sent_at as string | null) ?? (siteRow?.published_at as string | null) ?? new Date(Date.now() - 86_400_000).toISOString();

      const { data: rows } = await db
        .from("rsvps")
        .select("name, attending, guest_count, created_at, updated_at")
        .eq("event_id", eventId)
        .gt("updated_at", since)
        .lte("updated_at", cutoff)
        .order("updated_at", { ascending: true });
      const replies = (rows ?? []) as Reply[];
      if (!replies.length) continue;

      const markSent = () => db.from("events").update({ rsvp_digest_sent_at: cutoff }).eq("id", eventId);
      const to = await hostRecipients(db, eventId);
      if (!to.length) {
        // Every host turned these emails off: nothing to send, nothing to catch up on later.
        await markSent();
        report.skipped++;
        continue;
      }
      if (!(await claimRsvpEmails(db, "digest", false, eventId, to.length))) {
        report.skipped++; // over today's email budget — it all goes in tomorrow's summary
        continue;
      }

      const hosts = formatHostNames(siteRow?.published_content as { hosts?: { name?: string }[] } | null);
      const fresh = replies.filter((r) => r.created_at > since);
      const changed = replies.length - fresh.length;
      const yes = replies.filter((r) => r.attending === true);
      const people = yes.reduce((n, r) => n + (r.guest_count ?? 1), 0);
      const no = replies.filter((r) => r.attending === false).length;
      const unsure = replies.length - yes.length - no;

      const subject = fresh.length
        ? `${fresh.length} new RSVP${fresh.length === 1 ? "" : "s"} for ${hosts}`
        : `${changed} RSVP update${changed === 1 ? "" : "s"} for ${hosts}`;
      const tally = [
        yes.length ? `<strong>${yes.length}</strong> coming (${people} ${people === 1 ? "guest" : "guests"})` : "",
        no ? `<strong>${no}</strong> can’t make it` : "",
        unsure ? `<strong>${unsure}</strong> didn’t say` : "",
      ].filter(Boolean).join(" · ");
      const line = (r: Reply) =>
        `<li style="margin:0 0 4px">${esc(r.name)} — ${r.attending === true ? `coming${r.guest_count && r.guest_count > 1 ? ` (${r.guest_count})` : ""}` : r.attending === false ? "can’t make it" : "replied"}${r.created_at > since ? "" : " <span style=\"color:#868697\">(changed their reply)</span>"}</li>`;
      const list = replies.slice(-LIST_MAX).reverse().map(line).join("");
      const more = replies.length > LIST_MAX ? `<p style="margin:6px 0 0;color:#868697">…and ${replies.length - LIST_MAX} more.</p>` : "";
      const body =
        `${fresh.length ? `Since your last summary, ${fresh.length} ${fresh.length === 1 ? "guest has" : "guests have"} replied` : "Some guests changed their reply"}${fresh.length && changed ? ` and ${changed} changed their reply` : ""}.<br><br>${tally}` +
        `<ul style="margin:16px 0 0;padding-left:18px">${list}</ul>${more}` +
        `<p style="margin:22px 0 0;font-size:13px;color:#55556a">Want an email the moment each RSVP comes in? Upgrade your site to Premium in the website builder.</p>`;

      await sendMail(
        {
          from: FROM,
          to,
          subject,
          html: layout(`RSVPs for ${esc(hosts)}`, body, { label: "See your guest list", url: `${site}/account/projects/${eventId}?tab=guests` }),
        },
        `rsvp-digest-${eventId}-${dayKey}`,
      );
      await markSent();
      report.sent++;
    } catch (e) {
      report.errors.push(`rsvp digest ${eventId}: ${e instanceof Error ? e.message : e}`);
    }
  }
  return report;
}
