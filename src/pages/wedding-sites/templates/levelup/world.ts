// Level Up's world: a low-poly island, real 3D, drawn with WebGL2.
//  - Terrain: a faceted island from noise (sand, grass, forest, rock), a summit for the castle.
//  - Water: a wavy faceted sea, turquoise over the shallows, foam on the shore (it reads the
//    island's height from a texture), sun glints, out to the horizon.
//  - Trees, rocks, five landmarks (campfire village, lighthouse, treasure chest, windmill,
//    castle), a quest gem with a beam of light over each landmark on the route, drifting clouds.
//  - The camera flies between viewpoints: `route` lists the views the page stops at, `at` is
//    where along it the camera is (fractions: in flight), `intro` (0→1) swoops it down from
//    above the clouds. Tall frames (phones) use their own, further-back views.

type V3 = number[];
export type PlaceKey = "village" | "lighthouse" | "chest" | "windmill" | "castle";
export const PLACE_KEYS: PlaceKey[] = ["village", "lighthouse", "chest", "windmill", "castle"];
export const PLACES: Record<PlaceKey, { x: number; z: number; y: number; r: number }> = {
  village: { x: -26, z: 20, y: 3.2, r: 9 },
  lighthouse: { x: -50, z: -24, y: 7.5, r: 6 },
  chest: { x: 34, z: 40, y: 0.9, r: 5 },
  windmill: { x: 38, z: -12, y: 7, r: 6 },
  castle: { x: 6, z: -12, y: 21, r: 9 },
};
/** The view index of each place (0 is the whole island). */
export const VIEW_OF: Record<PlaceKey, number> = { village: 1, lighthouse: 2, chest: 3, windmill: 4, castle: 5 };

// ---------------------------------------------------------------- noise and the land
const hash = (x: number, y: number) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
const vn = (x: number, y: number) => {
  const i = Math.floor(x), j = Math.floor(y), f = x - i, g = y - j, u = f * f * (3 - 2 * f), v = g * g * (3 - 2 * g);
  return (hash(i, j) * (1 - u) + hash(i + 1, j) * u) * (1 - v) + (hash(i, j + 1) * (1 - u) + hash(i + 1, j + 1) * u) * v;
};
const fbm = (x: number, y: number) => { let s = 0, a = 0.5; for (let k = 0; k < 5; k++) { s += a * vn(x, y); x = x * 2.03 + 1.7; y = y * 2.03 + 9.2; a *= 0.5; } return s; };
const ss = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const R = 62;
/** The island's height at (x, z). */
export function heightAt(x: number, z: number) {
  const r = Math.hypot(x, z) / R, ang = Math.atan2(z, x);
  const coast = 1 + 0.16 * (vn(ang * 1.6 + 3, 0.5) - 0.5) * 2 + 0.07 * (vn(ang * 5 + 7, 2) - 0.5) * 2;
  const m = 1 - ss(0.62 * coast, 1.0 * coast, r);
  let h = m * (2.2 + 9 * (fbm(x * 0.028 + 5, z * 0.028 + 1) - 0.35));
  const c = PLACES.castle;
  h += 19 * Math.exp(-((x - c.x) ** 2 + (z - c.z) ** 2) / (2 * 15 ** 2)) * m;
  const l = PLACES.lighthouse;
  h += 6 * Math.exp(-((x - l.x) ** 2 + (z - l.z) ** 2) / (2 * 7 ** 2));
  h = h * m + (1 - m) * -7;
  for (const p of Object.values(PLACES)) {
    const d = Math.hypot(x - p.x, z - p.z);
    const w = 1 - ss(p.r * 0.6, p.r * 1.25, d);
    h = h * (1 - w) + p.y * w;
  }
  return h;
}

// ---------------------------------------------------------------- geometry
const hex = (h: string): V3 => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];
const jit = (col: V3, k: number, s: number): V3 => { const j = (hash(s * 1.3, s * 7.1) - 0.5) * k; return [col[0] * (1 + j), col[1] * (1 + j), col[2] * (1 + j * 0.8)]; };

