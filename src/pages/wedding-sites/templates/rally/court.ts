// Rally's court, drawn with WebGL2: an outdoor pickleball court at a club, golden hour going to
// blue hour, under four floodlights.
//  - The surface: one shader for the whole ground. The blue court, the lighter kitchen, the green
//    surround, the white lines (anti-aliased at any distance), sand-grain glints, shoe scuffs, the
//    next court over, the grass outside. Lit by the low sun, the sky and the four lamps.
//  - Shadows are worked out per pixel, no shadow maps: the ball's, the paddles', the net's (its
//    real mesh pattern up close), the posts', the light poles' and the fence's long sun shadow.
//  - The ball's skid marks, and the line-call ring at the latest bounce.
//  - The net: a real mesh with its 2" sag to the centre strap, white tape, moving a little.
//  - The fence: a windscreen to 1.2 m, chain-link above, posts and a top rail.
//  - The pickleball: a sphere with its 40 holes, turned by its spin, stretched along its path
//    when it moves fast (motion blur). Two paddles (carbon faces, edge guards, wrapped grips).
//  - The sky: the sunset gradient, a cloud deck lit from below, the sun, a city's towers and a
//    tree line on the horizon, windows lighting up, stars at blue hour.
//  - Additive light: the lamps' glow, faint beams, the ball's tracked path (a line-call system's).
// Everything is a handful of draw calls; the ground is the one heavy shader.

import { BALL_R, COURT, FENCE, type Quat, type V3 } from "./physics";

export type M4 = number[];
export type Paddle = { pivot: V3; x: V3; y: V3; z: V3; look: 0 | 1 };
export type DrawState = {
  eye: V3;
  at: V3;
  /** Where the look-at point sits on the frame, in clip units (the dock's side). */
  shift: [number, number];
  fov: number;
  time: number;
  ball: { p: V3; q: Quat; blur: V3 } | null;
  paddles: Paddle[];
  marks: { x: number; z: number; dx: number; dz: number; a: number }[];
  ring: { x: number; z: number; dx: number; dz: number; a: number; grow: number } | null;
  trail: { pts: number[]; alpha: number[] };
  /** 0 golden hour → 1 blue hour. */
  dusk: number;
  /** Each lamp: 0 off → 1 on (the opening switches them on); flare > 0 briefly at the smash. */
  lamps: number[];
  flare: number;
  dust: { p: V3; age: number } | null;
};

export const LAMPS: V3[] = [
  [-6.85, 7.4, -5.6],
  [6.85, 7.4, -5.6],
  [-6.85, 7.4, 5.6],
  [6.85, 7.4, 5.6],
];
const AIM: V3[] = LAMPS.map((l) => norm([l[0] * 0.12 - l[0], -l[1], l[2] * 0.45 - l[2]]));

// ---------------------------------------------------------------- vectors and matrices
function norm(a: V3): V3 { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; }
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const persp = (fov: number, asp: number, n: number, f: number, sx: number, sy: number): M4 => {
  const t = 1 / Math.tan(fov / 2);
  return [t / asp, 0, 0, 0, 0, t, 0, 0, -sx, -sy, (f + n) / (n - f), -1, 0, 0, (2 * f * n) / (n - f), 0];
};
const lookAt = (e: V3, c: V3, up: V3): M4 => { const z = norm(sub(e, c)), x = norm(cross(up, z)), y = cross(z, x); return [x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -dot(x, e), -dot(y, e), -dot(z, e), 1]; };
export const mul = (a: M4, b: M4): M4 => { const o = new Array(16).fill(0); for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) for (let k = 0; k < 4; k++) o[j * 4 + i] += a[k * 4 + i] * b[j * 4 + k]; return o; };
function inv(a: M4): M4 {
  const b00 = a[0] * a[5] - a[1] * a[4], b01 = a[0] * a[6] - a[2] * a[4], b02 = a[0] * a[7] - a[3] * a[4], b03 = a[1] * a[6] - a[2] * a[5], b04 = a[1] * a[7] - a[3] * a[5], b05 = a[2] * a[7] - a[3] * a[6];
  const b06 = a[8] * a[13] - a[9] * a[12], b07 = a[8] * a[14] - a[10] * a[12], b08 = a[8] * a[15] - a[11] * a[12], b09 = a[9] * a[14] - a[10] * a[13], b10 = a[9] * a[15] - a[11] * a[13], b11 = a[10] * a[15] - a[11] * a[14];
  const d = 1 / (b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06);
  return [
    (a[5] * b11 - a[6] * b10 + a[7] * b09) * d, (a[2] * b10 - a[1] * b11 - a[3] * b09) * d, (a[13] * b05 - a[14] * b04 + a[15] * b03) * d, (a[10] * b04 - a[9] * b05 - a[11] * b03) * d,
    (a[6] * b08 - a[4] * b11 - a[7] * b07) * d, (a[0] * b11 - a[2] * b08 + a[3] * b07) * d, (a[14] * b02 - a[12] * b05 - a[15] * b01) * d, (a[8] * b05 - a[10] * b02 + a[11] * b01) * d,
    (a[4] * b10 - a[5] * b08 + a[7] * b06) * d, (a[1] * b08 - a[0] * b10 - a[3] * b06) * d, (a[12] * b04 - a[13] * b02 + a[15] * b00) * d, (a[9] * b02 - a[8] * b04 - a[11] * b00) * d,
    (a[5] * b07 - a[4] * b09 - a[6] * b06) * d, (a[0] * b09 - a[1] * b07 + a[2] * b06) * d, (a[13] * b01 - a[12] * b03 - a[14] * b00) * d, (a[8] * b03 - a[9] * b01 + a[10] * b00) * d,
  ];
}
const quatMat3 = ([x, y, z, w]: Quat) => [1 - 2 * (y * y + z * z), 2 * (x * y + z * w), 2 * (x * z - y * w), 2 * (x * y - z * w), 1 - 2 * (x * x + z * z), 2 * (y * z + x * w), 2 * (x * z + y * w), 2 * (y * z - x * w), 1 - 2 * (x * x + y * y)];
const lin = (h: string): V3 => [0, 1, 2].map((i) => Math.pow(parseInt(h.slice(1 + i * 2, 3 + i * 2), 16) / 255, 2.2)) as V3;
const mix3 = (a: V3, b: V3, t: number): V3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const scale3 = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];

// ---------------------------------------------------------------- shaders
const HEAD = `#version 300 es
precision highp float;
`;
const LIGHT = `
uniform vec3 uSun, uSunC, uSkyU, uSkyL, uCam, uFogC, uLampC;
uniform vec3 uLampP[4], uLampD[4];
uniform float uFogK, uExpo, uLampK[4];
vec3 tone(vec3 c){ c *= uExpo; c = (c * (2.51 * c + 0.03)) / (c * (2.43 * c + 0.59) + 0.14); return pow(clamp(c, 0., 1.), vec3(0.4545)); }
vec3 fogged(vec3 c, vec3 p){ return mix(c, uFogC, 1. - exp(-length(p - uCam) * uFogK)); }
float lampAt(int i, vec3 p, out vec3 L){ vec3 d = uLampP[i] - p; float r2 = max(dot(d, d), 1.); L = d * inversesqrt(r2); return smoothstep(0.2, 0.72, dot(-L, uLampD[i])) * uLampK[i] / r2; }
vec3 brdf(vec3 n, vec3 v, vec3 L, vec3 alb, float gloss, float spec){
  float nl = max(dot(n, L), 0.);
  vec3 h = normalize(L + v);
  float s = pow(max(dot(n, h), 0.), gloss) * spec * (gloss + 8.) / 25.;
  return (alb + vec3(s)) * nl;
}
vec3 ambient(vec3 n, vec3 alb){ return alb * mix(uSkyL, uSkyU, n.y * 0.5 + 0.5); }
float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f); return mix(mix(h2(i), h2(i + vec2(1, 0)), f.x), mix(h2(i + vec2(0, 1)), h2(i + vec2(1, 1)), f.x), f.y); }
float fbm(vec2 p){ float s = 0., a = 0.5; for (int k = 0; k < 4; k++) { s += a * vn(p); p = p * 2.03 + 1.7; a *= 0.5; } return s; }
`;

