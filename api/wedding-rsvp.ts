import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { clean, esc, isEmail, normalizePhone, safeMapUrl, sendChecked } from "./_lib/email.js";

// One RSVP endpoint for every event site. Which table to write to and the
// email copy are resolved server-side from `slug` — never trusted from the
// client (Decision 8 in docs/template-builder-decisions.md).
//
// Abuse guards (this endpoint is public and sends branded email):
// - input is validated, length-capped, and HTML-escaped before any email;
// - only published sites accept RSVPs;
// - a hidden honeypot field rejects naive bots;
// - only studio-provisioned per-event tables (`*_rsvps`) are ever written;
// - a per-event burst cap (new AND updated replies) limits floods;
// - a repeat RSVP from the same email or mobile updates the existing row,
//   at most UPDATE_MAX times an hour, and does NOT send another guest
//   confirmation (so the form can't be used to spray emails at an address);
// - guest confirmations per event per day are capped, and map links in
//   them must come from a real map service.
// Guests answer with an email OR a mobile number (lolos/lolas without email).

const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
// No key (local dev, preview builds): RSVPs still save; emails are skipped.
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const sendEmail = (payload: Parameters<typeof sendChecked>[1]) =>
  resend ? sendChecked(resend, payload) : Promise.resolve(console.warn(`RESEND_API_KEY not set — skipped email "${payload.subject}"`));
const FROM = "The RSVP Studio <hello@thersvpstudio.com>";
const STUDIO_INBOX = "hello@thersvpstudio.com";

