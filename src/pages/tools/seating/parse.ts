import { isHonorific, uid, type Category, type Group, type Guest } from "./model";

// "Paste anything": a guest list from Viber, Notes, Excel or Google Sheets becomes groups
// and households.
//   Tito Ben & Tita Marie Santos + 2 kids   → one household of 4 (Ben Santos, Marie Santos, 2 kids)
//   Mr. & Mrs. Cruz                         → Mr. Cruz, Mrs. Cruz
//   Juan dela Cruz +1                       → Juan, and "Guest of Juan"
//   Reyes family (5)                        → 5 seats for the Reyes family
//   BRIDE'S SIDE / Principal sponsors:      → headings: what follows sits together
// Spreadsheets with a header row (Name, Group, Household, Side, Meal, Pax) map by column.

export interface ParsedParty {
  line: string;
  people: string[];
  group: string | null;
}

export interface ParseResult {
  groups: Group[];
  guests: Guest[];
  parties: ParsedParty[];
  duplicates: number;
  /** "TABLE 5: …" lists: guest id → the table they're already assigned to. */
  wantTable: Record<string, string>;
}

const WORDS: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, isa: 1, dalawa: 2, tatlo: 3 };
const num = (s?: string) => (s ? (WORDS[s.toLowerCase()] ?? Number(s)) : NaN);

const CHAT_PREFIX = /^\[?\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4},?\s+\d{1,2}:\d{2}(?::\d{2})?\s*(?:[ap]\.?m\.?)?\]?\s*(?:-\s*)?[^:]{1,40}:\s*/i;
const BULLET = /^\s*(?:[-*•·◦▪●○✓✔☐☑►▸→]+|\d{1,3}\s*[.)\]]|\(\d{1,3}\)|#\d{1,3})\s*/;
const HEADING_WORD =
  /\b(side|family|families|relatives|friends|sponsors?|entourage|guests|office|officemates|colleagues|work|roses|candles|treasures|bills|vip|church|school|classmates|barkada|ninongs|ninangs|neighbou?rs|kids|children|cousins|titos|titas|court|cotillion|others)\b/i;
