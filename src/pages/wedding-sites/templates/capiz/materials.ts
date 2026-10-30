// Capiz's materials, drawn in code, pixel by pixel: the capiz shell panes in their narra lattice,
// narra plank, turned balusters, the adobe stone of the silong and the clay roof tiles. Each one
// is a tile that repeats without a seam. Pure arithmetic on an RGBA buffer, so the same code runs
// in the worker (materials.worker.ts) or, without one, on the page.

export type Rgba = Uint8ClampedArray;

// ---- noise: hashed value noise on an integer lattice, optionally periodic (for seamless tiles)
function hash(ix: number, iy: number, seed: number): number {
  let h = Math.imul(ix, 374761393) ^ Math.imul(iy, 668265263) ^ Math.imul(seed + 1, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
const mod = (a: number, n: number) => ((a % n) + n) % n;

/** Value noise in [0, 1]; periodic in x and y with periods px, py (lattice cells) when given. */
export function noise(x: number, y: number, seed: number, px = 0, py = 0): number {
  const xi = Math.floor(x), yi = Math.floor(y);
  const fx = fade(x - xi), fy = fade(y - yi);
  let x0 = xi, x1 = xi + 1, y0 = yi, y1 = yi + 1;
  if (px) { x0 = mod(x0, px); x1 = mod(x1, px); }
  if (py) { y0 = mod(y0, py); y1 = mod(y1, py); }
  const a = hash(x0, y0, seed), b = hash(x1, y0, seed), c = hash(x0, y1, seed), d = hash(x1, y1, seed);
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}
/** Fractal noise in about [0, 1]. */
export function fbm(x: number, y: number, seed: number, oct = 4, px = 0, py = 0): number {
  let s = 0, a = 0.5, n = 0, f = 1;
  for (let i = 0; i < oct; i++) {
    s += a * noise(x * f, y * f, seed + i * 17, px ? px * f : 0, py ? py * f : 0);
    n += a;
    a *= 0.5;
    f *= 2;
  }
  return s / n;
}
const rnd = (n: number, seed: number) => hash(n, 7, seed);
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const smooth = (a: number, b: number, v: number) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); };

// ---------------------------------------------------------------------------------------------
// Capiz: a lattice of shell squares, as seen from the street at dusk with a lamp inside.
// Alpha is how much of the lamp's light a pixel holds back: thin shell lets the warm light
// through (low alpha), the thicker growth bands and the milky patches hold it back and show the
// shell's own cool pearl (higher alpha). The lamp itself is a layer behind (styles.ts), so each
// window's light can fall unevenly and flicker. The muntins are opaque, dark narra.

export interface ShellOpts {
  cols: number;
  rows: number;
  /** One pane's pitch, in pixels (the muntin is centred on the cell's edges). */
  pitch: number;
  /** The muntin's width, in pixels. */
  muntin: number;
  seed: number;
}

