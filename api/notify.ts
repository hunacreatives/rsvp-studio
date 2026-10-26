import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { clean, esc, isEmail, normalizePhone } from "./_lib/email.js";
import { customerReplyTo, reqCode, FROM, firstName, layout, partnerLayout, makeSendMail, ratingButtons, readTipsToken, serviceFooter, STUDIO_INBOX, SUPPORT_TOPIC, threadHeaders } from "./_lib/support-mail.js";
import { customerMessageEmails } from "./_lib/support-notify.js";
import { sendInvoiceEmail } from "./_lib/billing-mail.js";
import { captureError } from "./_lib/sentry.js";
import { hostRecipients } from "./_lib/hosts.js";
import { guestMessage, hostSender, stdInvitation, type GuestContent } from "./_lib/guest-mail.js";
import { claimRsvpEmails } from "./_lib/rsvp-budget.js";
import { broadcastText, phNumber, segmentsOf, sendTexts } from "./_lib/sms.js";
import { formatHostNames } from "./_lib/hosts.js";
import { coordinatorEmail } from "./_lib/followup-mail.js";

// Email notifications for the client dashboard. Called fire-and-forget by
// the portal after a write; every kind re-checks who the caller is, so a
// client can't trigger studio emails or spoof another sender.

const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
// No key (local dev, preview builds): everything else still runs; emails are skipped.
const resendClient = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;


type Person = {
  id: string;
  full_name: string | null;
  email: string | null;
  is_staff: boolean;
  billing_email: string | null;
  notify_project_updates: boolean;
  notify_billing_updates: boolean;
};

const PERSON_COLS = "id, full_name, email, is_staff, billing_email, notify_project_updates, notify_billing_updates";

const sendMail = makeSendMail(resendClient);

async function recipientsFor(eventId: string | null, extraProfileId: string | null, pref: "notify_project_updates" | "notify_billing_updates") {
  const ids = new Set<string>();
  if (extraProfileId) ids.add(extraProfileId);
  if (eventId) {
    const { data: ev } = await supabaseAdmin.from("events").select("owner_id").eq("id", eventId).maybeSingle();
    if (ev?.owner_id) ids.add(ev.owner_id);
    const { data: members } = await supabaseAdmin.from("event_members").select("profile_id").eq("event_id", eventId);
    for (const m of members ?? []) ids.add(m.profile_id);
  }
  if (!ids.size) return [];
  const { data } = await supabaseAdmin.from("profiles").select(PERSON_COLS).in("id", [...ids]);
  return ((data ?? []) as Person[]).filter((p) => !p.is_staff && p[pref] && (p.email || p.billing_email));
}

