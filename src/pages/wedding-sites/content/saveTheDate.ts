import { parseEventDate } from "./parseEventDate";

// A studio Save the Date as a link (supabase/save-the-date.sql): wedding_sites.std holds it,
// and /invite/<slug> shows it while wedding_sites.std_live is on.

export type SaveTheDate = {
  /** The hosts, one per entry ("Destiny", "Austin"). */
  names: string[];
  occasion: "wedding" | "birthday" | "anniversary" | "other";
  /** "2027-06-14" or "2027-06-14T16:00". */
  eventDate: string;
  venue?: string;
  /** The card the studio designed (the same image as the JPEG they send). */
  image: { url: string; width: number; height: number };
  /** The animated version, when there is one. */
  video?: { url: string } | null;
  /** Show "Get the invitation when it's ready". */
  signup: boolean;
};

export function stdNames(std: Pick<SaveTheDate, "names">) {
  const n = std.names.map((x) => x.trim()).filter(Boolean);
  return n.length > 2 ? `${n.slice(0, -1).join(", ")} & ${n.at(-1)}` : n.join(" & ");
}

const OCCASION: Record<SaveTheDate["occasion"], string> = { wedding: "Wedding", birthday: "Birthday", anniversary: "Anniversary", other: "Celebration" };
export const stdOccasion = (std: Pick<SaveTheDate, "occasion">) => OCCASION[std.occasion] ?? "Celebration";

export function stdWhen(std: Pick<SaveTheDate, "eventDate">) {
  const d = parseEventDate(std.eventDate);
  if (Number.isNaN(d.getTime())) return null;
  const hasTime = std.eventDate.includes("T");
  return {
    date: d,
    hasTime,
    long: d.toLocaleDateString("en-PH", { weekday: "long", month: "long", day: "numeric", year: "numeric" }),
    time: hasTime ? d.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" }) : "",
  };
}

/** Whole days from today to the event (0 on the day; negative once it's past). */
export function stdDaysLeft(std: Pick<SaveTheDate, "eventDate">, now = new Date()) {
  const w = stdWhen(std);
  if (!w) return null;
  const a = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const b = new Date(w.date.getFullYear(), w.date.getMonth(), w.date.getDate());
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (x: Date) => `${x.getFullYear()}${pad(x.getMonth() + 1)}${pad(x.getDate())}`;
const hm = (x: Date) => `T${pad(x.getHours())}${pad(x.getMinutes())}00`;

function span(std: SaveTheDate) {
  const w = stdWhen(std);
  if (!w) return null;
  const end = new Date(w.date);
  if (w.hasTime) end.setHours(end.getHours() + 4);
  else end.setDate(end.getDate() + 1);
  return { start: w.date, end, hasTime: w.hasTime };
}

const title = (std: SaveTheDate) => `${stdNames(std) || "Our"} — ${stdOccasion(std)}`;

/** Google Calendar (as calendar.ts does for sites): Manila time when there's a start time. */
export function stdGoogleCalendar(std: SaveTheDate, link: string) {
  const s = span(std);
  if (!s) return null;
  const q = new URLSearchParams({
    action: "TEMPLATE",
    text: title(std),
    dates: s.hasTime ? `${ymd(s.start)}${hm(s.start)}/${ymd(s.end)}${hm(s.end)}` : `${ymd(s.start)}/${ymd(s.end)}`,
    details: `Save the date! Invitation to follow: ${link}`,
    location: std.venue ?? "",
    ...(s.hasTime ? { ctz: "Asia/Manila" } : {}),
  });
  return `https://calendar.google.com/calendar/render?${q}`;
}

/** An .ics file for Apple Calendar and Outlook. */
export function stdIcs(std: SaveTheDate, link: string) {
  const s = span(std);
  if (!s) return null;
  const esc = (t: string) => t.replace(/[\\,;]/g, (c) => `\\${c}`).replace(/\n/g, "\\n");
  const when = s.hasTime
    ? [`DTSTART;TZID=Asia/Manila:${ymd(s.start)}${hm(s.start)}`, `DTEND;TZID=Asia/Manila:${ymd(s.end)}${hm(s.end)}`]
    : [`DTSTART;VALUE=DATE:${ymd(s.start)}`, `DTEND;VALUE=DATE:${ymd(s.end)}`];
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//The RSVP Studio//Save the Date//EN",
    "BEGIN:VEVENT",
    `UID:${ymd(s.start)}-${encodeURIComponent(stdNames(std)).slice(0, 40)}@thersvpstudio.com`,
    `DTSTAMP:${stamp}`,
    ...when,
    `SUMMARY:${esc(title(std))}`,
    std.venue ? `LOCATION:${esc(std.venue)}` : "",
    `DESCRIPTION:${esc(`Save the date! Invitation to follow: ${link}`)}`,
    `URL:${link}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");
}
