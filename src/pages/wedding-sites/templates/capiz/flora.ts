// Capiz: bougainvillea spilling over the top of the stone wall, drawn as vectors once a page:
// arching branches hanging from the top edge, a cluster of three papery bracts round a small
// white flower at each node, leaves between, the far sprays deeper in shade, and the whole spray's
// soft shadow on the wall. Dusk colours (a magenta gone deep, dark leaves); the CSS adds the lamp.

type Ctx = CanvasRenderingContext2D;

function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (Math.imul(s ^ (s >>> 15), 2246822507) + 0x9e3779b9) >>> 0;
    s ^= s >>> 13;
    return (s >>> 0) / 4294967296;
  };
}

const mix = (a: number[], b: number[], t: number) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
const rgb = (c: number[], a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

function bract(x: Ctx, L: number, W: number, base: number[], shade: number) {
  // papery and thin: paler and a little translucent toward its base, deepest at the edges, a
  // net of fine veins, its lit side catching the light
  const c = mix(base, [20, 6, 18], shade);
  const g = x.createRadialGradient(W * 0.15, -L * 0.45, L * 0.05, 0, -L * 0.5, L * 0.62);
  g.addColorStop(0, rgb(mix(c, [255, 214, 236], 0.22)));
  g.addColorStop(0.55, rgb(c));
  g.addColorStop(1, rgb(mix(c, [30, 4, 20], 0.38)));
  x.globalAlpha = 0.94;
  x.beginPath();
  x.moveTo(0, 0);
  x.bezierCurveTo(W, -0.16 * L, W * 0.98, -0.84 * L, 0, -L);
  x.bezierCurveTo(-W * 0.98, -0.84 * L, -W, -0.16 * L, 0, 0);
  x.fillStyle = g;
  x.fill();
  x.globalAlpha = 1;
  x.strokeStyle = rgb(mix(c, [255, 200, 225], 0.25), 0.35);
  x.lineWidth = Math.max(0.5, L * 0.025);
  x.beginPath();
  x.moveTo(W * 0.2, -L * 0.08);
  x.bezierCurveTo(W * 0.95, -0.25 * L, W * 0.9, -0.8 * L, 0, -L);
  x.stroke();
  x.strokeStyle = rgb(mix(c, [40, 0, 24], 0.55), 0.35);
  x.lineWidth = Math.max(0.4, L * 0.02);
  x.beginPath();
  x.moveTo(0, 0);
  x.lineTo(0, -L * 0.9);
  for (const sd of [-1, 1]) for (const t of [0.3, 0.55]) { x.moveTo(0, -L * t); x.quadraticCurveTo(sd * W * 0.4, -L * (t + 0.12), sd * W * 0.62, -L * (t + 0.3)); }
  x.stroke();
}

function leaf(x: Ctx, L: number, W: number, shade: number) {
  const c = mix([64, 92, 46], [8, 14, 12], shade);
  const g = x.createLinearGradient(-W, 0, W, 0);
  g.addColorStop(0, rgb(mix(c, [0, 0, 0], 0.32)));
  g.addColorStop(0.5, rgb(c));
  g.addColorStop(1, rgb(mix(c, [120, 150, 100], 0.15)));
  x.beginPath();
  x.moveTo(0, 0);
  x.bezierCurveTo(W, -0.3 * L, W * 0.55, -0.85 * L, 0, -L);
  x.bezierCurveTo(-W * 0.55, -0.85 * L, -W, -0.3 * L, 0, 0);
  x.fillStyle = g;
  x.fill();
  // a glossy leaf: a soft sheen along one side of the midrib
  x.fillStyle = rgb(mix(c, [210, 230, 200], 0.4), 0.18 * (1 - shade));
  x.beginPath();
  x.ellipse(W * 0.22, -L * 0.48, W * 0.18, L * 0.3, 0.1, 0, Math.PI * 2);
  x.fill();
  x.strokeStyle = rgb(mix(c, [190, 210, 160], 0.25), 0.45);
  x.lineWidth = Math.max(0.5, L * 0.03);
  x.beginPath();
  x.moveTo(0, 0);
  x.lineTo(0, -L * 0.9);
  x.stroke();
}

/** Draw the spray into a canvas of w × h pixels; `k` is the pixel scale (1 = CSS pixels). */
export function drawBougainvillea(x: Ctx, w: number, h: number, seed: number, k: number) {
  const r = rng(seed);
  const layer = document.createElement("canvas");
  layer.width = w;
  layer.height = h;
  const l = layer.getContext("2d");
  if (!l) return;
  const pinks = [[150, 30, 92], [172, 40, 104], [134, 26, 84], [160, 50, 118], [184, 56, 120]];
  const leafAt = (px: number, py: number, shade: number, big = 1) => {
    l.save();
    l.translate(px, py);
    l.rotate(Math.PI + (r() - 0.5) * 2.4);
    leaf(l, (12 + r() * 10) * k * big, (5.5 + r() * 3.5) * k * big, Math.min(1, shade + r() * 0.15));
    l.restore();
  };
  // a panicle: a few triplets of bracts round a stem's end
  const panicle = (cx: number, cy: number, shade: number, size = 1) => {
    const m = 3 + Math.floor(r() * 6 * size);
    const base = pinks[Math.floor(r() * pinks.length)];
    for (let j = 0; j < m; j++) {
      const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 18 * k * size;
      const px = cx + Math.cos(a) * d, py = cy + Math.sin(a) * d * 0.8;
      const sz = (9 + r() * 6) * k;
      const rot = r() * Math.PI * 2;
      const sh = Math.min(1, shade + (d / (18 * k)) * 0.08 + r() * 0.1);
      for (let i = 0; i < 3; i++) {
        l.save();
        l.translate(px + (r() - 0.5) * 3 * k, py + (r() - 0.5) * 3 * k);
        l.rotate(rot + (i * Math.PI * 2) / 3 + (r() - 0.5) * 0.4);
        bract(l, sz, sz * 0.66, base, sh);
        l.restore();
      }
      l.fillStyle = rgb(mix([236, 226, 200], [40, 30, 30], sh));
      l.beginPath();
      l.arc(px, py, 1.3 * k, 0, Math.PI * 2);
      l.fill();
    }
  };
  // the trailing stems first (behind), then the canopy along the wall's top, the far parts in shade
  const trails = Math.round(5 + (w / k) / 90);
  for (let t = 0; t < trails; t++) {
    const x0 = w * (0.22 + r() * 0.56), len = (0.4 + r() * 0.42) * h, bend = (r() - 0.5) * 0.5, shade = 0.3 + r() * 0.3;
    let px = x0, py = 0;
    l.strokeStyle = rgb(mix([66, 48, 32], [10, 8, 8], shade));
    l.lineWidth = 1.5 * k;
    l.beginPath();
    l.moveTo(px, py);
    const steps = Math.round(len / (14 * k));
    const nodes: [number, number][] = [];
    for (let i = 1; i <= steps; i++) {
      const tt = i / steps;
      px = x0 + Math.sin(tt * 1.4) * bend * len * 0.6 + (r() - 0.5) * 2 * k;
      py = tt * len;
      l.lineTo(px, py);
      nodes.push([px, py]);
    }
    l.stroke();
    nodes.forEach(([nx, ny], i) => {
      if (r() < 0.8) leafAt(nx, ny, shade);
      if (i > nodes.length * 0.45 && r() < 0.32) panicle(nx, ny, shade, 0.6);
    });
    panicle(px, py, shade, 0.9);
  }
  const clumps = Math.round((w / k) * 0.55);
  const bell = () => w * (0.5 + ((r() + r() + r()) / 3 - 0.5) * 1.15); // thinning out toward the sides, clear of the edges
  const spots = Array.from({ length: clumps }, () => ({ x: bell(), y: Math.pow(r(), 1.7) * h * 0.4, d: r() })).filter((c) => c.x > w * 0.08 && c.x < w * 0.92).sort((p1, p2) => p2.d - p1.d);
  for (const c of spots) {
    const shade = 0.12 + c.d * 0.5 + (c.y / h) * 0.2;
    for (let i = 0; i < 3; i++) leafAt(c.x + (r() - 0.5) * 30 * k, c.y + (r() - 0.5) * 20 * k, shade + 0.08, 1.1);
    if (r() < 0.72) panicle(c.x, c.y, shade, 1);
  }
  // its shadow on the wall, then the spray
  x.save();
  x.shadowColor = "rgba(0, 0, 0, 0.55)";
  x.shadowBlur = 10 * k;
  x.shadowOffsetX = 6 * k;
  x.shadowOffsetY = 12 * k;
  x.drawImage(layer, 0, 0);
  x.restore();
}
