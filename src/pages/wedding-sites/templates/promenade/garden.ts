// Promenade's garden, drawn with WebGL2: a formal estate garden seen from above at the end of a
// summer afternoon, every part of it procedural (no photographs, no models).
//  - The plan, along one long gravel promenade (x = 0, the walk runs toward +z): a gravel
//    forecourt and the gate in a yew hedge; the monogram court (the couple's initials clipped in
//    box on a round lawn); two pairs of box broderie parterres on rose-coloured gravel; a lawn
//    of yew cones; the fountain court; the rose garden (blush, white and deep rose beds edged in
//    box); a lime allée; and the white rotunda in a yew exedra at the end. Woods all round.
//  - How it's drawn: one ray per pixel. Everything low (box, roses, yew, the woods' canopy) is a
//    stack of flat-topped layers, each a 2D distance field: the ray is tested against each
//    layer's top and side and the layers composited front to back, so every edge is
//    anti-aliased by its own distance. Trees, cones, the rotunda and the fountain's bowl are
//    real 3D shapes (ray against ellipsoid, cone, cylinder). One low sun: every shadow is worked
//    out per pixel by walking toward the sun through the layers' distance fields, plus the 3D
//    shapes' shadows (soft, widening with distance). No shadow maps.
//  - Detail (leaf clumps, gravel grain, lawn, noise) comes from one tileable texture baked on the
//    GPU at start, mip-mapped and sampled at the pixel's own footprint, so nothing shimmers.
//  - Two passes: the still garden into a texture (only when the camera moves), then a light pass
//    to the screen that adds the moving water (ripples, the jet, the bowl's overflow). Between
//    camera moves only the light pass runs, and only while the fountain is in view.

export type V3 = [number, number, number];
/** Where the camera looks: the ground point at the frame's principal point, from `dist` metres
 *  away, `pitch` below the horizon (radians), turned by `yaw`, the principal point shifted by
 *  (sx, sy) in clip units. */
export type View = { x: number; z: number; dist: number; pitch: number; yaw: number; fov: number; sx: number; sy: number };
export type Cam = { eye: V3; fwd: V3; right: V3; up: V3; tanX: number; tanY: number; sx: number; sy: number };

const norm = (a: V3): V3 => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

export function camOf(v: View, aspect: number): Cam {
  const cp = Math.cos(v.pitch), sp = Math.sin(v.pitch);
  const fwd = norm([Math.sin(v.yaw) * cp, -sp, -Math.cos(v.yaw) * cp]);
  // straight down, "up" on the frame is the way the camera is turned
  const right = norm(cross(fwd, Math.abs(sp) > 0.9999 ? [Math.sin(v.yaw), 0, -Math.cos(v.yaw)] : [0, 1, 0]));
  const up = cross(right, fwd);
  const tanY = Math.tan(v.fov / 2);
  return { eye: [v.x - fwd[0] * v.dist, -fwd[1] * v.dist, v.z - fwd[2] * v.dist], fwd, right, up, tanX: tanY * aspect, tanY, sx: v.sx, sy: v.sy };
}

/** A world point on the frame, in clip units (x right, y up), and its depth (≤ 0: behind). */
export function project(c: Cam, p: V3): [number, number, number] {
  const d: V3 = [p[0] - c.eye[0], p[1] - c.eye[1], p[2] - c.eye[2]];
  const z = dot(d, c.fwd);
  return [dot(d, c.right) / (z * c.tanX) + c.sx, dot(d, c.up) / (z * c.tanY) + c.sy, z];
}

// the low sun: from the left of the frame and a little beyond (the west, late in the day)
const SUN_EL = (23 * Math.PI) / 180;
const SUN_XZ: [number, number] = (() => { const x = -0.9, z = -0.34, l = Math.hypot(x, z); return [x / l, z / l]; })();
const SUN: V3 = [SUN_XZ[0] * Math.cos(SUN_EL), Math.sin(SUN_EL), SUN_XZ[1] * Math.cos(SUN_EL)];
export const FOUNTAIN: V3 = [0, 0.3, 110.7];

// ---------------------------------------------------------------- shaders
const VS = `#version 300 es
in vec2 a; void main(){ gl_Position = vec4(a, 0., 1.); }`;

const COMMON = `
const float PW = 2.6;
const vec2 C1 = vec2(0., 13.);
const vec2 C4 = vec2(0., 110.7);
const vec2 C7 = vec2(0., 228.);
const vec3 SUNC = vec3(1.0, 0.74, 0.48);
const vec3 SKYC = vec3(0.42, 0.52, 0.68);
const float WY = 0.3;
uniform vec2 uRes; uniform vec3 uEye, uFwd, uRight, uUp, uSun; uniform vec2 uTan, uShift; uniform float uPix;
uniform sampler2D uDetail;
vec3 rayDir(){ vec2 ndc = gl_FragCoord.xy / uRes * 2. - 1. - uShift; return normalize(uFwd + uRight * ndc.x * uTan.x + uUp * ndc.y * uTan.y); }
// the detail texture at world point p, s tiles a metre, for a pixel pw metres across
vec4 det(vec2 p, float s, float pw){ return textureLod(uDetail, p * s, log2(max(pw * s * 512., 1.))); }
vec3 sunLight(vec3 alb, vec3 n, float vis, float ao){
  float l = max(dot(n, uSun), 0.);
  return alb * (SUNC * 4.3 * l * vis + SKYC * (0.55 + 0.45 * n.y) * 0.46 * ao + vec3(0.36, 0.3, 0.2) * 0.22 * (1. - n.y) * ao);
}
// linear light → the print: a soft filmic curve, warm highlights, lifted blacks
vec3 grade(vec3 c){
  c *= 1.02;
  c = (c * (2.51 * c + 0.03)) / (c * (2.43 * c + 0.59) + 0.14);
  c = pow(clamp(c, 0., 1.), vec3(1. / 2.2));
  // a touch of warmth in the highlights, a little lift in the deepest shade
  c = mix(c, c * c * (3. - 2. * c), 0.22);
  // a little richer colour, as a good print has
  c = mix(vec3(dot(c, vec3(0.299, 0.587, 0.114))), c, 1.02);
  c = c * vec3(0.99, 0.975, 0.945) + vec3(0.012, 0.011, 0.008);
  return c;
}
vec3 skyRefl(vec3 r){
  float u = clamp(r.y, 0., 1.);
  vec3 s = mix(vec3(1.0, 0.80, 0.60), vec3(0.36, 0.52, 0.78), pow(u, 0.55));
  return s * 1.25 + SUNC * 2.5 * pow(max(dot(r, uSun), 0.), 60.);
}
`;