const FULL_VS = `${HEAD}in vec2 a; out vec2 vN; void main(){ vN = a; gl_Position = vec4(a, 0.99999, 1.); }`;
const SKY_FS = `${HEAD}${LIGHT}
in vec2 vN; uniform mat4 uInvVP; uniform float uNight, uTime; uniform vec3 uZen, uHor, uGlow;
out vec4 o;
float h1(float n){ return fract(sin(n * 12.9898) * 43758.5453); }
void main(){
  vec4 q = uInvVP * vec4(vN, 1., 1.); vec3 d = normalize(q.xyz / q.w - uCam);
  float e = d.y;
  vec3 dh = normalize(vec3(d.x, 0., d.z) + 1e-5), sh = normalize(vec3(uSun.x, 0., uSun.z) + 1e-5);
  float toward = dot(dh, sh) * 0.5 + 0.5, mu = dot(d, uSun);
  vec3 hor = mix(uHor * vec3(0.32, 0.36, 0.75), uHor, pow(toward, 2.2));
  vec3 c = mix(hor, uZen, pow(clamp(e * 1.4, 0., 1.), 0.55));
  c += uGlow * (pow(max(mu, 0.), 7.) * 0.5 + pow(max(mu, 0.), 70.) * 1.5) * (1. - smoothstep(0., 0.45, e));
  c += vec3(1.0, 0.72, 0.42) * 26. * smoothstep(0.99935, 0.99972, mu) * (1. - uNight);
  // a high, streaky cloud deck, lit from below by the low sun
  if (e > 0.) {
    vec2 uv = d.xz / (e + 0.1) * 1.1; uv.x *= 0.38;
    float cl = smoothstep(0.5, 0.86, fbm(uv + vec2(uTime * 0.003, 0.)));
    vec3 lit = mix(uZen * 0.6 + vec3(0.03, 0.02, 0.05), uGlow * 0.9, pow(toward, 2.) * (1. - uNight * 0.7));
    c = mix(c, lit, cl * 0.62 * smoothstep(0.03, 0.12, e) * (1. - smoothstep(0.5, 0.9, e)));
  }
  // stars, at blue hour
  vec2 st = floor(d.xz / (e + 0.35) * 260.);
  vec2 sf = fract(d.xz / (e + 0.35) * 260.) - 0.5;
  c += vec3(0.85, 0.9, 1.) * step(0.996, h2(st)) * (1. - smoothstep(0.08, 0.22, length(sf))) * uNight * smoothstep(0.12, 0.4, e) * 0.5;
  // the horizon: a city's towers toward the far end, a tree line all round (mango trees and palms)
  float az = atan(d.x, d.z);
  float cell = floor(az * 52.);
  float hb = h1(cell);
  float city = smoothstep(-0.9, -0.35, az) * (1. - smoothstep(0.9, 1.5, az));
  float roof = city * (0.06 + 0.13 * pow(hb, 2.2)) * step(0.25, hb);
  float tree = 0.038 + 0.022 * fbm(vec2(az * 16., 2.3)) + 0.02 * pow(vn(vec2(az * 110., 7.)), 1.3) + 0.008 * vn(vec2(az * 420., 3.)) - 0.006 * pow(vn(vec2(az * 900., 5.)), 2.);
  // palms: a few tall trunks with a crown
  float pc = floor(az * 18.), pf = fract(az * 18.) - 0.5, ph = h1(pc + 9.);
  float palm = step(0.55, ph) * (0.1 + 0.05 * ph);
  float crown = 1. - smoothstep(0.012, 0.03, length(vec2(pf * 0.055 / 0.5 * 4., (e - palm) * 1.6)));
  float trunk = step(abs(pf + (e - palm) * 0.6), 0.025) * step(e, palm);
  vec3 haze = mix(hor, uZen, 0.2);
  if (e < roof) {
    vec3 b = mix(vec3(0.03, 0.04, 0.075), haze * 0.28, 0.18 + 0.12 * h1(cell + 3.));
    vec2 w = vec2(fract(az * 52. * 7.), fract(e * 260.));
    float win = step(0.25, w.x) * step(w.x, 0.75) * step(0.3, w.y) * step(w.y, 0.8);
    float on = step(0.6 - uNight * 0.3, h2(vec2(floor(az * 52. * 7.), floor(e * 260.))));
    b += vec3(1.0, 0.7, 0.38) * win * on * (0.05 + uNight * 0.9);
    c = b;
  }
  if (e < tree || crown > 0.5 || trunk > 0.5) c = haze * 0.008 + vec3(0.004, 0.008, 0.006);
  if (e < 0.) c = uFogC;
  o = vec4(tone(c), 1.);
}`;

const GROUND_VS = `${HEAD}in vec2 aXZ; uniform mat4 uVP; out vec3 vP; void main(){ vP = vec3(aXZ.x, 0., aXZ.y); gl_Position = uVP * vec4(vP, 1.); }`;
const GROUND_FS = `${HEAD}${LIGHT}
in vec3 vP;
uniform vec4 uBall; uniform vec4 uPadS[2];
uniform vec4 uMark[8]; uniform vec2 uMarkD[8];
uniform vec4 uRing; uniform vec2 uRingD;
out vec4 o;
const float HW = ${COURT.halfW.toFixed(3)}, HL = ${COURT.halfL.toFixed(3)}, KL = ${COURT.kitchen.toFixed(3)}, POST = ${COURT.post.toFixed(3)};
const float FX = ${FENCE.x.toFixed(2)}, FZ = ${FENCE.z.toFixed(2)}, FLOW = ${FENCE.low.toFixed(2)}, FHIGH = ${FENCE.high.toFixed(2)};
float netTop(float x){ return ${COURT.netMid.toFixed(3)} + ${(COURT.netSide - COURT.netMid).toFixed(3)} * min(1., (x / POST) * (x / POST)); }
float lineCov(float d, float w, float aa){ return 1. - smoothstep(w - aa, w + aa, d); }
// one court's paint around q (its centre at the origin): its lines, whether q is in it, the kitchen
float courtLines(vec2 q, float aa){
  float lw = 0.0254, d = 1e3;
  if (abs(q.y) < HL) d = min(d, abs(abs(q.x) - (HW - lw)));
  if (abs(q.x) < HW) { d = min(d, abs(abs(q.y) - (HL - lw))); d = min(d, abs(abs(q.y) - (KL + lw))); }
  if (abs(q.y) > KL && abs(q.y) < HL) d = min(d, abs(q.x));
  return lineCov(d, lw, aa);
}
float sphereSh(vec3 p, vec3 L, float far, vec4 s, float soft){
  if (s.w <= 0.) return 1.;
  vec3 oc = s.xyz - p; float t = dot(oc, L);
  if (t <= 0. || t > far) return 1.;
  float d = length(oc - L * t), pen = s.w * 0.25 + t * soft;
  return mix(0.25, 1., smoothstep(s.w - pen, s.w + pen, d));
}
float cylSh(vec3 p, vec3 L, vec2 c, float r, float h, float soft){
  vec2 l = L.xz; float ll = dot(l, l); if (ll < 1e-6) return 1.;
  vec2 oc = c - p.xz; float t = dot(oc, l) / ll; if (t <= 0.) return 1.;
  if (p.y + L.y * t > h) return 1.;
  float d = length(oc - l * t), pen = r * 0.3 + t * soft;
  return mix(0.2, 1., smoothstep(r - pen, r + pen, d));
}
float netSh(vec3 p, vec3 L, float soft){
  if (abs(L.z) < 1e-4) return 1.;
  float t = -p.z / L.z; if (t <= 0.) return 1.;
  vec3 h = p + L * t;
  if (abs(h.x) > POST || h.y < 0.04) return 1.;
  float top = netTop(h.x);
  if (h.y > top) return 1.;
  if (h.y > top - 0.05 || abs(h.x) < 0.025) return 0.25;
  vec2 g = abs(fract(h.xy / 0.0445) - 0.5) * 2.;
  float bl = clamp(t * soft / 0.0445 * 2., 0.02, 1.);
  float m = max(smoothstep(1. - 0.09 - bl, 1. - 0.09 + bl, g.x), smoothstep(1. - 0.09 - bl, 1. - 0.09 + bl, g.y));
  m = mix(m, 0.2, smoothstep(0.3, 1., bl));
  return 1. - m * 0.8;
}
float fenceSh(vec3 p, vec3 L){
  float s = 1.;
  for (int k = 0; k < 2; k++) {
    float pl = k == 0 ? FX : FZ, lc = k == 0 ? L.x : L.z, pc = k == 0 ? p.x : p.z;
    if (abs(lc) < 1e-4) continue;
    float t = (sign(lc) * pl - pc) / lc; if (t <= 0.) continue;
    vec3 h = p + L * t;
    float other = k == 0 ? abs(h.z) : abs(h.x), lim = k == 0 ? FZ : FX;
    if (other > lim) continue;
    // the windscreen, the chain-link (thin wire: a light shade), the top rail; soft with distance
    float sb = 0.04 + t * 0.012;
    s = min(s, mix(0.12, 1., smoothstep(FLOW - sb, FLOW + sb, h.y)) * mix(0.88, 1., smoothstep(FHIGH - sb, FHIGH + sb, h.y)));
  }
  return s;
}
void main(){
  vec3 p = vP;
  vec2 fw = fwidth(p.xz); float aa = max(fw.x, fw.y) * 0.75 + 1e-4;
  float inFence = step(abs(p.x), FX) * step(abs(p.z), FZ);
  float g1 = vn(p.xz * 3.1), g2 = vn(p.xz * 47.), g3 = vn(p.xz * 410.);
  vec3 blue = vec3(0.026, 0.12, 0.31), kit = vec3(0.036, 0.19, 0.42), sur = vec3(0.022, 0.1, 0.055), white = vec3(0.8, 0.8, 0.76);
  vec3 alb;
  float paint = 0.;
  if (inFence > 0.5) {
    float inC = step(abs(p.x), HW) * step(abs(p.z), HL);
    alb = mix(sur, abs(p.z) < KL ? kit : blue, inC);
    // shoe scuffs where players stand: behind the baselines, along the kitchen lines
    float wear = smoothstep(0.5, 0.9, fbm(p.xz * vec2(1.4, 9.))) * (exp(-pow((abs(p.z) - HL - 0.5) / 0.7, 2.)) + 0.5 * exp(-pow((abs(p.z) - KL - 0.3) / 0.35, 2.)));
    alb = mix(alb, alb * 0.6 + vec3(0.02, 0.022, 0.026), wear * 0.45);
    alb *= 0.9 + 0.12 * g1 + 0.14 * (g2 - 0.5) + 0.1 * (g3 - 0.5) * (1. - smoothstep(0.003, 0.01, aa));
    paint = courtLines(p.xz, aa);
    alb = mix(alb, white * (0.92 + 0.08 * g2), paint);
  } else {
    // the next court along, and grass
    vec2 q = p.xz - vec2(sign(p.x) * 13.6, 0.);
    bool next = abs(q.x) < FX && abs(q.y) < FZ;
    float inC = step(abs(q.x), HW) * step(abs(q.y), HL);
    alb = next ? mix(sur, abs(q.y) < KL ? kit : blue, inC) * (0.85 + 0.2 * g1) : mix(vec3(0.02, 0.035, 0.012), vec3(0.035, 0.05, 0.02), g1) * (0.8 + 0.4 * g2);
    if (next) alb = mix(alb, white * 0.8, courtLines(q, aa));
  }
  // the ball's marks: faint scuffs along its path at each bounce
  for (int i = 0; i < 8; i++) {
    if (uMark[i].z <= 0.) continue;
    vec2 r = p.xz - uMark[i].xy, dd = uMarkD[i];
    float u = dot(r, dd), w = dot(r, vec2(-dd.y, dd.x));
    float m = exp(-pow(u / 0.075, 2.) - pow(w / 0.02, 2.));
    alb = mix(alb, alb * 0.55 + vec3(0.03, 0.035, 0.04), m * uMark[i].z * 0.8);
  }
  vec3 n = vec3(0., 1., 0.), v = normalize(uCam - p);
  float ao = inFence > 0.5 ? mix(0.55, 1., smoothstep(0., 0.7, min(FX - abs(p.x), FZ - abs(p.z)))) : 1.;
  vec3 c = ambient(n, alb) * ao;
  float gloss = 18. + 30. * paint, spec = 0.16 + 0.1 * paint;
  if (uSun.y > -0.02) {
    float s = fenceSh(p, uSun);
    s = min(s, sphereSh(p, uSun, 1e3, uBall, 0.012));
    s = min(s, sphereSh(p, uSun, 1e3, uPadS[0], 0.012)); s = min(s, sphereSh(p, uSun, 1e3, uPadS[1], 0.012));
    s = min(s, netSh(p, uSun, 0.01));
    s = min(s, cylSh(p, uSun, vec2(POST, 0.), 0.04, 0.95, 0.01)); s = min(s, cylSh(p, uSun, vec2(-POST, 0.), 0.04, 0.95, 0.01));
    for (int i = 0; i < 4; i++) s = min(s, mix(0.45, 1., cylSh(p, uSun, uLampP[i].xz, 0.1, 7.4, 0.012)));
    c += uSunC * brdf(n, v, uSun, alb, gloss, spec) * s * smoothstep(-0.02, 0.03, uSun.y);
    // glints off the sand in the paint, toward the sun
    float gl = step(0.985, g3) * pow(max(dot(reflect(-uSun, n), v), 0.), 6.) * (1. - smoothstep(0.002, 0.008, aa));
    c += uSunC * gl * 0.6 * s * inFence;
  }
  for (int i = 0; i < 4; i++) {
    vec3 L; float k = lampAt(i, p, L);
    if (k <= 0.) continue;
    float far = length(uLampP[i] - p);
    float s = sphereSh(p, L, far, uBall, 0.05);
    s = min(s, sphereSh(p, L, far, uPadS[0], 0.05)); s = min(s, sphereSh(p, L, far, uPadS[1], 0.05));
    s = min(s, mix(1., netSh(p, L, 0.05), 0.85));
    c += uLampC * k * brdf(n, v, L, alb, gloss, spec) * s;
  }
  // the line call: the ball's footprint and a ring at the latest bounce
  if (uRing.z > 0.) {
    vec2 r = p.xz - uRing.xy, dd = uRingD;
    float u = dot(r, dd), w = dot(r, vec2(-dd.y, dd.x));
    float rr = length(vec2(u / 1.5, w));
    float R = 0.1 + 0.08 * uRing.w;
    float ring = 1. - smoothstep(0.005, 0.005 + aa * 1.5, abs(rr - R));
    float foot = 1. - smoothstep(0.022, 0.022 + aa, length(vec2(u / 2.1, w)));
    c += vec3(1., 0.95, 0.55) * (ring * 0.7 * (1. - uRing.w * 0.5) + foot * 0.45) * uRing.z;
  }
  c = fogged(c, p);
  o = vec4(tone(c), 1.);
}`;

