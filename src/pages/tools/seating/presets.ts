import { CHAIR, CHAIR_GAP, OBJ_LABEL, defaultRectWidth, footprint, freeSeats, roundRadius, uid, type Category, type Chart, type ChartKind, type ObjType, type Table, type VenueObject } from "./model";

// Ready-made rooms, sized to the guest count and kept as small as a real venue would be.
// Centimetres. Tables are spaced by their own size plus a 70 cm walkway between chair backs
// (a 10-seat round with chairs is ~2.9 m across, so 3.6 m centre to centre; 12-seat rounds a
// little more). The room is drawn round the tables with space for the buffet along one wall
// and the DJ and photo booth along the other, and a few layouts are tried for the smallest.
//   Wedding (PH): stage, presidential table in front of it, two sponsors' tables beside it,
//     secondary sponsors and entourage next, the bride's side left and the groom's right.
//   Debut: the debutante's table and family up front, Roses on one side of the dance floor,
//     Candles on the other, then everyone else. (Check with a coordinator before launch.)
//   Lauriat: 12-seat rounds, a VIP round up front.
//   Party: stage, a VIP round, rounds, buffet. Blank: an empty room.

export interface PresetInfo {
  kind: ChartKind;
  title: string;
  blurb: string;
}

export const PRESETS: PresetInfo[] = [
  { kind: "wedding", title: "Wedding (PH)", blurb: "Presidential, sponsors’, entourage, bride’s and groom’s sides" },
  { kind: "debut", title: "Debut", blurb: "Debutante’s table, family, Roses and Candles" },
  { kind: "lauriat", title: "Lauriat", blurb: "12-seat rounds with a VIP table" },
  { kind: "party", title: "Birthday or event", blurb: "Stage, VIP table and rounds" },
  { kind: "blank", title: "Blank room", blurb: "Start from an empty floor" },
];

const WALK = 70; // between chair backs
const GAP = 360; // a 10-seat round's spacing (extra tables added at the back keep to it)
const SIDE = 220; // outer chairs to the side walls: the buffet (or DJ) and a serving aisle
const BACK = 260; // last chairs to the back wall: the entrance and the gifts table

const obj = (type: ObjType, x: number, y: number, w: number, h: number, label = OBJ_LABEL[type]): VenueObject => ({ id: uid("o"), type, label, x, y, w, h, rot: 0 });
const round = (label: string, x: number, y: number, seats: number, extra: Partial<Table> = {}): Table => ({ id: uid("t"), label, shape: "round", seats, x, y, rot: 0, ...extra });

interface Special {
  label: string;
  note: string;
  cat: Category;
  seats?: number;
}

/** Slots around a front block, nearest to the front and centre first. `gap`: centre to
 *  centre; `inner`: the first column's distance from the centre line (half the middle aisle). */
function slots(front: number, rows: number, cols: number, gap: number, inner: number, blocked: (x: number, y: number) => boolean) {
  const out: { x: number; y: number }[] = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      for (const sgn of [-1, 1]) {
        const x = sgn * (inner + c * gap);
        const y = front + r * gap;
        if (!blocked(x, y)) out.push({ x, y });
      }
    }
  // Row by row from the front, centre outwards: each row is filled before the next starts.
  return out.sort((a, b) => a.y - b.y || Math.abs(a.x) - Math.abs(b.x));
}

/** `special`: guests headed for the sponsors', entourage or court tables, so the guest
 *  tables are counted from everyone else. One spare table is added for late RSVPs, and one
 *  more for about every six groups: groups are shared out evenly, so tables aren't all full. */