const SCENE_FS = `#version 300 es
precision highp float;
precision highp sampler2D;
${COMMON}
uniform sampler2D uMono; uniform vec4 uMonoBox; uniform vec3 uSunGeo;
layout(location = 0) out vec4 oCol;
layout(location = 1) out vec4 oAux;

float sdBox(vec2 p, vec2 b){ vec2 d = abs(p) - b; return length(max(d, 0.)) + min(max(d.x, d.y), 0.); }
float sdRing(vec2 p, float r, float w){ return abs(length(p) - r) - w; }
float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float cov(float d, float pw){ return smoothstep(pw, -pw, d); }

// ---------------- the plan: each layer a 2D distance field (negative inside)
const float HW = 11.;  // the woods' canopy
const float HY = 2.2;  // clipped yew
const float HR = 0.78; // roses
const float HB = 0.5;  // clipped box, and stone at that height

float woodsD(vec2 p){
  float e = 4.5 * textureLod(uDetail, p * 0.0045, 0.).r + 1.8 * textureLod(uDetail, p * 0.019 + 0.37, 0.).r;
  float s = max(abs(p.x) - (31.5 + e + 14. * smoothstep(4., -14., p.y) * step(-56., p.y)), max(-52. - e - p.y, p.y - 263. - e));
  return -s - (textureLod(uDetail, p / 90., 0.).g - 0.55) * 3.;
}
// the woods' outline without its crowns (for its shadow: one soft edge, not a crown's each)
float woodsS(vec2 p){
  float e = 4.5 * textureLod(uDetail, p * 0.0045, 0.).r + 1.8 * textureLod(uDetail, p * 0.019 + 0.37, 0.).r;
  float s = max(abs(p.x) - (31.5 + e + 14. * smoothstep(4., -14., p.y) * step(-56., p.y)), max(-52. - e - p.y, p.y - 263. - e));
  return -s;
}
vec2 yewL(vec2 p){
  float ax = abs(p.x), d = 1e3, m = 12.;
  if (p.y > -2.6 && p.y < 251.6) d = sdBox(vec2(ax - 26.3, p.y - 124.5), vec2(0.7, 126.4));
  if (p.y < 3.) {
    d = min(d, sdBox(vec2(ax - 15.25, p.y + 0.7), vec2(11.75, 0.7)));
    float pr = sdBox(vec2(ax - 3.0, p.y + 0.7), vec2(0.42, 0.9));
    if (pr < d) { d = pr; m = 11.; }
  } else {
    float zc = p.y < 110.7 ? 94.7 : p.y < 145. ? 126.7 : p.y < 206. ? 163.7 : 249.7;
    d = min(d, zc > 249. ? sdBox(vec2(p.x, p.y - zc), vec2(27., 0.7)) : sdBox(vec2(ax - 14.1, p.y - zc), vec2(11.5, 0.7)));
    if (p.y > 212.) { vec2 q = p - C7; d = min(d, max(sdRing(q, 13.2, 0.7), -q.y - 1.5)); }
  }
  return vec2(d, m);
}
float sdSeg(vec2 p, vec2 a, vec2 b){ vec2 pa = p - a, ba = b - a; return length(pa - ba * clamp(dot(pa, ba) / dot(ba, ba), 0., 1.)); }
// one parterre (9.6 × 7.3 m half-size), in its own coordinates: x = the inner frame with its
// corners scooped out, y = the central oval
vec2 parterreF(vec2 u){
  vec2 m = abs(u);
  float inner = max(sdBox(m, vec2(8.3, 6.0)), -(length(m - vec2(8.3, 6.0)) - 1.75));
  float ov = (length(m / vec2(3.7, 2.55)) - 1.) * 2.55;
  return vec2(inner, ov);
}
float broderie(vec2 u){
  vec2 m = abs(u), f = parterreF(u);
  float d = abs(sdBox(u, vec2(9.2, 6.9))) - 0.2;
  d = min(d, abs(f.x) - 0.17);
  d = min(d, abs(f.y) - 0.17);
  // the heart: a ring of four C-scrolls round a clipped ball, each scroll curling in at its ends
  float an = atan(m.y, m.x);
  float rr = length(u);
  d = min(d, max(abs(rr - 1.55) - 0.13, 0.42 - abs(an - 0.785) * 1.55));
  vec2 cu = m - vec2(cos(0.785), sin(0.785)) * 1.55;
  vec2 cr = vec2(cu.x * 0.7071 + cu.y * 0.7071, -cu.x * 0.7071 + cu.y * 0.7071);
  vec2 cs = vec2(cr.x, abs(cr.y)) - vec2(0.05, 0.52);
  d = min(d, max(sdRing(cs, 0.3, 0.11), -cs.x - 0.08));
  // arms from the oval out to each scooped corner, a round at each end of the long axis and the short
  d = min(d, sdSeg(m, vec2(3.15, 1.62), vec2(6.95, 4.75)) - 0.15);
  d = min(d, sdRing(m - vec2(6.55, 0.), 0.95, 0.15));
  d = min(d, sdRing(m - vec2(0., 4.45), 0.8, 0.15));
  return d;
}
vec2 boxL(vec2 p){
  float ax = abs(p.x);
  if (p.y < -1.) {
    // the forecourt, edged in low box (open where the walk comes through the gate)
    float d = abs(sdBox(p - vec2(0., -16.2), vec2(18.25, 14.25))) - 0.2;
    return vec2(max(d, min(PW + 0.25 - ax, p.y + 3.)), 10.);
  }
  if (p.y < 26.) {
    vec2 c = p - C1;
    float d = sdRing(c, 7.15, 0.22);
    vec2 mu = (p - uMonoBox.xy) / (2. * uMonoBox.z) + 0.5;
    if (max(abs(mu.x - 0.5), abs(mu.y - 0.5)) < 0.5) d = min(d, textureLod(uMono, mu, 0.).r - 0.5);
    return vec2(d, 10.);
  }
  if (p.y < 64.) return vec2(broderie(vec2(ax - 14., p.y - (p.y < 45.45 ? 35.5 : 55.4))), 10.);
  if (p.y < 94.) return vec2(abs(sdBox(vec2(ax - 14.05, p.y - 79.2), vec2(10.95, 13.95))) - 0.2, 10.);
  if (p.y < 127.) {
    vec2 c = p - C4;
    float rim = sdRing(c, 5.9, 0.32);
    float hb = max(sdRing(c, 12.8, 0.2), PW + 0.35 - min(ax, abs(c.y)));
    return rim < hb ? vec2(rim, 11.) : vec2(hb, 10.);
  }
  if (p.y < 164.) {
    vec2 l = vec2(ax - (ax < 9.2 ? 6.4 : ax < 14.8 ? 12.0 : 17.6), p.y - (p.y < 145. ? 136.5 : 153.5));
    return vec2(abs(sdBox(l, vec2(2.2, 6.5)) + 0.19) - 0.19, 10.);
  }
  if (p.y < 207.) return vec2(1e3, 10.);
  return vec2(length(p - C7) - 5.4, 11.);
}
// the rose beds: distance, and which roses (0 white, 1 blush, 2 deep rose)
vec2 roseL(vec2 p){
  if (p.y < 128. || p.y > 162.) return vec2(1e3, 0.);
  float ax = abs(p.x);
  float ci = ax < 9.2 ? 0. : ax < 14.8 ? 1. : 2.;
  float ri = p.y < 145. ? 0. : 1.;
  vec2 l = vec2(ax - (6.4 + ci * 5.6), p.y - (136.5 + ri * 17.));
  float d = sdBox(l, vec2(1.74, 6.04)) - (textureLod(uDetail, p / 6.7, 0.).g - 0.5) * 0.22;
  return vec2(d, mod(ci + ri * 2., 3.));
}
// the ground: distance to the gravel (negative on it); other: what's beside it (1 lawn, 2 meadow, 5 parterre)
float gravelD(vec2 p, out float other){
  float ax = abs(p.x), walk = ax - PW;
  other = 1.;
  if (ax > 26.9) { other = 2.; return 1e3; }
  if (p.y < -1.4) {
    if (ax > 25.4 || p.y < -31.6) other = 2.;
    return sdBox(p - vec2(0., -16.2), vec2(18.6, 14.6));
  }
  if (p.y < 26.) { float r = length(p - C1); return max(min(walk, r - 10.5), 7.4 - r); }
  if (p.y < 64.) { other = 5.; return -sdBox(vec2(ax - 14., p.y - (p.y < 45.45 ? 35.5 : 55.4)), vec2(9.6, 7.3)); }
  if (p.y < 94.) return walk;
  if (p.y < 127.) { vec2 c = p - C4; return min(min(walk, abs(c.y) - PW), length(c) - 12.6); }
  if (p.y < 214.) return walk;
  { vec2 c = p - C7; return min(max(walk, c.y + 7.4), length(c) - 7.8); }
}

// ---------------- the 3D pieces
struct Obj { float t; float cov; vec3 n; vec3 alb; float y; float kind; };
// ray against an ellipsoid: t (or -1), and how far the ray passes from it (in radii)
vec2 ell(vec3 ro, vec3 rd, vec3 c, vec3 r){
  vec3 o = (ro - c) / r, d = rd / r;
  float a = dot(d, d), b = dot(o, d), cc = dot(o, o) - 1.;
  float m = sqrt(max(dot(o, o) - b * b / a, 0.)) - 1.;
  float h = b * b - a * cc;
  return vec2(h < 0. ? -1. : (-b - sqrt(h)) / a, m);
}
void crown(vec3 ro, vec3 rd, vec3 c, vec3 r, float tone, float pw, inout Obj o){
  vec2 e = ell(ro, rd, c, r);
  if (e.y > 0.25) return;
  // leafy outline: the edge breaks up into its lumps
  float t = e.x > 0. ? e.x : dot(c - ro, rd);
  vec3 q = ro + rd * t;
  vec2 uv = q.xz + (q - c).xz * 0.6 + tone * 13.;
  float lump = textureLod(uDetail, uv / 21., 0.).g;
  float m = e.y - (lump - 0.6) * 0.22;
  float cv = cov(m * r.x, pw * t);
  if (cv <= 0.01 || t >= o.t) return;
  vec3 p = q;
  vec3 n = normalize((p - c) / (r * r));
  // billows of leaves: soft lumps a metre or so across, smaller ones on them
  float lod = log2(max(pw * t / 9. * 512., 1.));
  float e2 = 0.12;
  float c0 = textureLod(uDetail, uv / 9., lod).r, cx = textureLod(uDetail, (uv + vec2(e2, 0.)) / 9., lod).r, cz = textureLod(uDetail, (uv + vec2(0., e2)) / 9., lod).r;
  float lod2 = log2(max(pw * t / 2.6 * 512., 1.));
  vec4 L = textureLod(uDetail, uv / 2.6, lod2);
  float lx = textureLod(uDetail, (uv + vec2(0.05, 0.)) / 2.6, lod2).g, lz = textureLod(uDetail, (uv + vec2(0., 0.05)) / 2.6, lod2).g;
  n = normalize(n + vec3(c0 - cx, 0., c0 - cz) * 9. + vec3(L.g - lx, 0., L.g - lz) * 1.4);
  o.t = t; o.cov = cv; o.n = n; o.y = p.y; o.kind = 1.;
  o.alb = mix(vec3(0.026, 0.042, 0.016), vec3(0.036, 0.052, 0.018), tone) * mix(0.55, 1.15, smoothstep(0.25, 0.75, c0)) * mix(0.7, 1.1, L.g);
}
// a clipped yew cone: apex hc, base radius rc
void cone(vec3 ro, vec3 rd, vec2 c, float hc, float rc, float pw, inout Obj o){
  vec3 oc = ro - vec3(c.x, 0., c.y);
  float k = rc / hc, k2 = k * k;
  float a = rd.x * rd.x + rd.z * rd.z - k2 * rd.y * rd.y;
  float b = oc.x * rd.x + oc.z * rd.z + k2 * (hc - oc.y) * rd.y;
  float cc = oc.x * oc.x + oc.z * oc.z - k2 * (hc - oc.y) * (hc - oc.y);
  float h = b * b - a * cc;
  // where the ray passes closest to the axis, how far outside the cone's radius it is
  vec2 dh = rd.xz; float tq = -dot(oc.xz, dh) / max(dot(dh, dh), 1e-5);
  float yq = clamp(oc.y + rd.y * tq, 0., hc);
  tq = (oc.y - yq) / -rd.y;
  float gap = (length(oc.xz + rd.xz * tq) - rc * (1. - yq / hc)) * 0.92;
  float t = -1.;
  if (h > 0.) { float s = sqrt(h); float t1 = (-b - s) / a; float y1 = oc.y + rd.y * t1; if (y1 >= 0. && y1 <= hc) t = t1; }
  float tt = t > 0. ? t : tq;
  float cv = t > 0. ? 1. : cov(gap, pw * tt);
  if (cv <= 0.01 || tt >= o.t) return;
  vec3 p = oc + rd * tt;
  vec3 n = normalize(vec3(p.x, k * length(p.xz) + 1e-3, p.z));
  vec3 wp = ro + rd * tt;
  vec2 cu = vec2(atan(p.x, p.z) * 1.1, wp.y) * 1.6;
  float lod = log2(max(pw * tt / 5. * 512., 1.));
  float c0 = textureLod(uDetail, cu / 5., lod).g, cx = textureLod(uDetail, (cu + vec2(0.06, 0.)) / 5., lod).g, cz = textureLod(uDetail, (cu + vec2(0., 0.06)) / 5., lod).g;
  vec3 tg = normalize(vec3(p.z, 0., -p.x));
  n = normalize(n + tg * (c0 - cx) * 3. + vec3(0., 1., 0.) * (c0 - cz) * 2.);
  o.t = tt; o.cov = cv; o.n = n; o.y = wp.y; o.kind = 2.;
  o.alb = vec3(0.021, 0.05, 0.026) * mix(0.45, 1.15, c0);
}
// a vertical cylinder: hit from outside on its wall or its top
void cyl(vec3 ro, vec3 rd, vec2 c, float r, float y0, float y1, vec3 alb, float kind, float pw, inout Obj o){
  vec2 oc = ro.xz - c;
  float a = dot(rd.xz, rd.xz), b = dot(oc, rd.xz), cc = dot(oc, oc) - r * r;
  // the top
  float tt = (ro.y - y1) / -rd.y;
  vec2 pt = oc + rd.xz * tt;
  float dt = length(pt) - r;
  if (dt < pw * tt && tt < o.t) {
    float cv = cov(dt, pw * tt);
    if (cv > 0.5 || o.cov < 0.5) { o.t = tt; o.cov = max(cv, 0.02); o.n = vec3(0., 1., 0.); o.alb = alb; o.y = y1; o.kind = kind; return; }
  }
  float h = b * b - a * cc;
  if (h <= 0.) return;
  float t = (-b - sqrt(h)) / a;
  float y = ro.y + rd.y * t;
  if (t <= 0. || y < y0 || y > y1 || t >= o.t) return;
  o.t = t; o.cov = 1.; o.n = vec3((oc + rd.xz * t) / r, 0.).xzy; o.alb = alb; o.y = y; o.kind = kind;
}

Obj objects(vec3 ro, vec3 rd, float pix){
  Obj o; o.t = 1e9; o.cov = 0.; o.n = vec3(0., 1., 0.); o.alb = vec3(0.); o.y = 0.; o.kind = 0.;
  // where the ray is at crown height and at cone height
  vec3 p5 = ro + rd * ((ro.y - 5.) / -rd.y);
  vec3 p1 = ro + rd * ((ro.y - 1.2) / -rd.y);
  // the lime allée: two rows of clipped crowns
  if (p5.z > 160. && p5.z < 212.) {
    float s = sign(p5.x);
    float k = clamp(floor((p5.z - 168.) / 4.6 + 0.5), 0., 7.);
    for (int i = -1; i <= 1; i++) { float kk = clamp(k + float(i), 0., 7.); float hh = h21(vec2(kk, s)); crown(ro, rd, vec3(s * (5.3 + hh * 0.3), 4.9 + hh * 0.5, 168. + kk * 4.6), vec3(2.55, 1.7, 2.6) * (0.92 + 0.14 * hh), hh, pix, o); }
  }
  // two great trees beside the pavilion
  if (p5.z > 200. && p5.z < 232.) crown(ro, rd, vec3(sign(p5.x) * 17.2, 7.6, 214.), vec3(5.0, 3.9, 5.0), 0.3, pix, o);
  // yew cones: the topiary lawn's grid, the corners of the monogram court and of the fountain court, the pavilion's pair
  float ax = abs(p1.x), s1 = sign(p1.x);
  if (p1.z > 63. && p1.z < 95. && ax > 4.) {
    float ci = clamp(floor((ax - 8.) / 6. + 0.5), 0., 2.), ri = clamp(floor((p1.z - 69.2) / 10. + 0.5), 0., 2.);
    cone(ro, rd, vec2(s1 * (8. + ci * 6.), 69.2 + ri * 10.), 2.9, 1.0, pix, o);
    if (ri > 0.) cone(ro, rd, vec2(s1 * (8. + ci * 6.), 69.2 + (ri - 1.) * 10.), 2.9, 1.0, pix, o);
  } else if (p1.z < -1.5 && p1.z > -33. && ax > 18.) {
    // the forecourt: clipped cones along its edges, low enough that their shadows stay at the edge
    float fk = (p1.z + 28.6) / 4.5, k = clamp(floor(fk + 0.5), 0., 6.);
    cone(ro, rd, vec2(s1 * 21.5, -28.6 + k * 4.5), 2.3, 0.8, pix, o);
    cone(ro, rd, vec2(s1 * 21.5, -28.6 + clamp(k + (fract(fk) < 0.5 ? -1. : 1.), 0., 6.) * 4.5), 2.3, 0.8, pix, o);
  } else if (p1.z > -1. && p1.z < 27.) {
    cone(ro, rd, vec2(s1 * 13.6, p1.z < 13. ? 4.4 : 21.6), 2.7, 0.95, pix, o);
  } else if (p1.z > 95. && p1.z < 127.) {
    cone(ro, rd, vec2(s1 * 11.2, C4.y + (p1.z < C4.y ? -11.2 : 11.2)), 3.1, 1.1, pix, o);
  } else if (p1.z > 208. && p1.z < 222.) {
    cone(ro, rd, vec2(s1 * 4.3, 214.6), 2.5, 0.85, pix, o);
  }
  // a clipped box ball in the heart of each parterre
  if (p1.z > 26. && p1.z < 64. && abs(abs(p1.x) - 14.) < 3.) {
    vec3 bc = vec3(sign(p1.x) * 14., 0.72, p1.z < 45.45 ? 35.5 : 55.4);
    vec2 e = ell(ro, rd, bc, vec3(0.8, 0.74, 0.8));
    float tb = e.x > 0. ? e.x : dot(bc - ro, rd);
    float cb = cov(e.y * 0.8, pix * tb);
    if (cb > 0.01 && tb < o.t) {
      vec3 p = ro + rd * tb, nb = normalize((p - bc) / vec3(0.64, 0.55, 0.64));
      float lod = log2(max(pix * tb / 2.2 * 512., 1.));
      float c0 = textureLod(uDetail, (p.xz + p.y) / 2.2, lod).g;
      o.t = tb; o.cov = cb; o.n = normalize(nb + vec3(c0 - 0.5) * 0.3); o.y = p.y; o.kind = 2.;
      o.alb = vec3(0.026, 0.05, 0.016) * mix(0.5, 1.15, c0);
    }
  }
  // the fountain's bowl on its pedestal
  vec3 pc = ro + rd * ((ro.y - 1.3) / -rd.y);
  if (length(pc.xz - C4) < 3.) {
    cyl(ro, rd, C4, 0.32, WY, 1.06, vec3(0.6, 0.57, 0.5), 3., pix, o);
    cyl(ro, rd, C4, 1.55, 1.06, 1.3, vec3(0.62, 0.59, 0.52), 4., pix, o);
    if (o.kind == 4. && o.n.y > 0.5 && length((ro + rd * o.t).xz - C4) < 1.36) o.alb = vec3(0.035, 0.06, 0.055);
  }
  // the rotunda: a dome on a ring of eight columns
  vec3 pr = ro + rd * ((ro.y - 5.) / -rd.y);
  if (length(pr.xz - C7) < 9.) {
    vec2 e = ell(ro, rd, vec3(C7.x, 5.1, C7.y), vec3(4.35, 3.4, 4.35));
    if (e.x > 0. && e.x < o.t && ro.y + rd.y * e.x > 5.05) {
      vec3 p = ro + rd * e.x;
      vec3 q = p - vec3(C7.x, 5.1, C7.y);
      float rib = abs(fract(atan(q.x, q.z) * 16. / 6.2832) - 0.5);
      o.t = e.x; o.cov = 1.; o.n = normalize(q / vec3(18.9, 11.6, 18.9)); o.y = p.y; o.kind = 5.;
      o.alb = vec3(0.78, 0.75, 0.68) * mix(0.9, 1., smoothstep(0.02, 0.08, rib));
    }
    // the finial
    vec2 f = ell(ro, rd, vec3(C7.x, 8.75, C7.y), vec3(0.32));
    if (f.x > 0. && f.x < o.t) { vec3 p = ro + rd * f.x; o.t = f.x; o.cov = 1.; o.n = normalize(p - vec3(C7.x, 8.75, C7.y)); o.y = p.y; o.kind = 6.; o.alb = vec3(0.62, 0.44, 0.2); }
    // the entablature: a ring of stone under the dome
    cyl(ro, rd, C7, 4.75, 4.35, 5.1, vec3(0.76, 0.73, 0.66), 5., pix, o);
    for (int i = 0; i < 8; i++) {
      float a = float(i) * 0.7854 + 0.3927;
      cyl(ro, rd, C7 + vec2(cos(a), sin(a)) * 4.2, 0.24, HB, 4.35, vec3(0.8, 0.77, 0.7), 5., pix, o);
    }
  }
  return o;
}

// ---------------- the sun: how much of it reaches a point
// each layer's shadow: march toward the sun through its distance field until the ray has risen
// above it, keeping the closest pass (a soft edge that widens with distance)
float visLayers(vec3 W){
  float v = 1.;
  vec2 S = uSunGeo.xy; float tn = uSunGeo.z;
  if (W.y < HY - 0.01) {
    float L = (HY - W.y) / tn, t = 0.02;
    for (int i = 0; i < 16; i++) { float d = yewL(W.xz + S * t).x; float w = 0.02 + 0.045 * t; v = min(v, smoothstep(-w, w, d)); t += clamp(d * 0.9, 0.035, 0.8); if (t > L || v < 0.01) break; }
  }
  if (W.y < HB - 0.01) {
    float L = (HB - W.y) / tn, t = 0.01;
    for (int i = 0; i < 9; i++) { float d = boxL(W.xz + S * t).x; float w = 0.012 + 0.05 * t; v = min(v, smoothstep(-w, w, d)); t += clamp(d * 0.9, 0.025, 0.4); if (t > L || v < 0.01) break; }
  }
  if (W.y < HR - 0.01 && W.z > 126. && W.z < 166.) {
    float L = (HR - W.y) / tn, t = 0.01;
    for (int i = 0; i < 8; i++) { float d = roseL(W.xz + S * t).x; float w = 0.02 + 0.06 * t; v = min(v, smoothstep(-w, w, d)); t += clamp(d * 0.9, 0.03, 0.5); if (t > L || v < 0.01) break; }
  }
  if (abs(W.x) > 18. || W.z < -30. || W.z > 245.) {
    float L = (HW - W.y) / tn, t = 0.1;
    for (int i = 0; i < 12; i++) { float d = woodsS(W.xz + S * t); float w = 0.4 + 0.08 * t; v = min(v, smoothstep(-w, w, d)); t += clamp(d * 0.85, 0.4, 5.); if (t > L || v < 0.01) break; }
  }
  return v;
}
// a crown's shadow: how close the sun's ray passes its middle
float shCrown(vec3 W, vec3 c, vec3 r){
  vec3 o = (c - W) / r, s = uSun / r;
  // sunward of its middle (its own lit side included), a crown can't shade the point
  if (dot(o, s) <= 0.) return 1.;
  float t = dot(o, s) / dot(s, s);
  float m = length(o - s * t) - 1.;
  float cl = textureLod(uDetail, (W.xz + uSun.xz * t) / 9., 0.).g;
  return 1. - smoothstep(0.18, -0.22, m - (cl - 0.5) * 0.35) * 0.97;
}
// a hard-edged ellipsoid's shadow (the dome)
float shEll(vec3 W, vec3 c, vec3 r){
  vec3 o = (c - W) / r, s = uSun / r;
  if (dot(o, s) <= 0.) return 1.;
  float t = dot(o, s) / dot(s, s);
  float m = (length(o - s * t) - 1.) * r.x;
  float w = 0.03 + 0.012 * t * length(s) * r.x;
  return smoothstep(-w, w, m);
}
// a cone's shadow on the plane at the point's height: its section there, drawn out to the apex
float shCone(vec3 W, vec2 c, float hc, float rc){
  if (W.y >= hc) return 1.;
  float L = (hc - W.y) / uSunGeo.z;
  vec2 q = W.xz - c; vec2 S = -uSunGeo.xy;
  float along = dot(q, S), side = abs(q.x * S.y - q.y * S.x);
  float r1 = rc * (1. - W.y / hc);
  float k = clamp(along / L, 0., 1.);
  float d = side - mix(r1, 0.02, k) * (along < 0. ? 0. : 1.);
  if (along < 0.) return 1.;
  d = along > L ? length(q - S * L) : d;
  float w = 0.04 + 0.05 * max(along, 0.);
  return smoothstep(-w, w, d);
}
float visObjects(vec3 W){
  float v = 1.;
  vec2 S = uSunGeo.xy; float tn = uSunGeo.z;
  // where the sun's ray from here reaches crown height
  vec2 q5 = W.xz + S * (5. - W.y) / tn;
  if (q5.y > 160. && q5.y < 210. && abs(q5.x) < 10.) {
    float s = sign(q5.x), k = clamp(floor((q5.y - 168.) / 4.6 + 0.5), 0., 7.);
    for (int i = -1; i <= 1; i++) { float kk = clamp(k + float(i), 0., 7.); float hh = h21(vec2(kk, s)); v *= shCrown(W, vec3(s * (5.3 + hh * 0.3), 4.9 + hh * 0.5, 168. + kk * 4.6), vec3(2.55, 1.7, 2.6) * (0.92 + 0.14 * hh)); }
  }
  vec2 q7 = W.xz + S * (7.6 - W.y) / tn;
  if (q7.y > 205. && q7.y < 223.) v *= shCrown(W, vec3(sign(q7.x) * 17.2, 7.6, 214.), vec3(5.0, 3.9, 5.0));
  // cones
  vec2 q1 = W.xz + S * (1.4 - W.y) / tn;
  float ax = abs(q1.x), s1 = sign(q1.x);
  if (q1.y > 62. && q1.y < 95.) {
    float ci = clamp(floor((ax - 8.) / 6. + 0.5), 0., 2.), ri = clamp(floor((q1.y - 69.2) / 10. + 0.5), 0., 2.);
    v = min(v, shCone(W, vec2(s1 * (8. + ci * 6.), 69.2 + ri * 10.), 2.9, 1.0));
  } else if (q1.y < -1.5 && q1.y > -33. && ax > 18.) {
    float k = clamp(floor((q1.y + 28.6) / 4.5 + 0.5), 0., 6.);
    v = min(v, shCone(W, vec2(s1 * 21.5, -28.6 + k * 4.5), 2.3, 0.8));
  } else if (q1.y > -1. && q1.y < 27.) {
    v = min(v, shCone(W, vec2(s1 * 13.6, q1.y < 13. ? 4.4 : 21.6), 2.7, 0.95));
  } else if (q1.y > 95. && q1.y < 127.) {
    v = min(v, shCone(W, vec2(s1 * 11.2, C4.y + (q1.y < C4.y ? -11.2 : 11.2)), 3.1, 1.1));
  } else if (q1.y > 208. && q1.y < 222.) {
    v = min(v, shCone(W, vec2(s1 * 4.3, 214.6), 2.5, 0.85));
  }
  // the parterres' balls
  if (W.y < 1.4) {
    vec2 qb2 = W.xz + S * (0.8 - W.y) / tn;
    if (qb2.y > 26. && qb2.y < 64. && abs(abs(qb2.x) - 14.) < 3.) v = min(v, shEll(W, vec3(sign(qb2.x) * 14., 0.72, qb2.y < 45.45 ? 35.5 : 55.4), vec3(0.8, 0.74, 0.8)));
  }
  // the bowl over the basin
  if (W.y < 1.3) { vec2 qb = W.xz + S * (1.3 - W.y) / tn - C4; float w = 0.04 + 0.06 * (1.3 - W.y) / tn; v = min(v, smoothstep(-w, w, length(qb) - 1.55)); }
  // the rotunda: the dome's shadow, and the columns'
  vec2 qr = W.xz + S * (5.5 - W.y) / tn - C7;
  if (length(qr) < 9.) {
    v *= shEll(W, vec3(C7.x, 5.1, C7.y), vec3(4.75, 3.45, 4.75));
    if (W.y < 4.35) {
      float L = (4.35 - W.y) / tn;
      for (int i = 0; i < 8; i++) {
        float a = float(i) * 0.7854 + 0.3927;
        vec2 cc = C7 + vec2(cos(a), sin(a)) * 4.2;
        vec2 q = W.xz - cc, D = -S;
        float al = clamp(dot(q, D), 0., L);
        float w = 0.03 + 0.04 * al;
        v = min(v, smoothstep(-w, w, length(q - D * al) - 0.24));
      }
    }
  }
  return v;
}
float sunVis(vec3 W){ return visLayers(W) * visObjects(W); }

// ---------------- materials
vec3 leafNormal(vec2 p, float s, float pw, float k, out float c0){
  float e = 0.35 / (s * 512.);
  c0 = det(p, s, pw).g;
  float cx = det(p + vec2(e, 0.), s, pw).g, cz = det(p + vec2(0., e), s, pw).g;
  return vec3((c0 - cx) * k, 1., (c0 - cz) * k);
}
vec3 shadeTop(vec3 P, float d, vec2 g, float kind, float sub, float pw){
  // a clipped top: flat in the middle, rounding over at the edges
  float R = kind == 12. ? 0.3 : kind == 14. ? 1.4 : 0.09;
  float edge = 1. - smoothstep(0., R, -d);
  float c0;
  vec3 n; vec3 alb;
  if (kind == 14.) {
    // the woods: crowns packed tight, a mix of greens, an early yellow here and there
    vec4 D = det(P.xz, 1. / 90., pw);
    n = leafNormal(P.xz, 1. / 90., pw, 55., c0);
    float c1; vec3 n2 = leafNormal(P.xz + 3.1, 1. / 21., pw, 14., c1);
    n.xz += n2.xz + g * edge * 1.5;
    float id = D.b;
    alb = mix(vec3(0.045, 0.085, 0.026), vec3(0.085, 0.125, 0.032), id);
    alb = mix(alb, vec3(0.11, 0.1, 0.03), step(0.88, id) * 0.7);
    alb *= mix(0.4, 1.12, smoothstep(0.05, 0.8, c0)) * mix(0.75, 1.1, c1);
  } else if (kind == 13.) {
    // roses: dark leaves, the blooms in clusters of the bed's colour
    // the bushes (half a metre across), and the flowers on them (each cluster a hand across)
    n = leafNormal(P.xz, 1. / 8., pw, 3., c0);
    vec4 F = det(P.xz + 3.3, 1. / 3.1, pw);
    float c1; vec3 n2 = leafNormal(P.xz + 3.3, 1. / 3.1, pw, 2., c1);
    n.xz += n2.xz * 0.6 + g * edge * 1.6;
    vec3 bloom = sub < 0.5 ? vec3(0.78, 0.75, 0.66) : sub < 1.5 ? vec3(0.74, 0.46, 0.44) : vec3(0.2, 0.012, 0.035);
    float bl = smoothstep(0.47, 0.84, F.b * 0.55 + F.g * 0.45 + (c0 - 0.5) * 0.3) * 0.9;
    bl = mix(bl, 0.28, smoothstep(0.05, 0.14, pw));
    vec3 leaf = mix(vec3(0.02, 0.038, 0.015), bloom * 0.12, 0.25) * mix(0.45, 1.1, c0);
    alb = mix(leaf, bloom * mix(0.62, 1.05, F.g), bl);
  } else if (kind == 11.) {
    vec4 D = det(P.xz, 0.25, pw);
    n = vec3(g * edge * 3., 1.).xzy;
    c0 = 0.8;
    alb = vec3(0.6, 0.565, 0.49) * (0.92 + 0.12 * D.r);
  } else {
    float s = kind == 12. ? 1. / 6. : 1. / 3.4;
    vec4 D = det(P.xz, s * 0.25, pw);
    n = leafNormal(P.xz, s, pw, 4., c0);
    float c1; vec3 n2 = leafNormal(P.xz + 1.7, s * 3., pw, 2., c1);
    n.xz += n2.xz + g * edge * 1.6;
    c0 = c0 * 0.7 + c1 * 0.3;
    alb = kind == 12. ? vec3(0.016, 0.037, 0.02) : vec3(0.026, 0.05, 0.016);
    alb *= mix(0.45, 1.15, c0) * (0.85 + 0.3 * D.r);
  }
  n = normalize(n);
  float vis = sunVis(P + vec3(0., 0.02, 0.));
  // in the woods each crown shades the next one down-sun
  if (kind == 14.) vis *= smoothstep(0.05, 0.55, c0 + dot(n.xz, uSun.xz) * 0.9);
  float ao = mix(0.5, 1., c0) * (1. - edge * 0.3);
  vec3 c = sunLight(alb, n, vis, ao);
  // a little sheen on clipped leaves in the low sun
  if (kind != 11.) c += SUNC * 0.1 * pow(max(dot(reflect(-uSun, n), normalize(uEye - P)), 0.), 5.) * vis * c0;
  return c;
}
// a layer's side: its own outward normal (the field's slope), darker toward the ground
vec3 shadeSide(vec3 P0, vec3 rd, float kind, vec2 g, float y01, float pw){
  vec3 n = normalize(vec3(g.x, 0.05, g.y));
  if (kind == 14.) n = normalize(vec3(g.x * 0.4, 1., g.y * 0.4));
  vec3 alb = kind == 11. ? vec3(0.5, 0.47, 0.4) : kind == 14. ? vec3(0.022, 0.045, 0.017) : kind == 13. ? vec3(0.022, 0.045, 0.017) : kind == 12. ? vec3(0.016, 0.037, 0.02) : vec3(0.026, 0.05, 0.016);
  float c0 = kind == 11. ? 0.8 : det(vec2(P0.x + P0.z, y01 * 3.), kind == 14. ? 0.05 : 0.2, pw).g;
  float ao = mix(0.3, 1., y01) * mix(0.55, 1.05, c0);
  return sunLight(alb * mix(0.55, 1.1, c0), n, smoothstep(0., 0.6, y01) * 0.9 + 0.1, ao);
}
vec3 lawn(vec2 p, float pw, bool meadow){
  vec4 a = det(p, 0.021, pw), b = det(p, 0.31, pw), c2 = det(p, 0.083, pw);
  if (meadow) {
    float fid = det(p, 0.0021, pw).r;
    vec3 m = mix(vec3(0.05, 0.075, 0.022), vec3(0.11, 0.1, 0.045), smoothstep(0.45, 0.6, fid + a.r * 0.15));
    return m * (0.78 + 0.44 * a.r) * (0.85 + 0.3 * c2.a);
  }
  float w = max(pw, 0.03) * 1.2;
  // mown stripes two metres wide, a soft edge between
  float band = smoothstep(-w, w, sin(p.x * 1.5708) * 0.64);
  float rr = length(p - C1);
  if (p.y > 1. && p.y < 25. && rr < 7.5) band = smoothstep(-w, w, sin(rr * 2.1) * 0.48);
  if (p.y > 27. && p.y < 63.) band = 0.5;
  vec3 c = mix(vec3(0.034, 0.05, 0.018), vec3(0.04, 0.058, 0.02), band);
  return c * (0.82 + 0.36 * a.r) * (0.88 + 0.24 * b.a) * (0.9 + 0.2 * c2.a);
}
// the forecourt: raked gravel, a flagged path down the middle to the gate, a stone kerb inside its box edging
vec3 forecourt(vec2 p, float pw, vec3 gv){
  float see = smoothstep(0.1, 0.035, pw);
  float wv = det(p, 0.035, pw).r;
  gv *= 1. + sin((p.x + wv * 1.1) * 22.44) * 0.07 * see;
  gv *= (0.9 + 0.2 * det(p + 3., 0.011, pw).r) * (0.94 + 0.12 * det(p + 9., 0.05, pw).r);
  float path = abs(p.x) - 1.3;
  if (path < pw * 2.) {
    float cz = (p.y + 1.6) / 0.86, row = floor(cz);
    float fx = (p.x + 1.3 + mod(row, 2.) * 0.65) / 1.3;
    float j = min((0.5 - abs(fract(cz) - 0.5)) * 0.86, (0.5 - abs(fract(fx) - 0.5)) * 1.3);
    float id = h21(vec2(row, floor(fx)));
    vec3 st = vec3(0.6, 0.57, 0.5) * (0.93 + 0.1 * id) * (0.92 + 0.12 * det(p, 0.45, pw).a);
    st *= mix(0.8, 1., smoothstep(0.008, 0.012 + pw, j));
    gv = mix(gv, st, cov(path, pw));
  }
  float inner = sdBox(p - vec2(0., -16.2), vec2(17.95, 13.95));
  vec3 kerb = vec3(0.6, 0.57, 0.5) * (0.92 + 0.12 * det(p, 0.3, pw).a);
  return mix(gv, kerb, cov(abs(inner + 0.11) - 0.11, pw));
}
vec3 gravel(vec2 p, float pw){
  vec4 a = det(p, 0.027, pw), b = det(p, 0.36, pw), m = det(p, 0.085, pw), f = det(p, 1.1, pw);
  vec4 k = det(p + 7.7, 0.19, pw);
  float tone = (0.9 + 0.16 * a.r) * (0.8 + 0.4 * m.a) * (0.78 + 0.44 * k.a) * (0.8 + 0.4 * b.a) * (0.85 + 0.3 * f.a);
  return vec3(0.43, 0.4, 0.34) * tone;
}

void main(){
  vec3 ro = uEye, rd = rayDir();
  float pix = uPix;
  float dy = max(-rd.y, 0.05);
  float t0 = ro.y / dy;
  vec3 P0 = ro + rd * t0;
  float pw0 = t0 * pix / max(dy, 0.3);
  vec3 col = vec3(0.); float T = 1.;
  float water = 0., wvis = 1.;

  Obj ob = objects(ro, rd, pix);
  bool obDone = ob.cov <= 0.01;
  #define OBJ(H) if (!obDone && ob.y > H) { obDone = true; vec3 p = ro + rd * ob.t; float v = sunVis(p + ob.n * 0.05); \
    vec3 c = sunLight(ob.alb, ob.n, v, mix(0.5, 1., ob.n.y * 0.5 + 0.5)); \
    if (ob.kind == 1. || ob.kind == 2.) c += SUNC * vec3(0.5, 0.6, 0.2) * 0.12 * pow(max(dot(rd, uSun), 0.), 3.) ; \
    if (ob.kind == 5.) c += SUNC * 0.25 * pow(max(dot(reflect(-uSun, ob.n), -rd), 0.), 12.) * v; \
    col += T * ob.cov * c; T *= 1. - ob.cov; }

  // the woods' canopy
  float dW0 = woodsD(P0.xz);
  if (dW0 < 30.) {
    float tw = (ro.y - HW) / dy; vec3 P = ro + rd * tw; float pw = tw * pix / max(dy, 0.3);
    float d = woodsD(P.xz);
    float c = cov(d, pw * 2.);
    if (c > 0.) {
      vec2 e = vec2(0.6, 0.);
      vec2 g = normalize(vec2(woodsD(P.xz + e) - d, woodsD(P.xz + e.yx) - d) + 1e-5);
      col += T * c * shadeTop(P, d, g, 14., 0., pw); T *= 1. - c;
    }
    float cs = cov(dW0, pw0 * 2.);
    if (cs > 0. && T > 0.) { vec2 e = vec2(0.6, 0.); vec2 g = normalize(vec2(woodsD(P0.xz + e) - dW0, woodsD(P0.xz + e.yx) - dW0) + 1e-5); col += T * cs * shadeSide(P0, rd, 14., g, clamp(1. - d / max(d - dW0, 1e-3), 0., 1.), pw0); T *= 1. - cs; }
  }
  OBJ(HY)
  // clipped yew
  if (T > 0.003) {
    float ty = (ro.y - HY) / dy; vec3 P = ro + rd * ty; float pw = ty * pix / max(dy, 0.3);
    vec2 L = yewL(P.xz);
    float c = cov(L.x, pw);
    if (c > 0.) {
      vec2 e = vec2(0.05, 0.);
      vec2 g = vec2(yewL(P.xz + e).x - L.x, yewL(P.xz + e.yx).x - L.x) / 0.05;
      col += T * c * shadeTop(P, L.x, g, L.y, 0., pw); T *= 1. - c;
    }
    vec2 L0 = yewL(P0.xz);
    float cs = cov(L0.x, pw0);
    if (cs > 0. && T > 0.) { vec2 e = vec2(0.05, 0.); vec2 g = normalize(vec2(yewL(P0.xz + e).x - L0.x, yewL(P0.xz + e.yx).x - L0.x) + 1e-5); col += T * cs * shadeSide(P0, rd, L0.y, g, clamp(1. - L.x / max(L.x - L0.x, 1e-3), 0., 1.), pw0); T *= 1. - cs; }
  }
  OBJ(HR)
  // roses
  if (T > 0.003 && P0.z > 125. && P0.z < 165.) {
    float tr = (ro.y - HR) / dy; vec3 P = ro + rd * tr; float pw = tr * pix / max(dy, 0.3);
    vec2 L = roseL(P.xz);
    float c = cov(L.x, pw);
    if (c > 0.) {
      vec2 e = vec2(0.05, 0.);
      vec2 g = vec2(roseL(P.xz + e).x - L.x, roseL(P.xz + e.yx).x - L.x) / 0.05;
      col += T * c * shadeTop(P, L.x, g, 13., L.y, pw); T *= 1. - c;
    }
    vec2 L0 = roseL(P0.xz);
    float cs = cov(L0.x, pw0);
    if (cs > 0. && T > 0.) { vec2 e = vec2(0.05, 0.); vec2 g = normalize(vec2(roseL(P0.xz + e).x - L0.x, roseL(P0.xz + e.yx).x - L0.x) + 1e-5); col += T * cs * shadeSide(P0, rd, 13., g, clamp(1. - L.x / max(L.x - L0.x, 1e-3), 0., 1.), pw0); T *= 1. - cs; }
  }
  OBJ(HB)
  // box, and the stone at its height
  vec2 B0 = boxL(P0.xz);
  if (T > 0.003) {
    float tb = (ro.y - HB) / dy; vec3 P = ro + rd * tb; float pw = tb * pix / max(dy, 0.3);
    vec2 L = boxL(P.xz);
    float c = cov(L.x, pw);
    if (c > 0.) {
      vec2 e = vec2(0.03, 0.);
      vec2 g = vec2(boxL(P.xz + e).x - L.x, boxL(P.xz + e.yx).x - L.x) / 0.03;
      col += T * c * shadeTop(P, L.x, g, L.y, 0., pw); T *= 1. - c;
    }
    float cs = cov(B0.x, pw0);
    if (cs > 0. && T > 0.) { vec2 e = vec2(0.03, 0.); vec2 g = normalize(vec2(boxL(P0.xz + e).x - B0.x, boxL(P0.xz + e.yx).x - B0.x) + 1e-5); col += T * cs * shadeSide(P0, rd, B0.y, g, clamp(1. - L.x / max(L.x - B0.x, 1e-3), 0., 1.), pw0); T *= 1. - cs; }
  }
  OBJ(-1.)
  // the ground
  if (T > 0.003) {
    vec2 p = P0.xz;
    float other;
    float g = gravelD(p, other);
    bool basin = length(p - C4) < 5.62;
    vec3 alb;
    float ao = 1.;
    vec3 W = P0;
    if (basin) {
      // the water: its colour here is the still part; the ripples and the light on them come later
      vec3 Pw = ro + rd * ((ro.y - WY) / dy);
      W = Pw;
      water = T;
      wvis = sunVis(Pw + vec3(0., 0.01, 0.));
      float rr = length(Pw.xz - C4);
      vec3 deep = mix(vec3(0.03, 0.06, 0.055), vec3(0.06, 0.085, 0.07), smoothstep(5.6, 3., rr));
      vec3 c = deep * (0.35 + 0.65 * wvis) + skyRefl(reflect(rd, vec3(0., 1., 0.))) * 0.06;
      col += T * c; T = 0.;
    } else {
      vec3 lw = other == 2. ? lawn(p, pw0, true) : lawn(p, pw0, false);
      if (other == 5.) {
        // the parterres' ground: rose gravel, a lawn in the medallion and the corner rounds
        vec2 u = vec2(abs(p.x) - 14., p.y - (p.y < 45.45 ? 35.5 : 55.4)), m = abs(u);
        vec2 f = parterreF(u);
        float gr = min(max(f.x, -f.y), min(length(m - vec2(6.55, 0.)) - 0.8, length(m - vec2(0., 4.45)) - 0.65));
        vec3 gold = gravel(p * 1.3, pw0) * vec3(1.02, 0.86, 0.66);
        lw = mix(gold, lawn(p, pw0, false), cov(gr, pw0));
      }
      vec3 gv = gravel(p, pw0);
      if (p.y < -1.4 && p.y > -31.) gv = forecourt(p, pw0, gv);
      if (p.y > 214. && length(p - C7) < 7.8) {
        // the stone floor round the pavilion: courses in rings, joints between
        float r = length(p - C7);
        float ring = abs(fract(r / 0.92) - 0.5) * 0.92;
        float seg = abs(fract(atan(p.y - C7.y, p.x) * floor(r / 0.92 + 3.) * 1.3 / 6.2832) - 0.5) * r * 6.2832 / max(floor(r / 0.92 + 3.) * 1.3, 1.);
        float j = min(ring, seg);
        vec4 a = det(p, 0.6, pw0);
        gv = vec3(0.55, 0.52, 0.45) * (0.88 + 0.2 * a.a) * mix(0.7, 1., smoothstep(0.0, 0.035 + pw0, j));
      }
      float cg = cov(g, pw0);
      alb = mix(lw, gv, cg);
      // a stone edge where gravel meets grass
      float curb = (1. - smoothstep(0.07, 0.07 + pw0, abs(g - 0.05))) * step(other, 1.5) * step(-1.4, p.y);
      alb = mix(alb, vec3(0.56, 0.53, 0.46), curb * 0.85);
      // the ground darkens into the foot of every hedge
      vec2 Y0 = yewL(p);
      ao = mix(0.45, 1., smoothstep(0., 1.1, Y0.x)) * mix(0.62, 1., smoothstep(0., 0.35, B0.x));
      if (p.y > 126. && p.y < 165.) ao *= mix(0.6, 1., smoothstep(0., 0.35, roseL(p).x));
      if (dW0 < 6.) ao *= mix(0.4, 1., smoothstep(0., 6., dW0));
      float v = sunVis(P0 + vec3(0., 0.01, 0.));
      col += T * sunLight(alb, vec3(0., 1., 0.), v, ao);
    }
  }
  // the air between: a warm haze, thicker with distance and toward the sun
  float sunward = pow(max(dot(rd, normalize(vec3(uSun.x, 0., uSun.z))), 0.), 2.);
  vec3 haze = mix(vec3(0.66, 0.68, 0.66), vec3(1.0, 0.82, 0.58), 0.45 + 0.45 * sunward) * 1.0;
  // (the air between a high camera and the ground is thinner than a long look across it)
  float hd = length(P0.xz - ro.xz);
  col = mix(col, haze, (1. - exp(-(hd * 0.0014 + ro.y * 0.00018))) * 0.55);
  vec3 c = grade(col);
  // the print's grain, and a soft fall-off at the corners
  vec2 uv = gl_FragCoord.xy / uRes;
  c += (h21(gl_FragCoord.xy) - 0.5) * 0.012;
  vec2 vq = uv - 0.5;
  c *= 1. - dot(vq, vq) * 0.2;
  oCol = vec4(c, 1.);
  oAux = vec4(water, wvis, 0., 1.);
}
`;

