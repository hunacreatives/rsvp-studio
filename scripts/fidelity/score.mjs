// Fidelity scoring: compare the template render with the original design,
// section by section, separately for text, artwork and photo areas.
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";
import { ssim } from "ssim.js";

export const decodePng = (buf) => PNG.sync.read(buf);

function crop(img, x, y, w, h) {
  const out = new PNG({ width: w, height: h });
  for (let row = 0; row < h; row++) img.data.copy(out.data, row * w * 4, ((y + row) * img.width + x) * 4, ((y + row) * img.width + x + w) * 4);
  return out;
}

/** Downscale by an integer factor (box average) — makes photo comparison
 *  tolerant to small crop shifts that customers' own photos make moot. */
function shrink(img, f) {
  const w = Math.max(1, Math.floor(img.width / f)), h = Math.max(1, Math.floor(img.height / f));
  const out = new PNG({ width: w, height: h });
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const acc = [0, 0, 0];
      for (let dy = 0; dy < f; dy++)
        for (let dx = 0; dx < f; dx++) {
          const p = ((y * f + dy) * img.width + x * f + dx) * 4;
          acc[0] += img.data[p];
          acc[1] += img.data[p + 1];
          acc[2] += img.data[p + 2];
        }
      const q = (y * w + x) * 4;
      out.data[q] = acc[0] / (f * f);
      out.data[q + 1] = acc[1] / (f * f);
      out.data[q + 2] = acc[2] / (f * f);
      out.data[q + 3] = 255;
    }
  return out;
}

/** Tolerance per region: how much differing pixels count as "fully wrong". */
// Text tolerance is calibrated on Burgundy: a near-identical font substitution
// still moves ~12% of the pixels inside text boxes (edges, hinting).
const TOL = { text: 0.45, art: 0.08, photo: 0.25 };
const WEIGHT = { text: 0.45, art: 0.3, photo: 0.25 };

/**
 * @param ref, cand  decoded PNGs at the same width
 * @param sections   [{ id, y0, y1 }] fractions of the page height
 * @param sources    { layerId: { canvas, x, y, w, h } } text boxes, per canvas section
 * @param photos     [{ cx, cy, rw, rh, rotate }] fractions of the page
 */
export function scoreCase({ ref, cand, sections, sources, photos }) {
  const W = Math.min(ref.width, cand.width);
  const H = Math.min(ref.height, cand.height);
  const heightDrift = Math.abs(ref.height - cand.height) / ref.height;
  const a = crop(ref, 0, 0, W, H);
  const b = crop(cand, 0, 0, W, H);
  const diff = new PNG({ width: W, height: H });
  pixelmatch(a.data, b.data, diff.data, W, H, { threshold: 0.15, includeAA: false, alpha: 0.25, diffColor: [255, 0, 80] });

  // Region map: 0 art, 1 text, 2 photo.
  const region = new Uint8Array(W * H);
  const fill = (x0, y0, x1, y1, v) => {
    for (let y = Math.max(0, Math.floor(y0)); y < Math.min(H, Math.ceil(y1)); y++)
      for (let x = Math.max(0, Math.floor(x0)); x < Math.min(W, Math.ceil(x1)); x++) region[y * W + x] = v;
  };
  const photoBoxes = [];
  for (const p of photos ?? []) {
    const t = ((p.rotate ?? 0) * Math.PI) / 180;
    const hw = (Math.abs(Math.cos(t)) * p.rw * W + Math.abs(Math.sin(t)) * p.rh * H) / 2;
    const hh = (Math.abs(Math.sin(t)) * p.rw * W + Math.abs(Math.cos(t)) * p.rh * H) / 2;
    fill(p.cx * W - hw, p.cy * H - hh, p.cx * W + hw, p.cy * H + hh, 2);
    const x0 = Math.max(0, Math.round(p.cx * W - hw)), y0 = Math.max(0, Math.round(p.cy * H - hh));
    const x1 = Math.min(W, Math.round(p.cx * W + hw)), y1 = Math.min(H, Math.round(p.cy * H + hh));
    if (x1 - x0 > 16 && y1 - y0 > 16) photoBoxes.push({ x0, y0, x1, y1 });
  }
  // Photos: structural similarity at 1/8 scale (framing and placement, not exact pixels).
  const photoScore = (y0, y1) => {
    const mine = photoBoxes.filter((b) => (b.y0 + b.y1) / 2 >= y0 && (b.y0 + b.y1) / 2 < y1);
    if (!mine.length) return null;
    let num = 0, den = 0;
    for (const bx of mine) {
      try {
        const sA = shrink(crop(a, bx.x0, bx.y0, bx.x1 - bx.x0, bx.y1 - bx.y0), 8);
        const sB = shrink(crop(b, bx.x0, bx.y0, bx.x1 - bx.x0, bx.y1 - bx.y0), 8);
        const v = ssim(sA, sB, { windowSize: Math.max(3, Math.min(7, sA.width, sA.height)) }).mssim;
        const area = (bx.x1 - bx.x0) * (bx.y1 - bx.y0);
        num += area * Math.max(0, Math.min(1, (v - 0.3) / 0.6));
        den += area;
      } catch {}
    }
    return den ? num / den : null;
  };
  const byId = new Map(sections.map((s) => [s.id, s]));
  for (const s of Object.values(sources ?? {})) {
    const sec = byId.get(s.canvas) ?? sections[0];
    const span = sec.y1 - sec.y0;
    const pad = 4;
    fill(s.x * W - pad, (sec.y0 + s.y * span) * H - pad, (s.x + s.w) * W + pad, (sec.y0 + (s.y + s.h) * span) * H + pad, 1);
  }

  const out = [];
  let pageNum = 0, pageDen = 0;
  for (const sec of sections) {
    const y0 = Math.round(sec.y0 * H), y1 = Math.min(H, Math.round(sec.y1 * H));
    if (y1 - y0 < 4) continue;
    const count = [0, 0, 0], bad = [0, 0, 0];
    for (let y = y0; y < y1; y++)
      for (let x = 0; x < W; x++) {
        const i = y * W + x, r = region[i];
        count[r]++;
        const p = i * 4;
        if (diff.data[p] === 255 && diff.data[p + 1] === 0 && diff.data[p + 2] === 80) bad[r]++;
      }
    const parts = {};
    let num = 0, den = 0;
    ["art", "text", "photo"].forEach((k, r) => {
      if (!count[r]) return;
      const ratio = bad[r] / count[r];
      const ps = k === "photo" ? photoScore(y0, y1) : null;
      const s = ps ?? Math.max(0, 1 - ratio / TOL[k]);
      parts[k] = { score: Math.round(s * 100), diffPct: +(ratio * 100).toFixed(1) };
      num += WEIGHT[k] * s;
      den += WEIGHT[k];
    });
    let structural = null;
    try {
      structural = +ssim(crop(a, 0, y0, W, y1 - y0), crop(b, 0, y0, W, y1 - y0), { downsample: "fast" }).mssim.toFixed(3);
    } catch {}
    const score = den ? (num / den) * 100 : 100;
    out.push({ id: sec.id, key: sec.visibilityKey ?? null, score: Math.round(score), ssim: structural, ...parts });
    pageNum += score * (y1 - y0);
    pageDen += y1 - y0;
  }
  const page = pageDen ? pageNum / pageDen : 0;
  return { page: Math.round(page * Math.max(0, 1 - Math.max(0, heightDrift - 0.02) * 2)), heightDrift: +heightDrift.toFixed(3), sections: out, diffPng: PNG.sync.write(diff) };
}