function buildMeshes() {
  let verts: number[] = []; // x y z r g b e (e: glows)
  const tri = (a: V3, b: V3, c: V3, col: V3, e = 0) => { for (const p of [a, b, c]) verts.push(p[0], p[1], p[2], col[0], col[1], col[2], e); };
  const quad = (a: V3, b: V3, c: V3, d: V3, col: V3, e = 0) => { tri(a, b, c, col, e); tri(a, c, d, col, e); };
  const take = () => { const out = new Float32Array(verts); verts = []; return out; };
  const COL = { sand: hex("#e9d29a"), sandWet: hex("#c9b07a"), grass: hex("#7cbf5a"), grass2: hex("#5ea84b"), forest: hex("#3f8a43"), rock: hex("#8f8a86"), rock2: hex("#a7a19a"), cliff: hex("#b9a98d") };

  // the terrain: a grid, two triangles a cell, each coloured by its height and steepness
  const N = 150, S = 190, step = S / N, x0 = -S / 2;
  const hs: number[] = [];
  for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) hs.push(heightAt(x0 + i * step, x0 + j * step));
  const P = (i: number, j: number): V3 => [x0 + i * step, hs[j * (N + 1) + i], x0 + j * step];
  const landCol = (a: V3, b: V3, c: V3, s: number) => {
    const y = (a[1] + b[1] + c[1]) / 3;
    const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
    const ny = Math.abs(n[1]) / Math.hypot(n[0], n[1], n[2]);
    const cx = (a[0] + b[0] + c[0]) / 3, cz = (a[2] + b[2] + c[2]) / 3;
    let col: V3;
    if (y < 0.2) col = COL.sandWet;
    else if (y < 1.6) col = COL.sand;
    else if (ny < 0.72) col = y > 12 ? COL.rock : COL.cliff;
    else if (y > 17) col = ny < 0.85 ? COL.rock2 : COL.grass2;
    else col = fbm(cx * 0.06, cz * 0.06) > 0.52 ? COL.forest : vn(cx * 0.2, cz * 0.2) > 0.5 ? COL.grass : COL.grass2;
    return jit(col, 0.14, s);
  };
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const a = P(i, j), b = P(i + 1, j), c = P(i + 1, j + 1), d = P(i, j + 1);
    if (Math.max(a[1], b[1], c[1], d[1]) < -6.5) continue;
    if ((i + j) % 2) { tri(a, d, b, landCol(a, d, b, i * 3 + j * 7)); tri(b, d, c, landCol(b, d, c, i * 5 + j * 11)); }
    else { tri(a, d, c, landCol(a, d, c, i * 3 + j * 7)); tri(a, c, b, landCol(a, c, b, i * 5 + j * 11)); }
  }

  const prism = (cx: number, cy: number, cz: number, r0: number, r1: number, h: number, n: number, col: V3, e = 0, rot = 0, cap = true) => {
    for (let k = 0; k < n; k++) {
      const a0 = rot + (k / n) * Math.PI * 2, a1 = rot + ((k + 1) / n) * Math.PI * 2;
      const p0 = [cx + Math.cos(a0) * r0, cy, cz + Math.sin(a0) * r0], p1 = [cx + Math.cos(a1) * r0, cy, cz + Math.sin(a1) * r0];
      const q0 = [cx + Math.cos(a0) * r1, cy + h, cz + Math.sin(a0) * r1], q1 = [cx + Math.cos(a1) * r1, cy + h, cz + Math.sin(a1) * r1];
      if (r1 > 0.0001) quad(p0, p1, q1, q0, col, e); else tri(p0, p1, [cx, cy + h, cz], col, e);
      if (cap && r1 > 0.0001) tri([cx, cy + h, cz], q0, q1, col, e);
    }
  };
  const box = (cx: number, cy: number, cz: number, w: number, h: number, d: number, col: V3, e = 0, ry = 0) => {
    const cs = Math.cos(ry), sn = Math.sin(ry);
    const p = (x: number, y: number, z: number): V3 => [cx + x * cs - z * sn, cy + y, cz + x * sn + z * cs];
    const W = w / 2, D = d / 2;
    const v = [p(-W, 0, -D), p(W, 0, -D), p(W, 0, D), p(-W, 0, D), p(-W, h, -D), p(W, h, -D), p(W, h, D), p(-W, h, D)];
    const f = (a: number, b: number, c: number, d2: number, s: number) => quad(v[a], v[b], v[c], v[d2], jit(col, 0.06, s), e);
    f(0, 1, 5, 4, 1); f(1, 2, 6, 5, 2); f(2, 3, 7, 6, 3); f(3, 0, 4, 7, 4); f(4, 5, 6, 7, 5);
  };
  const roof = (cx: number, cy: number, cz: number, w: number, h: number, d: number, col: V3, ry = 0) => {
    const cs = Math.cos(ry), sn = Math.sin(ry);
    const p = (x: number, y: number, z: number): V3 => [cx + x * cs - z * sn, cy + y, cz + x * sn + z * cs];
    const W = w / 2 + 0.25, D = d / 2 + 0.2;
    const a = p(-W, 0, -D), b = p(W, 0, -D), c = p(W, 0, D), d2 = p(-W, 0, D), r0 = p(-W, h, 0), r1 = p(W, h, 0);
    quad(a, b, r1, r0, col); quad(c, d2, r0, r1, jit(col, 0.2, 9)); tri(a, r0, d2, col); tri(b, c, r1, col);
  };
  const ico = (cx: number, cy: number, cz: number, r: number, col: V3, sy = 1, e = 0, seed = 0) => {
    const t = (1 + Math.sqrt(5)) / 2;
    const V = [[-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1]].map((v) => { const l = Math.hypot(v[0], v[1], v[2]); return v.map((c) => c / l); });
    const F = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]];
    const w = V.map((v, i) => { const k = 1 + (hash(seed + i, seed * 2 + i) - 0.5) * 0.25; return [cx + v[0] * r * k, cy + v[1] * r * sy * k, cz + v[2] * r * k]; });
    F.forEach((f, i) => tri(w[f[0]], w[f[1]], w[f[2]], jit(col, 0.1, seed + i), e));
  };

  // trees: pines and round trees in clusters on the grass, clear of the places and the beach
  const near = (x: number, z: number, pad: number) => Object.values(PLACES).some((p) => Math.hypot(x - p.x, z - p.z) < p.r + pad);
  let placed = 0;
  for (let k = 0; k < 2600 && placed < 420; k++) {
    const x = (hash(k, 1.3) - 0.5) * 140, z = (hash(k, 7.7) - 0.5) * 140, y = heightAt(x, z);
    if (y < 2 || y > 19 || near(x, z, 3) || fbm(x * 0.05 + 3, z * 0.05) < 0.47) continue;
    const e = 0.6, sl = Math.abs(heightAt(x + e, z) - heightAt(x - e, z)) + Math.abs(heightAt(x, z + e) - heightAt(x, z - e));
    if (sl > 1.6) continue;
    const s = 0.75 + hash(k, 3) * 0.6;
    prism(x, y - 0.2, z, 0.22 * s, 0.16 * s, 1.1 * s, 5, hex("#7a5236"));
    if (hash(k, 9) > 0.45) {
      const g = jit(hex(hash(k, 4) > 0.5 ? "#2f7d45" : "#3a8f4c"), 0.15, k);
      prism(x, y + 0.7 * s, z, 1.35 * s, 0, 2.3 * s, 6, g, 0, hash(k, 2) * 3);
      prism(x, y + 1.9 * s, z, 1.0 * s, 0, 1.9 * s, 6, jit(g, 0.1, k + 1), 0, hash(k, 5) * 3);
    } else ico(x, y + 1.6 * s, z, 1.35 * s, hex(hash(k, 4) > 0.5 ? "#5fae4e" : "#79bf55"), 0.95, 0, k);
    placed++;
  }
  for (let k = 0; k < 600; k++) {
    const x = (hash(k, 21) - 0.5) * 150, z = (hash(k, 23) - 0.5) * 150, y = heightAt(x, z);
    if (y < -0.5 || y > 1.6 || near(x, z, 2) || hash(k, 25) > 0.25) continue;
    ico(x, y + 0.1, z, 0.5 + hash(k, 27) * 0.7, hex("#9c968e"), 0.6, 0, k + 50);
  }

  const pl = PLACES;
  {
    // the village: three cottages round a campfire
    const { x, y, z } = pl.village;
    ([[-4.5, -2, 0.4, "#f1e3c6", "#c8553d"], [4, -3.2, -0.5, "#e8d8b8", "#a8432f"], [0.5, 4.8, 1.6, "#f4ead2", "#d06a3c"]] as [number, number, number, string, string][]).forEach(([dx, dz, ry, wall, rf]) => {
      box(x + dx, y, z + dz, 3, 2, 2.4, hex(wall), 0, ry); roof(x + dx, y + 2, z + dz, 3, 1.5, 2.4, hex(rf), ry);
      box(x + dx + Math.cos(ry) * 0.2, y, z + dz + 1.21, 0.6, 1.1, 0.04, hex("#6b4a32"), 0, ry);
    });
    for (let k = 0; k < 4; k++) box(x + Math.cos(k * 1.57) * 0.5, y, z + Math.sin(k * 1.57) * 0.5, 1.4, 0.25, 0.3, hex("#6b4529"), 0, k * 1.57 + 0.4);
    prism(x, y + 0.2, z, 0.55, 0, 1.3, 5, hex("#ff8a2a"), 1);
    prism(x, y + 0.25, z, 0.32, 0, 1.0, 5, hex("#ffd14a"), 1, 0.6);
    for (let k = 0; k < 8; k++) ico(x + Math.cos(k * 0.785) * 1.1, y + 0.15, z + Math.sin(k * 0.785) * 1.1, 0.25, hex("#8e8a84"), 0.6, 0, k);
  }
  {
    // the lighthouse: red and white bands, a glowing lamp room
    const { x, y, z } = pl.lighthouse;
    const bands = 6, h = 9;
    for (let b = 0; b < bands; b++) prism(x, y + (b * h) / bands, z, 1.6 - (b * 0.55) / bands, 1.6 - ((b + 1) * 0.55) / bands, h / bands, 10, hex(b % 2 ? "#f4f0e8" : "#d6453a"), 0, 0, false);
    prism(x, y + h, z, 1.45, 1.45, 0.25, 10, hex("#3c3f46"));
    prism(x, y + h + 0.25, z, 0.85, 0.85, 1.2, 8, hex("#ffe48a"), 1);
    prism(x, y + h + 1.45, z, 1.1, 0, 1.0, 8, hex("#b8342c"));
    box(x + 2.4, y, z + 1.2, 2.2, 1.4, 1.8, hex("#efe7d8"), 0, 0.5); roof(x + 2.4, y + 1.4, z + 1.2, 2.2, 1, 1.8, hex("#3e5a74"), 0.5);
  }
  {
    // the treasure chest, half in the sand, coins about it, a palm
    const { x, y, z } = pl.chest;
    box(x, y - 0.1, z, 2.2, 1.2, 1.4, hex("#8a5a2e"), 0, 0.3);
    box(x, y + 1.1, z, 2.25, 0.45, 1.45, hex("#a06a36"), 0, 0.3);
    box(x - 0.6, y - 0.1, z - 0.2, 0.2, 1.6, 1.5, hex("#d9a83a"), 0, 0.3); box(x + 0.6, y - 0.1, z + 0.17, 0.2, 1.6, 1.5, hex("#d9a83a"), 0, 0.3);
    for (let k = 0; k < 14; k++) prism(x + Math.cos(k * 2.1) * (1.6 + hash(k, 2) * 1.4), y + 0.05, z + Math.sin(k * 2.1) * (1.4 + hash(k, 3)), 0.28, 0.28, 0.08, 7, hex("#f2c341"), 0.35);
    prism(x - 3.5, y, z - 2, 0.25, 0.18, 4, 5, hex("#8a6a42")); ico(x - 3.5, y + 4.2, z - 2, 1.0, hex("#5fae4e"), 0.5, 0, 3);
    for (let k = 0; k < 5; k++) prism(x - 3.5, y + 4.1, z - 2, 0.1, 0, 2.6, 3, hex("#4f9a42"), 0, k * 1.25);
  }
  {
    // the windmill's tower (the blades are their own piece, they turn)
    const { x, y, z } = pl.windmill;
    prism(x, y, z, 1.9, 1.3, 6, 8, hex("#f1e6cf"), 0, 0.2);
    prism(x, y + 6, z, 1.55, 0, 1.8, 8, hex("#7b4a36"), 0, 0.2);
    box(x, y, z + 1.6, 0.8, 1.4, 0.3, hex("#6b4a32"));
  }
  {
    // the castle on the summit: walls, four round towers, a keep, pennants
    const { x, y, z } = pl.castle;
    const w = 7, stone = hex("#d8d1c4"), stone2 = hex("#c4bbad");
    [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sz], i) => {
      prism(x + (sx * w) / 2, y, z + (sz * w) / 2, 1.3, 1.2, 5, 9, stone2);
      prism(x + (sx * w) / 2, y + 5, z + (sz * w) / 2, 1.55, 0, 2.6, 9, hex(i % 2 ? "#3f6fb5" : "#d4503e"));
      box(x + (sx * w) / 2, y + 7.4, z + (sz * w) / 2, 0.06, 1.4, 0.06, hex("#3b3b3b"));
      tri([x + (sx * w) / 2, y + 8.8, z + (sz * w) / 2], [x + (sx * w) / 2 + 1.1, y + 8.45, z + (sz * w) / 2], [x + (sx * w) / 2, y + 8.1, z + (sz * w) / 2], hex("#f2c341"));
    });
    box(x, y, z - w / 2, w, 3.2, 0.8, stone); box(x, y, z + w / 2, w, 3.2, 0.8, stone); box(x - w / 2, y, z, 0.8, 3.2, w, stone); box(x + w / 2, y, z, 0.8, 3.2, w, stone);
    for (let k = -3; k <= 3; k += 2) { box(x + k, y + 3.2, z - w / 2, 0.6, 0.6, 0.9, stone); box(x + k, y + 3.2, z + w / 2, 0.6, 0.6, 0.9, stone); }
    box(x, y, z, 3.2, 7, 3.2, stone);
    roof(x, y + 7, z, 3.2, 2.2, 3.2, hex("#3f6fb5"));
    box(x, y, z + w / 2 + 0.05, 1.6, 2.2, 0.1, hex("#5a3d28"));
  }
  const land = take();

  // the windmill's blades, round the hub at the origin, facing +z
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
    const pt = (r: number, t: number): V3 => [c * r - s * t, s * r + c * t, 0];
    quad(pt(0.4, -0.12), pt(4.2, -0.12), pt(4.2, 0.12), pt(0.4, 0.12), hex("#6b4a32"));
    quad(pt(1.3, 0.12), pt(4.2, 0.12), pt(4.2, 1.2), pt(1.3, 1.0), hex("#f4ecd8"));
  }
  prism(0, -0.4, 0, 0.35, 0.35, 0.8, 6, hex("#5a3d28"));
  const blades = take();

  // clouds: soft low-poly puffs drifting over the island
  for (let k = 0; k < 16; k++) {
    const cx = (hash(k, 31) - 0.5) * 260, cz = (hash(k, 37) - 0.5) * 260, cy = 58 + hash(k, 41) * 22;
    const n = 3 + Math.floor(hash(k, 43) * 4);
    for (let q = 0; q < n; q++) ico(cx + (q - n / 2) * 4.2 + hash(k, q) * 2, cy + hash(q, k) * 1.5, cz + (hash(k + q, 5) - 0.5) * 4, 3.2 + hash(k, q + 9) * 2.4, hex("#ffffff"), 0.55, 0, k * 10 + q);
  }
  const clouds = take();

  // the quest gem: an octahedron at the origin
  {
    const t = [0, 1.6, 0], b = [0, -1.6, 0], ring = [[1, 0, 0], [0, 0, 1], [-1, 0, 0], [0, 0, -1]];
    for (let k = 0; k < 4; k++) { const p = ring[k], q = ring[(k + 1) % 4]; tri(t, p, q, hex("#7ff0ff"), 0.85); tri(b, q, p, hex("#3fc6e8"), 0.85); }
  }
  const gem = take();

  // the beam: an open cylinder, 40 high; the lighthouse's lamp: two long flat cones
  for (let k = 0; k < 12; k++) {
    const a0 = (k / 12) * 6.283, a1 = ((k + 1) / 12) * 6.283, r = 0.7;
    const P0 = [Math.cos(a0) * r, 0, Math.sin(a0) * r], P1 = [Math.cos(a1) * r, 0, Math.sin(a1) * r];
    const Q0 = [P0[0] * 0.6, 40, P0[2] * 0.6], Q1 = [P1[0] * 0.6, 40, P1[2] * 0.6];
    quad(P0, P1, Q1, Q0, [0, 0, 0]);
  }
  const beam = take();
  {
    const L = 30, w = 2.6;
    for (const s of [1, -1]) { const tip = [0, 0, 0], a = [s * L, -1.2, -w], b = [s * L, -1.2, w], c = [s * L, 1.2, 0]; tri(tip, a, b, [0, 0, 0]); tri(tip, b, c, [0, 0, 0]); tri(tip, c, a, [0, 0, 0]); }
  }
  const lamp = take();
  return { land, blades, clouds, gem, beam, lamp };
}