const LIT_VS = `${HEAD}in vec3 aPos, aNrm, aCol; in float aMat; in vec2 aUV;
uniform mat4 uVP, uModel;
out vec3 vP, vN, vC; out vec2 vUV; flat out float vMat;
void main(){ vec4 w = uModel * vec4(aPos, 1.); vP = w.xyz; vN = mat3(uModel) * aNrm; vC = aCol; vUV = aUV; vMat = aMat; gl_Position = uVP * w; }`;
const LIT_FS = `${HEAD}${LIGHT}
in vec3 vP, vN, vC; in vec2 vUV; flat in float vMat;
uniform float uLampOn;
out vec4 o;
void main(){
  vec3 n = normalize(vN), v = normalize(uCam - vP);
  if (dot(n, v) < 0.) n = -n;
  vec3 alb = vC; float gloss = 24., spec = 0.25, emit = 0.;
  if (vMat > 0.5 && vMat < 1.5) {
    // a paddle's face: raw carbon twill under a matte coat, the face graphic on top
    vec2 q = vUV * vec2(70., 100.);
    float tw = mod(floor(q.x) + floor(q.y * 0.5 + floor(q.x) * 0.5), 2.);
    alb *= 0.86 + 0.18 * tw;
    gloss = 40.; spec = 0.35;
  } else if (vMat > 1.5 && vMat < 2.5) {
    // the grip: an overgrip wound round the handle
    float st = smoothstep(0.42, 0.5, abs(fract(vUV.y * 34. + vUV.x) - 0.5));
    alb *= 0.75 + 0.35 * (1. - st);
    gloss = 6.; spec = 0.05;
  } else if (vMat > 2.5) {
    // an LED panel: rows of emitters
    vec2 q = fract(vUV * vec2(6., 4.)) - 0.5;
    emit = (1. - smoothstep(0.18, 0.32, length(q))) * uLampOn;
  }
  vec3 c = ambient(n, alb);
  if (uSun.y > -0.02) c += uSunC * brdf(n, v, uSun, alb, gloss, spec) * smoothstep(-0.02, 0.03, uSun.y);
  for (int i = 0; i < 4; i++) { vec3 L; float k = lampAt(i, vP, L); c += uLampC * k * brdf(n, v, L, alb, gloss, spec); }
  c += vec3(1., 0.96, 0.88) * emit * 14.;
  o = vec4(tone(fogged(c, vP)), 1.);
}`;

const BALL_VS = `${HEAD}in vec3 aPos;
uniform mat4 uVP; uniform vec3 uBallP, uBlur; uniform mat3 uBallR;
out vec3 vO, vP, vN;
void main(){
  vec3 nw = uBallR * aPos;
  float bl = length(uBlur);
  float k = bl > 1e-5 ? clamp(dot(nw, uBlur / bl) * 3., -1., 1.) * 0.5 : 0.;
  vP = uBallP + nw * ${BALL_R.toFixed(4)} + uBlur * k;
  vO = aPos; vN = nw;
  gl_Position = uVP * vec4(vP, 1.);
}`;
const BALL_FS = `${HEAD}${LIGHT}
in vec3 vO, vP, vN;
uniform vec3 uHoles[40]; uniform float uBlurA;
out vec4 o;
void main(){
  vec3 d = normalize(vO);
  float m = -1.;
  for (int i = 0; i < 40; i++) m = max(m, dot(d, uHoles[i]));
  float hr = 0.9935, aa = fwidth(m) * 1.4 + 1e-4;
  float hole = smoothstep(hr - aa, hr + aa, m) * (1. - uBlurA);
  float rim = smoothstep(hr - 0.004 - aa, hr - 0.002, m) * (1. - hole) * (1. - uBlurA);
  float seam = (1. - smoothstep(0.006, 0.012, abs(d.y))) * (1. - uBlurA);
  vec3 alb = vec3(0.74, 0.83, 0.07) * (1. - seam * 0.12) * (1. - rim * 0.3);
  vec3 n = normalize(vN), v = normalize(uCam - vP);
  vec3 c = ambient(n, alb);
  float spec = 0.55 * (1. - hole);
  if (uSun.y > -0.02) c += uSunC * brdf(n, v, uSun, alb, 60., spec) * smoothstep(-0.02, 0.03, uSun.y);
  for (int i = 0; i < 4; i++) { vec3 L; float k = lampAt(i, vP, L); c += uLampC * k * brdf(n, v, L, alb, 60., spec); }
  // the holes: the dark inside of the shell, its far wall just lit
  c = mix(c, alb * 0.06 + vec3(0.004, 0.005, 0.), hole);
  o = vec4(tone(fogged(c, vP)), 1. - uBlurA * 0.45);
}`;