export function paintShell(out: Rgba, w: number, h: number, o: ShellOpts) {
  const { cols, rows, pitch: P, muntin: M, seed } = o;
  const half = M / 2;
  const px = (i: number) => i * 4;
  // per pane: where its shell grew from, how it was cut, how thick it is
  type Pane = { ux: number; uy: number; sp: number; maj: number; base: number; warm: number; tilt: number; chip: number; chipS: number; gap: number; gapW: number; crack: number; cx0: number; cy0: number; cx1: number; cy1: number; milk: number };
  const panes: Pane[] = [];
  for (let j = 0; j < rows; j++)
    for (let i = 0; i < cols; i++) {
      const k = (j * cols + i) * 31 + seed * 977;
      const a = rnd(k + 1, seed) * Math.PI * 2, R = P * (0.75 + rnd(k + 2, seed) * 1.9);
      const chipOn = rnd(k + 9, seed) < 0.1, gapOn = rnd(k + 11, seed) < 0.26, crackOn = rnd(k + 13, seed) < 0.025;
      panes.push({
        ux: P / 2 + Math.cos(a) * R,
        uy: P / 2 + Math.sin(a) * R,
        sp: P * (0.018 + rnd(k + 3, seed) * 0.02),
        maj: 4 + rnd(k + 4, seed) * 5,
        base: 0.04 + Math.pow(rnd(k + 5, seed), 1.4) * 0.75 + (rnd(k + 6, seed) < 0.12 ? 0.35 : 0),
        warm: rnd(k + 7, seed),
        tilt: rnd(k + 8, seed) * 6.283,
        chip: chipOn ? Math.floor(rnd(k + 10, seed) * 4) : -1,
        chipS: P * (0.07 + rnd(k + 14, seed) * 0.12),
        gap: gapOn ? Math.floor(rnd(k + 12, seed) * 4) : -1,
        gapW: 0.8 + rnd(k + 15, seed) * 1.6,
        crack: crackOn ? 1 : 0,
        cx0: rnd(k + 16, seed) * P, cy0: rnd(k + 17, seed) * P, cx1: rnd(k + 18, seed) * P, cy1: rnd(k + 19, seed) * P,
        milk: rnd(k + 20, seed),
      });
    }
  for (let y = 0; y < h; y++) {
    const j = Math.min(rows - 1, Math.floor(y / P)), ly = y + 0.5 - j * P;
    for (let x = 0; x < w; x++) {
      const i = Math.min(cols - 1, Math.floor(x / P)), lx = x + 0.5 - i * P;
      const o4 = px(y * w + x);
      // distance into the pane from its muntins (negative: on the wood)
      const ex = Math.min(lx - half, P - half - lx), ey = Math.min(ly - half, P - half - ly);
      const e = Math.min(ex, ey);
      const wood = clamp01(0.5 - e); // coverage of the muntin, anti-aliased
      let r = 0, g = 0, b = 0, al = 0;
      if (wood < 1) {
        const p = panes[j * cols + i], ps = seed * 13 + j * cols + i;
        const dx = lx - p.ux, dy = ly - p.uy;
        const rad = Math.sqrt(dx * dx + dy * dy) || 1;
        const cx = dx / rad, cy = dy / rad; // the direction from the hinge (no seam where the angle wraps)
        // the growth lines: fine, close and concentric round the shell's hinge, wandering only a
        // little; now and then a stronger one, and broad bands where the shell grew thicker
        const warp = (fbm(cx * 1.6 + p.tilt, cy * 1.6 + rad / P * 0.9, ps, 3) - 0.5) * p.sp * 2.2;
        const ph = (rad + warp) / p.sp;
        const q = Math.abs(ph - Math.round(ph));
        const brk = smooth(0.3, 0.7, noise(cx * 7 + ph * 0.25, cy * 7, ps + 3));
        const minor = Math.exp(-(q * q) / 0.02) * (0.3 + 0.7 * brk);
        const ph2 = (rad + warp * 1.3) / (p.sp * p.maj);
        const q2 = Math.abs(ph2 - Math.round(ph2));
        const major = Math.exp(-(q2 * q2) / 0.004) * (0.55 + 0.45 * noise(cx * 4, cy * 4 + ph2, ps + 4));
        const band = smooth(0.25, 0.95, 0.5 + 0.5 * Math.sin(ph2 * 1.9 + noise(cx * 2, cy * 2, ps + 5) * 2.5));
        // fine fibres radiating from the hinge
        const rib = noise(cx * (34 + p.maj * 5), cy * (34 + p.maj * 5) + rad / P * 0.6, ps + 7);
        // cloudy, milky patches (whiter, not darker) and the shell's general thickness
        const mottle = fbm((lx + i * 37.1) / P * 2.2, (ly + j * 51.7) / P * 2.2, seed + 40, 4);
        const milky = smooth(0.4, 0.8, fbm((lx + i * 13.3) / P * 1.6, (ly - j * 9.1) / P * 1.6, seed + 60, 4)) * (0.3 + p.milk * 0.7);
        const groove = 1 - smooth(0, 2.4, e); // the edges sit in the muntin's groove
        // how dark (thick) and how milky each point is
        // laminae: the shell is layered, so it's thicker in patches with soft-edged steps between them
        const lf = fbm((lx + i * 71.3) / P * 1.7 + cx * 0.3, (ly + j * 23.9) / P * 1.7, seed + 90, 3) * 3.2;
        const lam = (Math.floor(lf) + smooth(0.78, 1, lf - Math.floor(lf))) / 3.2;
        // a fine fibrous tooth, like parchment
        const tooth = noise((lx + i * 9.7) * 0.9, (ly + j * 5.3) * 0.22 + cx, ps + 13) - 0.5;
        const dark = Math.min(1, p.base * (0.35 + 0.22 * band + 0.3 * mottle + 0.6 * lam) + 0.2 * major + 0.08 * minor + 0.06 * (rib - 0.5) + 0.05 * tooth + 0.6 * groove);
        // composite: colour C at alpha al over the lamp. Dark shell: a dim warm grey; milky: cream.
        const aDark = 0.05 + 0.5 * dark, aMilk = (0.18 + 0.26 * p.milk) * milky;
        al = aDark + aMilk * (1 - aDark);
        const wMilk = aMilk / Math.max(0.001, al);
        // the shell's own colour: pearl, a touch warmer or cooler pane to pane, greyer where it's thick;
        // milky white in the clouds; a faint play of colour (nacre) along the growth bands
        const iri = ph2 * 2.3 + cx * 1.6 + mottle * 3;
        const ia = 6 * (0.4 + 0.6 * band);
        const dr = 190 + 16 * p.warm, dg = 182 + 8 * p.warm, db = 172 - 4 * p.warm;
        const mr = 250, mg = 249, mb = 246;
        r = dr * (1 - wMilk) + mr * wMilk + ia * Math.sin(iri);
        g = dg * (1 - wMilk) + mg * wMilk + ia * Math.sin(iri + 2.1);
        b = db * (1 - wMilk) + mb * wMilk + ia * Math.sin(iri + 4.2);
        // a sliver of bare light where the shell stops short of the groove, a chipped corner, a crack
        if (p.gap >= 0) {
          const d = p.gap === 0 ? lx - half : p.gap === 1 ? P - half - lx : p.gap === 2 ? ly - half : P - half - ly;
          if (d < p.gapW) al *= 0.1 + 0.9 * smooth(p.gapW - 0.8, p.gapW + 0.4, d);
        }
        if (p.chip >= 0) {
          const qx = p.chip & 1 ? P - half - lx : lx - half, qy = p.chip & 2 ? P - half - ly : ly - half;
          const jag = (noise(qx * 0.4, qy * 0.4, ps + 9) - 0.5) * 2.5;
          const d = qx + qy - p.chipS + jag;
          if (d < 1) al *= 0.06 + 0.94 * clamp01(d);
        }
        if (p.crack) {
          const vx = p.cx1 - p.cx0, vy = p.cy1 - p.cy0, L = vx * vx + vy * vy || 1;
          const s = clamp01(((lx - p.cx0) * vx + (ly - p.cy0) * vy) / L);
          const qx = p.cx0 + vx * s - lx, qy = p.cy0 + vy * s - ly;
          const d = Math.sqrt(qx * qx + qy * qy) + (noise(s * 20, 0, ps + 11) - 0.5) * 0.8;
          if (d < 0.9) { const k = (1 - d / 0.9) * 0.7; al = al * (1 - k) + 0.4 * k; r = r * (1 - k) + 130 * k; g = g * (1 - k) + 96 * k; b = b * (1 - k) + 70 * k; }
        }
        al = Math.min(0.97, Math.max(0.03, al));
      }
      if (wood > 0) {
        // the muntin: dark narra, a rounded face catching the dusk on one side, grain along it
        const vert = ex < ey; // on a vertical muntin (nearer its x edges)
        const s = vert ? (lx < P / 2 ? lx : lx - P) : ly < P / 2 ? ly : ly - P; // across the muntin, -half..half
        const along = vert ? y : x;
        const n = s / half;
        const face = 0.78 + 0.22 * Math.cos(Math.min(1, Math.abs(n)) * 1.5708) + (n < 0 ? 0.06 * (1 + n) : -0.05 * n);
        const grain = 0.85 + 0.3 * fbm(along / 40, (vert ? x : y) / 2.2, seed + 80, 3);
        const k = face * grain;
        const wr = 56 * k, wg = 31 * k, wb = 21 * k;
        r = r * (1 - wood) + wr * wood;
        g = g * (1 - wood) + wg * wood;
        b = b * (1 - wood) + wb * wood;
        al = al * (1 - wood) + wood;
      }
      out[o4] = r; out[o4 + 1] = g; out[o4 + 2] = b; out[o4 + 3] = al * 255;
    }
  }
}

