// Mesa's smart guides and distances (guides.ts), and lengths (units.ts): footprints of
// rotated and head tables, the nearest walkway each side, snapping to edges and centres
// within the tolerance and not beyond it, equal spacing in a row, and typed lengths.
// Run: npx tsx --tsconfig tsconfig.app.json scripts/check-guides.ts
import { alignMoves, itemsOf, nearestGaps, rulerStep, snapEdge, snapMove, unionItem, type Item } from "../src/pages/tools/seating/guides";
import { emptyChart, footprint, objBox, topBox, type Table } from "../src/pages/tools/seating/model";
import { fmtLen, fmtSize, parseLen } from "../src/pages/tools/seating/units";
import { checkPlan } from "../src/pages/tools/seating/check";

let fails = 0;
const ok = (cond: boolean, msg: string) => (cond ? console.log("  ok  ", msg) : (fails++, console.log("  FAIL", msg)));
const near = (a: number, b: number, e = 0.01) => Math.abs(a - b) < e;

const round = (id: string, x: number, y: number): Table => ({ id, label: id, shape: "round", seats: 10, x, y, rot: 0 });

// ---- footprints -----------------------------------------------------------------------------
const r = round("a", 500, 500);
const fr = footprint(r);
ok(near(fr.x1 - fr.x0, 2 * (91 + 30 + 24)), "a 10-seat round: top (91) + chair gap (30) + chair (24) each side");
const longT: Table = { id: "l", label: "L", shape: "rect", seats: 8, x: 0, y: 0, rot: 0, w: 240 };
const turned = footprint({ ...longT, rot: 90 });
const flat = footprint(longT);
ok(near(turned.x1 - turned.x0, flat.y1 - flat.y0) && near(turned.y1 - turned.y0, flat.x1 - flat.x0), "a long table turned 90°: its box swaps width and depth");
const at45 = topBox({ ...longT, rot: 45 });
ok(near(at45.x1 - at45.x0, (240 + 76) * Math.SQRT1_2, 0.5), "a long table at 45°: the exact box, not a square of its length");
const head: Table = { id: "h", label: "P", shape: "head", seats: 10, x: 0, y: 0, rot: 0 };
const fh = footprint(head);
ok(fh.y0 < -38 - 30 && near(fh.y1, 38), "a head table: chairs on one side only, so its box isn't centred");
const stage = { id: "s", type: "stage" as const, label: "Stage", x: 0, y: 0, w: 600, h: 300, rot: 30 };
const sb = objBox(stage);
ok(near(sb.x1 - sb.x0, 600 * Math.cos(Math.PI / 6) + 300 * Math.sin(Math.PI / 6), 0.5), "a stage at 30°: exact box");

// ---- distances ------------------------------------------------------------------------------
const chart = emptyChart();
chart.room = { w: 2000, h: 1500 };
chart.tables = [round("a", 400, 400), round("b", 800, 400), round("c", 400, 900)];
const others = itemsOf(chart, new Set(["a"]));
const gaps = nearestGaps(footprint(chart.tables[0]), others, chart.room);
const right = gaps.find((g) => g.y1 === g.y2 && g.x1 > 400)!;
ok(!!right && !right.wall && near(right.d, 400 - 2 * 145), "walkway to the table on the right: chair back to chair back (110 cm)");
const left = gaps.find((g) => g.y1 === g.y2 && g.x2 <= 400)!;
ok(!!left && left.wall && near(left.d, 400 - 145), "nothing to the left: the distance to the wall");
const below = gaps.find((g) => g.x1 === g.x2 && g.y1 > 400)!;
ok(!!below && !below.wall && near(below.d, 500 - 290), "the table below: 2.10 m");
ok(gaps.length === 4, "one measurement each side");
const overlapping = nearestGaps(footprint(round("x", 820, 400)), others, chart.room);
ok(!overlapping.some((g) => !g.wall && g.x1 > 600 && g.y1 === g.y2 && g.x2 < 900), "touching or overlapping: no walkway shown");

// ---- smart guides ---------------------------------------------------------------------------
const item = (t: Table): Item => ({ id: t.id, kind: "table", top: topBox(t), foot: footprint(t), turned: false });
const tol = 8;
const s1 = snapMove(item(round("m", 1205, 404)), others, chart.room, tol);
ok(s1.snappedY && near(s1.dy, -4), "4 cm off the row's centre line: snaps onto it");
ok(s1.guides.some((g) => g.y1 === g.y2 && near(g.y1, 400)), "and draws the centre line through the row");
const s2 = snapMove(item(round("m", 1300, 430)), others, chart.room, tol);
ok(!s2.snappedY, "30 cm off: no snap (beyond the tolerance)");
const s3 = snapMove(item(round("m", 1000, 403)), [...others], chart.room, tol);
ok(s3.snappedY && near(s3.dy, -3), "the strongest pull wins per axis (here the centre line)");
// equal spacing: a, b at 400 / 800 (gap 110 between chairs); moving one to the right of b
const everything = itemsOf(chart, new Set());
const s4 = snapMove(item(round("m", 1206, 400)), everything, chart.room, tol);
ok(s4.snappedX && near(s4.dx, -6) && s4.gaps.length >= 2, "to the right of the row: snaps to the same walkway as the others, and marks both gaps");
const s5 = snapMove(item(round("m", 1000, 1000)), others, chart.room, tol);
ok(s5.snappedX && near(s5.dx, 0) && s5.guides.some((g) => g.x1 === g.x2 && near(g.x1, 1000)), "on the room's centre line: a full-height guide");
const tilted: Item = { ...item({ ...longT, x: 803, y: 700, rot: 30 }), turned: true };
const s6 = snapMove(tilted, others, chart.room, tol);
ok(s6.snappedX && near(803 + s6.dx, 800), "a table at an odd angle lines up by its centre");