const NET_VS = `${HEAD}in vec2 aP;
uniform mat4 uVP; uniform float uTime;
out vec3 vP;
float netTop(float x){ return ${COURT.netMid.toFixed(3)} + ${(COURT.netSide - COURT.netMid).toFixed(3)} * min(1., (x / ${COURT.post.toFixed(3)}) * (x / ${COURT.post.toFixed(3)})); }
void main(){
  float x = aP.x, y = mix(0.04, netTop(x), aP.y);
  float free = 1. - pow(abs(x) / ${COURT.post.toFixed(3)}, 4.);
  float z = 0.012 * sin(uTime * 1.1 + x * 1.3) * free * (1. - aP.y * 0.7);
  vP = vec3(x, y, z);
  gl_Position = uVP * vec4(vP, 1.);
}`;
const NET_FS = `${HEAD}${LIGHT}
in vec3 vP;
out vec4 o;
float netTop(float x){ return ${COURT.netMid.toFixed(3)} + ${(COURT.netSide - COURT.netMid).toFixed(3)} * min(1., (x / ${COURT.post.toFixed(3)}) * (x / ${COURT.post.toFixed(3)})); }
void main(){
  float top = netTop(vP.x);
  vec2 g = vP.xy / 0.0445, f = abs(fract(g) - 0.5) * 2., w = fwidth(g);
  float cw = 0.11;
  float cx = smoothstep(1. - cw - w.x, 1. - cw + w.x, f.x), cy = smoothstep(1. - cw - w.y, 1. - cw + w.y, f.y);
  float mesh = max(cx, cy);
  mesh = mix(mesh, 0.34, smoothstep(0.35, 0.9, max(w.x, w.y)));
  float tape = step(top - 0.05, vP.y), strap = 1. - smoothstep(0.022, 0.026, abs(vP.x));
  float band = step(${COURT.post.toFixed(3)} - 0.04, abs(vP.x)) + step(vP.y, 0.055);
  float white = max(tape, strap);
  vec3 alb = mix(vec3(0.012, 0.013, 0.016), vec3(0.78, 0.78, 0.75), white);
  vec3 n = vec3(0., 0., 1.), v = normalize(uCam - vP);
  if (dot(n, v) < 0.) n = -n;
  vec3 nn = normalize(n + vec3(0., 0.6, 0.));
  vec3 c = ambient(nn, alb);
  if (uSun.y > -0.02) c += uSunC * brdf(nn, v, uSun, alb, 10., 0.1) * smoothstep(-0.02, 0.03, uSun.y);
  for (int i = 0; i < 4; i++) { vec3 L; float k = lampAt(i, vP, L); c += uLampC * k * brdf(nn, v, L, alb, 10., 0.1); }
  float a = max(max(white, min(1., band)), mesh * 0.92);
  o = vec4(tone(fogged(c, vP)), a);
}`;

const FENCE_VS = `${HEAD}in vec3 aP; in vec3 aNrm; in vec2 aUV;
uniform mat4 uVP; out vec3 vP, vN; out vec2 vUV;
void main(){ vP = aP; vN = aNrm; vUV = aUV; gl_Position = uVP * vec4(aP, 1.); }`;
const FENCE_FS = `${HEAD}${LIGHT}
in vec3 vP, vN; in vec2 vUV;
out vec4 o;
void main(){
  vec3 n = normalize(vN), v = normalize(uCam - vP);
  if (dot(n, v) < 0.) n = -n;
  vec3 alb; float a;
  if (vUV.y < ${FENCE.low.toFixed(2)}) {
    // windscreen: dark green mesh fabric in 3 m panels, a hem and grommets along the top
    float weave = vn(vUV * vec2(260., 260.));
    float seam = 1. - smoothstep(0.0, 0.03, abs(fract(vUV.x / 3.) - 0.5) * 3. - 1.46);
    float hem = step(${(FENCE.low - 0.06).toFixed(2)}, vUV.y);
    vec2 gq = vec2(fract(vUV.x / 0.6) - 0.5, (vUV.y - ${(FENCE.low - 0.03).toFixed(2)}) / 0.6);
    float grom = 1. - smoothstep(0.012, 0.02, length(gq * 0.6));
    alb = vec3(0.012, 0.034, 0.022) * (0.85 + 0.25 * weave) * (1. - seam * 0.35) * (1. + hem * 0.25);
    alb = mix(alb, vec3(0.35, 0.36, 0.34), grom);
    a = 0.97;
  } else {
    // chain-link: 5 cm diamonds of black vinyl-coated wire
    vec2 q = vec2(vUV.x + vUV.y, vUV.x - vUV.y) / 0.05;
    vec2 f = abs(fract(q) - 0.5) * 2., w = fwidth(q);
    float cw = 0.1;
    float m = max(smoothstep(1. - cw - w.x, 1. - cw + w.x, f.x), smoothstep(1. - cw - w.y, 1. - cw + w.y, f.y));
    m = mix(m, 0.2, smoothstep(0.35, 0.9, max(w.x, w.y)));
    alb = vec3(0.02, 0.025, 0.022);
    a = m * 0.95;
  }
  vec3 c = ambient(n, alb);
  if (uSun.y > -0.02) c += uSunC * brdf(n, v, uSun, alb, 8., 0.008) * smoothstep(-0.02, 0.03, uSun.y);
  for (int i = 0; i < 4; i++) { vec3 L; float k = lampAt(i, vP, L); c += uLampC * k * brdf(n, v, L, alb, 8., 0.008); }
  o = vec4(tone(fogged(c, vP)), a);
}`;

// additive light: glows (billboards), the lamps' beams, the ball's path
const GLOW_VS = `${HEAD}in vec3 aC; in vec2 aO; in float aS;
uniform mat4 uVP; uniform vec3 uRight, uUp; uniform float uK[4];
out vec2 vO; out float vK;
void main(){ vO = aO; vK = uK[int(aS + 0.5)]; gl_Position = uVP * vec4(aC + (uRight * aO.x * 2.4 + uUp * aO.y) * (0.6 + 0.6 * vK), 1.); }`;
const GLOW_FS = `${HEAD}in vec2 vO; in float vK; uniform vec3 uColor; out vec4 o;
void main(){
  vec2 q = vO * vec2(2.4, 1.);
  float r = length(q);
  float g = exp(-r * r * 22.) * 1.2 + exp(-r * 5.) * 0.25;
  g += exp(-abs(vO.y) * 60.) * exp(-abs(vO.x) * 3.2) * 0.55;
  o = vec4(uColor * g * vK, 1.);
}`;
const BEAM_VS = `${HEAD}in vec3 aP; in float aT; in vec3 aAx;
uniform mat4 uVP; out float vT; out vec3 vP, vAx;
void main(){ vT = aT; vP = aP; vAx = aAx; gl_Position = uVP * vec4(aP, 1.); }`;
const BEAM_FS = `${HEAD}in float vT; in vec3 vP, vAx; uniform vec3 uColor, uCam; out vec4 o;
void main(){
  vec3 v = normalize(uCam - vP);
  float edge = 1. - abs(dot(v, normalize(vAx)));
  float a = pow(1. - vT, 1.6) * (0.35 + 0.65 * pow(1. - edge, 2.));
  o = vec4(uColor * a, 1.);
}`;
const TRAIL_VS = `${HEAD}in vec3 aP; in float aA; in float aS;
uniform mat4 uVP; out float vA, vS;
void main(){ vA = aA; vS = aS; gl_Position = uVP * vec4(aP, 1.); }`;
const TRAIL_FS = `${HEAD}in float vA, vS; uniform vec3 uColor; out vec4 o;
void main(){ float k = 1. - smoothstep(0.2, 1., abs(vS)); o = vec4(uColor * vA * k, 1.); }`;
const DUST_VS = `${HEAD}in vec4 aP;
uniform mat4 uVP; uniform float uScale; out float vA;
void main(){ vec4 c = uVP * vec4(aP.xyz, 1.); vA = aP.w; gl_Position = c; gl_PointSize = clamp(uScale * (0.06 + (1. - aP.w) * 0.14) / max(c.w, 0.1), 1., 180.); }`;
const DUST_FS = `${HEAD}in float vA; uniform vec3 uColor; out vec4 o;
void main(){ vec2 q = gl_PointCoord * 2. - 1.; float r = dot(q, q); if (r > 1.) discard; o = vec4(uColor, (1. - r) * vA * 0.35); }`;

