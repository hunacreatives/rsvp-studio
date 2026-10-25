// Seat Planner — the chart a host builds. Lives in the browser (store.ts) and, later, in
// seating_charts for signed-in hosts. Units are centimetres, so rooms and tables keep
// real sizes (a 10-seat round is 1.83 m across) and a traced venue plan can be scaled.

export type Shape = "round" | "rect" | "head" | "sweetheart" | "ushape" | "lshape" | "cocktail";
export type Category = "vip" | "entourage" | "bride" | "groom" | "family" | "friends" | "work" | "court" | "kids" | "other";
export type ObjType = "stage" | "dance" | "buffet" | "dj" | "bar" | "cake" | "photo" | "entrance" | "gifts" | "lechon" | "exit" | "restroom" | "pillar" | "custom";
export type ChartKind = "wedding" | "debut" | "lauriat" | "party" | "blank";

export interface Table {
  id: string;
  /** What guests read: "1", "S1", "Presidential". */
  label: string;
  /** Small line under the label: "Sponsors", "Bride’s family". */
  note?: string;
  shape: Shape;
  seats: number;
  x: number;
  y: number;
  rot: number;
  /** rect/head only, centimetres. */
  w?: number;
  h?: number;
  /** Keep these guests: Seat everyone never moves anyone at a locked table. */
  locked?: boolean;
  /** Lock in place: can't be moved, turned or resized on the plan (fit and the floor-plan
   *  reader work around it). Separate from `locked`, so a head table can stay movable while
   *  its guests are kept. */
  fixed?: boolean;
  /** U- and L-shapes: chairs along the inside edges too (a "hollow U"), not just the outside. */
  inside?: boolean;
  /** Who the table is meant for, so Seat everyone puts that category there first. */
  cat?: Category;
  /** Left/right of the aisle for the bride's and groom's sides. */
  side?: "bride" | "groom";
  /** Kept empty for walk-ins: Seat everyone leaves it alone. */
  spare?: boolean;
}

export interface VenueObject {
  id: string;
  type: ObjType;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  rot: number;
  /** Lock in place: can't be moved, turned or resized on the plan. */
  fixed?: boolean;
}

export interface Rule {
  id: string;
  a: string;
  b: string;
  kind: "together" | "apart";
  /** Must: never broken by Seat everyone. Prefer: followed when there's room to. */
  must: boolean;
}

export interface Background {
  key: string;
  x: number;
  y: number;
  w: number;
  h: number;
  opacity: number;
}

export interface Group {
  id: string;
  name: string;
  cat: Category;
  /** A group of another kind on one side ("Officemates (bride)"); bride/groom groups don't need it. */
  side?: "bride" | "groom";
}

export interface Guest {
  id: string;
  name: string;
  groupId: string | null;
  /** Household: people who arrive together and must sit together. */
  party: string;
  tableId: string | null;
  seat: number | null;
  /** access: needs an easy way in and out (wheelchair, walker, pregnant). */
  tags?: GuestTag[];
  meal?: string;
  /** Their line on the event's invite list (set when seats are sent, or the plan starts from
   *  RSVPs), or "r:" + their reply when they answered the open form and aren't on the list. */
  inviteeId?: string;
  /** What their RSVP says: coming, can't come, or not replied yet. Unset = not from an event. */
  reply?: "yes" | "no" | "pending";
}

export type GuestTag = "senior" | "kid" | "vip" | "plusone" | "access";

/** How Seat everyone seats people (the choices under its arrow). */
export interface SeatPrefs {
  /** Seats left free at each table for walk-ins. */
  spare?: 0 | 1 | 2;
  /** Kids with their household, or together at one table. */
  kids?: "parents" | "table";
  /** Bride's and groom's guests on their own sides, or mixed. */
  sides?: "apart" | "mix";
  /** Seniors and guests who need easy access near the exits and away from the speakers. */
  care?: boolean;
}

