import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { clean, esc, isEmail, normalizePhone, sendChecked } from "./_lib/email.js";
import { formatHostNames, hostRecipients } from "./_lib/hosts.js";
import { claimRsvpEmails, isPremium } from "./_lib/rsvp-budget.js";
import { captureError } from "./_lib/sentry.js";
import { guestPhotoHandler } from "./_lib/guest-photos.js";
import { guestConfirmation, hostSender, type GuestContent, type GuestPresentation } from "./_lib/guest-mail.js";
import { layout } from "./_lib/support-mail.js";
import { confirmText, hostAlertText, sendTexts, shortWhen } from "./_lib/sms.js";

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
//   them must come from a real map service;
// - every RSVP email first claims room in an account-wide 24-hour budget
//   (claim_rsvp_emails in supabase/free-premium.sql), so one busy site can't
//   use up the Resend daily limit that logins, invoices and support also need.
// Guests answer with an email OR a mobile number (lolos/lolas without email).
//
// Free vs Premium (event_is_premium): Premium sites and studio projects email
// the hosts for every RSVP. Free sites don't — their hosts get one summary a
// day (api/support-cron.ts). Every guest with an email gets a confirmation,
// within the budget; on free sites it carries a "Make your own" link.
// Texts (api/_lib/sms.ts, a paid add-on): a guest who replied with a mobile number only gets a
// confirmation text when the hosts have texting on; Premium hosts can get each reply by text
// instead of (or as well as) the email (event_sms.host_alerts).

const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
// No key (local dev, preview builds): RSVPs still save; emails are skipped.
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const sendEmail = (payload: Parameters<typeof sendChecked>[1]) =>
  resend ? sendChecked(resend, payload) : Promise.resolve(console.warn(`RESEND_API_KEY not set — skipped email "${payload.subject}"`));
const FROM = "The RSVP Studio <hello@thersvpstudio.com>";

const BURST_WINDOW_MIN = 10;
const BURST_MAX = 200; // RSVPs (new or updated) per event per window (a link posted to a big group chat)
const UPDATE_MAX = 5; // changes per guest per hour
const GUEST_EMAILS_PER_DAY = 60; // confirmation emails per event per day
const LEGACY_TABLE = /^[a-z0-9_]+_rsvps$/;
// Skipped when matching a name to an invitee ("Tita Lorna" = "Lorna Reyes").
const HONORIFICS = new Set(["tita", "tito", "ate", "kuya", "lola", "lolo", "ninang", "ninong", "manang", "manong", "mr", "mrs", "ms", "miss", "dr", "atty", "engr", "sir", "maam"]);

interface PublishedContentForEmail {
  hosts?: { name?: string }[];
  primaryLocation?: { name?: string; addressLine?: string; mapUrl?: string };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Premium guest photo sharing (/invite/<slug>/photos) shares this function.
  if (req.query.op === "photo-url" || req.query.op === "photo-done") return guestPhotoHandler(supabaseAdmin, req, res);
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
  // "Show my message on the website" (designs with a message wall, e.g. Under Glass; the
  // column is from supabase/under-glass.sql). Sent only by those designs.
  const sharePublic = body.share === true ? true : body.share === false ? false : null;
  // Optional RSVP details (sent by the newer forms; older templates omit them).
  const attendingRaw = body.attending;
  const attending: boolean | null =
    attendingRaw === true || attendingRaw === "yes" ? true : attendingRaw === false || attendingRaw === "no" ? false : null;
  const guestsNum = Number(body.guests);
  let guestCount = attending === false ? 0 : Number.isInteger(guestsNum) && guestsNum >= 1 && guestsNum <= 20 ? guestsNum : attending ? 1 : null;
  const dietary = attending === false ? "" : clean(body.dietary, 300);
  // How many of those coming are kids (sent only by designs that ask, e.g. Calado; the column is
  // from supabase/baby-events.sql). Never more than the party itself.
  const kidsNum = Number(body.kids);
  const kidCount = body.kids === undefined || body.kids === null || attending === false ? null : Number.isInteger(kidsNum) && kidsNum >= 0 && kidsNum <= 20 ? kidsNum : null;

