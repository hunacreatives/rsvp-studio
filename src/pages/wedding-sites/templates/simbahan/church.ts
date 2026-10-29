// Simbahan's church, drawn with WebGL2: an old Filipino stone church at the end of the
// afternoon, every part of it procedural (no photographs, no models).
//  - The plan (metres; the aisle runs along x = 0 toward +z, the doors at z = 0, the retablo at
//    z = 58): a coral-stone façade with two great buttresses and an oculus, the wooden doors in
//    a round-arched portal; inside, a choir loft over the entrance, a nave of round arches on
//    Tuscan columns (seven bays), a clerestory of round-headed windows under a lime-washed barrel
//    vault with stone ribs, dark side aisles, wooden pews with white flowers and pillar candles
//    at every third aisle end, an ivory runner strewn with petals, three steps up to the
//    sanctuary, the altar, and the gilded retablo: two tiers and an attic of niches with saints
//    between twisted columns.
//  - How it's drawn: one ray per pixel, marched through a distance field of the whole church
//    (each part only evaluated near where it is). The low sun comes through the clerestory on
//    the left: whether a point is in a beam is worked out exactly (the ray toward the sun through
//    the window's inner and outer faces), with soft edges that widen with distance, so the
//    patches on the floor and the shafts in the air are the windows' own shape. The pews shade
//    the floor under the beams (a short march). Candles light what's near them.
//  - Two passes: the still church (and its shafts of light) into a texture, only when the camera
//    or the doors move, at a fraction of the size while moving; then a light pass to the screen
//    that adds the candle flames (still) and the dust turning in the light. Between moves
//    only the light pass runs.

export type V3 = [number, number, number];
/** Where the camera stands and looks: eye at (x, y, z), turned by `yaw` (0 = down the aisle),
 *  `pitch` up from level, the principal point shifted by (sx, sy) in clip units. */
export type View = { x: number; y: number; z: number; yaw: number; pitch: number; fov: number; sx: number; sy: number };
export type Cam = { eye: V3; fwd: V3; right: V3; up: V3; tanX: number; tanY: number; sx: number; sy: number };

const norm = (a: V3): V3 => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

export function camOf(v: View, aspect: number): Cam {
  const cp = Math.cos(v.pitch), sp = Math.sin(v.pitch);
  const fwd = norm([Math.sin(v.yaw) * cp, sp, Math.cos(v.yaw) * cp]);
  const right = norm(cross([0, 1, 0], fwd));
  const up = cross(fwd, right);
  const tanY = Math.tan(v.fov / 2);
  return { eye: [v.x, v.y, v.z], fwd, right, up, tanX: tanY * aspect, tanY, sx: v.sx, sy: v.sy };
}

// the low sun, through the clerestory on the left: from the left, high, a little ahead
const SUN: V3 = norm([-0.48, 0.8, 0.36]);

// ---------------------------------------------------------------- shaders
const VS = `#version 300 es
in vec2 a; void main(){ gl_Position = vec4(a, 0., 1.); }`;

const COMMON = `
const float NW = 5.0;   // the nave's face (the arcade)
const float WT = 0.9;   // the arcade wall's thickness
const float SPR = 4.6;  // where the arches spring
const float AR = 2.55;  // the arches' radius
const float VY = 11.5;  // where the vault springs
const float VR = 5.0;   // the vault's radius
const float AW = 9.0;   // the side aisles' outer wall
const float AC = 7.6;   // the side aisles' ceiling
const float ZE = 58.;   // the retablo's wall
const float PL = 0.48;  // the sanctuary floor
const float FZ = -1.4;  // the façade's outer face
const vec3 SUNC = vec3(1.0, 0.70, 0.42);
// outside, for the opening: the sun low on the left, raking across the façade
const vec3 SUNO = vec3(-0.8597, 0.3299, -0.3899);
const vec3 FLAME = vec3(1.0, 0.56, 0.22);
uniform vec2 uRes; uniform vec3 uEye, uFwd, uRight, uUp, uSun; uniform vec2 uTan, uShift; uniform float uPix, uFrac;
uniform sampler2D uDetail;
vec3 rayDir(){ vec2 ndc = gl_FragCoord.xy / (uRes * uFrac) * 2. - 1. - uShift; return normalize(uFwd + uRight * ndc.x * uTan.x + uUp * ndc.y * uTan.y); }
float h11(float n){ return fract(sin(n * 127.1) * 43758.5453); }
float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float sdBox2(vec2 p, vec2 b){ vec2 d = abs(p) - b; return length(max(d, 0.)) + min(max(d.x, d.y), 0.); }
// the clerestory windows: (dz from the bay's middle, y); negative inside
float winD(vec2 q){ return min(sdBox2(q - vec2(0., 9.55), vec2(0.72, 0.85)), length(q - vec2(0., 10.4)) - 0.72); }
float winAt(vec3 Q, float w){
  float k = clamp(floor((Q.z - 7.) / 6. + 0.5), 0., 6.);
  return smoothstep(w, -w, winD(vec2(Q.z - 7. - 6. * k, Q.y)));
}
// in a shaft of sun: the ray toward the sun passes the window's inner and outer faces (left wall)
float beam(vec3 P){
  if (P.x < -NW || P.x > AW || P.z < 0.5 || P.z > 46.5 || P.y > 11.3) return 0.;
  float t1 = (-NW - P.x) / uSun.x, t2 = (-NW - WT - P.x) / uSun.x;
  float w = 0.03 + 0.012 * t1;
  return winAt(P + uSun * t1, w) * winAt(P + uSun * t2, w);
}
// the candle clusters at the aisle ends: every third pew, both sides
const float PZ0 = 6.0, PDZ = 0.95;
const float CHY = 5.9, CHX = 2.9, CHZ = 13.;  // the chandeliers: lowest point, either side of the aisle, first bay
float clusterZ(float k){ return PZ0 + PDZ * 3. * k + 0.06; }
// linear light → the print: a soft filmic curve, warm highlights, deep but not crushed shade
vec3 grade(vec3 c){
  c = (c * (2.51 * c + 0.03)) / (c * (2.43 * c + 0.59) + 0.14);
  c = pow(clamp(c, 0., 1.), vec3(1. / 2.2));
  c = mix(c, c * c * (3. - 2. * c), 0.18);
  c = c * vec3(1.0, 0.975, 0.93) + vec3(0.014, 0.010, 0.006);
  return c;
}
`;