export interface Chart {
  v: 1;
  id: string;
  title: string;
  /** "Andrea & Miguel", "Bea": seated at the presidential / debutante table. */
  names?: string;
  /** Seating rules between two guests (Seat everyone follows them). */
  rules?: Rule[];
  /** A venue floor plan under everything (image kept separately: store.ts bgImage). */
  bg?: Background;
  prefs?: SeatPrefs;
  /** The event website the seats were sent to (Send seats to your website). */
  site?: {
    eventId: string;
    slug: string | null;
    finder?: boolean;
    /** When replies were last read in. */
    syncedAt?: number;
    /** The last answer acted on, per invite-list line (or "r:" + reply id): "no", "yes:3", "pending".
     *  Replies change the plan only when this changes, so the host's own fixes stay. */
    seen?: Record<string, string>;
    /** Day-of changes (walk-ins, moves) already brought into the plan, up to this time. */
    dayAt?: string;
  };
  kind: ChartKind;
  room: { w: number; h: number };
  tables: Table[];
  objects: VenueObject[];
  groups: Group[];
  guests: Guest[];
  updatedAt: number;
}

export const CATEGORY_LABEL: Record<Category, string> = {
  vip: "VIP & sponsors",
  entourage: "Entourage",
  bride: "Bride’s guests",
  groom: "Groom’s guests",
  family: "Family",
  friends: "Friends",
  work: "Work",
  court: "Debut court",
  kids: "Kids",
  other: "Other guests",
};

export const OBJ_LABEL: Record<ObjType, string> = {
  stage: "Stage",
  dance: "Dance floor",
  buffet: "Buffet",
  dj: "Sound · DJ",
  bar: "Bar",
  cake: "Cake",
  photo: "Photo booth",
  entrance: "Entrance",
  gifts: "Gifts",
  lechon: "Lechon",
  exit: "Exit",
  restroom: "Restrooms",
  pillar: "Pillar",
  custom: "Area",
};

export const SHAPE_LABEL: Record<Shape, string> = {
  round: "Round",
  rect: "Long",
  head: "Head table",
  sweetheart: "Sweetheart",
  ushape: "U-shape",
  lshape: "L-shape",
  cocktail: "Cocktail",
};

let counter = 0;
export const uid = (p = "") => p + Date.now().toString(36).slice(-5) + (counter++).toString(36) + Math.random().toString(36).slice(2, 5);

/** Round table radius for a seat count: 8 → 60" (76 cm), 10 → 72", 12 → 84". */
export function roundRadius(seats: number) {
  if (seats <= 6) return 61;
  if (seats <= 8) return 76;
  if (seats <= 10) return 91;
  if (seats <= 12) return 107;
  return 107 + (seats - 12) * 9;
}

export const CHAIR = 24; // seat circle radius
export const CHAIR_GAP = 30; // table edge → seat centre

/** Radius of the table top: rounds by seat count; a cocktail (high-top) table is small. */
export function topRadius(t: Pick<Table, "shape" | "seats">) {
  return t.shape === "cocktail" ? 40 : roundRadius(t.seats);
}

export const isRound = (t: Pick<Table, "shape">) => t.shape === "round" || t.shape === "cocktail";

export function tableSize(t: Table): { w: number; h: number } {
  if (isRound(t)) {
    const r = topRadius(t) + CHAIR_GAP + CHAIR;
    return { w: r * 2, h: r * 2 };
  }
  const { w, h } = dims(t);
  const pad = CHAIR_GAP + CHAIR;
  return { w: w + pad * 2, h: h + pad * 2 };
}

const ARM = 76; // depth of a table top (a 30-inch banquet table)
const STEP = 64; // table length per seat

/** Width/depth of rect-like tables (centimetres), from what's set or from the seat count. */
export function dims(t: Pick<Table, "shape" | "seats" | "w" | "h">): { w: number; h: number } {
  if (t.w && t.h) return { w: t.w, h: t.h };
  const w = t.w ?? defaultRectWidth(t);
  if (t.shape === "ushape") return { w, h: t.h ?? Math.max(ARM * 2, Math.round((t.seats * STEP - w) / 2)) };
  if (t.shape === "lshape") return { w, h: t.h ?? Math.max(ARM * 2, t.seats * STEP - w) };
  return { w, h: t.h ?? (t.shape === "sweetheart" ? 70 : ARM) };
}

export function defaultRectWidth(t: Pick<Table, "shape" | "seats">) {
  if (t.shape === "sweetheart") return Math.max(130, t.seats * 66);
  if (t.shape === "ushape") return Math.max(300, Math.round((t.seats * STEP) * 0.4));
  if (t.shape === "lshape") return Math.max(240, Math.round((t.seats * STEP) * 0.55));
  const perSide = t.shape === "head" ? t.seats : Math.ceil(t.seats / 2);
  return Math.max(120, perSide * STEP);
}

