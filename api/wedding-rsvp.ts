import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { clean, esc, isEmail, safeUrl, sendChecked } from "./_lib/email";

// One RSVP endpoint for every event site. Which table to write to and the
// email copy are resolved server-side from `slug` — never trusted from the
// client (Decision 8 in docs/template-builder-decisions.md).
//
// Abuse guards (this endpoint is public and sends branded email):
// - input is validated, length-capped, and HTML-escaped before any email;
// - only published sites accept RSVPs;
// - a hidden honeypot field rejects naive bots;
// - a per-event burst cap limits floods;
// - a repeat RSVP from the same email updates the existing row and does
//   NOT send another guest confirmation (so the form can't be used to
//   spray confirmation emails at an address).

const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const resend = new Resend(process.env.RESEND_API_KEY!);
const FROM = "The RSVP Studio <hello@thersvpstudio.com>";
const STUDIO_INBOX = "hello@thersvpstudio.com";

const BURST_WINDOW_MIN = 10;
const BURST_MAX = 40; // RSVPs per event per window

interface PublishedContentForEmail {
  hosts?: { name?: string }[];
  primaryLocation?: { name?: string; addressLine?: string; mapUrl?: string };
}

function formatHostNames(content: PublishedContentForEmail): string {
  const names = (content.hosts ?? []).map((h) => h.name).filter(Boolean);
  return names.length > 0 ? names.join(" & ") : "the host";
}

/** Who hears about a new RSVP: the event's owner/members who keep project
 *  updates on; the studio inbox when nobody on the event has an account. */