export function buildLayout(kind: ChartKind, guestCount: number, seatsPer = 10, special = 0, groups = 0): Pick<Chart, "room" | "tables" | "objects"> {
  if (kind === "blank") return { room: { w: 2400, h: 1800 }, tables: [], objects: [obj("entrance", 1200, 1800 - 40, 300, 60)] };
  const seats = kind === "lauriat" ? 12 : seatsPer;
  const need = Math.ceil(Math.max(guestCount, 20) * 1.06);

  const tables: Table[] = [];
  const objects: VenueObject[] = [];
  const stageY = 150;
  objects.push(obj("stage", 0, stageY, 800, 240));

  let specials: Special[] = [];
  let frontY = 420;
  if (kind === "wedding") {
    // Locked: Seat everyone leaves it for the couple and parents, whom the host seats.
    const head: Table = { id: uid("t"), label: "Presidential", note: "Couple & parents", shape: "head", seats: 10, x: 0, y: 430, rot: 0, locked: true };
    head.w = defaultRectWidth(head);
    tables.push(head);
    specials = [
      { label: "S1", note: "Sponsors", cat: "vip" },
      { label: "S2", note: "Sponsors", cat: "vip" },
      { label: "E1", note: "Secondary sponsors", cat: "entourage" },
      { label: "E2", note: "Entourage", cat: "entourage" },
    ];
    frontY = 470;
  } else if (kind === "debut") {
    const head: Table = { id: uid("t"), label: "Debutante", note: "Debutante & escort", shape: "head", seats: 4, x: 0, y: 430, rot: 0, locked: true };
    head.w = defaultRectWidth(head);
    tables.push(head);
    specials = [
      { label: "F", note: "Family", cat: "family" },
      { label: "F2", note: "Family", cat: "family" },
      { label: "R", note: "18 Roses", cat: "court" },
      { label: "C", note: "18 Candles", cat: "court" },
      { label: "R2", note: "18 Roses", cat: "court" },
      { label: "C2", note: "18 Candles", cat: "court" },
    ];
    frontY = 470;
  } else {
    tables.push(round("VIP", 0, 520, seats, { note: "Guests of honour", cat: "vip" }));
    frontY = 520;
  }

  // Dance floor in the middle, in front of the head table (and 1.2 m clear of its chairs);
  // the cake by its corner.
  const frontBottom = Math.max(0, ...tables.map((t) => footprint(t).y1));
  const dance = kind === "lauriat" ? null : obj("dance", 0, Math.max(frontY + 360, frontBottom + 120 + 210), 560, 420);
  if (dance) objects.push(dance);
  const cake = dance ? { x: dance.w / 2 + 10, y: dance.y - dance.h / 2 - 10 } : null;
  // A round table's footprint (top and chairs), and the spacing that leaves a walkway.
  const R = roundRadius(seats) + CHAIR_GAP + CHAIR;
  const pitch = 2 * R + WALK;
  const inner = R + 75; // a 1.5 m aisle down the middle
  const clear = R + 60; // chairs kept this far from the dance floor and the cake
  const blocked = (x: number, y: number) => {
    if (Math.abs(x) < 470 && y < frontY + 170) return true; // head table / VIP area
    if (dance && Math.abs(x) < dance.w / 2 + clear && Math.abs(y - dance.y) < dance.h / 2 + clear) return true;
    if (cake && Math.hypot(x - cake.x, y - cake.y) < clear + 35) return true;
    if (kind === "lauriat" && Math.abs(x) < 300 && y < 720) return true;
    return false;
  };

  const specialCap = specials.reduce((a, s) => a + (s.seats ?? seats), 0);
  const inSpecials = Math.min(special, specialCap);
  const regular = Math.max(4, Math.ceil(Math.max(0, need - inSpecials) / seats) + 1 + Math.floor(groups / 6));
  const total = regular + specials.length;

  // Lay the tables out with so many columns each side, and say how big the room would be.
  const tryCols = (cols: number) => {
    const rows = Math.ceil(total / (cols * 2)) + 4;
    const free = slots(frontY, rows, cols, pitch, inner, blocked).slice(0, total);
    // Specials take the slots nearest the front, alternating left/right; Roses left, Candles right.
    const placed: Table[] = [];
    const left = free.filter((s) => s.x < 0);
    const right = free.filter((s) => s.x > 0);
    specials.forEach((s, i) => {
      const rightSide = kind === "debut" ? s.label.startsWith("C") || s.label === "F2" : i % 2 === 1;
      const pool = rightSide ? right : left;
      const slot = pool.shift() ?? free.find((f) => !placed.some((p) => p.x === f.x && p.y === f.y));
      if (!slot) return;
      placed.push(round(s.label, slot.x, slot.y, s.seats ?? seats, { note: s.note, cat: s.cat }));
    });
    const rest = [...left, ...right].sort((a, b) => a.y - b.y || a.x - b.x).slice(0, regular);
    // Number guests' tables in reading order: front row first, left to right.
    rest.sort((a, b) => a.y - b.y || a.x - b.x);
    rest.forEach((s, i) => {
      const side = kind === "wedding" ? (s.x < 0 ? "bride" : "groom") : undefined;
      placed.push(round(String(i + 1), s.x, s.y, seats, { ...(side ? { side, note: side === "bride" ? "Bride’s guests" : "Groom’s guests" } : {}) }));
    });
    const half = Math.max(...placed.map((t) => Math.abs(t.x) + R + SIDE), 400 + 120, dance ? dance.w / 2 + 300 : 0);
    const bottom = Math.max(...placed.map((t) => t.y + R + BACK), dance ? dance.y + dance.h / 2 + 300 : 0);
    return { placed, w: Math.round(half * 2), h: Math.round(bottom) };
  };
  // The smallest room of a sensible shape.
  let best = tryCols(2);
  let bestScore = Infinity;
  for (let cols = 2; cols <= 8; cols++) {
    const l = tryCols(cols);
    if (l.placed.length < total) continue;
    // Halls run either way; only very long thin rooms are passed over.
    const aspect = l.w / l.h;
    const score = l.w * l.h * (aspect >= 0.75 && aspect <= 2 ? 1 : 1.3);
    if (score < bestScore) {
      best = l;
      bestScore = score;
    }
  }
  tables.push(...best.placed);
  const w = best.w;
  const h = best.h;
  const cx = w / 2;
  for (const t of tables) t.x += cx;
  for (const o of objects) o.x += cx;

  objects.push(obj("buffet", 60, h * 0.5, 70, Math.min(900, h * 0.5)));
  objects.push(obj("dj", w - 60, 420, 70, 220));
  objects.push(obj("photo", w - 60, Math.min(h - 400, 900), 70, 220));
  objects.push(obj("entrance", cx, h - 30, 320, 50));
  objects.push(obj("gifts", cx + 420, h - 120, 160, 70));
  if (dance && cake) objects.push(obj("cake", cx + cake.x, cake.y, 70, 70));
  return { room: { w, h }, tables, objects };
}

