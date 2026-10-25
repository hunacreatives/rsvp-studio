import { footprint, freeSeats, occupancy, ruleBreaks, type Chart, type Guest, type Table } from "./model";
import { itemsOf, nearestGaps } from "./guides";
import { fmtLen, type Units } from "./units";
import { planSeating } from "./autoseat";

// The plan check: Mesa reads its own plan the way a coordinator would and says what to look
// at, most important first, each with a fix when there's a safe one. Nothing here changes the
// plan by itself; a fix is applied (with undo) only when the host taps it.
//   guests without a seat · seating rules not kept · households split between tables ·
//   lolos and lolas near the speakers · a guest who knows nobody at their table · tables over
//   their seats · half-empty tables · more than one empty table · a table marked for one
//   side seating the other · tight walkways (chair back to chair back, and to the walls) and
//   tables that overlap.

export interface Issue {
  id: string;
  /** "fix": worth fixing before printing. "look": worth a look. */
  level: "fix" | "look";
  text: string;
  tableIds: string[];
  fix?: { label: string; apply(c: Chart): void };
}

const SPEAKERS = 700; // cm: the same distance Seat everyone keeps lolos and lolas from the DJ
// Recommended clear space (rental and banquet guides; not a fire code): between the backs of
// chairs at neighbouring tables (the "5 feet between tables" rule, table edge to table edge,
// leaves about 45 cm between Mesa's chairs), and from a chair back to a wall.
export const WALKWAY = 45;
export const WALL_GAP = 75;

export const tableName = (t: Pick<Table, "label">) => (/^\d+[a-z]?$/i.test(t.label) ? `table ${t.label}` : t.label);
const firstName = (g: Guest) => g.name.split(/\s+/).find((w) => !/^(tito|tita|ate|kuya|lola|lolo|ninong|ninang|mr\.?|mrs\.?|ms\.?|dr\.?|dra\.?|atty\.?|engr\.?)$/i.test(w)) ?? g.name;
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
/** "table 3", "tables 1, 3, 4 and 15", "S1 and table 4": numbered tables in order, named ones by name. */
function tablesText(ts: Table[]) {
  const nums = ts.filter((t) => /^\d+[a-z]?$/i.test(t.label)).map((t) => t.label).sort((a, b) => parseInt(a) - parseInt(b));
  const named = ts.filter((t) => !/^\d+[a-z]?$/i.test(t.label)).map((t) => t.label);
  const join = (xs: string[]) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);
  const numPart = nums.length ? `${nums.length > 1 ? "tables" : "table"} ${join(nums)}` : "";
  return join([...named, numPart].filter(Boolean));
}

/** Move these guests to a table, into a run of free seats. */
function moveTo(c: Chart, ids: string[], tableId: string) {
  const t = c.tables.find((x) => x.id === tableId);
  if (!t) return;
  const others = c.guests.filter((g) => g.tableId === tableId && !ids.includes(g.id));
  const free = freeSeats(t, others);
  ids.forEach((id, i) => {
    const g = c.guests.find((x) => x.id === id);
    if (g && free[i] != null) Object.assign(g, { tableId, seat: free[i] });
  });
}

