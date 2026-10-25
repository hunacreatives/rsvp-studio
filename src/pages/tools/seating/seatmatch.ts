import { isHonorific, type Chart, type Guest } from "./model";

// Mesa's households ↔ the event's invite list, by name (for website.ts): "Tito Ben & Tita
// Marie Santos + 2 kids" on the list is the household with Ben Santos and Marie Santos.

export interface Invitee {
  id: string;
  name: string;
  party_size: number | null;
  table_label: string | null;
  contact?: string | null;
  token?: string | null;
}

export const words = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9ñ ]+/g, " ")
    .split(/\s+/)
    .filter((w) => w && !isHonorific(w));

/** The people on an invite-list line: "Tito Ben & Tita Marie Santos + 2 kids" → ben santos, marie santos. */
export function linePeople(name: string) {
  const clean = name.replace(/\s*(\+.*|\(.*\))$/, "");
  const parts = clean.split(/\s*(?:&|\+|,|\/|\band\b)\s*/i).map(words).filter((p) => p.length);
  const last = parts.length ? parts[parts.length - 1][parts[parts.length - 1].length - 1] : "";
  return parts.map((p) => ({ first: p[0], last: p.length > 1 ? p[p.length - 1] : last }));
}

/** A household as it would read on an invite list: "Tito Ben & Tita Marie Santos". */
export function householdLine(people: Guest[]) {
  const named = people.filter((g) => !g.tags?.includes("kid") && !g.tags?.includes("plusone"));
  const list = named.length ? named : people;
  const last = (n: string) => n.trim().split(/\s+/).pop() ?? "";
  const sameSurname = list.length > 1 && list.every((g) => last(g.name).toLowerCase() === last(list[0].name).toLowerCase() && g.name.trim().split(/\s+/).length > 1);
  const base = sameSurname ? `${list.map((g) => g.name.trim().split(/\s+/).slice(0, -1).join(" ")).join(" & ")} ${last(list[0].name)}` : list.map((g) => g.name).join(" & ");
  const extra = people.length - list.length;
  return (base + (extra ? ` + ${extra}` : "")).slice(0, 120);
}

export interface SeatMatch {
  /** Households on the invite list (by `party`), and the table they're given. */
  matched: { invitee: Invitee; table: string; household: string; party: string }[];
  /** Seated households not on the invite list. */
  missing: { line: string; size: number; table: string; party: string }[];
  /** Invite-list lines Mesa has no seat for. */
  unseated: Invitee[];
}

/** Households (by `party`) ↔ invite-list lines: by the saved link first (Guest.inviteeId),
 *  then by first and last names in common. Guests who can't come aren't sent. */
export function matchSeats(chart: Chart, invitees: Invitee[]): SeatMatch {
  const tables = new Map(chart.tables.map((t) => [t.id, t]));
  const parties = new Map<string, Guest[]>();
  // The couple (or debutante) aren't guests on their own invite list.
  const honoured = new Set(chart.groups.filter((g) => g.cat === "vip" && /^(the couple|debutante)$/i.test(g.name)).map((g) => g.id));
  for (const g of chart.guests) if (g.tableId && tables.has(g.tableId) && g.reply !== "no" && !(g.groupId && honoured.has(g.groupId))) (parties.get(g.party) ?? parties.set(g.party, []).get(g.party)!).push(g);
  const tableOf = (ps: Guest[]) => {
    const n = new Map<string, number>();
    for (const g of ps) n.set(g.tableId!, (n.get(g.tableId!) ?? 0) + 1);
    return tables.get([...n].sort((a, b) => b[1] - a[1])[0][0])!.label;
  };
  const households = [...parties.values()].map((ps) => {
    const people = ps.filter((g) => !g.tags?.includes("kid") && !g.tags?.includes("plusone")).map((g) => {
      const w = words(g.name);
      return { first: w[0] ?? "", last: w.length > 1 ? w[w.length - 1] : "" };
    });
    return { ps, people };
  });
  const lines = invitees.map((inv) => ({ inv, people: linePeople(inv.name) }));
  // Every pairing that shares a person (same first and last name), best first.
  const pairs: { h: number; l: number; score: number }[] = [];
  const lineAt = new Map(lines.map((l, i) => [l.inv.id, i]));
  households.forEach((h, hi) => {
    const linked = h.ps.map((g) => (g.inviteeId ? lineAt.get(g.inviteeId) : undefined)).find((x) => x !== undefined);
    if (linked !== undefined) pairs.push({ h: hi, l: linked, score: 1000 });
  });
  households.forEach((h, hi) =>
    lines.forEach((l, li) => {
      let score = 0;
      for (const a of l.people) if (h.people.some((b) => b.first === a.first && (b.last === a.last || !b.last || !a.last))) score += a.last ? 2 : 1;
      if (score >= 2) pairs.push({ h: hi, l: li, score: score - Math.abs(h.people.length - l.people.length) * 0.1 });
    }),
  );
  pairs.sort((a, b) => b.score - a.score);
  const usedH = new Set<number>();
  const usedL = new Set<number>();
  const matched: SeatMatch["matched"] = [];
  for (const p of pairs) {
    if (usedH.has(p.h) || usedL.has(p.l)) continue;
    usedH.add(p.h);
    usedL.add(p.l);
    matched.push({ invitee: lines[p.l].inv, table: tableOf(households[p.h].ps), household: householdLine(households[p.h].ps), party: households[p.h].ps[0].party });
  }
  const missing = households.filter((_, i) => !usedH.has(i)).map((h) => ({ line: householdLine(h.ps), size: h.ps.length, table: tableOf(h.ps), party: h.ps[0].party }));
  const unseated = lines.filter((_, i) => !usedL.has(i)).map((l) => l.inv);
  return { matched, missing, unseated };
}