// ---------------------------------------------------------------- geometry
type Lit = number[];
const pushV = (b: Lit, p: V3, n: V3, c: V3, m: number, uv: [number, number]) => b.push(p[0], p[1], p[2], n[0], n[1], n[2], c[0], c[1], c[2], m, uv[0], uv[1]);
function cylinder(b: Lit, x: number, y: number, z: number, r: number, h: number, seg: number, col: V3, m = 0, r1 = r) {
  for (let k = 0; k < seg; k++) {
    const a0 = (k / seg) * Math.PI * 2, a1 = ((k + 1) / seg) * Math.PI * 2;
    const n0: V3 = [Math.cos(a0), 0, Math.sin(a0)], n1: V3 = [Math.cos(a1), 0, Math.sin(a1)];
    const p0: V3 = [x + n0[0] * r, y, z + n0[2] * r], p1: V3 = [x + n1[0] * r, y, z + n1[2] * r];
    const q0: V3 = [x + n0[0] * r1, y + h, z + n0[2] * r1], q1: V3 = [x + n1[0] * r1, y + h, z + n1[2] * r1];
    pushV(b, p0, n0, col, m, [k / seg, 0]); pushV(b, p1, n1, col, m, [(k + 1) / seg, 0]); pushV(b, q1, n1, col, m, [(k + 1) / seg, h]);
    pushV(b, p0, n0, col, m, [k / seg, 0]); pushV(b, q1, n1, col, m, [(k + 1) / seg, h]); pushV(b, q0, n0, col, m, [k / seg, h]);
    pushV(b, [x, y + h, z], [0, 1, 0], col, m, [0, 0]); pushV(b, q0, [0, 1, 0], col, m, [0, 0]); pushV(b, q1, [0, 1, 0], col, m, [0, 0]);
  }
}
/** A box between two points (a beam), `w` × `t` in section. */
function beam(b: Lit, a: V3, c: V3, w: number, t: number, col: V3, m = 0) {
  const ax = norm(sub(c, a)), up: V3 = Math.abs(ax[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0];
  const s = norm(cross(ax, up)), u = cross(s, ax);
  const corner = (p: V3, i: number, j: number): V3 => [p[0] + s[0] * w * i + u[0] * t * j, p[1] + s[1] * w * i + u[1] * t * j, p[2] + s[2] * w * i + u[2] * t * j];
  const cs = [[1, 1], [1, -1], [-1, -1], [-1, 1]];
  for (let f = 0; f < 4; f++) {
    const [i0, j0] = cs[f], [i1, j1] = cs[(f + 1) % 4];
    const p0 = corner(a, i0, j0), p1 = corner(a, i1, j1), q0 = corner(c, i0, j0), q1 = corner(c, i1, j1);
    const nn = norm([(p0[0] + p1[0]) / 2 - a[0], (p0[1] + p1[1]) / 2 - a[1], (p0[2] + p1[2]) / 2 - a[2]]);
    pushV(b, p0, nn, col, m, [0, 0]); pushV(b, p1, nn, col, m, [1, 0]); pushV(b, q1, nn, col, m, [1, 1]);
    pushV(b, p0, nn, col, m, [0, 0]); pushV(b, q1, nn, col, m, [1, 1]); pushV(b, q0, nn, col, m, [0, 1]);
  }
}
/** A flat panel (the lamp's LED face) with its normal `n`. */
function panel(b: Lit, c: V3, s: V3, u: V3, n: V3, col: V3, m: number) {
  const P = (i: number, j: number): V3 => [c[0] + s[0] * i + u[0] * j, c[1] + s[1] * i + u[1] * j, c[2] + s[2] * i + u[2] * j];
  pushV(b, P(-1, -1), n, col, m, [0, 0]); pushV(b, P(1, -1), n, col, m, [1, 0]); pushV(b, P(1, 1), n, col, m, [1, 1]);
  pushV(b, P(-1, -1), n, col, m, [0, 0]); pushV(b, P(1, 1), n, col, m, [1, 1]); pushV(b, P(-1, 1), n, col, m, [0, 1]);
}

function staticScene(): Float32Array {
  const b: Lit = [];
  const steel = lin("#2b2f2e"), post = lin("#1a1d1c"), housing = lin("#3a3d40");
  // the net posts
  for (const sx of [-1, 1]) { cylinder(b, sx * COURT.post, 0, 0, 0.04, 0.95, 12, post); cylinder(b, sx * COURT.post, 0.95, 0, 0.045, 0.03, 12, steel); }
  // the fence's posts every 3 m or so and its top rail
  const fx = FENCE.x, fz = FENCE.z, fh = FENCE.high;
  const along = (a: V3, c: V3) => { const L = Math.hypot(c[0] - a[0], c[2] - a[2]), n = Math.max(1, Math.round(L / 3)); for (let k = 0; k <= n; k++) { const t = k / n; cylinder(b, a[0] + (c[0] - a[0]) * t, 0, a[2] + (c[2] - a[2]) * t, 0.03, fh + 0.05, 8, post); } beam(b, [a[0], fh, a[2]], [c[0], fh, c[2]], 0.022, 0.022, post); beam(b, [a[0], FENCE.low, a[2]], [c[0], FENCE.low, c[2]], 0.012, 0.012, post); };
  along([-fx, 0, -fz], [fx, 0, -fz]); along([fx, 0, -fz], [fx, 0, fz]); along([fx, 0, fz], [-fx, 0, fz]); along([-fx, 0, fz], [-fx, 0, -fz]);
  // the light poles: a tapered pole, a cross-arm, two LED heads tilted at the court
  LAMPS.forEach((l, i) => {
    cylinder(b, l[0], 0, l[2], 0.12, l[1] + 0.3, 10, steel, 0, 0.07);
    const a = AIM[i], side = norm([a[2], 0, -a[0]]);
    beam(b, [l[0] - side[0] * 0.75, l[1] + 0.25, l[2] - side[2] * 0.75], [l[0] + side[0] * 0.75, l[1] + 0.25, l[2] + side[2] * 0.75], 0.04, 0.04, steel);
    for (const o of [-0.45, 0.45]) {
      const c: V3 = [l[0] + side[0] * o, l[1], l[2] + side[2] * o];
      const u = norm(cross(side, a));
      beam(b, sub(c, scale3(a, 0.05)), [c[0] - a[0] * 0.18, c[1] - a[1] * 0.18, c[2] - a[2] * 0.18], 0.24, 0.17, housing);
      panel(b, [c[0] + a[0] * 0.02, c[1] + a[1] * 0.02, c[2] + a[2] * 0.02], scale3(side, 0.22), scale3(u, 0.15), a, [0.6, 0.6, 0.6], 3);
    }
  });
  // a courtside bench by the near fence, and a ball basket
  const wood = lin("#6b4b32"), legs = lin("#202322");
  beam(b, [-fx + 0.45, 0.45, -3.2], [-fx + 0.45, 0.45, -0.9], 0.2, 0.025, wood);
  for (const z of [-3.0, -1.1]) beam(b, [-fx + 0.45, 0, z], [-fx + 0.45, 0.43, z], 0.18, 0.025, legs);
  cylinder(b, -fx + 0.5, 0, 1.4, 0.2, 0.55, 14, lin("#1c1f22"));
  for (let k = 0; k < 9; k++) { const a = k * 2.1; cylinder(b, -fx + 0.5 + Math.cos(a) * 0.1, 0.52 + (k % 3) * 0.02, 1.4 + Math.sin(a) * 0.1, 0.037, 0.06, 8, lin("#c7d42a")); }
  return new Float32Array(b);
}

/** A paddle in its own space: y along it (0 at the butt, 0.41 at the tip), z out of the face. */
function paddleMesh(face: V3, edge: V3, grip: V3): Float32Array {
  const b: Lit = [];
  const T = 0.0075, y0 = 0.135, y1 = 0.41, W = 0.101;
  const out: [number, number][] = [];
  const arc = (cx: number, cy: number, r: number, a0: number, a1: number, n: number) => { for (let k = 0; k <= n; k++) { const a = a0 + ((a1 - a0) * k) / n; out.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } };
  arc(W - 0.05, y1 - 0.05, 0.05, 0, Math.PI / 2, 8);
  arc(-W + 0.05, y1 - 0.05, 0.05, Math.PI / 2, Math.PI, 8);
  arc(-W + 0.035, y0 + 0.035, 0.035, Math.PI, Math.PI * 1.5, 6);
  arc(W - 0.035, y0 + 0.035, 0.035, Math.PI * 1.5, Math.PI * 2, 6);
  const cy = (y0 + y1) / 2, uvOf = (x: number, y: number): [number, number] => [x / (2 * W) + 0.5, (y - y0) / (y1 - y0)];
  for (const s of [1, -1]) {
    for (let k = 0; k < out.length; k++) {
      const a = out[k], c = out[(k + 1) % out.length];
      const p0: V3 = [0, cy, s * T], p1: V3 = [a[0], a[1], s * T], p2: V3 = [c[0], c[1], s * T];
      const n: V3 = [0, 0, s];
      if (s > 0) { pushV(b, p0, n, face, 1, uvOf(0, cy)); pushV(b, p1, n, face, 1, uvOf(a[0], a[1])); pushV(b, p2, n, face, 1, uvOf(c[0], c[1])); }
      else { pushV(b, p0, n, face, 1, uvOf(0, cy)); pushV(b, p2, n, face, 1, uvOf(c[0], c[1])); pushV(b, p1, n, face, 1, uvOf(a[0], a[1])); }
    }
  }
  // the face graphic: a band of colour across the lower face (drawn as a slightly raised strip)
  // the edge guard, a little thicker than the face
  for (let k = 0; k < out.length; k++) {
    const a = out[k], c = out[(k + 1) % out.length];
    const n = norm([c[1] - a[1], -(c[0] - a[0]), 0]);
    const E = T + 0.0025;
    pushV(b, [a[0], a[1], -E], n, edge, 0, [0, 0]); pushV(b, [c[0], c[1], -E], n, edge, 0, [1, 0]); pushV(b, [c[0], c[1], E], n, edge, 0, [1, 1]);
    pushV(b, [a[0], a[1], -E], n, edge, 0, [0, 0]); pushV(b, [c[0], c[1], E], n, edge, 0, [1, 1]); pushV(b, [a[0], a[1], E], n, edge, 0, [0, 1]);
  }
  // the handle: an octagonal grip, a flared butt cap
  const seg = 8, r = 0.0165;
  for (let k = 0; k < seg; k++) {
    const a0 = (k / seg) * Math.PI * 2, a1 = ((k + 1) / seg) * Math.PI * 2;
    const n0: V3 = [Math.cos(a0), 0, Math.sin(a0) * 1.0], n1: V3 = [Math.cos(a1), 0, Math.sin(a1)];
    const P = (a: number, y: number, rr: number): V3 => [Math.cos(a) * rr, y, Math.sin(a) * rr * 0.82];
    pushV(b, P(a0, 0.012, r), n0, grip, 2, [k / seg, 0.012]); pushV(b, P(a1, 0.012, r), n1, grip, 2, [(k + 1) / seg, 0.012]); pushV(b, P(a1, y0 + 0.01, r * 0.9), n1, grip, 2, [(k + 1) / seg, y0]);
    pushV(b, P(a0, 0.012, r), n0, grip, 2, [k / seg, 0.012]); pushV(b, P(a1, y0 + 0.01, r * 0.9), n1, grip, 2, [(k + 1) / seg, y0]); pushV(b, P(a0, y0 + 0.01, r * 0.9), n0, grip, 2, [k / seg, y0]);
    pushV(b, P(a0, 0, r * 1.2), n0, edge, 0, [0, 0]); pushV(b, P(a1, 0, r * 1.2), n1, edge, 0, [0, 0]); pushV(b, P(a1, 0.014, r * 1.2), n1, edge, 0, [0, 0]);
    pushV(b, P(a0, 0, r * 1.2), n0, edge, 0, [0, 0]); pushV(b, P(a1, 0.014, r * 1.2), n1, edge, 0, [0, 0]); pushV(b, P(a0, 0.014, r * 1.2), n0, edge, 0, [0, 0]);
    pushV(b, [0, 0, 0], [0, -1, 0], edge, 0, [0, 0]); pushV(b, P(a1, 0, r * 1.2), [0, -1, 0], edge, 0, [0, 0]); pushV(b, P(a0, 0, r * 1.2), [0, -1, 0], edge, 0, [0, 0]);
  }
  return new Float32Array(b);
}
/** The face graphic: a colour field over part of each face, a hair in front of it. */
function paddleGraphic(col: V3): Float32Array {
  const b: Lit = [];
  const T = 0.0078, y0 = 0.15, W = 0.1;
  for (const s of [1, -1]) {
    const n: V3 = [0, 0, s];
    const quad = (a: [number, number], c: [number, number], d: [number, number], e: [number, number]) => {
      const P = (q: [number, number]): V3 => [q[0], q[1], s * T];
      const uv = (q: [number, number]): [number, number] => [q[0] / 0.2 + 0.5, (q[1] - 0.135) / 0.275];
      const tri = s > 0 ? [a, c, d, a, d, e] : [a, d, c, a, e, d];
      for (const q of tri) pushV(b, P(q), n, col, 1, uv(q));
    };
    quad([-W + 0.012, y0], [W - 0.012, y0], [W - 0.012, y0 + 0.03], [-W + 0.012, y0 + 0.085]);
  }
  return new Float32Array(b);
}

function icosphere(sub: number): Float32Array {
  const t = (1 + Math.sqrt(5)) / 2;
  let V: V3[] = ([[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]] as V3[]).map(norm);
  let F = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
  for (let s = 0; s < sub; s++) {
    const cache = new Map<string, number>(), nf: number[][] = [];
    const mid = (a: number, b: number) => { const k = a < b ? `${a}_${b}` : `${b}_${a}`; let i = cache.get(k); if (i === undefined) { i = V.length; V = [...V, norm([(V[a][0] + V[b][0]) / 2, (V[a][1] + V[b][1]) / 2, (V[a][2] + V[b][2]) / 2])]; cache.set(k, i); } return i; };
    for (const [a, b, c] of F) { const ab = mid(a, b), bc = mid(b, c), ca = mid(c, a); nf.push([a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]); }
    F = nf;
  }
  const out: number[] = [];
  for (const f of F) for (const i of f) out.push(V[i][0], V[i][1], V[i][2]);
  return new Float32Array(out);
}

// the 40 holes of an outdoor ball, spread evenly (a golden spiral)
const HOLES = (() => {
  const h: number[] = [];
  for (let i = 0; i < 40; i++) { const y = 1 - ((i + 0.5) / 40) * 2, r = Math.sqrt(1 - y * y), a = i * Math.PI * (3 - Math.sqrt(5)); h.push(Math.cos(a) * r, y, Math.sin(a) * r); }
  return new Float32Array(h);
})();

// ---------------------------------------------------------------- the light, golden hour to blue hour
function lightAt(dusk: number) {
  const el = (7.5 - dusk * 11) * (Math.PI / 180), az = 0.38;
  const sun = norm([Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)]);
  const day = Math.max(0, Math.min(1, (el * 180) / Math.PI / 5 + 0.25));
  const sunC = scale3(mix3([1.0, 0.34, 0.09], [1.0, 0.55, 0.26], day), 15 * day * day);
  const night = Math.max(0, Math.min(1, dusk * 1.25 - 0.15));
  return {
    sun,
    sunC,
    night,
    zen: mix3([0.035, 0.09, 0.3], [0.008, 0.016, 0.06], night),
    hor: mix3([1.25, 0.5, 0.22], [0.28, 0.15, 0.24], night),
    glow: mix3([3.2, 1.2, 0.35], [0.8, 0.26, 0.14], night),
    skyU: mix3([0.07, 0.1, 0.19], [0.02, 0.03, 0.07], night),
    skyL: mix3([0.1, 0.06, 0.04], [0.025, 0.02, 0.03], night),
    fog: mix3([0.5, 0.26, 0.17], [0.06, 0.05, 0.09], night),
    lamp: 26 + 40 * night,
  };
}

