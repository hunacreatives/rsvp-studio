// A wax seal pressed with the couple's initials, drawn in code: a height field (the puddle of
// wax with its rounded lip, the stamp's recessed field, its raised rim and bead ring, the raised
// letters), lit by the same window as the rest of the table (upper left), glossy, with its own
// soft shadow. Drawn at the device's pixels (2× at least, 3× at most), so it's sharp everywhere.

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// three passes of a box blur ≈ a gaussian (works everywhere, unlike canvas filters on old Safari)
function blur(src: Float32Array, w: number, h: number, r: number) {
  if (r < 1) return src;
  const a = new Float32Array(src), b = new Float32Array(src.length);
  for (let pass = 0; pass < 3; pass++) {
    for (let y = 0; y < h; y++) {
      let acc = 0;
      const row = y * w;
      for (let x = -r; x <= r; x++) acc += a[row + Math.min(w - 1, Math.max(0, x))];
      for (let x = 0; x < w; x++) {
        b[row + x] = acc / (2 * r + 1);
        acc += a[row + Math.min(w - 1, x + r + 1)] - a[row + Math.max(0, x - r)];
      }
    }
    for (let x = 0; x < w; x++) {
      let acc = 0;
      for (let y = -r; y <= r; y++) acc += b[Math.min(h - 1, Math.max(0, y)) * w + x];
      for (let y = 0; y < h; y++) {
        a[y * w + x] = acc / (2 * r + 1);
        acc += b[Math.min(h - 1, y + r + 1) * w + x] - b[Math.max(0, y - r) * w + x];
      }
    }
  }
  return a;
}

export type WaxLook = { base: [number, number, number]; metal: number };
export const GOLD_WAX: WaxLook = { base: [0.69, 0.54, 0.31], metal: 0.85 };
export const INK_WAX: WaxLook = { base: [0.16, 0.2, 0.3], metal: 0.15 };

/**
 * Draws the seal into `cv`: `css` is its displayed size (the canvas is that, with room for the
 * shadow), `letters` the initials (one or two), `font` the display face.
 */