  if (!slug || !/^[a-z0-9-]+$/.test(slug) || !name) {
    res.status(400).json({ error: "Please enter your name." });
    return;
  }
  if (!email && !phone) {
    res.status(400).json({ error: "Please enter your email or mobile number (e.g. 0917 123 4567)." });
    return;
  }

  // "*" so this keeps working whichever optional columns (site_password) exist.
  const { data: site } = await supabaseAdmin.from("wedding_sites").select("*").eq("slug", slug).maybeSingle();
  if (!site || !site.published_at || !site.published_content) {
    res.status(404).json({ error: "That event site isn't published yet" });
    return;
  }
  // A password-protected site (supabase/guest-features.sql): only guests who unlocked it.
  const sitePassword = typeof site.site_password === "string" ? site.site_password : "";
  if (sitePassword && clean(body.password, 40).trim().toLowerCase() !== sitePassword.trim().toLowerCase()) {
    res.status(403).json({ error: "This invitation is private. Please open it again with the password from the hosts." });
    return;
  }
  // Past the hosts' "reply by" date (content.rsvpDeadline, YYYY-MM-DD, Manila).
  const deadline = (site.published_content as { rsvpDeadline?: unknown }).rsvpDeadline;
  const manilaToday = new Date(Date.now() + 8 * 3_600_000).toISOString().slice(0, 10);
  if (typeof deadline === "string" && /^\d{4}-\d{2}-\d{2}$/.test(deadline) && deadline < manilaToday) {
    res.status(410).json({ error: "RSVPs for this event have closed. If you still need to reply, please contact the hosts." });
    return;
  }

