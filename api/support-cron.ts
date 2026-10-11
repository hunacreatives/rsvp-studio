import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { esc } from "./_lib/email.js";
import { processInbound } from "./_lib/support-inbound.js";
import { sendRsvpDigests } from "./_lib/rsvp-digest.js";
import { code, customerReplyTo, reqCode, emailRepliesOn, firstName, FROM, isManilaWeekday, layout, makeSendMail, replyDueAt, serviceFooter, STUDIO_INBOX, threadHeaders, topicOf } from "./_lib/support-mail.js";

// The daily support job — Vercel Cron, ~9 AM Manila (vercel.json: "0 1 * * *" UTC).
//   1. "Still need help?" reminder: waiting on the customer 3 days (1 day if urgent).
//   2. Auto-close: waiting 7 days, reminded ≥ 2 days ago, not urgent, not on hold,
//      and never within 14 days of the customer's event.
//   3. Weekday staff digest: urgent requests, replies past the 1-business-day promise.
//   4. RSVP summary for free sites: one email to the hosts with yesterday's replies
//      (Premium sites get an email per RSVP instead — see api/wedding-rsvp.ts).
//   5. Heartbeat, shown in the Studio, so a job that stops running gets noticed.
// The database claims each reminder / close in one UPDATE, and Resend drops repeat
// sends with the same idempotency key — a double run can't double-email.

const supabaseAdmin = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const resendClient = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const sendMail = makeSendMail(resendClient);
const SITE = "https://thersvpstudio.com";

type Thread = {
  id: string;
  profile_id: string;
  event_id: string | null;
  ticket_number: number;
  category: string | null;
  status: string;
  urgent: boolean;
  waiting_since: string | null;
  last_customer_at: string | null;
  last_message_at: string;
  hold_until: string | null;
  reply_key?: string | null;
};

