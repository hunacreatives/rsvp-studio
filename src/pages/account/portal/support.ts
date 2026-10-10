import type { SupportCategory, SupportRating, Thread } from "./types";

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

/** "SUP-1042" — how the Studio refers to a request. */
export const ticketCode = (n: number | null | undefined) => (n ? `SUP-${n}` : "");
/** "Request #1042" — how customers see the same number. */
export const requestCode = (n: number | null | undefined) => (n ? `Request #${n}` : "");

/** Resolved more than 7 days ago: read-only, a new message starts a new request. */
export const isClosed = (t: Pick<Thread, "status" | "resolved_at">) =>
  t.status === "resolved" && !!t.resolved_at && Date.now() - new Date(t.resolved_at).getTime() > 7 * 86_400_000;

/** What customers see: three plain statuses (plus Closed once it's read-only). */
export function customerStatus(t: Pick<Thread, "status" | "resolved_at">): { label: string; tone: "open" | "you" | "done" } {
  if (t.status === "waiting") return { label: "We need your reply", tone: "you" };
  if (t.status === "resolved") return { label: "Done", tone: "done" };
  return { label: "We’re on it", tone: "open" };
}

/** What the studio sees. */
export const STAFF_STATUS: Record<string, string> = { needs_reply: "Needs reply", waiting: "Waiting on customer", resolved: "Resolved" };

export const STATUS_STYLE: Record<"open" | "you" | "done" | "late", { background: string; color: string }> = {
  open: { background: "#e8eeff", color: "#1d4fd7" },
  you: { background: "#fff1d6", color: "#8a5a00" },
  done: { background: "#e6f4e6", color: "#2f6b2f" },
  late: { background: "#fde4df", color: "#c2412d" },
};

// Reply promise: within 1 business day — Mon–Fri, 9 AM–6 PM Manila (UTC+8, no DST),
// skipping Philippine holidays (support_holidays, editable under Support → Report).
const OPEN = 9;
const CLOSE = 18;
const MANILA = 8 * 3_600_000;
export const BUSINESS_DAY_MS = (CLOSE - OPEN) * 3_600_000;

/** Holiday days ("YYYY-MM-DD"). Loaded once by the Studio; empty until then. */
export type Holidays = ReadonlySet<string>;
const NO_HOLIDAYS: Holidays = new Set();

/**
 * Walk Manila office hours from `since`: either until `budget` working ms are used up
 * (→ the moment reached), or until `until` (→ the working ms in between).
 * Keep in step with api/_lib/support-mail.ts (replyDueAt).
 */
function walk(since: Date, holidays: Holidays, budget: number, until = Infinity) {
  let left = budget;
  let used = 0;
  // Work in Manila wall-clock time, as a UTC-based Date shifted by +8h.
  let t = new Date(since.getTime() + MANILA);
  const stop = until + MANILA;
  for (let guard = 0; guard < 4000 && left > 0 && t.getTime() < stop; guard++) {
    const day = t.getUTCDay();
    const start = Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate(), OPEN);
    const end = Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate(), CLOSE);
    if (day === 0 || day === 6 || t.getTime() >= end || holidays.has(t.toISOString().slice(0, 10))) {
      t = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate() + 1, OPEN));
      continue;
    }
    const from = Math.max(t.getTime(), start);
    const take = Math.max(0, Math.min(left, end - from, stop - from));
    left -= take;
    used += take;
    t = new Date(from + take);
  }
  return { at: new Date(t.getTime() - MANILA), used };
}

/** The moment a reply is due: 9 working hours after the customer wrote, counting only office hours. */
export const replyDueAt = (since: string | Date, holidays: Holidays = NO_HOLIDAYS): Date => walk(new Date(since), holidays, BUSINESS_DAY_MS).at;

/** Office-hours time between two moments, in ms (for the Report's medians). */
export const businessMs = (from: string | Date, to: string | Date, holidays: Holidays = NO_HOLIDAYS) =>
  walk(new Date(from), holidays, Infinity, new Date(to).getTime()).used;

/** Needs a reply and the 1-business-day promise has passed. */
export const isOverdue = (t: Pick<Thread, "status" | "last_customer_at" | "last_message_at">, holidays: Holidays = NO_HOLIDAYS, now = Date.now()) =>
  t.status === "needs_reply" && replyDueAt(t.last_customer_at ?? t.last_message_at, holidays).getTime() < now;

/** On hold: no reminder or auto-close until after this day. */
export const onHold = (t: Pick<Thread, "status" | "hold_until">) =>
  t.status !== "resolved" && !!t.hold_until && t.hold_until >= new Date(Date.now() + MANILA).toISOString().slice(0, 10);

export const RATING_LABEL: Record<SupportRating, { emoji: string; label: string }> = {
  great: { emoji: "😊", label: "Great" },
  okay: { emoji: "😐", label: "Okay" },
  not_good: { emoji: "🙁", label: "Not good" },
};

/** Parse "1042", "#1042", "SUP-1042", "sup 1042", "Request #1042" → 1042. */
export function parseTicket(q: string): number | null {
  const m = q.trim().match(/^(?:sup[-\s]?|request\s*#?\s*|#)?(\d{3,7})$/i);
  return m ? Number(m[1]) : null;
}