// ---- several at once, resizing, rulers ---------------------------------------------------------
const grp = unionItem([item(round("p", 300, 300)), item(round("q", 700, 380))])!;
ok(near(grp.top.x0, 300 - 91) && near(grp.top.x1, 700 + 91) && near(grp.top.y1, 380 + 91), "a group's box spans everyone in it");
const e1 = snapEdge(1003, "x", [0, 100], others, chart.room, tol);
ok(near(e1.v, 1000) && !!e1.guide, "a dragged edge snaps to the room's centre line");
const e2 = snapEdge(712, "x", [0, 100], others, chart.room, tol);
ok(near(e2.v, 709) && !!e2.guide, "or to a table's edge (b's left edge at 709)");
ok(rulerStep(0.3, 60) === 200 && rulerStep(1, 60) === 100 && rulerStep(0.05, 60) === 2000, "ruler steps: 2 m at 30%, 1 m at 100%, 20 m zoomed far out");
ok(near(rulerStep(0.3, 60, true), 30.48 * 10), "in feet: 10 ft steps at 30%");
const row = [item(round("a1", 300, 300)), item(round("a2", 520, 340)), item(round("a3", 1100, 320))];
const top = alignMoves(row, "top");
ok(near(top.get("a2")!.dy, -40) && near(top.get("a3")!.dy, -20) && near(top.get("a1")!.dy, 0), "align tops: everyone to the highest top");
const spread = alignMoves(row, "spread-x");
ok(near(spread.get("a2")!.dx, 700 - 520) && near(spread.get("a1")!.dx, 0) && near(spread.get("a3")!.dx, 0), "spread evenly: the middle one moves to the halfway point");

// ---- walkway warnings in the plan check ------------------------------------------------------
const tight = emptyChart();
tight.room = { w: 2000, h: 1500 };
tight.tables = [round("t1", 400, 400), round("t2", 720, 400), round("t3", 400, 1080), round("t4", 1400, 400), round("t5", 1600, 400)];
const iss = checkPlan(tight);
const walk = iss.find((i) => i.id === "walkways");
ok(!!walk && /30 cm between the chairs/.test(walk.text) && walk.tableIds.length >= 1, `tight walkways flagged: "${walk?.text}"`);
ok(!iss.some((i) => i.id === "walls"), "nothing close to a wall here (all 2.55 m+ away)");
const ov = iss.find((i) => i.id === "overlap");
ok(!!ov && ov.level === "fix" && ov.tableIds.includes("t4") && ov.tableIds.includes("t5"), `overlapping tables: "${ov?.text}"`);
const wallChart = emptyChart();
wallChart.room = { w: 2000, h: 1500 };
wallChart.tables = [round("w1", 170, 700)];
const wi = checkPlan(wallChart).find((i) => i.id === "walls");
ok(!!wi && /25 cm from the wall/.test(wi.text), `close to a wall: "${wi?.text}"`);
ok(/10″ from the wall/.test(checkPlan(wallChart, [], "ft").find((i) => i.id === "walls")?.text ?? ""), "in feet too");

// ---- units ----------------------------------------------------------------------------------
ok(fmtLen(85) === "85 cm" && fmtLen(120) === "1.20 m" && fmtLen(1250) === "12.5 m", "metres: 85 cm · 1.20 m · 12.5 m");
ok(fmtLen(160, "ft") === "5′ 3″" && fmtLen(23, "ft") === "9″" && fmtLen(182.88, "ft") === "6′", "feet: 5′ 3″ · 9″ · 6′");
ok(fmtSize(600, 450) === "6.00 × 4.50 m", "a size: 6.00 × 4.50 m");
ok(near(parseLen("1.2")!, 120) && near(parseLen("120 cm")!, 120) && near(parseLen("1,5 m")!, 150), "typed metres: 1.2 · 120 cm · 1,5 m");
ok(near(parseLen("5'3\"")!, 160.02) && near(parseLen("5 ft 3 in")!, 160.02) && near(parseLen("63in")!, 160.02) && near(parseLen("5′ 3″")!, 160.02), "typed feet and inches, four ways");
ok(near(parseLen("6", "ft")!, 182.88) && parseLen("abc") === null && parseLen("") === null, "a bare number in feet mode; nonsense is refused");
ok(near(parseLen("180", "m", true)!, 180) && near(parseLen("72", "ft", true)!, 182.88) && near(parseLen("3.5", "m", true)!, 350), "a size: 180 means cm, 72 means inches in feet mode, 3.5 still metres");
ok(near(parseLen("22", "m")!, 2200), "a position: 22 stays 22 m");

console.log(fails ? `\n${fails} failed` : "\nall good");
process.exit(fails ? 1 : 0);