// ---------------------------------------------------------------- shaders
const LIT_VS = `#version 300 es
in vec3 aPos; in vec4 aCol;
uniform mat4 uVP, uModel;
out vec3 vPos; flat out vec4 vCol;
void main(){ vec4 w = uModel * vec4(aPos, 1.); vPos = w.xyz; vCol = aCol; gl_Position = uVP * w; }`;
const LIT_FS = `#version 300 es
precision highp float;
in vec3 vPos; flat in vec4 vCol;
uniform vec3 uSun, uCam, uFog, uSunCol; uniform float uT, uFogNear, uFogFar, uSoft;
out vec4 o;
void main(){
  vec3 n = normalize(cross(dFdx(vPos), dFdy(vPos)));
  if (dot(n, uCam - vPos) < 0.) n = -n;
  float dif = max(dot(n, uSun), 0.);
  float hemi = 0.5 + 0.5 * n.y;
  vec3 base = vCol.rgb;
  vec3 amb = mix(vec3(0.30, 0.30, 0.38), vec3(0.62, 0.74, 0.92), hemi);
  vec3 c = base * (uSunCol * dif * mix(0.95, 0.45, uSoft) + amb * mix(0.55, 0.95, uSoft));
  c = mix(c, base * (0.9 + 0.1 * dif), uSoft * 0.55);
  float flick = 1.15 + 0.25 * sin(uT * 13. + vPos.x * 3.) * sin(uT * 7.3 + vPos.z);
  c = mix(c, base * flick, vCol.a);
  c = mix(c, uFog, smoothstep(uFogNear, uFogFar, length(vPos - uCam)) * 0.92);
  o = vec4(c, 1.);
}`;
const WATER_VS = `#version 300 es
in vec2 aXZ; uniform mat4 uVP; uniform float uT;
out vec3 vPos;
void main(){
  float y = 0.22 * sin(aXZ.x * 0.21 + uT * 0.9) + 0.18 * sin(aXZ.y * 0.17 - uT * 1.1) + 0.1 * sin((aXZ.x + aXZ.y) * 0.5 + uT * 1.7);
  vPos = vec3(aXZ.x, y, aXZ.y);
  gl_Position = uVP * vec4(vPos, 1.);
}`;
const WATER_FS = `#version 300 es
precision highp float;
in vec3 vPos;
uniform sampler2D uHeight; uniform vec3 uSun, uCam, uFog, uSky; uniform float uT, uFogNear, uFogFar, uSpan;
out vec4 o;
void main(){
  vec3 n = normalize(cross(dFdx(vPos), dFdy(vPos)));
  if (n.y < 0.) n = -n;
  vec2 uv = vPos.xz / uSpan + 0.5;
  float ground = (uv.x < 0. || uv.y < 0. || uv.x > 1. || uv.y > 1.) ? -8. : texture(uHeight, uv).r * 40. - 10.;
  float depth = vPos.y - ground;
  vec3 c = mix(vec3(0.33, 0.86, 0.84), vec3(0.10, 0.58, 0.74), smoothstep(0.2, 2.6, depth));
  c = mix(c, vec3(0.07, 0.30, 0.55), smoothstep(2.6, 8., depth));
  vec3 v = normalize(uCam - vPos);
  c = mix(c, uSky, pow(1. - max(dot(n, v), 0.), 3.) * 0.55);
  c *= 0.82 + 0.25 * max(dot(n, uSun), 0.);
  c += vec3(1.0, 0.96, 0.85) * pow(max(dot(reflect(-uSun, n), v), 0.), 70.) * 1.4;
  float foam = smoothstep(0.75, 0.0, depth + 0.18 * sin(uT * 1.6 + vPos.x * 0.4 + vPos.z * 0.3));
  c = mix(c, vec3(0.97, 0.99, 1.0), foam * 0.85);
  c = mix(c, uFog, smoothstep(uFogNear, uFogFar, length(vPos - uCam)) * 0.92);
  o = vec4(c, 1.);
}`;
const SKY_VS = `#version 300 es
in vec2 a; out vec2 vN; void main(){ vN = a; gl_Position = vec4(a, 0.9999, 1.); }`;
const SKY_FS = `#version 300 es
precision highp float;
in vec2 vN; uniform mat4 uInvVP; uniform vec3 uCam, uSun; out vec4 o;
void main(){
  vec4 p = uInvVP * vec4(vN, 1., 1.); vec3 d = normalize(p.xyz / p.w - uCam);
  float h = clamp(d.y, -1., 1.);
  vec3 c = mix(vec3(0.86, 0.92, 0.96), vec3(0.32, 0.58, 0.92), pow(clamp(h, 0., 1.), 0.6));
  float s = max(dot(d, uSun), 0.);
  c = mix(c, vec3(1.0, 0.88, 0.72), pow(s, 6.) * 0.45 * (1. - clamp(h * 2., 0., 1.)));
  c += vec3(1.0, 0.95, 0.82) * (pow(s, 900.) * 2.2 + pow(s, 40.) * 0.25);
  if (h < 0.) c = mix(vec3(0.86, 0.92, 0.96), vec3(0.62, 0.76, 0.86), clamp(-h * 4., 0., 1.));
  o = vec4(c, 1.);
}`;
const BEAM_VS = `#version 300 es
in vec3 aPos; uniform mat4 uVP, uModel; out float vH; out vec3 vL;
void main(){ vec4 w = uModel * vec4(aPos, 1.); vH = aPos.y; vL = aPos; gl_Position = uVP * w; }`;
const BEAM_FS = `#version 300 es
precision highp float;
in float vH; in vec3 vL; uniform vec3 uColor; uniform float uT, uLen, uLamp; out vec4 o;
void main(){
  float a = uLamp > 0.5 ? pow(1. - clamp(abs(vL.x) / uLen, 0., 1.), 2.2) * 0.5 : (1. - smoothstep(0., uLen, vH)) * (0.55 + 0.15 * sin(uT * 3. + vH * 0.4));
  o = vec4(uColor * a, 1.);
}`;

