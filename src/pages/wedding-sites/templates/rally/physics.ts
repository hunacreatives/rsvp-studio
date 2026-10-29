// Rally's ball: a real pickleball rally, simulated once when the page opens (a few milliseconds)
// and then played back by the scroll.
//  - The court in metres: x across (the sidelines at ±3.048), z along it (the net at 0, the
//    host's baseline at −6.705, the far one at +6.705), y up. The kitchen (non-volley zone) is
//    2.134 either side of the net. The host serves from the near side.
//  - The ball: 74 mm, 26 g, a perforated plastic ball with a lot of drag. Gravity, quadratic
//    drag, Magnus lift from its spin, and a bounce with friction that trades spin for speed
//    (topspin kicks forward, backspin checks up). Integrated at 240 steps a second.
//  - Each shot is solved for where it should land (the serve deep in the diagonal box, the drop
//    in the kitchen, the lob deep) and flown until the next player meets it: after the bounce at
//    their contact height, out of the air for a volley (the Erne) or an overhead (the smash).
//    The rally always starts with the host's serve and ends with the host's smash, so the point
//    is the host's: the shots in between are chosen for the number of stops on the page.

export type V3 = [number, number, number];
export type Quat = [number, number, number, number];
export type ShotKind = "serve" | "return" | "drop" | "dink" | "erne" | "lob" | "smash";

export const COURT = { halfW: 3.048, halfL: 6.705, kitchen: 2.134, post: 3.353, netSide: 0.914, netMid: 0.864 };
export const FENCE = { x: 6.4, z: 11.2, low: 1.2, high: 3.6 };
export const BALL_R = 0.037;
export const netTop = (x: number) => COURT.netMid + (COURT.netSide - COURT.netMid) * Math.min(1, (x / COURT.post) ** 2);

const G = 9.81, KD = 0.042, KM = 0.0011, E = 0.6, MU = 0.42, DT = 1 / 240;
// a hollow shell: I = 2/3 m r²
const INV_I_MR2 = 1.5;

export const SHOT_NAME: Record<ShotKind, string> = {
  serve: "The serve",
  return: "The return",
  drop: "Third-shot drop",
  dink: "The dink",
  erne: "The Erne",
  lob: "The lob",
  smash: "The smash",
};

type ShotDef = { target: V3; t: number; rpm: number; side: 1 | -1 };
// where each shot is aimed (the bounce), its time to get there, and its spin (+ topspin)
const DEFS: Record<ShotKind, ShotDef> = {
  serve: { target: [1.45, BALL_R, 5.1], t: 1.0, rpm: 700, side: 1 },
  return: { target: [-0.7, BALL_R, -5.35], t: 1.1, rpm: -450, side: -1 },
  drop: { target: [1.75, BALL_R, 1.3], t: 1.25, rpm: 250, side: 1 },
  dink: { target: [3.0, BALL_R, -1.75], t: 1.12, rpm: -250, side: -1 },
  erne: { target: [0.2, BALL_R, 4.1], t: 0.44, rpm: 600, side: 1 },
  lob: { target: [-0.85, BALL_R, -6.05], t: 2.0, rpm: 1100, side: -1 },
  smash: { target: [1.35, BALL_R, 4.2], t: 0.56, rpm: 1500, side: 1 },
};
// how high the next player meets a ball that has bounced (by their shot)
const CONTACT_Y: Partial<Record<ShotKind, number>> = { return: 0.78, drop: 0.55, dink: 0.32, lob: 0.42, erne: 0.6, smash: 2.3 };

/** One shot's flight: 7 floats a sample (position, orientation), DT apart. */
export type Flight = {
  kind: ShotKind;
  side: 1 | -1;
  from: V3;
  v0: V3;
  samples: Float32Array;
  n: number;
  duration: number;
  bounces: { t: number; p: V3; dir: [number, number]; speed: number }[];
  kmh: number;
  rpm: number;
  /** Height over the net tape where it crossed, in cm (null if it never crossed). */
  clear: number | null;
  /** True for the final shot: flown until the ball rests (it hits the back fence). */
  final: boolean;
};

const add = (a: V3, b: V3, k = 1): V3 => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
const len = (a: V3) => Math.hypot(a[0], a[1], a[2]);
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

type State = { p: V3; v: V3; w: V3; q: Quat };

function step(s: State, dt: number) {
  const sp = len(s.v);
  const m = cross(s.w, s.v);
  const a: V3 = [-KD * sp * s.v[0] + KM * m[0], -G - KD * sp * s.v[1] + KM * m[1], -KD * sp * s.v[2] + KM * m[2]];
  s.v = add(s.v, a, dt);
  s.p = add(s.p, s.v, dt);
  // the spin turns the ball: q += ½ (0, w) q dt
  const [x, y, z, w] = s.q, [wx, wy, wz] = s.w, h = 0.5 * dt;
  const q: Quat = [x + h * (wx * w + wy * z - wz * y), y + h * (wy * w + wz * x - wx * z), z + h * (wz * w + wx * y - wy * x), w + h * (-wx * x - wy * y - wz * z)];
  const l = Math.hypot(q[0], q[1], q[2], q[3]) || 1;
  s.q = [q[0] / l, q[1] / l, q[2] / l, q[3] / l];
}