// ---------------------------------------------------------------------------------------------
// Narra: an oiled hardwood plank, the grain running along x (or along y for posts). Seamless.

export function paintWood(out: Rgba, w: number, h: number, { seed, vertical = false, dark = 1 }: { seed: number; vertical?: boolean; dark?: number }) {
  const L = vertical ? h : w, A = vertical ? w : h; // along the grain, across it
  const pu = 3, pv = Math.max(2, Math.round(A / 48)); // noise periods (cells) along and across
  const lines = 7 * pv;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const u = (vertical ? y : x) / L, v = (vertical ? x : y) / A; // 0..1 over the tile
      // long, nearly straight grain that drifts slowly
      const wv = fbm(u * pu, v * pv, seed, 3, pu, pv);
      const ph = v * lines + (wv - 0.5) * 3.2;
      const f = ph - Math.floor(ph);
      const late = smooth(0.62, 0.9, f) * (1 - smooth(0.9, 1, f)); // the dark latewood line
      const fine = noise(u * 9, v * lines * 4, seed + 3, 9, lines * 4); // fine streaks
      const pore = smooth(0.74, 0.96, noise(u * 40, v * lines * 5, seed + 5, 40, lines * 5)); // long pores
      const ribbon = 0.5 + 0.5 * Math.sin(u * 6.283 * 2 + (fbm(u * 2, v * 2, seed + 9, 2, 2, 2) - 0.5) * 5); // the interlocked grain's sheen
      const tone = fbm(u * 2, v * 3, seed + 21, 3, 2, 3);
      const k = dark * (0.8 + 0.32 * tone) * (1 - 0.2 * late) * (0.92 + 0.1 * fine) * (1 - 0.16 * pore) * (0.94 + 0.1 * ribbon);
      const o4 = (y * w + x) * 4;
      out[o4] = 104 * k + 8 * ribbon; out[o4 + 1] = 52 * k + 3 * ribbon; out[o4 + 2] = 34 * k + 2 * ribbon; out[o4 + 3] = 255;
    }
}

// ---------------------------------------------------------------------------------------------
// The ventanilla's turned balusters: one baluster per `pitch` pixels (it repeats along x),
// lathe-turned narra lit softly from the street; the gaps are clear (the lit room shows there).

