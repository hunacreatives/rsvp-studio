import { CHAIR, contentBounds, dims, isRound, rotate, seatOffsets, topRadius, type Chart, type Table, type VenueObject } from "./model";

// "Fit my tables to this room": spread the tables over the room as they were arranged
// (front stays front, the bride's side stays on its side), keeping them off the stage, the
// dance floor and everything else in the room, off the walls, pillars and stairs drawn on
// the venue's plan (its dark areas), and a walkway apart from each other. No AI: geometry,
// instant, and the same every time. Items left outside a resized room come back inside.

const WALK = 70; // walkway between chair backs, cm
const WALL = 50; // clearance from the walls, cm
const CELL = 20; // venue-plan sampling grid, cm

type Box = { x0: number; y0: number; x1: number; y1: number };
const overlap = (a: Box, b: Box) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;

function halfSize(w: number, h: number, rot: number) {
  const r = ((rot % 180) + 180) % 180;
  if (r === 0) return { hw: w / 2, hh: h / 2 };
  if (r === 90) return { hw: h / 2, hh: w / 2 };
  const d = Math.max(w, h) / 2;
  return { hw: d, hh: d };
}
/** The table's real footprint: its top plus its chairs (a head table has chairs on one side only). */
const tableBox = (t: Table, x = t.x, y = t.y): Box => {
  if (isRound(t)) {
    const r = topRadius(t) + 30 + CHAIR;
    return { x0: x - r, y0: y - r, x1: x + r, y1: y + r };
  }
  const { w, h } = dims(t);
  const pts: [number, number][] = [[-w / 2, -h / 2], [w / 2, -h / 2], [-w / 2, h / 2], [w / 2, h / 2]];
  for (const [sx, sy] of seatOffsets(t)) pts.push([sx - CHAIR, sy - CHAIR], [sx + CHAIR, sy + CHAIR], [sx - CHAIR, sy + CHAIR], [sx + CHAIR, sy - CHAIR]);
  const r = pts.map((p) => rotate(p, t.rot));
  return { x0: x + Math.min(...r.map((p) => p[0])), y0: y + Math.min(...r.map((p) => p[1])), x1: x + Math.max(...r.map((p) => p[0])), y1: y + Math.max(...r.map((p) => p[1])) };
};
const objBox = (o: VenueObject, x = o.x, y = o.y): Box => {
  const { hw, hh } = halfSize(o.w, o.h, o.rot);
  return { x0: x - hw, y0: y - hh, x1: x + hw, y1: y + hh };
};
const grow = (b: Box, d: number): Box => ({ x0: b.x0 - d, y0: b.y0 - d, x1: b.x1 + d, y1: b.y1 + d });

/** Where the venue's plan has ink (walls, pillars, stairs), as a summed-area table so any
 *  rectangle can be checked at once. */
async function inkMap(chart: Chart, url: string | null) {
  if (!url || !chart.bg) return null;
  const img = new Image();
  img.src = url;
  try {
    await img.decode();
  } catch {
    return null;
  }
  const bg = chart.bg;
  const cols = Math.max(1, Math.round(bg.w / CELL));
  const rows = Math.max(1, Math.round(bg.h / CELL));
  // Draw the plan at 3 px per cell, then count dark pixels per cell.
  const k = 3;
  const canvas = document.createElement("canvas");
  canvas.width = cols * k;
  canvas.height = rows * k;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const px = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  const sat = new Int32Array((cols + 1) * (rows + 1));
  for (let r = 0; r < rows; r++) {
    let rowSum = 0;
    for (let c = 0; c < cols; c++) {
      let dark = 0;
      for (let dy = 0; dy < k; dy++)
        for (let dx = 0; dx < k; dx++) {
          const i = ((r * k + dy) * canvas.width + (c * k + dx)) * 4;
          if (px[i] * 0.3 + px[i + 1] * 0.59 + px[i + 2] * 0.11 < 150) dark++;
        }
      rowSum += dark >= 2 ? 1 : 0;
      sat[(r + 1) * (cols + 1) + (c + 1)] = sat[r * (cols + 1) + (c + 1)] + rowSum;
    }
  }
  return (b: Box) => {
    const c0 = Math.max(0, Math.floor((b.x0 - bg.x) / CELL));
    const r0 = Math.max(0, Math.floor((b.y0 - bg.y) / CELL));
    const c1 = Math.min(cols, Math.ceil((b.x1 - bg.x) / CELL));
    const r1 = Math.min(rows, Math.ceil((b.y1 - bg.y) / CELL));
    if (c1 <= c0 || r1 <= r0) return false;
    const n = sat[r1 * (cols + 1) + c1] - sat[r0 * (cols + 1) + c1] - sat[r1 * (cols + 1) + c0] + sat[r0 * (cols + 1) + c0];
    return n > 0;
  };
}

