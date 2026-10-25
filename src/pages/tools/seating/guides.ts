import { footprint, objBox, squareTurn, topBox, type Box, type Chart } from "./model";

// While something is dragged on the plan: how far it is from its neighbours and the walls,
// and (Canva-style smart guides) where it lines up with them. Pure geometry, in room
// centimetres; Canvas.tsx draws the result. Distances are measured chair back to chair back
// (footprints), since walkways are what people check; alignment uses table tops and centres.

export type Item = { id: string; kind: "table" | "object"; top: Box; foot: Box; turned: boolean };

/** Everything on the plan except `skip` (what's being dragged), as boxes. */
export function itemsOf(chart: Chart, skip: Set<string>): Item[] {
  const out: Item[] = [];
  for (const t of chart.tables) if (!skip.has(t.id)) out.push({ id: t.id, kind: "table", top: topBox(t), foot: footprint(t), turned: !squareTurn(t.rot) && t.shape !== "round" && t.shape !== "cocktail" });
  for (const o of chart.objects) {
    if (skip.has(o.id)) continue;
    const b = objBox(o);
    out.push({ id: o.id, kind: "object", top: b, foot: b, turned: !squareTurn(o.rot) });
  }
  return out;
}

export const shift = (b: Box, dx: number, dy: number): Box => ({ x0: b.x0 + dx, y0: b.y0 + dy, x1: b.x1 + dx, y1: b.y1 + dy });

/** A distance to show: a line from a to b, its length, whether it ends at a wall, and what it
 *  reaches otherwise (the neighbour's id). */
export type Measure = { x1: number; y1: number; x2: number; y2: number; d: number; wall: boolean; to?: string };

/**
 * The nearest neighbour on each side of `foot` (left, right, above, below) that it faces
 * (they overlap the other way), or the wall when nothing is in between. Overlapping items
 * aren't measured: there's no walkway to show.
 */
export function nearestGaps(foot: Box, items: Item[], room: { w: number; h: number }): Measure[] {
  const out: Measure[] = [];
  const midY = (a: Box, b: Box) => (Math.max(a.y0, b.y0) + Math.min(a.y1, b.y1)) / 2;
  const midX = (a: Box, b: Box) => (Math.max(a.x0, b.x0) + Math.min(a.x1, b.x1)) / 2;
  const facingY = items.filter((i) => i.foot.y0 < foot.y1 && i.foot.y1 > foot.y0);
  const facingX = items.filter((i) => i.foot.x0 < foot.x1 && i.foot.x1 > foot.x0);
  const cx = (foot.x0 + foot.x1) / 2;
  const cy = (foot.y0 + foot.y1) / 2;

  const left = facingY.filter((i) => i.foot.x1 <= foot.x0).sort((a, b) => b.foot.x1 - a.foot.x1)[0];
  if (left) out.push({ x1: left.foot.x1, x2: foot.x0, y1: midY(left.foot, foot), y2: midY(left.foot, foot), d: foot.x0 - left.foot.x1, wall: false, to: left.id });
  else if (foot.x0 > 0) out.push({ x1: 0, x2: foot.x0, y1: cy, y2: cy, d: foot.x0, wall: true });

  const right = facingY.filter((i) => i.foot.x0 >= foot.x1).sort((a, b) => a.foot.x0 - b.foot.x0)[0];
  if (right) out.push({ x1: foot.x1, x2: right.foot.x0, y1: midY(right.foot, foot), y2: midY(right.foot, foot), d: right.foot.x0 - foot.x1, wall: false, to: right.id });
  else if (foot.x1 < room.w) out.push({ x1: foot.x1, x2: room.w, y1: cy, y2: cy, d: room.w - foot.x1, wall: true });

  const up = facingX.filter((i) => i.foot.y1 <= foot.y0).sort((a, b) => b.foot.y1 - a.foot.y1)[0];
  if (up) out.push({ x1: midX(up.foot, foot), x2: midX(up.foot, foot), y1: up.foot.y1, y2: foot.y0, d: foot.y0 - up.foot.y1, wall: false, to: up.id });
  else if (foot.y0 > 0) out.push({ x1: cx, x2: cx, y1: 0, y2: foot.y0, d: foot.y0, wall: true });

  const down = facingX.filter((i) => i.foot.y0 >= foot.y1).sort((a, b) => a.foot.y0 - b.foot.y0)[0];
  if (down) out.push({ x1: midX(down.foot, foot), x2: midX(down.foot, foot), y1: foot.y1, y2: down.foot.y0, d: down.foot.y0 - foot.y1, wall: false, to: down.id });
  else if (foot.y1 < room.h) out.push({ x1: cx, x2: cx, y1: foot.y1, y2: room.h, d: room.h - foot.y1, wall: true });

  return out;
}