function balusterR(t: number): number {
  // radius as a share of the pitch, from the top (0) to the bottom (1)
  if (t < 0.07) return 0.36; // the top block
  if (t < 0.1) return 0.3 - (t - 0.07) * 1.2;
  if (t < 0.13) return 0.27 + 0.03 * Math.sin(((t - 0.1) / 0.03) * Math.PI); // a bead
  if (t < 0.3) return 0.15 + 0.12 * Math.pow(1 - (t - 0.13) / 0.17, 2); // into the neck
  if (t < 0.34) return 0.13 + 0.05 * Math.sin(((t - 0.3) / 0.04) * Math.PI); // a ring at the neck
  if (t < 0.78) { const k = (t - 0.34) / 0.44; return 0.13 + 0.19 * Math.pow(Math.sin(k * Math.PI * 0.92 + 0.12), 1.4); } // the vase
  if (t < 0.82) return 0.2 + 0.07 * Math.sin(((t - 0.78) / 0.04) * Math.PI); // a ring
  if (t < 0.88) return 0.22 + (t - 0.82) * 1.6;
  return 0.36; // the bottom block
}
export function paintBalusters(out: Rgba, w: number, h: number, { seed }: { seed: number }) {
  const P = w; // one baluster per tile
  for (let y = 0; y < h; y++) {
    const t = y / h;
    const R = balusterR(t) * P;
    const block = t < 0.07 || t >= 0.88;
    for (let x = 0; x < w; x++) {
      const o4 = (y * w + x) * 4;
      const dx = x + 0.5 - P / 2;
      const cov = clamp01(R - Math.abs(dx) + 0.5);
      if (cov <= 0) { out[o4 + 3] = 0; continue; }
      const nx = Math.max(-1, Math.min(1, dx / Math.max(1, R)));
      const nz = Math.sqrt(Math.max(0, 1 - nx * nx));
      // a cylinder lit from the upper left and the front; a block is flat with dark edges
      let k = block ? 0.62 + 0.18 * (1 - Math.abs(nx)) - (Math.abs(nx) > 0.9 ? 0.25 : 0) : 0.18 + 0.62 * Math.max(0, -0.45 * nx + 0.8 * nz) + 0.22 * Math.pow(Math.max(0, -0.6 * nx + 0.8 * nz), 18);
      // under each bead a little shadow
      const dR = balusterR(Math.max(0, t - 2 / h)) - balusterR(t);
      if (dR > 0.004) k *= 0.72;
      const grain = 0.88 + 0.24 * fbm(x / 3, y / 60, seed, 3);
      k *= grain;
      out[o4] = 104 * k; out[o4 + 1] = 54 * k; out[o4 + 2] = 34 * k; out[o4 + 3] = cov * 255;
    }
  }
}

// ---------------------------------------------------------------------------------------------
// The silong: old Intramuros masonry, volcanic tuff (adobe) with some coral stone, laid in
// irregular courses. Two passes: first the relief (each block's face, worn and chipped at its
// arrises, pitted; the lime mortar set back and crumbling, gone in places; old lime render still
// clinging in patches), then its colour and the weather (water streaks from above, moss and
// lichen low down and in the joints, salt bloom), lit by a low raking light so the relief reads.
// Seamless left to right and top to bottom; drawn large, so a screen never shows it twice.

export interface StoneOpts { seed: number; course: number; coral?: number; render?: number; moss?: number }