async function hostRecipients(eventId: string): Promise<string[]> {
  const ids = new Set<string>();
  const { data: ev } = await supabaseAdmin.from("events").select("owner_id").eq("id", eventId).maybeSingle();
  if (ev?.owner_id) ids.add(ev.owner_id);
  const { data: members } = await supabaseAdmin.from("event_members").select("profile_id").eq("event_id", eventId);
  for (const m of members ?? []) ids.add(m.profile_id);
  if (!ids.size) return [STUDIO_INBOX];
  const { data: people } = await supabaseAdmin
    .from("profiles")
    .select("email, is_staff, notify_project_updates")
    .in("id", [...ids]);
  const emails = (people ?? [])
    .filter((p) => !p.is_staff && p.notify_project_updates !== false && p.email)
    .map((p) => p.email as string);
  return emails.length ? emails : [STUDIO_INBOX];
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const body = (req.body ?? {}) as Record<string, unknown>;
  // Honeypot: real guests never see or fill this field.
  if (clean(body.website, 200)) {
    res.status(200).json({ ok: true });
    return;
  }

  const slug = clean(body.slug, 80).toLowerCase();
  const name = clean(body.name, 120);
  const email = clean(body.email, 254).toLowerCase();
  const message = clean(body.message, 1000);

  if (!slug || !/^[a-z0-9-]+$/.test(slug) || !name || !isEmail(email)) {
    res.status(400).json({ error: "Please enter your name and a valid email." });
    return;
  }

  const { data: site } = await supabaseAdmin
    .from("wedding_sites")
    .select("event_id, published_content, published_at")
    .eq("slug", slug)
    .maybeSingle();
  if (!site || !site.published_at || !site.published_content) {
    res.status(404).json({ error: "That event site isn't published yet" });
    return;
  }

  const { data: event } = await supabaseAdmin.from("events").select("table_name").eq("id", site.event_id).maybeSingle();
  if (!event) {
    res.status(404).json({ error: "That event no longer exists" });
    return;
  }

  // Legacy studio-built events keep their own per-event table; self-serve
  // events share `rsvps`, keyed by event_id.
  const table = event.table_name ?? "rsvps";
  const eventId = event.table_name ? null : (site.event_id as string);

  // Burst cap per event.
  const since = new Date(Date.now() - BURST_WINDOW_MIN * 60_000).toISOString();
  let countQuery = supabaseAdmin.from(table).select("id", { count: "exact", head: true }).gte("created_at", since);
  if (eventId) countQuery = countQuery.eq("event_id", eventId);
  const { count } = await countQuery;
  if ((count ?? 0) >= BURST_MAX) {
    res.status(429).json({ error: "Lots of RSVPs are coming in right now — please try again in a few minutes." });
    return;
  }

  // One response per email per event: a repeat updates the existing row.
  let priorQuery = supabaseAdmin.from(table).select("id").ilike("email", email.replace(/[%_\\]/g, "\\$&")).limit(1);
  if (eventId) priorQuery = priorQuery.eq("event_id", eventId);
  const { data: existing } = await priorQuery;
  const prior = existing?.[0] as { id: string } | undefined;

  const write = prior
    ? await supabaseAdmin.from(table).update({ name, message: message || null }).eq("id", prior.id)
    : await supabaseAdmin
        .from(table)
        .insert(event.table_name ? { name, email, message: message || null } : { event_id: site.event_id, name, email, message: message || null });
  if (write.error) {
    console.error("RSVP write error:", write.error);
    res.status(500).json({ error: "Failed to save RSVP" });
    return;
  }

  const content = site.published_content as PublishedContentForEmail;
  const hostNames = esc(formatHostNames(content));
  const venueName = esc(content.primaryLocation?.name ?? "");
  const venueAddress = esc(content.primaryLocation?.addressLine ?? "");
  const mapsUrl = safeUrl(content.primaryLocation?.mapUrl);
  const safeName = esc(name);
  const safeEmail = esc(email);
  const safeMessage = esc(message);

  const sends: Promise<unknown>[] = [];
  const recipients = await hostRecipients(site.event_id);
  sends.push(
    sendChecked(resend, {
      from: FROM,
      to: recipients,
      replyTo: email,
      subject: `${prior ? "Updated RSVP" : "New RSVP"} from ${name} — ${formatHostNames(content)}`,
      html: `
        <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #3a3a3a;">${prior ? "Updated RSVP" : "New RSVP"} — ${hostNames}</h2>
          <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
            <tr><td style="padding: 8px 0; color: #666; width: 140px;">Name</td><td style="padding: 8px 0; font-weight: 600;">${safeName}</td></tr>
            <tr><td style="padding: 8px 0; color: #666;">Email</td><td style="padding: 8px 0;">${safeEmail}</td></tr>
            ${safeMessage ? `<tr><td style="padding: 8px 0; color: #666; vertical-align: top;">Message</td><td style="padding: 8px 0; font-style: italic;">"${safeMessage}"</td></tr>` : ""}
          </table>
          <p style="margin-top: 24px; color: #868697; font-size: 12px;">See every response in your RSVP Studio dashboard → Projects → Guests.</p>
        </div>
      `,
    }),
  );

  if (!prior) {
    sends.push(
      sendChecked(resend, {
        from: FROM,
        to: email,
        subject: `You're on the list — ${formatHostNames(content)}!`,
        html: `
          <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; color: #4a4a4a;">
            <p style="font-size: 40px; text-align: center; margin: 0 0 8px;">🥂</p>
            <h2 style="text-align: center; color: #333333; font-size: 24px; margin: 0 0 4px;">You're on the list, ${safeName}!</h2>
            <p style="text-align: center; color: #8a8478; font-size: 14px; margin: 0 0 28px;">Thank you for RSVPing — we can't wait to celebrate with you.</p>
            <div style="background: #faf9f6; border: 1px solid #e5ded0; border-radius: 16px; padding: 24px; margin-bottom: 24px;">
              <p style="text-align: center; text-transform: uppercase; letter-spacing: 0.1em; font-size: 12px; font-weight: 700; color: #9a9a9a; margin: 0 0 12px;">You&#39;re Invited</p>
              <p style="text-align: center; font-size: 20px; font-weight: 700; color: #333333; margin: 0 0 20px;">${hostNames}</p>
              <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                ${venueName ? `<tr><td style="padding: 6px 0; color: #8a8478; width: 90px;">Venue</td><td style="padding: 6px 0; font-weight: 600;">${venueName}${venueAddress ? `, ${venueAddress}` : ""}</td></tr>` : ""}
              </table>
            </div>
            ${
              mapsUrl
                ? `<table style="width: 100%; border-collapse: collapse; margin-bottom: 28px;"><tr><td style="text-align:center;"><a href="${esc(mapsUrl)}" target="_blank" style="display: inline-block; background: #333333; color: #ffffff; text-decoration: none; border-radius: 999px; padding: 12px 24px; font-size: 13px; font-weight: 700;">📍 View Map</a></td></tr></table>`
                : ""
            }
            <p style="text-align: center; font-size: 13px; color: #9a9a9a; margin: 0 0 32px;">See you there!</p>
            <div style="border-top: 1px solid #eee; padding-top: 20px; text-align: center;">
              <p style="font-size: 12px; color: #9a9a9a; line-height: 1.7; margin: 0 0 12px;">
                This invite was crafted by <strong style="color: #666;">The RSVP Studio</strong> — digital invitations &amp; RSVP sites for weddings and celebrations.
              </p>
            </div>
          </div>
        `,
      }),
    );
  }

  // The RSVP is saved either way; email trouble is logged, not surfaced.
  const results = await Promise.allSettled(sends);
  for (const r of results) if (r.status === "rejected") console.error("RSVP email failed:", r.reason);

  res.status(200).json({ ok: true, updated: !!prior });
}
