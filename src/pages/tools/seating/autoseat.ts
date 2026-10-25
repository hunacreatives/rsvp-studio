import { freeSeats, occupancy, type Category, type Chart, type Guest, type Table } from "./model";

// Seat everyone: households never split (unless one is bigger than any table), groups stay
// at as few neighbouring tables as possible and are shared out evenly between them (21
// cousins at 7, 7 and 7, never 10, 10 and one alone), tables meant for a category ("Sponsors",
// "Bride’s side") get that category first, and nobody at a locked or spare table moves.
// Seniors and guests who need easy access sit near the exits, away from the speakers.
//
// It works in two passes. The first seats each group in turn at the best table left. The
// second looks at the whole plan and moves or swaps households wherever that leaves fewer
// groups split, fewer people sitting without anyone they know, and fewer mixed tables.
// Returns the moves in the order to show them, and plain lines saying what it did.

export interface SeatPlan {
  moves: { guestId: string; tableId: string; seat: number }[];
  /** Why each guest went where they did, for the guest card. */
  reasons: Record<string, string>;
  notes: string[];
  unplaced: number;
  tablesNeeded: number;
}

const RANK: Record<Category, number> = { vip: 0, court: 1, entourage: 2, family: 3, bride: 3, groom: 3, kids: 5, friends: 6, work: 7, other: 8 };
const KIDS = "kids:";

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

