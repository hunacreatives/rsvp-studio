import type { EventContent } from "./types";

// "Please reply by": content.rsvpDeadline (YYYY-MM-DD, set under Date & Venue).
// The form closes the day after, Manila time. api/wedding-rsvp.ts checks the same rule.

export const manilaToday = () => new Date(Date.now() + 8 * 3_600_000).toISOString().slice(0, 10);

const longDay = (iso: string) =>
  new Date(`${iso}T12:00:00+08:00`).toLocaleDateString("en-PH", { weekday: "long", month: "long", day: "numeric", timeZone: "Asia/Manila" });

export function rsvpWindow(content: EventContent) {
  const d = content.rsvpDeadline;
  if (!d) return { closed: false, replyBy: null as string | null, closedText: null as string | null };
  const closed = d < manilaToday();
  return {
    closed,
    replyBy: `Please reply by ${longDay(d)}.`,
    closedText: `RSVPs closed on ${longDay(d)}. If you still need to reply, please contact the hosts.`,
  };
}