  const { data: event } = await supabaseAdmin.from("events").select("name, event_date, table_name, deleted_at, owner_id").eq("id", site.event_id).maybeSingle();
  if (!event || event.deleted_at) {
    res.status(404).json({ error: "This invitation is no longer available." });
    return;
  }
  // DIY sites go offline after their event (supabase/project-lifecycle.sql): RSVPs close with them.
  const { data: liveUntil } = await supabaseAdmin.rpc("site_live_until", { p_event: site.event_id });
  if (typeof liveUntil === "string" && Date.parse(liveUntil) < Date.now()) {
    res.status(410).json({ error: "This event has ended, so RSVPs are closed." });
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
  const premium = legacy || (await isPremium(supabaseAdmin, site.event_id));

  // A personal link (?g=…, supabase/guest-links.sql): the reply belongs to that guest.
  // Premium: their party size is a seat limit, and an invite-only site needs the link.
  const token = clean(body.g, 40);
  type Invitee = { id: string; name: string; party_size: number | null };
  let invitee: Invitee | null = null;
  if (token && !legacy) {
    const { data } = await supabaseAdmin.from("invitees").select("id, name, party_size").eq("event_id", eventId!).eq("token", token).maybeSingle();
    invitee = (data as Invitee | null) ?? null;
  }
  if (premium && !legacy && site.invite_only === true && !invitee) {
    res.status(403).json({ error: "RSVPs for this event are by personal invitation. Please use the link the hosts sent you." });
    return;
  }

  // Answers to the hosts' own questions (content.rsvpQuestions; just the first on free
  // sites), kept by question label so they read back even if a question is edited later.
  const qs = (((site.published_content as { rsvpQuestions?: unknown }).rsvpQuestions ?? []) as { id?: string; label?: string; type?: string; options?: string[] }[])
    .filter((q) => q && typeof q.label === "string" && q.label.trim())
    .slice(0, premium ? 5 : 1);
  const rawAnswers = (body.answers && typeof body.answers === "object" ? body.answers : {}) as Record<string, unknown>;
  const answers: Record<string, string> = {};
  if (attending !== false) {
    for (const q of qs) {
      const v = clean(rawAnswers[String(q.id)], 200);
      if (!v) continue;
      if (q.type === "yesno" && v !== "Yes" && v !== "No") continue;
      if (q.type === "choice" && !(q.options ?? []).includes(v)) continue;
      answers[String(q.label).slice(0, 120)] = v;
    }
    const party = clean(rawAnswers._party, 400);
    if (party && (site.published_content as { askPartyNames?: boolean }).askPartyNames) answers["Party"] = party;
  }
  const hasAnswers = Object.keys(answers).length > 0;

  // Burst cap per event (new replies, and changed ones on the shared table).
  const since = new Date(Date.now() - BURST_WINDOW_MIN * 60_000).toISOString();
  let countQuery = supabaseAdmin.from(table).select("id", { count: "exact", head: true }).gte(legacy ? "created_at" : "updated_at", since);
  if (eventId) countQuery = countQuery.eq("event_id", eventId);
  const { count } = await countQuery;
  if ((count ?? 0) >= BURST_MAX) {
    // `retry`: the form waits a few seconds and tries again by itself.
    res.status(429).json({ error: "Lots of RSVPs are coming in right now — please try again in a few minutes.", retry: true });
    return;
  }

  // One response per guest per event: a repeat (same email, or same mobile) updates the existing row.
  type Prior = { id: string; name?: string | null; update_count?: number; updated_at?: string };
  const cols = legacy ? "id, name" : "id, name, update_count, updated_at";
  // Families share a phone or an email: a reply only replaces an earlier one from the same
  // person (same first name, or one name contains the other). Anyone else is a new reply.
  const nameKey = (s: string | null | undefined) => (s ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
  const samePerson = (other: string | null | undefined) => {
    const a = nameKey(name);
    const b = nameKey(other);
    if (!a || !b) return false;
    return a === b || a.split(" ")[0] === b.split(" ")[0] || a.includes(b) || b.includes(a);
  };
  let prior: Prior | undefined;
  // A personal link updates the reply of whoever is answering on it. A forwarded link (someone
  // else's name) is a party member on that invitation: their own reply, sharing its seats.
  // "Tita Lorna" on the list and "Lorna Reyes" on the form are the same person.
  if (invitee) {
    const firstName = (s: string | null | undefined) =>
      nameKey(s)
        .split(" ")
        .filter((w) => !HONORIFICS.has(w))[0] ?? "";
    const me = firstName(name);
    const onLink = (other: string | null | undefined) => samePerson(other) || (!!me && firstName(other) === me);
    const { data } = await supabaseAdmin.from(table).select(`${cols}, guest_count, attending`).eq("event_id", eventId!).eq("invitee_id", invitee.id).limit(20);
    const rows = (data ?? []) as unknown as (Prior & { guest_count: number | null; attending: boolean | null })[];
    prior = rows.find((r) => onLink(r.name));
    if (premium && invitee.party_size && guestCount) {
      const taken = rows.filter((r) => r.id !== prior?.id && r.attending !== false).reduce((n, r) => n + (r.guest_count ?? 1), 0);
      const left = invitee.party_size - taken;
      if (left <= 0 && site.invite_only === true) {
        res.status(409).json({ error: `All ${invitee.party_size} ${invitee.party_size === 1 ? "seat" : "seats"} on this invitation have been taken. Please message the hosts.` });
        return;
      }
      // No seats left on an open site: an ordinary reply, not part of this invitation.
      if (left <= 0) invitee = null;
      else guestCount = Math.min(guestCount, left);
    }
  }
  if (!prior && email) {
    let q = supabaseAdmin.from(table).select(cols).ilike("email", email.replace(/[%_\\]/g, "\\$&")).limit(20);
    if (eventId) q = q.eq("event_id", eventId);
    prior = (((await q).data ?? []) as unknown as Prior[]).find((r) => samePerson(r.name));
  }
  if (!prior && phone && !legacy) {
    const { data } = await supabaseAdmin.from(table).select(cols).eq("event_id", eventId!).eq("phone", phone).limit(20);
    prior = ((data ?? []) as unknown as Prior[]).find((r) => samePerson(r.name));
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
    attending === null ? "" : attending ? `Attending${guestCount ? ` (${guestCount}${kidCount ? `, ${kidCount} ${kidCount === 1 ? "kid" : "kids"}` : ""})` : ""}` : "Not attending",
    dietary ? `Dietary: ${dietary}` : "",
  ]
    .filter(Boolean)
    .join(" · ");
  const extra = legacy
    ? {}
    : {
        attending,
        guest_count: guestCount,
        ...(kidCount !== null ? { kid_count: Math.min(kidCount, guestCount ?? kidCount) } : {}),
        ...(sharePublic !== null ? { message_public: sharePublic && !!message } : {}),
        dietary: dietary || null,
        ...(email ? { email } : {}),
        ...(phone ? { phone } : {}),
        updated_at: new Date().toISOString(),
        ...(prior ? { update_count: recentChange ? (prior.update_count ?? 0) + 1 : 1 } : {}),
        ...(invitee ? { invitee_id: invitee.id } : {}),
        ...(hasAnswers ? { answers } : {}),
      };
  const legacyMessage = [details, message].filter(Boolean).join(" — ") || null;
  const row = legacy ? { name, message: legacyMessage } : { name, message: message || null, ...extra };
  const write = prior
    ? await supabaseAdmin.from(table).update(row).eq("id", prior.id)
    : await supabaseAdmin.from(table).insert(legacy ? { ...row, email } : { ...row, event_id: site.event_id }).select("id").maybeSingle();
  if (write.error) {
    console.error("RSVP write error:", write.error);
    await captureError(new Error(write.error.message), "wedding-rsvp:write", { table });
    res.status(500).json({ error: "Failed to save RSVP" });
    return;
  }

  const content = site.published_content as PublishedContentForEmail;
  const hostNames = esc(formatHostNames(content, (event.name as string | null) || "your event"));
  const safeName = esc(name);
  const safeContact = [email, phone].filter(Boolean).map((c) => esc(c!)).join(" · ");
  const safeMessage = esc(message);
  const safeDietary = esc(dietary);

  const rsvpId = prior?.id ?? ((write.data as { id?: string } | null)?.id ?? null);
  // Texting (supabase/sms.sql; missing table → no texts).
  const { data: sms } = legacy ? { data: null } : await supabaseAdmin.from("event_sms").select("enabled, host_alerts, host_phone").eq("event_id", site.event_id).maybeSingle();
  const hostAlerts = premium && sms?.host_phone ? ((sms.host_alerts as "email" | "sms" | "both") ?? "email") : "email";

  const sends: Promise<unknown>[] = [];
  // Free sites: the hosts hear about this in tomorrow's summary instead. Premium hosts who chose
  // texts only get no email.
  const recipients = premium && hostAlerts !== "sms" ? await hostRecipients(supabaseAdmin, site.event_id) : [];
  // Hosts who turned off project updates get no RSVP email (it's still in their dashboard).
  if (recipients.length && (await claimRsvpEmails(supabaseAdmin, "host", true, site.event_id, recipients.length))) sends.push(
    sendEmail({
      from: FROM,
      to: recipients,
      replyTo: email || undefined,
      subject: `${prior ? "Updated RSVP" : "New RSVP"} from ${name} — ${formatHostNames(content, (event.name as string | null) || "your event")}`,
      // Branded (support-mail.ts layout); the reply as a small card.
      html: layout(
        `${prior ? "Updated RSVP" : "New RSVP"} from ${safeName}`,
        `${prior ? `${safeName} changed their reply` : `${safeName} just replied`}${invitee && !samePerson(invitee.name) ? ` on ${esc(invitee.name)}’s invitation` : ""} to <strong>${hostNames}</strong>.
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0 0;"><tr><td bgcolor="#fbfaf6" style="background:#fbfaf6;border:1px solid #e6dfd2;border-radius:16px;padding:18px 20px;">
${[
  attending === null ? "" : `<p style="margin:0 0 10px;font-family:Georgia,'Times New Roman',serif;font-size:19px;color:${attending ? "#3d7a12" : "#6b6658"} !important;">${attending ? `Coming${guestCount ? ` · ${guestCount} ${guestCount === 1 ? "guest" : "guests"}${kidCount ? ` (${kidCount} ${kidCount === 1 ? "kid" : "kids"})` : ""}` : ""}` : "Can’t make it"}</p>`,
  `<p style="margin:0;font-size:14px;color:#3c3d57 !important;"><strong>${safeName}</strong>${safeContact ? ` · ${safeContact}` : ""}</p>`,
  safeDietary ? `<p style="margin:8px 0 0;font-size:14px;color:#3c3d57 !important;">Dietary: ${safeDietary}</p>` : "",
  ...Object.entries(answers).map(([q, a]) => `<p style="margin:8px 0 0;font-size:14px;color:#3c3d57 !important;">${esc(q)}: <strong>${esc(a)}</strong></p>`),
  safeMessage ? `<p style="margin:12px 0 0;font-family:Georgia,'Times New Roman',serif;font-style:italic;font-size:16px;line-height:1.55;color:#000727 !important;">“${safeMessage}”</p>` : "",
].join("")}
</td></tr></table>`,
        { label: "See your guest list", url: `https://thersvpstudio.com/account/projects/${site.event_id}?tab=guests` },
        "You’re receiving this because Event updates are on.<br>Turn them off under Account → Notifications.",
      ),
    }),
  );