// the detail texture: one 512² tile that repeats seamlessly.
//  r: soft noise (fbm, 8 cells a tile at its coarsest); g: leaf clumps (packed domes, 16 a tile,
//  with half-size ones in the gaps); b: which clump; a: fine grain (64 and 128 a tile)
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

// the light pass: the still garden, with the water moving on it
const COMP_FS = `#version 300 es
precision highp float;
precision highp sampler2D;
${COMMON}
uniform sampler2D uScene, uAux; uniform float uT;
out vec4 o;
float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
void main(){
  vec2 uv = gl_FragCoord.xy / uRes;
  vec3 c = texture(uScene, uv).rgb;
  vec4 aux = texture(uAux, uv);
  vec3 ro = uEye, rd = rayDir();
  if (aux.r > 0.004) {
    vec3 P = ro + rd * ((ro.y - WY) / -rd.y);
    vec2 q = P.xz - C4; float r = length(q);
    float t = uT;
    // rings spreading from where the bowl's overflow lands, and a breeze across the rest
    float ph = r * 6.2 - t * 2.1;
    float amp = 0.16 * exp(-(r - 1.6) * 0.42) * smoothstep(1.4, 1.9, r);
    vec2 g = (q / max(r, 1e-3)) * cos(ph) * amp;
    // a breeze across the rest: two soft swells drifting different ways
    vec2 wq = P.xz * 0.045 + vec2(t * 0.006, t * 0.004);
    float n0 = textureLod(uDetail, wq, 0.).r, nx = textureLod(uDetail, wq + vec2(0.004, 0.), 0.).r, nz = textureLod(uDetail, wq + vec2(0., 0.004), 0.).r;
    g += vec2(n0 - nx, n0 - nz) * 7.;
    vec2 wq2 = P.xz * 0.09 - vec2(t * 0.009, t * 0.012);
    float m0 = textureLod(uDetail, wq2, 0.).r, mx = textureLod(uDetail, wq2 + vec2(0.003, 0.), 0.).r, mz = textureLod(uDetail, wq2 + vec2(0., 0.003), 0.).r;
    g += vec2(m0 - mx, m0 - mz) * 4.;
    vec3 n = normalize(vec3(-g.x, 1., -g.y));
    vec3 rf = reflect(rd, n);
    float fr = 0.08 + 0.92 * pow(1. - max(dot(n, -rd), 0.), 4.);
    vec3 deep = mix(vec3(0.012, 0.028, 0.026), vec3(0.03, 0.05, 0.042), smoothstep(5.6, 2.5, r));
    vec3 sky = skyRefl(rf);
    // the rim reflected round the edge
    sky = mix(sky, vec3(0.5, 0.47, 0.4) * (0.4 + 0.6 * aux.g), smoothstep(4.9, 5.6, r) * 0.7);
    vec3 w = deep * (0.35 + 0.65 * aux.g) + sky * (fr * 0.55 + 0.035);
    // sparkle where the sun catches a ripple
    float sp = pow(max(dot(rf, uSun), 0.), 40.) * aux.g;
    w += SUNC * sp * 1.6;
    c = mix(c, grade(w), aux.r);
  }
  // the bowl: churned white where the jet comes down into it
  {
    vec3 Pb = ro + rd * ((ro.y - 1.27) / -rd.y);
    float rb = length(Pb.xz - C4);
    if (rb < 1.36) {
      float n = textureLod(uDetail, (Pb.xz - C4) * 0.35 + vec2(uT * 0.05, -uT * 0.04), 0.).a;
      float n2 = textureLod(uDetail, (Pb.xz - C4) * 0.8 - vec2(uT * 0.09, uT * 0.07), 0.).a;
      float foam = smoothstep(0.35, 0.75, n * 0.5 + n2 * 0.5 + 0.45 - rb * 0.5) * smoothstep(1.36, 1.1, rb);
      c = mix(c, vec3(0.9, 0.9, 0.86), foam * 0.85);
    }
  }
  // the jet, and the water falling from the bowl's lip
  vec2 oc = ro.xz - C4; vec2 d2 = rd.xz;
  float tq = -dot(oc, d2) / max(dot(d2, d2), 1e-5);
  float yq = ro.y + rd.y * tq;
  float rq = length(oc + d2 * tq);
  if (rq < 2.2 && yq > 0. && yq < 4.) {
    float t = uT;
    // the jet: a column rising to 2.9 m, its top opening out
    float jy = clamp((yq - 1.3) / 2.1, 0., 1.);
    float R = mix(0.22, 0.85, pow(jy, 2.));
    float n = textureLod(uDetail, vec2(atan(oc.x + d2.x * tq, oc.y + d2.y * tq) * 0.16, yq * 0.21 - t * 0.33), 0.).a;
    float jet = exp(-pow(rq / R, 2.)) * smoothstep(1.28, 1.42, yq) * (1. - smoothstep(3.0, 3.5, yq)) * (0.55 + 0.6 * n);
    vec3 lit = vec3(0.95, 0.93, 0.88) * (0.55 + 0.6 * max(dot(normalize(vec3(-d2.x, 0.2, -d2.y)), uSun), 0.)) ;
    c = mix(c, lit, clamp(jet * 1.3, 0., 0.9));
    // the overflow: a thin curtain falling from the bowl's lip
    float a2 = dot(d2, d2), b2 = dot(oc, d2), cc2 = dot(oc, oc) - 1.56 * 1.56, h2 = b2 * b2 - a2 * cc2;
    if (h2 > 0.) {
      float tc = (-b2 - sqrt(h2)) / a2; float yc = ro.y + rd.y * tc;
      if (yc > WY && yc < 1.08) {
        vec2 pc = oc + d2 * tc;
        float st = textureLod(uDetail, vec2(atan(pc.x, pc.y) * 1.4, yc * 0.05 - t * 0.09), 0.).a;
        c = mix(c, vec3(0.86, 0.88, 0.86), (0.35 + 0.4 * st) * smoothstep(WY, WY + 0.25, yc));
      }
    }
  }
  c += (h21(gl_FragCoord.xy + fract(uT) * 17.) - 0.5) * 0.004;
  o = vec4(c, 1.);
}
`;

