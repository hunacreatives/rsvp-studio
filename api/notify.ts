import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { esc, isEmail } from "./_lib/email.js";
import { customerReplyTo, reqCode, FROM, layout, makeSendMail, ratingButtons, serviceFooter, STUDIO_INBOX, SUPPORT_TOPIC, threadHeaders } from "./_lib/support-mail.js";
import { customerMessageEmails } from "./_lib/support-notify.js";
import { sendInvoiceEmail } from "./_lib/billing-mail.js";

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const token = (req.headers.authorization ?? "").replace(/^Bearer\s+/i, "");
  const { data: auth } = await supabaseAdmin.auth.getUser(token);
  if (!auth?.user) return res.status(401).json({ error: "Not signed in" });
  const { data: caller } = await supabaseAdmin.from("profiles").select(PERSON_COLS).eq("id", auth.user.id).maybeSingle();
  if (!caller) return res.status(401).json({ error: "No profile" });

  const origin = `https://${req.headers["x-forwarded-host"] ?? req.headers.host}`;
  const body = req.body as { kind: string; note?: string | null; code?: string; email?: string; messageId?: string; eventId?: string; title?: string; detail?: string | null; invoiceId?: string; inviteId?: string; profileId?: string; threadId?: string };
  const sends: Promise<unknown>[] = [];

  try {
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
                html: layout(`${esc(caller.full_name || "The RSVP Studio")} replied`, `${snippet}<br><br><span style="color:#868697">${reqCode(n)} · ${esc(topic)}</span>`, { label: "Reply in your dashboard", url: link }, serviceFooter()),
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
              html: layout(`${esc(caller.full_name || "The RSVP Studio")} sent you a message`, snippet, { label: "Reply in your dashboard", url: `${origin}/account/messages?thread=${thread.id}` }),
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
            html: layout(esc(thread.subject), snippet, { label: "Open in Studio Console", url: `${origin}/studio/inbox?thread=${thread.id}` }),
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
            subject: `${ev?.name ?? "Your project"}: ${body.title ?? "New update"}`,
            html: layout(esc(body.title ?? "Project update"), body.detail ? esc(body.detail) : `There’s a new update on <strong>${esc(ev?.name ?? "your project")}</strong>.`, {
              label: "View project",
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
      const { data: invite } = await supabaseAdmin.from("invite_codes").select("code, used_at").eq("event_id", body.eventId).eq("code", body.code).maybeSingle();
      if (!invite || invite.used_at) return res.status(404).json({ error: "That code has already been used — generate a new one." });
      const { data: ev } = await supabaseAdmin.from("events").select("name").eq("id", body.eventId).maybeSingle();
      const signUp = `${origin}/?auth=signup&email=${encodeURIComponent(to)}`;
      sends.push(
        sendMail({
          from: FROM,
          to,
          subject: `Your event dashboard is ready — ${ev?.name ?? "The RSVP Studio"}`,
          html: layout(
            "See your event in one place",
            `We’ve set up <strong>${esc(ev?.name ?? "your event")}</strong> in your RSVP Studio dashboard — progress, designs, invoices and messages, all together.<br><br>
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
            ),
          }),
        );
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
    return res.status(500).json({ error: "Notification failed" });
  }
}