// the bounce: the normal speed comes back at E; friction at the contact point (limited by MU)
// trades spin for speed, up to rolling. With r = (0, −R, 0) from the centre to the contact:
// the contact slides at u = v + w × r = (v_x + w_z R, v_z − w_x R); a friction impulse −j û
// changes v by −j û and w by (r × Δv)·m/I = (−Δv_z, 0, Δv_x)·1.5/R.
function bounce(s: State) {
  const vn = -s.v[1];
  s.v[1] = E * vn;
  s.p[1] = BALL_R;
  const ux = s.v[0] + s.w[2] * BALL_R, uz = s.v[2] - s.w[0] * BALL_R;
  const slip = Math.hypot(ux, uz);
  if (slip < 1e-6) return;
  const j = Math.min(MU * (1 + E) * vn, slip / (1 + INV_I_MR2));
  const dvx = (-j * ux) / slip, dvz = (-j * uz) / slip;
  s.v[0] += dvx;
  s.v[2] += dvz;
  const k = INV_I_MR2 / BALL_R;
  s.w = [s.w[0] - dvz * k, s.w[1], s.w[2] + dvx * k];
}

function spinFor(rpm: number, v: V3): V3 {
  // topspin turns the top of the ball forward: w along (dir × up)… for travel +z that is +x
  const h = Math.hypot(v[0], v[2]) || 1;
  const w = (rpm * 2 * Math.PI) / 60;
  // axis = horizontal travel direction × (0, −1, 0)  →  (−v_z, 0, v_x)·(−1)… = (v_z, 0, −v_x)/h
  return [(v[2] / h) * w, 0, (-v[0] / h) * w];
}

/** The launch velocity that lands the ball on `target` after `t` seconds (shooting with drag). */
function solve(from: V3, target: V3, t: number, rpm: number): V3 {
  let v: V3 = [(target[0] - from[0]) / t, (target[1] - from[1] + 0.5 * G * t * t) / t, (target[2] - from[2]) / t];
  for (let it = 0; it < 14; it++) {
    const s: State = { p: [...from] as V3, v: [...v] as V3, w: spinFor(rpm, v), q: [0, 0, 0, 1] };
    const n = Math.round(t / DT);
    for (let i = 0; i < n; i++) step(s, DT);
    v = add(v, [(target[0] - s.p[0]) / t, (target[1] - s.p[1]) / t, (target[2] - s.p[2]) / t], 0.95);
  }
  return v;
}

/** Flies one shot from `from` until the next player (`next`) meets it, or to rest for the last. */
function fly(kind: ShotKind, from: V3, next: ShotKind | null, q0: Quat): { flight: Flight; end: V3; q: Quat } {
  const d = DEFS[kind];
  const v0 = solve(from, d.target, d.t, d.rpm);
  const s: State = { p: [...from] as V3, v: [...v0] as V3, w: spinFor(d.rpm, v0), q: [...q0] as Quat };
  const out: number[] = [];
  const bounces: Flight["bounces"] = [];
  let clear: number | null = null, t = 0, prevZ = from[2], rest = 0;
  const push = () => out.push(s.p[0], s.p[1], s.p[2], s.q[0], s.q[1], s.q[2], s.q[3]);
  push();
  const maxT = next ? 4 : 3.4;
  while (t < maxT) {
    step(s, DT);
    t += DT;
    if (Math.sign(s.p[2]) !== Math.sign(prevZ) && clear === null) clear = (s.p[1] - BALL_R - netTop(s.p[0])) * 100;
    prevZ = s.p[2];
    if (s.p[1] < BALL_R && s.v[1] < 0) {
      if (Math.abs(s.v[1]) < 0.35) {
        // rolling: on the ground, slowing
        s.p[1] = BALL_R; s.v[1] = 0;
        const h = Math.hypot(s.v[0], s.v[2]);
        const k = h > 0 ? Math.max(0, h - 0.9 * DT) / h : 0;
        s.v[0] *= k; s.v[2] *= k;
        s.w = [s.v[2] / BALL_R, 0, -s.v[0] / BALL_R];
      } else {
        bounces.push({ t, p: [s.p[0], 0, s.p[2]], dir: [s.v[0], s.v[2]], speed: Math.hypot(s.v[0], s.v[2]) });
        bounce(s);
      }
    }
    // the last shot runs on into the back fence
    if (!next) {
      if (Math.abs(s.p[2]) > FENCE.z - BALL_R && Math.sign(s.v[2]) === Math.sign(s.p[2])) { s.p[2] = Math.sign(s.p[2]) * (FENCE.z - BALL_R); s.v = [s.v[0] * 0.45, s.v[1] * 0.5, -s.v[2] * 0.18]; s.w = [s.w[0] * 0.3, s.w[1], s.w[2] * 0.3]; }
      if (Math.abs(s.p[0]) > FENCE.x - BALL_R && Math.sign(s.v[0]) === Math.sign(s.p[0])) { s.p[0] = Math.sign(s.p[0]) * (FENCE.x - BALL_R); s.v = [-s.v[0] * 0.18, s.v[1] * 0.5, s.v[2] * 0.45]; }
      if (len(s.v) < 0.05) { rest += DT; if (rest > 0.2) { push(); break; } }
    }
    push();
    if (next) {
      const falling = s.v[1] < 0;
      if (next === "erne" && s.p[2] <= -0.3) break;
      if (next === "smash" && falling && s.p[1] <= (CONTACT_Y.smash ?? 2.3)) break;
      if (next !== "erne" && next !== "smash" && bounces.length && falling && s.p[1] <= (CONTACT_Y[next] ?? 0.5)) break;
    }
  }
  const n = out.length / 7;
  const flight: Flight = {
    kind,
    side: d.side,
    from,
    v0,
    samples: new Float32Array(out),
    n,
    duration: (n - 1) * DT,
    bounces,
    kmh: Math.round(len(v0) * 3.6),
    rpm: Math.abs(d.rpm),
    clear: clear === null ? null : Math.round(clear),
    final: !next,
  };
  return { flight, end: [s.p[0], s.p[1], s.p[2]], q: s.q };
}

