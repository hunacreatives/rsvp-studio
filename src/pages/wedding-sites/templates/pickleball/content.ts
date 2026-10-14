import type { EventContent } from "../../content/types";
import { parseEventDate } from "../../content/parseEventDate";
import { customValue } from "../../content/custom";

/** "Rina" for one host, "Rina and Paolo" for two, "Rina, Paolo and Bea" for more. */
export function hostNames(content: EventContent): string {
  const names = content.hosts.map((h) => h.name.trim()).filter(Boolean);
  if (names.length <= 1) return names[0] ?? "";
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

export const isPlural = (content: EventContent) => content.hosts.filter((h) => h.name.trim()).length > 1;

/** The script headline as lines (Enter = new line). The theme's own line when empty. */
export function headlineLines(content: EventContent): string[] {
  const own = customValue(content, "headline").split("\n").map((l) => l.trim()).filter(Boolean);
  return own.length ? own : ["Dinks &", "Drinks"];
}

/**
 * The details page's big title, Claudy-style: "Rina’s 30th Birthday". The
 * host's own (insideTitle) wins; otherwise built from the first names and the
 * occasion, with the age taken from the line above the name ("…the 30th birthday of").
 */
export function insideTitle(content: EventContent): string {
  const own = customValue(content, "insideTitle");
  if (own) return own;
  const firsts = content.hosts.map((h) => h.name.trim().split(/\s+/)[0]).filter(Boolean);
  if (!firsts.length) return "";
  const who = firsts.length === 1 ? firsts[0] : `${firsts.slice(0, -1).join(", ")} & ${firsts[firsts.length - 1]}`;
  const age = /(\d+(?:st|nd|rd|th))\b/i.exec(customValue(content, "occasionLine"))?.[1];
  switch (content.occasion) {
    case "birthday":
      return `${who}’s ${age ? `${age} ` : ""}Birthday`;
    case "wedding":
      return `${who}’s Wedding`;
    case "anniversary":
      return `${who}’s ${age ? `${age} ` : ""}Anniversary`;
    default:
      return who;
  }
}

/** The small line above the name: "to celebrate the birthday of". */
export function occasionLine(content: EventContent): string {
  const own = customValue(content, "occasionLine");
  if (own) return own;
  switch (content.occasion) {
    case "wedding":
      return "to celebrate the wedding of";
    case "birthday":
      return "to celebrate the birthday of";
    case "anniversary":
      return "to celebrate the anniversary of";
    default:
      return "to celebrate with";
  }
}

const ordinal = (n: number) => {
  if (n % 100 >= 11 && n % 100 <= 13) return `${n}th`;
  return `${n}${n % 10 === 1 ? "st" : n % 10 === 2 ? "nd" : n % 10 === 3 ? "rd" : "th"}`;
};

/** "Saturday, March 14th at 3 pm" (or without the time). */
export function dateLine(iso: string): string | null {
  if (!iso) return null;
  const d = parseEventDate(iso);
  if (Number.isNaN(d.getTime())) return null;
  const day = `${d.toLocaleDateString("en-US", { weekday: "long" })}, ${d.toLocaleDateString("en-US", { month: "long" })} ${ordinal(d.getDate())}`;
  const hasTime = iso.includes("T") && !(d.getHours() === 0 && d.getMinutes() === 0);
  if (!hasTime) return day;
  const time = d
    .toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    .replace(":00", "")
    .replace(/\s?([AP])M$/i, (_, m: string) => ` ${m.toLowerCase()}m`);
  return `${day} at ${time}`;
}

/** "3:00 pm" for the game plan. */
export function timeOf(iso: string): string {
  const d = parseEventDate(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).replace(/\s?([AP])M$/i, (_, m: string) => ` ${m.toLowerCase()}m`);
}

/** True from the day after the event (Philippine time). */
export function eventIsOver(iso: string): boolean {
  const day = (iso ?? "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  const today = new Date(Date.now() + 8 * 3_600_000).toISOString().slice(0, 10);
  return today > day;
}

/** The "What to bring" list, one thing per line. */
export function bringList(content: EventContent): string[] {
  return customValue(content, "bring")
    .split("\n")
    .map((l) => l.replace(/^[-•*\s]+/, "").trim())
    .filter(Boolean);
}
