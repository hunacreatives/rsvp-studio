import { mix, rgba, type Filling, type Flavour } from "./flavours";
import { rng } from "./sample";

/**
 * Sprinkles' cake, drawn in code, once (never per frame):
 *  - tiles: seamless textures the layers repeat (sponge crumb, two of them so the layers differ,
 *    the buttercream layer's spatula streaks, the tablecloth's weave), made per cake and kept.
 *  - drawTop: the top of the cake from above, lit from the top left: smooth buttercream turned on
 *    a turntable (fine spatula ridges and a few palette-knife sweeps), piped rosettes round the
 *    rim, on a foil board on the table.
 *  - drawBand: what lies between two layers, seen on the cut face: the top coat with its drips,
 *    a filling (jam, cream, ganache, caramel) with wavy edges and a gloss, or the bottom coat on
 *    the board.
 * Light always comes from the top left; shadows fall to the bottom right.
 */

const S = 256;
type Tiles = { a: HTMLCanvasElement; b: HTMLCanvasElement; cream: HTMLCanvasElement; table: HTMLCanvasElement; urls: Record<"a" | "b" | "cream" | "table", string> };
const tileCache = new Map<string, Tiles>();

const canvas = (w: number, h: number) => {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
};
// draw at x and its wrapped copies, so the tile repeats without a seam
const wrap = (fn: (x: number, y: number) => void, x: number, y: number) => {
  for (const dx of [-S, 0, S]) for (const dy of [-S, 0, S]) if (x + dx > -40 && x + dx < S + 40 && y + dy > -40 && y + dy < S + 40) fn(x + dx, y + dy);
};
const grain = (c: HTMLCanvasElement, amt: number, seed: number) => {
  const ctx = c.getContext("2d")!;
  const img = ctx.getImageData(0, 0, c.width, c.height), d = img.data, r = rng(seed);
  for (let i = 0; i < d.length; i += 4) {
    const n = (r() - 0.5) * amt;
    d[i] += n; d[i + 1] += n; d[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
};

function sponge(base: string, seed: number, dark: boolean) {
  const c = canvas(S, S), ctx = c.getContext("2d")!, r = rng(seed);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, S, S);
  // soft mottling
  for (let i = 0; i < 26; i++) {
    const x = r() * S, y = r() * S, rad = 20 + r() * 50, light = r() < 0.5;
    wrap((px, py) => {
      const g = ctx.createRadialGradient(px, py, 0, px, py, rad);
      g.addColorStop(0, light ? "rgba(255,250,240,0.08)" : "rgba(90,50,20,0.025)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(px - rad, py - rad, rad * 2, rad * 2);
    }, x, y);
  }
  // the crumb: pores, each a little hollow (dark, lit on its lower right lip)
  const shade = dark ? "rgba(20,8,2,0.42)" : "rgba(120,70,25,0.3)";
  const lip = dark ? "rgba(255,220,190,0.12)" : "rgba(255,250,235,0.5)";
  for (let i = 0; i < 1100; i++) {
    const x = r() * S, y = r() * S, rx = 0.5 + r() * r() * 3.2, ry = rx * (0.45 + r() * 0.5), a = (r() - 0.5) * 0.9;
    wrap((px, py) => {
      ctx.beginPath();
      ctx.ellipse(px + 0.5, py + 0.6, rx, ry, a, 0, Math.PI * 2);
      ctx.fillStyle = lip;
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(px, py, rx, ry, a, 0, Math.PI * 2);
      ctx.fillStyle = shade;
      ctx.fill();
    }, x, y);
  }
  grain(c, dark ? 10 : 12, seed + 7);
  return c;
}

function streaks(base: string, hi: string, lo: string, seed: number, n: number, alpha: number) {
  const c = canvas(S, S), ctx = c.getContext("2d")!, r = rng(seed);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, S, S);
  for (let i = 0; i < n; i++) {
    const y = r() * S, x = r() * S, len = 60 + r() * 180, bow = (r() - 0.5) * 10, w = 1 + r() * 4;
    const col = r() < 0.55 ? hi : lo;
    wrap((px, py) => {
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.quadraticCurveTo(px + len / 2, py + bow, px + len, py + bow * 0.3);
      ctx.strokeStyle = rgba(col, alpha * (0.5 + r()));
      ctx.lineWidth = w;
      ctx.lineCap = "round";
      ctx.stroke();
    }, x, y);
  }
  grain(c, 6, seed + 3);
  return c;
}

function weave(base: string, seed: number) {
  const c = canvas(S, S), ctx = c.getContext("2d")!, r = rng(seed);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, S, S);
  for (let y = 0; y < S; y += 2) { ctx.fillStyle = `rgba(255,255,255,${0.025 + r() * 0.03})`; ctx.fillRect(0, y, S, 1); }
  for (let x = 0; x < S; x += 2) { ctx.fillStyle = `rgba(0,0,0,${0.015 + r() * 0.025})`; ctx.fillRect(x, 0, 1, S); }
  grain(c, 8, seed + 1);
  return c;
}

