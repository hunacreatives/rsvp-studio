import type { EventContent } from "../../content/types";
import { parseEventDate } from "../../content/parseEventDate";
import { customValue } from "../../content/custom";

/** "Lia & Marco" (first names), or "Lia, Bea & Marco". */
export function coupleNames(content: EventContent): string {
  const f = content.hosts.map((h) => h.name.trim().split(/\s+/)[0]).filter(Boolean);
  if (f.length <= 1) return f[0] ?? "";
  return `${f.slice(0, -1).join(", ")} & ${f[f.length - 1]}`;
}

/** Full names, for the name card: ["Lia Santos", "Marco Reyes"]. */
export const fullNames = (content: EventContent) => content.hosts.map((h) => h.name.trim()).filter(Boolean);

/** The seal's monogram: the host's own, or the first letters ("L & M"). */
export function monogram(content: EventContent): string {
  const own = customValue(content, "sealText");
  if (own) return own;
  const i = content.hosts.map((h) => h.name.trim()[0]?.toUpperCase()).filter(Boolean);
  return i.length >= 2 ? `${i[0]} & ${i[1]}` : i[0] ?? "";
}

const valid = (iso: string) => {
  if (!iso) return null;
  const d = parseEventDate(iso);
  return Number.isNaN(d.getTime()) ? null : d;
};

/** "21.06.2030" for the date card. */
export function dotDate(iso: string): string | null {
  const d = valid(iso);
  if (!d) return null;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()}`;
}

/** "on Saturday, 21 June 2030" */
export function longDate(iso: string): string | null {
  const d = valid(iso);
  if (!d) return null;
  return `on ${d.toLocaleDateString("en-GB", { weekday: "long" })}, ${d.getDate()} ${d.toLocaleDateString("en-GB", { month: "long" })} ${d.getFullYear()}`;
}

const ONES = ["twelve", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven"];
const MINS: Record<number, string> = { 5: "oh five", 10: "ten", 15: "fifteen", 20: "twenty", 25: "twenty-five", 30: "thirty", 35: "thirty-five", 40: "forty", 45: "forty-five", 50: "fifty", 55: "fifty-five" };

/** "Twelve thirty in the afternoon", "Four o'clock in the afternoon" (the time written out, like an engraved card). */
export function timeWords(iso: string): string | null {
  if (!iso || !iso.includes("T")) return null;
  const d = valid(iso);
  if (!d || (d.getHours() === 0 && d.getMinutes() === 0)) return null;
  const h = d.getHours(), m = d.getMinutes();
  const hour = ONES[h % 12];
  const mins = m === 0 ? "o’clock" : MINS[m] ?? String(m).padStart(2, "0");
  const part = h < 12 ? "in the morning" : h < 17 ? "in the afternoon" : "in the evening";
  const s = `${hour} ${mins} ${part}`;
  return s[0].toUpperCase() + s.slice(1);
}

/** "3:00 PM" for the day's schedule. */
export function timeOf(iso: string): string {
  const d = valid(iso);
  return d ? d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "";
}

/** The place line in script: the host's own, or the venue's address (town), or its name. */
export function placeLine(content: EventContent): string {
  return customValue(content, "placeLine") || content.primaryLocation.addressLine?.trim() || content.primaryLocation.name?.trim() || "";
}

/** True from the day after the event (Philippine time). */
export function eventIsOver(iso: string): boolean {
  const day = (iso ?? "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  const today = new Date(Date.now() + 8 * 3_600_000).toISOString().slice(0, 10);
  return today > day;
}