/** Next number for a new table. */
export function nextTableLabel(tables: Table[]) {
  const nums = tables.map((t) => Number(t.label)).filter(Number.isFinite);
  return String((nums.length ? Math.max(...nums) : 0) + 1);
}

/** Guests whose list already said where they sit ("TABLE 5: …"): seat them there, making
 *  any table the room doesn't have yet. Returns how many were seated. */
export function seatByTableLabels(c: Chart, want: Record<string, string>): number {
  const ids = Object.keys(want).filter((id) => c.guests.some((g) => g.id === id && !g.tableId));
  if (!ids.length) return 0;
  const norm = (s: string) => s.toLowerCase().replace(/^table\s*/, "").replace(/[^a-z0-9]+/g, " ").trim();
  const find = (label: string) => {
    const n = norm(label);
    return (
      c.tables.find((t) => norm(t.label) === n) ??
      // "Presidential", "VIP", "Sponsors": a table whose name or note says so, with room.
      c.tables.find((t) => !/^\d/.test(n) && (norm(t.label).includes(n) || norm(t.note ?? "").includes(n)) && freeSeats(t, c.guests.filter((g) => g.tableId === t.id)).length > 0)
    );
  };
  const byLabel = new Map<string, string[]>();
  for (const id of ids) byLabel.set(want[id], [...(byLabel.get(want[id]) ?? []), id]);
  let seated = 0;
  let added = 0;
  for (const [label, people] of byLabel) {
    let t = find(label);
    if (!t) {
      // A new table in a row at the back of the room.
      const maxY = Math.max(400, ...c.tables.map((x) => x.y));
      const cols = Math.max(1, Math.floor((c.room.w - 300) / GAP));
      const x = 300 + (added % cols) * GAP;
      const y = maxY + GAP * (1 + Math.floor(added / cols));
      t = round(/^\d+[a-z]?$/i.test(label) ? label.toUpperCase() : label, x, y, Math.max(10, Math.min(16, people.length)));
      c.tables.push(t);
      added++;
      if (y + 300 > c.room.h) {
        const grow = y + 300 - c.room.h;
        c.room.h += grow;
        for (const o of c.objects) if (o.type === "entrance" || o.type === "gifts") o.y += grow;
      }
    }
    const tt = t;
    let free = freeSeats(tt, c.guests.filter((g) => g.tableId === tt.id));
    if (free.length < people.length && tt.shape === "round" && tt.seats < 16) {
      tt.seats = Math.min(16, tt.seats + (people.length - free.length));
      free = freeSeats(tt, c.guests.filter((g) => g.tableId === tt.id));
    }
    people.slice(0, free.length).forEach((id, i) => {
      const g = c.guests.find((x) => x.id === id)!;
      g.tableId = tt.id;
      g.seat = free[i];
      seated++;
    });
  }
  return seated;
}

/** "Andrea & Miguel" at the middle of the presidential table; "Bea" at the debutante's. */
export function seatHonorees(c: Chart, names: string) {
  const people = names
    .split(/\s*(?:&|\/|\+|\band\b|,)\s*/i)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 2);
  const head = c.tables.find((t) => t.label === "Presidential" || t.label === "Debutante");
  if (!people.length || !head) return;
  const group = { id: uid("g"), name: c.kind === "debut" ? "Debutante" : "The couple", cat: "vip" as const };
  c.groups.unshift(group);
  const party = uid("p");
  const mid = Math.floor(head.seats / 2);
  const seats = people.length === 2 ? [mid - 1, mid] : [Math.floor((head.seats - 1) / 2)];
  people.forEach((name, i) => {
    c.guests.unshift({ id: uid("u"), name, groupId: group.id, party, tableId: head.id, seat: seats[i] });
  });
}