/** The shots for a page with `gaps` stops after the title: an even number of them, so the host
 *  (who serves) also hits the smash. Grouped into one list a gap (a gap may hold two). */
export function shotPlan(gaps: number): ShotKind[][] {
  const all: ShotKind[] = gaps >= 5 ? ["serve", "return", "drop", "dink", "erne", "lob"] : gaps >= 3 ? ["serve", "return", "drop", "lob"] : ["serve", "lob"];
  const shots = all.slice(0, Math.max(2, gaps % 2 ? gaps + 1 : gaps));
  const groups: ShotKind[][] = shots.map((s) => [s]);
  while (groups.length > Math.max(1, gaps)) {
    // fold the two shots before the lob into one gap (or the only two)
    const i = Math.max(0, groups.length - 3);
    groups.splice(i, 2, [...groups[i], ...groups[i + 1]]);
  }
  return groups;
}

export type Rally = {
  flights: Flight[];
  /** Rally time (s) at each contact: contact k is the start of flight k. */
  at: number[];
  /** The contact a stop holds at (stop 0, the title, holds at the serve). */
  stopContact: number[];
  smash: Flight;
  serve: V3;
};

export const SERVE_AT: V3 = [-1.5, 0.48, -7.1];

/** Simulates the whole rally for `gaps` stops after the title. */
export function buildRally(gaps: number): Rally {
  const plan = shotPlan(gaps);
  const kinds = [...plan.flat(), "smash" as ShotKind];
  const flights: Flight[] = [];
  let from: V3 = SERVE_AT, q: Quat = [0, 0, 0, 1];
  for (let i = 0; i < kinds.length; i++) {
    const r = fly(kinds[i], from, kinds[i + 1] ?? null, q);
    flights.push(r.flight);
    from = r.end;
    q = r.q;
  }
  const at: number[] = [0];
  for (const f of flights) at.push(at[at.length - 1] + f.duration);
  const stopContact = [0];
  let k = 0;
  for (const g of plan) { k += g.length; stopContact.push(k); }
  const smash = flights[flights.length - 1];
  return { flights: flights.slice(0, -1), at, stopContact, smash, serve: SERVE_AT };
}

/** The ball at rally time `t` (seconds from the serve) along `flights`. */
export function ballAt(rally: Rally, t: number, out: { p: V3; q: Quat; shot: number }) {
  const { flights, at } = rally;
  let i = 0;
  while (i < flights.length - 1 && t >= at[i + 1]) i++;
  const f = flights[i];
  sampleAt(f, t - at[i], out);
  out.shot = i;
  return out;
}

export function sampleAt(f: Flight, t: number, out: { p: V3; q: Quat }) {
  const x = Math.max(0, Math.min(f.n - 1, t / DT)), i = Math.min(f.n - 2, Math.floor(x)), u = f.n > 1 ? x - i : 0, s = f.samples;
  const a = i * 7, b = Math.min(f.n - 1, i + 1) * 7;
  out.p = [s[a] + (s[b] - s[a]) * u, s[a + 1] + (s[b + 1] - s[a + 1]) * u, s[a + 2] + (s[b + 2] - s[a + 2]) * u];
  // nlerp is plenty between samples 4 ms apart
  let qb = [s[b + 3], s[b + 4], s[b + 5], s[b + 6]];
  if (s[a + 3] * qb[0] + s[a + 4] * qb[1] + s[a + 5] * qb[2] + s[a + 6] * qb[3] < 0) qb = qb.map((v) => -v);
  const q: Quat = [s[a + 3] + (qb[0] - s[a + 3]) * u, s[a + 4] + (qb[1] - s[a + 4]) * u, s[a + 5] + (qb[2] - s[a + 5]) * u, s[a + 6] + (qb[3] - s[a + 6]) * u];
  const l = Math.hypot(q[0], q[1], q[2], q[3]) || 1;
  out.q = [q[0] / l, q[1] / l, q[2] / l, q[3] / l];
  return out;
}

export const SAMPLE_DT = DT;
