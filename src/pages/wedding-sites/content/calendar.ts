import { occasionWords } from "./occasion";
import { parseEventDate } from "./parseEventDate";
import type { EventContent } from "./types";

/**
 * Google Calendar "add event" link. All-day when there's no start time; with a
 * start time, a 4-hour event in Manila time (ctz), so guests abroad see it right.
 */
export function calendarUrl(content: EventContent): string | null {
  if (!content.eventDate) return null;
  const d = parseEventDate(content.eventDate);
  if (Number.isNaN(d.getTime())) return null;
  const pad = (n: number) => String(n).padStart(2, "0");
  const ymd = (x: Date) => `${x.getFullYear()}${pad(x.getMonth() + 1)}${pad(x.getDate())}`;
  const hm = (x: Date) => `T${pad(x.getHours())}${pad(x.getMinutes())}00`;
  const hasTime = content.eventDate.includes("T");
  const end = new Date(d);
  if (hasTime) end.setHours(d.getHours() + 4);
  else end.setDate(d.getDate() + 1);
  const names = content.hosts.map((h) => h.name).filter(Boolean).join(" & ");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: names ? `${names} — ${occasionWords(content).invitation.replace(/ Invitation$/, "")}` : "Celebration",
    dates: hasTime ? `${ymd(d)}${hm(d)}/${ymd(end)}${hm(end)}` : `${ymd(d)}/${ymd(end)}`,
    location: [content.primaryLocation.name, content.primaryLocation.addressLine].filter(Boolean).join(", "),
    ...(hasTime ? { ctz: "Asia/Manila" } : {}),
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