  if (hostAlerts !== "email")
    sends.push(
      sendTexts(supabaseAdmin, {
        eventId: site.event_id,
        kind: "host_alert",
        message: hostAlertText({ guestName: name, eventName: (event.name as string | null) || formatHostNames(content), attending, guestCount, updated: !!prior, eventId: site.event_id }),
        recipients: [{ to: sms!.host_phone as string }],
      }),
    );
  // A guest with a mobile number and no email: their confirmation by text (first reply only).
  let textSend: Promise<{ status: string }> | null = null;
  if (!prior && !email && phone && sms?.enabled && rsvpId) {
    textSend = sendTexts(supabaseAdmin, {
      eventId: site.event_id,
      kind: "rsvp_confirm",
      message: confirmText({
        guestName: name,
        eventName: (event.name as string | null) || formatHostNames(content),
        hosts: formatHostNames(content, (event.name as string | null) || "The hosts"),
        slug,
        attending,
        when: shortWhen((site.published_content as { eventDate?: string }).eventDate || (event.event_date as string | null)),
      }),
      recipients: [{ to: phone, rsvpId }],
    });
    sends.push(textSend);
  }

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
  let guestSend: Promise<unknown> | null = null;
  if (!prior && email && underDailyCap && (await claimRsvpEmails(supabaseAdmin, "guest", premium, site.event_id, 1))) {
    // The branded "You're on the list" (api/_lib/guest-mail.ts), in the hosts' voice.
    const mail = guestConfirmation({
      content: site.published_content as GuestContent,
      presentation: site.published_presentation as GuestPresentation | null,
      eventName: (event.name as string | null) ?? formatHostNames(content),
      eventDate: event.event_date as string | null,
      slug,
      guestName: name,
      attending,
      guestCount,
      dietary,
      message,
      premium,
      // Premium sites remind guests 2 days before, unless the hosts switched it off.
      remindsLater: premium && !legacy && site.guest_reminders !== false,
    });
    // Premium emails come in the hosts' names, so a guest's reply goes to the hosts.
    // Free sites' come from us (and don't share the host's address with every guest).
    const { data: ownerRow } = premium && event.owner_id ? await supabaseAdmin.from("profiles").select("email").eq("id", event.owner_id).maybeSingle() : { data: null };
    guestSend = sendEmail({
      from: premium ? hostSender(content) : FROM,
      ...(ownerRow?.email ? { replyTo: ownerRow.email as string } : {}),
      to: email,
      subject: mail.subject,
      html: mail.html,
    });
    sends.push(guestSend);
  }

  // The RSVP is saved either way; email trouble is logged, not surfaced.
  const results = await Promise.allSettled(sends);
  for (const r of results) if (r.status === "rejected") console.error("RSVP email/text failed:", r.reason);
  // Tells the form whether to say "a copy is on its way to your email".
  const emailed = guestSend !== null && results[sends.indexOf(guestSend)]?.status === "fulfilled";

  // …and "a text is on its way" (only once Semaphore actually took it).
  const textResult = textSend ? results[sends.indexOf(textSend)] : null;
  const texted = textResult?.status === "fulfilled" && (textResult.value as { status: string }).status === "sent";

  res.status(200).json({ ok: true, updated: !!prior, emailed, texted });
}