// ---- smart guides ------------------------------------------------------------------------

/** A guide line to draw (where things line up), in room centimetres. */
export type Guide = { x1: number; y1: number; x2: number; y2: number };
/** Equal gaps: each one drawn as a short marker with its length. */
export type GapMark = { x1: number; y1: number; x2: number; y2: number; d: number };
export type Snap = { dx: number; dy: number; snappedX: boolean; snappedY: boolean; guides: Guide[]; gaps: GapMark[] };

const R = (n: number) => Math.round(n * 1e6) / 1e6;
const xs = (b: Box) => [b.x0, (b.x0 + b.x1) / 2, b.x1];
const ys = (b: Box) => [b.y0, (b.y0 + b.y1) / 2, b.y1];

/**
 * Where the moving box lines up (tldraw's recipe): for each axis on its own, the nearest
 * edge or centre of another item, or of the room, within `tol`; then every line that matches
 * at the snapped spot is drawn. Equal spacing: the same gap as its neighbours in that row, or
 * centred between two. Always called with the raw (unsnapped) position, so nothing sticks.
 * A box turned at an odd angle lines up by its centre only (its edges aren't real).
 */
export function snapMove(moving: Item, items: Item[], room: { w: number; h: number }, tol: number): Snap {
  const roomBox: Box = { x0: 0, y0: 0, x1: room.w, y1: room.h };
  const mine = (axis: "x" | "y") => (moving.turned ? [axis === "x" ? xs(moving.top)[1] : ys(moving.top)[1]] : axis === "x" ? xs(moving.top) : ys(moving.top));
  const theirs = (i: Item, axis: "x" | "y") => (i.turned ? [axis === "x" ? xs(i.top)[1] : ys(i.top)[1]] : axis === "x" ? xs(i.top) : ys(i.top));

  const solve = (axis: "x" | "y") => {
    let best = Infinity;
    for (const m of mine(axis)) {
      for (const i of items) for (const t of theirs(i, axis)) if (Math.abs(t - m) <= tol && Math.abs(t - m) < Math.abs(best)) best = t - m;
      for (const t of axis === "x" ? xs(roomBox) : ys(roomBox)) if (Math.abs(t - m) <= tol && Math.abs(t - m) < Math.abs(best)) best = t - m;
    }
    const gap = spacing(moving.foot, items.map((i) => i.foot), axis, tol);
    if (gap && Math.abs(gap.delta) < Math.abs(best)) return { delta: gap.delta, gap: true };
    return Number.isFinite(best) ? { delta: best, gap: false } : null;
  };
  const sx = solve("x");
  const sy = solve("y");
  const dx = R(sx?.delta ?? 0);
  const dy = R(sy?.delta ?? 0);

  // Second pass, at the snapped spot: every alignment that's exact now gets its line.
  const top = shift(moving.top, dx, dy);
  const foot = shift(moving.foot, dx, dy);
  const at = { ...moving, top, foot };
  const guides: Guide[] = [];
  if (sx && !sx.gap) {
    for (const m of mine("x").map((v) => v + dx)) {
      const hits = items.filter((i) => theirs(i, "x").some((t) => Math.abs(t - m) < 0.5));
      if (hits.length) {
        const y0 = Math.min(top.y0, ...hits.map((h) => h.top.y0));
        const y1 = Math.max(top.y1, ...hits.map((h) => h.top.y1));
        guides.push({ x1: m, x2: m, y1: y0, y2: y1 });
      } else if (xs(roomBox).some((t) => Math.abs(t - m) < 0.5)) guides.push({ x1: m, x2: m, y1: 0, y2: room.h });
    }
  }
  if (sy && !sy.gap) {
    for (const m of mine("y").map((v) => v + dy)) {
      const hits = items.filter((i) => theirs(i, "y").some((t) => Math.abs(t - m) < 0.5));
      if (hits.length) {
        const x0 = Math.min(top.x0, ...hits.map((h) => h.top.x0));
        const x1 = Math.max(top.x1, ...hits.map((h) => h.top.x1));
        guides.push({ x1: x0, x2: x1, y1: m, y2: m });
      } else if (ys(roomBox).some((t) => Math.abs(t - m) < 0.5)) guides.push({ x1: 0, x2: room.w, y1: m, y2: m });
    }
  }
  const gaps = [...(sx?.gap ? equalGaps(at.foot, items.map((i) => i.foot), "x") : []), ...(sy?.gap ? equalGaps(at.foot, items.map((i) => i.foot), "y") : [])];
  return { dx, dy, snappedX: !!sx, snappedY: !!sy, guides, gaps };
}

