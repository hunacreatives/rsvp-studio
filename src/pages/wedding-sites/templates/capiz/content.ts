import type { EntourageGroup, EventContent } from "../../content/types";
import { parseEventDate } from "../../content/parseEventDate";
import { customValue } from "../../content/custom";

export { eventIsOver, timeOf, timeWords } from "../love-letter/content";

/** First names, for the hero: ["Andrea", "Miguel"]. */
export const firstNames = (content: EventContent) => content.hosts.map((h) => h.name.trim().split(/\s+/)[0]).filter(Boolean);

/** The monogram in the footer: the host's own, or the first letters ("A & M"). */
export function monogram(content: EventContent): string {
  const own = customValue(content, "monogram");
  if (own) return own;
  const i = content.hosts.map((h) => h.name.trim()[0]?.toUpperCase()).filter(Boolean);
  return i.length >= 2 ? `${i[0]} & ${i[1]}` : i[0] ?? "";
}

const ORD = [
  "", "first", "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth", "ninth", "tenth",
  "eleventh", "twelfth", "thirteenth", "fourteenth", "fifteenth", "sixteenth", "seventeenth", "eighteenth", "nineteenth", "twentieth",
  "twenty-first", "twenty-second", "twenty-third", "twenty-fourth", "twenty-fifth", "twenty-sixth", "twenty-seventh", "twenty-eighth", "twenty-ninth", "thirtieth", "thirty-first",
];

/** "Saturday, the fourth of December 2027": the date written out, as on an engraved card. */
export function dateWords(iso: string): string | null {
  if (!iso) return null;
  const d = parseEventDate(iso);
  if (Number.isNaN(d.getTime())) return null;
  const day = d.toLocaleDateString("en-GB", { weekday: "long" });
  const month = d.toLocaleDateString("en-GB", { month: "long" });
  return `${day}, the ${ORD[d.getDate()]} of ${month} ${d.getFullYear()}`;
}

/** The town under the names: the last two parts of the venue's address ("Intramuros, Manila"). */
export function townOf(content: EventContent): string {
  const parts = (content.primaryLocation.addressLine ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  return parts.length ? parts.slice(-2).join(", ") : content.primaryLocation.name?.trim() ?? "";
}

/** The reception's map link: the host's own, or a Maps search for its name and address. */
export function receptionMap(content: EventContent): string | null {
  const own = customValue(content, "receptionMap");
  if (/^https?:\/\//i.test(own)) return own;
  const q = [customValue(content, "receptionName"), customValue(content, "receptionAddress")].filter(Boolean).join(", ");
  return q ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}` : null;
}

// ---------------------------------------------------------------------------
// The entourage, set the way a Filipino wedding programme sets it: the parents go in the
// invitation itself; then the principal sponsors, the secondary sponsors (candle, veil,
// cord, coin) in one row, the best man and maid of honour, the bridal party, and the
// little ones last. Any other group follows, two to a row.

export type EntKind = "principal" | "secondary" | "honour" | "party" | "little" | "other";
export interface EntCell {
  id: string;
  title: string;
  /** The group's own title, as typed (edited on the page). */
  raw: string;
  people: string[];
}
export interface EntRow {
  kind: EntKind;
  cells: EntCell[];
}

const ORDER: EntKind[] = ["principal", "secondary", "honour", "party", "little", "other"];

function kindOf(title: string): EntKind | "parents" {
  const t = title.toLowerCase();
  if (/parent|magulang/.test(t)) return "parents";
  if (/bearer|flower|page|junior|little/.test(t)) return "little";
  if (/principal|ninong|ninang/.test(t)) return "principal";
  if (/groomsm|bridesm|usher|bridal party/.test(t)) return "party";
  if (/secondary|candle|veil|cord|coin|arrh/.test(t)) return "secondary";
  if (/best man|maid|matron|hono/.test(t)) return "honour";
  return "other";
}

/** "Secondary Sponsors: Candle" → "Candle sponsors". */
function cellTitle(title: string, kind: EntKind): string {
  const t = title.trim();
  if (kind !== "secondary") return t;
  const rest = t.replace(/^secondary\s+sponsors?\s*[:\-–—]\s*/i, "");
  if (rest === t || !rest) return t;
  return /sponsor/i.test(rest) ? rest : `${rest} sponsors`;
}

/** `editor` (the builder): empty groups and names stay, at their own places, so a group or name
 *  just added can be typed into on the page. */
export function splitEntourage(content: EventContent, editor = false): { parents: EntourageGroup[]; rows: EntRow[] } {
  const groups = (content.entourage ?? [])
    .map((g) => (editor ? g : { ...g, people: g.people.map((p) => p.trim()).filter(Boolean) }))
    .filter((g) => editor || g.people.length);
  const parents: EntourageGroup[] = [];
  const byKind = new Map<EntKind, EntCell[]>();
  for (const g of groups) {
    const k = kindOf(g.title);
    if (k === "parents") {
      parents.push(g);
      continue;
    }
    byKind.set(k, [...(byKind.get(k) ?? []), { id: g.id, title: cellTitle(g.title, k), raw: g.title, people: g.people }]);
  }
  const rows: EntRow[] = [];
  for (const kind of ORDER) {
    const cells = byKind.get(kind) ?? [];
    const per = kind === "principal" ? 1 : kind === "other" ? 2 : 4;
    for (let i = 0; i < cells.length; i += per) rows.push({ kind, cells: cells.slice(i, i + per) });
  }
  return { parents, rows };
}