export function paintStone(out: Rgba, w: number, h: number, { seed, course, coral = 0.2, render = 0.25, moss = 0.5 }: StoneOpts) {
  // noise that repeats exactly across the tile, at roughly the scale asked for
  const pf = (x: number, y: number, scale: number, oct: number, sd: number) => {
    const nx = Math.max(1, Math.round(w / scale)), ny = Math.max(1, Math.round(h / scale));
    return fbm((x / w) * nx, (y / h) * ny, sd, oct, nx, ny);
  };
  // round pits (vesicles in the tuff, holes in the coral): one maybe per cell of a jittered grid
  const pit = (x: number, y: number, cs: number, sd: number, prob: number) => {
    const nx = Math.max(1, Math.round(w / cs)), ny = Math.max(1, Math.round(h / cs)), cx = w / nx, cy = h / ny;
    const i = Math.floor(x / cx), j = Math.floor(y / cy);
    let best = 0;
    for (let dj = -1; dj <= 1; dj++)
      for (let di = -1; di <= 1; di++) {
        const ii = mod(i + di, nx), jj = mod(j + dj, ny);
        if (hash(ii, jj, sd) > prob) continue;
        const px = (i + di + 0.2 + 0.6 * hash(ii, jj, sd + 1)) * cx, py = (j + dj + 0.2 + 0.6 * hash(ii, jj, sd + 2)) * cy;
        const r = (0.1 + 0.26 * Math.pow(hash(ii, jj, sd + 3), 1.6)) * cx;
        const k = 1 - smooth(r * 0.45, r, Math.hypot(x - px, y - py));
        if (k > best) best = k;
      }
    return best;
  };
  // the courses: irregular heights that add up to the tile's
  const hs: number[] = [];
  for (let acc = 0, k = 0; acc < h - course * 0.5; k++) { const v = course * (0.55 + Math.pow(rnd(k + 3, seed), 1.3) * 0.95); hs.push(v); acc += v; }
  const sum = hs.reduce((a, b) => a + b, 0);
  const rows: { y0: number; y1: number; xs: number[] }[] = [];
  let yy = 0;
  hs.forEach((v, k) => {
    const hh = (v / sum) * h;
    // the blocks along it, from a random start, wrapping round
    const xs: number[] = [];
    let x = rnd(k + 50, seed) * w, total = 0;
    while (total < w - hh * 0.9) { xs.push(x % w); const bw = hh * (0.9 + Math.pow(rnd(k * 31 + xs.length, seed + 7), 0.8) * 2.4); x += bw; total += bw; }
    rows.push({ y0: yy, y1: yy + hh, xs: xs.sort((a, b) => a - b) });
    yy += hh;
  });
  const rowOf = new Int16Array(h);
  rows.forEach((r, k) => { for (let y = Math.floor(r.y0); y < Math.min(h, Math.ceil(r.y1)); y++) rowOf[y] = k; });

  const H = new Float32Array(w * h), A = new Float32Array(w * h * 3);
  const J = Math.max(2.5, course * 0.035); // the joint's half width
  for (let y0 = 0; y0 < h; y0++) {
    for (let x = 0; x < w; x++) {
      // the courses wander a little, as hand-laid ones do
      const y = mod(Math.round(y0 + (pf(x, 0, course * 3, 2, seed + 5) - 0.5) * course * 0.22), h);
      const r = rows[rowOf[y]], ly = y - r.y0, rh = r.y1 - r.y0;
      const xs = r.xs, n = xs.length;
      let bi = n - 1;
      for (let k = 0; k < n; k++) if (x >= xs[k]) bi = k;
      const xl = xs[bi], xr = bi + 1 < n ? xs[bi + 1] : xs[0] + w;
      const dl = x >= xl ? x - xl : x + w - xl, dr = (xr - (x >= xl ? x : x + w));
      const id = rowOf[y] * 64 + bi;
      const isCoral = rnd(id, seed + 11) < coral;
      const wear = 0.5 + rnd(id, seed + 13);
      // the block's edge, chipped and worn back irregularly
      const chip = Math.pow(pf(x, y, course * 0.35, 3, seed + 17), 3) * course * 0.16 * wear + (pf(x, y, course * 0.14, 2, seed + 19) - 0.5) * J * 1.1;
      const e = Math.min(dl, dr, ly, rh - ly) - J - chip;
      const blockK = smooth(-0.5, J * 1.1, e);
      // the face: broad unevenness, a finer tooth, and its pores (tuff: small vesicles; coral: bigger holes)
      const broad = pf(x, y, course * 0.8, 3, seed + 23) - 0.5;
      const tooth = pf(x, y, course * 0.06, 2, seed + 29) - 0.5;
      const pore = isCoral ? Math.max(pit(x, y, course * 0.07, seed + 31, 0.26), pit(x, y, course * 0.03, seed + 33, 0.16) * 0.6) : Math.max(pit(x, y, course * 0.05, seed + 31, 0.09), pit(x, y, course * 0.024, seed + 33, 0.12) * 0.5);
      const face = 1 + broad * 0.22 + tooth * 0.1 - pore * (isCoral ? 0.24 : 0.14) - smooth(0, J * 3, J * 3 - e) * 0.12 * wear;
      // the mortar: set back, crumbling, gone in places
      const crumble = pf(x, y, J * 3, 2, seed + 37);
      const gone = smooth(0.66, 0.78, pf(x, y, course * 0.5, 3, seed + 41));
      const mortar = -0.26 + (crumble - 0.5) * 0.16 - gone * 0.3;
      let hgt = mortar + (face - mortar) * blockK;
      // old lime render, still clinging in patches over block and joint alike
      const rv = pf(x, y, course * 2.2, 4, seed + 43) + (pf(x, y, course * 0.25, 2, seed + 47) - 0.5) * 0.12;
      // worn thin: the stone shows through it here and there
      const rk = smooth(0.69 - render * 0.2, 0.705 - render * 0.2, rv) * (render > 0 ? 1 : 0) * (0.55 + 0.45 * smooth(0.35, 0.6, pf(x, y, course * 0.2, 3, seed + 49)));
      if (rk > 0) hgt = hgt * (1 - rk) + (1.1 + (pf(x, y, course * 0.04, 2, seed + 53) - 0.5) * 0.04) * rk;
      H[y0 * w + x] = hgt;
      // colour
      const tone = rnd(id, seed + 59), hue = rnd(id, seed + 61);
      const mott = pf(x, y, course * 0.5, 3, seed + 67) - 0.5;
      let cr: number, cg: number, cb: number;
      if (isCoral) { cr = 172; cg = 168; cb = 156; } else { cr = 138 + 20 * hue; cg = 130 + 10 * hue; cb = 116 - 2 * hue; }
      const tk = (0.82 + 0.26 * tone + 0.26 * mott) * (1 - pore * 0.3);
      cr *= tk; cg *= tk; cb *= tk;
      // iron staining in the tuff
      const iron = smooth(0.6, 0.8, pf(x, y, course * 0.9, 3, seed + 71)) * (isCoral ? 0 : 0.5);
      cr += 26 * iron; cg += 8 * iron; cb -= 10 * iron;
      // mortar colour
      const mk = 0.86 + 0.24 * crumble - gone * 0.4;
      cr = cr * blockK + 170 * mk * (1 - blockK); cg = cg * blockK + 164 * mk * (1 - blockK); cb = cb * blockK + 150 * mk * (1 - blockK);
      if (rk > 0) { const d = 0.85 + 0.2 * pf(x, y, course * 0.3, 3, seed + 73); cr = cr * (1 - rk) + 204 * d * rk; cg = cg * (1 - rk) + 196 * d * rk; cb = cb * (1 - rk) + 178 * d * rk; }
      // the weather: rain run off the ledge above, streaking down
      const v = y0 / h;
      const streak = smooth(0.45, 0.8, fbm((x / w) * Math.round(w / (course * 0.4)), v * 2, seed + 79, 3, Math.round(w / (course * 0.4)), 2)) * (1 - smooth(0.05, 0.75, v));
      const sk = 1 - 0.38 * streak;
      cr *= sk; cg *= sk * 1.01; cb *= sk * 1.03;
      // moss and lichen: dark green-black low down and in the joints, pale lichen on the faces
      const low = smooth(0.55, 1, v);
      const mz = pf(x, y, course * 0.3, 3, seed + 83);
      const mossK = Math.min(1, moss * (smooth(0.5, 0.7, mz) * (low * 0.9 + (1 - blockK) * 0.7) + low * low * 0.35)) * (1 - rk * 0.7);
      cr = cr * (1 - mossK) + 38 * mossK; cg = cg * (1 - mossK) + 50 * mossK; cb = cb * (1 - mossK) + 30 * mossK;
      const lich = smooth(0.74, 0.8, pf(x, y, course * 0.07, 2, seed + 89)) * blockK * (0.3 + 0.7 * smooth(0.4, 0.8, pf(x, y, course, 2, seed + 97))) * 0.55;
      cr = cr * (1 - lich) + 160 * lich; cg = cg * (1 - lich) + 166 * lich; cb = cb * (1 - lich) + 140 * lich;
      // salt bloom: a white powder where the damp comes out, low and along the joints
      const salt = smooth(0.62, 0.78, pf(x, y, course * 0.18, 3, seed + 101)) * (smooth(0.45, 0.85, v) * 0.6 + (1 - blockK) * 0.4) * (1 - mossK) * 0.6;
      cr = cr * (1 - salt) + 214 * salt; cg = cg * (1 - salt) + 210 * salt; cb = cb * (1 - salt) + 202 * salt;
      const o3 = (y0 * w + x) * 3;
      A[o3] = cr; A[o3 + 1] = cg; A[o3 + 2] = cb;
    }
  }
  // the light: low and raking, from the upper left (the lanterns add their own in the CSS)
  const S = course * 0.022, lx = -0.62, ly2 = -0.5, lz = 0.6;
  const ll = Math.hypot(lx, ly2, lz);
  for (let y = 0; y < h; y++) {
    const ym = (y - 1 + h) % h, yp = (y + 1) % h;
    for (let x = 0; x < w; x++) {
      const xm = (x - 1 + w) % w, xp = (x + 1) % w, i = y * w + x;
      const nx = (H[y * w + xm] - H[y * w + xp]) * S, ny = (H[ym * w + x] - H[yp * w + x]) * S;
      const nl = Math.hypot(nx, ny, 1);
      const diff = Math.max(0, (nx * lx + ny * ly2 + lz) / (nl * ll));
      const ao = 0.66 + 0.34 * clamp01((H[i] + 0.4) / 1.3);
      const k = (0.42 + 0.72 * diff) * ao;
      const o4 = i * 4, o3 = i * 3;
      out[o4] = A[o3] * k; out[o4 + 1] = A[o3 + 1] * k; out[o4 + 2] = A[o3 + 2] * k; out[o4 + 3] = 255;
    }
  }
}