const KNOWN_HEADING =
  /^(the\s+)?((bride|groom|debutante)('?s)?\s*(side|family|relatives|friends|guests)?|(principal|primary|secondary)\s+sponsors?|ninongs?(\s*(&|and)\s*ninangs?)?|ninangs?|entourage|(18\s+)?(roses|candles|treasures|bills|gifts)|friends|family|relatives|office(\s*mates)?|officemates|colleagues|work|barkada|classmates|church(\s+friends)?|neighbou?rs|kids|children|vip|others?|guests|cotillion|court)$/i;

/** What kind of table a heading or a line belongs at. */
export function inferCategory(text: string, side: "bride" | "groom" | null): Category {
  const t = text.toLowerCase();
  if (/\b(principal|primary|ninong|ninang|vip|presidential|parents)\b|sponsors?\b(?!.*secondary)/.test(t) && !/secondary/.test(t)) return "vip";
  if (/\b(secondary|cord|veil|coin|candle sponsor|entourage|bridesmaids?|groomsm[ae]n|maid of honou?r|best man|flower girls?|ring bearer|bible bearer|coin bearer)\b/.test(t)) return "entourage";
  if (/\b(roses|candles|treasures|bills|cotillion|court|escorts?)\b/.test(t)) return "court";
  if (/\b(kids|children)\b/.test(t)) return "kids";
  if (/\b(office|officemates|colleagues|work|team|company)\b/.test(t)) return "work";
  if (/\bbride\b|\bbride'?s\b/.test(t)) return "bride";
  if (/\bgroom\b|\bgroom'?s\b/.test(t)) return "groom";
  if (/\b(friends?|barkada|classmates|school|college|church|neighbou?rs)\b/.test(t)) return "friends";
  if (/\b(family|families|relatives|cousins|titos|titas|lola|lolo)\b/.test(t)) return side ?? "family";
  return side ?? "other";
}

function isHeading(line: string) {
  if (/[:：]\s*$/.test(line)) return true;
  const bare = line.replace(/[^\p{L}\s'’&]/gu, "").trim();
  if (KNOWN_HEADING.test(bare)) return true;
  // ALL CAPS lines are often just names ("JUAN DELA CRUZ"), so only a caps line with a
  // heading word and no names-joining marks counts.
  const caps = /[A-Z]/.test(line) && !/[a-z]/.test(line);
  return caps && HEADING_WORD.test(line) && !/[&+/]|\d/.test(line);
}

function cleanHeading(line: string) {
  return line
    .replace(/[:：]\s*$/, "")
    .replace(/[-=_*#]+/g, " ")
    .trim()
    .toLowerCase()
    .replace(/(^|\s|')\p{L}/gu, (m) => m.toUpperCase())
    .replace(/'S\b/g, "’s")
    .replace(/'s\b/g, "’s");
}

const tidy = (s: string) =>
  s
    .replace(/\s+/g, " ")
    .replace(/^[\s,.;-]+|[\s,.;-]+$/g, "")
    .trim();

/** "TITA NORA SANTOS" → "Tita Nora Santos"; mixed case is left as typed. */
function nameCase(s: string) {
  if (/[a-z]/.test(s)) return s;
  return s.toLowerCase().replace(/(^|[\s\-'’.(])\p{L}/gu, (m) => m.toUpperCase()).replace(/\b(Dela|De|Del|Delos|De La|Van|Von)\b/g, (m) => m);
}

const coreWords = (n: string) => n.split(/\s+/).filter((w) => w && !isHonorific(w));

/** One line → the people in that household. */
export function parseParty(line: string): { people: string[]; kids: number; extra: number } {
  // Notes in brackets ("(cord)", "(bride's college friend)") aren't names; counts are kept.
  let s = tidy(line.replace(/\((?!\s*\d)[^)]*\)/g, " "));
  let kids = 0;
  let total = NaN;
  let extra = 0;

  const kidsM = s.match(/\s*(?:\+|w\/|with|and|&|at)\s*(\d{1,2}|one|two|three|four|isa|dalawa|tatlo)?\s*(?:kids?|children|child|anak|chikitings|bata)\s*$/i);
  if (kidsM) {
    kids = Number.isFinite(num(kidsM[1])) ? num(kidsM[1]) : 1;
    s = s.slice(0, kidsM.index).trim();
  }
  const plusM = s.match(/\s*\+\s*(\d{1,2}|one|two|three)?\s*(?:guests?|plus[- ]?ones?|others?|companions?|partner|date)?\s*$/i);
  if (plusM && plusM[0].trim().length > 0) {
    const n = num(plusM[1]);
    extra = Number.isFinite(n) ? n : 1;
    s = s.slice(0, plusM.index).trim();
  }
  const countM = s.match(
    /\s*(?:\((\d{1,2})(?:\s*(?:pax|persons?|people|seats?|guests?|heads?))?\)|[x×]\s*(\d{1,2})|[-–—:]\s*(\d{1,2})(?:\s*(?:pax|persons?|people|seats?|guests?|heads?))?|(\d{1,2})\s*(?:pax|persons?|people|seats?|guests?|heads?))\s*$/i,
  );
  if (countM) {
    total = Number(countM[1] ?? countM[2] ?? countM[3] ?? countM[4]);
    s = s.slice(0, countM.index).trim();
  }

  let people: string[];
  const mrMrs = s.match(/^(mr\.?|dr\.?|atty\.?|engr\.?|sir)\s*(?:&|and|at|\/)\s*(mrs\.?|dra\.?|ms\.?|ma'?am)\s+(.+)$/i);
  if (mrMrs) {
    people = [`${cap(mrMrs[1])} ${mrMrs[3]}`, `${cap(mrMrs[2])} ${mrMrs[3]}`];
  } else {
    people = s
      .split(/\s*(?:&|\/|;|,|\+|\band\b|\bat\b(?=\s+\p{Lu}))\s*/u)
      .map(tidy)
      .filter((p) => p && /\p{L}/u.test(p));
    // "Ben & Marie Tan": the first names share the last person's surname.
    if (people.length > 1) {
      const last = coreWords(people[people.length - 1]);
      if (last.length >= 2) {
        const surname = last[last.length - 1];
        people = people.map((p, i) => (i < people.length - 1 && coreWords(p).length === 1 ? `${p} ${surname}` : p));
      }
    }
  }
  people = people.map(nameCase);

  // "Reyes family (5)": seats for the family, named so the host can rename them later.
  if (people.length === 1 && /\bfamily\b/i.test(people[0]) && Number.isFinite(total) && total > 1) {
    const fam = people[0];
    people = Array.from({ length: total }, (_, i) => `${fam} · ${i + 1}`);
    total = NaN;
  }
  if (Number.isFinite(total) && total > people.length + kids + extra) extra = total - people.length - kids;
  return { people, kids, extra };
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

const normName = (n: string) =>
  coreWords(n.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\p{L}\s]/gu, " "))
    .join(" ")
    .trim();

// ---- spreadsheets ------------------------------------------------------------
function splitRow(line: string, sep: string): string[] {
  if (sep === "\t") return line.split("\t");
  const out: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (q && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else q = !q;
    } else if (ch === sep && !q) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out.map((c) => c.trim());
}

function parseSheet(lines: string[], existing: Map<string, Group>): ParseResult | null {
  const sep = lines[0].includes("\t") ? "\t" : lines[0].includes(",") ? "," : lines[0].includes(";") ? ";" : "";
  if (!sep) return null;
  const head = splitRow(lines[0], sep).map((h) => h.toLowerCase());
  const col = (re: RegExp) => head.findIndex((h) => re.test(h));
  const name = col(/^(full\s*)?name$|^guests?(\s*name)?$|^names?$/);
  const first = col(/^first(\s*name)?$|^given/);
  const last = col(/^(last|sur)(\s*name)?$|^family\s*name$/);
  if (name < 0 && first < 0) return null;
  const group = col(/^(group|category|table\s*group|relation(ship)?|circle)$/);
  const household = col(/^(household|party|family|invitation|invite)$/);
  const side = col(/^side$/);
  const meal = col(/^(meal|menu|entr[eé]e|food|dietary|diet)$/);
  const pax = col(/^(pax|seats?|party\s*size|size|count|guests?\s*count|no\.?\s*of\s*guests)$/);

  const groups = new Map(existing);
  const result: ParseResult = { groups: [], guests: [], parties: [], duplicates: 0, wantTable: {} };
  const tableCol = col(/^(table|table\s*(no\.?|number|#)|mesa|seat(ing)?\s*table)$/);
  const seen = new Set<string>();
  for (const line of lines.slice(1)) {
    if (!line.trim()) continue;
    const c = splitRow(line, sep);
    let full = name >= 0 ? c[name] : [c[first], last >= 0 ? c[last] : ""].filter(Boolean).join(" ");
    if (!full?.trim()) continue;
    // "Reyes, Ana" in a name column is last name first.
    const lf = full.match(/^([^,&/+]{2,40}),\s*([^,&/+]{2,40})$/);
    if (lf && lf[1].trim().split(/\s+/).length <= 3 && lf[2].trim().split(/\s+/).length <= 3) full = `${lf[2].trim()} ${lf[1].trim()}`;
    const sideTxt = side >= 0 ? c[side] : "";
    const gName = (group >= 0 && group !== side ? c[group] : "") || "";
    const sideCat = /groom/i.test(sideTxt) ? "groom" : /bride/i.test(sideTxt) ? "bride" : null;
    const g = gName ? ensureGroup(groups, result, cleanHeading(gName), inferCategory(gName, sideCat)) : sideTxt ? ensureGroup(groups, result, cleanHeading(sideTxt), inferCategory(sideTxt, sideCat)) : null;
    const partyKey = household >= 0 && c[household] ? `h:${c[household].toLowerCase()}` : uid("p");
    const parsed = parseParty(full);
    const size = pax >= 0 ? Number(c[pax]) : NaN;
    if (Number.isFinite(size) && size > parsed.people.length + parsed.kids + parsed.extra) parsed.extra = size - parsed.people.length - parsed.kids;
    const before = result.guests.length;
    addParty(result, seen, full, parsed, g, partyKey, meal >= 0 ? c[meal] : undefined);
    const want = tableCol >= 0 ? tableLabelOf(c[tableCol] ?? "") : null;
    if (want) for (const gu of result.guests.slice(before)) result.wantTable[gu.id] = want;
  }
  return result;
}

function ensureGroup(groups: Map<string, Group>, result: ParseResult, name: string, cat: Category): Group {
  const key = name.toLowerCase();
  let g = groups.get(key);
  if (!g) {
    g = { id: uid("g"), name, cat };
    groups.set(key, g);
    result.groups.push(g);
  }
  return g;
}

/** "Table 5", "T5", "#5", "5", "Presidential table", "VIP" → the label to look for. */
export function tableLabelOf(raw: string): string | null {
  const s = raw.trim().replace(/[:\-–—.)]+$/, "").trim();
  if (!s) return null;
  const n = s.match(/^(?:table|mesa|tbl\.?|t)?\s*(?:no\.?|#)?\s*(\d{1,3}[a-z]?)$/i);
  if (n) return n[1].toUpperCase();
  const named = s.match(/^(.{2,30}?)\s+table$/i);
  if (named) return cleanHeading(named[1]);
  if (/^[A-Z]{2,4}$/.test(s)) return s;
  return s.length <= 30 ? cleanHeading(s) : null;
}

// "TABLE 5: Tito Ben, Tita Marie" or "Table 5" on its own line (then the names under it).
const TABLE_LINE = /^(?:(?:table|mesa|tbl\.?)\s*(?:no\.?|#)?\s*(\d{1,3}[a-z]?)|t(\d{1,3})(?=\s*[:\-–—])|([\p{L} ]{2,30}?)\s+table)\s*[:\-–—.)]?\s*(.*)$/iu;

function addParty(result: ParseResult, seen: Set<string>, line: string, p: ReturnType<typeof parseParty>, group: Group | null, party: string, meal?: string) {
  const names: string[] = [];
  const lead = p.people[0] ? coreWords(p.people[0])[0] ?? p.people[0] : "Guest";
  const senior = /\b(lola|lolo|inang|amang|nanay|tatay)\b/i;
  const vip = /\b(ninong|ninang)\b/i;
  for (const person of p.people) {
    const k = normName(person);
    if (k && seen.has(k) && !/·\s*\d+$/.test(person)) {
      result.duplicates++;
      continue;
    }
    if (k) seen.add(k);
    const tags: Guest["tags"] = [];
    if (senior.test(person)) tags.push("senior");
    if (vip.test(person)) tags.push("vip");
    result.guests.push({ id: uid("u"), name: person.slice(0, 120), groupId: group?.id ?? null, party, tableId: null, seat: null, ...(tags.length ? { tags } : {}), ...(meal ? { meal: meal.slice(0, 60) } : {}) });
    names.push(person);
  }
  for (let i = 0; i < p.kids; i++) {
    const n = `${lead}’s kid${p.kids > 1 ? ` ${i + 1}` : ""}`;
    result.guests.push({ id: uid("u"), name: n, groupId: group?.id ?? null, party, tableId: null, seat: null, tags: ["kid"] });
    names.push(n);
  }
  for (let i = 0; i < p.extra; i++) {
    const n = `Guest of ${lead}${p.extra > 1 ? ` ${i + 1}` : ""}`;
    result.guests.push({ id: uid("u"), name: n, groupId: group?.id ?? null, party, tableId: null, seat: null, tags: ["plusone"] });
    names.push(n);
  }
  if (names.length) result.parties.push({ line, people: names, group: group?.name ?? null });
}

/** Text from anywhere → groups and guests. `existing` reuses groups the chart already has
 *  and skips people already on it. */
export function parseGuestText(text: string, existing: { groups: Group[]; guests: Guest[] } = { groups: [], guests: [] }): ParseResult {
  const lines = text
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((l) => l.replace(CHAT_PREFIX, "").replace(/ /g, " "));
  const firstReal = lines.findIndex((l) => l.trim());
  const groupMap = new Map(existing.groups.map((g) => [g.name.toLowerCase(), g]));

  if (firstReal >= 0) {
    const sheet = parseSheet(lines.slice(firstReal), groupMap);
    if (sheet) return dedupeAgainst(sheet, existing.guests);
  }

  const result: ParseResult = { groups: [], guests: [], parties: [], duplicates: 0, wantTable: {} };
  const seen = new Set<string>();
  let side: "bride" | "groom" | null = null;
  let group: Group | null = null;
  let table: string | null = null;
  const addFor = (line: string, party: ReturnType<typeof parseParty>, g: Group | null, at: string | null) => {
    const before = result.guests.length;
    addParty(result, seen, line, party, g, uid("p"));
    if (at) for (const gu of result.guests.slice(before)) result.wantTable[gu.id] = at;
  };
  for (const raw of lines) {
    const line = tidy(raw.replace(BULLET, ""));
    if (!line || !/[\p{L}\d]/u.test(line)) continue;
    const tl = line.match(TABLE_LINE);
    if (tl) {
      const label = tl[1] ? tl[1].toUpperCase() : tl[2] ? tl[2] : cleanHeading(tl[3]);
      const rest = tl[4]?.trim() ?? "";
      if (rest && /\p{L}/u.test(rest)) {
        // Everyone on the line sits there; each name (or "Ben & Marie") is its own household.
        for (const part of rest.split(/\s*[,;]\s*/)) if (/\p{L}/u.test(part)) addFor(line, parseParty(part), group, label);
        table = null;
      } else table = label;
      continue;
    }
    if (!/\p{L}/u.test(line)) continue;
    if (isHeading(line)) {
      table = null;
      const h = cleanHeading(line);
      if (/\bbride\b|bride'?s/i.test(h)) side = "bride";
      else if (/\bgroom\b|groom'?s/i.test(h)) side = "groom";
      // A bare "Bride's side" heading sets the side; the next heading names the group.
      const cat = inferCategory(h, side);
      group = ensureGroup(groupMap, result, h, cat);
      continue;
    }
    let g = group;
    // "Mendoza cousins: Patrick, Jessa, Arvin" — a label, then the people.
    const inline = line.match(/^([^:：]{2,40})[:：]\s*(.+)$/);
    if (inline && inline[1].trim().split(/\s+/).length <= 4 && /\p{L}/u.test(inline[2])) {
      const label = cleanHeading(inline[1]);
      const c = inferCategory(label, side);
      // "Cousins:" under GROOM'S FAMILY stays on the groom's side.
      g = ensureGroup(groupMap, result, label, (c === "other" || c === "family") && group ? group.cat : c);
      const party = parseParty(inline[2]);
      // "Mendoza cousins: Patrick, Jessa" → Patrick Mendoza, Jessa Mendoza.
      const surname = inline[1].trim().split(/\s+/).filter((w) => !/^(cousins?|family|families|siblings|kids|titos?|titas?|clan|the|relatives|side)$/i.test(w));
      if (surname.length === 1 && /^\p{Lu}/u.test(surname[0])) party.people = party.people.map((n) => (coreWords(n).length === 1 ? `${n} ${surname[0]}` : n));
      addFor(line, party, g, table);
      continue;
    }
    // Sponsors listed without a heading still sit together.
    if (!g && /\b(ninong|ninang)\b/i.test(line)) g = ensureGroup(groupMap, result, "Principal sponsors", "vip");
    addFor(line, parseParty(line), g, table);
  }
  // Groups that ended up empty (a heading followed by another heading) are dropped.
  const used = new Set(result.guests.map((g) => g.groupId));
  result.groups = result.groups.filter((g) => used.has(g.id));
  return dedupeAgainst(result, existing.guests);
}

function dedupeAgainst(r: ParseResult, current: Guest[]): ParseResult {
  if (!current.length) return r;
  const have = new Set(current.map((g) => normName(g.name)));
  const keep = r.guests.filter((g) => {
    const k = normName(g.name);
    const dup = k && have.has(k) && !g.tags?.includes("plusone") && !g.tags?.includes("kid") && !/·\s*\d+$/.test(g.name);
    if (dup) r.duplicates++;
    return !dup;
  });
  return { ...r, guests: keep };
}

export const SAMPLE_LIST = `PRINCIPAL SPONSORS
Ninong Ben & Ninang Marie Tan
Ninong Jun & Ninang Liza Cruz
Ninong Rod & Ninang Grace Lim
Ninong Art & Ninang Joy Uy

SECONDARY SPONSORS
Paolo & Bea Santos (cord)
Carlo & Mika Reyes (veil)

ENTOURAGE
Sofia Cruz, Marco Villa, Kat Santos, Rafa Reyes, Nikki Ramos, JP Ocampo

BRIDE'S FAMILY
Tito Boy & Tita Nora Santos + 2 kids
Tito Jun & Tita Weng Santos
Lola Cora Santos
Dela Cruz family (6)
Tita Baby Hill + Greg Hill

GROOM'S FAMILY
Tito Nestor & Tita Belen Reyes + 3 kids
Tito Rudy & Tita Gina Reyes
Mendoza cousins: Patrick, Jessa, Arvin, Cheska
Lolo Pedring Reyes

FRIENDS
Bianca Lopez +1
Chino Ramos, Dani Uy, Ella Sison, Franco Lim
Gabby Yap & Hans Ty
Isa Co +1

OFFICE MATES
Arnel Cruz, Bryan Sy, Carla Tan, Dennis Yu, Elaine Ko, Faye Chan`;
