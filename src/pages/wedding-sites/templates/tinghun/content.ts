import type { EventContent } from "../../content/types";
import { customValue } from "../../content/custom";

// Tinghun's words: the shared date/venue helpers come from Capiz (the same family of
// formal invitations); what's its own is the lunar date and the two families.
export { dateWords, eventIsOver, firstNames, monogram, receptionMap, timeOf, timeWords, townOf } from "../capiz/content";

const DAYS = [
  "", "初一", "初二", "初三", "初四", "初五", "初六", "初七", "初八", "初九", "初十",
  "十一", "十二", "十三", "十四", "十五", "十六", "十七", "十八", "十九", "二十",
  "廿一", "廿二", "廿三", "廿四", "廿五", "廿六", "廿七", "廿八", "廿九", "三十",
];

/**
 * The date on the Chinese calendar, written the way it appears on an invitation:
 * "丁未年二月初六". The host's own (custom "lunarDate", to match the family's almanac)
 * wins; otherwise it's worked out from the event date (Manila noon, so it can't slip a day).
 */
export function lunarDate(content: EventContent): string {
  const own = customValue(content, "lunarDate");
  if (own) return own;
  const iso = content.eventDate?.slice(0, 10);
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "";
  try {
    const parts = new Intl.DateTimeFormat("zh-Hant-u-ca-chinese", { timeZone: "Asia/Manila", year: "numeric", month: "long", day: "numeric" }).formatToParts(new Date(`${iso}T12:00:00+08:00`));
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
    const year = get("yearName");
    const month = get("month");
    const day = DAYS[Number(get("day"))] ?? "";
    return year && month && day ? `${year}年${month}${day}` : "";
  } catch {
    return ""; // a browser without the Chinese calendar: the line just doesn't show
  }
}

/** "陳府 · 林府"-style family names, and the parents of each side from Entourage & motif. */
export function families(content: EventContent) {
  const groups = (content.entourage ?? []).map((g) => ({ ...g, people: g.people.map((p) => p.trim()).filter(Boolean) })).filter((g) => g.people.length);
  // "Grandparents of the Bride" contains "parent": those are elders, not the parents.
  const isParents = (t: string) => !/grand|lolo|lola|祖/i.test(t) && /parent|magulang|父母/i.test(t);
  const side = (t: string) => (/groom|lalaki|男/i.test(t) ? "groom" : /bride|babae|女/i.test(t) ? "bride" : null);
  const parents = groups.filter((g) => isParents(g.title));
  return {
    bride: parents.find((g) => side(g.title) === "bride") ?? null,
    groom: parents.find((g) => side(g.title) === "groom") ?? null,
    /** Grandparents, elders and anyone else the families list. */
    others: groups.filter((g) => !isParents(g.title)),
  };
}
