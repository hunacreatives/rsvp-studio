import type { EventContent, GalleryItem } from "../../content/types";
import { customValue } from "../../content/custom";
import { parseEventDate } from "../../content/parseEventDate";

export { eventIsOver, timeOf, timeWords } from "../love-letter/content";
export { receptionMap } from "../capiz/content";

/** A birthday (one celebrant) or an anniversary (a couple): the event's own type, else the hosts. */
export const isAnniversary = (c: EventContent) => (c.occasion === "anniversary" ? true : c.occasion === "birthday" ? false : c.hosts.filter((h) => h.name.trim()).length > 1);

/** The number being celebrated: the host's own ("80"), else the first number in the event's name. */
export function milestone(c: EventContent): number | null {
  const n = Number((customValue(c, "milestone").match(/\d+/) ?? [])[0]);
  return Number.isFinite(n) && n > 0 && n < 200 ? n : null;
}

/** "Lola Ising", or "Ramon & Elena" (first names). */
export function honoree(c: EventContent): string {
  const own = customValue(c, "honoree");
  if (own) return own;
  const first = c.hosts.map((h) => h.name.trim().split(/\s+/)[0]).filter(Boolean);
  return first.length > 1 ? `${first.slice(0, -1).join(", ")} & ${first[first.length - 1]}` : first[0] ?? "";
}

export type Metal = "gold" | "silver" | "ruby" | "sapphire" | "pearl" | "diamond";
/** The foil: the host's choice, else by anniversary (25 silver, 30 pearl, 40 ruby, 45 sapphire,
 *  60+ diamond, the rest gold); birthdays are gold. */
export function metalFor(c: EventContent): Metal {
  const own = customValue(c, "metal");
  if (own === "gold" || own === "silver" || own === "ruby" || own === "sapphire" || own === "pearl" || own === "diamond") return own;
  const n = milestone(c);
  if (!isAnniversary(c) || !n) return "gold";
  return n === 25 ? "silver" : n === 30 ? "pearl" : n === 40 ? "ruby" : n === 45 ? "sapphire" : n >= 60 ? "diamond" : "gold";
}

/** The small Filipino line above the name: "Maligayang ika-80 kaarawan", "Ginintuang Anibersaryo". */
export function greeting(c: EventContent): string {
  const own = customValue(c, "heroLine");
  if (own) return own;
  const n = milestone(c);
  if (!isAnniversary(c)) return n ? `Maligayang ika-${n} kaarawan` : "Maligayang kaarawan";
  if (n === 50) return "Ginintuang Anibersaryo";
  if (n === 25) return "Pilak na Anibersaryo";
  return n ? `Maligayang ika-${n} anibersaryo` : "Maligayang anibersaryo";
}

