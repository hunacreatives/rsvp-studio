import type { SupabaseClient } from "@supabase/supabase-js";
import { esc } from "./email.js";
import { FROM, layout } from "./support-mail.js";
import { purgeEventPhotos, purgeMode } from "./photo-purge.js";

// The daily project lifecycle (supabase/media-r2.sql → lifecycle_due()):
//   notice — a DIY site goes offline (or an unpublished draft expires) within 14 days:
//            tell the owner, once per end date.
//   photos — offline 30 days, or deleted 30+ days ago: remove its photos (photo-purge.ts;
//            a dry run until PHOTO_PURGE=live).
//   guests — offline 30 days: remove its guest RSVPs.
//   purge  — deleted 30+ days ago: remove the project for good, after its photos are gone
//            (payments and invoices stay; its link is retired).
// Deleting is capped per run and stops near the time limit; the rest waits for tomorrow.

type SendMail = (payload: Parameters<typeof import("./email.js").sendChecked>[1], idempotencyKey?: string) => Promise<unknown>;

const day = (iso: string) => new Date(iso).toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric", timeZone: "Asia/Manila" });
const MAX_PHOTO_PURGES = 15;

export async function runLifecycle(db: SupabaseClient, sendMail: SendMail, site: string, opts: { deadline?: number; only?: "photos" } = {}) {
  const report = { notices: 0, photoPurges: 0, photoMode: purgeMode(), guestPurges: 0, purges: 0, errors: [] as string[] };
  const deadline = opts.deadline ?? Date.now() + 40_000;
  const { data: due, error } = await db.rpc("lifecycle_due");
  if (error) {
    report.errors.push(`lifecycle: ${error.message}`);
    return report;
  }
  const mode = purgeMode();
  const photosDone = new Map<string, boolean>(); // event → photos fully handled this run
  // Notices first; a deleted project's photos before the project itself.
  const ORDER = { notice: 0, photos: 1, guests: 2, purge: 3 } as const;
  const rows = ((due ?? []) as { event_id: string; action: keyof typeof ORDER; live_until: string | null }[]).sort((a, b) => ORDER[a.action] - ORDER[b.action]);
  for (const row of rows) {
    if (opts.only && row.action !== opts.only) continue;
    try {
      if (row.action === "notice") {
        const { data: ev } = await db.from("events").select("name, owner_id").eq("id", row.event_id).maybeSingle();
        const { data: owner } = ev?.owner_id ? await db.from("profiles").select("email, full_name").eq("id", ev.owner_id).maybeSingle() : { data: null };
        const { data: ws } = await db.from("wedding_sites").select("published_at").eq("event_id", row.event_id).maybeSingle();
        const { data: premium } = await db.rpc("event_is_premium", { p_event: row.event_id });
        if (owner?.email && row.live_until) {
          const until = row.live_until;
          const removeOn = new Date(Date.parse(until) + 30 * 86_400_000).toISOString();
          const published = !!ws?.published_at;
          // A service notice about their own data: sent whatever their notification settings.
          await sendMail(
            {
              from: FROM,
              to: owner.email,
              subject: published ? `Your website for ${ev!.name} goes offline on ${day(until)}` : `Your draft for ${ev!.name} will be removed on ${day(removeOn)}`,
              html: published
                ? layout(
                    "Your website goes offline soon",
                    `Your event website for <strong>${esc(ev!.name)}</strong> stays online until <strong>${day(until)}</strong>. After that, guests who open the link see a thank-you page instead.<br><br>Your guest list and the photos you uploaded are kept until <strong>${day(removeOn)}</strong>, then permanently deleted. We don’t keep copies. Download your guest list from your dashboard and save any photos you want to keep before then.${
                      premium === true ? "" : `<br><br>Want it online longer? Premium keeps your website up for a year after your event — upgrade it from the website builder.`
                    }`,
                    { label: "Open your guest list", url: `${site}/account/projects/${row.event_id}?tab=guests` },
                    "You’re receiving this because you own this event website on The RSVP Studio.",
                  )
                : layout(
                    "Your draft will be removed soon",
                    `Your website for <strong>${esc(ev!.name)}</strong> was never published. On <strong>${day(removeOn)}</strong>, the photos you uploaded to it will be permanently deleted. We don’t keep copies.`,
                    { label: "Open your draft", url: `${site}/account/projects/${row.event_id}?tab=website` },
                    "You’re receiving this because you own this event website on The RSVP Studio.",
                  ),
            },
            `lifecycle-notice-${row.event_id}-${row.live_until?.slice(0, 10) ?? ""}`,
          );
        }
        await db.from("events").update({ end_notice_sent_at: new Date().toISOString() }).eq("id", row.event_id);
        report.notices++;
      } else if (row.action === "photos") {
        if (mode === "off" || report.photoPurges >= MAX_PHOTO_PURGES || Date.now() > deadline) continue;
        const r = await purgeEventPhotos(db, row.event_id, mode);
        photosDone.set(row.event_id, mode === "live" && r.complete);
        if (!r.skipped) report.photoPurges++;
      } else if (row.action === "guests") {
        const { error: e } = await db.rpc("purge_guest_data", { p_event: row.event_id });
        if (e) throw new Error(e.message);
        report.guestPurges++;
      } else {
        // Only once its photos are really gone (not in a dry run, not after a failure).
        if (!photosDone.get(row.event_id)) continue;
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