/** Outline of a non-round table top, centred on 0,0 (SVG path). */
export function tablePath(t: Table): string {
  const { w, h } = dims(t);
  const x0 = -w / 2;
  const y0 = -h / 2;
  if (t.shape === "ushape") {
    // Open side faces up; the base runs along the bottom.
    return `M${x0} ${y0}H${x0 + ARM}V${y0 + h - ARM}H${x0 + w - ARM}V${y0}H${x0 + w}V${y0 + h}H${x0}Z`;
  }
  if (t.shape === "lshape") {
    return `M${x0} ${y0}H${x0 + w}V${y0 + ARM}H${x0 + ARM}V${y0 + h}H${x0}Z`;
  }
  const r = t.shape === "sweetheart" ? Math.min(h / 2, 34) : 12;
  return `M${x0 + r} ${y0}H${x0 + w - r}A${r} ${r} 0 0 1 ${x0 + w} ${y0 + r}V${y0 + h - r}A${r} ${r} 0 0 1 ${x0 + w - r} ${y0 + h}H${x0 + r}A${r} ${r} 0 0 1 ${x0} ${y0 + h - r}V${y0 + r}A${r} ${r} 0 0 1 ${x0 + r} ${y0}Z`;
}

/** Seat centres relative to the table centre, before rotation. Head tables seat one side
 *  (facing the room); long tables seat both sides. */
export function seatOffsets(t: Table): [number, number][] {
  const out: [number, number][] = [];
  if (isRound(t)) {
    const r = topRadius(t) + CHAIR_GAP;
    for (let i = 0; i < t.seats; i++) {
      const a = (i / t.seats) * Math.PI * 2 - Math.PI / 2;
      out.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
    return out;
  }
  const { w, h } = dims(t);
  // Seats spread evenly along a path of straight runs (outside edges of U and L tables).
  const along = (runs: { from: [number, number]; to: [number, number] }[]) => {
    const lens = runs.map((r) => Math.hypot(r.to[0] - r.from[0], r.to[1] - r.from[1]));
    const total = lens.reduce((a, b) => a + b, 0);
    for (let i = 0; i < t.seats; i++) {
      let d = ((i + 0.5) / t.seats) * total;
      let k = 0;
      while (k < runs.length - 1 && d > lens[k]) d -= lens[k++];
      const f = lens[k] ? d / lens[k] : 0;
      const r = runs[k];
      out.push([r.from[0] + (r.to[0] - r.from[0]) * f, r.from[1] + (r.to[1] - r.from[1]) * f]);
    }
    return out;
  };
  const g = CHAIR_GAP;
  if (t.shape === "ushape") {
    return along([
      { from: [-w / 2 - g, -h / 2 + 20], to: [-w / 2 - g, h / 2 + g] },
      { from: [-w / 2, h / 2 + g], to: [w / 2, h / 2 + g] },
      { from: [w / 2 + g, h / 2 + g], to: [w / 2 + g, -h / 2 + 20] },
      ...(t.inside ? innerRuns(t) : []),
    ]);
  }
  if (t.shape === "lshape") {
    return along([
      { from: [-w / 2 - g, h / 2 - 20], to: [-w / 2 - g, -h / 2 - g] },
      { from: [-w / 2, -h / 2 - g], to: [w / 2 - 20, -h / 2 - g] },
      ...(t.inside ? innerRuns(t) : []),
    ]);
  }
  if (t.shape === "head" || t.shape === "sweetheart") {
    const step = w / t.seats;
    for (let i = 0; i < t.seats; i++) out.push([-w / 2 + step * (i + 0.5), -h / 2 - CHAIR_GAP]);
    return out;
  }
  const top = Math.ceil(t.seats / 2);
  const bottom = t.seats - top;
  for (let i = 0; i < top; i++) out.push([-w / 2 + (w / top) * (i + 0.5), -h / 2 - CHAIR_GAP]);
  for (let i = 0; i < bottom; i++) out.push([w / 2 - (w / bottom) * (i + 0.5), h / 2 + CHAIR_GAP]);
  return out;
}

// ---- footprints (snapping, distances, fit) --------------------------------------------
export type Box = { x0: number; y0: number; x1: number; y1: number };

/** The table's real footprint on the floor: its top plus its chairs, as an upright box (a head
 *  table has chairs on one side only, so its box isn't centred on t.x, t.y). */
export function footprint(t: Table, x = t.x, y = t.y): Box {
  if (isRound(t)) {
    const r = topRadius(t) + CHAIR_GAP + CHAIR;
    return { x0: x - r, y0: y - r, x1: x + r, y1: y + r };
  }
  const { w, h } = dims(t);
  const pts: [number, number][] = [[-w / 2, -h / 2], [w / 2, -h / 2], [-w / 2, h / 2], [w / 2, h / 2]];
  for (const [sx, sy] of seatOffsets(t)) pts.push([sx - CHAIR, sy - CHAIR], [sx + CHAIR, sy + CHAIR], [sx - CHAIR, sy + CHAIR], [sx + CHAIR, sy - CHAIR]);
  return boxOf(pts.map((p) => rotate(p, t.rot)), x, y);
}

/** Just the table top, as an upright box (what lines up with other tables' edges). */
export function topBox(t: Table, x = t.x, y = t.y): Box {
  if (isRound(t)) {
    const r = topRadius(t);
    return { x0: x - r, y0: y - r, x1: x + r, y1: y + r };
  }
  const { w, h } = dims(t);
  return rectBox(w, h, t.rot, x, y);
}

/** A venue object (stage, dance floor…), as an upright box, exact at any angle. */
export const objBox = (o: VenueObject, x = o.x, y = o.y): Box => rectBox(o.w, o.h, o.rot, x, y);

function rectBox(w: number, h: number, rot: number, x: number, y: number): Box {
  const a = (rot * Math.PI) / 180;
  const c = Math.abs(Math.cos(a));
  const s = Math.abs(Math.sin(a));
  const hw = (w / 2) * c + (h / 2) * s;
  const hh = (w / 2) * s + (h / 2) * c;
  return { x0: x - hw, y0: y - hh, x1: x + hw, y1: y + hh };
}

function boxOf(pts: [number, number][], x: number, y: number): Box {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [px, py] of pts) {
    x0 = Math.min(x0, px); y0 = Math.min(y0, py); x1 = Math.max(x1, px); y1 = Math.max(y1, py);
  }
  return { x0: x + x0, y0: y + y0, x1: x + x1, y1: y + y1 };
}