// ---------------------------------------------------------------- the renderer
export function createCourt(cv: HTMLCanvasElement) {
  const gl = cv.getContext("webgl2", { antialias: true, powerPreference: "high-performance", alpha: false });
  if (!gl) return null;
  const sh = (type: number, src: string) => {
    const s = gl.createShader(type)!; gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS) && import.meta.env?.DEV) console.warn("[rally] shader:", gl.getShaderInfoLog(s));
    return s;
  };
  const progs: WebGLProgram[] = [];
  const prog = (vs: string, fs: string) => {
    const p = gl.createProgram()!; const v = sh(gl.VERTEX_SHADER, vs), f = sh(gl.FRAGMENT_SHADER, fs);
    gl.attachShader(p, v); gl.attachShader(p, f); gl.linkProgram(p); gl.deleteShader(v); gl.deleteShader(f);
    progs.push(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) { if (import.meta.env?.DEV) console.warn("[rally] link:", gl.getProgramInfoLog(p)); return null; }
    return p;
  };
  const P = {
    sky: prog(FULL_VS, SKY_FS), ground: prog(GROUND_VS, GROUND_FS), lit: prog(LIT_VS, LIT_FS), ball: prog(BALL_VS, BALL_FS),
    net: prog(NET_VS, NET_FS), fence: prog(FENCE_VS, FENCE_FS), glow: prog(GLOW_VS, GLOW_FS), beam: prog(BEAM_VS, BEAM_FS),
    trail: prog(TRAIL_VS, TRAIL_FS), dust: prog(DUST_VS, DUST_FS),
  };
  if (Object.values(P).some((p) => !p)) { progs.forEach((p) => gl.deleteProgram(p)); return null; }
  const prg = P as Record<keyof typeof P, WebGLProgram>;
  const ucache = new Map<WebGLProgram, Map<string, WebGLUniformLocation | null>>();
  const u = (p: WebGLProgram, n: string) => { let m = ucache.get(p); if (!m) { m = new Map(); ucache.set(p, m); } if (!m.has(n)) m.set(n, gl.getUniformLocation(p, n)); return m.get(n) ?? null; };

  const buffers: WebGLBuffer[] = [], vaos: WebGLVertexArrayObject[] = [];
  const vao = (p: WebGLProgram, data: Float32Array | null, layout: [string, number][], dynamic = false) => {
    const va = gl.createVertexArray()!; vaos.push(va); gl.bindVertexArray(va);
    const b = gl.createBuffer()!; buffers.push(b); gl.bindBuffer(gl.ARRAY_BUFFER, b);
    if (data) gl.bufferData(gl.ARRAY_BUFFER, data, dynamic ? gl.DYNAMIC_DRAW : gl.STATIC_DRAW);
    const stride = layout.reduce((s, [, n]) => s + n, 0) * 4;
    let off = 0;
    for (const [name, n] of layout) { const a = gl.getAttribLocation(p, name); if (a >= 0) { gl.enableVertexAttribArray(a); gl.vertexAttribPointer(a, n, gl.FLOAT, false, stride, off); } off += n * 4; }
    gl.bindVertexArray(null);
    const count = data ? data.length / (stride / 4) : 0;
    return { va, b, count };
  };
  const LIT: [string, number][] = [["aPos", 3], ["aNrm", 3], ["aCol", 3], ["aMat", 1], ["aUV", 2]];
  const full = vao(prg.sky, new Float32Array([-1, -1, 3, -1, -1, 3]), [["a", 2]]);
  const G = 260;
  const ground = vao(prg.ground, new Float32Array([-G, -G, G, -G, G, G, -G, -G, G, G, -G, G]), [["aXZ", 2]]);
  const scene = vao(prg.lit, staticScene(), LIT);
  const paddleA = vao(prg.lit, paddleMesh(lin("#3a4d6e"), lin("#e2603f"), lin("#efe9de")), LIT);
  const paddleB = vao(prg.lit, paddleMesh(lin("#e9e6df"), lin("#15403f"), lin("#1c1c1e")), LIT);
  const graphicA = vao(prg.lit, paddleGraphic(lin("#e2603f")), LIT);
  const graphicB = vao(prg.lit, paddleGraphic(lin("#2a8a7a")), LIT);
  const ballM = vao(prg.ball, icosphere(3), [["aPos", 3]]);
  // the net: a grid between the posts (x, fraction of the height)
  const nd: number[] = [];
  { const NX = 48, NY = 4; for (let i = 0; i < NX; i++) for (let j = 0; j < NY; j++) { const x0 = -COURT.post + (2 * COURT.post * i) / NX, x1 = -COURT.post + (2 * COURT.post * (i + 1)) / NX, y0 = j / NY, y1 = (j + 1) / NY; nd.push(x0, y0, x1, y0, x1, y1, x0, y0, x1, y1, x0, y1); } }
  const net = vao(prg.net, new Float32Array(nd), [["aP", 2]]);
  // the fence: four walls, uv = (metres along, height)
  const fd: number[] = [];
  {
    const fx = FENCE.x, fz = FENCE.z, h = FENCE.high;
    const wall = (a: [number, number], b: [number, number], n: V3) => {
      const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const v = (x: number, z: number, y: number, s: number) => fd.push(x, y, z, n[0], n[1], n[2], s, y);
      v(a[0], a[1], 0, 0); v(b[0], b[1], 0, L); v(b[0], b[1], h, L); v(a[0], a[1], 0, 0); v(b[0], b[1], h, L); v(a[0], a[1], h, 0);
    };
    wall([-fx, -fz], [fx, -fz], [0, 0, 1]); wall([fx, -fz], [fx, fz], [-1, 0, 0]); wall([fx, fz], [-fx, fz], [0, 0, -1]); wall([-fx, fz], [-fx, -fz], [1, 0, 0]);
  }
  const fence = vao(prg.fence, new Float32Array(fd), [["aP", 3], ["aNrm", 3], ["aUV", 2]]);
  // the lamps' glows (two heads a pole) and beams
  const gd: number[] = [], bd: number[] = [];
  LAMPS.forEach((l, i) => {
    const a = AIM[i], side = norm([a[2], 0, -a[0]]);
    for (const o of [-0.45, 0.45]) {
      const c: V3 = [l[0] + side[0] * o + a[0] * 0.1, l[1] + a[1] * 0.1, l[2] + side[2] * o + a[2] * 0.1];
      for (const [x, y] of [[-1, -1], [1, -1], [1, 1], [-1, -1], [1, 1], [-1, 1]]) gd.push(c[0], c[1], c[2], x, y, i);
    }
    const len = 9.5, rad = 4.2, seg = 20, up = norm(cross(side, a));
    for (let k = 0; k < seg; k++) {
      const a0 = (k / seg) * Math.PI * 2, a1 = ((k + 1) / seg) * Math.PI * 2;
      const ring = (t: number): V3 => [l[0] + a[0] * len + (side[0] * Math.cos(t) + up[0] * Math.sin(t)) * rad, l[1] + a[1] * len + (side[1] * Math.cos(t) + up[1] * Math.sin(t)) * rad, l[2] + a[2] * len + (side[2] * Math.cos(t) + up[2] * Math.sin(t)) * rad];
      const r0 = ring(a0), r1 = ring(a1);
      bd.push(l[0], l[1], l[2], 0, a[0], a[1], a[2], r0[0], r0[1], r0[2], 1, a[0], a[1], a[2], r1[0], r1[1], r1[2], 1, a[0], a[1], a[2]);
    }
  });
  const glows = vao(prg.glow, new Float32Array(gd), [["aC", 3], ["aO", 2], ["aS", 1]]);
  const beams = vao(prg.beam, new Float32Array(bd), [["aP", 3], ["aT", 1], ["aAx", 3]]);
  const trail = vao(prg.trail, null, [["aP", 3], ["aA", 1], ["aS", 1]], true);
  const dust = vao(prg.dust, null, [["aP", 4]], true);
  const DUST_N = 60;
  const dustSeed = Array.from({ length: DUST_N }, (_, i) => { const a = (i / DUST_N) * Math.PI * 2 + Math.sin(i * 7.1); const s = 0.6 + ((i * 37) % 11) / 11; return [Math.cos(a) * s, 0.4 + ((i * 13) % 7) / 7, Math.sin(a) * s]; });

  let lampK = [1, 1, 1, 1];
  const setLight = (p: WebGLProgram, L: ReturnType<typeof lightAt>, eye: V3, lampC: V3, fogK: number) => {
    gl.uniform3fv(u(p, "uSun"), L.sun); gl.uniform3fv(u(p, "uSunC"), L.sunC); gl.uniform3fv(u(p, "uSkyU"), L.skyU); gl.uniform3fv(u(p, "uSkyL"), L.skyL);
    gl.uniform3fv(u(p, "uCam"), eye); gl.uniform3fv(u(p, "uFogC"), L.fog); gl.uniform3fv(u(p, "uLampC"), lampC); gl.uniform1f(u(p, "uFogK"), fogK); gl.uniform1f(u(p, "uExpo"), 0.95);
    gl.uniform3fv(u(p, "uLampP"), LAMPS.flat()); gl.uniform3fv(u(p, "uLampD"), AIM.flat()); gl.uniform1fv(u(p, "uLampK"), lampK);
  };

  let W = 1, H = 1;
  const size = () => {
    const r = cv.getBoundingClientRect(), d = Math.min(window.devicePixelRatio || 1, 1.25);
    W = Math.max(1, Math.round(r.width * d)); H = Math.max(1, Math.round(r.height * d));
    cv.width = W; cv.height = H;
    gl.viewport(0, 0, W, H);
  };

  const draw = (s: DrawState) => {
    const asp = W / H;
    const VP = mul(persp(s.fov, asp, 0.05, 900, s.shift[0], s.shift[1]), lookAt(s.eye, s.at, [0, 1, 0]));
    const L = lightAt(s.dusk);
    lampK = s.lamps.map((k) => Math.max(0, Math.min(1.2, k)));
    const on = Math.max(...lampK);
    const lampC = scale3([1.0, 0.94, 0.84], L.lamp * (1 + s.flare * 0.8));
    const fogK = 0.0055;
    gl.disable(gl.BLEND); gl.enable(gl.DEPTH_TEST); gl.depthMask(true); gl.disable(gl.CULL_FACE);
    gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    // sky
    gl.depthMask(false); gl.useProgram(prg.sky); setLight(prg.sky, L, s.eye, lampC, fogK);
    gl.uniformMatrix4fv(u(prg.sky, "uInvVP"), false, inv(VP)); gl.uniform1f(u(prg.sky, "uNight"), L.night); gl.uniform1f(u(prg.sky, "uTime"), s.time);
    gl.uniform3fv(u(prg.sky, "uZen"), L.zen); gl.uniform3fv(u(prg.sky, "uHor"), L.hor); gl.uniform3fv(u(prg.sky, "uGlow"), L.glow);
    gl.bindVertexArray(full.va); gl.drawArrays(gl.TRIANGLES, 0, 3); gl.depthMask(true);
    // the ground
    const g = prg.ground;
    gl.useProgram(g); setLight(g, L, s.eye, lampC, fogK); gl.uniformMatrix4fv(u(g, "uVP"), false, VP);
    gl.uniform4fv(u(g, "uBall"), s.ball ? [...s.ball.p, BALL_R] : [0, -10, 0, 0]);
    const padS = [0, 1].flatMap((i) => { const p = s.paddles[i]; if (!p) return [0, -10, 0, 0]; const c = [p.pivot[0] + p.y[0] * 0.27, p.pivot[1] + p.y[1] * 0.27, p.pivot[2] + p.y[2] * 0.27]; return [...c, 0.09]; });
    gl.uniform4fv(u(g, "uPadS"), padS);
    const mk: number[] = [], md: number[] = [];
    for (let i = 0; i < 8; i++) { const m = s.marks[i]; if (m) { const l = Math.hypot(m.dx, m.dz) || 1; mk.push(m.x, m.z, m.a, 0); md.push(m.dx / l, m.dz / l); } else { mk.push(0, 0, 0, 0); md.push(1, 0); } }
    gl.uniform4fv(u(g, "uMark"), mk); gl.uniform2fv(u(g, "uMarkD"), md);
    if (s.ring) { const l = Math.hypot(s.ring.dx, s.ring.dz) || 1; gl.uniform4fv(u(g, "uRing"), [s.ring.x, s.ring.z, s.ring.a, s.ring.grow]); gl.uniform2fv(u(g, "uRingD"), [s.ring.dx / l, s.ring.dz / l]); }
    else gl.uniform4fv(u(g, "uRing"), [0, 0, 0, 0]);
    gl.bindVertexArray(ground.va); gl.drawArrays(gl.TRIANGLES, 0, ground.count);
    // posts, poles, lamps, bench; the paddles
    const lp = prg.lit;
    gl.useProgram(lp); setLight(lp, L, s.eye, lampC, fogK); gl.uniformMatrix4fv(u(lp, "uVP"), false, VP); gl.uniform1f(u(lp, "uLampOn"), on * (1 + s.flare));
    gl.uniformMatrix4fv(u(lp, "uModel"), false, [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
    gl.bindVertexArray(scene.va); gl.drawArrays(gl.TRIANGLES, 0, scene.count);
    for (const p of s.paddles) {
      gl.uniformMatrix4fv(u(lp, "uModel"), false, [...p.x, 0, ...p.y, 0, ...p.z, 0, ...p.pivot, 1]);
      const m = p.look ? paddleB : paddleA, gr = p.look ? graphicB : graphicA;
      gl.bindVertexArray(m.va); gl.drawArrays(gl.TRIANGLES, 0, m.count);
      gl.bindVertexArray(gr.va); gl.drawArrays(gl.TRIANGLES, 0, gr.count);
    }
    // the ball
    if (s.ball) {
      const b = prg.ball, bl = Math.hypot(s.ball.blur[0], s.ball.blur[1], s.ball.blur[2]);
      gl.useProgram(b); setLight(b, L, s.eye, lampC, fogK); gl.uniformMatrix4fv(u(b, "uVP"), false, VP);
      gl.uniform3fv(u(b, "uBallP"), s.ball.p); gl.uniform3fv(u(b, "uBlur"), s.ball.blur); gl.uniformMatrix3fv(u(b, "uBallR"), false, quatMat3(s.ball.q));
      gl.uniform3fv(u(b, "uHoles"), HOLES); gl.uniform1f(u(b, "uBlurA"), Math.min(1, bl / 0.12));
      if (bl > 0.02) { gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); }
      gl.bindVertexArray(ballM.va); gl.drawArrays(gl.TRIANGLES, 0, ballM.count);
      gl.disable(gl.BLEND);
    }
    // see-through: the fence, then the net
    gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false);
    gl.useProgram(prg.fence); setLight(prg.fence, L, s.eye, lampC, fogK); gl.uniformMatrix4fv(u(prg.fence, "uVP"), false, VP);
    gl.bindVertexArray(fence.va); gl.drawArrays(gl.TRIANGLES, 0, fence.count);
    gl.useProgram(prg.net); setLight(prg.net, L, s.eye, lampC, fogK); gl.uniformMatrix4fv(u(prg.net, "uVP"), false, VP); gl.uniform1f(u(prg.net, "uTime"), s.time);
    gl.bindVertexArray(net.va); gl.drawArrays(gl.TRIANGLES, 0, net.count);
    // the smash's puff of court dust
    if (s.dust && s.dust.age < 1.4) {
      const a = s.dust.age, pts: number[] = [];
      for (const d of dustSeed) { const k = 1 - Math.exp(-a * 3.2); pts.push(s.dust.p[0] + d[0] * k * 0.55, 0.03 + d[1] * k * 0.35, s.dust.p[2] + d[2] * k * 0.55, Math.max(0, 1 - a / 1.4)); }
      gl.useProgram(prg.dust); gl.uniformMatrix4fv(u(prg.dust, "uVP"), false, VP); gl.uniform1f(u(prg.dust, "uScale"), H * 1.2); gl.uniform3fv(u(prg.dust, "uColor"), [0.78, 0.8, 0.82]);
      gl.bindVertexArray(dust.va); gl.bindBuffer(gl.ARRAY_BUFFER, dust.b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(pts), gl.DYNAMIC_DRAW); gl.drawArrays(gl.POINTS, 0, DUST_N);
    }
    // additive light
    gl.blendFunc(gl.ONE, gl.ONE);
    if (s.trail.pts.length >= 6) {
      const pts = s.trail.pts, al = s.trail.alpha, n = pts.length / 3, out: number[] = [];
      for (let i = 0; i < n; i++) {
        const p: V3 = [pts[i * 3], pts[i * 3 + 1], pts[i * 3 + 2]], q: V3 = i < n - 1 ? [pts[i * 3 + 3], pts[i * 3 + 4], pts[i * 3 + 5]] : p, o: V3 = i > 0 ? [pts[i * 3 - 3], pts[i * 3 - 2], pts[i * 3 - 1]] : p;
        const t = norm(sub(q, o)), side = norm(cross(t, sub(s.eye, p)));
        const w = 0.006 + 0.004 * Math.min(1, Math.hypot(s.eye[0] - p[0], s.eye[1] - p[1], s.eye[2] - p[2]) / 6);
        out.push(p[0] - side[0] * w, p[1] - side[1] * w, p[2] - side[2] * w, al[i], -1, p[0] + side[0] * w, p[1] + side[1] * w, p[2] + side[2] * w, al[i], 1);
      }
      gl.useProgram(prg.trail); gl.uniformMatrix4fv(u(prg.trail, "uVP"), false, VP); gl.uniform3fv(u(prg.trail, "uColor"), [0.95, 0.95, 0.55]);
      gl.bindVertexArray(trail.va); gl.bindBuffer(gl.ARRAY_BUFFER, trail.b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(out), gl.DYNAMIC_DRAW); gl.drawArrays(gl.TRIANGLE_STRIP, 0, n * 2);
    }
    if (on > 0.01) {
      const vf = norm(sub(s.at, s.eye)), right = norm(cross(vf, [0, 1, 0])), up = cross(right, vf);
      gl.useProgram(prg.beam); gl.uniformMatrix4fv(u(prg.beam, "uVP"), false, VP); gl.uniform3fv(u(prg.beam, "uCam"), s.eye);
      gl.uniform3fv(u(prg.beam, "uColor"), scale3([0.9, 0.88, 0.8], 0.028 * on * (0.45 + L.night * 0.9)));
      gl.bindVertexArray(beams.va); gl.drawArrays(gl.TRIANGLES, 0, beams.count);
      gl.useProgram(prg.glow); gl.uniformMatrix4fv(u(prg.glow, "uVP"), false, VP); gl.uniform3fv(u(prg.glow, "uRight"), right); gl.uniform3fv(u(prg.glow, "uUp"), up);
      gl.uniform3fv(u(prg.glow, "uColor"), scale3([1.0, 0.92, 0.78], 0.9 * (1 + s.flare))); gl.uniform1fv(u(prg.glow, "uK"), lampK);
      gl.bindVertexArray(glows.va); gl.drawArrays(gl.TRIANGLES, 0, glows.count);
    }
    gl.disable(gl.BLEND); gl.depthMask(true);
    gl.bindVertexArray(null);
    return VP;
  };

  const dispose = () => {
    buffers.forEach((b) => gl.deleteBuffer(b));
    vaos.forEach((v) => gl.deleteVertexArray(v));
    progs.forEach((p) => gl.deleteProgram(p));
  };
  return { size, draw, dispose };
}

/** Projects a world point through `vp` to the frame (fractions of its width and height). */
export function project(vp: M4, p: V3): [number, number, boolean] {
  const x = vp[0] * p[0] + vp[4] * p[1] + vp[8] * p[2] + vp[12], y = vp[1] * p[0] + vp[5] * p[1] + vp[9] * p[2] + vp[13], w = vp[3] * p[0] + vp[7] * p[1] + vp[11] * p[2] + vp[15];
  return [(x / w) * 0.5 + 0.5, 0.5 - (y / w) * 0.5, w > 0];
}