export interface FitResult {
  tables: { id: string; x: number; y: number }[];
  objects: { id: string; x: number; y: number }[];
  moved: number;
  overflow: number;
  inkUsed: boolean;
}

export async function fitTablesToRoom(chart: Chart, bgUrl: string | null): Promise<FitResult> {
  const { w: W, h: H } = chart.room;
  const ink = await inkMap(chart, bgUrl);
  const inRoom = (b: Box) => b.x0 >= WALL && b.y0 >= WALL && b.x1 <= W - WALL && b.y1 <= H - WALL;

  // Items outside the room come back in, at the same relative place.
  const all = contentBounds({ ...chart, room: { w: 0, h: 0 } });
  const mapPt = (x: number, y: number) => ({ x: WALL + ((x - all.x) / Math.max(1, all.w)) * (W - 2 * WALL), y: WALL + ((y - all.y) / Math.max(1, all.h)) * (H - 2 * WALL) });
  const objects = chart.objects.map((o) => {
    const b = objBox(o);
    const wall = o.type === "entrance" || o.type === "exit";
    if (wall ? b.x0 >= -o.w && b.x1 <= W + o.w && b.y0 >= -o.h && b.y1 <= H + o.h : b.x0 >= 0 && b.y0 >= 0 && b.x1 <= W && b.y1 <= H) return { id: o.id, x: o.x, y: o.y, moved: false };
    const p = mapPt(o.x, o.y);
    const { hw, hh } = halfSize(o.w, o.h, o.rot);
    return { id: o.id, x: Math.round(Math.min(W - hw, Math.max(hw, p.x))), y: Math.round(Math.min(H - hh, Math.max(hh, p.y))), moved: true };
  });
  const obstacles = chart.objects.map((o, i) => grow(objBox(o, objects[i].x, objects[i].y), 40));

  const placed: Box[] = [];
  const out: FitResult["tables"] = [];
  let overflow = 0;
  let moved = 0;
  const stage = chart.objects.find((o) => o.type === "stage");
  const stageAt = stage ? objects[chart.objects.indexOf(stage)] : null;
  const clear = (b: Box) => {
    if (!inRoom(b)) return false;
    const gb = grow(b, WALK / 2);
    if (obstacles.some((o) => overlap(gb, o))) return false;
    if (placed.some((p) => overlap(gb, p))) return false;
    if (ink && ink(grow(b, -10))) return false;
    return true;
  };
  /** Nearest clear spot to (x, y), searching outwards. */
  const nearest = (t: Table, want: { x: number; y: number }) => {
    const maxR = Math.hypot(W, H);
    for (let r = 0; r < maxR; r += 20) {
      const steps = r === 0 ? 1 : Math.max(8, Math.round((2 * Math.PI * r) / 30));
      for (let i = 0; i < steps; i++) {
        const a = (i / steps) * Math.PI * 2;
        const x = Math.round((want.x + Math.cos(a) * r) / 10) * 10;
        const y = Math.round((want.y + Math.sin(a) * r) / 10) * 10;
        if (clear(tableBox(t, x, y))) return { x, y };
      }
    }
    return null;
  };
  const put = (t: Table, spot: { x: number; y: number } | null) => {
    if (!spot) {
      const b = tableBox(t, 0, 0);
      spot = { x: W + 120 - b.x0, y: 200 + overflow * 420 - b.y0 };
      overflow++;
    }
    placed.push(grow(tableBox(t, spot.x, spot.y), WALK / 2));
    if (spot.x !== t.x || spot.y !== t.y) moved++;
    out.push({ id: t.id, ...spot });
  };

  // 1. Head and sweetheart tables stay just in front of the stage (or where they are).
  const heads = chart.tables.filter((t) => t.shape === "head" || t.shape === "sweetheart");
  for (const t of heads) {
    const want = stage && stageAt ? { x: stageAt.x + (t.x - stage.x), y: stageAt.y + (t.y - stage.y) } : mapPt(t.x, t.y);
    put(t, nearest(t, want));
  }
  const front = heads[0] ? out[0] : stageAt ? { x: stageAt.x, y: stageAt.y + (stage?.h ?? 0) / 2 } : { x: W / 2, y: WALL };
  const cx = front.x;

  // 2. Round tables in tidy rows: try a few grids (square and staggered, shifted) and keep
  //    the one with the most clear spots around the pillars, stage and dance floor.
  const rounds = chart.tables.filter((t) => isRound(t) && !heads.includes(t));
  const others = chart.tables.filter((t) => !isRound(t) && !heads.includes(t));
  const big = rounds.reduce((m, t) => Math.max(m, tableBox(t, 0, 0).x1 * 2), 0);
  let slots: { x: number; y: number }[] = [];
  let bestBalance = Infinity;
  if (rounds.length) {
    const S = big + WALK;
    const probe = rounds.reduce((a, b) => (tableBox(a, 0, 0).x1 >= tableBox(b, 0, 0).x1 ? a : b));
    for (const stagger of [false, true])
      for (let fx = 0; fx < 4; fx++)
        for (let fy = 0; fy < 4; fy++) {
          const found: { x: number; y: number }[] = [];
          const rowH = stagger ? S * 0.87 : S;
          for (let row = 0, y = WALL + big / 2 + (fy * rowH) / 4; y < H; row++, y += rowH)
            for (let x = WALL + big / 2 + (fx * S) / 4 + (stagger && row % 2 ? S / 2 : 0); x < W; x += S) if (clear(tableBox(probe, x, y))) found.push({ x: Math.round(x / 10) * 10, y: Math.round(y / 10) * 10 });
          // More spots wins; then the grid that sits most evenly about the centre line.
          const balance = Math.abs(found.reduce((a, p) => a + (p.x - cx), 0)) / Math.max(1, found.length);
          if (found.length > slots.length || (found.length === slots.length && balance < bestBalance)) {
            slots = found;
            bestBalance = balance;
          }
        }
  }
  // Nearest the front first.
  const d = (p: { x: number; y: number }) => Math.hypot(p.x - front.x, (p.y - front.y) * 1.15);
  slots.sort((a, b) => d(a) - d(b));
  const take = (want: (p: { x: number; y: number }) => boolean) => {
    const i = slots.findIndex(want);
    const j = i >= 0 ? i : 0;
    return slots.length ? slots.splice(j, 1)[0] : null;
  };
  // Sponsors, entourage and the like: the closest spots, on the side they were on.
  const special = rounds.filter((t) => t.cat).sort((a, b) => a.y - b.y || a.x - b.x);
  const guests = rounds.filter((t) => !t.cat);
  for (const t of special) {
    const leftWas = t.x < (chart.tables.find((x) => x.shape === "head")?.x ?? chart.room.w / 2);
    const p = take((s) => (leftWas ? s.x < cx : s.x >= cx));
    if (p) {
      placed.push(grow(tableBox(t, p.x, p.y), WALK / 2));
      if (p.x !== t.x || p.y !== t.y) moved++;
      out.push({ id: t.id, ...p });
    } else put(t, nearest(t, mapPt(t.x, t.y)));
  }
  // Guest tables: the bride's side on the left, the groom's on the right, numbered in
  // reading order (front row first, left to right).
  const num = (t: Table) => (Number.isFinite(Number(t.label)) ? Number(t.label) : 999);
  const groups: [Table[], ((p: { x: number }) => boolean) | null][] = guests.some((t) => t.side)
    ? [
        [guests.filter((t) => t.side === "bride"), (p) => p.x < cx],
        [guests.filter((t) => t.side === "groom"), (p) => p.x >= cx],
        [guests.filter((t) => !t.side), null],
      ]
    : [[guests, null]];
  for (const [ts, side] of groups) {
    const mine: { x: number; y: number }[] = [];
    for (let i = 0; i < ts.length; i++) {
      const p = take((s) => !side || side(s));
      if (p) mine.push(p);
    }
    mine.sort((a, b) => a.y - b.y || a.x - b.x);
    [...ts].sort((a, b) => num(a) - num(b) || a.y - b.y).forEach((t, i) => {
      const p = mine[i];
      if (p) {
        placed.push(grow(tableBox(t, p.x, p.y), WALK / 2));
        if (p.x !== t.x || p.y !== t.y) moved++;
        out.push({ id: t.id, ...p });
      } else put(t, null);
    });
  }
  // 3. Long, U and L tables: the nearest clear spot to where they were.
  for (const t of others) put(t, nearest(t, mapPt(t.x, t.y)));

  return { tables: out, objects: objects.filter((o) => o.moved).map(({ id, x, y }) => ({ id, x, y })), moved, overflow, inkUsed: !!ink };
}