// The follow-up emails' unsubscribe link (no sign-in; the link is signed per person).
// GET shows a confirm button, so link scanners that open every URL can't unsubscribe
// anyone; POST (that button, or the mail app's one-click unsubscribe) turns them off.
async function unsubscribe(req: VercelRequest, res: VercelResponse) {
  const t = String(req.query.t ?? "");
  const profileId = readTipsToken(t);
  const page = (heading: string, body: string) =>
    res
      .status(profileId ? 200 : 400)
      .setHeader("Content-Type", "text/html; charset=utf-8")
      .setHeader("Cache-Control", "no-store")
      .send(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${heading} · The RSVP Studio</title></head>
<body style="margin:0;background:#f3f3f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#000727;">
<main style="max-width:440px;margin:12vh auto 0;padding:36px 28px;background:#fff;border-radius:22px;text-align:center;">
<img src="https://thersvpstudio.com/brand/logotype-dark.png" alt="The RSVP Studio" width="120" style="display:block;margin:0 auto 22px;height:auto;">
<h1 style="margin:0 0 12px;font-family:Georgia,'Times New Roman',serif;font-weight:400;font-size:26px;line-height:1.25;">${heading}</h1>
${body}
</main></body></html>`);
  if (!profileId) return page("That link didn’t work", `<p style="color:#4a4b63;line-height:1.6;">Turn these emails off under Account → Notifications instead.</p>`);
  if (req.method === "POST") {
    const { error } = await supabaseAdmin.from("profiles").update({ notify_tips: false }).eq("id", profileId);
    if (error) return res.status(500).send("Couldn’t update your settings. Please try again.");
    return page(
      "You’re unsubscribed",
      `<p style="color:#4a4b63;line-height:1.6;margin:0 0 22px;">No more tips and reminders about your events. You’ll still get emails you need, like RSVPs, receipts and replies from our team.</p>
<a href="https://thersvpstudio.com/account/settings" style="color:#2f61d5;font-size:14px;">Change this in your notification settings</a>`,
    );
  }
  return page(
    "Unsubscribe from tips and reminders?",
    `<p style="color:#4a4b63;line-height:1.6;margin:0 0 24px;">Reminders about unfinished drafts, your headcount before the event, and a thank-you after. You’ll still get RSVPs, receipts and replies from our team.</p>
<form method="post" action="/api/notify?op=unsubscribe&amp;t=${encodeURIComponent(t)}"><button type="submit" style="border:0;border-radius:999px;background:#000727;color:#fff;font-size:15px;padding:14px 28px;cursor:pointer;">Unsubscribe</button></form>`,
  );
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.query.op === "unsubscribe") return unsubscribe(req, res);
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const token = (req.headers.authorization ?? "").replace(/^Bearer\s+/i, "");
  const { data: auth } = await supabaseAdmin.auth.getUser(token);
  if (!auth?.user) return res.status(401).json({ error: "Not signed in" });
  const { data: caller } = await supabaseAdmin.from("profiles").select(PERSON_COLS).eq("id", auth.user.id).maybeSingle();
  if (!caller) return res.status(401).json({ error: "No profile" });

  // Every link in these emails points at the live site, even when the action came from a
  // preview deployment or localhost (those addresses would be broken for the person reading it).
  const origin = "https://thersvpstudio.com";
  const body = req.body as { kind: string; role?: string; chartId?: string; partnerId?: string; note?: string | null; code?: string; email?: string; messageId?: string; eventId?: string; title?: string; detail?: string | null; invoiceId?: string; inviteId?: string; profileId?: string; threadId?: string; audience?: string; channel?: string; message?: string; preview?: boolean };
  const sends: Promise<unknown>[] = [];

  try {
    // Mesa → Day-of check-in → "Email it to your coordinator". Only the plan's owner, only while
    // its link is on and the event is Premium, and at most 5 a day: it emails someone who isn't
    // a user. The address is kept for the day-before reminder.
    if (body.kind === "checkin_invite") {
      const to = clean(body.email ?? "", 254).toLowerCase();
      if (!isEmail(to)) return res.status(400).json({ error: "That email doesn’t look right." });
      const { data: plan } = await supabaseAdmin
        .from("seating_charts")
        .select("id, owner_id, event_id, title, checkin_token, checkin_until, checkin_pin, checkin_mail_day, checkin_mail_count, names:chart->>names")
        .eq("id", String(body.chartId ?? ""))
        .maybeSingle();
      const pl = plan as { id: string; owner_id: string; event_id: string | null; title: string; checkin_token: string | null; checkin_until: string | null; checkin_pin: string | null; checkin_mail_day: string | null; checkin_mail_count: number; names: string | null } | null;
      if (!pl || pl.owner_id !== caller.id) return res.status(403).json({ error: "Not your plan" });
      if (!pl.checkin_token || !pl.checkin_until || new Date(pl.checkin_until) < new Date() || !pl.event_id) return res.status(400).json({ error: "Make the check-in link first." });
      const [{ data: evOwn }, { data: evMember }] = await Promise.all([
        supabaseAdmin.from("events").select("id").eq("id", pl.event_id).eq("owner_id", caller.id).maybeSingle(),
        supabaseAdmin.from("event_members").select("event_id").eq("event_id", pl.event_id).eq("profile_id", caller.id).neq("role", "viewer").maybeSingle(),
      ]);
      if (!evOwn && !evMember) return res.status(403).json({ error: "Not your event" });
      const { data: premium } = await supabaseAdmin.rpc("event_is_premium", { p_event: pl.event_id });
      if (premium !== true) return res.status(403).json({ error: "Day-of check-in comes with Premium." });
      const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
      const count = pl.checkin_mail_day === today ? pl.checkin_mail_count : 0;
      if (count >= 5) return res.status(429).json({ error: "That’s 5 emails today. Copy the link and send it yourself, or try tomorrow." });
      await supabaseAdmin.from("seating_charts").update({ checkin_contact: to, checkin_mail_day: today, checkin_mail_count: count + 1 }).eq("id", pl.id);
      const { data: ev } = await supabaseAdmin.from("events").select("name, event_date").eq("id", pl.event_id).maybeSingle();
      const url = `${origin}/tools/seating-chart-maker/day/${pl.checkin_token}`;
      const mail = coordinatorEmail({ couple: pl.names || ev?.name || pl.title, eventName: ev?.name || pl.title, eventDate: (ev?.event_date as string | null) ?? null, url, qr: `${origin}/qr/day-${pl.checkin_token}.png`, pin: !!pl.checkin_pin, dayBefore: false });
      await sendMail({ from: FROM, to, subject: mail.subject, html: mail.html, replyTo: STUDIO_INBOX });
      return res.status(200).json({ sent: 1 });
    }

    // Project → People → "Invite": a cohost, coordinator or viewer, or (role "owner") a coordinator
    // handing a client's event over to them (coordinator-desk.sql). invite_to_event runs as the
    // caller, so the database decides who may invite whom; the emailed token is only ever stored
    // hashed. At most 10 a day per event.
    if (body.kind === "event_invite") {
      const to = clean(body.email ?? "", 254).toLowerCase();
      const role = String(body.role ?? "");
      const eventId = String(body.eventId ?? "");
      if (!isEmail(to)) return res.status(400).json({ error: "That email doesn’t look right." });
      const since = new Date(Date.now() - 864e5).toISOString();
      const { count } = await supabaseAdmin.from("event_invites").select("id", { count: "exact", head: true }).eq("event_id", eventId).gt("created_at", since);
      if ((count ?? 0) >= 10) return res.status(429).json({ error: "That’s 10 invites today. Try again tomorrow." });
      const asCaller = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } });
      const { data: made, error } = await asCaller.rpc("invite_to_event", { p_event: eventId, p_email: to, p_role: role });
      if (error || !made) {
        const m = error?.message ?? "";
        const why = /ALREADY/.test(m)
          ? role === "owner" ? "That’s your own email. Enter your client’s." : "They already have access to this event."
          : /NOT_ALLOWED/.test(m)
            ? role === "owner" ? "Only the coordinator who set up this event can hand it over, and only once." : "Only the event’s hosts can invite people to it."
            : /DAILY_LIMIT/.test(m)
              ? "That’s 20 invites today. Try again tomorrow."
              : /TOO_MANY/.test(m) ? "That’s a lot of open invites. Cancel some first." : /EMAIL/.test(m) ? "That email doesn’t look right." : "Couldn’t make the invite. Please try again.";
        return res.status(/DAILY_LIMIT/.test(m) ? 429 : /ALREADY|EMAIL|TOO_MANY/.test(m) ? 400 : 403).json({ error: why });
      }
      const { data: ev } = await supabaseAdmin.from("events").select("name, event_date").eq("id", eventId).maybeSingle();
      const evName = ev?.name ?? "an event";
      const who = caller.full_name || caller.email || "Someone";
      const what = ({
        cohost: "You can edit the website, see replies and guests, and pay for upgrades.",
        coordinator: "You can edit the website and seating plan, see replies and guests, and run check-in on the day. Billing stays with them.",
        viewer: "You can see the website, replies and guests. Nothing you do there changes them.",
      } as Record<string, string>)[role] ?? "";
      // r= only picks the words on the join page; accepting still does what the invite says.
      const url = `${origin}/account/join?t=${encodeURIComponent((made as { token: string }).token)}&e=${encodeURIComponent(to)}&r=${encodeURIComponent(role)}`;
      const signIn = `Sign in or create your account with <strong>${esc(to)}</strong>. The link works for 14 days.`;
      const mail =
        role === "owner"
          ? {
              subject: "Your event is ready on The RSVP Studio",
              title: "Your event is ready",
              body: `${esc(who)} set up <strong>${esc(evName)}</strong> for you on The RSVP Studio. Accept to take it over: from then on the event is yours, and so are its payments. ${esc(who)} stays on as your coordinator to help with guests, seating and the day.<br><br>${signIn}`,
              button: "Take over your event",
            }
          : role === "coordinator"
            ? {
                subject: "You’re invited to coordinate an event on The RSVP Studio",
                title: "Welcome, coordinator",
                body: `${esc(who)} would like your help with <strong>${esc(evName)}</strong> on The RSVP Studio, as their coordinator.<br><br>${esc(what)} Their event will be waiting for you under Clients.<br><br>${signIn}<br><br>Have other clients? Sign up as a coordinator, free. <a href="${origin}/partners">See how it works</a>.`,
                button: "Accept the invite",
              }
            : {
                subject: "You’re invited to an event on The RSVP Studio",
                title: `Join ${esc(evName)}`,
                body: `${esc(who)} invited you to help with <strong>${esc(evName)}</strong> on The RSVP Studio as ${role === "cohost" ? "a co-host" : `the ${esc(role)}`}.<br><br>${esc(what)}<br><br>${signIn}`,
                button: "Accept the invite",
              };
      await sendMail({
        from: FROM,
        to,
        subject: mail.subject,
        html: layout(mail.title, mail.body, { label: mail.button, url }, role === "owner" ? `Not expecting this? You can ignore it; nothing changes unless you accept.` : `Not expecting this? You can ignore it; nothing happens unless you accept.`),
        replyTo: caller.email && isEmail(caller.email) ? caller.email : STUDIO_INBOX,
      });
      return res.status(200).json({ id: (made as { id: string }).id });
    }

    if (body.kind === "message" && body.messageId) {
      const { data: msg } = await supabaseAdmin.from("messages").select("id, thread_id, sender_id, body, attachments, internal").eq("id", body.messageId).maybeSingle();
      if (!msg || msg.sender_id !== caller.id) return res.status(403).json({ error: "Not your message" });
      // Internal notes stay inside the team.
      if (msg.internal) return res.status(200).json({ sent: 0, failed: 0 });
      const { data: thread } = await supabaseAdmin
        .from("message_threads")
        .select("id, profile_id, event_id, kind, subject, ticket_number, category, urgent, auto_reply_at, reply_key")
        .eq("id", msg.thread_id)
        .maybeSingle();
      if (!thread) return res.status(404).json({ error: "Thread not found" });
      const files = (msg.attachments as { name: string }[]).map((a) => a.name);
      const snippet = `${esc(msg.body).replace(/\n/g, "<br>")}${files.length ? `<br><br><em>Attached: ${esc(files.join(", "))}</em>` : ""}`;
      const link = `${origin}/account/messages?thread=${thread.id}`;

      if (thread.kind === "support" && thread.ticket_number) {
        const n = thread.ticket_number as number;
        const topic = SUPPORT_TOPIC[thread.category ?? "other"] ?? "Support";
        if (caller.is_staff) {
          // A studio reply always reaches the customer (service email, not a notification setting).
          const { data: customer } = await supabaseAdmin.from("profiles").select("email, full_name").eq("id", thread.profile_id).maybeSingle();
          if (customer?.email) {
            sends.push(
              sendMail({
                from: FROM,
                to: customer.email,
                replyTo: customerReplyTo(thread),
                subject: `[${reqCode(n)}] New reply from The RSVP Studio`,
                headers: threadHeaders(n, false, thread.reply_key),
                html: layout(`${esc(caller.full_name || "The RSVP Studio")} replied`, `${snippet}<br><br><span style="color:#868697">${reqCode(n)} · ${esc(topic)}</span>`, { label: "Reply in your dashboard", url: link }, serviceFooter(), { promo: false }),
              }),
            );
          }
        } else {
          sends.push(...customerMessageEmails(supabaseAdmin, sendMail, { thread: { ...thread, ticket_number: n }, customer: caller, message: msg, origin }));
        }
      } else if (caller.is_staff) {
        const to = await recipientsFor(thread.event_id, thread.profile_id, "notify_project_updates");
        for (const r of to) {
          sends.push(
            sendMail({
              from: FROM,
              to: r.email!,
              subject: `New message: ${thread.subject}`,
              html: layout(`${caller.full_name?.trim() ? `${esc(caller.full_name.trim().split(/\s+/)[0])} from ` : ""}The RSVP Studio<br>sent you a message`, snippet, { label: "Reply in your dashboard", url: `${origin}/account/messages?thread=${thread.id}` }),
            }),
          );
        }
      } else {
        sends.push(
          sendMail({
            from: FROM,
            to: STUDIO_INBOX,
            replyTo: caller.email ?? undefined,
            subject: `${thread.kind === "support" ? "🛟 Support" : "💬 Message"} from ${caller.full_name || caller.email}: ${thread.subject}`,
            html: layout(esc(thread.subject), snippet, { label: "Open in Studio Console", url: `${origin}/studio/inbox?thread=${thread.id}` }, undefined, { ad: false }),
          }),
        );
      }
    } else if (body.kind === "support_resolved" && body.threadId && caller.is_staff) {
      const { data: thread } = await supabaseAdmin.from("message_threads").select("id, profile_id, ticket_number, category, status, reply_key").eq("id", body.threadId).maybeSingle();
      if (!thread?.ticket_number || thread.status !== "resolved") return res.status(404).json({ error: "Not a resolved request" });
      const { data: customer } = await supabaseAdmin.from("profiles").select("email, full_name").eq("id", thread.profile_id).maybeSingle();
      if (customer?.email) {
        const n = thread.ticket_number as number;
        sends.push(
          sendMail({
            from: FROM,
            to: customer.email,
            replyTo: customerReplyTo(thread),
            subject: `[${reqCode(n)}] Your request is done`,
            headers: threadHeaders(n, false, thread.reply_key),
            html: layout(
              "Your request is done",
              `Hi ${esc((customer.full_name || "").split(" ")[0] || "there")},<br><br>We’ve marked <strong>${reqCode(n)}</strong> (${esc(SUPPORT_TOPIC[thread.category ?? "other"] ?? "Support")}) as done. If anything still isn’t right, reply within 7 days and we’ll pick it up again.${ratingButtons(origin, thread.id)}`,
              { label: "View your request", url: `${origin}/account/messages?thread=${thread.id}` },
              serviceFooter(),
              { letter: true, promo: false },
            ),
          }),
        );
      }
    } else if (body.kind === "project_update" && body.eventId && caller.is_staff) {
      const { data: ev } = await supabaseAdmin.from("events").select("name").eq("id", body.eventId).maybeSingle();
      const to = await recipientsFor(body.eventId, null, "notify_project_updates");
      for (const r of to) {
        sends.push(
          sendMail({
            from: FROM,
            to: r.email!,
            subject: `${ev?.name ?? "Your event"}: ${body.title ?? "New update"}`,
            html: layout(esc(body.title ?? "Event update"), body.detail ? esc(body.detail) : `There’s a new update on <strong>${esc(ev?.name ?? "your event")}</strong>.`, {
              label: "View your event",
              url: `${origin}/account/projects/${body.eventId}`,
            }),
          }),
        );
      }
    } else if (["invoice", "payment", "invoice_reminder", "invoice_void", "invoice_unpaid"].includes(body.kind) && body.invoiceId && caller.is_staff) {
      const kind = ({ invoice: "invoice", payment: "payment", invoice_reminder: "reminder", invoice_void: "void", invoice_unpaid: "unpaid" } as const)[
        body.kind as "invoice" | "payment" | "invoice_reminder" | "invoice_void" | "invoice_unpaid"
      ];
      sends.push(sendInvoiceEmail(supabaseAdmin, sendMail, { invoiceId: body.invoiceId, kind, origin, note: body.note }));
      if (kind === "reminder") await supabaseAdmin.from("invoices").update({ last_reminded_at: new Date().toISOString() }).eq("id", body.invoiceId);
    } else if (body.kind === "invite_code" && body.eventId && body.code && body.email && caller.is_staff) {
      // Studio → project → "Email code to…": the client's invite code and how to use it.
      const to = String(body.email).trim().toLowerCase();
      if (!isEmail(to)) return res.status(400).json({ error: "That email address doesn’t look right." });
      // (role comes with coordinator-mode.sql; without it, read the rest.)
      let found = await supabaseAdmin.from("invite_codes").select("code, used_at, role").eq("event_id", body.eventId).eq("code", body.code).maybeSingle();
      if (found.error) found = await supabaseAdmin.from("invite_codes").select("code, used_at").eq("event_id", body.eventId).eq("code", body.code).maybeSingle();
      const invite = found.data as { code: string; used_at: string | null; role?: string | null } | null;
      const coordinator = invite?.role === "coordinator";
      if (!invite || invite.used_at) return res.status(404).json({ error: "That code has already been used — generate a new one." });
      const { data: ev } = await supabaseAdmin.from("events").select("name").eq("id", body.eventId).maybeSingle();
      const signUp = `${origin}/?auth=signup&email=${encodeURIComponent(to)}`;
      const intro = coordinator
        ? `You’re the coordinator for <strong>${esc(ev?.name ?? "this event")}</strong> on The RSVP Studio. You can edit the website and seating plan, see replies and guests, and run check-in on the day. Billing stays with your client.<br><br>`
        : `We’ve set up <strong>${esc(ev?.name ?? "your event")}</strong> in your RSVP Studio dashboard — progress, designs, invoices and messages, all together.<br><br>`;
      sends.push(
        sendMail({
          from: FROM,
          to,
          subject: `Your event dashboard is ready — ${ev?.name ?? "The RSVP Studio"}`,
          html: layout(
            "See your event in one place",
            `${intro}
            <strong>1.</strong> Create your account (or log in) with <strong>${esc(to)}</strong>.<br>
            <strong>2.</strong> Enter this code when asked:<br>
            <span style="display:inline-block;margin:10px 0;padding:10px 18px;border-radius:12px;background:#f5f5f2;font-family:monospace;font-size:20px;letter-spacing:.12em;color:#000727;">${esc(invite.code)}</span><br>
            The code works once. Questions? Just reply to this email.`,
            { label: "Create your account", url: signUp },
            `Already have an account? Log in, then open ${origin}/account/onboarding?code=${encodeURIComponent(invite.code)}`,
          ),
          replyTo: STUDIO_INBOX,
        }),
      );
    } else if (body.kind === "partner_welcome" && body.partnerId && caller.is_staff) {
      // Studio → Partners: "You're an RSVP Studio partner" — code, link, tiers, how to log in.
      const { data: pa } = await supabaseAdmin.from("partners").select("id, code, kind, name, email, discount, rate_mode, rate, active").eq("id", body.partnerId).maybeSingle();
      if (!pa?.email || !isEmail(pa.email)) return res.status(400).json({ error: "Add their email first." });
      if (!pa.active) return res.status(400).json({ error: "This partner is paused." });
      const { data: tierRows } = await supabaseAdmin.rpc("partner_tier", { p_code: pa.code });
      const tier = (Array.isArray(tierRows) ? tierRows[0] : tierRows) as { tier: string; rate: number } | null;
      const { data: existing } = await supabaseAdmin.from("profiles").select("id").ilike("email", pa.email).maybeSingle();
      const link = `${origin}/p/${pa.code}`;
      const dash = `${origin}/?auth=${existing ? "signin" : "signup"}&email=${encodeURIComponent(pa.email)}&next=${encodeURIComponent("/account/partner")}`;
      const tiers = pa.rate_mode === "custom"
        ? `<p style="margin:0">You earn <strong>${Number(pa.rate)}%</strong> of what each client you send pays us.</p>`
        : `<table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:separate;border-spacing:6px 0;margin:4px -6px 0;"><tr>${[
            ["Starter", 10, "From your first client", "#e4f4fb", "#0d5a75"],
            ["Silver", 15, "After 5 paying clients", "#eceff4", "#4a5568"],
            ["Gold", 20, "After 15 paying clients", "#fdf1cf", "#7a5a00"],
          ]
            .map(([n, r, w, bg, ink]) => `<td width="33%" valign="top" style="background:${bg};border-radius:14px;padding:12px 12px;color:${ink} !important;font-family:Inter,Arial,sans-serif;"><div style="font-size:11px;letter-spacing:.12em;text-transform:uppercase;font-weight:700;">${n}</div><div style="font-family:Georgia,serif;font-size:26px;line-height:1.2;">${r}%</div><div style="font-size:12px;">${w}</div></td>`)
            .join("")}</tr></table>`;
      sends.push(
        sendMail({
          from: FROM,
          to: pa.email,
          subject: "You’re on the list — welcome to The RSVP Studio partners",
          html: partnerLayout(
            origin,
            `You’re on the list, ${firstName(pa.name)}.`,
            `Consider this your invitation to our partner program. Share your code with ${pa.kind === "influencer" ? "your followers" : "the couples and celebrants you work with"}: they get <strong>${Number(pa.discount)}% off</strong> their event website or package, and you earn a share of every booking.<br><br>
            <strong>Your code</strong><br>
            <span style="display:inline-block;margin:8px 0 4px;padding:10px 18px;border-radius:12px;background:#f5f5f2;font-family:Georgia,serif;font-size:22px;letter-spacing:.1em;color:#000727;">${esc(pa.code)}</span><br>
            <strong>Your link:</strong> <a href="${link}" style="color:#2f61d5;">${esc(link.replace(/^https:\/\//, ""))}</a><br><br>
            ${pa.rate_mode === "custom" ? "" : `The more people you send, the more you earn${tier && tier.tier !== "custom" ? ` (you’re on <strong>${esc(tier.tier[0].toUpperCase() + tier.tier.slice(1))}</strong>)` : ""}:<br><br>`}${tiers}<br>
            <strong>Your partner dashboard</strong> keeps the guest list: link visits, sign-ups, bookings and what you’ve earned. ${existing ? "Log in" : "Create your account"} with <strong>${esc(pa.email)}</strong>, or “Sign in with Google” using that address, then open <strong>Partner</strong>.`,
            { label: "Open your partner dashboard", url: dash },
            "You’re receiving this because you joined The RSVP Studio partner program. Questions? Just reply to this email.",
          ),
          replyTo: STUDIO_INBOX,
        }),
      );
      await supabaseAdmin.from("partners").update({ welcomed_at: new Date().toISOString() }).eq("id", pa.id);
    } else if ((body.kind === "staff_invite" && body.inviteId) || (body.kind === "staff_added" && body.profileId)) {
      // Team emails: only the owner can trigger them (supabase/team-roles.sql).
      const { data: me } = await supabaseAdmin.from("profiles").select("staff_role").eq("id", caller.id).maybeSingle();
      if (me?.staff_role !== "owner") return res.status(403).json({ error: "Owner only" });
      const who = esc(caller.full_name || "The RSVP Studio");
      if (body.kind === "staff_invite") {
        const { data: inv } = await supabaseAdmin.from("staff_invites").select("email, accepted_at, cancelled_at").eq("id", body.inviteId!).maybeSingle();
        if (!inv || inv.accepted_at || inv.cancelled_at) return res.status(404).json({ error: "Invite not pending" });
        const signUp = `${origin}/?auth=signup&email=${encodeURIComponent(inv.email)}`;
        sends.push(
          sendMail({
            from: FROM,
            to: inv.email,
            subject: "You’ve been invited to The RSVP Studio team",
            html: layout(
              "You’re invited to the team",
              `${who} added you as an <strong>admin</strong> of The RSVP Studio. Admins can open the Studio console to manage projects, clients, invoices, support and templates.<br><br>Create your account with <strong>${esc(inv.email)}</strong> (or sign in with Google using that address) and you’ll have access straight away.`,
              { label: "Create your account", url: signUp },
              undefined,
              { ad: false },
            ),
          }),
        );
      } else {
        const { data: p } = await supabaseAdmin.from("profiles").select("email, staff_role").eq("id", body.profileId!).maybeSingle();
        if (!p?.email || p.staff_role !== "admin") return res.status(404).json({ error: "Not an admin" });
        sends.push(
          sendMail({
            from: FROM,
            to: p.email,
            subject: "You’re now an admin of The RSVP Studio",
            html: layout(
              "You’re now an admin",
              `${who} added you as an <strong>admin</strong> of The RSVP Studio. Next time you sign in you’ll go straight to the Studio console.`,
              { label: "Open the Studio", url: `${origin}/studio` },
              undefined,
              { ad: false },
            ),
          }),
        );
      }
    } else if (body.kind === "broadcast" && body.eventId) {
      return await broadcast(caller, body, res);
    } else if ((body.kind === "site_live" || body.kind === "std_invite") && body.eventId) {
      // From the host's own dashboard / builder: only someone hosting the event (not a viewer).
      const { data: ev } = await supabaseAdmin.from("events").select("id, name, owner_id, managed_by_studio").eq("id", body.eventId).maybeSingle();
      const { data: member } = ev ? await supabaseAdmin.from("event_members").select("profile_id").eq("event_id", ev.id).eq("profile_id", caller.id).neq("role", "viewer").maybeSingle() : { data: null };
      if (!ev || (ev.owner_id !== caller.id && !member && !caller.is_staff)) return res.status(403).json({ error: "Not your event" });
      const { data: site } = await supabaseAdmin.from("wedding_sites").select("*").eq("event_id", ev.id).maybeSingle();
      if (!site?.published_at) return res.status(409).json({ error: "The website isn’t live yet" });
      const link = `${origin}/invite/${site.slug}`;

      if (body.kind === "site_live") {
        // "Your website is live": once per event, ever (followup_log, email-additions.sql).
        const { error: claimErr } = await supabaseAdmin.from("followup_log").insert({ event_id: ev.id, kind: "site_live" });
        if (claimErr) return res.status(200).json({ sent: 0, already: true });
        const to = await hostRecipients(supabaseAdmin, ev.id);
        const deadline = (site.published_content as { rsvpDeadline?: string } | null)?.rsvpDeadline;
        sends.push(
          sendMail(
            {
              from: FROM,
              to,
              subject: `Your website for ${ev.name} is live`,
              html: layout(
                "Your website is live",
                `<strong>${esc(ev.name)}</strong> is online at<br><a href="${link}" style="color:#2f61d5 !important;">${link.replace("https://", "")}</a><br><br><strong>Share it</strong><br>Send each guest their own link from your invite list: their reply is matched to them for sure.<br>Printing invitations? Your dashboard has a QR code for them.${
                  deadline ? "" : `<br><br><strong>One more thing</strong><br>Set a “Replies close on” date so guests know when to answer.`
                }`,
                { label: "Open your invite list", url: `${origin}/account/projects/${ev.id}?tab=guests&list=invites` },
                "You’re receiving this because you published your website on The RSVP Studio.",
              ),
            },
            `site-live-${ev.id}`,
          ),
        );
      } else {
        // "The invitation is here" to Save the Date sign-ups who gave an email and agreed,
        // each once (invitees.std_invited_at). The website has to be what the link shows now.
        if (site.std_live) return res.status(409).json({ error: "Your link still shows the Save the Date" });
        const { data: list, error: listErr } = await supabaseAdmin
          .from("invitees")
          .select("id, name, contact")
          .eq("event_id", ev.id)
          .eq("source", "save_the_date")
          .not("consented_at", "is", null)
          .is("std_invited_at", null)
          .ilike("contact", "%@%")
          .limit(300);
        if (listErr) return res.status(500).json({ error: "Couldn’t load the sign-ups" });
        const { data: premium } = await supabaseAdmin.rpc("event_is_premium", { p_event: ev.id });
        const { data: owner } = ev.owner_id ? await supabaseAdmin.from("profiles").select("email").eq("id", ev.owner_id).maybeSingle() : { data: null };
        const content = (site.published_content ?? {}) as GuestContent & { rsvpDeadline?: string };
        let sent = 0;
        let failed = 0;
        // A few at a time: kind to Resend's rate limit, and each person is marked as they go.
        for (let i = 0; i < (list ?? []).length; i += 5) {
          await Promise.all(
            (list ?? []).slice(i, i + 5).map(async (inv) => {
              if (!isEmail(String(inv.contact ?? "").trim())) return;
              const mail = stdInvitation({ content, presentation: site.published_presentation, eventName: ev.name, slug: site.slug, guestName: inv.name, premium: premium === true, deadline: content.rsvpDeadline ?? null });
              try {
                await sendMail(
                  { from: premium === true ? hostSender(content) : FROM, ...(premium === true && owner?.email ? { replyTo: owner.email as string } : {}), to: String(inv.contact).trim(), subject: mail.subject, html: mail.html },
                  `std-invite-${inv.id}`,
                );
                await supabaseAdmin.from("invitees").update({ std_invited_at: new Date().toISOString() }).eq("id", inv.id);
                sent++;
              } catch (e) {
                failed++;
                console.error("std invite failed", inv.id, e);
              }
            }),
          );
        }
        return res.status(200).json({ sent, failed });
      }
    } else {
      return res.status(400).json({ error: "Unknown or unauthorized notification" });
    }

    const results = await Promise.allSettled(sends);
    const failed = results.filter((r) => r.status === "rejected").length;
    if (failed) console.error("notify: some emails failed", results);
    return res.status(200).json({ sent: results.length - failed, failed });
  } catch (err) {
    console.error("notify error", err);
    await captureError(err, "notify", { kind: (req.body as { kind?: string } | undefined)?.kind });
    return res.status(500).json({ error: "Notification failed" });
  }
}

const BROADCASTS_PER_DAY = 3;

/**
 * "Message your guests" (Guests tab): the host writes once; guests get it by email (Premium)
 * and/or text (texting on, uses texts). `preview` counts who it reaches and what it costs
 * without sending. "Email and text": email whoever has an email, text the rest.
 */
async function broadcast(caller: Person, body: { eventId?: string; audience?: string; channel?: string; message?: string; preview?: boolean }, res: VercelResponse) {
  const { data: ev } = await supabaseAdmin.from("events").select("id, name, owner_id, table_name").eq("id", body.eventId!).maybeSingle();
  const { data: member } = ev ? await supabaseAdmin.from("event_members").select("profile_id").eq("event_id", ev.id).eq("profile_id", caller.id).neq("role", "viewer").maybeSingle() : { data: null };
  if (!ev || (ev.owner_id !== caller.id && !member && !caller.is_staff)) return res.status(403).json({ error: "Not your event" });
  if (ev.table_name) return res.status(409).json({ error: "Message your guests isn’t available for this event." });
  const audience = ["coming", "replied", "waiting", "declined"].includes(String(body.audience)) ? String(body.audience) : null;
  const channel = ["email", "sms", "both"].includes(String(body.channel)) ? String(body.channel) : null;
  const message = clean(body.message, 600);
  if (!audience || !channel) return res.status(400).json({ error: "Pick who it’s for and how to send it." });

  const { data: premiumRaw } = await supabaseAdmin.rpc("event_is_premium", { p_event: ev.id });
  const premium = premiumRaw === true;
  if (channel !== "sms" && !premium) return res.status(403).json({ error: "Emailing your guests is part of Premium." });
  const { data: site } = await supabaseAdmin.from("wedding_sites").select("*").eq("event_id", ev.id).maybeSingle();
  const content = (site?.published_content ?? site?.draft_content ?? {}) as GuestContent;
  const hosts = formatHostNames(content, ev.name);

  // Who: replies (coming / declined / all), or invite-list people with no reply yet.
  type Person2 = { name: string; email: string | null; phone: string | null };
  let people: Person2[] = [];
  if (audience === "waiting") {
    const { data: inv } = await supabaseAdmin.from("invitees").select("id, name, contact").eq("event_id", ev.id).limit(1000);
    const { data: answered } = await supabaseAdmin.from("rsvps").select("invitee_id").eq("event_id", ev.id).not("invitee_id", "is", null).limit(2000);
    const done = new Set((answered ?? []).map((r) => r.invitee_id));
    people = (inv ?? [])
      .filter((i) => !done.has(i.id))
      .map((i) => {
        const c = String(i.contact ?? "").trim();
        return { name: String(i.name ?? ""), email: isEmail(c.toLowerCase()) ? c.toLowerCase() : null, phone: c.includes("@") ? null : normalizePhone(c) };
      });
  } else {
    let q = supabaseAdmin.from("rsvps").select("name, email, phone, attending").eq("event_id", ev.id).limit(2000);
    if (audience === "coming") q = q.eq("attending", true);
    if (audience === "declined") q = q.eq("attending", false);
    const { data } = await q;
    people = (data ?? []).map((r) => ({ name: String(r.name ?? ""), email: r.email && isEmail(String(r.email)) ? String(r.email).toLowerCase() : null, phone: normalizePhone(r.phone) }));
  }
  // One message per address.
  const seenE = new Set<string>();
  const seenP = new Set<string>();
  const emails: Person2[] = [];
  const texts: Person2[] = [];
  let unreachable = 0;
  for (const p of people) {
    const wantEmail = channel !== "sms" && p.email && !seenE.has(p.email);
    const ph = phNumber(p.phone);
    const wantText = (channel === "sms" || (channel === "both" && !p.email)) && ph && !seenP.has(ph);
    if (wantEmail) (seenE.add(p.email!), emails.push(p));
    else if (wantText) (seenP.add(ph!), texts.push(p));
    else if (!(p.email && seenE.has(p.email)) && !(ph && seenP.has(ph))) unreachable++;
  }
  const smsBody = broadcastText(message || "x", hosts);
  const segs = segmentsOf(smsBody);
  const { data: acct } = await supabaseAdmin.from("event_sms").select("enabled, credits, used").eq("event_id", ev.id).maybeSingle();
  const left = acct ? Number(acct.credits) - Number(acct.used) : 0;
  const summary = { emails: emails.length, texts: texts.length, segments: segs, credits: texts.length * segs, left, textingOn: !!acct?.enabled, unreachable, premium };
  if (body.preview) return res.status(200).json(summary);

  if (!message) return res.status(400).json({ error: "Write your message first." });
  if (!emails.length && !texts.length) return res.status(400).json({ error: "Nobody in that group can be reached this way." });
  if (texts.length && !acct?.enabled) return res.status(409).json({ error: "Switch on texting in your website’s Settings first." });
  if (texts.length && segs > 4) return res.status(400).json({ error: "That’s too long for a text. Keep it under about 600 characters." });
  if (summary.credits > left) return res.status(402).json({ error: `This needs ${summary.credits} texts and you have ${left}. Add texts in your website’s Settings.` });
  const since = new Date(Date.now() - 86_400_000).toISOString();
  const { count: recent } = await supabaseAdmin.from("guest_broadcasts").select("id", { count: "exact", head: true }).eq("event_id", ev.id).gte("created_at", since);
  if ((recent ?? 0) >= BROADCASTS_PER_DAY) return res.status(429).json({ error: `You can send ${BROADCASTS_PER_DAY} messages a day. Try again tomorrow.` });
  if (emails.length && !(await claimRsvpEmails(supabaseAdmin, "guest", true, ev.id, emails.length)))
    return res.status(429).json({ error: "We’ve sent a lot of email today. Please try again tomorrow, or send it by text." });

  const { data: row, error: insErr } = await supabaseAdmin
    .from("guest_broadcasts")
    .insert({ event_id: ev.id, created_by: caller.id, audience, channels: channel === "both" ? ["email", "sms"] : [channel], message })
    .select("id")
    .single();
  if (insErr || !row) return res.status(500).json({ error: "Couldn’t send it. Please try again." });

  let sentEmails = 0;
  if (emails.length) {
    const { data: owner } = ev.owner_id ? await supabaseAdmin.from("profiles").select("email").eq("id", ev.owner_id).maybeSingle() : { data: null };
    for (let i = 0; i < emails.length; i += 5) {
      const results = await Promise.allSettled(
        emails.slice(i, i + 5).map((p, j) => {
          const mail = guestMessage({ content, presentation: site?.published_presentation, eventName: ev.name, slug: site?.slug ?? "", guestName: p.name, message, invited: audience === "waiting", published: !!site?.published_at });
          return sendMail({ from: hostSender(content), ...(owner?.email ? { replyTo: owner.email as string } : {}), to: p.email!, subject: mail.subject, html: mail.html }, `broadcast-${row.id}-${i + j}`);
        }),
      );
      const ok = results.filter((r) => r.status === "fulfilled").length;
      sentEmails += ok;
      if (ok)
        await supabaseAdmin.from("message_log").insert(
          emails
            .slice(i, i + 5)
            .filter((_, j) => results[j].status === "fulfilled")
            .map((p) => ({ event_id: ev.id, channel: "email", kind: "broadcast", broadcast_id: row.id, to_address: p.email!, status: "sent" })),
        );
    }
  }
  const sms = texts.length ? await sendTexts(supabaseAdmin, { eventId: ev.id, kind: "broadcast", message: smsBody, recipients: texts.map((p) => ({ to: p.phone! })), broadcastId: row.id }) : null;
  await supabaseAdmin.from("guest_broadcasts").update({ emails: sentEmails, texts: sms?.texts ?? 0 }).eq("id", row.id);
  return res.status(200).json({ emails: sentEmails, texts: sms?.texts ?? 0, textStatus: sms?.status ?? null });
}
