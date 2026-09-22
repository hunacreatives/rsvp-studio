import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

// Generalized version of tercelat41's proven RSVP pattern (Supabase
// insert -> Resend double-send) — see Decision 8 in
// docs/template-builder-decisions.md. The one site-specific thing that
// pattern used to hardcode (which table to insert into, and the email
// copy) is now resolved server-side from `slug`, never trusted from the
// client, so one function serves every event site instead of one
// per-event deployment.

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const resend = new Resend(process.env.RESEND_API_KEY!);
const FROM = "The RSVP Studio <hello@thersvpstudio.com>";
const STUDIO_INBOX = "hello@thersvpstudio.com";

type Body = {
  slug: string;
  name: string;
  email: string;
  message?: string;
};

// Minimal shape read out of published_content for email copy — kept loose
// (not the full EventContent type) since this function only needs a few
// fields and shouldn't need to change every time the canonical schema
// grows.
interface PublishedContentForEmail {
  hosts?: { name?: string }[];
  eventDate?: string;
  primaryLocation?: { name?: string; addressLine?: string; mapUrl?: string };
}

function formatHostNames(content: PublishedContentForEmail): string {
  const names = (content.hosts ?? []).map((h) => h.name).filter(Boolean);
  return names.length > 0 ? names.join(" & ") : "the host";
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const { slug, name, email, message } = req.body as Body;
  if (!slug || !name || !email) {
    res.status(400).json({ error: "slug, name, and email are required" });
    return;
  }

  const { data: site, error: siteError } = await supabaseAdmin
    .from("wedding_sites")
    .select("event_id, published_content")
    .eq("slug", slug)
    .maybeSingle();

  if (siteError || !site || !site.published_content) {
    res.status(404).json({ error: "That event site isn't published yet" });
    return;
  }

  const { data: event, error: eventError } = await supabaseAdmin
    .from("events")
    .select("table_name")
    .eq("id", site.event_id)
    .maybeSingle();

  if (eventError || !event) {
    res.status(404).json({ error: "That event no longer exists" });
    return;
  }

  // Legacy events have a hand-provisioned per-event table (table_name
  // set); self-serve-created events leave table_name null and use the
  // shared `rsvps` table instead, keyed by event_id. See Decision 1 in
  // docs/template-builder-decisions.md — requires
  // supabase/self-serve-events-schema.sql to have been run.
  const { error: insertError } = event.table_name
    ? await supabaseAdmin.from(event.table_name).insert({ name, email, message: message || null })
    : await supabaseAdmin.from("rsvps").insert({ event_id: site.event_id, name, email, message: message || null });

  if (insertError) {
    console.error("RSVP insert error:", insertError);
    res.status(500).json({ error: "Failed to save RSVP" });
    return;
  }

  const content = site.published_content as PublishedContentForEmail;
  const hostNames = formatHostNames(content);
  const venueName = content.primaryLocation?.name ?? "";
  const venueAddress = content.primaryLocation?.addressLine ?? "";
  const mapsUrl = content.primaryLocation?.mapUrl;

  try {
    await Promise.allSettled([
      resend.emails.send({
        from: FROM,
        to: STUDIO_INBOX,
        subject: `New RSVP from ${name} — ${hostNames}`,
        html: `
          <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 24px;">
            <h2 style="color: #3a3a3a;">New RSVP — ${hostNames}</h2>
            <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
              <tr><td style="padding: 8px 0; color: #666; width: 140px;">Name</td><td style="padding: 8px 0; font-weight: 600;">${name}</td></tr>
              <tr><td style="padding: 8px 0; color: #666;">Email</td><td style="padding: 8px 0;">${email}</td></tr>
              ${message ? `<tr><td style="padding: 8px 0; color: #666; vertical-align: top;">Message</td><td style="padding: 8px 0; font-style: italic;">"${message}"</td></tr>` : ""}
            </table>
            <p style="margin-top: 24px; color: #b9974a; font-size: 12px;">Sent from ${slug}'s RSVP Studio event site</p>
          </div>
        `,
      }),
      resend.emails.send({
        from: FROM,
        to: email,
        subject: `You're on the list — ${hostNames}!`,
        html: `
          <div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; color: #4a4a4a;">
            <p style="font-size: 40px; text-align: center; margin: 0 0 8px;">🥂</p>
            <h2 style="text-align: center; color: #333333; font-size: 24px; margin: 0 0 4px;">You're on the list, ${name}!</h2>
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
                ? `<table style="width: 100%; border-collapse: collapse; margin-bottom: 28px;"><tr><td style="text-align:center;"><a href="${mapsUrl}" target="_blank" style="display: inline-block; background: #333333; color: #ffffff; text-decoration: none; border-radius: 999px; padding: 12px 24px; font-size: 13px; font-weight: 700;">📍 View Map</a></td></tr></table>`
                : ""
            }
            <p style="text-align: center; font-size: 13px; color: #9a9a9a; margin: 0 0 32px;">See you there!</p>
            <div style="border-top: 1px solid #eee; padding-top: 20px; text-align: center;">
              <p style="font-size: 12px; color: #9a9a9a; line-height: 1.7; margin: 0 0 12px;">
                This invite was crafted by <strong style="color: #666;">The RSVP Studio</strong> — bespoke digital invitations &amp; RSVP sites for weddings and celebrations.
              </p>
            </div>
          </div>
        `,
      }),
    ]);
  } catch (err) {
    // Email failure shouldn't fail the RSVP itself — the guest is already
    // recorded. Log and continue.
    console.error("Resend error:", err);
  }

  res.status(200).json({ ok: true });
}
