import type { SupabaseClient } from "@supabase/supabase-js";
import { claimRsvpEmails } from "./rsvp-budget.js";
import { guestReminder, hostSender, type GuestContent, type GuestPresentation } from "./guest-mail.js";

// Premium guest reminders (supabase/guest-features.sql → guest_reminders_due()): two days
// before the event, every guest who said yes (and left an email) gets "See you on
// Saturday" with the time, venue and map, sent in the hosts' names. Once per event
// (followup_log 'guest_reminder', claimed before sending). If the day's email budget
// is short, nothing is claimed and tomorrow's run tries again (the window is 2 days).
// The hosts can switch it off in the builder (Privacy & guests).
// The email itself: guest-mail.ts (shared with the "You're on the list" confirmation).

type SendMail = (payload: Parameters<typeof import("./email.js").sendChecked>[1], idempotencyKey?: string) => Promise<unknown>;

const MAX_PER_EVENT = 300;

export async function sendGuestReminders(db: SupabaseClient, sendMail: SendMail, site: string, opts: { deadline: number }) {
  const report = { events: 0, sent: 0, errors: [] as string[] };
  const { data, error } = await db.rpc("guest_reminders_due");
  if (error) {
    if (!/guest_reminders_due/.test(error.message)) report.errors.push(`guest reminders: ${error.message}`);
    return report;
  }
  for (const { event_id: eventId } of (data ?? []) as { event_id: string }[]) {
    if (Date.now() > opts.deadline) break;
    try {
      const { data: ev } = await db.from("events").select("name, event_date, table_name").eq("id", eventId).maybeSingle();
      if (!ev || ev.table_name) continue; // studio-built events keep their own guest tables
      const { data: guests } = await db
        .from("rsvps")
        .select("id, name, email, guest_count")
        .eq("event_id", eventId)
        .eq("attending", true)
        .not("email", "is", null)
        .limit(MAX_PER_EVENT);
      const list = (guests ?? []).filter((g) => g.email);
      if (!list.length) {
        await db.from("followup_log").insert({ event_id: eventId, kind: "guest_reminder" }); // nobody to remind
        continue;
      }
      if (!(await claimRsvpEmails(db, "guest", true, eventId, list.length))) continue; // over today's budget: tomorrow
      const { error: claimErr } = await db.from("followup_log").insert({ event_id: eventId, kind: "guest_reminder" });
      if (claimErr) continue; // another run has it

      const { data: ws } = await db.from("wedding_sites").select("slug, published_content, published_presentation").eq("event_id", eventId).maybeSingle();
      const content = (ws?.published_content ?? {}) as GuestContent;

      let sent = 0;
      // Five at a time keeps well inside the job's time limit.
      for (let i = 0; i < list.length && Date.now() < opts.deadline + 10_000; i += 5) {
        const batch = list.slice(i, i + 5);
        const results = await Promise.allSettled(
          batch.map((g) => {
            const mail = guestReminder({
              content,
              presentation: ws?.published_presentation as GuestPresentation | null,
              eventName: ev.name ?? "",
              eventDate: ev.event_date as string | null,
              slug: ws?.slug ?? "",
              guestName: String(g.name ?? ""),
              guestCount: g.guest_count as number | null,
            });
            return sendMail(
              { from: hostSender(content), to: g.email as string, subject: mail.subject, html: mail.html },
              `guest-reminder-${g.id}`,
            );
          }),
        );
        sent += results.filter((r) => r.status === "fulfilled").length;
        for (const r of results) if (r.status === "rejected") report.errors.push(`guest reminder ${eventId}: ${r.reason instanceof Error ? r.reason.message : r.reason}`);
      }
      if (!sent) await db.from("followup_log").delete().eq("event_id", eventId).eq("kind", "guest_reminder"); // all failed: retry tomorrow
      report.events++;
      report.sent += sent;
    } catch (e) {
      report.errors.push(`guest reminder ${eventId}: ${e instanceof Error ? e.message : e}`);
    }
  }
  return report;
}