const SCENE_FS = `#version 300 es
precision highp float;
precision highp sampler2D;
${COMMON}
uniform float uDoor, uExp, uOut;
// the surface's own normal, kept for the painting pass's lines
vec3 gN = vec3(0., 1., 0.);
layout(location = 0) out vec4 oCol;
layout(location = 1) out vec4 oAux;

float sdBox(vec3 p, vec3 b){ vec3 q = abs(p) - b; return length(max(q, 0.)) + min(max(q.x, max(q.y, q.z)), 0.); }
float sdCyl(vec3 p, float r, float y0, float y1){ vec2 d = vec2(length(p.xz) - r, abs(p.y - (y0 + y1) * 0.5) - (y1 - y0) * 0.5); return min(max(d.x, d.y), 0.) + length(max(d, 0.)); }
// an opening with a round head: half-width hw, springing at sp, from below the floor
float archD(vec2 q, float hw, float sp){ return min(sdBox2(q - vec2(0., (sp - 1.) * 0.5), vec2(hw, (sp + 1.) * 0.5)), length(q - vec2(0., sp)) - hw); }
void U(inout vec2 r, float d, float m){ if (d < r.x) r = vec2(d, m); }

// materials: 1 coral stone, 2 lime-washed vault, 3 floor, 4 wood, 5 gold, 6 white flowers,
// 7 wax, 8 the runner, 9 greenery, 10 a niche's back, 11 a saint, 12 the doors, 13 white cloth,
// 14 brass, 15 the plaza outside, 16 plaster on the façade
// the doors' leaf coordinates: u from the hinge toward the middle, v through the leaf (- outside)
vec2 doorUV(vec3 p){
  float a = uDoor * 1.62;
  vec2 q = vec2(abs(p.x) - 1.8, p.z + 0.3);
  return vec2(dot(q, vec2(-cos(a), sin(a))), dot(q, vec2(sin(a), cos(a))));
}
float doorD(vec3 p){
  // both leaves at once (mirrored): hinged at |x| = 1.8, z = -0.3, swinging in to +z
  vec2 uv = doorUV(p);
  float u = uv.x, v = uv.y;
  float d = max(max(abs(v) - 0.08, max(-u, u - 1.795)), archD(vec2(1.8 - u, p.y), 1.8, 4.2) + 0.015);
  // fielded panels: two columns of three and an arched head, each sunk, its middle raised
  float col = u < 0.9 ? 0.47 : 1.33;
  float ry = p.y < 1.75 ? 1.0 : p.y < 3.35 ? 2.55 : 4.2;
  float hh = p.y < 1.75 ? 0.62 : p.y < 3.35 ? 0.58 : 0.6;
  float pan = sdBox2(vec2(u - col, p.y - ry), vec2(0.3, hh));
  if (p.y > 3.35) pan = max(pan, archD(vec2(1.8 - u, p.y), 1.55, 4.0));
  float face = abs(v) - 0.08;
  d = max(d, -max(pan, face + 0.035));
  // the raised field, bevelled to its edge, a carved rosette in its middle
  float fld = max(pan + 0.07, face + 0.035 - 0.022 - clamp(-(pan + 0.07) * 0.35, 0., 0.02));
  d = min(d, max(fld, max(-u, u - 1.795)));
  // iron studs along the rails, strap hinges, a ring knocker on each leaf
  vec2 sg = vec2(u, p.y) / 0.24, sc = (floor(sg) + 0.5) * 0.24;
  float rail = min(abs(p.y - 1.7), min(abs(p.y - 3.4), min(abs(u - 0.9), min(u, 1.79 - u))));
  if (rail < 0.16 && pan > 0.02) d = min(d, length(vec3(u - sc.x, p.y - clamp(sc.y, 0.1, 5.8), v + 0.08)) - 0.022);
  float strap = max(max(abs(p.y - 0.55) - 0.045, abs(p.y - 0.55) - 1.), max(u - 1.25, -u));
  strap = min(strap, max(max(abs(p.y - 5.0) - 0.045, u - 1.0), -u));
  d = min(d, max(strap, abs(v + 0.085) - 0.01));
  float ring = length(vec2(length(vec2(u - 1.55, p.y - 2.45)) - 0.11, v + 0.11)) - 0.014;
  d = min(d, ring);
  return max(d, -p.y);
}
// a dome of roses: blooms on a sphere's upper part (radius R), each a ball of radius rr, run
// together where they touch
float smin(float a, float b, float k){ float h = clamp(0.5 + 0.5 * (b - a) / k, 0., 1.); return mix(b, a, h) - k * h * (1. - h); }
const int NR = 30;
vec3 bloomAt(int i, float R, float seed){
  float fi = float(i) + 0.5;
  float y = 1. - fi / float(NR) * 1.3, rad = sqrt(max(0., 1. - y * y)), a = fi * 2.39996 + seed;
  return vec3(cos(a) * rad, y, sin(a) * rad) * R * (0.97 + 0.06 * h11(fi * 1.3 + seed));
}
float roses(vec3 q, float R, float rr, float seed){
  float L = length(q);
  if (L > R + rr * 2.5) return L - R - rr * 0.8;
  float d = length(q * vec3(1., 1.12, 1.)) - R + rr * 0.7;
  float best = 1e3; vec3 bc = vec3(0.); float bs = 1.;
  for (int i = 0; i < NR; i++) {
    vec3 c = bloomAt(i, R, seed);
    float sz = 0.82 + 0.32 * h11(float(i) + seed);
    // each rose a little wider than it is deep (its face toward the outside of the dome)
    vec3 w = q - c, nw = normalize(c);
    float di = length(w - nw * dot(w, nw) * 0.25) - rr * sz;
    if (di < best) { best = di; bc = c; bs = sz; }
    d = smin(d, di, rr * 0.3);
  }
  // the petals: grooves wound round each rose's heart, deepest at its middle
  if (best < rr * 0.6) {
    vec3 w = q - bc, nw = normalize(bc);
    vec3 t1 = normalize(cross(nw, vec3(0.3, 1., 0.2))), t2 = cross(nw, t1);
    vec2 pl = vec2(dot(w, t1), dot(w, t2)) / (rr * bs);
    float pr = length(pl), ang = atan(pl.y, pl.x);
    float pet = abs(fract(pr * 2.6 - ang / 6.2832 * 1.4 + seed * 0.37) - 0.5);
    d += rr * 0.16 * (1. - smoothstep(0.02, 0.2, pet)) * smoothstep(1.15, 0.2, pr) * smoothstep(-0.3, 0.6, dot(w, nw) / rr);
  }
  return d;
}
float sdSeg3(vec3 p, vec3 a, vec3 b){ vec3 pa = p - a, ba = b - a; return length(pa - ba * clamp(dot(pa, ba) / dot(ba, ba), 0., 1.)); }
// a saint, about 1.8 tall, feet at the origin, facing -z: a robe falling in folds, a mantle over
// the shoulders and down the back, the hands joined in front, a veiled head
float saintD(vec3 q){
  if (length(q - vec3(0., 0.9, 0.)) > 1.3) return length(q - vec3(0., 0.9, 0.)) - 1.1;
  float yy = clamp(q.y / 1.5, 0., 1.);
  float an = atan(q.x, -q.z);
  float fold = 0.018 * cos(an * 7. + q.y * 1.6) * (1. - yy * 0.6);
  float robe = max(length(q.xz * vec2(1., 1.25)) - mix(0.27, 0.15, yy) - fold, abs(q.y - 0.74) - 0.74);
  float mant = max(length((q.xz - vec2(0., 0.025)) * vec2(1., 1.15)) - mix(0.31, 0.18, yy) - fold * 1.5, abs(q.y - 0.88) - 0.6);
  mant = max(mant, -q.z - 0.05 - 0.08 * yy);
  float sh = (length((q - vec3(0., 1.42, 0.)) / vec3(0.2, 0.085, 0.12)) - 1.) * 0.085;
  vec3 qa = vec3(abs(q.x), q.y, q.z);
  float arm = sdSeg3(qa, vec3(0.16, 1.37, 0.), vec3(0.03, 1.16, -0.16)) - 0.046;
  float hands = length(q - vec3(0., 1.19, -0.18)) - 0.048;
  float neck = sdCyl(q, 0.045, 1.44, 1.6);
  float head = (length((q - vec3(0., 1.67, -0.01)) / vec3(0.085, 0.105, 0.095)) - 1.) * 0.085;
  float veil = max((length((q - vec3(0., 1.66, 0.02)) / vec3(0.108, 0.128, 0.115)) - 1.) * 0.108, -q.z - 0.02);
  float body = smin(smin(robe, mant, 0.03), sh, 0.05);
  body = smin(body, min(arm, hands), 0.03);
  return min(body, min(min(neck, head), veil));
}
// baby's breath round a dome of roses (radius R): a cloud of tiny florets on its open side
float gyps(vec3 q, float R, float cs){
  float bb = max(abs(length(q) - R - cs * 1.4) - cs * 1.3, max(q.y - R * 0.5, q.x - R * 0.35));
  if (bb > cs) return bb;
  vec3 cq = q / cs, ci = floor(cq), cf = fract(cq) - 0.5;
  float h = fract(sin(dot(ci, vec3(127.1, 311.7, 74.7))) * 43758.5453);
  vec3 j = vec3(fract(h * 13.7), fract(h * 71.3), fract(h * 37.1)) - 0.5;
  float edge = (0.5 - max(max(abs(cf.x), abs(cf.y)), abs(cf.z))) * cs;
  float fd = h > 0.62 ? length(cf - j * 0.4) * cs - cs * 0.22 : edge + cs * 0.15;
  return max(bb, min(fd, edge + cs * 0.15));
}
// the stems of a bunch, gathered to a tie under the roses
float stems(vec3 q, float top, float tie, float rad){
  float d = 1e3;
  for (int i = 0; i < 6; i++) {
    float a = float(i) * 1.047 + 0.3;
    vec3 t = vec3(cos(a) * rad * 0.75, top, sin(a) * rad);
    d = min(d, sdSeg3(q, t, vec3(cos(a) * rad * 0.12, tie, sin(a) * rad * 0.15)) - rad * 0.075);
    d = min(d, sdSeg3(q, vec3(cos(a) * rad * 0.12, tie, sin(a) * rad * 0.15), vec3(cos(a + 0.4) * rad * 0.3, tie - rad * 1.2, sin(a) * rad * 0.35)) - rad * 0.07);
  }
  return d;
}
vec2 map(vec3 p){
  float ax = abs(p.x);
  vec2 r = vec2(1e5, 0.);
  // ---- the floor, the steps up to the sanctuary, the plaza outside
  U(r, p.y, p.z < FZ ? 15. : 3.);
  float bst = max(44.4 - p.z, p.y - 0.5);
  if (bst < 0.3) {
    for (int i = 1; i <= 3; i++) {
      float fi = float(i), zs = 44.4 + 0.5 * (fi - 1.);
      U(r, sdBox(p - vec3(0., 0.08 * fi, (zs + ZE) * 0.5), vec3(NW, 0.08 * fi, (ZE - zs) * 0.5)), 3.);
    }
  } else U(r, bst, 3.);
  // ---- the arcades and the clerestory walls above them
  float kb = clamp(floor((p.z - 4.) / 6. + 0.5), 0., 7.), db = p.z - 4. - 6. * kb;
  {
    float dS = max(abs(ax - NW - WT * 0.5) - WT * 0.5, p.y - VY - 0.4);
    float k = clamp(floor((p.z - 7.) / 6. + 0.5), 0., 6.), dz = p.z - 7. - 6. * k;
    float open = min(sdBox2(vec2(dz, p.y - 1.6), vec2(3.4, 2.55)), archD(vec2(dz, p.y), AR, SPR));
    dS = max(dS, -open);
    dS = max(dS, -winD(vec2(dz, p.y)));
    // the cornice under the vault, and a string course over the arches
    float corn = max(abs(ax - NW + 0.14) - 0.16, abs(p.y - VY + 0.2) - 0.2);
    float strc = max(abs(ax - NW + 0.06) - 0.08, abs(p.y - 7.75) - 0.1);
    // pilasters from each column's capital up to the vault
    float pil = max(max(abs(ax - NW + 0.1) - 0.12, abs(db) - 0.36), abs(p.y - (SPR + VY) * 0.5) - (VY - SPR) * 0.5);
    float wall = min(min(dS, pil), min(corn, strc));
    // the side aisles: the outer wall and the ceiling
    wall = min(wall, max(abs(ax - AW - 0.45) - 0.45, p.y - AC - 0.4));
    wall = min(wall, max(abs(p.y - AC - 0.2) - 0.2, abs(ax - 7.75) - 2.15));
    U(r, max(wall, max(-p.z - 0.2, p.z - ZE - 1.)), 1.);
    // iron bars across each window
    float wq = dz - 0.24 * floor(dz / 0.24 + 0.5);
    float bars = min(length(vec2(wq, ax - NW - 0.55)) - 0.022, length(vec2(p.y - 9.75, ax - NW - 0.55)) - 0.026);
    U(r, max(bars, winD(vec2(dz, p.y)) - 0.05), 17.);
    // the columns
    vec3 c = vec3(ax - NW - 0.45, p.y, db);
    float cb = sdBox(c - vec3(0., 2.3, 0.), vec3(0.6, 2.32, 0.6));
    if (cb < 0.3) {
      float sh = sdCyl(c, 0.39 - 0.025 * p.y / 4., 0.3, 4.2);
      float base = min(sdBox(c - vec3(0., 0.14, 0.), vec3(0.54, 0.14, 0.54)), sdCyl(c, 0.47, 0.25, 0.42) - 0.03);
      float cap = min(sdBox(c - vec3(0., 4.46, 0.), vec3(0.56, 0.14, 0.56)), sdCyl(c, 0.47, 4.08, 4.32) - 0.02);
      U(r, min(sh, min(base, cap)), 1.);
    } else U(r, cb, 1.);
    // the vault and its ribs
    vec2 v = vec2(p.x, max(p.y - VY, 0.));
    float L = length(v);
    float dv = max(abs(L - VR - 0.3) - 0.3, VY - p.y);
    float rib = max(max(abs(L - VR + 0.1) - 0.16, abs(db) - 0.3), VY - 0.2 - p.y);
    U(r, max(dv, max(p.z - ZE - 1., -p.z - 0.2)), 2.);
    U(r, rib, 1.);
  }
  // ---- the façade and its carved portal; the buttresses; the steps up to the doors
  if (p.z < 1.) {
    float zr = FZ - p.z; // how far out from the wall's face
    float f = max(abs(p.z - FZ * 0.5) + FZ * 0.5, ax - 10.);
    float top = ax < 5.6 ? 15.2 + 2.6 * sqrt(max(0., 1. - (ax / 5.6) * (ax / 5.6))) : 11.2 - (ax - 5.6) * 0.55;
    f = max(f, p.y - top);
    f = max(f, -archD(vec2(p.x, p.y), 1.8, 4.2));
    f = max(f, -max(max(archD(vec2(p.x, p.y - 7.7), 0.58, 1.9), max(p.y - 10.2, 7.56 - p.y)), -zr - 0.45));
    float od = archD(vec2(p.x, p.y), 1.8, 4.2); // outside the opening (>0)
    // the archivolt: two stepped mouldings round the opening, a keystone at its crown
    float av = min(max(max(od - 0.52, -od), zr - 0.12), max(max(od - 0.26, -od), zr - 0.22));
    av = max(av, -zr - 0.3);
    float key = max(sdBox2(vec2(p.x, p.y - 6.2) * vec2(1. + 0.25 * (p.y - 6.2), 1.), vec2(0.26, 0.38)), abs(zr - 0.17) - 0.17);
    // pilasters on pedestals either side, their capitals flaring
    float pq = ax - 2.72;
    float pil = max(max(abs(pq) - 0.3, zr - 0.2), max(p.y - 6.4, -zr - 0.3));
    pil = min(pil, max(max(abs(pq) - 0.4, zr - 0.3), p.y - 0.62));
    float capw = 0.3 + 0.12 * smoothstep(6.15, 6.62, p.y);
    pil = min(pil, max(max(abs(pq) - capw, zr - 0.2 - 0.08 * smoothstep(6.15, 6.62, p.y)), abs(p.y - 6.42) - 0.22));
    pil = min(pil, max(max(abs(ax - 3.48) - 0.12, zr - 0.1), p.y - 6.4));
    // the entablature: architrave, a carved frieze, a cornice standing well out on dentils
    float ent = max(ax - 3.75, max(abs(p.y - 6.82) - 0.14, zr - 0.26));
    ent = min(ent, max(ax - 3.7, max(abs(p.y - 7.12) - 0.16, zr - 0.22)));
    ent = min(ent, max(ax - 3.95, max(abs(p.y - 7.42) - 0.14, zr - 0.46 + max(0., 7.42 - p.y) * 0.8)));
    float dq = p.x - 0.16 * floor(p.x / 0.16) - 0.08;
    ent = min(ent, max(max(abs(dq) - 0.045, ax - 3.8), max(abs(p.y - 7.24) - 0.05, zr - 0.34)));
    // above: a niche with its saint between small pilasters, scrolls either side, a curved pediment
    float nd = archD(vec2(p.x, p.y - 7.7), 0.58, 1.9);
    float up = max(max(ax - 1.05, max(p.y - 10.2, 7.56 - p.y)), zr - 0.16);
    up = max(up, -max(max(nd, max(p.y - 10.2, 7.56 - p.y)), -zr - 0.45));
    float npil = max(max(abs(ax - 0.86) - 0.12, zr - 0.24), max(p.y - 9.9, 7.56 - p.y));
    float nped = max(sdBox2(vec2(p.x, p.y - 7.72), vec2(0.42, 0.09)), abs(zr - 0.05) - 0.2);
    // the scrolls: a curved wing down to the cornice, rolled into an eye at its foot
    float wx = ax - 1.05;
    float wing = max(max(wx * (wx - 2.) * 0.5 + (p.y - 7.56) * 0.6 - 1.15 * (1. - wx * 0.5), -wx), max(7.56 - p.y, zr - 0.14));
    // the scroll's rolled eye, standing proud of the wing
    vec2 ey = vec2(ax - 2.62, p.y - 7.9);
    float eye = max(length(ey) - 0.3, zr - 0.22);
    eye = max(eye, -max(abs(length(ey) - 0.16) - 0.035, -zr + 0.14));
    wing = min(wing, eye);
    wing = max(wing, -zr - 0.3);
    float ped = max(max(abs(length(vec2(p.x, p.y - 10.05)) - 1.12) - 0.13, 10.05 - p.y), max(zr - 0.34, -zr - 0.3));
    float fini = min(length(vec3(p.x, p.y - 11.45, zr - 0.15)) - 0.16, max(length(vec2(p.x, zr - 0.15)) - 0.07 * max(0., 12.3 - p.y), abs(p.y - 11.9) - 0.45));
    float carved = min(min(min(av, key), min(pil, ent)), min(min(npil, nped), min(min(wing, ped), fini)));
    // the great buttresses, stepped and tapering, their tops weathered round
    vec3 b = vec3(ax - 5.55, p.y, p.z - FZ);
    float tap = 0.07 * p.y;
    float bt = max(sdBox(b - vec3(0., 3.2, -1.9), vec3(1.0 - tap * 0.5, 3.2, 1.9 - tap)), (b.y - 6.4) * 0.8 + (b.z + 3.8) * 0.6 - 0.1);
    float bu = max(sdBox(b - vec3(0., 6.5, -1.0), vec3(0.85 - tap * 0.3, 6.5, 1.0)), (b.y - 12.6) * 0.75 + (b.z + 2.0) * 0.66);
    vec3 b2 = vec3(ax - 10.3, p.y, p.z - FZ);
    float bc = max(sdBox(b2 - vec3(0., 4.6, -1.5), vec3(0.85, 4.6, 1.5)), (b2.y - 8.) * 0.8 + (b2.z + 3.) * 0.6);
    float btr = min(min(bt, bu), bc);
    if (btr < 0.4) btr += (textureLod(uDetail, vec2(p.y * 0.35 + p.z * 0.2, ax * 0.3 + p.z * 0.35), 0.).r - 0.5) * 0.07 - 0.04;
    // the cross over the gable
    float cr = min(sdBox(vec3(p.x, p.y - 18.75, p.z - FZ + 0.5), vec3(0.09, 0.95, 0.09)), sdBox(vec3(p.x, p.y - 19.05, p.z - FZ + 0.5), vec3(0.42, 0.08, 0.08)));
    // two worn steps up to the threshold
    float stp = min(sdBox(p - vec3(0., 0.09, FZ - 1.1), vec3(3.4, 0.09, 1.1)), sdBox(p - vec3(0., 0.2, FZ - 0.5), vec3(3.1, 0.2, 0.5))) - 0.02;
    U(r, min(f, min(btr, cr)), 1.);
    U(r, carved * 0.9, 18.);
    U(r, stp, 18.);
    // the saint in the niche over the doors
    U(r, saintD(vec3(p.x, p.y - 7.82, -zr - 0.2) / 0.78) * 0.78 * 0.9, 18.);
  } else U(r, p.z, 1.);
  {
    float bd = sdBox(p - vec3(0., 3.1, 0.6), vec3(3.7, 3.15, 1.25));
    if (bd < 0.25) U(r, doorD(p), 12.); else U(r, bd, 12.);
  }
  // ---- the choir loft over the entrance
  {
    float bl = sdBox(p - vec3(0., 6.15, 2.3), vec3(NW + 0.1, 0.95, 2.35));
    if (bl < 0.3) {
      float slab = sdBox(p - vec3(0., 5.72, 2.2), vec3(NW, 0.16, 2.2));
      float jk = clamp(floor((p.z - 0.35) / 0.7 + 0.5), 0., 5.);
      float joist = sdBox(p - vec3(0., 5.44, 0.35 + 0.7 * jk), vec3(NW, 0.13, 0.08));
      float fas = sdBox(p - vec3(0., 5.55, 4.36), vec3(NW, 0.34, 0.1));
      float rail = sdBox(p - vec3(0., 6.86, 4.36), vec3(NW, 0.06, 0.09));
      vec3 bq = vec3(p.x - 0.28 * (floor(p.x / 0.28) + 0.5), p.y, p.z - 4.36);
      float bal = sdCyl(bq, 0.045 + 0.03 * smoothstep(0.25, 0., abs(p.y - 6.3)), 5.88, 6.82);
      U(r, min(min(slab, joist), min(min(fas, rail), bal)), 4.);
    } else U(r, bl, 4.);
  }
  // ---- the pews
  {
    float bp = sdBox(vec3(ax - 2.98, p.y - 0.55, p.z - 22.75), vec3(1.86, 0.62, 17.4));
    if (bp < 0.25) {
      float k = clamp(floor((p.z - PZ0) / PDZ + 0.5), 0., 35.), lz = p.z - PZ0 - PDZ * k;
      float x = ax - 2.98;
      float seat = sdBox(vec3(x, p.y - 0.44, lz - 0.02), vec3(1.64, 0.022, 0.2)) - 0.006;
      float bz = lz - 0.24 - (p.y - 0.44) * 0.13;
      float back = sdBox(vec3(x, p.y - 0.7, bz), vec3(1.64, 0.24, 0.018)) - 0.006;
      float topr = sdBox(vec3(x, p.y - 0.95, bz), vec3(1.64, 0.025, 0.04)) - 0.01;
      float kneel = sdBox(vec3(x, p.y - 0.12, lz + 0.31), vec3(1.6, 0.03, 0.065));
      float endp = sdBox(vec3(ax - 1.32, p.y - 0.5, lz - 0.04), vec3(0.035, 0.5, 0.3)) - 0.012;
      // the aisle end rises in a scroll
      endp = min(endp, max(length(vec2(p.y - 1.0, lz - 0.2)) - 0.12, abs(ax - 1.32) - 0.047));
      float endo = sdBox(vec3(ax - 4.62, p.y - 0.48, lz - 0.04), vec3(0.035, 0.48, 0.3));
      U(r, min(min(min(seat, back), min(topr, kneel)), min(endp, endo)), 4.);
    } else U(r, bp, 4.);
  }
  // ---- flowers on every third aisle end, candles on the floor beside them
  {
    float bf = sdBox(vec3(ax - 1.18, p.y - 0.66, p.z - 22.75), vec3(0.36, 0.68, 17.5));
    if (bf < 0.25) {
      float k = clamp(floor((p.z - PZ0 - 0.06) / (PDZ * 3.) + 0.5), 0., 11.), zf = clusterZ(k);
      vec3 q = vec3(ax - 1.18, p.y - 0.98, p.z - zf);
      // a dome of roses, a spray trailing down the pew end, leaves under them
      U(r, roses(q, 0.17, 0.042, k), 6.);
      U(r, roses(q - vec3(0.015, -0.26, 0.03), 0.095, 0.03, k + 5.), 6.);
      // leaves: a ring of them round the roses, pointing out, and a few trailing below
      vec3 lq = q - vec3(-0.035, -0.06, 0.);
      float la = atan(lq.z, lq.y), sa = 6.2832 / 9., ai = floor(la / sa + 0.5) * sa + 0.1 * sin(k * 3.);
      vec2 dir = vec2(cos(ai), sin(ai));
      vec3 lf = vec3(lq.x + 0.02 * dot(lq.yz, dir) * 3., dot(lq.yz, dir) - 0.2, dot(lq.yz, vec2(-dir.y, dir.x)));
      float leaf = (length(lf / vec3(0.012, 0.085, 0.036)) - 1.) * 0.012;
      U(r, leaf, 9.);
      // two satin ribbon tails falling from under the roses, a little apart, gently waved
      U(r, gyps(q, 0.17, 0.017), 20.);
      U(r, stems(q, -0.1, -0.3, 0.08), 21.);
      U(r, sdCyl(q - vec3(0., 0., 0.), 0.024, -0.33, -0.28) - 0.004, 13.);
      float ry = q.y + 0.31;
      float tails = 1e3;
      for (int t = 0; t < 2; t++) {
        float sd = float(t) * 2. - 1.;
        vec3 rq = vec3(q.x + 0.02 + 0.012 * sin(ry * 9. + sd), ry, q.z - sd * (0.03 + 0.06 * max(0., -ry)));
        tails = min(tails, sdBox(rq - vec3(0., -0.22, 0.), vec3(0.003, 0.22, 0.024)));
      }
      U(r, tails * 0.8, 13.);
      // three pillars of different heights
      vec3 c0 = vec3(ax - 1.0, p.y, p.z - zf);
      float cd = sdCyl(c0, 0.056, 0., 0.42);
      cd = min(cd, sdCyl(c0 - vec3(0.06, 0., 0.15), 0.05, 0., 0.27));
      cd = min(cd, sdCyl(c0 - vec3(0.08, 0., -0.13), 0.048, 0., 0.2));
      U(r, cd - 0.004, 7.);
    } else U(r, bf, 6.);
  }
  // ---- the sanctuary: the altar, two great flower stands, candles, the retablo
  if (p.z > 44.) {
    float alt = sdBox(p - vec3(0., PL + 0.5, 52.), vec3(1.7, 0.5, 0.52)) - 0.01;
    U(r, alt, 13.);
    // the flower stands at the top of the steps
    vec3 s = vec3(ax - 3.3, p.y, p.z - 46.4);
    float bs = length(s.xz) - 0.75;
    if (bs < 0.25) {
      U(r, sdCyl(s, 0.2, PL, 1.45) - 0.02, 1.);
      vec3 sq2 = (s - vec3(0., 1.62, 0.)) * vec3(0.8, 1., 0.8) / 1.6;
      U(r, roses(sq2, 0.26, 0.06, 40.) * 1.25, 6.);
      U(r, gyps(vec3(-abs(sq2.x) - 0.06, sq2.yz), 0.26, 0.02) * 1.25, 20.);
      U(r, (length((s - vec3(0.0, 1.5, 0.)) / vec3(0.5, 0.2, 0.45)) - 1.) * 0.18, 9.);
      U(r, (length((s - vec3(-0.1, 1.15, 0.)) / vec3(0.16, 0.42, 0.2)) - 1.) * 0.15, 9.);
    } else U(r, bs, 6.);
    // candle stands either side of the altar
    vec3 cs = vec3(ax - 2.2, p.y, p.z - 52.);
    float bc = length(cs.xz) - 0.2;
    if (bc < 0.25) {
      U(r, min(sdCyl(cs, 0.04, PL, 1.62), min(sdCyl(cs, 0.17, PL, PL + 0.06), sdCyl(cs, 0.11, 1.56, 1.64))), 14.);
      U(r, sdCyl(cs, 0.045, 1.62, 1.98), 7.);
    } else U(r, bc, 14.);
    if (p.z > 55.9) {
      float rz = p.z - 57.4;
      // the predella
      float pred = sdBox(p - vec3(0., PL + 0.85, 57.25), vec3(4.7, 0.85, 0.72));
      // the body: two tiers and an attic, each with its niches
      float topY = ax < 2.7 ? 11.0 + 2.6 * sqrt(max(0., 1. - (ax / 2.7) * (ax / 2.7))) : 11.05;
      float body = max(max(abs(rz - 0.3) - 0.3, ax - 4.6), max(p.y - topY, 2.1 - p.y));
      float n1 = min(archD(vec2(p.x, p.y - 2.45), 0.82, 3.0), archD(vec2(ax - 2.6, p.y - 2.5), 0.62, 2.85));
      float n2 = min(archD(vec2(p.x, p.y - 7.15), 0.7, 2.55), archD(vec2(ax - 2.6, p.y - 7.2), 0.54, 2.45));
      float n3 = archD(vec2(p.x, p.y - 11.3), 0.55, 1.35);
      float n = min(max(n1, p.y - 6.4), min(max(max(n2, 7.0 - p.y), p.y - 10.6), max(n3, 11.1 - p.y)));
      // the niches are sunk 0.42 into the body
      body = max(body, -max(n, rz - 0.42));
      // entablatures
      float e1 = sdBox(p - vec3(0., 6.7, 57.15), vec3(4.8, 0.3, 0.3));
      float e2 = sdBox(p - vec3(0., 10.85, 57.2), vec3(4.25, 0.22, 0.25));
      // twisted columns between the niches
      float cx1 = ax < 2.5 ? 1.32 : 3.82;
      vec3 cq = vec3(ax - cx1, p.y, p.z - 57.02);
      // a Solomonic column: a shaft wound with a deep helix, vines in its groove
      float hel = sin(atan(cq.z, cq.x) * 2. + p.y * 7.5);
      float r1 = p.y < 6.6 ? 0.155 : 0.125;
      float tw = min(sdCyl(cq, r1 + 0.035 * hel, 2.18, 6.4), sdCyl(cq, r1 + 0.03 * hel, 7.0, 10.63)) * 0.7;
      tw = min(tw, min(sdBox(cq - vec3(0., 6.32, 0.), vec3(0.23, 0.08, 0.23)), sdBox(cq - vec3(0., 10.56, 0.), vec3(0.19, 0.07, 0.19))));
      tw = min(tw, min(sdBox(cq - vec3(0., 2.26, 0.), vec3(0.22, 0.08, 0.22)), sdBox(cq - vec3(0., 7.08, 0.), vec3(0.18, 0.07, 0.18))));
      // the attic's frame: a ring round the top niche
      float halo = max(abs(length(vec2(p.x, p.y - 12.65)) - 0.85) - 0.1, abs(rz + 0.05) - 0.08);
      // a moulded arch round each niche, a bracket under each saint
      float av = max(abs(n + 0.09) - 0.06, abs(rz + 0.04) - 0.05);
      float sx0 = ax < 1.6 ? 0. : 2.6;
      float py = p.y < 6.6 ? 2.45 : p.y < 10.8 ? 7.15 : 11.3;
      float ped = sdBox(vec3(ax - sx0, p.y - py + 0.06, rz - 0.18), vec3(0.32, 0.08, 0.2));
      float gold = min(min(min(pred, body), min(av, ped)), min(min(e1, e2), min(tw, halo)));
      U(r, gold, 5.);
      // the back of each niche
      U(r, max(n + 0.02, abs(rz - 0.47) - 0.05), 10.);
      // the saints: a robe narrowing to the shoulders, a head
      float sx = ax < 1.6 ? 0. : 2.6;
      float sy0 = p.y < 6.6 ? 2.45 : p.y < 10.8 ? 7.15 : 11.3;
      float sc = sx == 0. ? (sy0 > 10. ? 0.62 : sy0 > 7. ? 0.86 : 1.0) : (sy0 > 7. ? 0.7 : 0.82);
      vec3 sq = vec3(ax - sx, p.y - sy0, rz - 0.2) / sc;
      U(r, saintD(sq) * sc * 0.9, 11.);
      float hl = max(abs(length(sq.xy - vec2(0., 1.72)) - 0.2) - 0.022, abs(sq.z - 0.13) - 0.012) * sc;
      U(r, hl, 5.);
      // the candles on the predella
      vec3 pc = vec3(ax - (ax < 0.92 ? 0.6 : ax < 1.57 ? 1.25 : 1.9), p.y, p.z - 56.75);
      U(r, sdCyl(pc, 0.07, 2.18, 2.38), 14.);
      U(r, sdCyl(pc, 0.04, 2.38, 2.86), 7.);
    } else U(r, 56.25 - p.z, 5.);
  } else U(r, 45.6 - p.z, 13.);
  // ---- three brass chandeliers down the nave, each with a ring of eight candles
  {
    float kc = clamp(floor((p.z - CHZ) / 12. + 0.5), 0., 1.), zc = CHZ + 12. * kc;
    vec3 c = vec3(ax - CHX, p.y - CHY, p.z - zc);
    float bb = sdBox(c - vec3(0., 4.9, 0.), vec3(0.86, 5.3, 0.86));
    if (bb < 0.25) {
      float chain = sdCyl(c, 0.014, 0.75, 10.5);
      float body = length((c - vec3(0., 0.3, 0.)) / vec3(0.13, 0.34, 0.13)) * 0.13 - 0.13;
      body = min(body, length(c - vec3(0., -0.07, 0.)) - 0.06);
      vec2 tq = vec2(length(c.xz) - 0.66, c.y - 0.42);
      float ring = length(tq) - 0.022;
      float a = atan(c.z, c.x), sa = 6.2832 / 8., ai = floor(a / sa + 0.5) * sa;
      vec2 cs = vec2(cos(ai), sin(ai));
      vec3 lq = vec3(dot(c.xz, cs), c.y, dot(c.xz, vec2(-cs.y, cs.x)));
      // the S of each arm, out from the body to its cup
      float arm = length(vec2(lq.z, length(vec2(lq.x - 0.33, (lq.y - 0.3) * 1.6)) - 0.31)) - 0.016;
      arm = max(max(arm, -lq.x + 0.05), lq.y - 0.31);
      float cup = sdCyl(lq - vec3(0.66, 0., 0.), 0.05, 0.43, 0.5);
      float wax = sdCyl(lq - vec3(0.66, 0., 0.), 0.022, 0.5, 0.72);
      U(r, min(min(chain, body), min(ring, min(arm, cup))) * 0.9, 14.);
      U(r, wax, 7.);
    } else U(r, bb, 14.);
  }
  // the back wall behind the retablo
  U(r, ZE + 0.02 - p.z, 1.);
  return r;
}
float mapD(vec3 p){ return map(p).x; }
vec3 normalAt(vec3 p, float e){
  vec2 k = vec2(1., -1.);
  return normalize(k.xyy * mapD(p + k.xyy * e) + k.yyx * mapD(p + k.yyx * e) + k.yxy * mapD(p + k.yxy * e) + k.xxx * mapD(p + k.xxx * e));
}
float aoAt(vec3 p, vec3 n){
  float o = 0., s = 1.;
  for (int i = 1; i <= 4; i++) { float h = 0.05 + 0.16 * float(i * i) * 0.25; o += (h - mapD(p + n * h)) * s; s *= 0.62; }
  return clamp(1. - o * 1.9, 0., 1.);
}
// the pews' (and the flowers', the candles') shadow under a beam: a short march toward the sun
float pewShadow(vec3 P){
  if (P.y > 1.25 || P.z < 4.5 || P.z > 41.5) return 1.;
  float v = 1., t = 0.04;
  for (int i = 0; i < 10; i++) {
    vec3 q = P + uSun * t;
    if (q.y > 1.25) break;
    float d = mapD(q);
    v = min(v, smoothstep(0., 0.05 + 0.08 * t, d));
    t += max(d * 0.9, 0.03);
    if (v < 0.02) break;
  }
  return v;
}
// what's beyond a window or the doorway: the sky at the end of the afternoon
vec3 sky(vec3 rd){
  float u = clamp(rd.y, -0.1, 1.);
  // late afternoon: gold low down, deepening to blue overhead, the sun's glow behind the church
  vec3 s = mix(vec3(1.25, 0.78, 0.46), vec3(0.24, 0.38, 0.68), pow(max(u, 0.), 0.42));
  s = mix(s, vec3(1.0, 0.62, 0.38), smoothstep(0.08, -0.05, u) * 0.5);
  float sg = max(dot(normalize(vec3(rd.x, max(rd.y, 0.), rd.z)), SUNO), 0.);
  s += vec3(1.1, 0.62, 0.3) * (pow(sg, 8.) * 0.32 + pow(sg, 60.) * 1.4);
  s += SUNC * (6. * pow(max(dot(rd, uSun), 0.), 24.) + 0.9 * pow(max(dot(rd, uSun), 0.), 3.));
  return s;
}
vec4 det(vec2 p, float s, float pw){ return textureLod(uDetail, p * s, log2(max(pw * s * 512., 1.))); }

// coral stone: coursed blocks of uneven length, each its own tone, pitted, weathered
vec3 stone(vec3 P, vec3 n, float pw, inout vec3 nb, float dressed){
  vec3 an = abs(n);
  vec2 uv = an.x > an.z && an.x > an.y ? vec2(P.z, P.y) : an.z > an.y ? vec2(P.x, P.y) : vec2(P.x, P.z);
  float rh = 0.52;
  float row = floor(uv.y / rh);
  float rl = 0.8 + 0.6 * h11(row * 3.1 + 0.7);
  float u = uv.x + h11(row * 1.7) * rl;
  float col = floor(u / rl);
  float bl = rl * (0.75 + 0.5 * h21(vec2(col, row) + 0.3));
  float jx = abs(fract(u / rl) - 0.5) * rl, jy = abs(fract(uv.y / rh) - 0.5) * rh;
  float j = min(rl * 0.5 - jx, rh * 0.5 - jy);
  float id = h21(vec2(col, row));
  vec4 D = det(uv, 0.17, pw), F = det(uv + id * 3.7, 0.9, pw), G = det(uv * vec2(1., 0.35), 0.05, pw), K = det(uv, 2.6, pw);
  // cream, honey, grey-ochre: no two blocks alike
  vec3 c = mix(vec3(0.66, 0.57, 0.44), vec3(0.78, 0.68, 0.53), id);
  c = mix(c, vec3(0.58, 0.55, 0.5), step(0.82, id) * 0.6);
  c = mix(c, vec3(0.75, 0.56, 0.4), step(id, 0.12) * 0.5);
  c *= 0.78 + 0.36 * D.r;
  // patina: broad stains running down the wall
  c = mix(c, c * vec3(0.62, 0.6, 0.56), smoothstep(0.45, 0.8, G.r) * 0.7);
  // the coral's pores: small dark pits, a few larger holes
  float pit = smoothstep(0.38, 0.1, F.g) + smoothstep(0.25, 0.05, K.g) * 0.5;
  c *= 1. - min(pit, 1.) * 0.38 * (1. - dressed);
  c *= 0.9 + 0.16 * K.a;
  // the joints: soft and lime-filled, the blocks' edges worn round
  float see = smoothstep(0.06, 0.015, pw);
  float jw = 0.008 + pw;
  float jt = 1. - smoothstep(jw, jw + 0.035, j);
  c = mix(c, c * 0.8 + vec3(0.04, 0.036, 0.03), jt * see * 0.55);
  // chipped arrises: bites out of the blocks' edges, darker inside
  c *= 1. - smoothstep(0.55, 0.75, K.r) * (1. - smoothstep(0.02, 0.09, j)) * 0.45 * see;
  // soot and damp: streaks down from the cornices, darker low on the walls
  vec4 Sx = det(vec2(uv.x * 1.4, uv.y * 0.1), 0.6, pw);
  c *= 1. - smoothstep(0.55, 0.85, Sx.r) * 0.22;
  c *= mix(0.6, 1., smoothstep(0.1, 1.8, P.y + D.g * 0.8));
  if (P.z < -0.2) {
    // outside: rain has run dark down the stone for three hundred years; moss at its foot
    vec4 S = det(vec2(uv.x * 0.9, uv.y * 0.12), 0.35, pw);
    c = mix(c, c * vec3(0.55, 0.53, 0.5), smoothstep(0.5, 0.8, S.r) * smoothstep(0.3, 0.7, D.r) * 0.9);
    // lichen, grey and black, in broad patches
    c = mix(c, vec3(0.26, 0.25, 0.22), smoothstep(0.62, 0.9, G.g * 0.6 + D.r * 0.5) * 0.3);
    c *= vec3(0.66, 0.6, 0.54);
    c = mix(c, vec3(0.2, 0.24, 0.15), smoothstep(1.3, 0.1, P.y + D.r * 0.9) * 0.55);
    c *= vec3(1.12, 1.04, 0.94);
    // the old lime render, still on in patches, worn back to the stone at its edges
    vec4 Rn = det(uv * vec2(0.7, 0.9) + 3.1, 0.12, pw);
    float rmask = smoothstep(0.6, 0.66, Rn.r + 0.12 * G.r - 0.12 * smoothstep(2.2, 0., P.y)) * 0.75;
    vec3 lime = c * 0.55 + vec3(0.3, 0.28, 0.24) * (0.84 + 0.2 * K.a);
    c = mix(c, lime, rmask * (1. - dressed));
    c *= 1. - (1. - smoothstep(0.0, 0.025, abs(Rn.r + 0.12 * G.r - 0.12 * smoothstep(2.2, 0., P.y) - 0.63))) * 0.2 * (1. - dressed);
    // rain off each ledge: dark streaks, greenish where the moss holds
    vec4 St = det(vec2(P.x * 2.6, P.y * 0.16), 0.5, pw);
    float run = 0.;
    for (int i = 0; i < 4; i++) {
      float L = i == 0 ? 0.6 : i == 1 ? 6.68 : i == 2 ? 7.56 : 10.2;
      run = max(run, step(P.y, L) * exp(-(L - P.y) * (i == 0 ? 2.5 : 0.65)) * step(abs(P.x), i == 3 ? 1.3 : 4.0));
    }
    run = max(run, smoothstep(9., 13., P.y) * 0.5);
    c = mix(c, c * vec3(0.48, 0.5, 0.44), run * smoothstep(0.42, 0.72, St.r) * 0.9);
  }
  nb += vec3(D.r - 0.5, F.g - 0.5, D.g - 0.5) * 0.35 * see + vec3(0., 1., 0.) * 0.;
  return c;
}
// the nearest bloom of a pew-end's roses: rings of petals round its middle
float petals(vec3 P){
  float ax = abs(P.x);
  float k = clamp(floor((P.z - PZ0 - 0.06) / (PDZ * 3.) + 0.5), 0., 11.);
  vec3 q = vec3(ax - 1.18, P.y - 0.98, P.z - clusterZ(k));
  float R = 0.17, seed = k;
  if (P.z > 44.) { q = (vec3(ax - 3.3, P.y, P.z - 46.4) - vec3(0., 1.62, 0.)) * vec3(0.8, 1., 0.8) / 1.6; R = 0.26; seed = 40.; }
  else if (P.y < 0.86) { q -= vec3(0.015, -0.26, 0.03); R = 0.09; seed = k + 5.; }
  float best = 1e3, second = 1e3; vec3 bc = vec3(0.);
  for (int i = 0; i < NR; i++) {
    vec3 c = bloomAt(i, R, seed);
    float d = length(q - c);
    if (d < best) { second = best; best = d; bc = c; } else if (d < second) second = d;
  }
  // a rose seen from outside: petals wrapped round its heart, in a loose spiral
  vec3 w = q - bc, nw = normalize(bc + 1e-4);
  vec3 t1 = normalize(cross(nw, vec3(0.3, 1., 0.2))), t2 = cross(nw, t1);
  vec2 pl = vec2(dot(w, t1), dot(w, t2)) / (R * 0.2);
  float rr = length(pl), ang = atan(pl.y, pl.x);
  float pet = abs(fract(rr * 2.2 - ang / 6.2832 * 1.6) - 0.5);
  float crev = mix(0.55, 1., smoothstep(0.0, 0.22, pet) * smoothstep(0.0, 0.6, rr)) * mix(0.7, 1., smoothstep(0.1, 0.9, rr));
  // where two roses meet, a dark seam
  float seam = smoothstep(0.0, R * 0.05, second - best);
  return crev * mix(0.5, 1., seam);
}

// carved ornament on the gilded panels: a rosette in each square, a vine running between them
float orn(vec2 u){
  vec2 c = u / vec2(0.62, 0.56) + vec2(0.5 * step(0.5, fract(floor(u.y / 0.56) * 0.5)), 0.), id = floor(c), f = fract(c) - 0.5;
  float r = length(f), a = atan(f.y, f.x) + h21(id) * 0.8;
  // a cupped rosette: its petals rising from the ground to a ring, a boss in its heart
  float pr = r * (1. + 0.2 * cos(a * 10.) + 0.06 * cos(a * 30.));
  float ros = smoothstep(0.33, 0.24, pr) * (0.5 + 0.5 * smoothstep(0.08, 0.2, r)) * (1. - 0.3 * smoothstep(0.2, 0.3, pr));
  ros = max(ros, smoothstep(0.07, 0.04, r));
  float vine = smoothstep(0.05, 0.015, abs(f.y + 0.42 * sin(f.x * 6.283) * 0.5 - 0.5 * step(0.5, fract(id.x * 0.5)) * 0.)) * smoothstep(0.24, 0.34, r);
  float leaf = smoothstep(0.08, 0.03, length(vec2(abs(f.x) - 0.36, f.y - 0.12 * sign(f.x)) * vec2(1., 2.2))) * 0.8;
  return max(ros, max(vine * 0.55, leaf));
}
vec3 shade(vec3 P, vec3 rd, float t, float m, out float emis){
  emis = 0.;
  float pw = t * uPix;
  vec3 n = normalAt(P, max(0.0015, pw * 0.5));
  gN = n;
  vec3 nb = vec3(0.);
  vec3 alb = vec3(0.5);
  float spec = 0., rough = 0.5, metal = 0., trans = 0., emisW = 0., sheen = 0., polish = 0.;
  bool inside = P.z > 0.02;
  if (m == 1.) {
    alb = stone(P, n, pw, nb, P.z < FZ + 0.4 && P.z > FZ - 6. ? 0.2 : 0.);
    if (abs(P.x) < NW + 0.95 && abs(P.x) > NW - 0.3 && P.y > 4.62 && P.z > 1.) alb *= 1.05;
  } else if (m == 2.) {
    vec4 D = det(P.xz * vec2(1., 0.6) + P.y, 0.08, pw), E = det(P.xz + P.y, 0.6, pw);
    alb = vec3(0.80, 0.74, 0.64) * (0.86 + 0.18 * D.r) * (0.94 + 0.08 * E.a);
    alb = mix(alb, vec3(0.62, 0.55, 0.45), smoothstep(0.62, 0.8, D.g) * 0.5);
  } else if (m == 3. || m == 8.) {
    // baldosa: square clay tiles, each fired its own red, worn smooth down the middle
    vec2 g = P.xz / 0.56;
    vec2 id = floor(g), f = abs(fract(g) - 0.5);
    float j = (0.5 - max(f.x, f.y)) * 0.56;
    float h = h21(id);
    vec4 D = det(P.xz, 0.4, pw), E = det(P.xz, 2.2, pw);
    alb = mix(vec3(0.36, 0.18, 0.11), vec3(0.47, 0.27, 0.17), h) * (0.82 + 0.3 * D.r) * (0.9 + 0.15 * E.a);
    alb = mix(alb, vec3(0.2, 0.13, 0.09), (1. - smoothstep(0.006 + pw, 0.02 + pw, j)) * 0.8);
    spec = 0.35; rough = 0.25; polish = P.y < 0.05 ? 1. : 0.5;
    if (P.y > 0.1) alb = stone(P, n, pw, nb, 0.6) * 0.95;
    // the runner: ivory, a fine weave, a gold line inside each edge, petals strewn on it
    float ru = abs(P.x) - 0.78;
    if (ru < 0. && P.z > 0.4 && P.z < 44.35) {
      vec4 W = det(P.xz, 9., pw), Fo = det(vec2(P.x * 0.6, P.z * 0.09), 1., pw);
      // soft folds where it was rolled out, running along its length
      float fold = sin(P.x * 7.5 + Fo.r * 9.) * 0.5 + 0.5;
      nb += vec3(cos(P.x * 7.5 + Fo.r * 9.) * 0.22, 0., (Fo.g - 0.5) * 0.3);
      vec3 run = vec3(0.86, 0.84, 0.79) * (0.9 + 0.1 * W.a) * (0.94 + 0.08 * fold);
      sheen = 1.;
      float edge = smoothstep(0.012 + pw, 0., abs(ru + 0.07) - 0.012);
      run = mix(run, vec3(0.62, 0.45, 0.2), edge * 0.8);
      run *= mix(0.82, 1., smoothstep(0., 0.05, -ru));
      // petals: a few to each square of the runner
      vec2 pg = P.xz / 0.16, pid = floor(pg), pf = fract(pg) - 0.5;
      float ph = h21(pid + 17.3);
      vec2 po = vec2(h21(pid + 3.1), h21(pid + 9.7)) - 0.5;
      float pa = ph * 6.283;
      vec2 pq = mat2(cos(pa), -sin(pa), sin(pa), cos(pa)) * (pf - po * 0.5);
      float pd = length(pq / vec2(0.36, 0.22)) - 1.;
      float pet = smoothstep(0.08, -0.08, pd) * step(0.55, ph) * smoothstep(0.08, 0.02, pw);
      vec3 pc = ph > 0.8 ? vec3(0.78, 0.55, 0.52) : vec3(0.92, 0.9, 0.86);
      run = mix(run, pc, pet);
      float cov = smoothstep(pw, -pw, ru);
      alb = mix(alb, run, cov);
      spec *= 1. - cov; rough = mix(rough, 0.9, cov); polish *= 1. - cov; sheen *= cov;
    }
  } else if (m == 4. || m == 12.) {
    // dark wood, the grain running the length of each board
    float along = m == 12. ? P.y : (abs(n.x) > 0.7 ? P.y + P.z : P.x);
    float across = m == 12. ? (abs(P.x) + P.z) : (abs(n.y) > 0.7 ? P.z : abs(n.x) > 0.7 ? P.z : P.y);
    vec4 D = det(vec2(along * 0.15, across * 3.), 1., pw);
    vec4 E = det(vec2(along * 0.6, across * 9.), 1., pw);
    alb = mix(vec3(0.085, 0.045, 0.026), vec3(0.15, 0.085, 0.045), D.r) * (0.8 + 0.35 * E.a);
    if (m == 12.) {
      alb = mix(vec3(0.11, 0.065, 0.04), vec3(0.2, 0.12, 0.07), D.r) * (0.75 + 0.4 * E.a);
      // iron studs in rows on the rails between the panels
      vec2 sg = vec2((abs(P.x) + P.z * 0.0) / 0.3, P.y / 0.3);
      vec2 sf = fract(sg) - 0.5;
      float st = smoothstep(0.2, 0.12, length(sf)) * step(abs(fract(P.y / 1.5 + 0.13) - 0.5), 0.06);
      alb = mix(alb, vec3(0.05, 0.045, 0.04), st);
    }
    spec = 0.5; rough = 0.32;
    // worn pale and glossy where hands rest: the top rail and the scroll of each aisle end
    if (m == 4. && P.y > 0.9 && P.y < 1.15 && P.z > 5.) { alb *= 1.5; alb += vec3(0.03, 0.015, 0.005); rough = 0.2; spec = 0.8; }
  } else if (m == 5.) {
    // gold leaf over carving: the relief breaks up every reflection
    // gilded wood, carved: acanthus scrolls running over every panel, darker in the hollows,
    // the red bole showing through where hands and years have rubbed the high points
    vec2 gu = abs(n.z) > 0.6 ? P.xy : abs(n.x) > 0.6 ? P.zy : P.xz;
    vec2 e = vec2(0.006, 0.);
    float h0 = orn(gu), hx = orn(gu + e), hy = orn(gu + e.yx);
    float see = smoothstep(0.03, 0.008, pw);
    vec3 tx = abs(n.z) > 0.6 ? vec3(1., 0., 0.) : vec3(0., 0., 1.);
    nb += (tx * (h0 - hx) + vec3(0., 1., 0.) * (h0 - hy)) / e.x * 0.05 * see;
    float hh = h0;
    // seen from farther than the carving can be made out: its average, the darker ground among the bright relief
    float far = smoothstep(0.008, 0.03, pw);
    vec4 Wn = det(P.xy, 0.9, pw), Lg = det(P.xy + P.z, 0.13, pw);
    alb = vec3(0.92, 0.62, 0.24) * (0.72 + 0.4 * Lg.r);
    // the ground between the carving, punched and darker
    alb = mix(alb, vec3(0.32, 0.17, 0.06) * (0.8 + 0.4 * det(gu * 3., 4., pw).a), (1. - smoothstep(0., 0.2, hh)) * 0.55 * see);
    alb = mix(alb, vec3(0.42, 0.14, 0.07), smoothstep(0.7, 0.95, hh) * smoothstep(0.6, 0.78, Wn.r) * 0.55 * see);
    // the gilding's own unevenness: brighter burnished passages, duller water-gilt ones
    alb *= 0.85 + 0.3 * smoothstep(0.3, 0.7, det(P.xy * 0.7 + P.z, 0.5, pw).r);
    alb *= mix(1., 0.72, far);
    rough = mix(0.3, 0.42, far);
    metal = 1.; spec = 1.;
  } else if (m == 18.) {
    // dressed coral stone, carved: running scrolls on the pilasters' faces, the frieze, the keystone
    alb = stone(P, n, pw, nb, 0.75) * vec3(1.06, 1.02, 0.96);
    float ax2 = abs(P.x);
    float zone = (step(abs(ax2 - 2.72), 0.24) * step(0.75, P.y) * step(P.y, 6.1)) + step(abs(P.y - 7.12), 0.13) * step(ax2, 3.6) + step(5.85, P.y) * step(P.y, 6.55) * step(ax2, 0.24) + step(abs(ax2 - 2.72), 0.36) * step(abs(P.y - 6.42), 0.2);
    if (zone > 0. && abs(n.z) > 0.6) {
      vec2 cu = vec2(P.x, P.y) * 7.;
      float e = 0.06;
      float h0 = sin(cu.x + 1.8 * sin(cu.y * 0.5)) * cos(cu.y + 1.8 * sin(cu.x * 0.5));
      float hx = sin(cu.x + e + 1.8 * sin(cu.y * 0.5)) * cos(cu.y + 1.8 * sin((cu.x + e) * 0.5));
      float hy = sin(cu.x + 1.8 * sin((cu.y + e) * 0.5)) * cos(cu.y + e + 1.8 * sin(cu.x * 0.5));
      nb += vec3(h0 - hx, h0 - hy, 0.) / e * 0.55 * smoothstep(0.06, 0.02, pw);
      alb *= 0.82 + 0.2 * smoothstep(-0.6, 0.8, h0);
    }
    // the saint in the niche: weathered grey, darker in its folds
    if (P.y > 7.75 && P.y < 9.7 && ax2 < 0.55) alb = mix(alb, vec3(0.5, 0.48, 0.44) * (0.8 + 0.3 * det(P.xy, 2., pw).r), 0.6);
  } else if (m == 20.) {
    // baby's breath: tiny white florets
    alb = vec3(0.93, 0.92, 0.88); trans = 0.9; emisW = 0.22;
  } else if (m == 21.) {
    alb = vec3(0.1, 0.17, 0.06) * (0.8 + 0.4 * det(P.xy, 4., pw).r); trans = 0.4; spec = 0.2; rough = 0.4;
  } else if (m == 6.) {
    // white garden roses: cream, warmer and a little translucent deep in the petals
    float pe = petals(P);
    alb = mix(vec3(0.82, 0.68, 0.54), vec3(0.95, 0.93, 0.88), pe);
    // a blush rose here and there
    alb *= mix(vec3(1.), vec3(1.0, 0.86, 0.82), step(0.82, h21(floor(P.xz * 9.) + floor(P.y * 9.))));
    trans = 1.0; spec = 0.25; rough = 0.55;
    emisW = P.z > 44. ? 0.42 : 0.24;
  } else if (m == 9.) {
    vec4 D = det(P.xy + P.zx, 4., pw);
    alb = mix(vec3(0.07, 0.13, 0.04), vec3(0.2, 0.28, 0.1), D.g);
    trans = 0.8; spec = 0.4; rough = 0.35;
  } else if (m == 7.) {
    alb = vec3(0.86, 0.80, 0.68); trans = 1.;
  } else if (m == 10.) {
    // a niche: its head a carved, gilded shell; below, red damask behind the saint
    float ax2 = abs(P.x);
    bool side = ax2 > 1.6;
    float cx = side ? sign(P.x) * 2.6 : 0.;
    float spr = P.y < 6.6 ? (side ? 5.35 : 5.45) : P.y < 10.8 ? (side ? 9.65 : 9.7) : 12.65;
    if (P.y > spr - 0.05) {
      float ang = atan(P.x - cx, P.y - spr + 0.05);
      float rib = cos(ang * 15.);
      nb += vec3(-sin(ang * 15.) * 0.6, 0., rib * 0.2);
      alb = vec3(0.86, 0.58, 0.22) * (0.7 + 0.3 * smoothstep(-0.6, 0.9, rib));
      metal = 1.; spec = 1.; rough = 0.32;
    } else {
      vec4 Dm = det(P.xy * 2.2, 1., pw);
      alb = vec3(0.26, 0.04, 0.035) * (0.75 + 0.35 * Dm.r);
      alb = mix(alb, vec3(0.55, 0.36, 0.14), smoothstep(0.62, 0.75, Dm.g) * 0.5);
    }
  } else if (m == 11.) {
    // the saints, painted: faces and hands in flesh, robes and mantles in their colours with
    // gilt patterns (estofado) and gilt hems
    float ax2 = abs(P.x);
    float sx = ax2 < 1.6 ? 0. : 2.6;
    float sy0 = P.y < 6.6 ? 2.45 : P.y < 10.8 ? 7.15 : 11.3;
    float sc = sx == 0. ? (sy0 > 10. ? 0.62 : sy0 > 7. ? 0.86 : 1.0) : (sy0 > 7. ? 0.7 : 0.82);
    vec3 q = vec3(ax2 - sx, P.y - sy0, P.z - 57.6) / sc;
    float tier = sy0 > 10. ? 2. : sy0 > 7. ? 1. : 0.;
    bool mid = sx == 0.;
    vec3 tunic = mid ? (tier == 0. ? vec3(0.78, 0.72, 0.6) : tier == 1. ? vec3(0.5, 0.1, 0.08) : vec3(0.8, 0.75, 0.62)) : (tier == 0. ? vec3(0.45, 0.08, 0.06) : vec3(0.3, 0.2, 0.12));
    vec3 mantle = mid ? (tier == 0. ? vec3(0.08, 0.06, 0.05) : tier == 1. ? vec3(0.08, 0.14, 0.36) : vec3(0.75, 0.62, 0.38)) : (tier == 0. ? vec3(0.6, 0.5, 0.32) : vec3(0.22, 0.14, 0.08));
    float yy = clamp(q.y / 1.5, 0., 1.);
    float robeR = length(q.xz * vec2(1., 1.25)) - mix(0.27, 0.15, yy);
    float mantR = length((q.xz - vec2(0., 0.025)) * vec2(1., 1.15)) - mix(0.31, 0.18, yy);
    bool onMantle = (mantR > robeR - 0.02 && q.z > -0.05 - 0.08 * yy && q.y > 0.28) || (q.y > 1.6 && q.z > 0.0);
    alb = onMantle ? mantle : tunic;
    // the gilt pattern, and the hems
    vec4 Gp = det(q.xy * 2. + q.z, 1., pw);
    alb = mix(alb, vec3(0.85, 0.6, 0.25), smoothstep(0.62, 0.72, Gp.g) * 0.3);
    alb = mix(alb, vec3(0.9, 0.65, 0.28), min(1., step(q.y, 0.07) + (onMantle ? smoothstep(0.03, 0., abs(q.z + 0.05 + 0.08 * yy)) : 0.)) * 0.8);
    // flesh: the face, the joined hands; the eyes and the mouth as touches of paint
    vec3 fc = q - vec3(0., 1.67, -0.01);
    bool face = length(fc / vec3(0.09, 0.11, 0.1)) < 1.06 && q.z < 0.015;
    bool hand = length(q - vec3(0., 1.19, -0.18)) < 0.065;
    if (face || hand) {
      alb = vec3(0.74, 0.54, 0.42);
      if (face) {
        vec2 ey = vec2(abs(q.x) - 0.032, q.y - 1.685);
        alb = mix(alb, vec3(0.08, 0.05, 0.04), smoothstep(0.016, 0.009, length(ey * vec2(1., 1.6))));
        alb = mix(alb, vec3(0.22, 0.12, 0.08), smoothstep(0.012, 0.004, abs(q.y - 1.708)) * step(abs(q.x), 0.055) * step(0.012, abs(q.x)));
        alb = mix(alb, vec3(0.55, 0.22, 0.2), smoothstep(0.012, 0.005, length(vec2(q.x * 0.6, q.y - 1.617))));
        alb = mix(alb, vec3(0.78, 0.48, 0.42), smoothstep(0.05, 0.02, length(vec2(abs(q.x) - 0.05, q.y - 1.65))) * 0.4);
      }
      spec = 0.35; rough = 0.3;
    } else { spec = 0.15; rough = 0.5; }
  } else if (m == 13.) {
    vec4 D = det(P.xy + P.zx, 3., pw);
    alb = vec3(0.88, 0.86, 0.8) * (0.92 + 0.1 * D.r);
    // the altar's cloth: lace along its edge, the frontal's gold bands and its middle panel
    if (P.z < 51.6 && P.z > 51.) {
      float ax2 = abs(P.x);
      float band = step(abs(P.y - PL - 0.86), 0.05) + step(abs(ax2 - 1.58), 0.04) + step(abs(ax2 - 0.55), 0.03) * step(P.y, PL + 0.82);
      alb = mix(alb, vec3(0.72, 0.5, 0.2), clamp(band, 0., 1.));
      float lace = step(abs(P.y - PL - 0.74), 0.06) * (0.6 + 0.4 * step(0.5, fract(P.x * 14.)));
      alb *= 1. - lace * 0.12;
      vec4 Dk = det(P.xy * 3., 1., pw);
      alb *= 0.93 + 0.08 * smoothstep(0.4, 0.6, Dk.g);
      if (ax2 < 0.5 && P.y < PL + 0.8) {
        alb = vec3(0.5, 0.08, 0.07) * (0.85 + 0.2 * Dk.r);
        float yc = P.y - PL - 0.42;
        float cr = min(max(ax2 - 0.035, abs(yc) - 0.26), max(ax2 - 0.17, abs(yc - 0.08) - 0.035));
        alb = mix(alb, vec3(0.85, 0.6, 0.25), smoothstep(0.006, 0., cr));
      }
      spec = 0.2;
    }
  } else if (m == 14.) {
    alb = vec3(0.85, 0.6, 0.28); metal = 1.; spec = 1.; rough = 0.25;
  } else if (m == 17.) {
    alb = vec3(0.05, 0.045, 0.04); spec = 0.3; rough = 0.4;
  } else if (m == 15.) {
    // the plaza: big worn flags
    vec2 g = P.xz / vec2(0.9, 0.62);
    vec2 id = floor(g + vec2(0., 0.)), f = abs(fract(g) - 0.5);
    float j = min((0.5 - f.x) * 0.9, (0.5 - f.y) * 0.62);
    vec4 D = det(P.xz, 0.3, pw);
    alb = vec3(0.6, 0.5, 0.38) * (0.75 + 0.3 * h21(id)) * (0.78 + 0.34 * D.r);
    alb = mix(alb, vec3(0.32, 0.26, 0.2), (1. - smoothstep(0.01 + pw, 0.04 + pw, j)) * 0.7);
  }
  n = normalize(n + nb * (1. - metal * 0.2) * 0.35);
  float ao = aoAt(P, n);
  vec3 V = -rd;
  vec3 col = vec3(0.);
  if (inside && !(P.z < 0. && m == 15.)) {
    // ---- the sun, through the clerestory
    float sv = beam(P + n * 0.02);
    if (sv > 0.001) sv *= pewShadow(P + n * 0.02);
    float ndl = max(dot(n, uSun), 0.);
    // ---- the light the beams bounce round the nave: warm from below, dim from the vault
    vec3 amb = mix(vec3(0.40, 0.27, 0.17), vec3(0.22, 0.19, 0.17), n.y * 0.5 + 0.5) * 0.165;
    // brighter near the windows' height and where the beams land
    amb *= 0.7 + 0.5 * smoothstep(2., 10., P.y) * (P.x < 0. ? 1.2 : 0.9);
    // the light from the open doors behind, and the warm glow of the sanctuary ahead
    amb += vec3(0.9, 0.75, 0.6) * 0.18 * uDoor * smoothstep(9., 0., P.z) * max(0.25, -n.z * 0.5 + 0.5);
    amb += vec3(1.0, 0.66, 0.36) * 0.24 * smoothstep(40., 54., P.z) * max(0.35, -n.z * 0.6 + 0.4) * (metal > 0. ? 0.3 : 1.);
    // light bounced off the sunlit floor patches: warm on what's low and near them
    float bo = beam(vec3(P.x, 0.03, P.z)) * 0.6 + beam(vec3(P.x + n.x * 1.4, 0.03, P.z + n.z * 1.4)) * 0.4;
    amb += SUNC * 0.5 * bo * exp(-P.y * 0.35) * (0.6 + 0.4 * max(-n.y, n.y * 0.3));
    col += alb * (SUNC * 6.0 * ndl * sv + amb * ao) * (1. - metal * 0.82);
    // translucent things glow where the sun is behind them
    col += alb * trans * SUNC * 1.6 * sv * max(dot(-n, uSun), 0.) * 0.5;
    // ---- candles: the nearest clusters on both sides
    vec3 cl = vec3(0.);
    float k = floor((P.z - PZ0 - 0.06) / (PDZ * 3.) + 0.5);
    for (int i = -1; i <= 1; i++) {
      float kk = k + float(i);
      if (kk < 0. || kk > 11.) continue;
      for (int s = -1; s <= 1; s += 2) {
        vec3 L = vec3(float(s) * 1.03, 0.5, clusterZ(kk)) - P;
        float d2 = dot(L, L);
        float w = (max(dot(n, L * inversesqrt(d2)), 0.) * 0.8 + 0.2 * trans) / (d2 + 0.06);
        cl += FLAME * w * 0.07;
      }
    }
    // the chandeliers' candles
    {
      for (int i = 0; i < 4; i++) {
        vec3 L = vec3(i < 2 ? CHX : -CHX, CHY + 0.8, CHZ + 12. * float(i - (i / 2) * 2)) - P;
        float d2 = dot(L, L);
        cl += FLAME * (max(dot(n, L * inversesqrt(d2)), 0.) * 0.85 + 0.15) / (d2 + 0.4) * 0.45;
      }
    }
    // the sanctuary's candles and the light on the retablo
    if (P.z > 42.) {
      for (int i = 0; i < 8; i++) {
        float fi = float(i);
        vec3 lp = i < 6 ? vec3((fi < 2. ? 0.6 : fi < 4. ? 1.25 : 1.9) * (mod(fi, 2.) < 0.5 ? 1. : -1.), 2.95, 56.75) : vec3(i == 6 ? 2.2 : -2.2, 2.06, 52.);
        vec3 L = lp - P; float d2 = dot(L, L);
        vec3 l = L * inversesqrt(d2);
        float w = max(dot(n, l), 0.) / (d2 + 0.1);
        cl += FLAME * w * 0.09;
        if (metal > 0.) cl += FLAME * (2.0 * pow(max(dot(reflect(-l, n), V), 0.), 40.) + 9. * pow(max(dot(reflect(-l, n), V), 0.), 300.)) / (1. + d2 * 0.05);
      }
      // the retablo's own light: a warm wash from the sanctuary's hidden windows
      vec3 L = normalize(vec3(0.3, 0.55, -1.));
      cl += vec3(1.0, 0.72, 0.42) * 0.22 * max(dot(n, L), 0.) * smoothstep(50., 56., P.z);
    }
    col += alb * cl * ao * (1. - metal * 0.7);
    // polish: the floor and the varnish catch the beams and the candles
    if (spec > 0.) {
      vec3 R = reflect(rd, n);
      float s1 = pow(max(dot(R, uSun), 0.), mix(200., 12., rough)) * sv;
      vec3 env;
      if (metal > 0.) {
        // what gold sees: the warm nave in front, the dark vault above
        float fwdness = smoothstep(-0.1, 0.95, -R.z);
        env = mix(vec3(0.02, 0.012, 0.006), vec3(0.3, 0.19, 0.09), fwdness * fwdness * fwdness) * mix(1., 0.3, smoothstep(0.1, 0.8, R.y));
        // the bright clerestory windows up to the left and right, caught by the carving's edges
        env += vec3(1.4, 1.0, 0.6) * 1.8 * pow(max(dot(R, normalize(vec3(-0.75, 0.5, -0.45))), 0.), 28.);
        env += vec3(1.1, 0.8, 0.5) * 1.0 * pow(max(dot(R, normalize(vec3(0.75, 0.5, -0.45))), 0.), 28.);
        env += vec3(1.0, 0.62, 0.3) * 0.35 * pow(max(-R.z, 0.), 6.);
        col += alb * (env * ao + SUNC * s1 * 8.);
      } else {
        float fr = 0.04 + 0.96 * pow(1. - max(dot(n, V), 0.), 5.);
        col += SUNC * s1 * spec * 4. + vec3(0.35, 0.25, 0.16) * fr * spec * 0.25 * ao;
      }
    }
    // the polished floor: what it shows, worked out along the reflected ray. The windows (bright
    // where the sun is), the gilded retablo at the end, the flames; blurred with distance
    if (polish > 0.) {
      vec3 R = reflect(rd, n);
      float fr = 0.03 + 0.97 * pow(1. - max(dot(n, V), 0.), 5.);
      vec3 rc = vec3(0.);
      float sx = sign(R.x), tw = (sx * NW - P.x) / R.x;
      if (tw > 0.) {
        vec3 Q = P + R * tw;
        float k2 = clamp(floor((Q.z - 7.) / 6. + 0.5), 0., 6.);
        float bl = 0.06 + tw * 0.07 * rough;
        float wm = smoothstep(bl, -bl, winD(vec2(Q.z - 7. - 6. * k2, Q.y)));
        rc += vec3(1.3, 1.0, 0.75) * wm * (sx < 0. ? 3. : 1.3);
      }
      float tr = (56.9 - P.z) / R.z;
      if (tr > 0.) {
        vec3 Q = P + R * tr;
        float gm = smoothstep(0.4, -0.4, max(abs(Q.x) - 4.6, max(Q.y - 13., PL - Q.y)));
        rc += vec3(1.0, 0.62, 0.26) * 0.55 * gm;
      }
      for (int i = -1; i <= 1; i++) {
        float kk = k + float(i);
        if (kk < 0. || kk > 11.) continue;
        for (int s = -1; s <= 1; s += 2) {
          vec3 L = normalize(vec3(float(s) * 1.03, 0.42, clusterZ(kk)) - P);
          rc += FLAME * 1.6 * pow(max(dot(R, L), 0.), 900.);
        }
      }
      col += rc * fr * polish * 0.9 * (0.4 + 0.6 * ao);
    }
    if (sheen > 0.) col += vec3(0.5, 0.42, 0.32) * 0.16 * pow(1. - max(dot(n, V), 0.), 3.) * sheen * ao;
    // the windows' own glow on the wall round them (seen from inside)
    if (m == 1. && abs(P.x) > NW - 0.05 && P.y > 8. && P.y < 11.6) {
      float k2 = clamp(floor((P.z - 7.) / 6. + 0.5), 0., 6.);
      float wd = winD(vec2(P.z - 7. - 6. * k2, P.y));
      col += vec3(1.0, 0.8, 0.55) * 0.35 * exp(-max(wd, 0.) * 2.2) * (P.x < 0. ? 1.3 : 0.6);
    }
  } else {
    // ---- outside: the façade in the low sun from the left, the buttresses' shadows across it
    float sv = 0.;
    float ndl = dot(n, SUNO);
    if (ndl > 0.) {
      sv = 1.;
      float tt = 0.06;
      for (int i = 0; i < 28; i++) {
        float d = mapD(P + n * 0.03 + SUNO * tt);
        sv = min(sv, smoothstep(0., 0.04 * tt + 0.02, d));
        tt += clamp(d, 0.05, 1.5);
        if (sv < 0.01 || tt > 22.) break;
      }
    }
    vec3 skyAmb = mix(vec3(0.32, 0.27, 0.24), vec3(0.42, 0.5, 0.66), n.y * 0.5 + 0.5) * 0.62;
    col += alb * (SUNC * 3.4 * max(ndl, 0.) * sv + skyAmb * ao + vec3(0.42, 0.3, 0.2) * 0.22 * max(-n.y, 0.) + vec3(0.3, 0.2, 0.12) * 0.12 * ao);
    // the doors, deep in their reveal: lit by the sun bounced off the steps and the plaza
    if (m == 12.) col += alb * vec3(1.0, 0.7, 0.42) * 0.9 * ao * smoothstep(5.5, 0., P.y);
    // the light pouring out of the doorway onto the plaza and the threshold
    vec2 dq = vec2(P.x, P.z - FZ);
    float spill = uDoor * smoothstep(2.2, 0.6, abs(P.x) - max(0., -dq.y) * 0.25) * exp(-max(0., -dq.y) * 0.22);
    col += alb * vec3(1.0, 0.75, 0.48) * 1.5 * spill * max(n.y, 0.2);
    // the crack of light between the closed leaves
    if (m == 12.) emis = (1. - smoothstep(0.0, 0.08, uDoor)) * smoothstep(0.014, 0.002, abs(P.x)) * smoothstep(5.9, 4.6, P.y) * 0.8;
  }
  col += alb * emisW * vec3(1., 0.9, 0.78) * ao;
  return col;
}

void main(){
  vec3 ro = uEye, rd = rayDir();
  float t = 0.05, m = 0.;
  float tmax = 90.;
  bool hit = false;
  bool gone = false;
  vec2 h = vec2(1.);
  for (int i = 0; i < 128; i++) {
    vec3 p = ro + rd * t;
    h = map(p);
    if (h.x < max(0.0012, t * uPix * 0.45)) { hit = true; m = h.y; break; }
    t += h.x * 0.92;
    // out of the building and past it: the sky
    if (t > tmax || p.y > 20. || abs(p.x) > 14. || p.z < -40.) { gone = true; break; }
  }
  // a grazing ray that ran out of steps is at a surface, not in the sky
  if (!hit && !gone) { hit = true; m = h.y; }
  vec3 col;
  float emis = 0.;
  vec3 P = ro + rd * t;
  if (hit) col = shade(P, rd, t, m, emis);
  else { col = sky(rd) * (uOut > 0.5 ? 1. : 2.2); t = 90.; }
  // ---- the air: the shafts of sun, worked out exactly. A point is in a shaft when its line to
  // the sun passes a window (inner and outer face); along the ray that line's foot on each face
  // moves in a straight line, so the length of the ray in each window's shaft is an interval.
  float scat = 0.;
  {
    // the part of the ray inside the nave and its aisles, below the windows' tops
    vec3 inv = 1. / rd;
    vec3 b0 = (vec3(-NW, 0., 0.5) - ro) * inv, b1 = (vec3(AW, 11.2, 46.5) - ro) * inv;
    vec3 tn = min(b0, b1), tf = max(b0, b1);
    float ta = max(max(max(tn.x, tn.y), tn.z), 0.), tb = min(min(min(tf.x, tf.y), tf.z), t);
    if (tb > ta) {
      for (int f = 0; f < 2; f++) {
        float xf = -NW - WT * float(f);
        // the foot on the face x = xf: A + B t (in z, y)
        float sA = (xf - ro.x) / uSun.x, sB = -rd.x / uSun.x;
        vec2 A = vec2(ro.z + uSun.z * sA, ro.y + uSun.y * sA), B = vec2(rd.z + uSun.z * sB, rd.y + uSun.y * sB);
        // the windows' heights (a round head counted as square): y in [8.7, 10.85]
        vec2 iy = (vec2(8.7, 10.85) - A.y) / B.y;
        float ya = min(iy.x, iy.y), yb = max(iy.x, iy.y);
        ta = max(ta, ya); tb = min(tb, yb);
      }
      if (tb > ta) {
        // within the heights, each bay's window in z (inner and outer faces together)
        float sA0 = (-NW - ro.x) / uSun.x, sB0 = -rd.x / uSun.x;
        float sA1 = (-NW - WT - ro.x) / uSun.x;
        float az0 = ro.z + uSun.z * sA0, az1 = ro.z + uSun.z * sA1, bz = rd.z + uSun.z * sB0;
        for (int k = 0; k < 7; k++) {
          float zc = 7. + 6. * float(k);
          vec2 i0 = (vec2(zc - 0.7, zc + 0.7) - az0) / bz, i1 = (vec2(zc - 0.7, zc + 0.7) - az1) / bz;
          float a = max(max(min(i0.x, i0.y), min(i1.x, i1.y)), ta), b = min(min(max(i0.x, i0.y), max(i1.x, i1.y)), tb);
          if (b > a) scat += (b - a) * (0.75 + 0.25 * exp(-0.05 * a));
        }
      }
    }
  }
  float mu = dot(rd, uSun);
  float g = 0.55, phase = (1. - g * g) / pow(1. + g * g - 2. * g * mu, 1.5) * 0.08;
  col += SUNC * scat * (0.03 + phase * 0.2) * 1.15;
  float inside = step(-0.05, ro.z);
  vec3 haze = mix(vec3(0.5, 0.42, 0.34), vec3(0.62, 0.66, 0.72), 1. - inside) * 0.4;
  if (hit) {
    float zk = smoothstep(14., 56., P.z) * inside;
    col = mix(col, haze * 0.8, (1. - exp(-t * (0.005 + 0.004 * (1. - inside)))) * (0.35 + 0.25 * zk));
    col += vec3(1.0, 0.68, 0.36) * 0.05 * zk * (1. - exp(-t * 0.03));
  }
  col += vec3(1.0, 0.82, 0.58) * emis * 3.;
  col *= uExp;
  vec3 c = grade(col);
  vec2 uv = gl_FragCoord.xy / (uRes * uFrac);
  vec2 vq = uv - 0.5;
  c *= 1. - dot(vq, vq) * 0.08;
  oCol = vec4(c, 1.);
  float dn = clamp(t / 100., 0., 1.) * 255.;
  // depth (16 bits), what it is, and a signature of which way it faces: the lines are drawn where these change
  oAux = vec4(floor(dn) / 255., fract(dn), (hit ? m : 0.) / 32., 0.5 + 0.5 * dot(gN, vec3(0.55, 0.7, 0.45)));
}
`;