/** Turned by a quarter turn or not at all: upright boxes are exact, so edges can line up. */
export const squareTurn = (rot: number) => Math.abs(((rot % 90) + 90) % 90) < 0.5 || Math.abs((((rot % 90) + 90) % 90) - 90) < 0.5;

// ---- seats on the inside of U- and L-shapes ---------------------------------------------
type Run = { from: [number, number]; to: [number, number] };
/** Where chairs go along the inside edges of a U or an L (centre-relative, before turning). */
function innerRuns(t: Pick<Table, "shape" | "seats" | "w" | "h">): Run[] {
  const { w, h } = dims(t);
  const g = CHAIR_GAP;
  const x0 = -w / 2;
  const y0 = -h / 2;
  if (t.shape === "ushape") {
    const inL = x0 + ARM + g;
    const inR = x0 + w - ARM - g;
    const base = y0 + h - ARM - g;
    return [
      { from: [inL, y0 + 20], to: [inL, base] },
      { from: [inL + CHAIR * 2, base], to: [inR - CHAIR * 2, base] },
      { from: [inR, base], to: [inR, y0 + 20] },
    ];
  }
  if (t.shape === "lshape") {
    const arm = y0 + ARM + g;
    const side = x0 + ARM + g;
    return [
      { from: [side + CHAIR * 2, arm], to: [x0 + w - 20, arm] },
      { from: [side, arm + CHAIR * 2], to: [side, y0 + h - 20] },
    ];
  }
  return [];
}
/** How many more chairs the inside of a U or an L holds (one every 64 cm). */
export function insideSeats(t: Pick<Table, "shape" | "seats" | "w" | "h">): number {
  const len = innerRuns(t).reduce((n, r) => n + Math.max(0, Math.hypot(r.to[0] - r.from[0], r.to[1] - r.from[1])), 0);
  return Math.max(0, Math.floor(len / STEP));
}
/** Room inside for chairs facing each other with a way through: about 1.5 m across a U's
 *  hollow. An L is open on two sides, so always. */