// ---------------------------------------------------------------------------------------------
// Lime plaster (cal): a light, uneven lime wash with old stains and the odd hairline crack. Drawn
// near white, so the CSS can multiply it over the palette's own colour.

export function paintPlaster(out: Rgba, w: number, h: number, { seed }: { seed: number }) {
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const u = x / w, v = y / h;
      const broad = fbm(u * 4, v * 4, seed, 4, 4, 4);
      const wash = fbm(u * 18, v * 18, seed + 5, 3, 18, 18); // the brush's strokes of lime
      const tooth = noise(u * 200, v * 200, seed + 9, 200, 200);
      const stain = smooth(0.62, 0.9, fbm(u * 3, v * 1.5 + broad * 0.6, seed + 13, 4, 3, 2)) * 0.5; // damp, darker
      const cr = Math.abs(fbm(u * 7, v * 7, seed + 21, 4, 7, 7) - 0.5); // a hairline crack along the noise's zero line
      const crack = (1 - smooth(0.0, 0.006, cr)) * smooth(0.55, 0.7, fbm(u * 2, v * 2, seed + 31, 2, 2, 2));
      let k = 0.9 + 0.08 * (broad - 0.5) + 0.05 * (wash - 0.5) + 0.03 * (tooth - 0.5) - 0.1 * stain - 0.22 * crack;
      k = Math.min(1, k + 0.08);
      const o4 = (y * w + x) * 4;
      out[o4] = 255 * k; out[o4 + 1] = 250 * k - 4 * stain; out[o4 + 2] = 240 * k - 12 * stain; out[o4 + 3] = 255;
    }
}