// the detail texture: one 512² tile that repeats seamlessly.
//  r: soft noise (fbm); g: cells (packed domes: pits, petals, lumps); b: which cell; a: fine grain
const BAKE_FS = `#version 300 es
precision highp float;
out vec4 o;
float hp(vec2 c, float per, float seed){ c = mod(c, per) + seed; return fract(sin(dot(c, vec2(127.1, 311.7))) * 43758.5453); }
float vnp(vec2 p, float per){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
  return mix(mix(hp(i, per, 0.), hp(i + vec2(1, 0), per, 0.), f.x), mix(hp(i + vec2(0, 1), per, 0.), hp(i + vec2(1, 1), per, 0.), f.x), f.y); }
vec2 domes(vec2 uv, float per, float seed){
  vec2 p = uv * per, i = floor(p), f = fract(p);
  float best = 0., id = 0.;
  for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec2 g = vec2(float(x), float(y)), c = i + g;
    vec2 j = vec2(hp(c, per, seed), hp(c, per, seed + 5.3)) * 0.7 + 0.15;
    vec2 dv = f - g - j;
    float r = 0.5 + 0.32 * hp(c, per, seed + 3.1);
    float q = r * r - dot(dv, dv);
    if (q > 0.) { float h = sqrt(q) / r * (0.72 + 0.28 * hp(c, per, seed + 7.3)); if (h > best) { best = h; id = hp(c, per, seed + 11.7); } }
  }
  return vec2(best, id);
}
void main(){
  vec2 uv = gl_FragCoord.xy / 512.;
  float n = 0., a = 0.5, per = 8.;
  for (int i = 0; i < 5; i++) { n += a * vnp(uv * per, per); per *= 2.; a *= 0.5; }
  vec2 big = domes(uv, 16., 0.), small = domes(uv, 32., 19.);
  float sh = small.x * 0.62 + 0.18;
  vec2 cl = sh > big.x ? vec2(sh, small.y) : big;
  float fine = vnp(uv * 64., 64.) * 0.5 + vnp(uv * 128., 128.) * 0.5;
  o = vec4(n / 0.97, cl.x, cl.y, fine);
}
`;

