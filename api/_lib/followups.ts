import type { SupabaseClient } from "@supabase/supabase-js";
import { formatHostNames } from "./hosts.js";
import { coordinatorEmail, followupEmail, type FollowupData, type FollowupKind } from "./followup-mail.js";
import { FROM, reviewToken, STUDIO_INBOX, tipsToken } from "./support-mail.js";

// The daily follow-up emails (supabase/followups.sql → followups_due(), email-additions.sql):
// unfinished drafts, 10 RSVPs on a free site, replies closing in 3 days, the headcount a
// week before, and a thank-you after.
// Each is claimed in followup_log BEFORE sending (one per project, ever) and released
// if the send fails, so it's retried tomorrow. At most one per project per day.
// Stops near the time limit; anything left waits for tomorrow's run.

type SendMail = (payload: Parameters<typeof import("./email.js").sendChecked>[1], idempotencyKey?: string) => Promise<unknown>;
type Due = { event_id: string; kind: FollowupKind; rsvps: number; guests: number; declined: number };

const PRIORITY: Record<FollowupKind, number> = { checkin_1: -1, deadline_3: 0, headcount: 1, after: 2, review_10: 3, rsvp_10: 4, draft_10: 5, draft_4: 6, draft_1: 7 };
const MAX_PER_RUN = 60;

type Content = {
  hosts?: { name?: string }[];
  eventDate?: string;
  primaryLocation?: { name?: string; addressLine?: string };
  galleries?: { items?: unknown[] }[];
  rsvpDeadline?: string;
};