export function drawSeal(cv: HTMLCanvasElement, css: number, letters: string[], font: string, look: WaxLook = GOLD_WAX, seed = 3) {
  const k = Math.min(3, Math.max(2, window.devicePixelRatio || 1));
  const T = Math.round(css * k);
  if (cv.width !== T) { cv.width = T; cv.height = T; }
  const ctx = cv.getContext("2d");
  if (!ctx) return;
  const S = T, cx = S * 0.47, cy = S * 0.47, R = S * 0.4;
  const rand = rng(seed);
  const harm = Array.from({ length: 7 }, (_, i) => ({ f: i + 2, a: ((rand() * 2 - 1) * 0.04) / (1 + i * 0.5), p: rand() * 6.283 }));
  // the letters, as a soft raised mask
  const mc = document.createElement("canvas");
  mc.width = mc.height = S;
  const m = mc.getContext("2d");
  const Rs = R * 0.74;
  if (m) {
    m.fillStyle = "#fff";
    m.textAlign = "center";
    m.textBaseline = "alphabetic";
    const [a, b] = letters;
    if (a && b) {
      const fs = Rs * 0.86;
      m.font = `italic 400 ${fs}px ${font}`;
      m.fillText(a, cx - Rs * 0.3, cy + fs * 0.22);
      m.fillText(b, cx + Rs * 0.3, cy + fs * 0.34);
      m.font = `italic 400 ${fs * 0.36}px ${font}`;
      m.fillText("&", cx + Rs * 0.01, cy + fs * 0.05);
    } else if (a) {
      const fs = Rs * 1.1;
      m.font = `italic 400 ${fs}px ${font}`;
      m.fillText(a, cx, cy + fs * 0.32);
    }
  }
  const md = m ? m.getImageData(0, 0, S, S).data : new Uint8ClampedArray(S * S * 4);
  let mono = new Float32Array(S * S);
  for (let i = 0; i < S * S; i++) mono[i] = md[i * 4 + 3] / 255;
  mono = blur(mono, S, S, Math.max(1, Math.round(S * 0.004)));
  // the height field (in px)
  const h = new Float32Array(S * S);
  const alpha = new Float32Array(S * S);
  const beads = 30;
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const dx = x - cx, dy = y - cy, r = Math.hypot(dx, dy), th = Math.atan2(dy, dx);
      let wob = 1;
      for (const q of harm) wob += q.a * Math.sin(q.f * th + q.p);
      const Rt = R * wob, d = r / Rt;
      const i = y * S + x;
      alpha[i] = Math.min(1, Math.max(0, (Rt - r) / 1.2 + 0.5));
      if (d > 1.05) continue;
      // the puddle: a low dome with a rounded lip where the wax spread and stopped
      const fall = Math.min(1, Math.max(0, (1 - d) / 0.2));
      let z = R * (0.16 * fall * fall * (3 - 2 * fall) + 0.05 * Math.exp(-(((d - 0.86) / 0.08) ** 2)));
      // the stamp: a recessed field, a raised rim, a ring of beads, the letters
      const rr = r / Rs;
      if (rr < 1.08) {
        const wall = Math.min(1, Math.max(0, (1.0 - rr) / 0.06));
        const field = R * 0.085;
        let zs = field + R * 0.05 * Math.exp(-(((rr - 0.92) / 0.03) ** 2));
        const ang = (th / (Math.PI * 2)) * beads;
        const bd = Math.hypot((ang - Math.round(ang)) * ((Math.PI * 2 * Rs * 0.8) / beads), r - Rs * 0.8);
        zs += R * 0.026 * Math.exp(-((bd / (Rs * 0.024)) ** 2));
        zs += R * 0.06 * mono[i];
        z = z * (1 - wall) + zs * wall;
      }
      // a little unevenness in the wax
      z += R * 0.004 * Math.sin(x * 0.21 + y * 0.13) * Math.sin(y * 0.17 - x * 0.07);
      h[i] = z;
    }
  }
  const hs = blur(h, S, S, Math.max(1, Math.round(S * 0.002)));
  // light: the window (upper left), the camera above
  const L = [-0.52, -0.6, 0.6];
  const ll = Math.hypot(L[0], L[1], L[2]);
  L[0] /= ll; L[1] /= ll; L[2] /= ll;
  const H = [L[0], L[1], L[2] + 1];
  const hl = Math.hypot(H[0], H[1], H[2]);
  H[0] /= hl; H[1] /= hl; H[2] /= hl;
  // the shadow: the seal's footprint, pushed away from the light and softened
  const sh0 = new Float32Array(S * S);
  const ox = Math.round(S * 0.028), oy = Math.round(S * 0.034);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const sx = x - ox, sy = y - oy;
    if (sx >= 0 && sy >= 0) sh0[y * S + x] = alpha[sy * S + sx];
  }
  const shA = blur(sh0, S, S, Math.max(1, Math.round(S * 0.022)));
  const shB = blur(new Float32Array(alpha), S, S, Math.max(1, Math.round(S * 0.006)));
  const img = ctx.createImageData(S, S);
  const D = img.data;
  const [br, bg, bb] = look.base;
  for (let y = 1; y < S - 1; y++) {
    for (let x = 1; x < S - 1; x++) {
      const i = y * S + x;
      const a = alpha[i];
      const sh = Math.min(0.8, 0.5 * shA[i] + 0.35 * shB[Math.max(0, i - S - 1)]);
      let r = 0.17, g = 0.13, b = 0.1;
      if (a > 0) {
        const gx = (hs[i + 1] - hs[i - 1]) * 0.5, gy = (hs[i + S] - hs[i - S]) * 0.5;
        let nx = -gx, ny = -gy, nz = 1;
        const nl = Math.hypot(nx, ny, nz);
        nx /= nl; ny /= nl; nz /= nl;
        const dif = Math.max(0, nx * L[0] + ny * L[1] + nz * L[2]);
        const nh = Math.max(0, nx * H[0] + ny * H[1] + nz * H[2]);
        const spec = Math.pow(nh, 70) * 0.7 + Math.pow(nh, 14) * 0.16;
        const amb = 0.34 + 0.14 * nz;
        const mt = look.metal;
        const sr = (1 - mt) + mt * br * 1.5, sg = (1 - mt) + mt * bg * 1.5, sb = (1 - mt) + mt * bb * 1.5;
        r = br * (amb + 0.86 * dif) + spec * sr;
        g = bg * (amb + 0.86 * dif) + spec * sg;
        b = bb * (amb + 0.86 * dif) + spec * sb;
      }
      // over the shadow
      const oa = a + sh * (1 - a);
      const cr = (r * a + 0.17 * sh * (1 - a)) / Math.max(oa, 1e-4);
      const cg = (g * a + 0.13 * sh * (1 - a)) / Math.max(oa, 1e-4);
      const cb = (b * a + 0.1 * sh * (1 - a)) / Math.max(oa, 1e-4);
      const o = i * 4;
      D[o] = Math.min(255, cr * 255);
      D[o + 1] = Math.min(255, cg * 255);
      D[o + 2] = Math.min(255, cb * 255);
      D[o + 3] = oa * 255;
    }
  }
  ctx.putImageData(img, 0, 0);
}
