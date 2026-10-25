import type { EventContent, EntourageGroup } from "../../content/types";
import { parseEventDate } from "../../content/parseEventDate";
import { customValue } from "../../content/custom";

export { eventIsOver, firstNames, timeLine, timeOf } from "../debut/content";

/** The name on the cover: the host's own, else the celebrant's first name. */
export function mastheadOf(c: EventContent): string {
  return customValue(c, "masthead") || (c.hosts.map((h) => h.name.trim().split(/\s+/)[0]).find(Boolean) ?? "");
}

/** Which number the issue celebrates (18 for a debut). */
export function issueNumber(c: EventContent): string {
  return (customValue(c, "number").match(/\d{1,3}/) ?? [])[0] ?? "18";
}

/** "Issue No. 18 · November 2030" (the host's own line wins). */
export function issueLine(c: EventContent): string {
  const own = customValue(c, "issueLine");
  if (own) return own;
  const d = c.eventDate ? parseEventDate(c.eventDate) : null;
  const month = d && !Number.isNaN(d.getTime()) ? d.toLocaleDateString("en-US", { month: "long", year: "numeric" }) : "";
  return [`Issue No. ${issueNumber(c)}`, month].filter(Boolean).join(" · ");
}

/** The date as the feature sets it: day number big, the rest beside it. */
export function bigDate(iso: string): { day: string; month: string; year: string; weekday: string; short: string } | null {
  if (!iso) return null;
  const d = parseEventDate(iso);
  if (Number.isNaN(d.getTime())) return null;
  return {
    day: String(d.getDate()),
    month: d.toLocaleDateString("en-US", { month: "long" }),
    year: String(d.getFullYear()),
    weekday: d.toLocaleDateString("en-US", { weekday: "long" }),
    short: d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
  };
}

/** "Nov 1": the reply-by date for the cover sticker. */
export function replyBy(c: EventContent): string {
  const day = c.rsvpDeadline ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return "";
  return new Date(`${day}T12:00:00+08:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "Asia/Manila" });
}

/** The town from the venue's address ("Tagaytay City"). */
export function townOf(c: EventContent): string {
  const parts = (c.primaryLocation.addressLine ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  return parts[0] ?? "";
}

// ---------------------------------------------------------------------------
// The spot colour: every page of the issue is printed in ink plus one colour, her first motif
// colour (the gown, the theme). A colour too close to the paper to read falls back to the ink.

const hex = (s: string) => {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(s.trim());
  if (!m) return null;
  const h = m[1].length === 3 ? m[1].replace(/./g, (x) => x + x) : m[1];
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
};
const lum = (rgb: number[]) => {
  const [r, g, b] = rgb.map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
export function contrast(a: string, b: string): number {
  const x = hex(a);
  const y = hex(b);
  if (!x || !y) return 1;
  const [hi, lo] = [lum(x), lum(y)].sort((p, q) => q - p);
  return (hi + 0.05) / (lo + 0.05);
}
export function spotOf(c: EventContent, paper: string, ink: string): string {
  const own = (c.motifColors ?? []).find((m) => hex(m) && contrast(m, paper) >= 3);
  return own ?? ink;
}

// ---------------------------------------------------------------------------
// The lists: "18 Roses", "18 Candles", "18 Treasures", "18 Shots"… each its own page.

export type List = EntourageGroup & { num: string; word: string; deck: string; numbered: boolean };

const DECKS: Record<string, string> = {
  roses: "A dance with each of them",
  candles: "A wish from each of them",
  treasures: "A gift and a memory from each",
  shots: "A toast from each of them",
  bills: "A blessing from each of them",
  blessings: "A blessing from each of them",
  escort: "",
  escorts: "",
};

export function listsOf(c: EventContent, editor: boolean): List[] {
  return (c.entourage ?? [])
    .map((g) => ({ ...g, people: editor ? g.people : g.people.map((p) => p.trim()).filter(Boolean) }))
    .filter((g) => editor || g.people.length)
    .map((g) => {
      const m = /^\s*(\d{1,3})\s+(.+)$/.exec(g.title ?? "");
      const word = (m ? m[2] : g.title ?? "").trim();
      return { ...g, num: m ? m[1] : "", word, deck: DECKS[word.toLowerCase()] ?? "", numbered: g.people.length > 2 };
    });
}

/** "Sofia’s 18 Roses, Candles and Treasures": the cover line for the lists. */
export function listsLine(lists: List[]): string {
  const named = lists.filter((l) => l.num);
  if (!named.length) return lists[0]?.title ?? "";
  const same = named.every((l) => l.num === named[0].num);
  const words = named.map((l) => l.word);
  const join = (xs: string[]) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);
  return same ? `${named[0].num} ${join(words)}` : join(named.map((l) => l.title));
}

/** The start of a text for a cover line or the contents: whole words, up to ~`max` characters. */
export function firstLine(s: string, max = 70): string {
  const t = s.trim().replace(/\s+/g, " ");
  if (t.length <= max) return t.replace(/[.,;:]$/, "");
  return `${t.slice(0, max).replace(/\s+\S*$/, "").replace(/[.,;:]$/, "")}…`;
}
