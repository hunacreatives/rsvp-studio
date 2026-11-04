// When a lead's next follow-up is due, shared by the daily sender (lead-followups.ts) and Studio → Leads
// (which shows "Follow-up 2 of 4 on Nov 11"), so the two always agree. Pure: runs in the browser too.
//
// Follow-ups start only after our first reply, and only while the lead hasn't answered:
//   project inquiry  3, 7, 14 and 24 days after our first reply (a check-in, ideas and their timeline,
//                    the do-it-yourself way in, a last note)
//                    an event under 5 weeks away: 2, 4 and 7 days (check-in, timeline, last note)
//   FAQ question     one, 5 days after our answer
// Never within 3 days of an email we wrote ourselves (2 on the quick schedule), never 2 days running, and none in the last week
// before their event. Days are Manila calendar days (the job runs at 9 AM Manila).

export type PlanLead = {
  form: string;
  status: string;
  values: Record<string, unknown> | null;
  replies_tracked?: boolean | null;
  replied_at?: string | null;
  followups_stopped?: string | null;
};
export type PlanReply = { created_at: string; tracked?: boolean | null };
export type PlanSent = { step: number; sent_at: string };
export type PlanStep = { step: 1 | 2 | 3 | 4; after: number };

export type NextFollowup =
  | { state: "off" } // not a lead we follow up (partner, or its emails didn't use the reply address)
  | { state: "waiting" } // our first reply hasn't gone out yet
  | { state: "stopped"; reason: "replied" | "unsubscribed" | "stopped" | "finished" | "project" | "archived" | "event" }
  | { state: "scheduled"; step: PlanStep["step"]; nth: number; total: number; day: number; last: boolean };

const DAY = 86_400_000;
/** A Manila calendar day, as a whole number (for comparing and adding days). */
export const manilaDay = (t: string | number | Date) => Math.floor((new Date(t).getTime() + 8 * 3_600_000) / DAY);
/** The noon of a Manila day, as a Date (for showing it). */
export const dayDate = (day: number) => new Date(day * DAY + 4 * 3_600_000);

export function eventDay(values: PlanLead["values"]): number | null {
  const s = String(values?.event_date ?? "");
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? manilaDay(`${s}T12:00:00+08:00`) : null;
}

export function followupPlan(lead: PlanLead, firstReplyAt: string): PlanStep[] {
  if (lead.form === "faq-question") return [{ step: 1, after: 5 }];
  if (lead.form !== "project-inquiry") return [];
  const ev = eventDay(lead.values);
  const soon = ev !== null && ev - manilaDay(firstReplyAt) < 35;
  return soon
    ? [{ step: 1, after: 2 }, { step: 2, after: 4 }, { step: 4, after: 7 }]
    : [{ step: 1, after: 3 }, { step: 2, after: 7 }, { step: 3, after: 14 }, { step: 4, after: 24 }];
}

export function nextFollowup(lead: PlanLead, replies: PlanReply[], sent: PlanSent[], today = manilaDay(Date.now())): NextFollowup {
  if (lead.form !== "project-inquiry" && lead.form !== "faq-question") return { state: "off" };
  if (lead.followups_stopped) return { state: "stopped", reason: lead.followups_stopped as "replied" };
  if (lead.status === "converted") return { state: "stopped", reason: "project" };
  if (lead.status !== "new" && lead.status !== "contacted") return { state: "stopped", reason: "archived" };
  const ours = [...replies].sort((a, b) => a.created_at.localeCompare(b.created_at));
  if (!ours.length) return { state: "waiting" };
  // only leads whose every email carried their reply address: otherwise an answer could have gone unseen
  if (!lead.replies_tracked || ours.some((r) => !r.tracked)) return { state: "off" };
  if (lead.replied_at && lead.replied_at > ours[0].created_at) return { state: "stopped", reason: "replied" };

  const plan = followupPlan(lead, ours[0].created_at);
  const done = new Set(sent.map((s) => s.step));
  const left = plan.filter((p) => !done.has(p.step));
  if (!left.length) return { state: "stopped", reason: "finished" };
  const next = left[0];
  const first = manilaDay(ours[0].created_at), lastOurs = manilaDay(ours.at(-1)!.created_at);
  const lastSent = sent.length ? Math.max(...sent.map((s) => manilaDay(s.sent_at))) : -Infinity;
  const quiet = plan[0].after < 3 ? 2 : 3; // days after an email we wrote (2 on the quick schedule)
  const day = Math.max(first + next.after, lastOurs + quiet, lastSent + 2, today);
  const ev = eventDay(lead.values);
  if (ev !== null && day > ev - 7) return { state: "stopped", reason: "event" };
  return { state: "scheduled", step: next.step, nth: plan.length - left.length + 1, total: plan.length, day, last: left.length === 1 };
}