const BURST_WINDOW_MIN = 10;
const BURST_MAX = 40; // RSVPs (new or updated) per event per window
const UPDATE_MAX = 5; // changes per guest per hour
const GUEST_EMAILS_PER_DAY = 300; // confirmation emails per event per day
const LEGACY_TABLE = /^[a-z0-9_]+_rsvps$/;

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
  // One "Email or mobile number" field (`contact`), or the older separate fields.
  const contact = clean(body.contact, 254);
  const emailRaw = (contact.includes("@") ? contact : clean(body.email, 254)).toLowerCase();
  const email = isEmail(emailRaw) ? emailRaw : "";
  const phone = normalizePhone(contact && !contact.includes("@") ? contact : body.phone);
  const message = clean(body.message, 1000);
  // Optional RSVP details (sent by the newer forms; older templates omit them).
  const attendingRaw = body.attending;
  const attending: boolean | null =
    attendingRaw === true || attendingRaw === "yes" ? true : attendingRaw === false || attendingRaw === "no" ? false : null;
  const guestsNum = Number(body.guests);
  const guestCount = attending === false ? 0 : Number.isInteger(guestsNum) && guestsNum >= 1 && guestsNum <= 20 ? guestsNum : attending ? 1 : null;
  const dietary = attending === false ? "" : clean(body.dietary, 300);

  if (!slug || !/^[a-z0-9-]+$/.test(slug) || !name) {
    res.status(400).json({ error: "Please enter your name." });
    return;
  }
  if (!email && !phone) {
    res.status(400).json({ error: "Please enter your email or mobile number (e.g. 0917 123 4567)." });
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
  // events share `rsvps`, keyed by event_id. Only a studio-style table name
  // is ever honoured (customers can't set table_name — see hardening.sql).
  if (event.table_name && !LEGACY_TABLE.test(event.table_name)) {
    console.error("RSVP refused: unexpected table_name", event.table_name);
    res.status(404).json({ error: "That event site isn't available" });
    return;
  }
  const legacy = !!event.table_name;
  const table = event.table_name ?? "rsvps";
  const eventId = legacy ? null : (site.event_id as string);
  // Legacy tables only have an email column.
  if (legacy && !email) {
    res.status(400).json({ error: "Please enter your email so we can send your confirmation." });
    return;
  }

  // Burst cap per event (new replies, and changed ones on the shared table).
  const since = new Date(Date.now() - BURST_WINDOW_MIN * 60_000).toISOString();
  let countQuery = supabaseAdmin.from(table).select("id", { count: "exact", head: true }).gte(legacy ? "created_at" : "updated_at", since);
  if (eventId) countQuery = countQuery.eq("event_id", eventId);
  const { count } = await countQuery;
  if ((count ?? 0) >= BURST_MAX) {
    res.status(429).json({ error: "Lots of RSVPs are coming in right now — please try again in a few minutes." });
    return;
  }

  // One response per guest per event: a repeat (same email, or same mobile) updates the existing row.
  type Prior = { id: string; update_count?: number; updated_at?: string };
  const cols = legacy ? "id" : "id, update_count, updated_at";
  let prior: Prior | undefined;
  if (email) {
    let q = supabaseAdmin.from(table).select(cols).ilike("email", email.replace(/[%_\\]/g, "\\$&")).limit(1);
    if (eventId) q = q.eq("event_id", eventId);
    prior = ((await q).data?.[0] ?? undefined) as Prior | undefined;
  }
  if (!prior && phone && !legacy) {
    const { data } = await supabaseAdmin.from(table).select(cols).eq("event_id", eventId!).eq("phone", phone).limit(1);
    prior = (data?.[0] ?? undefined) as Prior | undefined;
  }
  // Changing an answer is fine; changing it over and over isn't.
  const recentChange = prior?.updated_at && Date.now() - Date.parse(prior.updated_at) < 3_600_000;
  if (prior && !legacy && recentChange && (prior.update_count ?? 0) >= UPDATE_MAX) {
    res.status(429).json({ error: "You’ve changed your reply a few times already — please try again in an hour, or message the host." });
    return;
  }

  // The shared table stores the details in their own columns. Legacy
  // per-event tables don't have them, so the details ride along in message.
  const details = [
    attending === null ? "" : attending ? `Attending${guestCount ? ` (${guestCount})` : ""}` : "Not attending",
    dietary ? `Dietary: ${dietary}` : "",
  ]
    .filter(Boolean)
    .join(" · ");
  const extra = legacy
    ? {}
    : {
        attending,
        guest_count: guestCount,
        dietary: dietary || null,
        ...(email ? { email } : {}),
        ...(phone ? { phone } : {}),
        updated_at: new Date().toISOString(),
        ...(prior ? { update_count: recentChange ? (prior.update_count ?? 0) + 1 : 1 } : {}),
      };
  const legacyMessage = [details, message].filter(Boolean).join(" — ") || null;
  const row = legacy ? { name, message: legacyMessage } : { name, message: message || null, ...extra };
  const write = prior
    ? await supabaseAdmin.from(table).update(row).eq("id", prior.id)
    : await supabaseAdmin.from(table).insert(legacy ? { ...row, email } : { ...row, event_id: site.event_id });
  if (write.error) {
    console.error("RSVP write error:", write.error);
    res.status(500).json({ error: "Failed to save RSVP" });
    return;
  }

  const content = site.published_content as PublishedContentForEmail;
  const hostNames = esc(formatHostNames(content));
  const venueName = esc(content.primaryLocation?.name ?? "");
  const venueAddress = esc(content.primaryLocation?.addressLine ?? "");
  const mapsUrl = safeMapUrl(content.primaryLocation?.mapUrl);
  const safeName = esc(name);
  const safeContact = [email, phone].filter(Boolean).map((c) => esc(c!)).join(" · ");
  const safeMessage = esc(message);
  const safeDietary = esc(dietary);
  const declined = attending === false;

  const sends: Promise<unknown>[] = [];
  const recipients = await hostRecipients(site.event_id);
  sends.push(
    sendEmail({
      from: FROM,
      to: recipients,
      replyTo: email || undefined,
      subject: `${prior ? "Updated RSVP" : "New RSVP"} from ${name} — ${formatHostNames(content)}`,
      html: `
        <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #3a3a3a;">${prior ? "Updated RSVP" : "New RSVP"} — ${hostNames}</h2>
          <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
            <tr><td style="padding: 8px 0; color: #666; width: 140px;">Name</td><td style="padding: 8px 0; font-weight: 600;">${safeName}</td></tr>
            <tr><td style="padding: 8px 0; color: #666;">Contact</td><td style="padding: 8px 0;">${safeContact}</td></tr>
            ${attending === null ? "" : `<tr><td style="padding: 8px 0; color: #666;">Coming?</td><td style="padding: 8px 0; font-weight: 600;">${attending ? `Yes${guestCount ? ` — ${guestCount} ${guestCount === 1 ? "guest" : "guests"}` : ""}` : "No, can’t make it"}</td></tr>`}
            ${safeDietary ? `<tr><td style="padding: 8px 0; color: #666; vertical-align: top;">Dietary</td><td style="padding: 8px 0;">${safeDietary}</td></tr>` : ""}
            ${safeMessage ? `<tr><td style="padding: 8px 0; color: #666; vertical-align: top;">Message</td><td style="padding: 8px 0; font-style: italic;">"${safeMessage}"</td></tr>` : ""}
          </table>
          <p style="margin-top: 24px; color: #868697; font-size: 12px;">See every response in your RSVP Studio dashboard → Projects → Guests.</p>
        </div>
      `,
    }),
  );

  // Guest confirmation: first reply only, only with an email, and within the event's daily cap.
  let underDailyCap = true;
  if (!prior && email && !legacy) {
    const { count: today } = await supabaseAdmin
      .from("rsvps")
      .select("id", { count: "exact", head: true })
      .eq("event_id", site.event_id)
      .not("email", "is", null)
      .gte("created_at", new Date(Date.now() - 86_400_000).toISOString());
    underDailyCap = (today ?? 0) <= GUEST_EMAILS_PER_DAY;
    if (!underDailyCap) console.warn("RSVP guest email cap reached", site.event_id);
  }
  if (!prior && email && underDailyCap) {
    sends.push(
      sendEmail({
        from: FROM,
        to: email,
        subject: declined ? `Thanks for letting us know — ${formatHostNames(content)}` : `You're on the list — ${formatHostNames(content)}!`,
        html: `
          <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; color: #4a4a4a;">
            <p style="font-size: 40px; text-align: center; margin: 0 0 8px;">🥂</p>
            <h2 style="text-align: center; color: #333333; font-size: 24px; margin: 0 0 4px;">${declined ? `Thanks for letting us know, ${safeName}` : `You're on the list, ${safeName}!`}</h2>
            <p style="text-align: center; color: #8a8478; font-size: 14px; margin: 0 0 28px;">${declined ? "We’ll miss you — thank you for replying." : "Thank you for RSVPing — we can't wait to celebrate with you."}</p>
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
            <p style="text-align: center; font-size: 13px; color: #9a9a9a; margin: 0 0 32px;">${declined ? "You can update your reply anytime from the invitation." : "See you there!"}</p>
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
