import type { EventContent } from "../../content/types";

export { dateWords, eventIsOver, receptionMap, splitEntourage, timeOf, timeWords, type EntRow } from "../capiz/content";

/** "Isabel & Rafael" (first names). */
export function coupleNames(content: EventContent): string {
  const f = content.hosts.map((h) => h.name.trim().split(/\s+/)[0]).filter(Boolean);
  if (f.length <= 1) return f[0] ?? "";
  return `${f.slice(0, -1).join(", ")} & ${f[f.length - 1]}`;
}

/** The names split round their ampersand, so it can be set in the italic: ["Isabel", "Rafael"]. */
export function nameParts(names: string): string[] {
  return names.split(/\s+(?:&|and|\+)\s+/i).map((s) => s.trim()).filter(Boolean);
}

/** The story's paragraphs. */
export function paragraphs(story: string | undefined): string[] {
  return (story ?? "").split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
}

/** Roman numerals for the cards (I to XII). */
export const ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