// ---------------------------------------------------------------- the monogram's distance field
const MONO_PX = 512;
/** The couple's initials as the box hedge of the monogram court: a distance field (metres,
 *  ±0.5, stored as 0.5 + d) over a square `half` metres from the court's middle. */
function monogramField(text: string, font: string, half: number): Uint8Array {
  const N = MONO_PX, out = new Uint8Array(N * N).fill(255);
  const cv = document.createElement("canvas");
  cv.width = cv.height = N;
  const c = cv.getContext("2d", { willReadFrequently: true });
  if (!c || !text.trim()) return out;
  const m2px = N / (2 * half);
  // fit the letters inside the lawn (≈ 10 m across, 5.4 m high)
  let size = 5.6 * m2px * 1.25;
  c.font = `500 ${size}px ${font}`;
  const w = c.measureText(text).width;
  size *= Math.min(1, (9.6 * m2px) / Math.max(1, w));
  c.font = `500 ${size}px ${font}`;
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.fillStyle = "#fff";
  c.strokeStyle = "#fff";
  c.lineJoin = "round";
  c.lineWidth = 0.16 * m2px; // a clipped hedge is never thinner than this
  const mt = c.measureText(text);
  const y = N / 2 + (mt.actualBoundingBoxAscent - mt.actualBoundingBoxDescent) / 2;
  c.fillText(text, N / 2, y);
  c.strokeText(text, N / 2, y);
  const img = c.getImageData(0, 0, N, N).data;
  const inside = new Uint8Array(N * N);
  for (let i = 0; i < N * N; i++) inside[i] = img[i * 4 + 3] > 127 ? 1 : 0;
  const dOut = edt(inside, N, 0), dIn = edt(inside, N, 1);
  for (let i = 0; i < N * N; i++) {
    const d = (Math.sqrt(dIn[i]) - Math.sqrt(dOut[i])) / m2px; // metres, negative inside
    out[i] = Math.max(0, Math.min(255, Math.round((0.5 + Math.max(-0.5, Math.min(0.5, d))) * 255)));
  }
  return out;
}
// squared distance (px²) from each pixel to the nearest pixel whose mask is `target` (Felzenszwalb)
function edt(mask: Uint8Array, N: number, target: 0 | 1): Float32Array {
  const INF = 1e12, g = new Float32Array(N * N), f = new Float32Array(N), d = new Float32Array(N), v = new Int32Array(N), z = new Float32Array(N + 1);
  const pass = (get: (i: number) => number, set: (i: number, x: number) => void) => {
    for (let i = 0; i < N; i++) f[i] = get(i);
    let k = 0; v[0] = 0; z[0] = -INF; z[1] = INF;
    for (let q = 1; q < N; q++) {
      let s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
      while (s <= z[k]) { k--; s = (f[q] + q * q - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]); }
      k++; v[k] = q; z[k] = s; z[k + 1] = INF;
    }
    k = 0;
    for (let q = 0; q < N; q++) { while (z[k + 1] < q) k++; d[q] = (q - v[k]) * (q - v[k]) + f[v[k]]; }
    for (let i = 0; i < N; i++) set(i, d[i]);
  };
  for (let i = 0; i < N * N; i++) g[i] = mask[i] === target ? 0 : INF;
  for (let x = 0; x < N; x++) pass((i) => g[i * N + x], (i, val) => { g[i * N + x] = val; });
  for (let y = 0; y < N; y++) pass((i) => g[y * N + i], (i, val) => { g[y * N + i] = val; });
  return g;
}