const fmtDay = (d: Date) => d.toLocaleDateString("en-PH", { weekday: "long", month: "long", day: "numeric", timeZone: "Asia/Manila" });

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Vercel sends "Authorization: Bearer <CRON_SECRET>" when the CRON_SECRET env var is set.
  const secret = process.env.CRON_SECRET;
  if (!secret) return res.status(500).json({ error: "CRON_SECRET is not set" });
  if (req.headers.authorization !== `Bearer ${secret}`) return res.status(401).json({ error: "Unauthorized" });

  const report = { inboundCaughtUp: 0, reminders: 0, remindersSkipped: 0, closed: 0, closedQuietly: 0, digest: false, rsvpDigests: 0, rsvpDigestsSkipped: 0, errors: [] as string[] };
  const today = new Date();
  const dayKey = today.toISOString().slice(0, 10);
  const { data: hol } = await supabaseAdmin.from("support_holidays").select("day").gte("day", new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10));
  const holidays = new Set((hol ?? []).map((h) => h.day as string));

  const people = async (ids: string[]) => {
    if (!ids.length) return new Map<string, { email: string | null; full_name: string | null; notify_project_updates: boolean }>();
    const { data } = await supabaseAdmin.from("profiles").select("id, email, full_name, notify_project_updates").in("id", ids);
    return new Map((data ?? []).map((p) => [p.id as string, p as { email: string | null; full_name: string | null; notify_project_updates: boolean }]));
  };

  // 0. Email replies: anything the webhook missed in the last 3 days (when switched on).
  if (emailRepliesOn() && resendClient) {
    try {
      const since = Date.now() - 3 * 86_400_000;
      const { data: list, error } = await resendClient.emails.receiving.list({ limit: 100 });
      if (error) throw new Error(error.message);
      const recent = (list?.data ?? []).filter((e) => Date.parse(e.created_at) > since);
      const { data: seen } = recent.length
        ? await supabaseAdmin.from("support_inbound_emails").select("email_id, outcome").in("email_id", recent.map((e) => e.id))
        : { data: [] };
      const done = new Map((seen ?? []).map((r) => [r.email_id as string, r.outcome as string]));
      for (const e of recent) {
        if (done.has(e.id) && done.get(e.id) !== "error") continue;
        try {
          await processInbound(e.id, { db: supabaseAdmin, receiving: resendClient.emails.receiving, sendMail, origin: SITE });
          report.inboundCaughtUp++;
        } catch (err) {
          report.errors.push(`email ${e.id}: ${err instanceof Error ? err.message : err}`);
        }
      }
    } catch (e) {
      report.errors.push(`email catch-up: ${e instanceof Error ? e.message : e}`);
    }
  }

  // 1. Reminders
  const { data: due, error: e1 } = await supabaseAdmin.rpc("support_claim_reminders");
  if (e1) report.errors.push(`reminders: ${e1.message}`);
  const reminders = (due ?? []) as Thread[];
  const remindTo = await people(reminders.map((t) => t.profile_id));
  // Requests that won't auto-close (urgent, or the event is within 14 days) get no "we'll close it" line.
  const eventIds = [...new Set(reminders.map((t) => t.event_id).filter(Boolean))] as string[];
  const { data: evs } = eventIds.length ? await supabaseAdmin.from("events").select("id, event_date").in("id", eventIds) : { data: [] };
  const soon = new Set(
    (evs ?? [])
      .filter((e) => e.event_date && Date.parse(e.event_date) - Date.now() > -86_400_000 && Date.parse(e.event_date) - Date.now() < 15 * 86_400_000)
      .map((e) => e.id as string),
  );
  for (const t of reminders) {
    const p = remindTo.get(t.profile_id);
    // Service emails about the customer's own request: sent whatever their notification
    // settings (like staff replies). Only a missing address skips it.
    if (!p?.email) {
      report.remindersSkipped++;
      continue;
    }
    // Closes on the first daily run that's both 7 days waiting and 2 days after this reminder.
    const closesOn = new Date(Math.max(Date.now() + 2 * 86_400_000, Date.parse(t.waiting_since ?? "") + 7 * 86_400_000 || 0) + 86_400_000);
    const willClose = !t.urgent && !(t.event_id && soon.has(t.event_id));
    try {
      await sendMail(
        {
          from: FROM,
          to: p.email,
          subject: `[${reqCode(t.ticket_number)}] Still need help?`,
          replyTo: customerReplyTo(t),
          headers: threadHeaders(t.ticket_number, true, t.reply_key),
          html: layout(
            "Still need help?",
            `Hi ${firstName(p.full_name)},<br><br>We replied to your ${esc(topicOf(t.category))} request (<strong>${reqCode(t.ticket_number)}</strong>) and haven’t heard back. If you still need anything, just reply in your dashboard — we’re here.<br><br>No action needed if you’re all set.${
              willClose ? ` If we don’t hear from you, we’ll close it around ${fmtDay(closesOn)}; after that you can always start a new request.` : ""
            }`,
            { label: "View your request", url: `${SITE}/account/messages?thread=${t.id}` },
            serviceFooter(),
          ),
        },
        `support-reminder-${t.id}-${t.waiting_since ?? ""}`,
      );
      report.reminders++;
    } catch (e) {
      report.errors.push(`reminder ${code(t.ticket_number)}: ${e instanceof Error ? e.message : e}`);
      await supabaseAdmin.rpc("support_release_reminder", { p_thread: t.id }); // try again tomorrow
    }
  }

  // 2. Auto-close
  const { data: closing, error: e2 } = await supabaseAdmin.rpc("support_claim_autoclose");
  if (e2) report.errors.push(`auto-close: ${e2.message}`);
  const closed = (closing ?? []) as Thread[];
  const closeTo = await people(closed.map((t) => t.profile_id));
  for (const t of closed) {
    const p = closeTo.get(t.profile_id);
    if (!p?.email) {
      report.closedQuietly++;
      continue;
    }
    try {
      await sendMail(
        {
          from: FROM,
          to: p.email,
          subject: `[${reqCode(t.ticket_number)}] We’ve closed your request`,
          replyTo: customerReplyTo(t),
          headers: threadHeaders(t.ticket_number, true, t.reply_key),
          html: layout(
            "We’ve closed your request",
            `Hi ${firstName(p.full_name)},<br><br>We didn’t hear back about <strong>${reqCode(t.ticket_number)}</strong> (${esc(topicOf(t.category))}), so we’ve closed it. If it still needs attention, reply within 7 days and it reopens — or start a new request any time.`,
            { label: "View your request", url: `${SITE}/account/messages?thread=${t.id}` },
            serviceFooter(),
          ),
        },
        `support-autoclose-${t.id}`,
      );
      report.closed++;
    } catch (e) {
      report.errors.push(`close ${code(t.ticket_number)}: ${e instanceof Error ? e.message : e}`);
    }
  }

  // 3. Staff digest (Manila weekdays that aren't holidays)
  if (isManilaWeekday(today, holidays)) {
    const { data: open } = await supabaseAdmin
      .from("message_threads")
      .select("id, profile_id, ticket_number, category, status, urgent, last_customer_at, last_message_at, hold_until, waiting_since, event_id")
      .eq("kind", "support")
      .neq("status", "resolved");
    const list = (open ?? []) as Thread[];
    const late = list.filter((t) => t.status === "needs_reply" && replyDueAt(t.last_customer_at ?? t.last_message_at, holidays).getTime() < Date.now());
    const urgent = list.filter((t) => t.urgent && !late.includes(t));
    const holdsEnded = list.filter((t) => t.hold_until && t.hold_until <= dayKey);
    if (late.length || urgent.length || closed.length || holdsEnded.length) {
      const who = await people([...new Set(list.map((t) => t.profile_id))]);
      const row = (t: Thread, note = "") =>
        `<li><a href="${SITE}/studio/support?thread=${t.id}">${code(t.ticket_number)}</a> · ${esc(topicOf(t.category))} · ${esc(who.get(t.profile_id)?.full_name || who.get(t.profile_id)?.email || "Customer")}${note}</li>`;
      const section = (title: string, items: string[]) => (items.length ? `<p style="margin:18px 0 6px"><strong>${title}</strong></p><ul style="margin:0;padding-left:18px">${items.join("")}</ul>` : "");
      const parts = [
        section(`Past the 1-business-day promise (${late.length})`, late.map((t) => row(t))),
        section(`Urgent — event within 7 days (${urgent.length})`, urgent.map((t) => row(t, ` · ${t.status === "waiting" ? "waiting on customer" : "needs reply"}`))),
        section(`Hold date reached (${holdsEnded.length})`, holdsEnded.map((t) => row(t, ` · held until ${t.hold_until}`))),
        section(`Auto-closed today (${closed.length})`, closed.map((t) => row(t))),
      ].join("");
      try {
        await sendMail(
          {
            from: FROM,
            to: STUDIO_INBOX,
            subject: `Support today: ${late.length} overdue · ${urgent.length} urgent`,
            html: layout("Support today", parts, { label: "Open Support", url: `${SITE}/studio/support` }, "The daily support digest from the Studio Console."),
          },
          `support-digest-${dayKey}`,
        );
        report.digest = true;
      } catch (e) {
        report.errors.push(`digest: ${e instanceof Error ? e.message : e}`);
      }
    }
  }

  // 4. RSVP summaries (free sites)
  const rsvp = await sendRsvpDigests(supabaseAdmin, sendMail, SITE, dayKey);
  report.rsvpDigests = rsvp.sent;
  report.rsvpDigestsSkipped = rsvp.skipped;
  report.errors.push(...rsvp.errors);

  // 5. Heartbeat
  await supabaseAdmin.from("support_job_runs").upsert({ job: "support-daily", last_run_at: new Date().toISOString(), details: report });
  return res.status(report.errors.length ? 207 : 200).json(report);
}
