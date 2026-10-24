import type { EntourageGroup, EventContent } from "../../content/types";

export { dateWords, eventIsOver, firstNames, lunarDate, monogram, receptionMap, timeOf, timeWords } from "../tinghun/content";

/** The name over the door: everything but the surname ("Mei Ling Chua" → "Mei Ling"). */
export const givenName = (full: string) => {
  const w = full.trim().split(/\s+/).filter(Boolean);
  return w.length > 1 ? w.slice(0, -1).join(" ") : (w[0] ?? "");
};

/** Text with Chinese characters in it (set in the Chinese face, never italic). */
export const hasHan = (s: string | undefined) => /[\u3400-\u9fff\uf900-\ufaff]/.test(s ?? "");

type Side = "bride" | "groom" | null;
// "Grandparents of the Bride" is an elder, not a parent.
const isParents = (t: string) => !/grand|lolo|lola|祖/i.test(t) && /parent|magulang|父母/i.test(t);
const sideOf = (t: string): Side => (/groom|lalaki|男/i.test(t) ? "groom" : /bride|babae|女/i.test(t) ? "bride" : null);
const rank = (s: Side) => (s === "bride" ? 0 : s === "groom" ? 1 : 2);

/**
 * The families, as tinghun/content `families()` reads them, but every group kept: the parents
 * (the bride's first, then the groom's) for the invitation, and everyone else (grandparents,
 * elders) for the lacquer box, the bride's side first. In the builder (`editor`) empty groups
 * and names stay where they are, so one just added can be typed into on the page.
 */
export function familyGroups(content: EventContent, editor = false): { parents: EntourageGroup[]; others: EntourageGroup[] } {
  const groups = (content.entourage ?? [])
    .map((g) => (editor ? g : { ...g, people: g.people.map((p) => p.trim()).filter(Boolean) }))
    .filter((g) => editor || g.people.length);
  const bySide = (list: EntourageGroup[]) => list.map((g, i) => ({ g, i, r: rank(sideOf(g.title)) })).sort((a, b) => a.r - b.r || a.i - b.i).map((x) => x.g);
  return {
    parents: bySide(groups.filter((g) => isParents(g.title))),
    others: bySide(groups.filter((g) => !isParents(g.title))),
  };
}
