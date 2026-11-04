import type { SupabaseClient } from "@supabase/supabase-js";
import { leadFollowup } from "./enquiry-mail.js";
import { manilaDay, nextFollowup, type PlanSent } from "./lead-followup-plan.js";
import { FROM, leadReplyAddress, leadToken, STUDIO_INBOX } from "./support-mail.js";

// The daily lead follow-ups (supabase/lead-followups.sql; when each is due: lead-followup-plan.ts).
// For leads who haven't answered our reply: sent from hello@ as a reply in that thread, their reply
// address on it (so an answer stops the rest), a copy to hello@ like our own replies. Each step is
// claimed in enquiry_followups BEFORE sending (never twice) and released if the send fails, so it's
// retried tomorrow. Stops near the time limit; anything left waits for tomorrow's run.

type SendMail = (payload: Parameters<typeof import("./email.js").sendChecked>[1], idempotencyKey?: string) => Promise<unknown>;
type Reply = { created_at: string; tracked: boolean; subject: string; body: string; sender_name: string | null };
type Row = {
  id: string; form: string; name: string | null; email: string | null; status: string; values: Record<string, string | string[]>;
  reply_key: string; replies_tracked: boolean; replied_at: string | null; followups_stopped: string | null;
  enquiry_replies: Reply[]; enquiry_followups: PlanSent[];
};

const MAX_PER_RUN = 40;

export async function sendLeadFollowups(db: SupabaseClient, sendMail: SendMail, site: string, opts: { deadline: number }) {
  const report = { sent: 0, skipped: 0, errors: [] as string[] };
  const since = new Date(Date.now() - 120 * 86_400_000).toISOString();
  const { data, error } = await db
    .from("enquiries")
    .select("id, form, name, email, status, values, reply_key, replies_tracked, replied_at, followups_stopped, enquiry_replies(created_at, tracked, subject, body, sender_name), enquiry_followups(step, sent_at)")
    .in("form", ["project-inquiry", "faq-question"])
    .in("status", ["new", "contacted"])
    .is("followups_stopped", null)
    .eq("replies_tracked", true)
    .gte("created_at", since);
  if (error) {
    // lead-followups.sql not run yet: nothing to do, not an error worth alerting on.
    if (/replies_tracked|enquiry_followups|followups_stopped/.test(error.message)) return report;
    report.errors.push(`lead followups: ${error.message}`);
    return report;
  }
  const today = manilaDay(Date.now());
  for (const lead of (data ?? []) as Row[]) {
    if (Date.now() > opts.deadline || report.sent >= MAX_PER_RUN) break;
    const replies = [...(lead.enquiry_replies ?? [])].sort((a, b) => a.created_at.localeCompare(b.created_at));
    const next = nextFollowup(lead, replies, lead.enquiry_followups ?? [], today);
    if (next.state === "stopped" && next.reason === "finished") {
      await db.from("enquiries").update({ followups_stopped: "finished" }).eq("id", lead.id).is("followups_stopped", null);
      continue;
    }
    if (next.state !== "scheduled" || next.day > today || !lead.email) continue;

    // the thread: "Re: <the subject of our first reply>"; quoting and signing as our last reply
    const subject = `Re: ${replies[0].subject.replace(/^(re:\s*)+/i, "")}`.slice(0, 150);
    const last = replies.at(-1)!;
    const sender = last.sender_name && !/rsvp/i.test(last.sender_name) ? last.sender_name.trim().split(/\s+/)[0] : null;
    const claim = await db.from("enquiry_followups").insert({ enquiry_id: lead.id, step: next.step, subject });
    if (claim.error) {
      report.skipped++;
      continue;
    }
    const unsubscribeUrl = `${site}/api/notify?op=unsubscribe&t=${encodeURIComponent(leadToken(lead.id))}`;
    try {
      await sendMail(
        {
          from: FROM,
          to: lead.email,
          bcc: STUDIO_INBOX,
          replyTo: leadReplyAddress(lead.reply_key),
          subject,
          html: leadFollowup(next.step, lead, { body: last.body, sender, at: last.created_at }, unsubscribeUrl),
          headers: { "List-Unsubscribe": `<${unsubscribeUrl}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
        },
        `lead-followup-${lead.id}-${next.step}`,
      );
      report.sent++;
      if (next.last) await db.from("enquiries").update({ followups_stopped: "finished" }).eq("id", lead.id).is("followups_stopped", null);
    } catch (e) {
      await db.from("enquiry_followups").delete().eq("enquiry_id", lead.id).eq("step", next.step);
      report.errors.push(`lead followup ${lead.id} step ${next.step}: ${e instanceof Error ? e.message : e}`);
    }
  }
  return report;
}
