import { OBJ_LABEL, tableSize, uid, type Chart, type ObjType, type Table, type VenueObject, footprint } from "./model";
import { nextTableLabel } from "./presets";

// The venue's floor plan, as read by the AI reader (api/_lib/floorplan.ts), turned into the
// plan: the room's size, the picture lined up under it, the room's things and the tables.

/** What the reader returns: boxes as fractions of the picture (api/_lib/floorplan.ts). */
export interface PlanRead {
  room: Box;
  width_m: number | null;
  depth_m: number | null;
  size_from: "dimensions" | "scale bar" | "table sizes" | "unknown";
  items: (Box & { type: ObjType; label: string })[];
  tables: (Box & { shape: "round" | "long"; seats: number | null })[];
  notes: string[];
}
type Box = { x0: number; y0: number; x1: number; y1: number };

/** Centimetres per pixel of the picture: from the plan's size, the host's width, or the tables. */
export function planScale(read: PlanRead, nat: { w: number; h: number }, widthM?: number): number {
  const wPx = (read.room.x1 - read.room.x0) * nat.w;
  const hPx = (read.room.y1 - read.room.y0) * nat.h;
  if (widthM && widthM > 0) return (widthM * 100) / wPx;
  if (read.width_m) return (read.width_m * 100) / wPx;
  if (read.depth_m) return (read.depth_m * 100) / hPx;
  const rounds = read.tables.filter((t) => t.shape === "round").map((t) => ((t.x1 - t.x0) * nat.w + (t.y1 - t.y0) * nat.h) / 2);
  if (rounds.length >= 2) {
    rounds.sort((a, b) => a - b);
    return 183 / rounds[Math.floor(rounds.length / 2)]; // a 10-seat round top is 1.83 m across
  }
  return 0;
}

/**
 * The plan, changed to match the venue's: room size, the picture lined up under it, the
 * room's things, and (if chosen) the tables moved onto the spots the plan draws. Guests keep
 * their seats. Returns what it did, for the message after.
 */
export function applyPlanRead(c: Chart, read: PlanRead, nat: { w: number; h: number }, cmPerPx: number, opts: { items: boolean; tables: boolean }) {
  const px = (fx: number, fy: number) => ({ x: Math.round((fx * nat.w - read.room.x0 * nat.w) * cmPerPx), y: Math.round((fy * nat.h - read.room.y0 * nat.h) * cmPerPx) });
  const before = { ...c.room };
  const room = { w: Math.round((read.room.x1 - read.room.x0) * nat.w * cmPerPx), h: Math.round((read.room.y1 - read.room.y0) * nat.h * cmPerPx) };
  c.room = { w: Math.min(20000, Math.max(300, room.w)), h: Math.min(20000, Math.max(300, room.h)) };
  if (c.bg) Object.assign(c.bg, { x: Math.round(-read.room.x0 * nat.w * cmPerPx), y: Math.round(-read.room.y0 * nat.h * cmPerPx), w: Math.round(nat.w * cmPerPx), h: Math.round(nat.h * cmPerPx) });
  let added = 0;
  let moved = 0;
  let leftOver = 0;

  if (opts.items) {
    const objs: VenueObject[] = read.items.map((it) => {
      const a = px(it.x0, it.y0);
      const b = px(it.x1, it.y1);
      const cx = (a.x + b.x) / 2;
      const cy = (a.y + b.y) / 2;
      let w = Math.max(40, b.x - a.x);
      let h = Math.max(40, b.y - a.y);
      let rot = 0;
      if (it.type === "entrance" || it.type === "exit") {
        // A door sits on its nearest wall, opening into the room.
        const d = { bottom: c.room.h - cy, top: cy, left: cx, right: c.room.w - cx };
        const wall = (Object.keys(d) as (keyof typeof d)[]).sort((p, q) => d[p] - d[q])[0];
        const along = wall === "left" || wall === "right" ? h : w;
        rot = { bottom: 0, top: 180, left: 90, right: 270 }[wall];
        w = Math.max(120, along);
        h = 50;
      }
      if (it.type === "pillar") w = h = Math.max(40, Math.min(w, h));
      return { id: uid("o"), type: it.type, label: it.label.length > 24 ? OBJ_LABEL[it.type] : it.label, x: Math.round(cx), y: Math.round(cy), w: Math.round(w), h: Math.round(h), rot };
    });
    // Things locked in place stay, and the plan's reading of that kind of thing is skipped.
    const kept = c.objects.filter((o) => o.fixed);
    c.objects = [...kept, ...objs.filter((o) => !kept.some((k) => k.type === o.type))];
  }

  if (opts.tables && read.tables.length) {
    // Each table goes to the plan's spot nearest where it stood in the room before (as a
    // share of the room's width and depth), so the bride's side stays on its side and the
    // sponsors stay up front. Tables locked in place stay where they are, in the way of the rest.
    const stage = c.objects.find((o) => o.type === "stage");
    const front = stage ? { x: stage.x, y: stage.y + stage.h / 2 } : null;
    const mine = c.tables.filter((t) => (t.shape === "round" || t.shape === "rect") && !t.fixed);
    const was = new Map(mine.map((t) => [t.id, { x: t.x / before.w, y: t.y / before.h }]));
    const spotAt = read.tables.map((t) => ({ x: (t.x0 + t.x1) / 2 - read.room.x0, y: (t.y0 + t.y1) / 2 - read.room.y0 })).map((p) => ({ x: p.x / (read.room.x1 - read.room.x0), y: p.y / (read.room.y1 - read.room.y0) }));
    const pairs: { t: Table; s: number; d: number }[] = [];
    for (const t of mine) spotAt.forEach((p, si) => pairs.push({ t, s: si, d: Math.hypot(p.x - was.get(t.id)!.x, p.y - was.get(t.id)!.y) }));
    pairs.sort((a, b) => a.d - b.d);
    const spotFor = new Map<string, number>();
    const taken = new Set<number>();
    for (const pr of pairs) {
      if (spotFor.has(pr.t.id) || taken.has(pr.s)) continue;
      spotFor.set(pr.t.id, pr.s);
      taken.add(pr.s);
    }
    const typical = mine.length ? mine.map((t) => t.seats).sort((p, q) => p - q)[Math.floor(mine.length / 2)] : 10;
    const placed = new Set<string>(c.tables.filter((t) => t.fixed).map((t) => t.id));
    const fixedBoxes = c.tables.filter((t) => t.fixed).map((t) => footprint(t));
    read.tables.forEach((sp, si) => {
      const a = px(sp.x0, sp.y0);
      const b = px(sp.x1, sp.y1);
      const at = { x: Math.round((a.x + b.x) / 2), y: Math.round((a.y + b.y) / 2) };
      // A spot where a table locked in place already stands: that's the one.
      if (fixedBoxes.some((f) => at.x > f.x0 && at.x < f.x1 && at.y > f.y0 && at.y < f.y1)) return;
      const t = mine.find((x) => spotFor.get(x.id) === si);
      if (t) {
        Object.assign(t, at, { rot: 0 });
        if (sp.shape === "long" && t.shape === "rect") t.w = Math.max(120, Math.round(b.x - a.x));
        placed.add(t.id);
        moved++;
      } else {
        const nt: Table = { id: uid("t"), label: nextTableLabel(c.tables), shape: sp.shape === "long" ? "rect" : "round", seats: sp.seats ?? typical, ...at, rot: 0, ...(sp.shape === "long" ? { w: Math.max(120, Math.round(b.x - a.x)) } : {}) };
        c.tables.push(nt);
        placed.add(nt.id);
        added++;
      }
    });
    // The couple's table: the free floor nearest the front of the stage.
    for (const t of c.tables.filter((x) => (x.shape === "head" || x.shape === "sweetheart") && !x.fixed)) {
      const at = freeFloor(c, t, placed, front ?? undefined);
      if (at) Object.assign(t, at, { rot: 0 });
      placed.add(t.id);
    }
    // More tables than the plan draws: the rest go to the nearest free floor, near the others.
    for (const t of mine.filter((x) => !spotFor.has(x.id))) {
      const w = was.get(t.id)!;
      const at = freeFloor(c, t, placed, { x: w.x * c.room.w, y: w.y * c.room.h });
      if (at) {
        Object.assign(t, at, { rot: 0 });
        placed.add(t.id);
        moved++;
      } else {
        // No room left: wait outside the right wall, in a column, until the host decides.
        const sz = tableSize(t);
        Object.assign(t, { x: Math.round(c.room.w + 160 + sz.w / 2), y: Math.round(200 + sz.h / 2 + leftOver * (sz.h + 60)), rot: 0 });
        leftOver++;
      }
    }
  }
  return { room: c.room, added, moved, leftOver };
}