/** Pairs facing each other along `axis` (apart that way, overlapping the other way): their gaps. */
function rowGaps(boxes: Box[], axis: "x" | "y") {
  const out: { a: Box; b: Box; d: number }[] = [];
  for (const a of boxes)
    for (const b of boxes) {
      if (a === b) continue;
      const apart = axis === "x" ? b.x0 >= a.x1 : b.y0 >= a.y1;
      const facing = axis === "x" ? a.y0 < b.y1 && a.y1 > b.y0 : a.x0 < b.x1 && a.x1 > b.x0;
      if (!apart || !facing) continue;
      // Only next-door neighbours: nothing facing both of them in between.
      const d = axis === "x" ? b.x0 - a.x1 : b.y0 - a.y1;
      const between = boxes.some((c) => c !== a && c !== b && (axis === "x" ? c.x0 >= a.x1 && c.x1 <= b.x0 && c.y0 < a.y1 && c.y1 > a.y0 : c.y0 >= a.y1 && c.y1 <= b.y0 && c.x0 < a.x1 && c.x1 > a.x0));
      if (!between) out.push({ a, b, d });
    }
  return out;
}

/** Equal spacing along one axis: the nudge that makes the gap to a neighbour match a gap
 *  already in that row, or centres the box between two neighbours. */
function spacing(m: Box, boxes: Box[], axis: "x" | "y", tol: number): { delta: number } | null {
  const lo = (b: Box) => (axis === "x" ? b.x0 : b.y0);
  const hi = (b: Box) => (axis === "x" ? b.x1 : b.y1);
  const facing = boxes.filter((b) => (axis === "x" ? b.y0 < m.y1 && b.y1 > m.y0 : b.x0 < m.x1 && b.x1 > m.x0));
  const before = facing.filter((b) => hi(b) <= lo(m) + tol).sort((a, b) => hi(b) - hi(a))[0];
  const after = facing.filter((b) => lo(b) >= hi(m) - tol).sort((a, b) => lo(a) - lo(b))[0];
  const known = rowGaps(boxes, axis).map((g) => g.d);
  let best: number | null = null;
  const consider = (delta: number) => {
    if (Math.abs(delta) <= tol && (best === null || Math.abs(delta) < Math.abs(best))) best = delta;
  };
  if (before) for (const g of known) consider(hi(before) + g - lo(m));
  if (after) for (const g of known) consider(lo(after) - g - hi(m));
  if (before && after && lo(after) - hi(before) > hi(m) - lo(m)) consider((hi(before) + lo(after)) / 2 - (lo(m) + hi(m)) / 2);
  return best === null ? null : { delta: R(best) };
}

/** The markers for equal gaps once snapped: the moving box's gaps and every gap in the row
 *  that has the same length. */
function equalGaps(m: Box, boxes: Box[], axis: "x" | "y"): GapMark[] {
  const all = rowGaps([...boxes, m], axis);
  const mine = all.filter((g) => g.a === m || g.b === m);
  const out: GapMark[] = [];
  for (const g of mine) {
    const same = all.filter((o) => Math.abs(o.d - g.d) < 0.5);
    if (same.length < 2) continue;
    for (const o of same) {
      const mark =
        axis === "x"
          ? { x1: o.a.x1, x2: o.b.x0, y1: (Math.max(o.a.y0, o.b.y0) + Math.min(o.a.y1, o.b.y1)) / 2, y2: (Math.max(o.a.y0, o.b.y0) + Math.min(o.a.y1, o.b.y1)) / 2, d: o.d }
          : { y1: o.a.y1, y2: o.b.y0, x1: (Math.max(o.a.x0, o.b.x0) + Math.min(o.a.x1, o.b.x1)) / 2, x2: (Math.max(o.a.x0, o.b.x0) + Math.min(o.a.x1, o.b.x1)) / 2, d: o.d };
      if (!out.some((p) => Math.abs(p.x1 - mark.x1) < 0.5 && Math.abs(p.y1 - mark.y1) < 0.5 && Math.abs(p.x2 - mark.x2) < 0.5)) out.push(mark);
    }
  }
  return out;
}