export function checkPlan(plan: Chart, replyIssues: Issue[] = [], units: Units = "m"): Issue[] {
  // Guests who replied they can't come aren't part of the plan any more (their seats are free).
  const chart: Chart = { ...plan, guests: plan.guests.filter((g) => g.reply !== "no") };
  const out: Issue[] = [...replyIssues];
  const occ = occupancy(chart);
  const byTable = new Map(chart.tables.map((t) => [t.id, t]));
  const groupName = new Map(chart.groups.map((g) => [g.id, g.name]));
  const groupSide = new Map(chart.groups.map((g) => [g.id, g.side ?? (g.cat === "bride" || g.cat === "groom" ? g.cat : undefined)]));
  const locked = new Set(chart.tables.filter((t) => t.locked).map((t) => t.id));
  const freeOf = (t: Table, but: string[] = []) => freeSeats(t, (occ.get(t.id) ?? []).filter((g) => !but.includes(g.id))).length;
  const dj = chart.objects.find((o) => o.type === "dj");
  const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);
  const open = chart.tables.filter((t) => !locked.has(t.id));
  const household = (g: Guest) => chart.guests.filter((x) => x.party === g.party);
  /** The best table for these people: room for all of them, with their group, close by. */
  const bestTable = (people: Guest[], prefer: (t: Table) => number, exclude: string[] = []) => {
    const ids = people.map((p) => p.id);
    let best: Table | null = null;
    let score = -Infinity;
    for (const t of open) {
      if (exclude.includes(t.id) || freeOf(t, ids) < people.length) continue;
      const s = prefer(t);
      if (s > score) {
        score = s;
        best = t;
      }
    }
    return best;
  };

  // 1. Guests without a seat.
  const unseated = chart.guests.filter((g) => !g.tableId);
  if (unseated.length && chart.tables.length) {
    out.push({
      id: "unseated",
      level: "fix",
      text: `${plural(unseated.length, "guest doesn’t", "guests don’t")} have a seat yet`,
      tableIds: [],
      fix: {
        label: "Seat them",
        apply: (c) => {
          const plan = planSeating(c);
          for (const m of plan.moves) Object.assign(c.guests.find((g) => g.id === m.guestId)!, { tableId: m.tableId, seat: m.seat });
        },
      },
    });
  }

  // 2. Seating rules not kept.
  for (const { rule, a, b } of ruleBreaks(chart)) {
    const t = byTable.get(a.tableId!);
    out.push({
      id: `rule:${rule.a}:${rule.b}`,
      level: "fix",
      text: rule.kind === "apart" ? `${a.name} and ${b.name} should sit apart, but both are at ${t ? tableName(t) : "one table"}` : `${a.name} and ${b.name} should sit together, but aren’t`,
      tableIds: [a.tableId, b.tableId].filter(Boolean) as string[],
    });
  }

  // 3. Households split between tables (when one table could hold them all).
  const maxSeats = Math.max(0, ...open.map((t) => t.seats));
  // One item per household: a household that's split, or near the speakers, isn't also listed as alone.
  const handled = new Set<string>();
  const parties = new Map<string, Guest[]>();
  for (const g of chart.guests) parties.set(g.party, [...(parties.get(g.party) ?? []), g]);
  for (const [pid, people] of parties) {
    const tables = new Set(people.map((p) => p.tableId).filter(Boolean) as string[]);
    if (tables.size < 2 || people.length > maxSeats) continue;
    // Where most of them already are, if the rest fit there; else a table that fits everyone.
    const counts = [...tables].map((tid) => ({ tid, n: people.filter((p) => p.tableId === tid).length })).sort((a, b) => b.n - a.n);
    const main = byTable.get(counts[0].tid)!;
    const rest = people.filter((p) => p.tableId !== main.id);
    const target = !locked.has(main.id) && freeOf(main) >= rest.length ? main : bestTable(people, (t) => (t.id === main.id ? 1000 : 0) - dist(t, main) / 10);
    handled.add(pid);
    out.push({
      id: `split:${pid}`,
      level: "fix",
      text: `${people[0].name}’s household is split between ${tablesText([...tables].map((tid) => byTable.get(tid)!))}`,
      tableIds: [...tables],
      ...(target
        ? {
            fix: {
              label: `Seat them together at ${tableName(target)}`,
              apply: (c: Chart) => moveTo(c, (target.id === main.id ? rest : people).map((p) => p.id), target.id),
            },
          }
        : {}),
    });
  }

  // 4. Lolos and lolas near the speakers.
  if (dj) {
    const done = new Set<string>();
    for (const g of chart.guests) {
      if (!g.tags?.includes("senior") || !g.tableId || done.has(g.party) || handled.has(g.party)) continue;
      const t = byTable.get(g.tableId)!;
      if (locked.has(t.id) || dist(t, dj) >= SPEAKERS) continue;
      done.add(g.party);
      handled.add(g.party);
      const people = household(g).filter((p) => p.tableId === t.id);
      const target = bestTable(people, (u) => (dist(u, dj) >= SPEAKERS ? 1000 : -100000) + Math.min(6, (occ.get(u.id) ?? []).filter((o) => o.groupId && o.groupId === g.groupId).length) * 120 - dist(u, t) / 10, [t.id]);
      out.push({
        id: `speakers:${g.party}`,
        level: "fix",
        text: `${g.name} is close to the speakers at ${tableName(t)}`,
        tableIds: [t.id],
        ...(target ? { fix: { label: `Move to ${tableName(target)}`, apply: (c: Chart) => moveTo(c, people.map((p) => p.id), target.id) } } : {}),
      });
    }
  }

  // 5. A guest who knows nobody at their table, while people they know sit elsewhere.
  const lonely = new Set<string>();
  for (const t of open) {
    const here = occ.get(t.id) ?? [];
    for (const g of here) {
      if (!g.groupId || lonely.has(g.party) || handled.has(g.party)) continue;
      const knows = here.some((o) => o.id !== g.id && (o.party === g.party || (o.groupId && o.groupId === g.groupId)));
      if (knows) continue;
      const mates = chart.guests.filter((o) => o.groupId === g.groupId && o.tableId && o.tableId !== t.id);
      if (!mates.length) continue;
      lonely.add(g.party);
      const people = household(g).filter((p) => p.tableId === t.id);
      const mateTables = new Set(mates.map((m) => m.tableId!));
      const target = bestTable(people, (u) => (mateTables.has(u.id) ? 1000 : -100000) - dist(u, t) / 10, [t.id]);
      const gname = groupName.get(g.groupId) ?? "their group";
      out.push({
        id: `alone:${g.party}`,
        level: "fix",
        text: `${people.length > 1 ? `${firstName(g)}’s household knows` : `${g.name} knows`} no one at ${tableName(t)}. The rest of ${gname} sit at ${tablesText([...mateTables].map((tid) => byTable.get(tid)!))}`,
        tableIds: [t.id, ...mateTables],
        ...(target ? { fix: { label: `Move to ${tableName(target)}`, apply: (c: Chart) => moveTo(c, people.map((p) => p.id), target.id) } } : {}),
      });
    }
  }

  // 6. More people than seats.
  for (const t of chart.tables) {
    const n = (occ.get(t.id) ?? []).length;
    if (n <= t.seats) continue;
    out.push({
      id: `over:${t.id}`,
      level: "fix",
      text: `${cap(tableName(t))} has ${n} people for ${t.seats} seats`,
      tableIds: [t.id],
      ...(n <= 16 ? { fix: { label: `Make it a table for ${n}`, apply: (c: Chart) => void (c.tables.find((x) => x.id === t.id)!.seats = n) } } : {}),
    });
  }

  // 7. Half-empty tables: put them together with a table that has room, or make them smaller.
  const sparse = open.filter((t) => {
    const n = (occ.get(t.id) ?? []).length;
    return !t.cat && t.seats >= 6 && n > 0 && n <= t.seats * 0.4;
  });
  for (const t of sparse) {
    const here = occ.get(t.id) ?? [];
    const groups = new Set(here.map((g) => g.groupId).filter(Boolean));
    const side = here.map((g) => (g.groupId ? groupSide.get(g.groupId) : undefined)).find(Boolean);
    const target = bestTable(here, (u) => (u.cat ? -100000 : 0) + ((occ.get(u.id) ?? []).some((o) => o.groupId && groups.has(o.groupId)) ? 800 : 0) + (side && u.side === side ? 200 : 0) - dist(u, t) / 10, [t.id]);
    out.push({
      id: `sparse:${t.id}`,
      level: "look",
      text: `${cap(tableName(t))} has ${here.length} of ${t.seats} seats filled`,
      tableIds: [t.id],
      fix: target
        ? { label: `Join ${tableName(target)}`, apply: (c) => moveTo(c, here.map((g) => g.id), target.id) }
        : { label: `Make it a table for ${Math.max(here.length, 6)}`, apply: (c) => void (c.tables.find((x) => x.id === t.id)!.seats = Math.max(here.length, 6)) },
    });
  }

  // 8. More than one empty table (one spare for late RSVPs is good).
  const empty = open.filter((t) => !(occ.get(t.id) ?? []).length);
  if (empty.length > 1) {
    const drop = [...empty].sort((a, b) => b.y - a.y || Number(b.label) - Number(a.label)).slice(0, empty.length - 1);
    out.push({
      id: "empty",
      level: "look",
      text: `${empty.length} tables are empty`,
      tableIds: empty.map((t) => t.id),
      fix: { label: `Remove ${drop.length}, keep one spare`, apply: (c) => void (c.tables = c.tables.filter((t) => !drop.some((d) => d.id === t.id))) },
    });
  }

  // 9. A table marked for one side, seating the other.
  for (const t of open) {
    if (!t.side) continue;
    const here = occ.get(t.id) ?? [];
    const sides = here.map((g) => (g.groupId ? groupSide.get(g.groupId) : undefined)).filter(Boolean);
    const other = sides.filter((s) => s !== t.side).length;
    if (!other || other < sides.length / 2) continue;
    const to = t.side === "bride" ? "groom" : "bride";
    out.push({
      id: `side:${t.id}`,
      level: "look",
      text: `${cap(tableName(t))} is marked for the ${t.side}’s side but seats the ${to}’s guests`,
      tableIds: [t.id],
      fix: {
        label: `Mark it ${to}’s side`,
        apply: (c) => {
          const x = c.tables.find((y) => y.id === t.id)!;
          x.side = to;
          if (/^(bride|groom)’s guests$/i.test(x.note ?? "")) x.note = to === "bride" ? "Bride’s guests" : "Groom’s guests";
        },
      },
    });
  }

  // 10. Walkways: chairs too close to the next table's chairs (or to something in the room),
  //     tables overlapping, chairs close to a wall. Tables waiting outside the room are skipped.
  const items = itemsOf(chart, new Set());
  const inRoom = (t: Table) => {
    const b = footprint(t);
    return b.x1 > 0 && b.y1 > 0 && b.x0 < chart.room.w && b.y0 < chart.room.h;
  };
  const tight: { a: Table; b: string; d: number }[] = [];
  const walls: { t: Table; d: number }[] = [];
  const overlaps: [Table, Table][] = [];
  const seen = new Set<string>();
  const roomTables = chart.tables.filter(inRoom);
  for (const t of roomTables) {
    const foot = footprint(t);
    const others = items.filter((i) => i.id !== t.id);
    for (const m of nearestGaps(foot, others, chart.room)) {
      if (m.wall) {
        if (m.d < WALL_GAP) walls.push({ t, d: m.d });
        continue;
      }
      if (m.d >= WALKWAY) continue;
      const n = m.to ? others.find((i) => i.id === m.to) : null;
      if (!n) continue;
      const key = [t.id, n.id].sort().join("|");
      if (seen.has(key)) continue;
      seen.add(key);
      tight.push({ a: t, b: n.id, d: m.d });
    }
  }
  for (let i = 0; i < roomTables.length; i++)
    for (let j = i + 1; j < roomTables.length; j++) {
      const a = footprint(roomTables[i]);
      const b = footprint(roomTables[j]);
      if (a.x0 < b.x1 - 1 && a.x1 > b.x0 + 1 && a.y0 < b.y1 - 1 && a.y1 > b.y0 + 1) overlaps.push([roomTables[i], roomTables[j]]);
    }
  // Chairs on the stage, the dance floor, the buffet… (doors and the area markers aside).
  const onThings: { t: Table; what: string }[] = [];
  for (const t of roomTables) {
    const a = footprint(t);
    for (const o of chart.objects) {
      if (o.type === "entrance" || o.type === "exit" || o.type === "custom") continue;
      const b = items.find((i) => i.id === o.id)?.foot;
      if (b && a.x0 < b.x1 - 1 && a.x1 > b.x0 + 1 && a.y0 < b.y1 - 1 && a.y1 > b.y0 + 1) onThings.push({ t, what: o.label.toLowerCase() });
    }
  }
  if (onThings.length) {
    const first = onThings[0];
    out.push({
      id: "on-things",
      level: "fix",
      text: onThings.length === 1 ? `${cap(tableName(first.t))}’s chairs are on the ${first.what}` : `${plural(onThings.length, "table")} with chairs on something (${tableName(first.t)} on the ${first.what})`,
      tableIds: onThings.map((x) => x.t.id),
    });
  }
  const nameOf = (id: string) => {
    const t = byTable.get(id);
    if (t) return tableName(t);
    return chart.objects.find((o) => o.id === id)?.label.toLowerCase() ?? "something";
  };
  if (overlaps.length) {
    const ts = [...new Set(overlaps.flat())];
    out.push({
      id: "overlap",
      level: "fix",
      text: overlaps.length === 1 ? `${cap(tableName(overlaps[0][0]))} and ${tableName(overlaps[0][1])} overlap` : `${overlaps.length} pairs of tables overlap (${tablesText(ts)})`,
      tableIds: ts.map((t) => t.id),
    });
  }
  if (tight.length) {
    const worst = [...tight].sort((x, y) => x.d - y.d)[0];
    out.push({
      id: "walkways",
      level: "look",
      text:
        tight.length === 1
          ? `${cap(tableName(worst.a))} and ${nameOf(worst.b)}: ${fmtLen(worst.d, units)} between the chairs (${fmtLen(WALKWAY, units)} recommended)`
          : `${plural(tight.length, "walkway")} under ${fmtLen(WALKWAY, units)}, the tightest ${fmtLen(worst.d, units)} (${tableName(worst.a)} and ${nameOf(worst.b)})`,
      tableIds: [worst.a.id, ...tight.filter((x) => x !== worst).map((x) => x.a.id)],
    });
  }
  if (walls.length) {
    const worst = [...walls].sort((x, y) => x.d - y.d)[0];
    const ts = [...new Set(walls.map((w) => w.t))];
    out.push({
      id: "walls",
      level: "look",
      text: ts.length === 1 ? `${cap(tableName(worst.t))} is ${fmtLen(worst.d, units)} from the wall (${fmtLen(WALL_GAP, units)} recommended)` : `${plural(ts.length, "table")} close to a wall, ${tableName(worst.t)} only ${fmtLen(worst.d, units)} away`,
      tableIds: [worst.t.id, ...ts.filter((t) => t !== worst.t).map((t) => t.id)],
    });
  }

  return out;
}
