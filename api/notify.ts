import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { sendChecked } from "./_lib/email";

// Email notifications for the client dashboard. Called fire-and-forget by
// the portal after a write; every kind re-checks who the caller is, so a
// client can't trigger studio emails or spoof another sender.

const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const resend = new Resend(process.env.RESEND_API_KEY!);

const FROM = "The RSVP Studio <hello@thersvpstudio.com>";
const STUDIO_INBOX = "hello@thersvpstudio.com";

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

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function layout(heading: string, body: string, cta: { label: string; url: string }) {
  return `<!doctype html><html><head><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"></head>
<body style="margin:0;background:#f5f5f2;" bgcolor="#f5f5f2">
<table width="100%" cellpadding="0" cellspacing="0" bgcolor="#f5f5f2" style="background:#f5f5f2;padding:32px 12px;"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" bgcolor="#ffffff" style="max-width:540px;background:#ffffff;border-radius:20px;padding:36px 32px;font-family:Inter,Arial,sans-serif;color:#000727 !important;">
<tr><td style="font-family:Georgia,serif;font-size:13px;letter-spacing:.18em;text-transform:uppercase;color:#868697 !important;">The RSVP Studio</td></tr>
<tr><td style="padding-top:14px;font-family:Georgia,serif;font-size:26px;line-height:1.25;color:#000727 !important;">${heading}</td></tr>
<tr><td style="padding-top:14px;font-size:15px;line-height:1.6;color:#25265e !important;">${body}</td></tr>
<tr><td style="padding-top:26px;"><a href="${cta.url}" style="display:inline-block;background:#2f61d5;color:#ffffff !important;text-decoration:none;border-radius:999px;padding:13px 26px;font-size:14px;">${cta.label}</a></td></tr>
<tr><td style="padding-top:30px;font-size:12px;color:#868697 !important;">You’re receiving this because of your notification settings. Change them anytime under Account → Notifications.</td></tr>
</table></td></tr></table></body></html>`;
}

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

const peso = (n: number) => new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 2 }).format(n);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const token = (req.headers.authorization ?? "").replace(/^Bearer\s+/i, "");
  const { data: auth } = await supabaseAdmin.auth.getUser(token);
  if (!auth?.user) return res.status(401).json({ error: "Not signed in" });
  const { data: caller } = await supabaseAdmin.from("profiles").select(PERSON_COLS).eq("id", auth.user.id).maybeSingle();
  if (!caller) return res.status(401).json({ error: "No profile" });

  const origin = `https://${req.headers["x-forwarded-host"] ?? req.headers.host}`;
  const body = req.body as { kind: string; messageId?: string; eventId?: string; title?: string; detail?: string | null; invoiceId?: string };
  const sends: Promise<unknown>[] = [];

  try {
    if (body.kind === "message" && body.messageId) {
      const { data: msg } = await supabaseAdmin.from("messages").select("id, thread_id, sender_id, body, attachments").eq("id", body.messageId).maybeSingle();
      if (!msg || msg.sender_id !== caller.id) return res.status(403).json({ error: "Not your message" });
      const { data: thread } = await supabaseAdmin.from("message_threads").select("id, profile_id, event_id, kind, subject").eq("id", msg.thread_id).maybeSingle();
      if (!thread) return res.status(404).json({ error: "Thread not found" });
      const files = (msg.attachments as { name: string }[]).map((a) => a.name);
      const snippet = `${esc(msg.body).replace(/\n/g, "<br>")}${files.length ? `<br><br><em>Attached: ${esc(files.join(", "))}</em>` : ""}`;

      if (caller.is_staff) {
        const to = await recipientsFor(thread.event_id, thread.profile_id, "notify_project_updates");
        for (const r of to) {
          sends.push(
            sendChecked(resend, {
              from: FROM,
              to: r.email!,
              subject: `New message: ${thread.subject}`,
              html: layout(`${esc(caller.full_name || "The RSVP Studio")} sent you a message`, snippet, { label: "Reply in your dashboard", url: `${origin}/account/messages?thread=${thread.id}` }),
            }),
          );
        }
      } else {
        sends.push(
          sendChecked(resend, {
            from: FROM,
            to: STUDIO_INBOX,
            replyTo: caller.email ?? undefined,
            subject: `${thread.kind === "support" ? "🛟 Support" : "💬 Message"} from ${caller.full_name || caller.email}: ${thread.subject}`,
            html: layout(esc(thread.subject), snippet, { label: "Open in Studio Console", url: `${origin}/studio/inbox?thread=${thread.id}` }),
          }),
        );
      }
    } else if (body.kind === "project_update" && body.eventId && caller.is_staff) {
      const { data: ev } = await supabaseAdmin.from("events").select("name").eq("id", body.eventId).maybeSingle();
      const to = await recipientsFor(body.eventId, null, "notify_project_updates");
      for (const r of to) {
        sends.push(
          sendChecked(resend, {
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
    } else if ((body.kind === "invoice" || body.kind === "payment") && body.invoiceId && caller.is_staff) {
      const { data: inv } = await supabaseAdmin.from("invoices").select("id, number, event_id, description, amount, due_date, status").eq("id", body.invoiceId).maybeSingle();
      if (!inv) return res.status(404).json({ error: "Invoice not found" });
      const to = await recipientsFor(inv.event_id, null, "notify_billing_updates");
      const paid = body.kind === "payment";
      for (const r of to) {
        sends.push(
          sendChecked(resend, {
            from: FROM,
            to: r.billing_email || r.email!,
            subject: paid ? `Payment received — invoice #${inv.number}` : `New invoice #${inv.number} — ${peso(Number(inv.amount))}`,
            html: layout(
              paid ? "Thank you — payment received" : `Invoice #${esc(inv.number)}`,
              paid
                ? `We’ve received your payment of <strong>${peso(Number(inv.amount))}</strong> for ${esc(inv.description)}. Your receipt is ready in your dashboard.`
                : `${esc(inv.description)}<br><strong>${peso(Number(inv.amount))}</strong>${inv.due_date ? ` · due ${esc(inv.due_date)}` : ""}`,
              { label: paid ? "View receipt" : "View invoice", url: `${origin}/account/billing/${inv.id}` },
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
