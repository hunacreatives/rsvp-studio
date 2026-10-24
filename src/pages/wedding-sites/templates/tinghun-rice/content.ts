import type { EntourageGroup, EventContent } from "../../content/types";
import { customValue } from "../../content/custom";

/** Chinese characters (CJK ideographs and their punctuation): the runs that get lang="zh-Hant". */
const ZH = /[⺀-⿿　-〿㐀-䶿一-鿿豈-﫿＀-￯]/;
const HAN = /[㐀-䶿一-鿿豈-﫿]/;
export const hasZh = (s: string | undefined) => !!s && ZH.test(s);

/** "蔡府 · 林府" → ["蔡府 ", "·", …] split into Chinese and Latin runs, for <Zh>. */
export function zhRuns(s: string): { zh: boolean; text: string }[] {
  const out: { zh: boolean; text: string }[] = [];
  for (const ch of s) {
    // Spaces and the middle dot go with the Latin runs, so the Chinese spacing stays tight.
    const zh = ZH.test(ch) && ch !== "·" && ch !== "\u3000";
    const last = out[out.length - 1];
    if (last && last.zh === zh) last.text += ch;
    else out.push({ zh, text: ch });
  }
  return out;
}

/**
 * The two family names carved in the seal. From "蔡府 · 林府" (the surname is the first
 * character of each family), else the first character of each Chinese name (蔡美玲 → 蔡),
 * else the Latin initials of the two surnames (Chua, Lim → C, L).
 */
export function sealChars(content: EventContent): { chars: string[]; zh: boolean } {
  const fam = customValue(content, "familiesZh");
  const parts = fam.split(/[^㐀-䶿一-鿿豈-﫿]+/).filter(Boolean);
  if (parts.length >= 2) return { chars: [parts[0][0], parts[1][0]], zh: true };
  // "蔡林" typed as one word: the two surnames together.
  if (parts.length === 1 && [...parts[0]].length === 2 && !/[府家氏]/.test(parts[0])) return { chars: [...parts[0]], zh: true };
  const z = [customValue(content, "hostZh1"), customValue(content, "hostZh2")].map((n) => [...n].find((c) => HAN.test(c)) ?? "").filter(Boolean);
  if (z.length) return { chars: z, zh: true };
  const latin = content.hosts
    .map((h) => h.name.trim().split(/\s+/).filter(Boolean))
    .filter((w) => w.length)
    .map((w) => w[w.length - 1][0].toUpperCase());
  return { chars: latin.slice(0, 2), zh: false };
}

const isParents = (t: string) => /parent|magulang|父母/i.test(t) && !/grand|lolo|lola|祖/i.test(t);
const sideOf = (t: string) => (/groom|lalaki|男/i.test(t) ? "groom" : /bride|babae|女/i.test(t) ? "bride" : null);

/**
 * The families, split the way the invitation reads: the parents of the bride first, then of
 * the groom (they host the invitation); grandparents and other elders get their own section.
 * `editor` (the builder): empty groups and names stay at their places so they can be typed into.
 */
export function splitFamilies(content: EventContent, editor: boolean): { parents: EntourageGroup[]; others: EntourageGroup[] } {
  const groups = (content.entourage ?? [])
    .map((g) => (editor ? g : { ...g, people: g.people.map((p) => p.trim()).filter(Boolean) }))
    .filter((g) => editor || g.people.length);
  const parents = groups.filter((g) => isParents(g.title));
  const rank = (g: EntourageGroup) => ({ bride: 0, groom: 1 })[sideOf(g.title) ?? "x"] ?? 2;
  return {
    parents: [...parents].sort((a, b) => rank(a) - rank(b)),
    others: groups.filter((g) => !isParents(g.title)),
  };
}
