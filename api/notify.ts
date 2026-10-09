import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { sendChecked } from "./_lib/email.js";

// Email notifications for the client dashboard. Called fire-and-forget by
// the portal after a write; every kind re-checks who the caller is, so a
// client can't trigger studio emails or spoof another sender.

const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
// No key (local dev, preview builds): everything else still runs; emails are skipped.
const resendClient = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

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

const sendMail = (payload: Parameters<typeof sendChecked>[1]) =>
  resendClient ? sendChecked(resendClient, payload) : Promise.resolve(console.warn(`RESEND_API_KEY not set — skipped email "${payload.subject}" to ${payload.to}`));

const SERVICE_FOOTER = "You’re receiving this because you contacted The RSVP Studio support. Reply in your dashboard or to this email.";

function layout(heading: string, body: string, cta: { label: string; url: string }, footer = "You’re receiving this because of your notification settings. Change them anytime under Account → Notifications.") {
  return `<!doctype html><html><head><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"></head>
<body style="margin:0;background:#f5f5f2;" bgcolor="#f5f5f2">
<table width="100%" cellpadding="0" cellspacing="0" bgcolor="#f5f5f2" style="background:#f5f5f2;padding:32px 12px;"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" bgcolor="#ffffff" style="max-width:540px;background:#ffffff;border-radius:20px;padding:36px 32px;font-family:Inter,Arial,sans-serif;color:#000727 !important;">
<tr><td style="font-family:Georgia,serif;font-size:13px;letter-spacing:.18em;text-transform:uppercase;color:#868697 !important;">The RSVP Studio</td></tr>
<tr><td style="padding-top:14px;font-family:Georgia,serif;font-size:26px;line-height:1.25;color:#000727 !important;">${heading}</td></tr>
<tr><td style="padding-top:14px;font-size:15px;line-height:1.6;color:#25265e !important;">${body}</td></tr>
<tr><td style="padding-top:26px;"><a href="${cta.url}" style="display:inline-block;background:#2f61d5;color:#ffffff !important;text-decoration:none;border-radius:999px;padding:13px 26px;font-size:14px;">${cta.label}</a></td></tr>
<tr><td style="padding-top:30px;font-size:12px;color:#868697 !important;">${footer}</td></tr>
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

// ---------------------------------------------------------------------------
// Support requests (supabase/support-tickets.sql)

const SUPPORT_TOPIC: Record<string, string> = {
  website: "Website",
  invitations: "Invitations & RSVPs",
  stationery: "Printed stationery",
  billing: "Billing & payments",
  account: "Account & login",
  other: "Something else",
};
const code = (n: number) => `SUP-${n}`;
/** Thread every email about one request together in Gmail/Outlook. */
const threadHeaders = (n: number, auto = false): Record<string, string> => ({
  References: `<sup-${n}@thersvpstudio.com>`,
  "In-Reply-To": `<sup-${n}@thersvpstudio.com>`,
  ...(auto ? { "Auto-Submitted": "auto-replied", "X-Auto-Response-Suppress": "All" } : {}),
});

/** Outside Mon–Fri 9 AM–6 PM Manila: when we're next in, in words ("Monday at 9 AM"). */
function backAt(now = new Date()): string | null {
  const m = new Date(now.getTime() + 8 * 3_600_000); // Manila wall clock (UTC+8)
  const day = m.getUTCDay();
  const hour = m.getUTCHours();
  if (day >= 1 && day <= 5 && hour >= 9 && hour < 18) return null;
  let add = hour < 9 && day >= 1 && day <= 5 ? 0 : 1;
  while ([0, 6].includes((day + add) % 7)) add++;
  if (add === 0) return "at 9 AM";
  if (add === 1) return "tomorrow at 9 AM";
  return `${["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][(day + add) % 7]} at 9 AM`;
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
  const body = req.body as { kind: string; messageId?: string; eventId?: string; title?: string; detail?: string | null; invoiceId?: string; inviteId?: string; profileId?: string; threadId?: string };
  const sends: Promise<unknown>[] = [];

  try {
    if (body.kind === "message" && body.messageId) {
      const { data: msg } = await supabaseAdmin.from("messages").select("id, thread_id, sender_id, body, attachments, internal").eq("id", body.messageId).maybeSingle();
      if (!msg || msg.sender_id !== caller.id) return res.status(403).json({ error: "Not your message" });
      // Internal notes stay inside the team.
      if (msg.internal) return res.status(200).json({ sent: 0, failed: 0 });
      const { data: thread } = await supabaseAdmin
        .from("message_threads")
        .select("id, profile_id, event_id, kind, subject, ticket_number, category, urgent, auto_reply_at")
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
                subject: `[${code(n)}] New reply from The RSVP Studio`,
                headers: threadHeaders(n),
                html: layout(`${esc(caller.full_name || "The RSVP Studio")} replied`, `${snippet}<br><br><span style="color:#868697">Request ${code(n)} · ${esc(topic)}</span>`, { label: "Reply in your dashboard", url: link }, SERVICE_FOOTER),
              }),
            );
          }
        } else {
          // To the studio inbox…
          sends.push(
            sendMail({
              from: FROM,
              to: STUDIO_INBOX,
              replyTo: caller.email ?? undefined,
              subject: `[${code(n)}] ${thread.urgent ? "URGENT · " : ""}${topic} — ${caller.full_name || caller.email}`,
              headers: threadHeaders(n),
              html: layout(`${code(n)} · ${esc(topic)}`, snippet, { label: "Open in Studio Console", url: `${origin}/studio/support?thread=${thread.id}` }),
            }),
          );
          // …and an instant auto-response to the customer (one per 10 minutes at most).
          const { count } = await supabaseAdmin.from("messages").select("id", { count: "exact", head: true }).eq("thread_id", thread.id);
          const first = (count ?? 0) <= 1;
          const recent = thread.auto_reply_at && Date.now() - new Date(thread.auto_reply_at).getTime() < 10 * 60_000;
          if (caller.email && (first || !recent)) {
            const away = backAt();
            const when = away ? `We’re away right now and will be back ${away} (Philippine time).` : "We reply within 1 business day — Monday to Friday, 9 AM–6 PM Philippine time.";
            const hi = `Hi ${esc((caller.full_name || "").split(" ")[0] || "there")},`;
            sends.push(
              sendMail({
                from: FROM,
                to: caller.email,
                subject: first ? `We’ve received your request [${code(n)}]` : `We got your message [${code(n)}]`,
                headers: threadHeaders(n, true),
                html: first
                  ? layout(
                      "We’ve received your request",
                      `${hi}<br><br>Thanks for getting in touch. Your request number is <strong>${code(n)}</strong> (${esc(topic)}). ${when}<br><br><span style="color:#868697">Your message:</span><br>${snippet}<br><br>Is your event in the next 7 days? Message us on Instagram <strong>@rsvpstudioo</strong> as well and we’ll prioritise it.`,
                      { label: "View your request", url: link },
                      SERVICE_FOOTER,
                    )
                  : layout("We got your message", `${hi}<br><br>It’s been added to request <strong>${code(n)}</strong>. ${when}`, { label: "View your request", url: link }, SERVICE_FOOTER),
              }),
            );
            await supabaseAdmin.from("message_threads").update({ auto_reply_at: new Date().toISOString() }).eq("id", thread.id);
          }
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
      const { data: thread } = await supabaseAdmin.from("message_threads").select("id, profile_id, ticket_number, category, status").eq("id", body.threadId).maybeSingle();
      if (!thread?.ticket_number || thread.status !== "resolved") return res.status(404).json({ error: "Not a resolved request" });
      const { data: customer } = await supabaseAdmin.from("profiles").select("email, full_name").eq("id", thread.profile_id).maybeSingle();
      if (customer?.email) {
        const n = thread.ticket_number as number;
        sends.push(
          sendMail({
            from: FROM,
            to: customer.email,
            subject: `[${code(n)}] Your request has been resolved`,
            headers: threadHeaders(n),
            html: layout(
              "Your request has been resolved",
              `Hi ${esc((customer.full_name || "").split(" ")[0] || "there")},<br><br>We’ve marked request <strong>${code(n)}</strong> (${esc(SUPPORT_TOPIC[thread.category ?? "other"] ?? "Support")}) as resolved. If anything still isn’t right, just reply within 7 days and it reopens.`,
              { label: "View your request", url: `${origin}/account/messages?thread=${thread.id}` },
              SERVICE_FOOTER,
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
    } else if ((body.kind === "invoice" || body.kind === "payment") && body.invoiceId && caller.is_staff) {
      const { data: inv } = await supabaseAdmin.from("invoices").select("id, number, event_id, description, amount, due_date, status").eq("id", body.invoiceId).maybeSingle();
      if (!inv) return res.status(404).json({ error: "Invoice not found" });
      const to = await recipientsFor(inv.event_id, null, "notify_billing_updates");
      const paid = body.kind === "payment";
      for (const r of to) {
        sends.push(
          sendMail({
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