// ---------------------------------------------------------------------------------------------
// Marble for the plaque: warm white, soft clouds and a few grey veins.

export function paintMarble(out: Rgba, w: number, h: number, { seed }: { seed: number }) {
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const u = x / w, v = y / h;
      const t = fbm(u * 3, v * 3, seed, 5, 3, 3);
      // one or two long veins drifting across, broken up, with a soft grey haze along them
      const vein = Math.abs(Math.sin((u * 1 + v * 0.45 + t * 1.4) * Math.PI * 2));
      const fade = smooth(0.35, 0.7, fbm(u * 2, v * 2, seed + 3, 3, 2, 2));
      const thin = (1 - smooth(0, 0.025, vein)) * fade, soft = (1 - smooth(0, 0.25, vein)) * fade;
      const cloud = fbm(u * 8, v * 8, seed + 7, 3, 8, 8);
      const k = 0.95 - 0.05 * cloud - 0.05 * soft - 0.1 * thin;
      const o4 = (y * w + x) * 4;
      out[o4] = 250 * k; out[o4 + 1] = 247 * k; out[o4 + 2] = 241 * k; out[o4 + 3] = 255;
    }
}

// ---------------------------------------------------------------------------------------------
// Cobbles (seen from above; the CSS lays them down in perspective): rounded river stones, set
// close in dark joints. A jittered grid, periodic, so the tile repeats.

export function paintCobbles(out: Rgba, w: number, h: number, { seed, cells = 8 }: { seed: number; cells?: number }) {
  const cw = w / cells, chh = h / Math.round(cells * (h / w));
  const ny = Math.round(h / chh);
  const site = (i: number, j: number) => {
    const ii = mod(i, cells), jj = mod(j, ny);
    return [ (i + 0.5 + (hash(ii, jj, seed) - 0.5) * 0.7) * cw, (j + 0.5 + (hash(ii, jj, seed + 1) - 0.5) * 0.7) * chh, hash(ii, jj, seed + 2) ];
  };
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const ci = Math.floor(x / cw), cj = Math.floor(y / chh);
      let f1 = 1e9, f2 = 1e9, sx = 0, sy = 0, tone = 0;
      for (let dj = -1; dj <= 1; dj++)
        for (let di = -1; di <= 1; di++) {
          const [px, py, t] = site(ci + di, cj + dj);
          const d = Math.hypot(x - px, y - py);
          if (d < f1) { f2 = f1; f1 = d; sx = px; sy = py; tone = t; } else if (d < f2) f2 = d;
        }
      const edge = (f2 - f1) / 2; // distance to the joint
      const cov = smooth(1.2, cw * 0.07, edge);
      const round = smooth(0, cw * 0.26, edge); // each stone rounded off toward its joints
      // a dome: lit from the lamp (above, a little left)
      const nx = (x - sx) / (cw * 0.55), ny2 = (y - sy) / (chh * 0.55);
      const dome = Math.max(0, 1 - nx * nx - ny2 * ny2);
      const lit = 0.55 + 0.35 * Math.sqrt(dome) - 0.18 * nx - 0.22 * ny2;
      const grain = fbm(x / 6, y / 6, seed + 9, 3);
      const sheen = Math.pow(Math.max(0, 1 - Math.hypot(nx + 0.25, ny2 + 0.3) / 0.45), 3) * 0.35; // worn smooth, catching the lamp
      const k = ((0.5 + 0.28 * tone) * lit * (0.85 + 0.25 * grain) + sheen) * (0.45 + 0.55 * round);
      const o4 = (y * w + x) * 4;
      const jr = 28, jg = 24, jb = 22;
      out[o4] = jr + (142 * k - jr) * cov; out[o4 + 1] = jg + (132 * k - jg) * cov; out[o4 + 2] = jb + (120 * k - jb) * cov; out[o4 + 3] = 255;
    }
}

// ---------------------------------------------------------------------------------------------
// The roof's eave: clay tiles (teja) seen end-on, a cover tile every `w` pixels over the channel
// tiles; the sky shows above them (clear).