/** The same "random" choices every time for the same plan, so pressing it twice agrees. */
function rng(seed: number) {
  let a = seed >>> 0 || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A household (or a must-sit-together pair of them, or one household's kids) seated as one. */
interface Unit {
  people: Guest[];
  gk: string;
  cat: Category;
  side?: "bride" | "groom";
  /** Seniors or guests who need easy access. */
  care: number;
  table: string | null;
  /** Part of a household too big for one table: left where the first pass put it. */
  fixed?: boolean;
}

export function planSeating(chart: Chart, opts: { reseat?: boolean; /** The second pass; off only to compare. */ polish?: boolean } = {}): SeatPlan {
  const prefs = chart.prefs ?? {};
  const spareSeats = prefs.spare ?? 0;
  const kidsTable = prefs.kids === "table";
  const mixSides = prefs.sides === "mix";
  const careOn = prefs.care !== false;

  const tables = chart.tables;
  const byTable = new Map(tables.map((t) => [t.id, t]));
  const locked = new Set(tables.filter((t) => t.locked).map((t) => t.id));
  // Guests who replied they can't come are left out, and their seats count as free.
  const guests: Guest[] = chart.guests
    .filter((g) => g.reply !== "no")
    .map((g) => (opts.reseat && g.tableId && !locked.has(g.tableId) ? { ...g, tableId: null, seat: null } : { ...g }));
  const occ = occupancy({ ...chart, guests });
  const open = tables.filter((t) => !locked.has(t.id) && !t.spare);
  const groupCat = new Map(chart.groups.map((g) => [g.id, g.cat]));
  // The side a group sits on: bride/groom groups, or another kind marked for a side ("Officemates (bride)").
  const groupSide = new Map(chart.groups.map((g) => [g.id, g.side ?? (g.cat === "bride" || g.cat === "groom" ? g.cat : undefined)]));
  // Seats held back for walk-ins: only at ordinary guest tables, never the couple's or the sponsors'.
  const holdsBack = (t: Table) => spareSeats > 0 && t.seats >= 6 && t.shape !== "head" && t.shape !== "sweetheart" && t.cat !== "vip";
  const typicalSeats = (() => {
    const s = open.filter((t) => !t.cat).map((t) => t.seats - (holdsBack(t) ? spareSeats : 0)).sort((a, b) => a - b);
    return s.length ? s[Math.floor(s.length / 2)] : 10;
  })();
  const groupName = new Map(chart.groups.map((g) => [g.id, g.name.toLowerCase()]));
  const KEY = /(secondary|sponsor|entourage|roses|candles|treasures|family|friends|office|work)/g;
  const dj = chart.objects.find((o) => o.type === "dj");
  const ways = chart.objects.filter((o) => o.type === "exit" || o.type === "entrance" || o.type === "restroom");
  const toWay = (t: Table) => (ways.length ? Math.min(...ways.map((o) => dist(o, t))) : 0);
  const frontY = Math.min(...tables.map((t) => t.y), 0);

  // Free seats at each table, less the ones kept for walk-ins.
  const free = new Map(
    open.map((t) => {
      const f = freeSeats(t, occ.get(t.id) ?? []);
      return [t.id, holdsBack(t) ? f.slice(0, Math.max(0, f.length - spareSeats)) : f];
    }),
  );
  const capacity = new Map([...free].map(([id, f]) => [id, f.length]));

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
  const gkOf = (g: Guest) => (kidsTable && g.tags?.includes("kid") ? KIDS : (g.groupId ?? `p:${g.party}`));
  const groupsAt = new Map<string, Set<string>>(); // table → groups seated there
  for (const t of tables) groupsAt.set(t.id, new Set((occ.get(t.id) ?? []).map(gkOf)));
  const countAt = new Map<string, Map<string, number>>(); // table → group → people
  const bump = (tid: string, gk: string, n: number) => {
    const m = countAt.get(tid) ?? new Map<string, number>();
    m.set(gk, (m.get(gk) ?? 0) + n);
    countAt.set(tid, m);
  };
  for (const t of tables) for (const g of occ.get(t.id) ?? []) bump(t.id, gkOf(g), 1);

  // Units: households of people without a seat, gathered by group. With a kids' table, a
  // household's kids are their own unit in the kids' group.
  const unseated = guests.filter((g) => !g.tableId);
  const byGroup = new Map<string, Map<string, Guest[]>>();
  const unitGroup = new Map<string, string>(); // a joined unit sits with its first member's group
  for (const g of unseated) {
    const kid = kidsTable && g.tags?.includes("kid");
    const unit = kid ? `${KIDS}${find(g.party)}` : find(g.party);
    if (!unitGroup.has(unit)) unitGroup.set(unit, kid ? KIDS : (g.groupId ?? `p:${g.party}`));
    const gk = unitGroup.get(unit)!;
    if (!byGroup.has(gk)) byGroup.set(gk, new Map());
    const parties = byGroup.get(gk)!;
    if (!parties.has(unit)) parties.set(unit, []);
    parties.get(unit)!.push(g);
  }
  const catOf = (gk: string): Category => (gk === KIDS ? "kids" : gk.startsWith("p:") ? "other" : (groupCat.get(gk) ?? "other"));
  const sideOf = (gk: string) => (mixSides || gk === KIDS || gk.startsWith("p:") ? undefined : groupSide.get(gk));
  const order = [...byGroup.entries()].sort((a, b) => {
    const r = RANK[catOf(a[0])] - RANK[catOf(b[0])];
    if (r) return r;
    const size = (m: Map<string, Guest[]>) => [...m.values()].reduce((s, p) => s + p.length, 0);
    return size(b[1]) - size(a[1]);
  });
  const careCount = (people: Guest[]) => (careOn ? people.filter((g) => g.tags?.includes("senior") || g.tags?.includes("access")).length : 0);

  const units: Unit[] = [];
  let splitParties = 0;
  let unplaced = 0;

  // ---- first pass: each group in turn, at the best table left ----
  for (const [gk, parties] of order) {
    const cat = catOf(gk);
    const side = sideOf(gk);
    const list = [...parties.values()].sort((a, b) => b.length - a.length);
    // A group too big for one table is shared out evenly: this many tables, about this many at each.
    const groupSize = list.reduce((n, p) => n + p.length, 0);
    const spread = Math.ceil(groupSize / Math.max(2, typicalSeats));
    const share = spread > 1 ? Math.ceil(groupSize / spread) : Infinity;
    let remaining = groupSize; // this group's people not seated yet

    const score = (t: Table, size: number, people: Guest[]) => {
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
      if (t.side && side) s += t.side === side ? 350 : -350;
      // Past its share at this table: the rest go to the group's next table instead.
      const mineHere = countAt.get(t.id)?.get(gk) ?? 0;
      if (mineHere + size > share) s -= 900 * Math.min(4, mineHere + size - share);
      // Starting a group at a table: one with room for all of it (or its share) keeps it whole.
      if (!mineHere) {
        const want = Math.min(remaining, share);
        s += Math.min(f, want) * 40;
        if (f < want) s -= (want - f) * 60;
      }
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
      const c = careCount(people);
      if (c) {
        // Within 7 m of the speakers is too loud for a lolo: a strong push away, not a nudge.
        if (dj && dist(t, dj) < 700) s -= 1600 * c;
        s -= (toWay(t) / 15) * c;
      }
      return s;
    };

    const placeOn = (t: Table, people: Guest[], fixed = false) => {
      const f = free.get(t.id)!;
      for (const g of people) at.set(g.id, t.id);
      f.splice(0, people.length); // seat numbers are given out at the end
      groupsAt.get(t.id)!.add(gk);
      bump(t.id, gk, people.length);
      remaining -= people.length;
      units.push({ people, gk, cat, side, care: careCount(people), table: t.id, fixed });
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
        placeOn(t, left.slice(0, n), true);
        left = left.slice(n);
        used++;
      }
      if (used > 1) splitParties++;
      unplaced += left.length;
    }
  }

  // ---- second pass: move or swap households wherever the whole plan reads better ----
  // Who was already seated (and stays): per table, how many of each group.
  const base = new Map<string, Map<string, number>>();
  for (const t of tables) {
    const m = new Map<string, number>();
    for (const g of occ.get(t.id) ?? []) m.set(gkOf(g), (m.get(gkOf(g)) ?? 0) + 1);
    base.set(t.id, m);
  }
  const groupTotal = new Map<string, number>();
  for (const m of base.values()) for (const [gk, n] of m) groupTotal.set(gk, (groupTotal.get(gk) ?? 0) + n);
  for (const u of units) groupTotal.set(u.gk, (groupTotal.get(u.gk) ?? 0) + u.people.length);
  const unitOf = new Map<string, Unit>();
  for (const u of units) for (const g of u.people) unitOf.set(g.id, u);
  const fixedAt = new Map(guests.filter((g) => g.tableId).map((g) => [g.id, g.tableId!]));
  const tableOf = (id: string) => unitOf.get(id)?.table ?? fixedAt.get(id) ?? null;
  const ruleList = (chart.rules ?? []).filter((r) => unitOf.has(r.a) || unitOf.has(r.b));

  /** What's wrong with the plan, as one number: lower is better. */
  const cost = () => {
    let c = 0;
    const per = new Map<string, Map<string, number>>();
    for (const [tid, m] of base) per.set(tid, new Map(m));
    for (const u of units) {
      if (!u.table) continue;
      const m = per.get(u.table)!;
      m.set(u.gk, (m.get(u.gk) ?? 0) + u.people.length);
    }
    // Groups: as few tables as their size needs, close together, nobody alone.
    const where = new Map<string, string[]>();
    for (const [tid, m] of per) {
      let groups = 0;
      for (const [gk, n] of m) {
        if (!n) continue;
        groups++;
        if (gk.startsWith("p:")) continue;
        (where.get(gk) ?? where.set(gk, []).get(gk)!).push(tid);
        if (n === 1 && (groupTotal.get(gk) ?? 0) > 1) c += 420;
      }
      if (groups > 1) c += 80 * (groups - 1);
    }
    for (const [gk, tids] of where) {
      const need = Math.ceil((groupTotal.get(gk) ?? 1) / Math.max(2, typicalSeats));
      if (tids.length > need) c += 480 * (tids.length - need);
      if (tids.length > 1) {
        const ts = tids.map((id) => byTable.get(id)!);
        const cx = ts.reduce((a, t) => a + t.x, 0) / ts.length;
        const cy = ts.reduce((a, t) => a + t.y, 0) / ts.length;
        c += ts.reduce((a, t) => a + Math.hypot(t.x - cx, t.y - cy), 0) / 6;
      }
    }
    for (const u of units) {
      if (!u.table) continue;
      const t = byTable.get(u.table)!;
      const n = u.people.length;
      if (t.cat && t.cat !== u.cat) c += (u.cat === "family" && (t.cat === "bride" || t.cat === "groom") ? 80 : 320) * n;
      if (t.side && u.side && t.side !== u.side) c += 260 * n;
      if (RANK[u.cat] <= 3) c += ((t.y - frontY) / 30) * n;
      if (u.care) {
        if (dj && dist(t, dj) < 700) c += 1600 * u.care;
        c += (toWay(t) / 20) * u.care;
      }
    }
    // A table under half full looks forgotten in the photos: fill tables before spreading out.
    for (const t of open) {
      const n = [...(per.get(t.id)?.values() ?? [])].reduce((a, b) => a + b, 0);
      const half = (capacity.get(t.id)! + (t.seats - capacity.get(t.id)!)) / 2;
      if (n > 0 && n < half) c += (half - n) * 110;
    }
    for (const r of ruleList) {
      const a = tableOf(r.a);
      const b = tableOf(r.b);
      if (!a || !b) continue;
      if (r.kind === "apart" && a === b) c += r.must ? 1e6 : 1500;
      if (r.kind === "together" && a !== b) c += r.must ? 4000 : 600;
    }
    return c;
  };

  const load = new Map(open.map((t) => [t.id, 0]));
  for (const u of units) if (u.table) load.set(u.table, (load.get(u.table) ?? 0) + u.people.length);
  const room = (tid: string) => capacity.get(tid)! - load.get(tid)!;
  const movable = units.filter((u) => u.table && !u.fixed);
  if (opts.polish !== false && movable.length > 1 && open.length > 1) {
    const rand = rng(chart.guests.length * 31 + chart.tables.length * 7 + (chart.rules?.length ?? 0));
    let now = cost();
    const started = performance.now();
    const tries = Math.min(9000, movable.length * 90);
    for (let i = 0; i < tries && performance.now() - started < 220; i++) {
      const u = movable[Math.floor(rand() * movable.length)];
      const from = u.table!;
      const to = open[Math.floor(rand() * open.length)].id;
      if (to === from) continue;
      const n = u.people.length;
      if (room(to) >= n) {
        u.table = to;
        load.set(from, load.get(from)! - n);
        load.set(to, load.get(to)! + n);
        const next = cost();
        if (next < now - 0.5) now = next;
        else {
          u.table = from;
          load.set(from, load.get(from)! + n);
          load.set(to, load.get(to)! - n);
        }
        continue;
      }
      // No room: swap with a household there that fits where this one was.
      const there = movable.filter((v) => v.table === to && v.people.length <= n + room(from) && n <= v.people.length + room(to));
      if (!there.length) continue;
      const v = there[Math.floor(rand() * there.length)];
      const m = v.people.length;
      u.table = to;
      v.table = from;
      load.set(from, load.get(from)! - n + m);
      load.set(to, load.get(to)! + n - m);
      const next = cost();
      if (next < now - 0.5) now = next;
      else {
        u.table = from;
        v.table = to;
        load.set(from, load.get(from)! + n - m);
        load.set(to, load.get(to)! - n + m);
      }
    }
  }

  // ---- seat numbers: each table's households side by side, a group's together ----
  const groupOrder = new Map(order.map(([gk], i) => [gk, i]));
  const moves: SeatPlan["moves"] = [];
  const seatsLeft = new Map(
    open.map((t) => {
      const f = freeSeats(t, occ.get(t.id) ?? []);
      return [t.id, holdsBack(t) ? f.slice(0, Math.max(0, f.length - spareSeats)) : f];
    }),
  );
  const placedAt = new Map<string, Unit[]>();
  for (const u of units) if (u.table) (placedAt.get(u.table) ?? placedAt.set(u.table, []).get(u.table)!).push(u);
  const seatOf = new Map<string, number>();
  for (const [tid, us] of placedAt) {
    const t = byTable.get(tid)!;
    const f = seatsLeft.get(tid)!;
    us.sort((a, b) => (groupOrder.get(a.gk) ?? 0) - (groupOrder.get(b.gk) ?? 0) || b.people.length - a.people.length);
    for (const u of us) {
      const run = seatRun(t, f, u.people.length);
      u.people.forEach((g, i) => {
        seatOf.set(g.id, run[i]);
        f.splice(f.indexOf(run[i]), 1);
      });
    }
  }
  // Shown group by group, the way the first pass seated them.
  for (const u of [...units].sort((a, b) => (groupOrder.get(a.gk) ?? 0) - (groupOrder.get(b.gk) ?? 0)))
    for (const g of u.people) if (u.table && seatOf.has(g.id)) moves.push({ guestId: g.id, tableId: u.table, seat: seatOf.get(g.id)! });

  // ---- why each guest sits where they do ----
  const finalTable = new Map(guests.map((g) => [g.id, g.tableId]));
  for (const m of moves) finalTable.set(m.guestId, m.tableId);
  const finalCount = new Map<string, Map<string, number>>();
  for (const g of guests) {
    const tid = finalTable.get(g.id);
    if (!tid) continue;
    const m = finalCount.get(tid) ?? finalCount.set(tid, new Map()).get(tid)!;
    m.set(gkOf(g), (m.get(gkOf(g)) ?? 0) + 1);
  }
  const reasons: Record<string, string> = {};
  for (const u of units) {
    if (!u.table) continue;
    const t = byTable.get(u.table)!;
    const gname = u.gk === KIDS ? null : chart.groups.find((x) => x.id === u.gk)?.name;
    const mates = (finalCount.get(t.id)?.get(u.gk) ?? 0) - u.people.length;
    const why =
      u.gk === KIDS
        ? "At the kids’ table"
        : t.cat && t.cat === u.cat && t.note
          ? `At the ${t.note.toLowerCase()} table`
          : gname && mates > 0
            ? `With ${mates} more of ${gname}`
            : t.side && t.side === u.side
              ? `On the ${u.side === "bride" ? "bride’s" : "groom’s"} side${gname ? `, with ${gname}` : ""}`
              : gname
                ? `With ${gname}`
                : "Where there was room";
    for (const g of u.people) {
      const links = partners.get(g.id) ?? [];
      const extra = [
        u.people.length > 1 ? (u.gk === KIDS ? "with their brothers and sisters" : "next to their household") : "",
        links.some((l) => l.kind === "apart") && !links.some((l) => l.kind === "apart" && finalTable.get(l.other) === t.id) ? "kept apart as you asked" : "",
        links.some((l) => l.kind === "together" && finalTable.get(l.other) === t.id) ? "with who you asked" : "",
        careOn && (g.tags?.includes("senior") || g.tags?.includes("access")) && ways.length && toWay(t) < 900 ? "close to the way out" : "",
        careOn && g.tags?.includes("senior") && dj && dist(t, dj) >= 700 ? "away from the speakers" : "",
      ].filter(Boolean);
      reasons[g.id] = [why, ...extra].join(" · ");
    }
  }

  // ---- notes for the host ----
  const notes: string[] = [];
  const seatedNow = moves.length;
  const groupIds = new Set(unseated.map((g) => g.groupId).filter(Boolean) as string[]);
  let together = 0;
  for (const id of groupIds) {
    const members = guests.filter((g) => g.groupId === id && !(kidsTable && g.tags?.includes("kid")));
    if (!members.length) continue;
    const ts = new Set(members.map((g) => finalTable.get(g.id)).filter(Boolean));
    if (ts.size <= Math.ceil(members.length / Math.max(2, typicalSeats))) together++;
  }
  if (seatedNow) notes.push(`Seated ${seatedNow} ${seatedNow === 1 ? "guest" : "guests"}`);
  if (groupIds.size) notes.push(together === groupIds.size ? `Kept all ${groupIds.size} groups together` : `Kept ${together} of ${groupIds.size} groups together`);
  notes.push(splitParties ? `${splitParties} household${splitParties > 1 ? "s were" : " was"} too big for one table` : "Every household sits together");
  // Only said when it's true: nobody in a group of two or more is the only one of it at their table.
  let alone = 0;
  for (const m of finalCount.values()) for (const [gk, n] of m) if (n === 1 && !gk.startsWith("p:") && (groupTotal.get(gk) ?? 0) > 1) alone++;
  if (seatedNow && !alone) notes.push("Everyone sits with someone from their group");
  if (kidsTable && units.some((u) => u.gk === KIDS && u.table)) notes.push("Kids together at their own table");
  if (spareSeats && open.some(holdsBack)) notes.push(spareSeats === 1 ? "One seat kept free at each table for walk-ins" : "Two seats kept free at each table for walk-ins");
  const spareTables = tables.filter((t) => t.spare).length;
  if (spareTables) notes.push(spareTables === 1 ? "The spare table was left empty" : `${spareTables} spare tables left empty`);
  if (locked.size) notes.push(locked.size > 1 ? `${locked.size} tables kept their guests` : "1 table kept its guests");
  // Only said when it's true: no senior is within 7 m of the speakers.
  const seniorTables = guests.filter((g) => g.tags?.includes("senior")).map((g) => finalTable.get(g.id));
  if (careOn && dj && seniorTables.length && units.some((u) => u.care)) {
    const near = new Set(tables.filter((t) => dist(t, dj) < 700).map((t) => t.id));
    if (seniorTables.every((t) => t && !near.has(t))) notes.push(ways.length ? "Lolos and lolas near the exits, away from the speakers" : "Lolos and lolas seated away from the speakers");
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
  const tablesNeeded = unplaced ? Math.ceil(unplaced / Math.max(2, seats10 - spareSeats)) : 0;
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
