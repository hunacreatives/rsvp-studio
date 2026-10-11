import type { SupabaseClient } from "@supabase/supabase-js";
import { esc } from "./email.js";
import { FROM, layout } from "./support-mail.js";

// The daily project lifecycle (supabase/project-lifecycle.sql → lifecycle_due()):
//   notice — a DIY site goes offline within 14 days: tell the owner, once.
//   guests — a site has been offline 30 days: remove its guest RSVPs and photos.
//   purge  — a project was deleted 30+ days ago: remove it for good
//            (payments and invoices stay; its link is retired).
// Photos live in Storage, so they're removed here before the database step.

type SendMail = (payload: Parameters<typeof import("./email.js").sendChecked>[1], idempotencyKey?: string) => Promise<unknown>;

const BUCKET = "event-site-images";
const day = (iso: string) => new Date(iso).toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric", timeZone: "Asia/Manila" });

async function removePhotos(db: SupabaseClient, eventId: string) {
  for (let round = 0; round < 20; round++) {
    const { data, error } = await db.storage.from(BUCKET).list(eventId, { limit: 1000 });
    if (error) throw new Error(`storage list: ${error.message}`);
    if (!data?.length) return;
    const { error: rmErr } = await db.storage.from(BUCKET).remove(data.map((f) => `${eventId}/${f.name}`));
    if (rmErr) throw new Error(`storage remove: ${rmErr.message}`);
  }
}

export async function runLifecycle(db: SupabaseClient, sendMail: SendMail, site: string) {
  const report = { notices: 0, guestPurges: 0, purges: 0, errors: [] as string[] };
  const { data: due, error } = await db.rpc("lifecycle_due");
  if (error) {
    report.errors.push(`lifecycle: ${error.message}`);
    return report;
  }
  for (const row of (due ?? []) as { event_id: string; action: "notice" | "guests" | "purge"; live_until: string | null }[]) {
    try {
      if (row.action === "notice") {
        const { data: ev } = await db.from("events").select("name, owner_id").eq("id", row.event_id).maybeSingle();
        const { data: owner } = ev?.owner_id ? await db.from("profiles").select("email, full_name").eq("id", ev.owner_id).maybeSingle() : { data: null };
        const { data: premium } = await db.rpc("event_is_premium", { p_event: row.event_id });
        if (owner?.email && row.live_until) {
          const until = row.live_until;
          const removeOn = new Date(Date.parse(until) + 30 * 86_400_000).toISOString();
          // A service notice about their own data: sent whatever their notification settings.
          await sendMail(
            {
              from: FROM,
              to: owner.email,
              subject: `Your website for ${ev!.name} goes offline on ${day(until)}`,
              html: layout(
                "Your website goes offline soon",
                `Your event website for <strong>${esc(ev!.name)}</strong> stays online until <strong>${day(until)}</strong>. After that, guests who open the link see a thank-you page instead.<br><br>Your guest list and photos are kept until <strong>${day(removeOn)}</strong>, then removed. Download your guest list from your dashboard before then.${
                  premium === true ? "" : `<br><br>Want it online longer? Premium keeps your website up for a year after your event — upgrade it from the website builder.`
                }`,
                { label: "Open your guest list", url: `${site}/account/projects/${row.event_id}?tab=guests` },
                "You’re receiving this because you own this event website on The RSVP Studio.",
              ),
            },
            `lifecycle-notice-${row.event_id}`,
          );
        }
        await db.from("events").update({ end_notice_sent_at: new Date().toISOString() }).eq("id", row.event_id);
        report.notices++;
      } else if (row.action === "guests") {
        await removePhotos(db, row.event_id);
        const { error: e } = await db.rpc("purge_guest_data", { p_event: row.event_id });
        if (e) throw new Error(e.message);
        report.guestPurges++;
      } else {
        await removePhotos(db, row.event_id);
        const { error: e } = await db.rpc("purge_project", { p_event: row.event_id });
        if (e) throw new Error(e.message);
        report.purges++;
      }
    } catch (e) {
      report.errors.push(`lifecycle ${row.action} ${row.event_id}: ${e instanceof Error ? e.message : e}`);
    }
  }
  return report;
}
