import { freeSeats, occupancy, type Category, type Chart, type Guest, type Table } from "./model";

// Seat everyone: households never split (unless one is bigger than any table), groups stay
// at as few neighbouring tables as possible, tables meant for a category ("Sponsors",
// "Bride’s side") get that category first, and nobody at a locked table moves. Seniors are
// kept away from the speakers. Returns the moves in the order to show them, and plain
// lines saying what it did.

export interface SeatPlan {
  moves: { guestId: string; tableId: string; seat: number }[];
  /** Why each guest went where they did, for the guest card. */
  reasons: Record<string, string>;
  notes: string[];
  unplaced: number;
  tablesNeeded: number;
}

const RANK: Record<Category, number> = { vip: 0, court: 1, entourage: 2, family: 3, bride: 3, groom: 3, kids: 5, friends: 6, work: 7, other: 8 };

const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);

/** A run of `n` free seats next to each other (wrapping round a round table). */
function seatRun(t: Table, free: number[], n: number): number[] {
  const set = new Set(free);
  const wrap = t.shape === "round";
  for (let start = 0; start < t.seats; start++) {
    const run: number[] = [];
    for (let k = 0; k < n; k++) {
      const i = start + k;
      if (!wrap && i >= t.seats) break;
      const idx = i % t.seats;
      if (!set.has(idx)) break;
      run.push(idx);
    }
    if (run.length === n) return run;
  }
  return free.slice(0, n);
}