/** The free spot nearest the tables already placed, clear of everything by 40 cm. */
function freeFloor(c: Chart, t: Table, placed: Set<string>, target?: { x: number; y: number }): { x: number; y: number } | null {
  const me = tableSize(t);
  const gap = 40;
  // In the way: tables already in their new places, and the room's things.
  const boxes = [
    ...c.tables
      .filter((o) => o.id !== t.id && placed.has(o.id))
      .map((o) => {
        const s = tableSize(o);
        return { x0: o.x - s.w / 2, y0: o.y - s.h / 2, x1: o.x + s.w / 2, y1: o.y + s.h / 2 };
      }),
    ...c.objects.map((o) => {
      const side = o.rot % 180 !== 0;
      const w = side ? o.h : o.w;
      const h = side ? o.w : o.h;
      // A door keeps its way in clear, about 2 m into the room.
      const reach = o.type === "entrance" || o.type === "exit" ? 200 : 0;
      return { x0: o.x - w / 2 - reach, y0: o.y - h / 2 - reach, x1: o.x + w / 2 + reach, y1: o.y + h / 2 + reach };
    }),
  ];
  const near = c.tables.filter((o) => placed.has(o.id));
  let best: { x: number; y: number } | null = null;
  let bestD = Infinity;
  for (let y = me.h / 2 + gap; y <= c.room.h - me.h / 2 - gap; y += 30)
    for (let x = me.w / 2 + gap; x <= c.room.w - me.w / 2 - gap; x += 30) {
      const a = { x0: x - me.w / 2 - gap, y0: y - me.h / 2 - gap, x1: x + me.w / 2 + gap, y1: y + me.h / 2 + gap };
      if (boxes.some((b) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0)) continue;
      const d = target ? Math.hypot(target.x - x, target.y - y) : near.length ? Math.min(...near.map((o) => Math.hypot(o.x - x, o.y - y))) : Math.hypot(x - c.room.w / 2, y - c.room.h / 2);
      if (d < bestD) {
        bestD = d;
        best = { x: Math.round(x), y: Math.round(y) };
      }
    }
  return best;
}

/** A phone photo or a PDF screenshot → a compressed JPEG data URL (≤ ~800 KB). */
export async function toDataUrl(file: File): Promise<{ url: string; w: number; h: number } | null> {
  let bmp: ImageBitmap;
  try {
    bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return null;
  }
  const scale = Math.min(1, 1800 / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * scale);
  const h = Math.round(bmp.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(bmp, 0, 0, w, h);
  let url = "";
  for (const q of [0.78, 0.65, 0.5, 0.4]) {
    url = canvas.toDataURL("image/jpeg", q);
    if (url.length < 800_000) break;
  }
  return { url, w, h };
}