// ---------------------------------------------------------------- matrices
type M4 = number[];
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a: V3): V3 => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const persp = (fov: number, asp: number, n: number, f: number): M4 => { const t = 1 / Math.tan(fov / 2); return [t / asp, 0, 0, 0, 0, t, 0, 0, 0, 0, (f + n) / (n - f), -1, 0, 0, (2 * f * n) / (n - f), 0]; };
const lookAt = (e: V3, c: V3, up: V3): M4 => { const z = norm(sub(e, c)), x = norm(cross(up, z)), y = cross(z, x); return [x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -dot(x, e), -dot(y, e), -dot(z, e), 1]; };
const mul = (a: M4, b: M4): M4 => { const o = new Array(16).fill(0); for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) for (let k = 0; k < 4; k++) o[j * 4 + i] += a[k * 4 + i] * b[j * 4 + k]; return o; };
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
const I4: M4 = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
const T = (x: number, y: number, z: number): M4 => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1];
const RY = (a: number): M4 => [Math.cos(a), 0, -Math.sin(a), 0, 0, 1, 0, 0, Math.sin(a), 0, Math.cos(a), 0, 0, 0, 0, 1];
const RZ = (a: number): M4 => [Math.cos(a), Math.sin(a), 0, 0, -Math.sin(a), Math.cos(a), 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
const S = (s: number): M4 => [s, 0, 0, 0, 0, s, 0, 0, 0, 0, s, 0, 0, 0, 0, 1];
const lerp = (a: V3, b: V3, t: number): V3 => a.map((v, i) => v + (b[i] - v) * t);
const ease = (t: number) => t * t * (3 - 2 * t);

// ---------------------------------------------------------------- the viewpoints
type View = { eye: V3; at: V3; tallEye: V3; tallAt: V3 };
const VIEWS: View[] = [{ eye: [-4, 38, 96], at: [4, 0, 4], tallEye: [-4, 70, 140], tallAt: [2, -14, 0] }];
{
  const offs: Record<PlaceKey, V3> = { village: [20, 12, 22], lighthouse: [22, 10, 16], chest: [-14, 8, 20], windmill: [16, 10, 18], castle: [-22, 12, 24] };
  // wide frames: the place left of centre (the quest card is on the right); tall frames: further
  // back, the place in the top half (the quest card is a sheet at the bottom)
  for (const k of PLACE_KEYS) {
    const p = PLACES[k], o = offs[k], at = [p.x, p.y + 3, p.z], eye = [p.x + o[0], p.y + o[1], p.z + o[2]];
    const f = norm(sub(at, eye)), r = norm(cross(f, [0, 1, 0]));
    VIEWS.push({ eye, at: [at[0] + r[0] * 5, at[1] + 1, at[2] + r[2] * 5], tallEye: [p.x + o[0] * 1.55, p.y + o[1] * 1.7, p.z + o[2] * 1.55], tallAt: [at[0], at[1] - 7, at[2]] });
  }
}
const TITLE = { eye: [10, 150, 180], at: [0, 0, 0] };

export type WorldState = { route: number[]; at: number; intro: number; time: number };
export type Camera = { eye: V3; at: V3 };

/** Builds the island on a canvas. Returns null without WebGL2. */
export function createWorld(cv: HTMLCanvasElement) {
  const gl = cv.getContext("webgl2", { antialias: true, powerPreference: "high-performance" });
  if (!gl) return null;
  const sh = (type: number, src: string) => { const s = gl.createShader(type)!; gl.shaderSource(s, src); gl.compileShader(s); return s; };
  const prog = (vs: string, fs: string) => { const p = gl.createProgram()!; gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p); return gl.getProgramParameter(p, gl.LINK_STATUS) ? p : null; };
  const lit = prog(LIT_VS, LIT_FS), water = prog(WATER_VS, WATER_FS), sky = prog(SKY_VS, SKY_FS), beam = prog(BEAM_VS, BEAM_FS);
  if (!lit || !water || !sky || !beam) return null;
  const U = (p: WebGLProgram) => { const m = new Map<string, WebGLUniformLocation | null>(); return (n: string) => { if (!m.has(n)) m.set(n, gl.getUniformLocation(p, n)); return m.get(n) ?? null; }; };
  const uL = U(lit), uW = U(water), uS = U(sky), uB = U(beam);
  const buffers: WebGLBuffer[] = [], vaos: WebGLVertexArrayObject[] = [];
  const mesh = (data: Float32Array, p: WebGLProgram) => {
    const vao = gl.createVertexArray()!; gl.bindVertexArray(vao); vaos.push(vao);
    const b = gl.createBuffer()!; buffers.push(b); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    const ap = gl.getAttribLocation(p, "aPos"), ac = gl.getAttribLocation(p, "aCol");
    gl.enableVertexAttribArray(ap); gl.vertexAttribPointer(ap, 3, gl.FLOAT, false, 28, 0);
    if (ac >= 0) { gl.enableVertexAttribArray(ac); gl.vertexAttribPointer(ac, 4, gl.FLOAT, false, 28, 12); }
    gl.bindVertexArray(null);
    return { vao, n: data.length / 7 };
  };
  const g = buildMeshes();
  const landM = mesh(g.land, lit), bladeM = mesh(g.blades, lit), cloudM = mesh(g.clouds, lit), gemM = mesh(g.gem, lit), beamM = mesh(g.beam, beam), lampM = mesh(g.lamp, beam);
  // the sea: a fine grid round the island, a coarse ring of it out past the haze
  const wd: number[] = [];
  const seaGrid = (span: number, cells: number, hole = 0) => { const s = span / cells; for (let j = 0; j < cells; j++) for (let i = 0; i < cells; i++) { const x = -span / 2 + i * s, z = -span / 2 + j * s; if (hole && x >= -hole / 2 && x + s <= hole / 2 && z >= -hole / 2 && z + s <= hole / 2) continue; wd.push(x, z, x + s, z, x + s, z + s, x, z, x + s, z + s, x, z + s); } };
  seaGrid(420, 110); seaGrid(2520, 42, 420);
  const waterVao = gl.createVertexArray()!; vaos.push(waterVao); gl.bindVertexArray(waterVao);
  { const b = gl.createBuffer()!; buffers.push(b); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(wd), gl.STATIC_DRAW); const a = gl.getAttribLocation(water, "aXZ"); gl.enableVertexAttribArray(a); gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0); }
  const waterN = wd.length / 2;
  // the island's height, for the sea's shallows and foam
  const HT = 256, SPAN = 200, ht = new Uint8Array(HT * HT * 4);
  for (let j = 0; j < HT; j++) for (let i = 0; i < HT; i++) { const v = Math.max(0, Math.min(255, Math.round(((heightAt(-SPAN / 2 + ((i + 0.5) * SPAN) / HT, -SPAN / 2 + ((j + 0.5) * SPAN) / HT) + 10) / 40) * 255))); ht.set([v, v, v, 255], (j * HT + i) * 4); }
  const htex = gl.createTexture()!; gl.bindTexture(gl.TEXTURE_2D, htex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, HT, HT, 0, gl.RGBA, gl.UNSIGNED_BYTE, ht);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  const skyVao = gl.createVertexArray()!; vaos.push(skyVao); gl.bindVertexArray(skyVao);
  { const b = gl.createBuffer()!; buffers.push(b); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW); const a = gl.getAttribLocation(sky, "a"); gl.enableVertexAttribArray(a); gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0); }
  gl.bindVertexArray(null);

  const sun = norm([0.5, 0.75, 0.35]);
  const fog = [0.86, 0.92, 0.96];
  let prevEye: V3 | null = null, roll = 0;

  const camAt = (route: number[], s: number, tall: boolean): Camera => {
    const k = Math.max(0, Math.min(route.length - 1, s)), i = Math.max(0, Math.min(route.length - 2, Math.floor(k))), t = route.length > 1 ? k - i : 0;
    const A = VIEWS[route[i] ?? 0], B = VIEWS[route[Math.min(route.length - 1, i + 1)] ?? 0], e = ease(t);
    const eye = lerp(tall ? A.tallEye : A.eye, tall ? B.tallEye : B.eye, e); eye[1] += Math.sin(Math.PI * t) * 14;
    const at = lerp(tall ? A.tallAt : A.at, tall ? B.tallAt : B.at, ease(Math.min(1, t * 1.15)));
    return { eye, at };
  };

  const size = () => {
    const r = cv.getBoundingClientRect(), d = Math.min(window.devicePixelRatio || 1, 1.25);
    cv.width = Math.max(1, Math.round(r.width * d)); cv.height = Math.max(1, Math.round(r.height * d));
    gl.viewport(0, 0, cv.width, cv.height);
  };

  const draw = ({ route, at: s, intro, time: t }: WorldState): Camera => {
    const tall = cv.width / cv.height < 0.8;
    let { eye, at } = camAt(route, s, tall);
    const iv = ease(Math.min(1, Math.max(0, intro)));
    if (iv < 1) { eye = lerp(TITLE.eye, eye, iv); at = lerp(TITLE.at, at, iv); eye[1] += Math.sin(Math.PI * iv) * 10; }
    eye = [eye[0] + Math.sin(t * 0.21) * 0.8, eye[1] + Math.sin(t * 0.33) * 0.5, eye[2] + Math.cos(t * 0.17) * 0.8];
    if (prevEye) { const v = sub(eye, prevEye), f = norm(sub(at, eye)), side = dot(v, norm(cross(f, [0, 1, 0]))); roll += (Math.max(-0.25, Math.min(0.25, side * 0.12)) - roll) * 0.08; }
    prevEye = eye;
    const f = norm(sub(at, eye)), r = norm(cross(f, [0, 1, 0])), up0 = cross(r, f);
    const up = norm([up0[0] * Math.cos(roll) + r[0] * Math.sin(roll), up0[1] * Math.cos(roll) + r[1] * Math.sin(roll), up0[2] * Math.cos(roll) + r[2] * Math.sin(roll)]);
    const asp = cv.width / cv.height;
    const VP = mul(persp(asp < 0.8 ? 0.95 : 0.78, asp, 0.5, 1600), lookAt(eye, at, up));
    gl.enable(gl.DEPTH_TEST); gl.depthMask(true); gl.disable(gl.BLEND);
    gl.clearColor(fog[0], fog[1], fog[2], 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(sky); gl.depthMask(false);
    gl.uniformMatrix4fv(uS("uInvVP"), false, inv(VP)); gl.uniform3fv(uS("uCam"), eye); gl.uniform3fv(uS("uSun"), sun);
    gl.bindVertexArray(skyVao); gl.drawArrays(gl.TRIANGLES, 0, 3); gl.depthMask(true);
    gl.useProgram(lit);
    gl.uniformMatrix4fv(uL("uVP"), false, VP); gl.uniform3fv(uL("uSun"), sun); gl.uniform3fv(uL("uCam"), eye); gl.uniform3fv(uL("uFog"), fog); gl.uniform3fv(uL("uSunCol"), [1.0, 0.96, 0.88]);
    gl.uniform1f(uL("uT"), t); gl.uniform1f(uL("uFogNear"), 160); gl.uniform1f(uL("uFogFar"), 700); gl.uniform1f(uL("uSoft"), 0);
    gl.uniformMatrix4fv(uL("uModel"), false, I4); gl.bindVertexArray(landM.vao); gl.drawArrays(gl.TRIANGLES, 0, landM.n);
    const wm = PLACES.windmill;
    gl.uniformMatrix4fv(uL("uModel"), false, mul(T(wm.x, wm.y + 5.2, wm.z + 1.9), RZ(t * 0.9))); gl.bindVertexArray(bladeM.vao); gl.drawArrays(gl.TRIANGLES, 0, bladeM.n);
    gl.uniform1f(uL("uSoft"), 1);
    gl.uniformMatrix4fv(uL("uModel"), false, T(Math.sin(t * 0.03) * 25, 0, 0)); gl.bindVertexArray(cloudM.vao); gl.drawArrays(gl.TRIANGLES, 0, cloudM.n);
    gl.uniform1f(uL("uSoft"), 0);
    // the quest gems over the places on the route; the current one pulses
    const active = route[Math.round(Math.max(0, Math.min(route.length - 1, s)))] ?? 0;
    const onRoute = PLACE_KEYS.filter((k) => route.includes(VIEW_OF[k]));
    onRoute.forEach((k) => {
      const p = PLACES[k], top = k === "lighthouse" ? 14 : k === "castle" ? 15 : k === "windmill" ? 12 : 7, i = VIEW_OF[k];
      const sc = active === i ? 1.25 + 0.1 * Math.sin(t * 5) : 1;
      gl.uniformMatrix4fv(uL("uModel"), false, mul(mul(T(p.x, p.y + top + Math.sin(t * 2 + i) * 0.5, p.z), RY(t * 1.4 + i)), S(sc))); gl.bindVertexArray(gemM.vao); gl.drawArrays(gl.TRIANGLES, 0, gemM.n);
    });
    gl.useProgram(water);
    gl.uniformMatrix4fv(uW("uVP"), false, VP); gl.uniform1f(uW("uT"), t); gl.uniform3fv(uW("uSun"), sun); gl.uniform3fv(uW("uCam"), eye); gl.uniform3fv(uW("uFog"), fog); gl.uniform3fv(uW("uSky"), [0.62, 0.78, 0.95]);
    gl.uniform1f(uW("uFogNear"), 160); gl.uniform1f(uW("uFogFar"), 700); gl.uniform1f(uW("uSpan"), SPAN);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, htex); gl.uniform1i(uW("uHeight"), 0);
    gl.bindVertexArray(waterVao); gl.drawArrays(gl.TRIANGLES, 0, waterN);
    // light: the quest beams and the lighthouse's lamp, added on
    gl.useProgram(beam); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE); gl.depthMask(false);
    gl.uniformMatrix4fv(uB("uVP"), false, VP); gl.uniform1f(uB("uT"), t); gl.uniform1f(uB("uLamp"), 0); gl.uniform1f(uB("uLen"), 40);
    onRoute.forEach((k) => { const p = PLACES[k]; gl.uniform3fv(uB("uColor"), active === VIEW_OF[k] ? [0.35, 0.75, 0.85] : [0.16, 0.36, 0.42]); gl.uniformMatrix4fv(uB("uModel"), false, T(p.x, p.y, p.z)); gl.bindVertexArray(beamM.vao); gl.drawArrays(gl.TRIANGLES, 0, beamM.n); });
    const lh = PLACES.lighthouse;
    gl.uniform3fv(uB("uColor"), [0.42, 0.36, 0.16]); gl.uniform1f(uB("uLen"), 30); gl.uniform1f(uB("uLamp"), 1);
    gl.uniformMatrix4fv(uB("uModel"), false, mul(T(lh.x, lh.y + 9.85, lh.z), RY(t * 0.8))); gl.bindVertexArray(lampM.vao); gl.drawArrays(gl.TRIANGLES, 0, lampM.n);
    gl.depthMask(true); gl.disable(gl.BLEND);
    return { eye, at };
  };

  const dispose = () => {
    buffers.forEach((b) => gl.deleteBuffer(b));
    vaos.forEach((v) => gl.deleteVertexArray(v));
    gl.deleteTexture(htex);
    [lit, water, sky, beam].forEach((p) => gl.deleteProgram(p));
  };
  return { size, draw, dispose };
}
