// Seat everyone on real-looking lists, with each choice, and check what it must never do:
// two people on one seat, a table over its seats, a household split up, a Must rule broken,
// a spare seat or spare table used. Prints how the plan reads with and without the second pass.
// Run: npx tsx --tsconfig tsconfig.app.json scripts/check-seating.ts <list.txt>...
import { readFileSync } from "node:fs";
import { parseGuestText } from "../src/pages/tools/seating/parse";
import { buildLayout, seatHonorees, seatByTableLabels } from "../src/pages/tools/seating/presets";
import { emptyChart, type Chart, type SeatPrefs } from "../src/pages/tools/seating/model";
import { planSeating } from "../src/pages/tools/seating/autoseat";
import { checkPlan } from "../src/pages/tools/seating/check";

const files = process.argv.slice(2);
let fails = 0;
const fail = (m: string) => (fails++, console.log("  FAIL", m));

function make(text: string, prefs: SeatPrefs): Chart {
  const p = parseGuestText(text);
  const special = p.guests.filter((g) => ["vip", "entourage", "court"].includes(p.groups.find((x) => x.id === g.groupId)?.cat ?? "")).length;
  const chart: Chart = { ...emptyChart("wedding"), ...buildLayout("wedding", p.guests.length, 10, special, p.groups.length), groups: p.groups, guests: p.guests, names: "Andrea & Miguel", prefs };
  seatHonorees(chart, "Andrea & Miguel");
  seatByTableLabels(chart, p.wantTable);
  // two rules, one of each kind, between guests of different households
  const a = chart.guests.find((g) => !g.tableId)!;
  const b = chart.guests.find((g) => !g.tableId && g.party !== a.party && g.groupId === a.groupId)!;
  const c = chart.guests.find((g) => !g.tableId && g.groupId !== a.groupId)!;
  chart.rules = [
    { id: "r1", a: a.id, b: b.id, kind: "apart", must: true },
    { id: "r2", a: a.id, b: c.id, kind: "together", must: false },
  ];
  return chart;
}

function score(chart: Chart) {
  const per = new Map<string, Map<string, number>>();
  const total = new Map<string, number>();
  for (const g of chart.guests) {
    const gk = g.groupId ?? "_";
    total.set(gk, (total.get(gk) ?? 0) + 1);
    if (!g.tableId) continue;
    const m = per.get(g.tableId) ?? per.set(g.tableId, new Map()).get(g.tableId)!;
    m.set(gk, (m.get(gk) ?? 0) + 1);
  }
  let alone = 0, mixed = 0, extraTables = 0;
  const where = new Map<string, number>();
  for (const m of per.values()) {
    if (m.size > 1) mixed += m.size - 1;
    for (const [gk, n] of m) {
      if (gk !== "_" && n === 1 && (total.get(gk) ?? 0) > 1) alone++;
      where.set(gk, (where.get(gk) ?? 0) + 1);
    }
  }
  for (const [gk, n] of where) if (gk !== "_") extraTables += Math.max(0, n - Math.ceil((total.get(gk) ?? 1) / 10));
  return { alone, mixed, extraTables };
}

function run(chart: Chart, polish: boolean) {
  const c = structuredClone(chart);
  const t0 = performance.now();
  const plan = planSeating(c, { polish });
  const ms = performance.now() - t0;
  for (const m of plan.moves) Object.assign(c.guests.find((g) => g.id === m.guestId)!, { tableId: m.tableId, seat: m.seat });
  return { c, plan, ms };
}

function verify(chart: Chart, c: Chart) {
  const seats = new Set<string>();
  for (const g of c.guests) {
    if (!g.tableId) continue;
    const k = `${g.tableId}:${g.seat}`;
    if (seats.has(k)) fail(`two people on ${k}`);
    seats.add(k);
    const t = c.tables.find((x) => x.id === g.tableId)!;
    if (g.seat == null || g.seat < 0 || g.seat >= t.seats) fail(`bad seat ${g.name} ${g.seat}`);
    if (t.spare && !chart.guests.find((x) => x.id === g.id)?.tableId) fail(`${g.name} put at the spare table`);
  }
  const kidsTable = c.prefs?.kids === "table";
  const parties = new Map<string, Set<string>>();
  for (const g of c.guests) if (g.tableId && !(kidsTable && g.tags?.includes("kid"))) (parties.get(g.party) ?? parties.set(g.party, new Set()).get(g.party)!).add(g.tableId);
  const split = [...parties.values()].filter((s) => s.size > 1).length;
  if (split) console.log(`  note: ${split} households across tables (too big for one?)`);
  for (const r of c.rules ?? []) {
    const a = c.guests.find((g) => g.id === r.a)!.tableId;
    const b = c.guests.find((g) => g.id === r.b)!.tableId;
    if (r.must && r.kind === "apart" && a && a === b) fail("must-apart rule broken");
  }
  const spare = c.prefs?.spare ?? 0;
  if (spare)
    for (const t of c.tables) {
      if (t.seats < 6 || t.shape === "head" || t.shape === "sweetheart" || t.cat === "vip" || t.locked) continue;
      const n = c.guests.filter((g) => g.tableId === t.id).length;
      const before = chart.guests.filter((g) => g.tableId === t.id).length;
      if (n > before && n > t.seats - spare) fail(`table ${t.label} has ${n}/${t.seats} with ${spare} spare`);
    }
}

const PREFS: [string, SeatPrefs][] = [
  ["default", {}],
  ["1 spare seat", { spare: 1 }],
  ["kids' table", { kids: "table" }],
  ["mix sides", { sides: "mix" }],
];
for (const f of files) {
  const text = readFileSync(f, "utf8");
  console.log(`\n${f}`);
  for (const [name, prefs] of PREFS) {
    const chart = make(text, prefs);
    if (name === "default") chart.tables[chart.tables.length - 1].spare = true;
    const one = run(chart, false);
    const two = run(chart, true);
    verify(chart, two.c);
    const s1 = score(one.c);
    const s2 = score(two.c);
    console.log(
      `  ${name.padEnd(13)} seated ${two.plan.moves.length}/${chart.guests.filter((g) => !g.tableId).length} · alone ${s1.alone}→${s2.alone} · extra tables ${s1.extraTables}→${s2.extraTables} · mixed ${s1.mixed}→${s2.mixed} · ${two.ms.toFixed(0)} ms`,
    );
    if (name === "default") {
      console.log("   ", two.plan.notes.join(" | "));
      const issues = (c: Chart) => checkPlan(c).map((i) => `${i.level}: ${i.text}`);
      console.log("    check, one pass:", issues(one.c));
      console.log("    check, two passes:", issues(two.c));
    }
    if (name === "kids' table") console.log("   ", two.plan.notes.filter((n) => /kid/i.test(n)).join(" | ") || "(no kids note)");
  }
}
console.log(fails ? `\n${fails} failed` : "\nall good");
process.exit(fails ? 1 : 0);
