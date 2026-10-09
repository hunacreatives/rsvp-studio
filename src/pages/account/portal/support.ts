import type { SupportCategory, Thread } from "./types";

// Support requests: topics, numbers, statuses and the reply deadline.
// The database fills these in and moves the status (supabase/support-tickets.sql).

export const SUPPORT_CATEGORIES: { id: SupportCategory; label: string; help?: string }[] = [
  { id: "website", label: "Website", help: "website" },
  { id: "invitations", label: "Invitations & RSVPs", help: "invitations" },
  { id: "stationery", label: "Printed stationery", help: "stationery" },
  { id: "billing", label: "Billing & payments", help: "billing" },
  { id: "account", label: "Account & login" },
  { id: "other", label: "Something else" },
];

export const categoryLabel = (c: SupportCategory | null | undefined) => SUPPORT_CATEGORIES.find((x) => x.id === c)?.label ?? "Support";

/** "SUP-1042" */
export const ticketCode = (n: number | null | undefined) => (n ? `SUP-${n}` : "");

/** Resolved more than 7 days ago: read-only, a new message starts a new request. */
export const isClosed = (t: Pick<Thread, "status" | "resolved_at">) =>
  t.status === "resolved" && !!t.resolved_at && Date.now() - new Date(t.resolved_at).getTime() > 7 * 86_400_000;

/** What customers see: three plain statuses (plus Closed once it's read-only). */
export function customerStatus(t: Pick<Thread, "status" | "resolved_at">): { label: string; tone: "open" | "you" | "done" } {
  if (t.status === "waiting") return { label: "Awaiting your reply", tone: "you" };
  if (t.status === "resolved") return { label: isClosed(t) ? "Closed" : "Solved", tone: "done" };
  return { label: "Open", tone: "open" };
}

/** What the studio sees. */
export const STAFF_STATUS: Record<string, string> = { needs_reply: "Needs reply", waiting: "Waiting on customer", resolved: "Resolved" };

export const STATUS_STYLE: Record<"open" | "you" | "done" | "late", { background: string; color: string }> = {
  open: { background: "#e8eeff", color: "#1d4fd7" },
  you: { background: "#fff1d6", color: "#8a5a00" },
  done: { background: "#e6f4e6", color: "#2f6b2f" },
  late: { background: "#fde4df", color: "#c2412d" },
};

// Reply promise: within 1 business day — Mon–Fri, 9 AM–6 PM Manila (UTC+8, no DST).
const OPEN = 9;
const CLOSE = 18;
const MANILA = 8 * 3_600_000;
const BUSINESS_DAY_MS = (CLOSE - OPEN) * 3_600_000;

/** The moment a reply is due: 9 working hours after the customer wrote, counting only office hours. */
export function replyDueAt(since: string | Date): Date {
  let left = BUSINESS_DAY_MS;
  // Work in Manila wall-clock time, as a UTC-based Date shifted by +8h.
  let t = new Date(new Date(since).getTime() + MANILA);
  for (let guard = 0; guard < 30 && left > 0; guard++) {
    const day = t.getUTCDay();
    const start = Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate(), OPEN);
    const end = Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate(), CLOSE);
    if (day === 0 || day === 6 || t.getTime() >= end) {
      t = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate() + 1, OPEN));
      continue;
    }
    const from = Math.max(t.getTime(), start);
    const take = Math.min(left, end - from);
    left -= take;
    t = new Date(from + take);
  }
  return new Date(t.getTime() - MANILA);
}

/** Needs a reply and the 1-business-day promise has passed. */
export const isOverdue = (t: Pick<Thread, "status" | "last_customer_at" | "last_message_at">, now = Date.now()) =>
  t.status === "needs_reply" && replyDueAt(t.last_customer_at ?? t.last_message_at).getTime() < now;

/** Parse "1042", "#1042", "SUP-1042", "sup 1042" → 1042. */
export function parseTicket(q: string): number | null {
  const m = q.trim().match(/^(?:sup[-\s]?|#)?(\d{3,7})$/i);
  return m ? Number(m[1]) : null;
}