export function canSeatInside(t: Pick<Table, "shape" | "seats" | "w" | "h">): boolean {
  if (t.shape === "lshape") return true;
  if (t.shape !== "ushape") return false;
  const { w, h } = dims(t);
  return w - 2 * ARM >= 2 * (CHAIR_GAP + CHAIR) + 45 && h - ARM >= 120;
}

export function rotate([x, y]: [number, number], deg: number): [number, number] {
  if (!deg) return [x, y];
  const a = (deg * Math.PI) / 180;
  return [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
}

export function seatPoint(t: Table, i: number): [number, number] {
  const [dx, dy] = rotate(seatOffsets(t)[i] ?? [0, 0], t.rot);
  return [t.x + dx, t.y + dy];
}

const HONORIFIC = /^(tito|tita|ate|kuya|lola|lolo|mang|aling|manang|manong|doc|dr\.?|dra\.?|atty\.?|engr\.?|arch\.?|sis\.?|bro\.?|fr\.?|father|pastor|ptr\.?|rev\.?|coach|prof\.?|teacher|ma'?am|ninong|ninang|mr\.?|mrs\.?|ms\.?|miss|sir|tatay|nanay|inang|amang|hon\.?|gen\.?|col\.?|capt\.?|judge|little)$/i;

/** "Tita Nora Santos" → "NS". Titles are left off. */
export function initials(name: string) {
  const w = name.replace(/[()]/g, " ").split(/\s+/).filter((x) => x && !HONORIFIC.test(x));
  if (!w.length) return name.slice(0, 2).toUpperCase();
  const first = w[0][0] ?? "";
  const last = w.length > 1 ? (w[w.length - 1][0] ?? "") : (w[0][1] ?? "");
  return (first + last).toUpperCase();
}

export const isHonorific = (w: string) => HONORIFIC.test(w);

export function emptyChart(kind: ChartKind = "blank"): Chart {
  return { v: 1, id: uid("c"), title: "Our seating plan", kind, room: { w: 2400, h: 1800 }, tables: [], objects: [], groups: [], guests: [], updatedAt: Date.now() };
}

/** Guests per table right now. */
export function occupancy(chart: Chart) {
  const m = new Map<string, Guest[]>();
  for (const t of chart.tables) m.set(t.id, []);
  for (const g of chart.guests) if (g.tableId && m.has(g.tableId)) m.get(g.tableId)!.push(g);
  return m;
}

export function freeSeats(t: Table, seated: Guest[]): number[] {
  const taken = new Set(seated.map((g) => g.seat));
  const out: number[] = [];
  for (let i = 0; i < t.seats; i++) if (!taken.has(i)) out.push(i);
  return out;
}

/** Bounds of everything in the room, for "fit to screen" and exports. */
export function contentBounds(chart: Chart) {
  let x0 = 0, y0 = 0, x1 = chart.room.w, y1 = chart.room.h;
  for (const t of chart.tables) {
    const s = tableSize(t);
    const r = Math.max(s.w, s.h) / 2;
    x0 = Math.min(x0, t.x - r); y0 = Math.min(y0, t.y - r); x1 = Math.max(x1, t.x + r); y1 = Math.max(y1, t.y + r);
  }
  for (const o of chart.objects) {
    x0 = Math.min(x0, o.x - o.w / 2); y0 = Math.min(y0, o.y - o.h / 2); x1 = Math.max(x1, o.x + o.w / 2); y1 = Math.max(y1, o.y + o.h / 2);
  }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

/** Rules the current seating breaks: "apart" pairs at one table, "together" pairs seated
 *  at different tables. */
export function ruleBreaks(chart: Chart): { rule: Rule; a: Guest; b: Guest }[] {
  if (!chart.rules?.length) return [];
  const byId = new Map(chart.guests.map((g) => [g.id, g]));
  const out: { rule: Rule; a: Guest; b: Guest }[] = [];
  for (const rule of chart.rules) {
    const a = byId.get(rule.a);
    const b = byId.get(rule.b);
    if (!a || !b) continue;
    if (rule.kind === "apart" && a.tableId && a.tableId === b.tableId) out.push({ rule, a, b });
    if (rule.kind === "together" && a.tableId && b.tableId && a.tableId !== b.tableId) out.push({ rule, a, b });
  }
  return out;
}