export function paintTiles(out: Rgba, w: number, h: number, { seed }: { seed: number }) {
  // the roof above the eave, seen from the street at dusk: courses of tapered clay tiles (teja),
  // cover tiles in columns over the channel tiles, each course a little shorter as the slope goes
  // back, its lower lip catching the sky and shadowing the course below; along the eave the cover
  // tiles' half-round open ends. Each tile a little different. Repeats along x.
  const N = 6, pitch = w / N, R0 = pitch * 0.31;
  const endH = R0 * 1.05;
  const rows: [number, number][] = [];
  let y1 = h - endH, rh = (h - endH) * 0.3;
  while (y1 > 1) { const y0 = Math.max(0, y1 - rh); rows.push([y0, y1]); y1 = y0; rh *= 0.8; }
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const o4 = (y * w + x) * 4;
      const grime = fbm(x / 9, y / 9, seed, 3);
      const lich = smooth(0.72, 0.8, fbm(x / 6, y / 6, seed + 5, 3)) * smooth(0.4, 0.7, fbm(x / 60, y / 60, seed + 9, 2));
      let k = 0, cr = 150, cg = 84, cb = 60, a = 1;
      if (y >= h - endH) {
        // the eave: each cover tile's open end, a half round over the channel tile's lip
        const t = Math.floor(x / pitch), dx = x + 0.5 - (t + 0.5 + (rnd(t, seed + 21) - 0.5) * 0.08) * pitch;
        const cy = h - endH * 0.12, d = Math.hypot(dx, y - cy), R = R0 * (0.95 + rnd(t, seed + 23) * 0.1);
        if (y < cy && d < R * 0.72) { k = 0.1 + 0.05 * grime; cr = 70; cg = 40; cb = 30; } // the dark mouth
        else if (y < cy && d < R) { const nx = dx / R; k = 0.5 + 0.3 * Math.max(0, -nx) + 0.15 * (1 - (d - R * 0.72) / (R * 0.28)); }
        else if (y >= cy) { k = 0.42 + 0.1 * grime; } // the channel tile's lip
        else { k = 0.26 + 0.1 * grime; cr = 128; cg = 116; cb = 102; } // lime mortar between
      } else {
        const ri = rows.findIndex(([a0, a1]) => y >= a0 && y < a1);
        if (ri < 0) { out[o4 + 3] = 0; continue; }
        const [a0, a1] = rows[ri], f = (y - a0) / (a1 - a0), far = ri / rows.length;
        const t = Math.floor(x / pitch), id = t * 31 + ri;
        const cx = (t + 0.5 + (rnd(id, seed + 3) - 0.5) * 0.1) * pitch, R = R0 * (0.82 + 0.18 * f) * (0.93 + rnd(id, seed + 7) * 0.12);
        const dx = x + 0.5 - cx, tone = rnd(id, seed + 11), missing = rnd(id, seed + 13) < 0.03;
        if (Math.abs(dx) < R && !missing) {
          const nx = dx / R, nz = Math.sqrt(Math.max(0, 1 - nx * nx));
          k = (0.34 + 0.5 * nz - 0.1 * nx) * (0.82 + 0.3 * grime);
          if (f > 0.9) k = 0.75 * (0.6 + 0.4 * nz); // the lip, catching the sky
        } else {
          const c = Math.abs(x + 0.5 - (t + 0.5) * pitch) / (pitch / 2); // 0 under the cover tile, 1 midway
          k = (0.2 + 0.2 * c) * (0.82 + 0.3 * grime);
        }
        k *= 0.5 + 0.5 * smooth(0, 0.25, f); // shaded by the course above
        k *= 1 - far * 0.4;
        cr = 146 + 30 * tone; cg = 80 + 14 * tone; cb = 58 + 4 * tone;
        if (ri === rows.length - 1 && f < 0.45 + 0.15 * Math.sin(x * 0.07)) a = 0;
      }
      const lk = lich * 0.55;
      cr = cr * (1 - lk) + 140 * lk; cg = cg * (1 - lk) + 142 * lk; cb = cb * (1 - lk) + 120 * lk;
      out[o4] = cr * k; out[o4 + 1] = cg * k; out[o4 + 2] = cb * k; out[o4 + 3] = a * 255;
    }
}

// ---------------------------------------------------------------------------------------------
/** One tile to draw (plain data, so it can go to the worker). */
export type PaintJob =
  | { kind: "shell"; w: number; h: number; opts: ShellOpts }
  | { kind: "wood"; w: number; h: number; opts: { seed: number; vertical?: boolean; dark?: number } }
  | { kind: "balusters"; w: number; h: number; opts: { seed: number } }
  | { kind: "stone"; w: number; h: number; opts: StoneOpts }
  | { kind: "tiles"; w: number; h: number; opts: { seed: number } }
  | { kind: "plaster"; w: number; h: number; opts: { seed: number } }
  | { kind: "marble"; w: number; h: number; opts: { seed: number } }
  | { kind: "cobbles"; w: number; h: number; opts: { seed: number; cells?: number } };

export function paint(out: Rgba, job: PaintJob) {
  if (job.kind === "shell") paintShell(out, job.w, job.h, job.opts);
  else if (job.kind === "wood") paintWood(out, job.w, job.h, job.opts);
  else if (job.kind === "balusters") paintBalusters(out, job.w, job.h, job.opts);
  else if (job.kind === "stone") paintStone(out, job.w, job.h, job.opts);
  else if (job.kind === "plaster") paintPlaster(out, job.w, job.h, job.opts);
  else if (job.kind === "marble") paintMarble(out, job.w, job.h, job.opts);
  else if (job.kind === "cobbles") paintCobbles(out, job.w, job.h, job.opts);
  else paintTiles(out, job.w, job.h, job.opts);
}
