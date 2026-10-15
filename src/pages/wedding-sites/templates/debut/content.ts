import type { EventContent } from "../../content/types";
import { parseEventDate } from "../../content/parseEventDate";
import { customValue } from "../../content/custom";

/** The celebrant's full name(s): "Sofia Isabel Reyes", or "Ana and Bea Cruz" style for two. */
export function celebrant(content: EventContent): string {
  const names = content.hosts.map((h) => h.name.trim()).filter(Boolean);
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/** First name(s), for "A note from Sofia". */
export function firstNames(content: EventContent): string {
  const f = content.hosts.map((h) => h.name.trim().split(/\s+/)[0]).filter(Boolean);
  return f.length <= 1 ? f[0] ?? "" : `${f.slice(0, -1).join(", ")} & ${f[f.length - 1]}`;
}

const ordinal = (n: number) => {
  if (n % 100 >= 11 && n % 100 <= 13) return `${n}th`;
  return `${n}${n % 10 === 1 ? "st" : n % 10 === 2 ? "nd" : n % 10 === 3 ? "rd" : "th"}`;
};

const clock = (d: Date) => d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

/** "21st November 2030, Saturday" (the card's date style). */
export function dateLine(iso: string): string | null {
  if (!iso) return null;
  const d = parseEventDate(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `${ordinal(d.getDate())} ${d.toLocaleDateString("en-US", { month: "long" })} ${d.getFullYear()}, ${d.toLocaleDateString("en-US", { weekday: "long" })}`;
}

/** "6:00 PM to 11:00 PM": the start time, to the program's last end time when there is one. */
export function timeLine(content: EventContent): string | null {
  const iso = content.eventDate;
  if (!iso || !iso.includes("T")) return null;
  const d = parseEventDate(iso);
  if (Number.isNaN(d.getTime()) || (d.getHours() === 0 && d.getMinutes() === 0)) return null;
  const ends = content.schedule.map((s) => s.endTime).filter((e): e is string => !!e).sort();
  const end = ends.length ? parseEventDate(ends[ends.length - 1]) : null;
  return end && !Number.isNaN(end.getTime()) && end > d ? `${clock(d)} to ${clock(end)}` : clock(d);
}

/** "6:00 PM" for the program. */
export function timeOf(iso: string): string {
  const d = parseEventDate(iso);
  return Number.isNaN(d.getTime()) ? "" : clock(d);
}

/** The big spaced line on the card: the host's own, or "18th Birthday" for a birthday. */
export function bigLine(content: EventContent): string {
  const own = customValue(content, "headline");
  if (own) return own;
  switch (content.occasion) {
    case "wedding":
      return "Wedding";
    case "anniversary":
      return "Anniversary";
    case "birthday":
      return "18th Birthday";
    default:
      return "Celebration";
  }
}

/** True from the day after the event (Philippine time). */
export function eventIsOver(iso: string): boolean {
  const day = (iso ?? "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  const today = new Date(Date.now() + 8 * 3_600_000).toISOString().slice(0, 10);
  return today > day;
}