export function planSeating(chart: Chart, opts: { reseat?: boolean } = {}): SeatPlan {
  const tables = chart.tables;
  const locked = new Set(tables.filter((t) => t.locked).map((t) => t.id));
  const guests: Guest[] = chart.guests.map((g) => (opts.reseat && g.tableId && !locked.has(g.tableId) ? { ...g, tableId: null, seat: null } : { ...g }));
  const occ = occupancy({ ...chart, guests });
  const open = tables.filter((t) => !locked.has(t.id));
  const groupCat = new Map(chart.groups.map((g) => [g.id, g.cat]));
  const groupName = new Map(chart.groups.map((g) => [g.id, g.name.toLowerCase()]));
  const KEY = /(secondary|sponsor|entourage|roses|candles|treasures|family|friends|office|work)/g;
  const dj = chart.objects.find((o) => o.type === "dj");
  const frontY = Math.min(...tables.map((t) => t.y), 0);

  const free = new Map(open.map((t) => [t.id, freeSeats(t, occ.get(t.id) ?? [])]));
  // Seating rules: each guest's partners in a rule, and where everyone is so far.
  type Link = { other: string; kind: "together" | "apart"; must: boolean };
  const partners = new Map<string, Link[]>();
  for (const r of chart.rules ?? []) {
    partners.set(r.a, [...(partners.get(r.a) ?? []), { other: r.b, kind: r.kind, must: r.must }]);
    partners.set(r.b, [...(partners.get(r.b) ?? []), { other: r.a, kind: r.kind, must: r.must }]);
  }
  // Must-sit-together people become one unit, like a household.
  const root = new Map<string, string>();
  const find = (p: string): string => {
    const r = root.get(p) ?? p;
    if (r === p) return p;
    const top = find(r);
    root.set(p, top);
    return top;
  };
  const partyOf = new Map(guests.map((g) => [g.id, g.party]));
  for (const r of chart.rules ?? []) {
    if (r.kind !== "together" || !r.must) continue;
    const a = guests.find((g) => g.id === r.a);
    const b = guests.find((g) => g.id === r.b);
    if (a && b && !a.tableId && !b.tableId) root.set(find(partyOf.get(r.a)!), find(partyOf.get(r.b)!));
  }
  const at = new Map<string, string>();
  for (const g of guests) if (g.tableId) at.set(g.id, g.tableId);
  const reasons: Record<string, string> = {};
  const groupsAt = new Map<string, Set<string>>(); // table → groups seated there
  for (const t of tables) groupsAt.set(t.id, new Set((occ.get(t.id) ?? []).map((g) => g.groupId ?? `p:${g.party}`)));

  // Units: households of people without a seat, gathered by group.
  const unseated = guests.filter((g) => !g.tableId);
  const byGroup = new Map<string, Map<string, Guest[]>>();
  const unitGroup = new Map<string, string>(); // a joined unit sits with its first member's group
  for (const g of unseated) {
    const unit = find(g.party);
    if (!unitGroup.has(unit)) unitGroup.set(unit, g.groupId ?? `p:${g.party}`);
    const gk = unitGroup.get(unit)!;
    if (!byGroup.has(gk)) byGroup.set(gk, new Map());
    const parties = byGroup.get(gk)!;
    if (!parties.has(unit)) parties.set(unit, []);
    parties.get(unit)!.push(g);
  }
  const catOf = (gk: string): Category => (gk.startsWith("p:") ? "other" : (groupCat.get(gk) ?? "other"));
  const order = [...byGroup.entries()].sort((a, b) => {
    const r = RANK[catOf(a[0])] - RANK[catOf(b[0])];
    if (r) return r;
    const size = (m: Map<string, Guest[]>) => [...m.values()].reduce((s, p) => s + p.length, 0);
    return size(b[1]) - size(a[1]);
  });

  const moves: SeatPlan["moves"] = [];
  let splitParties = 0;
  let seniors = false;
  let unplaced = 0;

  for (const [gk, parties] of order) {
    const cat = catOf(gk);
    const list = [...parties.values()].sort((a, b) => b.length - a.length);
    const hasSenior = list.some((p) => p.some((g) => g.tags?.includes("senior")));
    if (hasSenior && dj) seniors = true;

    const score = (t: Table, size: number, people: Guest[] = []) => {
      const f = free.get(t.id)!.length;
      if (f < size) return -Infinity;
      let s = 0;
      for (const p of people)
        for (const l of partners.get(p.id) ?? []) {
          const here = at.get(l.other) === t.id;
          if (l.kind === "apart" && here) {
            if (l.must) return -Infinity;
            s -= 5000;
          }
          if (l.kind === "together" && here) s += l.must ? 4000 : 900;
        }
      if (t.cat) s += t.cat === cat ? 1000 : cat === "family" && (t.cat === "bride" || t.cat === "groom") ? 200 : -500;
      // "Secondary sponsors" to the table noted "Secondary sponsors", not "Entourage".
      if (t.note) {
        const want = new Set(groupName.get(gk)?.match(KEY) ?? []);
        if ((t.note.toLowerCase().match(KEY) ?? []).some((w) => want.has(w))) s += 150 * (want.has("secondary") === /secondary/i.test(t.note) ? 2 : 1);
      }
      if (t.side && (cat === "bride" || cat === "groom")) s += t.side === cat ? 350 : -350;
      const here = groupsAt.get(t.id)!;
      if (here.has(gk)) s += 700;
      else s -= 160 * here.size;
      // Next to tables this group already has.
      const mine = tables.filter((o) => o.id !== t.id && groupsAt.get(o.id)!.has(gk));
      if (mine.length) s += Math.max(0, 500 - Math.min(...mine.map((o) => dist(o, t))) / 2);
      // VIPs, the court and family near the front; others don't mind.
      if (RANK[cat] <= 3) s -= (t.y - frontY) / 8;
      else s -= (t.y - frontY) / 40;
      s -= (f - size) * 6;
      if (hasSenior && dj) s -= Math.max(0, 700 - dist(t, dj)) / 2;
      return s;
    };

    for (const party of list) {
      let best: Table | null = null;
      let bestScore = -Infinity;
      for (const t of open) {
        const sc = score(t, party.length, party);
        if (sc > bestScore) {
          bestScore = sc;
          best = t;
        }
      }
      const placeOn = (t: Table, people: Guest[]) => {
        const f = free.get(t.id)!;
        const run = seatRun(t, f, people.length);
        const gname = chart.groups.find((x) => x.id === gk)?.name;
        const why =
          t.cat && t.cat === cat && t.note
            ? `At the ${t.note.toLowerCase()} table`
            : groupsAt.get(t.id)!.has(gk) && gname
              ? `With the rest of ${gname}`
              : t.side && t.side === cat
                ? `On the ${cat === "bride" ? "bride’s" : "groom’s"} side${gname ? `, with ${gname}` : ""}`
                : gname
                  ? `With ${gname}`
                  : "Where there was room";
        people.forEach((g, i) => {
          const seat = run[i];
          moves.push({ guestId: g.id, tableId: t.id, seat });
          at.set(g.id, t.id);
          f.splice(f.indexOf(seat), 1);
          const extra = [people.length > 1 ? "next to their household" : "", (partners.get(g.id) ?? []).some((l) => l.kind === "apart") && !(partners.get(g.id) ?? []).some((l) => l.kind === "apart" && at.get(l.other) === t.id) ? "kept apart as you asked" : "",
            (partners.get(g.id) ?? []).some((l) => l.kind === "together" && at.get(l.other) === t.id) ? "with who you asked" : "", g.tags?.includes("senior") && dj && dist(t, dj) >= 700 ? "away from the speakers" : ""].filter(Boolean);
          reasons[g.id] = [why, ...extra].join(" · ");
        });
        groupsAt.get(t.id)!.add(gk);
      };
      if (best) {
        placeOn(best, party);
        continue;
      }
      // Bigger than any free table: fill the roomiest tables in turn.
      let left = [...party];
      let used = 0;
      const roomy = [...open].sort((a, b) => free.get(b.id)!.length - free.get(a.id)!.length);
      for (const t of roomy) {
        if (!left.length) break;
        const n = Math.min(free.get(t.id)!.length, left.length);
        if (!n) continue;
        placeOn(t, left.slice(0, n));
        left = left.slice(n);
        used++;
      }
      if (used > 1) splitParties++;
      unplaced += left.length;
    }
  }

  // Notes for the host.
  const notes: string[] = [];
  const seatedNow = moves.length;
  const finalTable = new Map(guests.map((g) => [g.id, g.tableId]));
  for (const m of moves) finalTable.set(m.guestId, m.tableId);
  const groupIds = new Set(unseated.map((g) => g.groupId).filter(Boolean) as string[]);
  const cap = Math.max(...tables.map((t) => t.seats), 1);
  let together = 0;
  for (const id of groupIds) {
    const members = guests.filter((g) => g.groupId === id);
    const ts = new Set(members.map((g) => finalTable.get(g.id)).filter(Boolean));
    if (ts.size <= Math.ceil(members.length / cap)) together++;
  }
  if (seatedNow) notes.push(`Seated ${seatedNow} ${seatedNow === 1 ? "guest" : "guests"}`);
  if (groupIds.size) notes.push(together === groupIds.size ? `Kept all ${groupIds.size} groups together` : `Kept ${together} of ${groupIds.size} groups together`);
  notes.push(splitParties ? `${splitParties} household${splitParties > 1 ? "s were" : " was"} too big for one table` : "Every household sits together");
  if (locked.size) notes.push(locked.size > 1 ? `${locked.size} locked tables left as they were` : "The locked table was left as it was");
  // Only said when it's true: no senior is within 7 m of the speakers.
  if (seniors && dj) {
    const near = new Set(tables.filter((t) => dist(t, dj) < 700).map((t) => t.id));
    const seniorTables = guests.filter((g) => g.tags?.includes("senior")).map((g) => finalTable.get(g.id));
    if (seniorTables.length && seniorTables.every((t) => t && !near.has(t))) notes.push("Lolos and lolas seated away from the speakers");
  }
  if (chart.rules?.length) {
    const broken = chart.rules.filter((r) => {
      const a = finalTable.get(r.a);
      const b = finalTable.get(r.b);
      return r.kind === "apart" ? !!a && a === b : !!a && !!b && a !== b;
    }).length;
    const n = chart.rules.length;
    notes.push(broken ? `${broken} of ${n} seating ${n === 1 ? "rule" : "rules"} couldn’t be kept (red tables)` : `Followed ${n === 1 ? "your seating rule" : `all ${n} seating rules`}`);
  }
  const seats10 = Math.max(...tables.map((t) => t.seats), 10);
  const tablesNeeded = unplaced ? Math.ceil(unplaced / seats10) : 0;
  return { moves, reasons, notes, unplaced, tablesNeeded };
}

/** Put a household or group on a table the host tapped. Returns how many didn't fit. */
export function seatOnTable(chart: Chart, guestIds: string[], tableId: string): { moves: SeatPlan["moves"]; overflow: number } {
  const t = chart.tables.find((x) => x.id === tableId);
  if (!t) return { moves: [], overflow: guestIds.length };
  const others = chart.guests.filter((g) => g.tableId === tableId && !guestIds.includes(g.id));
  const free = freeSeats(t, others);
  const run = seatRun(t, free, Math.min(free.length, guestIds.length));
  const moves = guestIds.slice(0, run.length).map((guestId, i) => ({ guestId, tableId, seat: run[i] }));
  return { moves, overflow: guestIds.length - moves.length };
}