// the glow: what's brightest in the still church (the windows, the shafts' cores, the gold),
// gathered at a quarter of the size and spread
const BLOOM_FS = `#version 300 es
precision highp float;
uniform sampler2D uScene; uniform vec2 uRes; uniform float uFrac;
out vec4 o;
void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  vec3 acc = vec3(0.); float wsum = 0.;
  for (int y = -3; y <= 3; y++) for (int x = -3; x <= 3; x++) {
    vec2 d = vec2(float(x), float(y));
    float w = exp(-dot(d, d) / 7.);
    vec3 c = texture(uScene, (uv + d * 1.6 / uRes) * uFrac).rgb;
    acc += c * w; wsum += w;
  }
  o = vec4(acc / wsum, 1.);
}
`;

// the light pass: the still church, with its flames, the dust in the shafts, the flicker of the
// candles on what's near them; a lens's soft focus, glow and grain; a hand-held camera's sway
const COMP_FS = `#version 300 es
precision highp float;
precision highp sampler2D;
${COMMON}
uniform sampler2D uScene, uAux, uBloom; uniform float uT, uLive, uExp, uFocus; uniform vec3 uSway;
out vec4 o;
float depthAt(vec2 uv){ vec4 a = texture(uAux, uv); return (a.r * 255. + a.g) / 255. * 100.; }
float flick(float seed){ return 0.95; } // the flames burn still: no flicker (Francis)
// a flame at c: a small teardrop, its glow round it
vec3 flame(vec3 ro, vec3 rd, vec3 c, float seed, float D, float sz){
  float tq = dot(c - ro, rd);
  if (tq < 0.2 || tq > D + 0.25) return vec3(0.);
  vec3 q = ro + rd * tq - c;
  float fl = flick(seed);
  float sw = 0.;
  float h = 0.032 * fl * sz, w = 0.011 * sz;
  vec3 side = normalize(cross(vec3(0., 1., 0.), rd));
  float x = dot(q, side) - sw * clamp((q.y + h) / (2. * h), 0., 1.), y = q.y;
  float shape = length(vec2(x / (w * (1. - 0.6 * clamp(y / h, 0., 1.))), (y - h * 0.15) / h));
  float core = smoothstep(1.05, 0.45, shape);
  float px = tq * uPix;
  float glow = exp(-length(vec2(x, y - h * 0.3)) / (0.05 * sz + px)) * 0.24 + exp(-length(vec2(x, y)) / (0.2 * sz + px * 3.)) * 0.07;
  // a flame smaller than a pixel still shows as a point of light
  core = max(core, exp(-dot(vec2(x, y - h * 0.2), vec2(x, y - h * 0.2)) / (px * px * 1.6 + 1e-6)) * 0.6);
  vec3 col = mix(FLAME * 1.4, vec3(1.0, 0.93, 0.78) * 2.2, smoothstep(0.75, 0.2, shape)) * core;
  return (col + FLAME * glow) * fl;
}
// ---- the painting: the render read as a watercolour on cold-press paper
const vec3 PAPER = vec3(0.966, 0.938, 0.878);
float lumi(vec3 c){ return dot(c, vec3(0.3, 0.55, 0.15)); }
// the paper's tooth, fixed to the page (it never moves with the church): two scales of it
float tooth(vec2 pp){ return textureLod(uDetail, pp * 2.3, 0.).r * 0.55 + textureLod(uDetail, pp * 7.1 + 0.31, 0.).a * 0.45; }
vec3 painted(vec3 c, vec3 wash, vec2 pp, float gEdge, float m, float sy){
  // stone, plaster and the plaza are painted from the palette (the light warm, the shade cool);
  // wood, gold, cloth, the saints and the flowers keep their own colours
  bool neutral = abs(m - 1.) < 0.5 || abs(m - 2.) < 0.5 || abs(m - 18.) < 0.5 || abs(m - 15.) < 0.5 || m < 0.5;
  // broad washes: the picture flattened toward its own soft blur, its values gathered into a few
  bool gilt = abs(m - 5.) < 0.5 || abs(m - 14.) < 0.5 || abs(m - 10.) < 0.5 || abs(m - 11.) < 0.5;
  vec3 w = mix(c, wash, neutral ? 0.62 : gilt ? 0.12 : 0.38);
  float L = lumi(w);
  float Lr = pow(clamp(L * 1.22, 0., 1.), 0.74);
  float nb = 4.;
  float Lq = (floor(Lr * nb) + smoothstep(0.2, 0.8, fract(Lr * nb))) / nb;
  Lq = mix(Lq, Lr, 0.4);
  float mx = max(w.r, max(w.g, w.b)), mn = min(w.r, min(w.g, w.b));
  float sat = (mx - mn) / max(mx, 0.02);
  // how much pigment: none where the light is (the paper itself), more into the shade; a coloured
  // thing always keeps a wash of its colour (gold stays gold where it shines)
  float d = clamp((0.9 - Lq) / 0.86, 0., 1.);
  d = d * d * (3. - 2. * d) * 0.9;
  if (!neutral) d = max(d, smoothstep(0.25, 0.75, sat) * 0.42);
  // the gilding: always a deep gold wash, its brightest touches left as paper
  // gold: a strong wash, its glints left as bare paper, deeper in the hollows
  if (gilt) d = clamp(0.58 + 0.3 * (1. - Lr) - 0.55 * smoothstep(0.55, 0.95, lumi(c)), 0., 1.);
  // stone in the light still takes a pale, uneven ochre wash; only the brightest sun is bare paper
  if (neutral && m > 0.5) d = max(d, (0.13 + 0.1 * textureLod(uDetail, pp * 0.45 + 0.7, 0.).r) * (1. - smoothstep(0.93, 1.0, Lr) * 0.6));
  float shade = smoothstep(0.66, 0.2, Lq);
  vec3 ochre = vec3(0.9, 0.72, 0.46), sienna = vec3(0.82, 0.55, 0.38), violet = vec3(0.56, 0.53, 0.68), ultra = vec3(0.4, 0.47, 0.74);
  vec3 pig;
  if (neutral) {
    pig = mix(ochre, sienna, smoothstep(0.25, 0.55, shade) * 0.45);
    // the shade: violet-grey, ultramarine higher up toward the vault
    vec3 cool = mix(violet, ultra, clamp(smoothstep(0.5, 0.9, sy) * 0.8 + (textureLod(uDetail, pp * 0.3, 0.).r - 0.5) * 0.25, 0., 1.));
    pig = mix(pig, cool, smoothstep(0.15, 0.75, shade) * 0.85);
  } else {
    vec3 hue = clamp((w - mn) / max(mx - mn, 0.02), 0., 1.);
    pig = mix(vec3(0.74, 0.62, 0.5), hue * vec3(0.95, 0.82, 0.7) + vec3(0.05, 0.05, 0.04), smoothstep(0.1, 0.5, sat) * 0.85);
    pig = mix(pig, violet * 0.9, shade * 0.3);
    // gold: raw sienna to a deep burnt gold in its hollows
    if (abs(m - 5.) < 0.5 || abs(m - 14.) < 0.5) pig = mix(vec3(0.98, 0.72, 0.2), vec3(0.8, 0.42, 0.12), smoothstep(0.55, 0.9, d));
  }
  // the darkest darks: a deep indigo-sepia, only where it is really dark
  if (!gilt) pig = mix(pig, vec3(0.26, 0.22, 0.3), smoothstep(0.84, 0.98, d) * 0.55);
  // a wash pools pigment at its edge as it dries
  d = min(1., d * (1. + gEdge));
  // pigment settles into the paper's grain in the mid and dark washes (ultramarine the most)
  float t = tooth(pp);
  d *= 1. + (0.5 - t) * 0.3 * smoothstep(0.1, 0.5, d) * (1. + shade * (neutral ? 0.7 : 0.3));
  d = clamp(d, 0., 1.);
  vec3 col = PAPER * mix(vec3(1.), pig, d) * (1. - (gilt ? 0.12 : 0.3) * d * d);
  // the paper shows through everywhere: its tooth catches the light from the top left
  float tx = tooth(pp + vec2(0.0016, 0.)), ty = tooth(pp + vec2(0., 0.0016));
  col *= 1. + ((t - tx) + (ty - t)) * 0.45 - (0.5 - t) * 0.03;
  return col;
}
void main(){
  vec2 uv0 = gl_FragCoord.xy / uRes;
  // the hand-held camera: a slow drift and the least turn, framed a hair tighter so no edge shows
  vec2 uv = (uv0 - 0.5) / uSway.z + 0.5 + uSway.xy;
  float aspect = uRes.x / max(uRes.y, 1.);
  // the paper, fixed to the screen (its size in the page's own pixels, not the canvas's)
  vec2 pp = vec2(uv0.x * aspect, uv0.y) * (uRes.y / 900.) * 1.6;
  float drift = uLive > 0.5 ? uT * 0.0025 : 0.;
  // a wet edge wanders: the picture is read through a slow, low warp, so edges wobble and bleed
  vec2 wob = (vec2(textureLod(uDetail, pp * 0.55 + drift, 0.).r, textureLod(uDetail, pp * 0.55 + 0.47 - drift, 0.).r) - 0.5) * vec2(1. / aspect, 1.) * 0.011;
  vec2 su = clamp(uv + wob, 0.001, 0.999) * uFrac;
  float D = depthAt(su);
  vec3 c = texture(uScene, su).rgb;
  // a little colour separates into the bloom where washes meet
  c.r = mix(c.r, texture(uScene, clamp(uv + wob * 1.7, 0.001, 0.999) * uFrac).r, 0.5);
  c.b = mix(c.b, texture(uScene, clamp(uv + wob * 0.4, 0.001, 0.999) * uFrac).b, 0.5);
  vec2 bu = clamp(uv + wob * 1.4, 0.002, 0.998);
  vec3 wash = texture(uBloom, bu).rgb;
  // the wash's own edges, where it pools as it dries
  vec2 px = 3. / uRes;
  float l0 = lumi(wash);
  float gx = lumi(texture(uBloom, bu + vec2(px.x, 0.)).rgb) - lumi(texture(uBloom, bu - vec2(px.x, 0.)).rgb);
  float gy = lumi(texture(uBloom, bu + vec2(0., px.y)).rgb) - lumi(texture(uBloom, bu - vec2(0., px.y)).rgb);
  float gEdge = smoothstep(0.03, 0.16, length(vec2(gx, gy))) * 0.55 * smoothstep(0.85, 0.3, l0);
  float m0 = texture(uAux, su).b * 32.;
  vec3 col = painted(c, wash, pp, gEdge, floor(m0 + 0.5), uv0.y);
  // ---- the drawing: loose, broken sepia lines where the architecture's edges are (the depth
  // jumps, a material ends, the surface turns); firmer near, fading with distance
  {
    float r = mix(1.7, 0.85, smoothstep(2., 24., D));
    vec2 o1 = vec2(r / uRes.x, 0.) * uFrac, o2 = vec2(0., r / uRes.y) * uFrac;
    vec4 a0 = texture(uAux, su), aR = texture(uAux, su + o1), aL = texture(uAux, su - o1), aU = texture(uAux, su + o2), aD = texture(uAux, su - o2);
    float dR = (aR.r * 255. + aR.g) / 2.55, dL = (aL.r * 255. + aL.g) / 2.55, dU = (aU.r * 255. + aU.g) / 2.55, dD = (aD.r * 255. + aD.g) / 2.55;
    float rel = max(max(abs(dR - D), abs(dL - D)), max(abs(dU - D), abs(dD - D))) / max(D, 0.5);
    float mat = step(0.01, max(max(abs(aR.b - a0.b), abs(aL.b - a0.b)), max(abs(aU.b - a0.b), abs(aD.b - a0.b))));
    float nor = max(max(abs(aR.a - a0.a), abs(aL.a - a0.a)), max(abs(aU.a - a0.a), abs(aD.a - a0.a)));
    float line = max(smoothstep(0.05, 0.16, rel), max(mat * 0.75, smoothstep(0.08, 0.22, nor) * 0.7));
    // broken, as a quick pen leaves it; not on everything
    float brk = textureLod(uDetail, pp * 3.2 + vec2(D * 0.01), 0.).r;
    line *= smoothstep(0.36, 0.52, brk) * mix(smoothstep(46., 5., D), 0.55, smoothstep(50., 56., D)) * (a0.b * 32. > 0.5 ? 1. : 0.);
    // nothing much drawn round the flowers' dabs and the leaves
    line *= (abs(m0 - 6.) < 0.5 || abs(m0 - 20.) < 0.5 || abs(m0 - 9.) < 0.5) ? 0.25 : 1.;
    col = mix(col, vec3(0.3, 0.2, 0.13), line * 0.5);
  }
  // glow: the brightest washes go to paper
  float mg = floor(m0 + 0.5);
  col = mix(col, PAPER, smoothstep(0.72, 1.02, l0) * ((abs(mg - 5.) < 0.5 || abs(mg - 14.) < 0.5) ? 0.12 : 0.5));
  vec3 ro = uEye;
  vec2 ndc = uv * 2. - 1. - uShift;
  vec3 rd = normalize(uFwd + uRight * ndc.x * uTan.x + uUp * ndc.y * uTan.y);
  vec3 P = ro + rd * D;
  vec3 add = vec3(0.);
  // ---- the candles at the aisle ends: where the ray crosses each row of them
  float pool = 0.;
  for (int s = -1; s <= 1; s += 2) {
    float xs = float(s) * 1.03;
    float kp = floor((P.z - PZ0 - 0.06) / (PDZ * 3.) + 0.5);
    // their flicker on what's near them
    for (int i = -1; i <= 1; i++) {
      float kk = kp + float(i);
      if (kk < 0. || kk > 11.) continue;
      vec3 L = vec3(xs, 0.4, clusterZ(kk)) - P;
      pool += (flick(kk * 2. + float(s)) - 0.92) / (dot(L, L) + 0.08);
    }
    if (abs(rd.x) < 1e-4) continue;
    float tq = (xs - ro.x) / rd.x;
    if (tq < 0.) continue;
    vec3 X = ro + rd * tq;
    float k = floor((X.z - PZ0 - 0.06) / (PDZ * 3.) + 0.5);
    for (int i = -1; i <= 1; i++) {
      float kk = k + float(i);
      if (kk < 0. || kk > 11.) continue;
      float z = clusterZ(kk);
      float sd = kk * 2. + float(s);
      add += flame(ro, rd, vec3(xs - float(s) * 0.03, 0.455, z), sd, D, 1.);
      add += flame(ro, rd, vec3(xs + float(s) * 0.03, 0.305, z + 0.15), sd + 0.3, D, 1.);
      add += flame(ro, rd, vec3(xs + float(s) * 0.05, 0.235, z - 0.13), sd + 0.6, D, 1.);
    }
  }
  if (P.z > 4. && P.z < 41. && P.y < 2.5) col *= 1. + clamp(pool * 0.35, -0.08, 0.08);
  // ---- the chandeliers' flames: only near where the ray passes each one
  for (int kc = 0; kc < 4; kc++) {
    vec3 cc = vec3(kc < 2 ? CHX : -CHX, CHY + 0.8, CHZ + 12. * float(kc - (kc / 2) * 2));
    float tq = dot(cc - ro, rd);
    if (tq < 0.3 || length(ro + rd * tq - cc) > 1.2) continue;
    for (int i = 0; i < 8; i++) {
      float a = float(i) * 0.7854;
      add += flame(ro, rd, cc + vec3(cos(a) * 0.66, -0.035, sin(a) * 0.66), 60. + float(kc) * 8. + float(i), D, 0.85);
    }
  }
  // the sanctuary's candles
  if (uEye.z > 20. || rd.z > 0.) {
    for (int i = 0; i < 8; i++) {
      float fi = float(i);
      vec3 lp = i < 6 ? vec3((fi < 2. ? 0.6 : fi < 4. ? 1.25 : 1.9) * (mod(fi, 2.) < 0.5 ? 1. : -1.), 2.895, 56.75) : vec3(i == 6 ? 2.2 : -2.2, 2.015, 52.);
      add += flame(ro, rd, lp, 40. + fi, D, 1.);
    }
  }
  // ---- dust turning in the shafts: a mote in each cell, drifting in it, lit only in a beam
  if (uEye.z > -0.5) {
    float cs = 0.3;
    for (int i = 0; i < 16; i++) {
      float d = 1.0 + float(i) * 0.4;
      if (d > D) break;
      vec3 X = ro + rd * d;
      if (beam(X) < 0.02) continue;
      vec3 cell = floor(X / cs);
      float hh = h21(cell.xy + cell.z * 7.31);
      if (hh < 0.45) continue;
      vec3 j = vec3(h21(cell.yz + 1.3), h21(cell.zx + 2.7), h21(cell.xy + 4.1));
      float tt = uLive > 0.5 ? uT : 3.;
      vec3 mp = (cell + 0.5 + (j - 0.5) * 0.6) * cs + 0.06 * vec3(sin(tt * 0.31 + hh * 20.), sin(tt * 0.23 + j.x * 20.), cos(tt * 0.27 + j.y * 20.));
      float tm = dot(mp - ro, rd);
      float r = length(ro + rd * tm - mp);
      float px = tm * uPix;
      float sp = exp(-r * r / (px * px * 1.4 + 1.2e-6)) * beam(mp);
      float tw = uLive > 0.5 ? 0.6 + 0.4 * sin(uT * (1.3 + hh) + j.z * 30.) : 0.8;
      add += SUNC * sp * tw * 0.55 * min(1., 0.0016 / (px + 0.0004));
    }
  }
  add *= uExp;
  // the flames and the dust as soft glows of light on the paper
  col = col + add * vec3(1.0, 0.82, 0.55) * 0.8 * (1. - col * 0.35);
  // the painting stops short of the page's edge: a ragged, brushed border of bare paper
  float ex = min(uv0.x, 1. - uv0.x) * aspect, ey = min(uv0.y, 1. - uv0.y);
  float e = min(ex, ey) + (textureLod(uDetail, pp * 0.9 + 0.13, 0.).r - 0.5) * 0.06 + (textureLod(uDetail, pp * 4.2, 0.).g - 0.5) * 0.018;
  float edge = smoothstep(0.0, 0.075, e);
  // a softer, wider fade into the corners
  edge *= smoothstep(0.0, 0.2, ex + ey + (textureLod(uDetail, pp * 1.3, 0.).r - 0.5) * 0.08);
  col = mix(PAPER * (0.985 + 0.03 * tooth(pp)), col, edge);
  o = vec4(col, 1.);
}
`;

