import type { EventContent } from "../../content/types";
import { parseEventDate } from "../../content/parseEventDate";
import { customValue } from "../../content/custom";

// Letterpress's wording: an engraved invitation writes its date and time out in words
// ("Saturday, the eleventh of December", "two thousand twenty-seven", "at four o’clock in the
// afternoon"); the program and the reply card keep figures.

const valid = (iso: string) => {
  if (!iso) return null;
  const d = parseEventDate(iso);
  return Number.isNaN(d.getTime()) ? null : d;
};

/** "Clarisse & Miguel" (first names). */
export function coupleNames(content: EventContent): string {
  const f = content.hosts.map((h) => h.name.trim().split(/\s+/)[0]).filter(Boolean);
  if (f.length <= 1) return f[0] ?? "";
  return `${f.slice(0, -1).join(", ")} & ${f[f.length - 1]}`;
}

/** The names split for the card: ["Clarisse", "Miguel"] from "Clarisse & Miguel" (or one name). */
export function nameParts(names: string): string[] {
  return names
    .split(/\s*(?:&|\+|\band\b)\s*/i)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 3);
}

/** The seal's initials: the host's own, or the first letters ("C", "M"). */
export function initialsOf(content: EventContent, names: string): string[] {
  const own = customValue(content, "sealText").replace(/\s+/g, "");
  if (own) return own.split(/&|\+/).map((s) => s.slice(0, 2)).filter(Boolean).slice(0, 2);
  return nameParts(names).map((p) => p[0]?.toUpperCase() ?? "").filter(Boolean).slice(0, 2);
}

const ONES = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
const ORD: Record<string, string> = { one: "first", two: "second", three: "third", five: "fifth", eight: "eighth", nine: "ninth", twelve: "twelfth" };
const words = (n: number): string => (n < 20 ? ONES[n] : `${TENS[Math.floor(n / 10)]}${n % 10 ? `-${ONES[n % 10]}` : ""}`);
function ordinal(n: number): string {
  const w = words(n);
  const parts = w.split("-");
  const last = parts[parts.length - 1];
  parts[parts.length - 1] = ORD[last] ?? (last.endsWith("y") ? `${last.slice(0, -1)}ieth` : `${last}th`);
  return parts.join("-");
}
function yearWords(y: number): string {
  if (y >= 2000 && y < 2100) return `two thousand${y % 100 ? ` ${words(y % 100)}` : ""}`;
  return String(y);
}

/** ["Saturday, the eleventh of December", "two thousand twenty-seven"], or null. */
export function dateWords(iso: string): [string, string] | null {
  const d = valid(iso);
  if (!d) return null;
  const wd = d.toLocaleDateString("en-GB", { weekday: "long" });
  const mo = d.toLocaleDateString("en-GB", { month: "long" });
  return [`${wd}, the ${ordinal(d.getDate())} of ${mo}`, yearWords(d.getFullYear())];
}

/** "at four o’clock in the afternoon", "at half past three in the afternoon", or null. */
export function timeWords(iso: string): string | null {
  if (!iso || !iso.includes("T")) return null;
  const d = valid(iso);
  if (!d || (d.getHours() === 0 && d.getMinutes() === 0)) return null;
  const h = d.getHours(), m = d.getMinutes();
  const h12 = h % 12 || 12;
  const next = (h + 1) % 12 || 12;
  const part = h < 12 ? "in the morning" : h < 18 ? "in the afternoon" : "in the evening";
  if (m === 0) return `at ${words(h12)} o’clock ${part}`;
  if (m === 30) return `at half past ${words(h12)} ${part}`;
  if (m === 15) return `at a quarter past ${words(h12)} ${part}`;
  if (m === 45) return `at a quarter to ${words(next)} ${part}`;
  return `at ${h12}:${String(m).padStart(2, "0")} ${part}`;
}

/** "3:00 PM" for the program. */
export function timeOf(iso: string): string {
  const d = valid(iso);
  return d ? d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "";
}

/** "11 · 12 · 2027" for small places (the envelope's flap). */
export function dotDate(iso: string): string | null {
  const d = valid(iso);
  return d ? `${d.getDate()} · ${d.getMonth() + 1} · ${d.getFullYear()}` : null;
}

/** The town: the last part of the venue's address. */
export function townOf(content: EventContent): string {
  const parts = (content.primaryLocation.addressLine ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  return parts.length > 1 ? parts.slice(-2).join(", ") : parts[0] ?? "";
}

/** True from the day after the event (Philippine time). */
export function eventIsOver(iso: string): boolean {
  const day = (iso ?? "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  const today = new Date(Date.now() + 8 * 3_600_000).toISOString().slice(0, 10);
  return today > day;
}