/** "Saturday, 16 January 2027" */
export function longDate(iso: string): string | null {
  if (!iso) return null;
  const d = parseEventDate(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

/** The town from the venue's address. */
export function townOf(c: EventContent): string {
  const parts = (c.primaryLocation.addressLine ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  return parts.length ? parts[parts.length - 1] : "";
}

// ---------------------------------------------------------------------------
// The photos, by year. A caption that starts with a year ("1968 — Our wedding day",
// "1968: Baguio", "1968") gives the photo its year; the rest is its label.

export type Print = GalleryItem & { year: number | null; label: string };
const YEAR = /^\s*((?:18|19|20)\d{2})\s*(?:[—–\-:,·.]\s*)?(.*)$/;

export function printsOf(c: EventContent): Print[] {
  const items = c.galleries.flatMap((g) => [...g.items].sort((a, b) => a.order - b.order)).filter((i) => i.image?.masterUrl);
  return items.map((i) => {
    const m = YEAR.exec(i.caption ?? "");
    return { ...i, year: m ? Number(m[1]) : null, label: (m ? m[2] : i.caption ?? "").trim() };
  });
}

/** The prints in decades, oldest first; prints without a year last, in the host's order. */
export function decades(prints: Print[]): { title: string; prints: Print[] }[] {
  const dated = prints.filter((p) => p.year).sort((a, b) => a.year! - b.year!);
  const groups = new Map<number, Print[]>();
  for (const p of dated) {
    const d = Math.floor(p.year! / 10) * 10;
    groups.set(d, [...(groups.get(d) ?? []), p]);
  }
  const out = [...groups.entries()].map(([d, ps]) => ({ title: `The ${d}s`, prints: ps }));
  const rest = prints.filter((p) => !p.year);
  if (rest.length) out.push({ title: dated.length ? "And more" : "Through the years", prints: rest });
  return out;
}

/** The three prints on the table in the hero: the newest (today), the oldest, and one between. */
export function heroPrints(prints: Print[]): Print[] {
  const dated = prints.filter((p) => p.year).sort((a, b) => a.year! - b.year!);
  if (dated.length >= 3) return [dated[dated.length - 1], dated[0], dated[Math.floor(dated.length / 2)]];
  return prints.slice(0, 3);
}

/** How a print of its era looks: deckled before 1970, square with rounded corners in the 70s,
 *  borderless gloss (with the orange date stamp) in the 80s and 90s, a thin border after. */
export type Era = "deckle" | "seventies" | "gloss" | "modern";
export const eraOf = (year: number | null): Era => (!year ? "modern" : year < 1970 ? "deckle" : year < 1980 ? "seventies" : year < 2000 ? "gloss" : "modern");

/** The 80s/90s camera's date stamp: "'87 6 14". */
export const dateStamp = (year: number, seed: number) => `'${String(year).slice(2)} ${1 + (seed % 12)} ${1 + ((seed * 7) % 28)}`;

/** A deckled edge as a polygon (deterministic per print). */
export function deckle(seed: number): string {
  const pts: string[] = [];
  const r = (n: number) => {
    const x = Math.sin((seed + 1) * 97.13 + n * 12.9898) * 43758.5453;
    return x - Math.floor(x);
  };
  const N = 22;
  for (let i = 0; i <= N; i++) pts.push(`${((i / N) * 100).toFixed(2)}% ${(r(i) * 1.1).toFixed(2)}%`);
  for (let i = 0; i <= N; i++) pts.push(`${(100 - r(i + 40) * 1.1).toFixed(2)}% ${((i / N) * 100).toFixed(2)}%`);
  for (let i = N; i >= 0; i--) pts.push(`${((i / N) * 100).toFixed(2)}% ${(100 - r(i + 80) * 1.1).toFixed(2)}%`);
  for (let i = N; i >= 0; i--) pts.push(`${(r(i + 120) * 1.1).toFixed(2)}% ${((i / N) * 100).toFixed(2)}%`);
  return `polygon(${pts.join(",")})`;
}

// ---------------------------------------------------------------------------
// The livestream, for family abroad: the start in Manila and in the cities relatives usually
// call from, plus the viewer's own clock.

const ZONES: [string, string][] = [
  ["Manila", "Asia/Manila"],
  ["Dubai", "Asia/Dubai"],
  ["London", "Europe/London"],
  ["Toronto", "America/Toronto"],
  ["Los Angeles", "America/Los_Angeles"],
  ["Sydney", "Australia/Sydney"],
];

export function streamTable(iso: string): { city: string; time: string; mine: boolean }[] | null {
  if (!iso || !iso.includes("T")) return null;
  const at = new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(iso) ? iso : `${iso}+08:00`);
  if (Number.isNaN(at.getTime())) return null;
  let mine = "";
  try {
    mine = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
  } catch {
    mine = "";
  }
  const manilaDay = at.toLocaleDateString("en-US", { weekday: "short", timeZone: "Asia/Manila" });
  const row = (city: string, tz: string) => {
    const day = at.toLocaleDateString("en-US", { weekday: "short", timeZone: tz });
    const time = at.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: tz });
    return { city, time: day === manilaDay ? time : `${time}, ${day}`, mine: tz === mine };
  };
  const rows = ZONES.map(([c, tz]) => row(c, tz));
  if (mine && !ZONES.some(([, tz]) => tz === mine)) rows.push({ ...row(mine.split("/").pop()!.replace(/_/g, " "), mine), mine: true });
  return rows;
}
