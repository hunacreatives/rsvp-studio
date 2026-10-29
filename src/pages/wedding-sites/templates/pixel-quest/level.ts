import { useEffect, type MutableRefObject, type RefObject } from "react";
import * as A from "./art";
import { C } from "./art";
import { createStopSnap } from "../shared/stopSnap";

/**
 * Pixel Quest's level, drawn into the stage (a sticky frame inside the page) at a low
 * resolution and scaled up with whole pixels (image-rendering: pixelated):
 *  - The world, far to near: the sky (afternoon at the start, sunset halfway, night at the
 *    reply), the sun and then the moon and stars, drifting clouds, a far volcano, hills with
 *    palms and huts, bushes, and the ground. Each layer slides at its own speed.
 *  - The set pieces, one at each stop: the start gate, the party hall, the power-up shop, the
 *    treasure, the sage's tree, the cake.
 *  - The hero, who runs from stop to stop, jumps the crate in each gap and picks up the coins
 *    (the HUD counts them and the score).
 *  - The run: each stop is a section ([data-pq-stop]). Every card ([data-pq-dock]) pauses in the
 *    same place, its dock under the HUD (sticky for the length of its hold; a card taller than
 *    the frame docks by its bottom edge). The hero stands still while a card is docked and runs
 *    in the gap between cards, taking at least TRIP seconds however fast the scroll.
 *  - `spawn` (a ref): -1 while the title waits for Press start (no hero yet), then the time the
 *    hero dropped in; 0 for a hero simply standing there.
 *  - Kept light: a canvas a few hundred pixels wide, drawn ≤30 frames a second, only while on
 *    screen and the tab is shown. `animate` false (builder, gallery card, reduced motion): no
 *    easing, no idle motion, a still frame redrawn on scroll.
 */

export type Piece = "start" | "day" | "gear" | "loot" | "tips" | "rsvp";
export type LevelApi = { celebrate: () => void };

const TRIP = 1.8;
// the sky, top band to the horizon: afternoon, sunset, night
const SKY = [
  ["#4f73d9", "#5f86e4", "#77a0ee", "#93b9f3", "#b6d1f6", "#d9e8f6"],
  ["#463a96", "#6c479f", "#a5569b", "#df6f86", "#ff9775", "#ffc884"],
  ["#0d0a2a", "#151148", "#211a5a", "#33246a", "#4c2e74", "#6a3878"],
];
const BANDS = [0.3, 0.2, 0.16, 0.13, 0.11, 0.1];