// ---------------------------------------------------------------- the renderer
export type Church = {
  /** Match the canvas to its box (scale ≤ 1.25 device pixels a CSS pixel). */
  size: (scale: number) => void;
  /** Draw a frame. `still` false redraws the church itself (the camera or the doors moved);
   *  `frac` < 1 draws it at that fraction of the size (while moving). */
  draw: (cam: Cam, o: { time: number; door: number; exposure: number; outside: boolean; still: boolean; frac: number; live: boolean; focus: number; sway: [number, number, number] }) => void;
  dispose: () => void;
};

export function createChurch(cv: HTMLCanvasElement): Church | null {
  const gl = cv.getContext("webgl2", { antialias: false, alpha: false, depth: false, stencil: false, premultipliedAlpha: false, powerPreference: "high-performance" });
  if (!gl) return null;
  const compile = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error("simbahan shader:", gl.getShaderInfoLog(s));
    return s;
  };
  const vs = compile(gl.VERTEX_SHADER, VS);
  const program = (fs: string) => {
    const p = gl.createProgram()!;
    const f = compile(gl.FRAGMENT_SHADER, fs);
    gl.attachShader(p, vs);
    gl.attachShader(p, f);
    gl.bindAttribLocation(p, 0, "a");
    gl.linkProgram(p);
    gl.deleteShader(f);
    return gl.getProgramParameter(p, gl.LINK_STATUS) ? p : null;
  };
  const scene = program(SCENE_FS), comp = program(COMP_FS), bake = program(BAKE_FS), bloom = program(BLOOM_FS);
  if (!scene || !comp || !bake || !bloom) return null;
  const tri = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, tri);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  const tex = (w: number, h: number, mip = false) => {
    const t = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, mip ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    const wrap = mip ? gl.REPEAT : gl.CLAMP_TO_EDGE;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
    return t;
  };

  // bake the detail tile once
  const detail = tex(512, 512, true);
  {
    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, detail, 0);
    gl.viewport(0, 0, 512, 512);
    gl.useProgram(bake);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.deleteFramebuffer(fb);
    gl.bindTexture(gl.TEXTURE_2D, detail);
    gl.generateMipmap(gl.TEXTURE_2D);
  }

  // the still church and its depth, at the canvas's size
  let W = 0, H = 0, fbo: WebGLFramebuffer | null = null, colT: WebGLTexture | null = null, auxT: WebGLTexture | null = null;
  let bW = 1, bH = 1, bfbo: WebGLFramebuffer | null = null, bloomT: WebGLTexture | null = null;
  const target = () => {
    if (fbo) gl.deleteFramebuffer(fbo);
    if (colT) gl.deleteTexture(colT);
    if (auxT) gl.deleteTexture(auxT);
    colT = tex(W, H);
    auxT = tex(W, H);
    gl.bindTexture(gl.TEXTURE_2D, auxT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, colT, 0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, auxT, 0);
    gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
    if (bfbo) gl.deleteFramebuffer(bfbo);
    if (bloomT) gl.deleteTexture(bloomT);
    bW = Math.max(1, Math.round(W / 4)); bH = Math.max(1, Math.round(H / 4));
    bloomT = tex(bW, bH);
    bfbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, bfbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, bloomT, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  };

  const uni = new Map<WebGLProgram, Map<string, WebGLUniformLocation | null>>();
  const U = (p: WebGLProgram, n: string) => {
    let m = uni.get(p);
    if (!m) uni.set(p, (m = new Map()));
    if (!m.has(n)) m.set(n, gl.getUniformLocation(p, n));
    return m.get(n) ?? null;
  };
  const common = (p: WebGLProgram, c: Cam, frac: number) => {
    gl.uniform2f(U(p, "uRes"), W, H);
    gl.uniform3fv(U(p, "uEye"), c.eye);
    gl.uniform3fv(U(p, "uFwd"), c.fwd);
    gl.uniform3fv(U(p, "uRight"), c.right);
    gl.uniform3fv(U(p, "uUp"), c.up);
    gl.uniform3fv(U(p, "uSun"), SUN);
    gl.uniform2f(U(p, "uTan"), c.tanX, c.tanY);
    gl.uniform2f(U(p, "uShift"), c.sx, c.sy);
    gl.uniform1f(U(p, "uFrac"), frac);
    gl.uniform1f(U(p, "uPix"), (2 * c.tanY) / Math.max(1, H * frac));
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, detail);
    gl.uniform1i(U(p, "uDetail"), 0);
  };
  let have = false, lastFrac = 1;

  return {
    size(scale) {
      const r = cv.getBoundingClientRect();
      const w = Math.max(1, Math.round(r.width * scale)), h = Math.max(1, Math.round(r.height * scale));
      if (w === W && h === H) return;
      W = cv.width = w;
      H = cv.height = h;
      target();
      have = false;
    },
    draw(cam, o) {
      if (!fbo) return;
      const frac = Math.max(0.4, Math.min(1, o.frac));
      if (!o.still || !have || (frac === 1 && lastFrac !== 1)) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
        gl.viewport(0, 0, Math.max(1, Math.round(W * frac)), Math.max(1, Math.round(H * frac)));
        gl.useProgram(scene);
        common(scene, cam, frac);
        gl.uniform1f(U(scene, "uDoor"), o.door);
        gl.uniform1f(U(scene, "uExp"), o.exposure);
        gl.uniform1f(U(scene, "uOut"), o.outside ? 1 : 0);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        have = true;
        lastFrac = frac;
        // the glow, from the new picture
        gl.bindFramebuffer(gl.FRAMEBUFFER, bfbo);
        gl.viewport(0, 0, bW, bH);
        gl.useProgram(bloom);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, colT);
        gl.uniform1i(U(bloom, "uScene"), 1);
        gl.uniform2f(U(bloom, "uRes"), bW, bH);
        gl.uniform1f(U(bloom, "uFrac"), frac);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, W, H);
      gl.useProgram(comp);
      common(comp, cam, lastFrac);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, colT);
      gl.uniform1i(U(comp, "uScene"), 1);
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, auxT);
      gl.uniform1i(U(comp, "uAux"), 2);
      gl.uniform1f(U(comp, "uT"), o.time);
      gl.uniform1f(U(comp, "uLive"), o.live ? 1 : 0);
      gl.uniform1f(U(comp, "uExp"), o.exposure);
      gl.uniform1f(U(comp, "uPix"), (2 * cam.tanY) / Math.max(1, H));
      gl.activeTexture(gl.TEXTURE3);
      gl.bindTexture(gl.TEXTURE_2D, bloomT);
      gl.uniform1i(U(comp, "uBloom"), 3);
      gl.uniform1f(U(comp, "uFocus"), o.focus);
      gl.uniform3f(U(comp, "uSway"), o.sway[0], o.sway[1], o.sway[2]);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
    dispose() {
      if (fbo) gl.deleteFramebuffer(fbo);
      if (bfbo) gl.deleteFramebuffer(bfbo);
      [colT, auxT, detail, bloomT].forEach((t) => t && gl.deleteTexture(t));
      gl.deleteBuffer(tri);
      gl.deleteVertexArray(vao);
      [scene, comp, bake, bloom].forEach((p) => gl.deleteProgram(p));
      gl.deleteShader(vs);
    },
  };
}