export async function sendFollowups(db: SupabaseClient, sendMail: SendMail, site: string, opts: { deadline: number }) {
  const report = { sent: 0, skipped: 0, errors: [] as string[] };
  const { data, error } = await db.rpc("followups_due");
  if (error) {
    // followups.sql not run yet: nothing to do, not an error worth alerting on.
    if (/followups_due/.test(error.message)) return report;
    report.errors.push(`followups: ${error.message}`);
    return report;
  }
  // One per project per day, the most time-sensitive first.
  const byEvent = new Map<string, Due>();
  for (const row of (data ?? []) as Due[]) {
    const had = byEvent.get(row.event_id);
    if (!had || PRIORITY[row.kind] < PRIORITY[had.kind]) byEvent.set(row.event_id, row);
  }
  const rows = [...byEvent.values()].sort((a, b) => PRIORITY[a.kind] - PRIORITY[b.kind]).slice(0, MAX_PER_RUN);
  const bookingUrl = process.env.BOOKING_URL || null;

  for (const row of rows) {
    if (Date.now() > opts.deadline) break;
    try {
      const { data: ev } = await db.from("events").select("id, name, owner_id, event_date").eq("id", row.event_id).maybeSingle();
      const { data: owner } = ev?.owner_id ? await db.from("profiles").select("id, email, full_name").eq("id", ev.owner_id).maybeSingle() : { data: null };
      if (!ev || !owner?.email || owner.email === STUDIO_INBOX) {
        report.skipped++;
        continue;
      }
      // Claim it first: a second run (or a failure after sending) can't send it twice.
      const { error: claimErr } = await db.from("followup_log").insert({ event_id: row.event_id, kind: row.kind });
      if (claimErr) {
        if (claimErr.code !== "23505") report.errors.push(`followup claim ${row.kind} ${row.event_id}: ${claimErr.message}`);
        continue;
      }

      const { data: ws } = await db.from("wedding_sites").select("draft_content, published_content").eq("event_id", row.event_id).maybeSingle();
      const content = ((ws?.published_content ?? ws?.draft_content) ?? {}) as Content;
      const named = (content.hosts ?? []).some((h) => h.name?.trim());
      const d: FollowupData = {
        first: (owner.full_name ?? "").trim().split(/\s+/)[0] || "there",
        eventId: row.event_id,
        eventName: ev.name || "your event",
        hosts: named ? formatHostNames(content) : ev.name || "your event",
        eventDate: (ev.event_date as string | null) ?? (content.eventDate ? content.eventDate.slice(0, 10) : null),
        rsvps: row.rsvps,
        guests: row.guests,
        declined: row.declined,
        unsubscribeUrl: `${site}/api/notify?op=unsubscribe&t=${tipsToken(owner.id)}`,
        bookingUrl,
      };
      if (row.kind.startsWith("draft_")) {
        d.draft = {
          names: named,
          date: !!content.eventDate,
          venue: !!content.primaryLocation?.name?.trim(),
          photos: (content.galleries ?? []).some((g) => (g.items ?? []).length > 0),
        };
      }
      if (row.kind === "rsvp_10") {
        const { data: due } = await db.rpc("site_upgrade_due", { p_event: row.event_id });
        const r = (Array.isArray(due) ? due[0] : due) as { premium?: boolean; due_centavos?: number } | null;
        if (r?.premium) {
          report.skipped++; // upgraded since the list was made
          continue;
        }
        d.upgradePesos = r?.due_centavos ? r.due_centavos / 100 : null;
      }
      // Premium photo sharing on: the QR code (headcount) and the photo page (after).
      if (row.kind === "headcount" || row.kind === "after") {
        const { data: sharing } = await db.from("wedding_sites").select("*").eq("event_id", row.event_id).maybeSingle();
        const { data: premium } = await db.rpc("event_is_premium", { p_event: row.event_id });
        if (sharing?.photo_sharing && premium === true && sharing.slug)
          d.photos = { url: `${site}/invite/${sharing.slug}/photos`, qr: `${site}/qr/${sharing.slug}.png` };
        // The week-away email nudges their seating: make the plan, finish it, or (Premium) set up
        // day-of check-in. One plan per event: the one changed most recently.
        if (row.kind === "headcount") {
          const { data: plans } = await db.from("seating_charts").select("chart, checkin_token").eq("event_id", row.event_id).order("updated_at", { ascending: false }).limit(1);
          const plan = (plans ?? [])[0] as { chart?: { guests?: { tableId?: string | null; reply?: string }[] }; checkin_token?: string | null } | undefined;
          const all = plan?.chart?.guests ?? [];
          const live = all.filter((g) => g.reply !== "no");
          d.seating = {
            url: `${site}/tools/seating-chart-maker?event=${row.event_id}`,
            planned: !!plan,
            seated: live.filter((g) => g.tableId).length,
            total: live.length,
            cantCome: all.filter((g) => g.reply === "no" && g.tableId).length,
            premium: premium === true,
            checkin: !!plan?.checkin_token,
          };
        }
      }
      // The day before: the check-in link, for them and (a copy) for their coordinator.
      let coordinator: { to: string; mail: { subject: string; html: string } } | null = null;
      if (row.kind === "checkin_1") {
        const { data: plans } = await db.from("seating_charts").select("checkin_token, checkin_pin, checkin_contact").eq("event_id", row.event_id).not("checkin_token", "is", null).order("updated_at", { ascending: false }).limit(1);
        const plan = (plans ?? [])[0] as { checkin_token: string; checkin_pin: string | null; checkin_contact: string | null } | undefined;
        if (!plan) {
          report.skipped++; // turned off since the list was made
          continue;
        }
        const url = `${site}/tools/seating-chart-maker/day/${plan.checkin_token}`;
        const qr = `${site}/qr/day-${plan.checkin_token}.png`;
        d.checkin = { url, qr, pin: !!plan.checkin_pin, coordinator: plan.checkin_contact, plan: `${site}/tools/seating-chart-maker?event=${row.event_id}` };
        if (plan.checkin_contact && plan.checkin_contact.toLowerCase() !== owner.email.toLowerCase())
          coordinator = { to: plan.checkin_contact, mail: coordinatorEmail({ couple: d.hosts, eventName: d.eventName, eventDate: d.eventDate, url, qr, pin: !!plan.checkin_pin, dayBefore: true }) };
      }
      if (row.kind === "deadline_3") {
        d.deadline = content.rsvpDeadline ?? null;
        const { count } = await db.from("invitees").select("id", { count: "exact", head: true }).eq("event_id", row.event_id);
        d.invited = count ?? 0;
      }
      if (row.kind === "after" || row.kind === "review_10") d.reviewUrl = `${site}/go/review/${reviewToken(row.event_id)}`;
      if (row.kind === "after") {
        const { data: until } = await db.rpc("site_live_until", { p_event: row.event_id });
        d.liveUntil = typeof until === "string" ? until : null;
      }

      const mail = followupEmail(row.kind, d);
      try {
        await sendMail(
          {
            from: FROM,
            to: owner.email,
            subject: mail.subject,
            html: mail.html,
            replyTo: STUDIO_INBOX,
            // One-click unsubscribe (Gmail / Apple Mail show it next to the sender).
            headers: { "List-Unsubscribe": `<${d.unsubscribeUrl}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
          },
          `followup-${row.kind}-${row.event_id}`,
        );
        report.sent++;
        if (coordinator)
          await sendMail({ from: FROM, to: coordinator.to, subject: coordinator.mail.subject, html: coordinator.mail.html, replyTo: STUDIO_INBOX }, `followup-checkin-coordinator-${row.event_id}`).catch((e) => report.errors.push(`coordinator ${row.event_id}: ${String(e)}`));
      } catch (e) {
        await db.from("followup_log").delete().eq("event_id", row.event_id).eq("kind", row.kind); // try again tomorrow
        throw e;
      }
    } catch (e) {
      report.errors.push(`followup ${row.kind} ${row.event_id}: ${e instanceof Error ? e.message : e}`);
    }
  }
  return report;
}