// ---------------------------------------------------------------- the renderer
export type Garden = {
  /** Match the canvas to its box (scale ≤ 1.25 device pixels a CSS pixel). */
  size: (scale: number) => void;
  /** The initials clipped in the monogram court. */
  monogram: (text: string, font: string) => void;
  /** Draw a frame: `still` false redraws the garden itself (the camera moved). */
  draw: (cam: Cam, time: number, still: boolean) => void;
  dispose: () => void;
};

export function createGarden(cv: HTMLCanvasElement): Garden | null {
  const gl = cv.getContext("webgl2", { antialias: false, alpha: false, depth: false, stencil: false, premultipliedAlpha: false, powerPreference: "high-performance" });
  if (!gl) return null;
  const compile = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error("promenade shader:", gl.getShaderInfoLog(s));
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
  const scene = program(SCENE_FS), comp = program(COMP_FS), bake = program(BAKE_FS);
  if (!scene || !comp || !bake) return null;
  const tri = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, tri);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  const tex = (w: number, h: number, fmt: number, ifmt: number, type: number, data: ArrayBufferView | null, mip = false) => {
    const t = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, ifmt, w, h, 0, fmt, type, data);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, mip ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    const wrap = mip ? gl.REPEAT : gl.CLAMP_TO_EDGE;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
    return t;
  };

  // bake the detail tile once
  const detail = tex(512, 512, gl.RGBA, gl.RGBA8, gl.UNSIGNED_BYTE, null, true);
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
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  const MONO_HALF = 6.2;
  const mono = tex(MONO_PX, MONO_PX, gl.RED, gl.R8, gl.UNSIGNED_BYTE, new Uint8Array(MONO_PX * MONO_PX).fill(255));

  // the still garden and its water mask, at the canvas's size
  let W = 0, H = 0, fbo: WebGLFramebuffer | null = null, colT: WebGLTexture | null = null, auxT: WebGLTexture | null = null;
  const target = () => {
    if (fbo) gl.deleteFramebuffer(fbo);
    if (colT) gl.deleteTexture(colT);
    if (auxT) gl.deleteTexture(auxT);
    colT = tex(W, H, gl.RGBA, gl.RGBA8, gl.UNSIGNED_BYTE, null);
    auxT = tex(W, H, gl.RGBA, gl.RGBA8, gl.UNSIGNED_BYTE, null);
    fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, colT, 0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT1, gl.TEXTURE_2D, auxT, 0);
    gl.drawBuffers([gl.COLOR_ATTACHMENT0, gl.COLOR_ATTACHMENT1]);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  };

  const uni = new Map<WebGLProgram, Map<string, WebGLUniformLocation | null>>();
  const U = (p: WebGLProgram, n: string) => {
    let m = uni.get(p);
    if (!m) uni.set(p, (m = new Map()));
    if (!m.has(n)) m.set(n, gl.getUniformLocation(p, n));
    return m.get(n) ?? null;
  };
  const common = (p: WebGLProgram, c: Cam) => {
    gl.uniform2f(U(p, "uRes"), W, H);
    gl.uniform3fv(U(p, "uEye"), c.eye);
    gl.uniform3fv(U(p, "uFwd"), c.fwd);
    gl.uniform3fv(U(p, "uRight"), c.right);
    gl.uniform3fv(U(p, "uUp"), c.up);
    gl.uniform3fv(U(p, "uSun"), SUN);
    gl.uniform2f(U(p, "uTan"), c.tanX, c.tanY);
    gl.uniform2f(U(p, "uShift"), c.sx, c.sy);
    gl.uniform1f(U(p, "uPix"), (2 * c.tanY) / Math.max(1, H));
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, detail);
    gl.uniform1i(U(p, "uDetail"), 0);
  };
  let have = false;

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
    monogram(text, font) {
      gl.bindTexture(gl.TEXTURE_2D, mono);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, MONO_PX, MONO_PX, gl.RED, gl.UNSIGNED_BYTE, monogramField(text, font, MONO_HALF));
      have = false;
    },
    draw(cam, time, still) {
      if (!fbo) return;
      if (!still || !have) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
        gl.viewport(0, 0, W, H);
        gl.useProgram(scene);
        common(scene, cam);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, mono);
        gl.uniform1i(U(scene, "uMono"), 1);
        gl.uniform4f(U(scene, "uMonoBox"), 0, 13, MONO_HALF, 0);
        gl.uniform3f(U(scene, "uSunGeo"), SUN_XZ[0], SUN_XZ[1], Math.tan(SUN_EL));
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        have = true;
      }
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, W, H);
      gl.useProgram(comp);
      common(comp, cam);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, colT);
      gl.uniform1i(U(comp, "uScene"), 1);
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, auxT);
      gl.uniform1i(U(comp, "uAux"), 2);
      gl.uniform1f(U(comp, "uT"), time);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
    dispose() {
      if (fbo) gl.deleteFramebuffer(fbo);
      [colT, auxT, detail, mono].forEach((t) => t && gl.deleteTexture(t));
      gl.deleteBuffer(tri);
      gl.deleteVertexArray(vao);
      [scene, comp, bake].forEach((p) => gl.deleteProgram(p));
      gl.deleteShader(vs);
    },
  };
}