// ---- several at once, resizing, rulers ------------------------------------------------------

/** Several items moved together: one box around them all. */
export function unionItem(items: Item[]): Item | null {
  if (!items.length) return null;
  const u = (k: "top" | "foot"): Box => ({
    x0: Math.min(...items.map((i) => i[k].x0)),
    y0: Math.min(...items.map((i) => i[k].y0)),
    x1: Math.max(...items.map((i) => i[k].x1)),
    y1: Math.max(...items.map((i) => i[k].y1)),
  });
  return { id: "group", kind: "table", top: u("top"), foot: u("foot"), turned: false };
}

/**
 * One edge being dragged (resizing): the nearest edge or centre of another item, or of the
 * room, on that axis within `tol`. Returns the snapped position and the guide to draw.
 */
export function snapEdge(v: number, axis: "x" | "y", span: [number, number], items: Item[], room: { w: number; h: number }, tol: number): { v: number; guide: Guide | null } {
  let best: number | null = null;
  let hit: Item | null = null;
  const consider = (t: number, i: Item | null) => {
    if (Math.abs(t - v) <= tol && (best === null || Math.abs(t - v) < Math.abs(best - v))) {
      best = t;
      hit = i;
    }
  };
  for (const i of items) if (!i.turned) for (const t of axis === "x" ? xs(i.top) : ys(i.top)) consider(t, i);
  for (const t of axis === "x" ? [0, room.w / 2, room.w] : [0, room.h / 2, room.h]) consider(t, null);
  if (best === null) return { v, guide: null };
  const b = best as number;
  const h = hit as Item | null;
  const lo = Math.min(span[0], h ? (axis === "x" ? h.top.y0 : h.top.x0) : 0);
  const hi = Math.max(span[1], h ? (axis === "x" ? h.top.y1 : h.top.x1) : axis === "x" ? room.h : room.w);
  return { v: b, guide: axis === "x" ? { x1: b, x2: b, y1: lo, y2: hi } : { x1: lo, x2: hi, y1: b, y2: b } };
}

/** Ruler steps ("nice numbers", 1 · 2 · 5 × 10ⁿ cm): the smallest step at least `minPx`
 *  apart on screen at zoom `k`. In feet: 1, 2, 5, 10, 20, 50… feet. */
export function rulerStep(k: number, minPx: number, feet = false): number {
  const unit = feet ? 30.48 : 1;
  for (let p = feet ? 0 : 0; p < 7; p++)
    for (const m of [1, 2, 5]) {
      const step = m * 10 ** p * unit;
      if (step * k >= minPx) return step;
    }
  return 10 ** 6;
}

/** Line several items up by an edge or centre (the group's own extent), or space them evenly.
 *  Returns each item's move. */
export function alignMoves(items: Item[], how: "left" | "centre" | "right" | "top" | "middle" | "bottom" | "spread-x" | "spread-y"): Map<string, { dx: number; dy: number }> {
  const out = new Map<string, { dx: number; dy: number }>();
  if (items.length < 2) return out;
  const g = unionItem(items)!.top;
  if (how === "spread-x" || how === "spread-y") {
    const x = how === "spread-x";
    const sorted = [...items].sort((a, b) => (x ? a.top.x0 - b.top.x0 : a.top.y0 - b.top.y0));
    const total = sorted.reduce((n, i) => n + (x ? i.top.x1 - i.top.x0 : i.top.y1 - i.top.y0), 0);
    const room = x ? g.x1 - g.x0 : g.y1 - g.y0;
    const gap = (room - total) / (sorted.length - 1);
    let at = x ? g.x0 : g.y0;
    for (const i of sorted) {
      const d = R(at - (x ? i.top.x0 : i.top.y0));
      out.set(i.id, x ? { dx: d, dy: 0 } : { dx: 0, dy: d });
      at += (x ? i.top.x1 - i.top.x0 : i.top.y1 - i.top.y0) + gap;
    }
    return out;
  }
  for (const i of items) {
    const b = i.top;
    const dx = how === "left" ? g.x0 - b.x0 : how === "right" ? g.x1 - b.x1 : how === "centre" ? (g.x0 + g.x1) / 2 - (b.x0 + b.x1) / 2 : 0;
    const dy = how === "top" ? g.y0 - b.y0 : how === "bottom" ? g.y1 - b.y1 : how === "middle" ? (g.y0 + g.y1) / 2 - (b.y0 + b.y1) / 2 : 0;
    out.set(i.id, { dx: R(dx), dy: R(dy) });
  }
  return out;
}