export function tilesFor(f: Flavour): Tiles {
  const hit = tileCache.get(f.id);
  if (hit) return hit;
  const dark = f.id === "chocolate";
  const a = sponge(f.sponge[0], 11, dark), b = sponge(f.sponge[1], 23, dark);
  const cream = streaks(f.cream, "#ffffff", mix(f.cream, "#7a5a40", 0.4), 31, 70, 0.1);
  const table = weave(f.table, 41);
  const url = (c: HTMLCanvasElement) => c.toDataURL("image/png");
  const t: Tiles = { a, b, cream, table, urls: { a: url(a), b: url(b), cream: url(cream), table: url(table) } };
  tileCache.set(f.id, t);
  return t;
}

const setup = (cv: HTMLCanvasElement, w: number, h: number, dpr: number) => {
  cv.width = Math.max(1, Math.round(w * dpr));
  cv.height = Math.max(1, Math.round(h * dpr));
  cv.style.width = `${w}px`;
  cv.style.height = `${h}px`;
  const ctx = cv.getContext("2d")!;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
};

/** A piped rosette seen from above at (x, y), `s` across. */
function rosette(ctx: CanvasRenderingContext2D, f: Flavour, x: number, y: number, s: number, turn: number) {
  ctx.save();
  ctx.shadowColor = "rgba(40, 10, 5, 0.28)";
  ctx.shadowBlur = s * 0.25;
  ctx.shadowOffsetX = s * 0.1;
  ctx.shadowOffsetY = s * 0.14;
  const g = ctx.createRadialGradient(x - s * 0.16, y - s * 0.18, s * 0.04, x, y, s * 0.55);
  g.addColorStop(0, f.frostHi);
  g.addColorStop(0.55, f.frosting);
  g.addColorStop(1, f.frostLo);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, s * 0.48, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // the piped swirl: a groove (dark) with its lit edge beside it
  const spiral = (dx: number, dy: number) => {
    ctx.beginPath();
    for (let t = 0; t <= 1; t += 0.02) {
      const a = turn + t * Math.PI * 4.4, rr = s * (0.06 + t * 0.38);
      const px = x + dx + Math.cos(a) * rr, py = y + dy + Math.sin(a) * rr;
      if (t === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
  };
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  spiral(s * 0.025, s * 0.03);
  ctx.strokeStyle = rgba(mix(f.frostLo, "#2a0a00", 0.25), 0.55);
  ctx.lineWidth = s * 0.07;
  ctx.stroke();
  spiral(-s * 0.03, -s * 0.035);
  ctx.strokeStyle = rgba(f.frostHi, 0.85);
  ctx.lineWidth = s * 0.05;
  ctx.stroke();
}

export type TopGeom = { cx: number; cy: number; R: number };
export function topGeom(w: number, h: number, phone: boolean): TopGeom {
  return phone ? { cx: w / 2, cy: h * 0.46, R: Math.max(w * 0.74, h * 0.33) } : { cx: w / 2, cy: h * 0.47, R: Math.min(h * 0.43, w * 0.42) };
}

/** The top of the cake, from above. */
export function drawTop(cv: HTMLCanvasElement, f: Flavour, w: number, h: number, phone: boolean) {
  const dpr = Math.min(1.5, window.devicePixelRatio || 1);
  const ctx = setup(cv, w, h, dpr);
  const t = tilesFor(f);
  const { cx, cy, R } = topGeom(w, h, phone);
  const r = rng(77);
  // the table
  ctx.fillStyle = ctx.createPattern(t.table, "repeat")!;
  ctx.fillRect(0, 0, w, h);
  // the board under the cake, with the cake's shadow on it
  const bR = R * 1.075;
  const bg = ctx.createRadialGradient(cx - bR * 0.4, cy - bR * 0.45, bR * 0.1, cx, cy, bR * 1.05);
  bg.addColorStop(0, f.boardHi);
  bg.addColorStop(0.6, f.board);
  bg.addColorStop(1, mix(f.board, "#000000", 0.22));
  ctx.save();
  ctx.shadowColor = "rgba(30, 10, 5, 0.25)";
  ctx.shadowBlur = 30;
  ctx.shadowOffsetX = 8;
  ctx.shadowOffsetY = 14;
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.arc(cx, cy, bR, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // the cake's own soft shadow on the board
  ctx.save();
  ctx.shadowColor = "rgba(30, 10, 5, 0.35)";
  ctx.shadowBlur = R * 0.06;
  ctx.shadowOffsetX = R * 0.02;
  ctx.shadowOffsetY = R * 0.03;
  ctx.fillStyle = f.frosting;
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // the buttercream, lit from the top left
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.clip();
  const g = ctx.createRadialGradient(cx - R * 0.42, cy - R * 0.48, R * 0.05, cx, cy, R * 1.15);
  g.addColorStop(0, f.frostHi);
  g.addColorStop(0.5, f.frosting);
  g.addColorStop(1, f.frostLo);
  ctx.fillStyle = g;
  ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
  // turned on a turntable: fine ridges, each a lit edge and a shadowed one
  ctx.lineWidth = 1.1;
  for (let i = 0; i < 34; i++) {
    const rad = R * (0.08 + r() * 0.84);
    const ph = r() * 6.28, amp = 1 + r() * 3, a0 = r() * 6.28, sweep = Math.PI * (0.3 + r() * 0.9);
    const ring = (off: number) => {
      ctx.beginPath();
      for (let a = 0; a <= sweep; a += 0.05) {
        const rr = rad + Math.sin(a * 3 + ph) * amp;
        const px = cx + Math.cos(a0 + a) * rr + off, py = cy + Math.sin(a0 + a) * rr + off;
        if (a === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
    };
    ring(-0.6);
    ctx.strokeStyle = rgba(f.frostHi, 0.16);
    ctx.stroke();
    ring(0.7);
    ctx.strokeStyle = rgba(f.frostLo, 0.12);
    ctx.stroke();
  }
  // a few palette-knife sweeps
  for (let i = 0; i < 16; i++) {
    const rad = R * (0.12 + r() * 0.72), a0 = r() * 6.28, sweep = 0.3 + r() * 0.8, bw = 10 + r() * 30;
    ctx.beginPath();
    ctx.arc(cx, cy, rad, a0, a0 + sweep);
    ctx.strokeStyle = rgba(f.frostHi, 0.1);
    ctx.lineWidth = bw;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx + 0.8, cy + 0.8, rad + bw / 2, a0 + 0.04, a0 + sweep - 0.02);
    ctx.strokeStyle = rgba(f.frostLo, 0.3);
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx - 0.6, cy - 0.6, rad - bw / 2, a0 + 0.04, a0 + sweep - 0.02);
    ctx.strokeStyle = rgba(f.frostHi, 0.45);
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }
  // the edge rounds over: darker toward the rim
  const e = ctx.createRadialGradient(cx, cy, R * 0.78, cx, cy, R);
  e.addColorStop(0, "rgba(0,0,0,0)");
  e.addColorStop(1, rgba(f.frostLo, 0.55));
  ctx.fillStyle = e;
  ctx.fillRect(cx - R, cy - R, R * 2, R * 2);
  ctx.restore();

  // the piped border
  const s = phone ? 32 : 44;
  const rr = R - s * 0.42;
  const n = Math.floor((Math.PI * 2 * rr) / (s * 0.8));
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
    if (x < -s || x > w + s || y < -s || y > h + s) continue;
    rosette(ctx, f, x, y, s * (0.94 + r() * 0.12), a * 1.3 + r());
  }
}

/** The cut face between two layers. `kind`: cap (the top coat with drips), a filling, or base. */
export function drawBand(cv: HTMLCanvasElement, f: Flavour, kind: "cap" | "base" | Filling, w: number, h: number, seed: number, under?: "a" | "b") {
  const dpr = Math.min(1.5, window.devicePixelRatio || 1);
  const ctx = setup(cv, w, h, dpr);
  const t = tilesFor(f);
  const r = rng(seed);
  const wave = (y0: number, amp: number, k: number) => {
    const ph = r() * 6.28, ph2 = r() * 6.28;
    return (x: number) => y0 + Math.sin(x * k + ph) * amp + Math.sin(x * k * 2.7 + ph2) * amp * 0.45;
  };
  const span = (top: (x: number) => number, bot: (x: number) => number) => {
    ctx.beginPath();
    ctx.moveTo(0, top(0));
    for (let x = 0; x <= w; x += 6) ctx.lineTo(x, top(x));
    for (let x = w; x >= 0; x -= 6) ctx.lineTo(x, bot(x));
    ctx.closePath();
  };

  if (kind === "cap") {
    // the air above the cake (the table beyond), the top coat, then the drip over its edge
    const coatTop = h * 0.16, coatBot = h * 0.42;
    ctx.fillStyle = ctx.createPattern(t.table, "repeat")!;
    ctx.fillRect(0, 0, w, coatBot);
    // the rosettes along the top, from the side
    const s = Math.min(44, w * 0.09);
    ctx.save();
    for (let x = s * 0.3; x < w + s; x += s * 0.82) {
      const g = ctx.createRadialGradient(x - s * 0.15, coatTop - s * 0.2, 2, x, coatTop, s * 0.6);
      g.addColorStop(0, f.frostHi);
      g.addColorStop(0.6, f.frosting);
      g.addColorStop(1, f.frostLo);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(x, coatTop, s * 0.46, s * 0.4, 0, Math.PI, 0);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(x + s * 0.05, coatTop - s * 0.12, s * 0.22, s * 0.12, -0.3, Math.PI * 1.1, Math.PI * 1.9);
      ctx.strokeStyle = rgba(f.frostHi, 0.8);
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.restore();
    // the coat
    const cg = ctx.createLinearGradient(0, coatTop, 0, coatBot);
    cg.addColorStop(0, f.frostHi);
    cg.addColorStop(0.35, f.frosting);
    cg.addColorStop(1, f.frostLo);
    ctx.fillStyle = cg;
    ctx.fillRect(0, coatTop, w, coatBot - coatTop);
    // below it the sponge's cut face shows through (the section's own); a soft shadow under the coat
    const sh = ctx.createLinearGradient(0, coatBot, 0, coatBot + 18);
    sh.addColorStop(0, "rgba(40,15,5,0.28)");
    sh.addColorStop(1, "rgba(40,15,5,0)");
    ctx.fillStyle = sh;
    ctx.fillRect(0, coatBot, w, 18);
    // the drip: a glaze over the top of the coat, running down in drops of every length
    const top = coatTop - 4;
    const drops: { x: number; len: number; wd: number }[] = [];
    for (let x = r() * 30; x < w; x += 22 + r() * 46) drops.push({ x, len: (coatBot - coatTop) * 0.4 + r() * r() * (h - coatBot) * 0.9, wd: 9 + r() * 10 });
    const glaze = () => {
      ctx.beginPath();
      ctx.moveTo(0, top);
      ctx.lineTo(w, top);
      ctx.lineTo(w, top + 16);
      for (let i = drops.length - 1; i >= 0; i--) {
        const d = drops[i], y = top + 16 + d.len;
        ctx.lineTo(d.x + d.wd * 0.9, top + 16);
        ctx.bezierCurveTo(d.x + d.wd * 0.55, top + 24, d.x + d.wd * 0.62, y - d.wd * 0.4, d.x + d.wd * 0.62, y - d.wd * 0.2);
        ctx.arc(d.x, y - d.wd * 0.2, d.wd * 0.62, 0, Math.PI);
        ctx.bezierCurveTo(d.x - d.wd * 0.62, y - d.wd * 0.4, d.x - d.wd * 0.55, top + 24, d.x - d.wd * 0.9, top + 16);
      }
      ctx.lineTo(0, top + 16);
      ctx.closePath();
    };
    ctx.save();
    ctx.shadowColor = "rgba(30, 8, 2, 0.35)";
    ctx.shadowBlur = 6;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 4;
    glaze();
    ctx.fillStyle = f.drip;
    ctx.fill();
    ctx.restore();
    // the gloss on each drop, and along the rim
    ctx.save();
    glaze();
    ctx.clip();
    const dg = ctx.createLinearGradient(0, top, 0, top + 20);
    dg.addColorStop(0, rgba(f.dripHi, 0.7));
    dg.addColorStop(1, rgba(f.dripHi, 0));
    ctx.fillStyle = dg;
    ctx.fillRect(0, top, w, 20);
    ctx.lineCap = "round";
    for (const d of drops) {
      ctx.beginPath();
      ctx.moveTo(d.x - d.wd * 0.28, top + 22);
      ctx.lineTo(d.x - d.wd * 0.3, top + 16 + d.len - d.wd * 0.3);
      ctx.strokeStyle = rgba(f.dripHi, 0.55);
      ctx.lineWidth = Math.max(1.5, d.wd * 0.16);
      ctx.stroke();
    }
    ctx.restore();
    return;
  }

  if (kind === "base") {
    // the last sponge, the bottom coat, the board's foil edge; the table below shows through
    const coatTop = h * 0.3, coatBot = h * 0.56, boardBot = h * 0.72;
    ctx.fillStyle = ctx.createPattern(under === "b" ? t.b : t.a, "repeat")!;
    ctx.fillRect(0, 0, w, coatTop + 4);
    const cg = ctx.createLinearGradient(0, coatTop, 0, coatBot);
    cg.addColorStop(0, f.frosting);
    cg.addColorStop(1, f.frostLo);
    ctx.fillStyle = cg;
    span(wave(coatTop, 2, 0.03), () => coatBot);
    ctx.fill();
    const bg = ctx.createLinearGradient(0, coatBot, 0, boardBot);
    bg.addColorStop(0, f.boardHi);
    bg.addColorStop(0.45, f.board);
    bg.addColorStop(1, mix(f.board, "#000000", 0.3));
    ctx.fillStyle = bg;
    ctx.fillRect(0, coatBot, w, boardBot - coatBot);
    // the board's shadow on the table
    const sh = ctx.createLinearGradient(0, boardBot, 0, h);
    sh.addColorStop(0, "rgba(30,10,5,0.25)");
    sh.addColorStop(1, "rgba(30,10,5,0)");
    ctx.fillStyle = sh;
    ctx.fillRect(0, boardBot, w, h - boardBot);
    return;
  }

  // a filling between two sponges
  const fl = kind;
  const top = wave(h * 0.16, h * 0.035, 0.012 + r() * 0.01), bot = wave(h * 0.84, h * 0.04, 0.01 + r() * 0.01);
  // the sponge soaked a little at each edge
  ctx.save();
  ctx.filter = "blur(3px)";
  span((x) => top(x) - 4, (x) => bot(x) + 4);
  ctx.fillStyle = "rgba(60, 20, 5, 0.18)";
  ctx.fill();
  ctx.restore();
  span(top, bot);
  const g = ctx.createLinearGradient(0, h * 0.12, 0, h * 0.88);
  g.addColorStop(0, fl.kind === "cream" ? fl.hi : mix(fl.c, fl.hi, 0.25));
  g.addColorStop(0.5, fl.c);
  g.addColorStop(1, mix(fl.c, "#000000", fl.kind === "cream" ? 0.08 : 0.3));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  span(top, bot);
  ctx.clip();
  if (fl.kind === "jam") {
    // seeds and pieces of fruit, and the gloss
    for (let i = 0; i < w / 9; i++) {
      const x = r() * w, y = top(x) + (bot(x) - top(x)) * (0.2 + r() * 0.6);
      ctx.beginPath();
      ctx.ellipse(x, y, 1.2 + r(), 0.8 + r() * 0.5, r() * 3, 0, Math.PI * 2);
      ctx.fillStyle = rgba(mix(fl.c, "#ffdd99", 0.5), 0.7);
      ctx.fill();
    }
    for (let i = 0; i < w / 80; i++) {
      const x = r() * w, y = top(x) + (bot(x) - top(x)) * 0.5, rw = 10 + r() * 14;
      ctx.beginPath();
      ctx.ellipse(x, y, rw, rw * 0.45, (r() - 0.5) * 0.4, 0, Math.PI * 2);
      ctx.fillStyle = rgba(mix(fl.c, "#000000", 0.25), 0.6);
      ctx.fill();
    }
  } else if (fl.kind === "cream") {
    for (let i = 0; i < w / 14; i++) {
      const x = r() * w, y = top(x) + (bot(x) - top(x)) * (0.15 + r() * 0.7), len = 20 + r() * 60;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + len / 2, y + (r() - 0.5) * 4, x + len, y);
      ctx.strokeStyle = r() < 0.5 ? "rgba(255,255,255,0.6)" : "rgba(120,90,60,0.1)";
      ctx.lineWidth = 1 + r() * 2;
      ctx.stroke();
    }
  }
  // the gloss along the top
  ctx.beginPath();
  for (let x = 0; x <= w; x += 6) ctx.lineTo(x, top(x) + 4);
  ctx.strokeStyle = rgba(fl.hi, fl.kind === "cream" ? 0.9 : 0.5);
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}