const hex = (h: string) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mix = (a: string, b: string, t: number) => {
  const x = hex(a), y = hex(b);
  return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * t)).join(",")})`;
};
const smooth = (t: number) => { const u = Math.min(1, Math.max(0, t)); return u * u * (3 - 2 * u); };
const skyAt = (p: number, j: number) => (p < 0.5 ? mix(SKY[0][j], SKY[1][j], smooth(p / 0.5)) : mix(SKY[1][j], SKY[2][j], smooth((p - 0.5) / 0.5)));

let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const canvas = (w: number, h: number) => { const c = document.createElement("canvas"); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; };
const ctx = (c: HTMLCanvasElement) => c.getContext("2d") as CanvasRenderingContext2D;

// ---- the far layer: a perfect-cone volcano with a wisp of smoke, and lower ridges
function farTile(GY: number) {
  const W = 360, top = GY - 74, c = canvas(W, GY - top + 2), g = ctx(c);
  const ridge = (cx: number, half: number, h: number, body: string, lit: string) => {
    for (let x = 0; x < W; x++) {
      let dx = x - cx;
      if (dx > W / 2) dx -= W; else if (dx < -W / 2) dx += W;
      const f = 1 - Math.abs(dx) / half;
      if (f <= 0) continue;
      const y = Math.round(GY - top - h * Math.pow(f, 1.7));
      g.fillStyle = body; g.fillRect(x, y, 1, GY - top - y + 2);
      if (dx < 0) { g.fillStyle = lit; g.fillRect(x, y, 1, Math.max(1, Math.round(3 + f * 6))); }
    }
  };
  ridge(280, 90, 30, "#7d76c4", "#948de0");
  ridge(40, 70, 24, "#7d76c4", "#948de0");
  ridge(130, 92, 64, "#8a83d4", "#a49ef0");
  // the crater's lip and the smoke
  g.fillStyle = "#6d66b4"; g.fillRect(126, GY - top - 64, 9, 1);
  const puff: [number, number, number][] = [[134, 8, 3], [139, 5, 4], [146, 3, 3], [152, 1, 2]];
  for (const [x, y, r] of puff) { A.disc(g, x, y + GY - top - 74, r, "#d8d0f0"); A.disc(g, x - 1, y + GY - top - 75, r - 1, "#f1ecfa"); }
  // haze along the foot
  g.fillStyle = "rgba(255,255,255,0.12)"; g.fillRect(0, GY - top - 14, W, 16);
  return { c, top, k: 0.08 };
}

// ---- the hills: rolling, with palms and huts on stilts (and the huts' windows, for the night)
function midTile(GY: number) {
  const W = 256, top = GY - 46, h = GY - top + 2, c = canvas(W, h), g = ctx(c), lc = canvas(W, h), l = ctx(lc);
  const line: number[] = [];
  for (let x = 0; x < W; x++) line[x] = Math.round(h - 16 - 7 * Math.sin((x / W) * Math.PI * 4) - 3 * Math.sin((x / W) * Math.PI * 10 + 1));
  for (let x = 0; x < W; x++) {
    const y = line[x];
    g.fillStyle = "#3f9e74"; g.fillRect(x, y, 1, h - y);
    g.fillStyle = "#64c08c"; g.fillRect(x, y, 1, 1);
    g.fillStyle = "#2f8062"; for (let yy = y + 6 + (x % 2); yy < h; yy += 2) g.fillRect(x, yy, 1, 1);
  }
  const palm = (x: number) => {
    const base = line[x];
    for (let k = 0; k < 22; k++) { const cx = x + Math.round(Math.sin(k / 9) * 3); g.fillStyle = k % 3 ? "#7a5a3a" : "#5c4128"; g.fillRect(cx, base - k, 2, 1); }
    const tx = x + Math.round(Math.sin(21 / 9) * 3), ty = base - 22;
    for (const [dx, dy] of [[-1, 0], [1, 0], [-1, 1], [1, 1]] as const) for (let k = 0; k < 8; k++) {
      const fx = tx + dx * k, fy = ty + Math.round((k * k) / 12) * (dy ? 1 : 0.6) - (dy ? 0 : 1);
      g.fillStyle = k > 5 ? "#2f8062" : "#4cae6e"; g.fillRect(fx, fy, 2, 1);
    }
    g.fillStyle = "#5c4128"; g.fillRect(tx, ty + 1, 2, 2);
  };
  const hut = (x: number) => {
    const base = line[x + 6] - 1;
    g.fillStyle = "#5c4128"; for (const sx of [x + 1, x + 10]) g.fillRect(sx, base - 4, 1, 5);
    g.fillStyle = "#d9a35f"; g.fillRect(x, base - 11, 12, 7);
    g.fillStyle = "#b9824a"; for (let yy = base - 10; yy < base - 4; yy += 2) g.fillRect(x, yy, 12, 1);
    for (let k = 0; k < 6; k++) { g.fillStyle = k % 2 ? "#8a5a2a" : "#a8732f"; g.fillRect(x - 2 + k, base - 12 - k, 16 - k * 2, 1); }
    g.fillStyle = "#3a2618"; g.fillRect(x + 4, base - 9, 3, 3);
    l.fillStyle = C.lit; l.fillRect(x + 4, base - 9, 3, 3);
  };
  palm(30); hut(78); palm(118); palm(126); hut(188); palm(226);
  return { c, lc, top, k: 0.3 };
}

// ---- bushes along the edge of the ground
function bushTile(GY: number) {
  const W = 200, top = GY - 12, c = canvas(W, 14), g = ctx(c);
  for (const [x, r] of [[14, 6], [24, 8], [34, 5], [92, 7], [102, 5], [150, 6], [160, 8], [171, 5]] as const) { A.disc(g, x, 13, r + 1, "#1f5e3a"); A.disc(g, x, 13, r, "#2a7a3e"); A.disc(g, x - 2, 11, r - 3, "#3fa34d"); }
  return { c, top, k: 0.62 };
}

// ---- the ground: grass blades, a grass edge, then earth laid in bricks
function groundTile(GY: number, LH: number) {
  const W = 32, h = LH - GY + 3, c = canvas(W, h), g = ctx(c);
  g.fillStyle = C.grass;
  for (let x = 0; x < W; x++) { if (x % 4 === 1) g.fillRect(x, 1, 1, 1); if (x % 8 === 3) g.fillRect(x, 0, 1, 1); }
  g.fillRect(0, 2, W, 3);
  g.fillStyle = "#a8ec82"; for (let x = 0; x < W; x += 3) g.fillRect(x, 2, 2, 1);
  g.fillStyle = C.grassDark; g.fillRect(0, 5, W, 2);
  for (let x = 0; x < W; x += 2) g.fillRect(x + ((x / 2) % 2), 7, 1, 1);
  g.fillStyle = C.dirt; g.fillRect(0, 7, W, h - 7);
  for (let x = 1; x < W; x += 2) { g.fillStyle = C.grassDark; g.fillRect(x, 7, 1, 1); }
  for (let row = 0; row * 7 + 9 < h; row++) {
    const y = 9 + row * 7;
    g.fillStyle = C.dirtDark; g.fillRect(0, y + 6, W, 1);
    for (let x = (row % 2) * 8; x < W; x += 16) { g.fillRect(x, y, 1, 6); }
    g.fillStyle = "#bd7448"; for (let x = 2 + (row % 2) * 8; x < W; x += 16) g.fillRect(x, y + 1, 3, 1);
  }
  g.fillStyle = C.dirtDeep; g.fillRect(5, 15, 2, 1); g.fillRect(21, 26, 2, 1);
  return { c, top: GY - 2 };
}

// ---- a cloud, puffs on a flat base, its underside shaded
function cloudSprite(w: number) {
  const h = Math.round(w * 0.45), c = canvas(w, h), g = ctx(c);
  const puffs: [number, number, number][] = [[w * 0.25, h * 0.65, h * 0.32], [w * 0.45, h * 0.48, h * 0.44], [w * 0.68, h * 0.58, h * 0.36], [w * 0.84, h * 0.72, h * 0.22]];
  for (const [x, y, r] of puffs) A.disc(g, x, y, Math.round(r), "#c9c2ec");
  for (const [x, y, r] of puffs) A.disc(g, x - 1, y - 1, Math.round(r) - 1, C.white);
  g.fillStyle = "#c9c2ec"; g.fillRect(Math.round(w * 0.12), h - 3, Math.round(w * 0.8), 2);
  return c;
}

export function useLevel(
  refs: {
    root: RefObject<HTMLElement | null>;
    stage: RefObject<HTMLElement | null>;
    view: RefObject<HTMLCanvasElement | null>;
    score: RefObject<HTMLElement | null>;
    coins: RefObject<HTMLElement | null>;
    where: RefObject<HTMLElement | null>;
    spawn: MutableRefObject<number>;
    api: MutableRefObject<LevelApi | null>;
  },
  { route: routeKey, pieces: piecesKey, labels: labelsKey, candles, animate }: { route: string; pieces: string; labels: string; candles: number; animate: boolean },
) {
  useEffect(() => {
    const root = refs.root.current, stage = refs.stage.current, view = refs.view.current;
    const out = view?.getContext("2d");
    if (!root || !stage || !view || !out) return;
    const route = routeKey.split(",").map(Number);
    const pieces = piecesKey.split(",") as Piece[];
    const labels = labelsKey.split("|");
    const N = Math.max(0, pieces.length - 1);

    // the sprites, once
    const hero = { r: {} as Record<string, HTMLCanvasElement>, l: {} as Record<string, HTMLCanvasElement> };
    for (const k of ["stand", "blink", "run", "jump"] as const) { hero.r[k] = A.sprite(A.HERO[k]); hero.l[k] = A.sprite(A.HERO[k], true); }
    const keeper = A.sprite(A.SHOPKEEPER), items = [A.sprite(A.ITEM_HAT), A.sprite(A.ITEM_SHIRT), A.sprite(A.ITEM_SHOES)];
    const sage = A.sprite(A.TARSIER), sageShut = A.sprite(A.TARSIER_BLINK);
    const coinF = A.COIN.map((f) => A.sprite(f));
    const moon = canvas(17, 17);
    { const m = ctx(moon); A.disc(m, 8, 8, 7, "#fff4d6"); A.disc(m, 6, 7, 5, "#ffe7a8"); m.globalCompositeOperation = "destination-out"; A.disc(m, 11, 6, 6, "#000"); }

    // ---- the layout, rebuilt when the stage changes size
    let px = 4, LW = 1, LH = 1, GY = 1, HX = 1, SPX = 1, SP = 1, small = false;
    let far: ReturnType<typeof farTile>, mid: ReturnType<typeof midTile>, bush: ReturnType<typeof bushTile>, ground: ReturnType<typeof groundTile>;
    let world: HTMLCanvasElement, wc: CanvasRenderingContext2D, back: HTMLCanvasElement, bc: CanvasRenderingContext2D, cloudL: HTMLCanvasElement, cc: CanvasRenderingContext2D;
    let sky: HTMLCanvasElement, sc: CanvasRenderingContext2D, skyKey = -1;
    let clouds: { c: HTMLCanvasElement; x: number; y: number; v: number }[] = [];
    let stars: [number, number, number][] = [];
    let coins: { x: number; y: number }[] = [], crates: number[] = [], blocks: { x: number; y: number; i: number }[] = [];
    const build = () => {
      const w = Math.max(1, stage.clientWidth), h = Math.max(1, stage.clientHeight);
      small = w <= 700;
      px = Math.max(3, Math.round(h / 190));
      LW = Math.ceil(w / px); LH = Math.ceil(h / px);
      GY = LH - 30;
      HX = Math.round(LW * (small ? 0.2 : 0.2));
      SPX = Math.round(LW * (small ? 0.64 : 0.82));
      SP = Math.max(Math.round(LW * 1.25), 200);
      view.width = LW; view.height = LH;
      view.style.width = `${LW * px}px`; view.style.height = `${LH * px}px`;
      root.style.setProperty("--px", `${px}px`);
      seed = 7;
      far = farTile(GY); mid = midTile(GY); bush = bushTile(GY); ground = groundTile(GY, LH);
      world = canvas(LW, LH); wc = ctx(world);
      back = canvas(LW, LH); bc = ctx(back);
      cloudL = canvas(LW, GY); cc = ctx(cloudL);
      sky = canvas(LW, LH); sc = ctx(sky); skyKey = -1;
      clouds = [0.1, 0.42, 0.7, 1.05, 1.3].map((x, i) => ({ c: cloudSprite([34, 22, 28, 18, 26][i]), x: x * LW, y: Math.round(GY * [0.16, 0.3, 0.1, 0.38, 0.22][i]), v: 1 + rnd() * 1.5 }));
      stars = Array.from({ length: Math.round(LW / 5) }, () => [Math.floor(rnd() * LW), Math.floor(rnd() * GY * 0.62), rnd() * 6]);
      // the gaps: a crate to jump in the middle (out of sight while a card is docked), coins
      // over it and along the way, a present block floating above
      coins = []; crates = []; blocks = [];
      for (let g = 0; g < N; g++) {
        const m = g * SP + Math.round((LW + SP) / 2);
        crates.push(m);
        for (const [dx, dy] of [[-10, 26], [0, 31], [10, 26], [-34, 10], [-28, 10], [28, 10], [34, 10]] as const) coins.push({ x: m + dx, y: GY - dy });
        blocks.push({ x: m + 22, y: GY - 44, i: g });
      }
    };

    // ---- the stops: each one's hold, the scroll range [a, b] while its card is docked
    let holds: { a: number; b: number; x?: number }[] = [{ a: 0, b: 0 }];
    // one swipe, one stop (the live page and the design preview)
    const snap = createStopSnap(root, animate);
    const scrolled = () => stage.getBoundingClientRect().top - root.getBoundingClientRect().top;
    const measure = () => {
      const rt = root.getBoundingClientRect(), sr = stage.getBoundingClientRect();
      const Hl = Math.max(1, stage.clientHeight), s = sr.height / Hl, H = sr.height;
      const max = Math.max(0, rt.height - H);
      const phone = stage.clientWidth <= 700;
      const stops = Array.from(root.querySelectorAll<HTMLElement>("[data-pq-stop]"));
      holds = stops.map((st) => {
        const wrap = st.querySelector<HTMLElement>(".pq-dock"), card = wrap?.querySelector<HTMLElement>("[data-pq-dock]");
        if (!wrap || !card) { const r = st.getBoundingClientRect(); const y = Math.min(max, Math.max(0, r.top - rt.top + Math.min(r.height, H) / 2 - H / 2)); return { a: y, b: y }; }
        // the dock: just under the HUD (a card too tall for the frame docks by its bottom edge,
        // so it can be read to the end)
        const h = card.offsetHeight;
        const top = phone ? Math.min(66, Hl - h - 12) : Math.min(92, Hl - h - 16);
        card.style.top = `${Math.round(top)}px`;
        const w = wrap.getBoundingClientRect(), y0 = w.top - rt.top - top * s;
        return { a: Math.min(max, Math.max(0, y0)), b: Math.min(max, Math.max(0, y0 + w.height - h * s)), x: Math.max(0, -top * s) };
      });
      if (!holds.length) holds = [{ a: 0, b: 0 }];
      snap.update(holds.map((h) => ({ from: h.a - (h.x ?? 0), to: h.x ? h.b : undefined })), H);
    };
    // the hero's place along the level for a scroll position: still while a card is docked,
    // running (eased) through the gap to the next stop, arriving a little before the card docks
    const stopAt = (y: number) => {
      const at = (i: number) => route[Math.min(route.length - 1, i)] ?? 0;
      if (y <= holds[0].b) return at(0);
      for (let i = 0; i < holds.length - 1; i++) {
        const { b } = holds[i], { a } = holds[i + 1];
        if (y <= a) { const t = Math.min(1, Math.max(0, (y - b) / Math.max(1, a - b))); const m = Math.min(1, t / 0.85); return at(i) + (at(i + 1) - at(i)) * m * m * (3 - 2 * m); }
        if (y <= holds[i + 1].b) return at(i + 1);
      }
      return at(holds.length - 1);
    };

    let target = 0, X = 0, vel = 0, prevT = 0, lastDraw = -1e9, raf = 0, visible = true, face = 1, best = 0, reached = 0;
    let opened = animate ? 0 : 1, party = 0, partyT = 0;
    const pops: { x: number; y: number; t: number }[] = [];
    let bursts: { x: number; y: number; t: number; col: string[] }[] = [];
    const t0 = performance.now();
    let shownScore = "", shownCoins = "", shownWhere = "";

    const drawSky = (p: number) => {
      const key = Math.round(p * 96);
      if (key === skyKey) return;
      skyKey = key;
      const cols = BANDS.map((_, j) => skyAt(key / 96, j));
      const skyH = GY - 4;
      let y = 0;
      cols.forEach((col, j) => {
        const bh = j === cols.length - 1 ? LH - y : Math.round(BANDS[j] * skyH);
        sc.fillStyle = col; sc.fillRect(0, y, LW, bh);
        // an ordered-dither ramp into the next band: a quarter, a half, three quarters
        if (j < cols.length - 1) {
          sc.fillStyle = cols[j + 1];
          for (let x = 0; x < LW; x++) {
            if (x % 4 === 0) sc.fillRect(x, y + bh - 3, 1, 1);
            if ((x + y) % 2 === 0) sc.fillRect(x, y + bh - 2, 1, 1);
            if (x % 4 !== 2) sc.fillRect(x, y + bh - 1, 1, 1);
          }
        }
        y += bh;
      });
    };

    const draw = (now: number) => {
      const t = animate ? (now - t0) / 1000 : 12;
      const cam = X * SP, p = N ? Math.min(1, X / N) : 0, night = smooth((p - 0.45) / 0.55), dusk = Math.max(0, 1 - Math.abs(p - 0.5) / 0.3);
      drawSky(p);
      out.imageSmoothingEnabled = false;
      out.drawImage(sky, 0, 0);
      // the stars, then the sun going down and the moon coming up
      if (night > 0.02) for (const [sx, sy, ph] of stars) {
        const tw = animate ? (Math.sin(t * 2 + ph * 3) + 1) / 2 : 0.6;
        out.globalAlpha = night * (0.45 + tw * 0.55);
        out.fillStyle = ph > 5 ? C.lit : C.white; out.fillRect(sx, sy, 1, 1);
        if (ph > 5.4) { out.fillRect(sx - 1, sy, 3, 1); out.fillRect(sx, sy - 1, 1, 3); }
      }
      out.globalAlpha = 1;
      const sunY = Math.round(GY * 0.2 + smooth(p / 0.78) * GY * 0.82), sunX = Math.round(LW * (small ? 0.8 : 0.84) - cam * 0.01);
      if (sunY < GY + 12) {
        const col = mix("#fff6c8", "#ff9a5c", smooth(p / 0.7));
        out.globalAlpha = 0.25; A.disc(out, sunX, sunY, 17, col);
        out.globalAlpha = 0.45; A.disc(out, sunX, sunY, 14, col);
        out.globalAlpha = 1; A.disc(out, sunX, sunY, 11, col);
      }
      if (night > 0.3) {
        out.globalAlpha = smooth((night - 0.3) / 0.4);
        const mx = Math.round(LW * (small ? 0.78 : 0.24)), my = Math.round(GY * 0.2);
        out.drawImage(moon, mx - 8, my - 8);
        out.globalAlpha = 1;
      }
      // the clouds, drifting, coloured by the hour (on their own layer, so the tint stays on them)
      cc.clearRect(0, 0, LW, GY);
      for (const cl of clouds) {
        const span = LW + 80, x = ((((cl.x - cam * 0.05 + (animate ? t * cl.v : 0)) % span) + span) % span) - 40;
        cc.drawImage(cl.c, Math.round(x), cl.y);
      }
      if (dusk > 0.02 || night > 0.02) {
        cc.globalCompositeOperation = "source-atop";
        if (dusk > 0.02) { cc.globalAlpha = dusk * 0.45; cc.fillStyle = "#ffa585"; cc.fillRect(0, 0, LW, GY); }
        if (night > 0.02) { cc.globalAlpha = night * 0.72; cc.fillStyle = "#3a2b6e"; cc.fillRect(0, 0, LW, GY); }
        cc.globalCompositeOperation = "source-over"; cc.globalAlpha = 1;
      }
      out.drawImage(cloudL, 0, 0);

      // ---- the world in two layers (so the hour can tint them and not the sky): the far hills,
      // a little hazier, with the huts' windows lit after dark; then everything near
      const tile = (g: CanvasRenderingContext2D, img: HTMLCanvasElement, k: number, y: number) => {
        const w = img.width, off = ((Math.round(cam * k) % w) + w) % w;
        for (let x = -off; x < LW; x += w) g.drawImage(img, x, y);
      };
      bc.clearRect(0, 0, LW, LH);
      bc.imageSmoothingEnabled = false;
      tile(bc, far.c, far.k, far.top);
      tile(bc, mid.c, mid.k, mid.top);
      bc.globalCompositeOperation = "source-atop";
      if (dusk > 0.02) { bc.globalAlpha = dusk * 0.2; bc.fillStyle = "#ff7a3a"; bc.fillRect(0, 0, LW, LH); }
      if (night > 0.02) { bc.globalAlpha = night * 0.6; bc.fillStyle = "#1c1650"; bc.fillRect(0, 0, LW, LH); }
      bc.globalCompositeOperation = "source-over"; bc.globalAlpha = night;
      if (night > 0.05) tile(bc, mid.lc, mid.k, mid.top);
      bc.globalAlpha = 1;
      out.drawImage(back, 0, 0);
      wc.clearRect(0, 0, LW, LH);
      wc.imageSmoothingEnabled = false;
      const tw = (img: HTMLCanvasElement, k: number, y: number) => tile(wc, img, k, y);
      tw(bush.c, bush.k, bush.top);
      tw(ground.c, 1, ground.top);
      // the set pieces in view
      pieces.forEach((pc, i) => {
        const sx = Math.round(i * SP + SPX - cam);
        if (sx < -60 || sx > LW + 60) return;
        if (pc === "start") A.startGate(wc, sx, GY, t, night);
        else if (pc === "day") A.partyHall(wc, sx, GY, t, night);
        else if (pc === "gear") A.powerShop(wc, sx, GY, t, night, keeper, items);
        else if (pc === "loot") A.treasure(wc, sx, GY, t, night, Math.abs(X - i) < 0.6 ? opened : animate ? 0 : 1);
        else if (pc === "tips") A.sageTree(wc, sx, GY, t, night, sage, sageShut);
        else A.cakeBoss(wc, sx, GY, t, night, candles, party);
      });
      for (const cx of crates) { const sx = Math.round(cx - cam); if (sx > -10 && sx < LW + 10) A.crate(wc, sx, GY); }
      for (const b of blocks) {
        const sx = Math.round(b.x - cam); if (sx < -10 || sx > LW + 10) continue;
        A.giftBlock(wc, sx, b.y + (animate && Math.floor(t * 1.5 + b.i) % 2 ? 1 : 0), [C.coral, C.teal, C.violet][b.i % 3], [C.coralDark, C.tealDark, C.violetDark][b.i % 3]);
      }
      // the hero, and the coins it hasn't picked up yet
      const hx = cam + HX;
      for (const cn of coins) {
        if (cn.x <= best) continue;
        const sx = Math.round(cn.x - cam);
        if (sx < -8 || sx > LW + 8) continue;
        wc.drawImage(coinF[animate ? Math.floor(t * 8 + cn.x * 0.1) % 4 : 0], sx - 3, cn.y - 4);
      }
      let jy = 0;
      for (const cx of crates) { const d = (hx - cx) / 17; if (Math.abs(d) < 1) jy = Math.min(jy, -Math.round(24 * (1 - d * d))); }
      // cheering once the reply is in: three hops
      if (party && animate) { const pt = (now - partyT) / 1000; if (pt < 2.1) jy = Math.min(jy, -Math.round(Math.abs(Math.sin((pt / 0.7) * Math.PI)) * 12)); }
      const sp = refs.spawn.current;
      if (sp !== -1) {
        let dy = 0, land = false;
        if (sp > 0 && animate) {
          const st = (now - sp) / 1000;
          if (st < 0.55) dy = -Math.round((1 - (st / 0.55) ** 2) * (GY + 10));
          else if (st < 0.68) land = true;
        }
        const moving = Math.abs(vel) > 0.02;
        const blinking = !moving && animate && Math.floor(t * 10) % 38 === 0;
        const f = dy < 0 || jy < -1 ? "jump" : land ? "jump" : moving && Math.floor(cam / 7) % 2 ? "run" : blinking ? "blink" : "stand";
        const set = face > 0 ? hero.r : hero.l;
        wc.drawImage(set[f], HX - 8, GY - 24 + jy + dy + (moving && f === "run" ? -1 : 0));
      }
      for (let k = pops.length - 1; k >= 0; k--) {
        const pp = pops[k], a = (now - pp.t) / 380;
        if (a >= 1) { pops.splice(k, 1); continue; }
        const sx = Math.round(pp.x - cam), r = 1 + Math.round(a * 4);
        wc.fillStyle = a < 0.5 ? C.white : C.gold;
        wc.fillRect(sx - r, pp.y, 1, 1); wc.fillRect(sx + r, pp.y, 1, 1); wc.fillRect(sx, pp.y - r, 1, 1); wc.fillRect(sx, pp.y + r, 1, 1);
      }
      // the hour's light on the world: warm at sunset, deep blue at night
      wc.globalCompositeOperation = "source-atop";
      if (dusk > 0.02) { wc.globalAlpha = dusk * 0.16; wc.fillStyle = "#ff7a3a"; wc.fillRect(0, 0, LW, LH); }
      if (night > 0.02) { wc.globalAlpha = night * 0.46; wc.fillStyle = "#1c1650"; wc.fillRect(0, 0, LW, LH); }
      wc.globalCompositeOperation = "source-over"; wc.globalAlpha = 1;
      out.drawImage(world, 0, 0);
      // the lights stay bright after dark: a dithered halo round each lantern and window
      const glows = A.takeGlows();
      if (night > 0.05) {
        out.fillStyle = C.lit;
        for (const g of glows) {
          const r2 = g.r * g.r;
          for (let dy = -g.r; dy <= g.r; dy++) for (let dx = -g.r; dx <= g.r; dx++) {
            const d = dx * dx + dy * dy, x = g.x + dx, y = g.y + dy;
            if (d > r2) continue;
            const inner = d < r2 * 0.3;
            if (inner ? (x + y) % 2 === 0 : x % 2 === 0 && y % 2 === 0) { out.globalAlpha = night * (inner ? 0.55 : 0.4); out.fillRect(x, y, 1, 1); }
          }
        }
        out.globalAlpha = 1;
      }
      // fireworks over the cake
      if (bursts.length) {
        bursts = bursts.filter((b) => now - b.t < 1500);
        for (const b of bursts) {
          const bt = (now - b.t) / 1000;
          if (bt < 0) { // still rising
            const rise = 1 + bt / 0.6;
            if (rise > 0) { out.fillStyle = C.lit; out.fillRect(Math.round(b.x), Math.round(GY - (GY - b.y) * rise), 1, 2); }
            continue;
          }
          if (bt < 0.1) { out.fillStyle = C.white; out.fillRect(b.x - 1, b.y - 1, 3, 3); }
          const R0 = small ? 17 : 24, ease = 1 - (1 - Math.min(1, bt / 0.7)) ** 3;
          for (let k = 0; k < 28; k++) {
            const a = (k / 28) * Math.PI * 2, r = ease * R0 * (k % 2 ? 0.78 : 1), fall = bt * bt * 7;
            out.globalAlpha = Math.max(0, 1 - bt / 1.4);
            out.fillStyle = b.col[k % b.col.length];
            const px2 = Math.round(b.x + Math.cos(a) * r), py2 = Math.round(b.y + Math.sin(a) * r + fall);
            out.fillRect(px2, py2, 1, 1);
            // a short trail behind each spark, fading first
            if (bt < 0.9) { out.globalAlpha *= 0.55; out.fillRect(Math.round(b.x + Math.cos(a) * r * 0.8), Math.round(b.y + Math.sin(a) * r * 0.8 + fall * 0.8), 1, 1); }
            if (bt < 0.45) out.fillRect(Math.round(b.x + Math.cos(a) * r * 0.6), Math.round(b.y + Math.sin(a) * r * 0.6 + fall * 0.6), 1, 1);
          }
          out.globalAlpha = 1;
        }
      }
    };

    const hud = () => {
      const got = coins.filter((c) => c.x <= best).length;
      const score = String(Math.min(999999, got * 100 + reached * 1000 + (party ? 5000 : 0))).padStart(6, "0");
      const cn = `×${String(got).padStart(2, "0")}`;
      const here = labels[Math.round(X)] ?? labels[0] ?? "";
      if (score !== shownScore && refs.score.current) refs.score.current.textContent = shownScore = score;
      if (cn !== shownCoins && refs.coins.current) refs.coins.current.textContent = shownCoins = cn;
      if (here !== shownWhere && refs.where.current) refs.where.current.textContent = shownWhere = here;
    };

    const loop = (now: number) => {
      raf = 0;
      const dt = Math.min(0.12, prevT ? (now - prevT) / 1000 : 0.016); prevT = now;
      const was = X;
      if (!animate) { X = target; vel = 0; }
      else {
        const D = 1, vmax = (D / TRIP) * 1.4, acc = (vmax * vmax) / (D * 0.35), d = target - X;
        const want = Math.sign(d) * Math.min(vmax, Math.sqrt(2 * acc * Math.abs(d)));
        vel += Math.max(-acc * dt, Math.min(acc * dt, want - vel));
        if (Math.abs(vel * dt) >= Math.abs(d) || (Math.abs(d) < 0.001 && Math.abs(vel) < 0.05)) { X = target; vel = 0; } else X += vel * dt;
      }
      if (X !== was) face = X > was ? 1 : -1;
      // the coins picked up on the way (they stay picked up), a sparkle for each
      const hx = X * SP + HX - 2;
      if (hx > best) {
        if (animate) for (const cn of coins) if (cn.x > best && cn.x <= hx) pops.push({ x: cn.x, y: cn.y, t: now });
        best = hx;
      }
      reached = Math.max(reached, Math.floor(X + 0.02));
      // the chest opens once the hero stands at it
      const lootAt = pieces.indexOf("loot");
      if (lootAt > 0 && Math.abs(X - lootAt) < 0.02) opened = Math.min(1, opened + dt * 1.6);
      if (now - lastDraw >= 32) { lastDraw = now; draw(now); hud(); }
      const busy = animate || X !== target;
      if (visible && !document.hidden && busy) raf = requestAnimationFrame(loop);
    };
    const kick = () => { if (!raf) { prevT = 0; lastDraw = -1e9; raf = requestAnimationFrame(loop); } };
    const onScroll = () => { target = stopAt(scrolled()); kick(); };

    refs.api.current = {
      celebrate: () => {
        party = 1; partyT = performance.now();
        if (animate) {
          // in the open sky: either side of the window on a wide page, low over the cake on a phone
          const xs = small ? [0.3, 0.72, 0.5, 0.82, 0.22, 0.62].map((f) => f * LW) : [SPX - 6, HX + 6, SPX + 26, HX - 14, SPX + 8, HX + 26];
          const ys = small ? [0.62, 0.7, 0.56, 0.66, 0.74, 0.6] : [0.3, 0.24, 0.44, 0.4, 0.2, 0.5];
          const cols = [[C.coral, C.gold], [C.teal, C.white], [C.violet, C.pink], [C.gold, C.lit], [C.pink, C.teal], [C.lit, C.coral]];
          bursts = cols.map((col, i) => ({ x: Math.round(Math.max(16, Math.min(LW - 16, xs[i]))), y: Math.round(GY * ys[i]), t: performance.now() + 500 + i * 360, col }));
        }
        lastDraw = -1e9; kick();
      },
    };

    build();
    measure();
    target = stopAt(scrolled()); X = target; best = X * SP + HX - 2; reached = Math.floor(X + 0.02);
    kick();
    let size = `${stage.clientWidth}x${stage.clientHeight}`;
    const ro = new ResizeObserver(() => {
      const now = `${stage.clientWidth}x${stage.clientHeight}`;
      if (now !== size) { size = now; build(); }
      measure(); onScroll(); lastDraw = -1e9; kick();
    });
    ro.observe(stage); ro.observe(root);
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) kick(); });
    io.observe(stage);
    const onVis = () => { if (!document.hidden) kick(); };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("scroll", onScroll, { passive: true, capture: true });
    return () => {
      snap.dispose();
      cancelAnimationFrame(raf);
      ro.disconnect(); io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("scroll", onScroll, { capture: true });
      refs.api.current = null;
    };
    // the refs are stable; the keys stand for the route, the pieces and the labels
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeKey, piecesKey, labelsKey, candles, animate]);
}
