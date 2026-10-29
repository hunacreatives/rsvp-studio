/**
 * Pixel Quest's art, all drawn in code: the palette, the hand-placed sprites (each a list of
 * rows, one character per pixel), a tiny 3×5 pixel font for the signs in the world, and the
 * set pieces (the start gate, the party hall, the power-up shop, the treasure, the sage's tree,
 * the cake) drawn pixel by pixel into the level's low-resolution canvas.
 * Every coordinate here is in the level's own pixels (one "pixel" is several screen pixels).
 */

export const C = {
  ink: "#1b1030",
  night: "#14112e",
  cream: "#fff1d0",
  creamDark: "#e9cf9c",
  white: "#ffffff",
  gold: "#ffd23f",
  goldDark: "#e89a1c",
  goldDeep: "#a8560f",
  coral: "#ff5a5f",
  coralDark: "#c23a4a",
  pink: "#ff8fb1",
  pinkLight: "#ffc6d6",
  teal: "#2ec4b6",
  tealDark: "#1a8a80",
  tealDeep: "#0f5a57",
  violet: "#7b5cff",
  violetDark: "#5338c9",
  blue: "#3d5a9e",
  blueDark: "#2b3f75",
  orange: "#ff8a3d",
  orangeDark: "#d9622b",
  skin: "#f2b48a",
  skinDark: "#c9805e",
  hair: "#3a2418",
  grass: "#7ad65a",
  grassDark: "#3fa34d",
  grassDeep: "#2a7a3e",
  dirt: "#a5603a",
  dirtDark: "#7a4227",
  dirtDeep: "#54291b",
  wood: "#c07a3e",
  woodDark: "#83491f",
  stone: "#a9aec6",
  stoneDark: "#71779a",
  stoneDeep: "#4c5175",
  fur: "#b07a4a",
  furDark: "#7d5230",
  furLight: "#e0b585",
  lit: "#ffe27a",
} as const;

// one character per pixel ('.' is clear)
export const PAL: Record<string, string> = {
  k: C.ink, w: C.white, q: C.cream, Q: C.creamDark, y: C.gold, Y: C.goldDark, Z: C.goldDeep,
  r: C.coral, R: C.coralDark, p: C.pink, P: C.pinkLight, t: C.teal, T: C.tealDark, D: C.tealDeep,
  v: C.violet, V: C.violetDark, b: C.blue, B: C.blueDark, o: C.orange, O: C.orangeDark,
  s: C.skin, S: C.skinDark, h: C.hair, c: C.pink, m: "#8a2a3a", n: C.fur, N: C.furDark, l: C.furLight,
  g: C.grass, G: C.grassDark, x: C.wood, X: C.woodDark, e: C.stone, E: C.stoneDark, i: C.lit,
};

/* ---- the hero: a kid in a party hat and a scarf, facing right (16 × 24) */
const HEAD = [
  "........ww......",
  ".......kwwk.....",
  ".......kyyk.....",
  "......krrrrk....",
  "......kyyyyk....",
  ".....krrrrrrk...",
  ".....kyyyyyyk...",
  "...khhhhhhhhhk..",
  "..khhhhhhhhhhhk.",
  "..khhsssssssssk.",
];
const EYES_OPEN = ["..khssssksskssk.", "..khssssksskssk."];
const EYES_SHUT = ["..khssssssssssk.", "..khssssksskssk."];
const FACE_LOW = [
  "..khssscsmmscsk.",
  "...ksssssssssk..",
  "...kooooooooOk..",
  ".OOktttttttttk..",
  "..ktttttwtttttk.",
  "..ksTtttwtttTsk.",
  "...kTTTTTTTTTk..",
  "...kbbbbbbbbbk..",
];
const LEGS_STAND = ["...kbbBk.kbbBk..", "...kbbBk.kbbBk..", "..kooookkoooook.", "..kkkkkk.kkkkkk."];
const LEGS_RUN = ["..kbbBk..kbbBk..", ".kbbBk....kbbBk.", "kooOk......kooOk", "kkkkk......kkkkk"];
const LEGS_JUMP = ["..kbbBk...kbbBk.", "..kbBk.....kbBk.", "..kook......kook", "...kk........kk."];
export const HERO = {
  stand: [...HEAD, ...EYES_OPEN, ...FACE_LOW, ...LEGS_STAND],
  blink: [...HEAD, ...EYES_SHUT, ...FACE_LOW, ...LEGS_STAND],
  run: [...HEAD, ...EYES_OPEN, ...FACE_LOW, ...LEGS_RUN],
  jump: [...HEAD, ...EYES_OPEN, ...FACE_LOW, ...LEGS_JUMP],
};
// the hero's face for the HUD and the map card
export const HERO_FACE = [...HEAD.slice(0, 10), ...EYES_OPEN, "..khssscsmmscsk.", "...ksssssssssk..", "...kooooooooOk..", "....kkkkkkkkk..."];

/* ---- the shopkeeper: a round, moustached vendor in a striped cap (14 × 15, above the counter) */
export const SHOPKEEPER = [
  "....kkkkkk....",
  "...kttqqttk...",
  "..kttqqttqqk..",
  ".kkkkkkkkkkkk.",
  ".kssssssssssk.",
  ".kssksssskssk.",
  ".kssksssskssk.",
  ".kcsshhhhsscs.",
  ".ksshhhhhhssk.",
  "..ksssmmsssk..",
  "...kssssssk...",
  "..kqqqqqqqqk..",
  ".kqrqqqqqqrqk.",
  ".kqrqqqqqqrqk.",
  ".kqqqqqqqqqqk.",
];
/* ---- the sage: a tarsier with enormous eyes (16 × 16) */
export const TARSIER = [
  ".kk..........kk.",
  "knnk........knnk",
  "knPnk......knPnk",
  "knnnkkkkkkkknnnk",
  ".kknnnnnnnnnnkk.",
  ".knnnnnnnnnnnnk.",
  ".kNYYYNllNYYYNk.",
  ".kYwyYYllYwyYYk.",
  ".kYykkYllYykkYk.",
  ".kYykkYllYykkYk.",
  ".kNYYYNllNYYYNk.",
  ".knnnnnllnnnnnk.",
  "..knnnnkknnnnk..",
  "...knlllllllk...",
  "..knllllllllnk..",
  ".knlnkllllknlnk.",
  "..kk.kkkkkk.kk..",
];
// the sage with its eyes shut
export const TARSIER_BLINK = TARSIER.map((row, i) => (i >= 6 && i <= 10 ? (i === 8 ? ".knkkknllnkkknk." : ".knnnnnllnnnnnk.") : row));
/* ---- small icons for the cards (16 × 16 each) */
export const ICON_BALLOONS = [
  "....kkk.........",
  "...krrrk..kkk...",
  "..krrwrrkkyyyk..",
  "..krrrrrkyywyyk.",
  "..krrrrrkyyyyyk.",
  "...krrrk.kyyyk..",
  "....kRk.kkyyyk..",
  ".....k.ktkYk....",
  ".....kkttwk.....",
  "......ktttk.....",
  "......kttTk.....",
  ".......kTk......",
  "......k.k.......",
  ".....k...k......",
  "......k.k.......",
  ".......k........",
];
export const ICON_CHEST = [
  "................",
  "................",
  "...kkkkkkkkkk...",
  "..kxxxxxxxxxxk..",
  ".kxxXxxxxxxXxxk.",
  ".kyyyyyyyyyyyyk.",
  ".kZZZZZkkZZZZZk.",
  ".kxxxxkyykxxxxk.",
  ".kxxxxkYYkxxxxk.",
  ".kxxxxxkkxxxxxk.",
  ".kxxXxxxxxxXxxk.",
  ".kyyyyyyyyyyyyk.",
  ".kXXXXXXXXXXXXk.",
  "..kkkkkkkkkkkk..",
  "................",
  "................",
];
export const ICON_CAKE = [
  "......i..i......",
  "......o..o......",
  "......q..q......",
  "......r..r......",
  "...kkkkkkkkkk...",
  "..kqqqqqqqqqqk..",
  "..kqpqqpqqpqqk..",
  "..kppppppppppk..",
  ".kkkkkkkkkkkkkk.",
  ".kqqqqqqqqqqqqk.",
  ".kqqpqqqpqqqpqk.",
  ".kpppppppppppppk".slice(0, 16),
  ".kpkpppppppkppk.",
  ".kppppmmmppppppk".slice(0, 16),
  ".kPPPPPPPPPPPPk.",
  "..kkkkkkkkkkkk..",
];
/* ---- the power-ups on the shop counter (8 × 8) */
export const ITEM_HAT = ["...kk...", "..kyyk..", "..krrk..", ".kyyyyk.", ".krrrrk.", "kyyyyyyk", "kkkkkkkk", "........"];
export const ITEM_SHIRT = [".kk..kk.", "kttkkttk", "kttwwttk", ".kttttk.", ".kttttk.", ".kTttTk.", ".kTTTTk.", "..kkkk.."];
export const ITEM_SHOES = ["........", "..kkk...", ".kooOk..", ".kooookk", "koooooOk", "kqqqqqqk", "kkkkkkkk", "........"];
/* ---- a coin, four turns (6 × 8) */
export const COIN = [
  [".kkkk.", "kyyyYk", "kywyYk", "kywyYk", "kyyyYk", "kyyyYk", "kyyyYk", ".kkkk."],
  ["..kk..", ".kyYk.", ".kwyk.", ".kwyk.", ".kyYk.", ".kyYk.", ".kyYk.", "..kk.."],
  ["..kk..", "..kk..", "..kk..", "..kk..", "..kk..", "..kk..", "..kk..", "..kk.."],
  ["..kk..", ".kYyk.", ".kywk.", ".kywk.", ".kYyk.", ".kYyk.", ".kYyk.", "..kk.."],
];

// rows → a canvas (and a mirrored copy, for facing left)
export function sprite(rows: string[], flip = false): HTMLCanvasElement {
  const w = Math.max(...rows.map((r) => r.length)), h = rows.length;
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  const c = cv.getContext("2d");
  if (!c) return cv;
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const col = PAL[row[x]];
      if (!col) continue;
      c.fillStyle = col;
      c.fillRect(flip ? w - 1 - x : x, y, 1, 1);
    }
  });
  return cv;
}

// rows → SVG paths, one per colour (for the cards' portraits, crisp at any size)
export function pixelPaths(rows: string[]): { w: number; h: number; paths: { fill: string; d: string }[] } {
  const w = Math.max(...rows.map((r) => r.length)), h = rows.length;
  const by: Record<string, string> = {};
  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const ch = row[x];
      if (!PAL[ch]) { x++; continue; }
      let n = 1;
      while (row[x + n] === ch) n++;
      by[ch] = (by[ch] ?? "") + `M${x} ${y}h${n}v1h-${n}z`;
      x += n;
    }
  });
  return { w, h, paths: Object.entries(by).map(([ch, d]) => ({ fill: PAL[ch], d })) };
}

/* ---- a 3 × 5 pixel font for the signs in the world */
const GLYPHS: Record<string, string> = {
  A: "010101111101101", B: "110101110101110", C: "011100100100011", D: "110101101101110", E: "111100110100111",
  F: "111100110100100", G: "011100101101011", H: "101101111101101", I: "111010010010111", K: "101101110101101",
  L: "100100100100111", M: "101111111101101", N: "110101101101101", O: "010101101101010", P: "110101110100100",
  R: "110101110101101", S: "011100010001110", T: "111010010010010", U: "101101101101111", W: "101101111111101",
  Y: "101101010010010", "0": "111101101101111", "1": "010110010010111", "2": "110001010100111", "3": "110001010001110",
  "4": "101101111001001", "5": "111100110001110", "6": "011100110101010", "7": "111001010010010", "8": "010101010101010",
  "9": "010101011001110", "?": "110001010000010", "!": "010010010000010", "+": "000010111010000", " ": "000000000000000",
};
export function textWidth(s: string) { return Math.max(0, s.length * 4 - 1); }
export function pixText(c: CanvasRenderingContext2D, s: string, x: number, y: number, col: string) {
  c.fillStyle = col;
  x = Math.round(x); y = Math.round(y);
  [...s.toUpperCase()].forEach((ch, i) => {
    const g = GLYPHS[ch] ?? GLYPHS[" "];
    for (let j = 0; j < 15; j++) if (g[j] === "1") c.fillRect(x + i * 4 + (j % 3), y + Math.floor(j / 3), 1, 1);
  });
}

/* ---- drawing helpers, in level pixels */
type Ctx = CanvasRenderingContext2D;
export function R(c: Ctx, x: number, y: number, w: number, h: number, col: string) {
  c.fillStyle = col;
  c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}
// a box with a 1-pixel ink outline
function box(c: Ctx, x: number, y: number, w: number, h: number, col: string) {
  R(c, x, y, w, h, C.ink);
  R(c, x + 1, y + 1, w - 2, h - 2, col);
}
// a filled pixel circle
export function disc(c: Ctx, cx: number, cy: number, r: number, col: string) {
  c.fillStyle = col;
  for (let y = -r; y <= r; y++) {
    const half = Math.floor(Math.sqrt(r * r - y * y) + 0.35);
    c.fillRect(Math.round(cx - half), Math.round(cy + y), half * 2 + 1, 1);
  }
}
function balloon(c: Ctx, x: number, y: number, col: string, dark: string, string: number) {
  R(c, x, y + 5, 1, string, C.ink);
  disc(c, x, y, 4, C.ink);
  disc(c, x, y, 3, col);
  R(c, x + 1, y + 1, 2, 3, dark);
  R(c, x - 2, y - 2, 1, 2, C.white);
  R(c, x - 1, y + 4, 3, 1, dark);
}
// a pennant line: little flags, alternating colours, hanging from a sagging string
function bunting(c: Ctx, x0: number, x1: number, y: number, sag: number) {
  const cols = [C.coral, C.gold, C.teal, C.violet];
  for (let x = x0; x <= x1; x++) {
    const t = (x - x0) / Math.max(1, x1 - x0), yy = Math.round(y + Math.sin(t * Math.PI) * sag);
    R(c, x, yy, 1, 1, C.ink);
    const k = x - x0;
    if (k % 6 === 1 && x + 4 <= x1) {
      const col = cols[Math.floor(k / 6) % 4];
      for (let r = 0; r < 4; r++) R(c, x + r * 0.5, yy + 1 + r, 4 - r, 1, col);
    }
  }
}

/* ---- the set pieces. x: the centre; gy: the ground line; t: seconds (still at 12) */

// the start gate: two checkered posts and a banner
export function startGate(c: Ctx, x: number, gy: number, t: number, night: number) {
  for (const px of [x - 24, x + 21]) {
    R(c, px - 1, gy - 38, 5, 38, C.ink);
    for (let y = 0; y < 36; y += 2) R(c, px, gy - 37 + y, 3, 2, (y / 2) % 2 ? C.cream : C.night);
    R(c, px - 2, gy - 41, 7, 3, C.ink); R(c, px - 1, gy - 40, 5, 1, C.gold);
    // a pennant on top, flapping
    const f = Math.floor(t * 4) % 2;
    R(c, px + 1, gy - 48, 1, 7, C.ink);
    for (let r = 0; r < 4; r++) R(c, px + 2, gy - 48 + r, 5 - r - f, 1, r % 2 ? C.coralDark : C.coral);
  }
  box(c, x - 25, gy - 36, 51, 11, C.coral);
  R(c, x - 24, gy - 35, 49, 1, "#ff8a8d");
  R(c, x - 24, gy - 27, 49, 1, C.coralDark);
  pixText(c, "START", x - textWidth("START") / 2, gy - 33, C.cream);
  if (night > 0.05) lightDots(c, [[x - 23, gy - 41], [x + 24, gy - 41]], night, t);
}

// the party hall: cream walls, a striped roof, lit windows, bunting and balloons
export function partyHall(c: Ctx, x: number, gy: number, t: number, night: number) {
  const x0 = x - 28;
  // the roof: a gable in coral and cream stripes
  for (let k = 0; k < 13; k++) {
    const w = 14 + k * 4, y = gy - 44 + k;
    R(c, x - w / 2 - 1, y, w + 2, 1, C.ink);
    R(c, x - w / 2, y, w, 1, k % 4 < 2 ? C.coral : C.cream);
  }
  R(c, x0 - 4, gy - 31, 64, 2, C.ink);
  // the walls
  box(c, x0, gy - 30, 56, 30, "#f6e3c0");
  for (let y = gy - 26; y < gy; y += 4) for (let bx = x0 + 1 + ((y / 4) % 2) * 3; bx < x0 + 55; bx += 6) R(c, bx, y, 1, 1, "#e0c597");
  // the door and the sign over it
  box(c, x - 7, gy - 17, 14, 17, C.woodDark);
  R(c, x - 5, gy - 15, 10, 15, C.wood);
  R(c, x, gy - 15, 1, 15, C.woodDark);
  R(c, x + 3, gy - 8, 1, 2, C.gold);
  box(c, x - 13, gy - 41, 26, 9, C.night);
  R(c, x - 12, gy - 40, 24, 1, C.violetDark);
  pixText(c, "PARTY", x - textWidth("PARTY") / 2, gy - 39, C.gold);
  // the windows, lit
  for (const wx of [x0 + 5, x0 + 42]) {
    box(c, wx, gy - 22, 10, 10, C.lit);
    R(c, wx + 4, gy - 21, 1, 8, C.ink); R(c, wx + 1, gy - 18, 8, 1, C.ink);
    R(c, wx + 1, gy - 21, 2, 2, C.white);
  }
  bunting(c, x0 - 2, x0 + 57, gy - 29, 3);
  // balloons, tied at the roof's right side, bobbing
  const bob = (i: number) => (Math.floor(t * 1.6 + i * 0.9) % 2 ? 1 : 0);
  balloon(c, x + 18, gy - 56 + bob(0), C.coral, C.coralDark, 10);
  balloon(c, x + 26, gy - 52 + bob(1), C.gold, C.goldDark, 8);
  balloon(c, x + 22, gy - 64 + bob(2), C.teal, C.tealDark, 16);
  balloon(c, x - 22, gy - 54 + bob(3), C.violet, C.violetDark, 12);
  if (night > 0.05) lightDots(c, [[x0 + 10, gy - 17], [x0 + 47, gy - 17]], night, t, 6);
}

// the power-up shop: a striped awning, a counter, the shopkeeper, the power-ups floating
export function powerShop(c: Ctx, x: number, gy: number, t: number, night: number, keeper: HTMLCanvasElement, items: HTMLCanvasElement[]) {
  for (const px of [x - 26, x + 23]) box(c, px, gy - 44, 4, 44, C.wood);
  // the sign
  box(c, x - 13, gy - 55, 26, 9, C.night);
  R(c, x - 12, gy - 54, 24, 1, C.violetDark);
  pixText(c, "SHOP", x - textWidth("SHOP") / 2, gy - 53, C.gold);
  R(c, x - 9, gy - 46, 1, 3, C.ink); R(c, x + 8, gy - 46, 1, 3, C.ink);
  // the awning: stripes, a scalloped edge
  R(c, x - 31, gy - 44, 62, 9, C.ink);
  for (let k = 0; k < 15; k++) R(c, x - 30 + k * 4, gy - 43, 4, 7, k % 2 ? C.cream : C.teal);
  for (let k = 0; k < 15; k++) { R(c, x - 30 + k * 4, gy - 36, 4, 1, C.ink); R(c, x - 29 + k * 4, gy - 36, 2, 2, k % 2 ? C.cream : C.teal); R(c, x - 29 + k * 4, gy - 34, 2, 1, C.ink); }
  // the shopkeeper behind the counter
  c.drawImage(keeper, Math.round(x - 7), gy - 14 - 14);
  // the counter
  box(c, x - 26, gy - 15, 53, 15, C.wood);
  R(c, x - 25, gy - 14, 51, 2, "#e09a5a");
  for (let k = 1; k < 4; k++) R(c, x - 25 + k * 13, gy - 12, 1, 11, C.woodDark);
  // the power-ups, floating over the counter, a coin price under each
  const at = [-23, 9, 18];
  items.forEach((it, i) => {
    const up = Math.round(Math.sin(t * 2.4 + i * 2) * 1.2);
    c.drawImage(it, Math.round(x + at[i]), gy - 25 - (i % 2) * 3 + up);
  });
  // a lantern under the awning
  R(c, x + 19, gy - 34, 1, 3, C.ink);
  box(c, x + 17, gy - 31, 5, 6, C.lit);
  if (night > 0.05) lightDots(c, [[x + 19, gy - 28]], night, t, 7);
}

// the treasure: two old columns, a stone step, the chest (open once the hero is here)
export function treasure(c: Ctx, x: number, gy: number, t: number, night: number, open: number) {
  for (const px of [x - 30, x + 24]) {
    box(c, px - 1, gy - 40, 8, 4, C.stone);
    box(c, px, gy - 37, 6, 37, C.stone);
    R(c, px + 1, gy - 36, 1, 35, "#cfd3e6");
    R(c, px + 4, gy - 36, 1, 35, C.stoneDark);
    for (let y = gy - 30; y < gy; y += 9) R(c, px + 1, y, 4, 1, C.stoneDark);
    // ivy
    for (let y = gy - 34; y < gy - 8; y += 3) R(c, px + ((y / 3) % 2 ? 0 : 4), y, 2, 2, C.grassDark);
  }
  box(c, x - 20, gy - 5, 40, 5, C.stoneDark);
  box(c, x - 16, gy - 9, 32, 5, C.stone);
  // the glow and the coins rising out of it
  if (open > 0) {
    const a = Math.min(1, open);
    c.globalAlpha = 0.55 * a;
    for (let k = -3; k <= 3; k++) {
      const len = 16 + ((k + 7) % 3) * 6 + (Math.floor(t * 3 + k) % 2) * 3;
      for (let s = 0; s < len; s++) R(c, x + k * 3 + Math.round((k * s) / 7), gy - 24 - s, 1, 1, k % 2 ? C.gold : C.lit);
    }
    c.globalAlpha = 1;
    for (let k = 0; k < 3; k++) {
      const ph = (t * 0.8 + k / 3) % 1, cy = gy - 26 - ph * 22, cx = x - 6 + k * 6 + Math.round(Math.sin(ph * 6 + k) * 2);
      c.globalAlpha = a * (1 - ph);
      R(c, cx, cy, 3, 4, C.ink); R(c, cx + 1, cy + 1, 1, 2, C.gold);
      c.globalAlpha = 1;
    }
  }
  // the chest
  const cx = x - 13, cy = gy - 25;
  box(c, cx, cy + 6, 26, 11, C.wood);
  R(c, cx + 1, cy + 7, 24, 2, C.gold);
  R(c, cx + 1, cy + 15, 24, 1, C.woodDark);
  for (const bx of [cx + 4, cx + 21]) R(c, bx, cy + 9, 1, 6, C.woodDark);
  box(c, cx + 11, cy + 8, 5, 6, C.gold); R(c, cx + 13, cy + 10, 1, 2, C.ink);
  if (open > 0.5) {
    // the lid thrown back, its inside dark
    box(c, cx, cy - 4, 26, 5, C.woodDark);
    R(c, cx + 1, cy - 3, 24, 1, C.gold);
    R(c, cx + 1, cy + 1, 24, 5, C.ink);
    R(c, cx + 2, cy + 3, 22, 3, C.goldDark);
    R(c, cx + 4, cy + 2, 3, 2, C.gold); R(c, cx + 12, cy + 2, 4, 2, C.lit); R(c, cx + 19, cy + 2, 3, 2, C.gold);
  } else {
    box(c, cx, cy, 26, 7, C.wood);
    R(c, cx + 1, cy + 1, 24, 1, "#e09a5a");
    R(c, cx + 1, cy + 5, 24, 1, C.gold);
  }
  if (night > 0.05 && open > 0) lightDots(c, [[x, gy - 22]], night, t, 9);
}

// the sage's tree: a trunk, a dithered crown, a branch with the tarsier on it, a lantern
export function sageTree(c: Ctx, x: number, gy: number, t: number, night: number, sage: HTMLCanvasElement, blink: HTMLCanvasElement) {
  const tx = x + 10;
  box(c, tx - 5, gy - 44, 10, 44, C.woodDark);
  R(c, tx - 4, gy - 43, 3, 43, C.wood);
  R(c, tx + 1, gy - 30, 2, 5, C.dirtDeep);
  R(c, tx - 8, gy - 2, 16, 2, C.woodDark);
  // the branch reaching left, where the sage sits
  R(c, x - 22, gy - 26, 28, 4, C.ink);
  R(c, x - 21, gy - 25, 27, 2, C.wood);
  // the crown
  const blobs: [number, number, number][] = [[tx - 10, gy - 52, 12], [tx + 8, gy - 54, 11], [tx - 1, gy - 62, 12], [tx - 18, gy - 46, 8], [tx + 16, gy - 46, 8]];
  for (const [bx, by, r] of blobs) disc(c, bx, by, r + 1, C.ink);
  for (const [bx, by, r] of blobs) disc(c, bx, by, r, C.grassDeep);
  for (const [bx, by, r] of blobs) disc(c, bx - 2, by - 2, r - 3, C.grassDark);
  for (const [bx, by, r] of blobs) for (let k = 0; k < r; k += 3) R(c, bx - r / 2 + k, by - r / 2 + ((k / 3) % 2) * 2, 2, 1, C.grass);
  // the sage, blinking now and then
  const shut = Math.floor(t * 10) % 46 === 0;
  c.drawImage(shut ? blink : sage, Math.round(x - 18), gy - 26 - 16);
  // its question bubble
  const up = Math.floor(t * 1.5) % 2;
  box(c, x - 31, gy - 54 - up, 11, 10, C.cream);
  R(c, x - 23, gy - 45 - up, 2, 2, C.ink); R(c, x - 22, gy - 45 - up, 1, 1, C.cream);
  pixText(c, "?", x - 27, gy - 51 - up, C.violet);
  // the lantern
  R(c, x - 2, gy - 22, 1, 4, C.ink);
  box(c, x - 4, gy - 18, 5, 6, C.lit);
  if (night > 0.05) lightDots(c, [[x - 2, gy - 15]], night, t, 6);
}

// the cake: three tiers, the candles, a face (it's the "boss"), under an arch of lights
export function cakeBoss(c: Ctx, x: number, gy: number, t: number, night: number, candles: number, happy: number) {
  // the arch of lights behind it
  for (let k = 0; k <= 26; k++) {
    const a = Math.PI * (k / 26), ax = x + Math.cos(a) * 38, ay = gy - 4 - Math.sin(a) * 56;
    R(c, ax, ay, 1, 1, C.ink);
    if (k % 2 === 0) R(c, ax, ay + 1, 2, 2, [C.coral, C.gold, C.teal, C.violet][(k / 2) % 4]);
  }
  const tier = (w: number, h: number, y: number, body: string, icing: string) => {
    box(c, x - w / 2, y, w, h, body);
    R(c, x - w / 2 + 1, y + 1, w - 2, 2, icing);
    for (let k = 2; k < w - 2; k += 5) R(c, x - w / 2 + k, y + 3, 2, 1 + ((k / 5) % 2), icing);
  };
  tier(48, 14, gy - 14, C.pink, C.cream);
  tier(38, 12, gy - 26, C.cream, C.pink);
  tier(28, 10, gy - 36, C.pink, C.cream);
  R(c, x - 23, gy - 3, 46, 1, C.coralDark);
  for (let k = -20; k <= 20; k += 8) R(c, x + k, gy - 8, 2, 2, [C.teal, C.gold, C.violet][(k + 20) % 3]);
  // the face on the middle tier
  if (happy > 0.5) {
    for (const ex of [x - 8, x + 5]) { R(c, ex, gy - 20, 1, 1, C.ink); R(c, ex + 1, gy - 21, 1, 1, C.ink); R(c, ex + 2, gy - 20, 1, 1, C.ink); }
    R(c, x - 3, gy - 18, 6, 1, C.ink); R(c, x - 2, gy - 17, 4, 1, C.coralDark);
  } else {
    for (const ex of [x - 8, x + 5]) { R(c, ex, gy - 21, 3, 3, C.ink); R(c, ex, gy - 21, 1, 1, C.white); R(c, ex - 1, gy - 23, 4, 1, C.ink); }
    R(c, x - 3, gy - 17, 1, 1, C.ink); R(c, x - 2, gy - 16, 4, 1, C.ink); R(c, x + 2, gy - 17, 1, 1, C.ink);
  }
  R(c, x - 13, gy - 19, 2, 1, C.coral); R(c, x + 11, gy - 19, 2, 1, C.coral);
  // the candles (one a year, up to nine)
  const n = Math.max(1, Math.min(9, candles)), gap = n > 6 ? 3 : 4;
  for (let k = 0; k < n; k++) {
    const cx = Math.round(x - ((n - 1) * gap) / 2 + k * gap);
    R(c, cx, gy - 42, 2, 6, [C.teal, C.gold, C.violet][k % 3]);
    R(c, cx, gy - 42, 1, 6, C.white);
    const fl = Math.floor(t * 8 + k * 3) % 3;
    R(c, cx, gy - 45 - (fl === 1 ? 1 : 0), 2, 2 + (fl === 1 ? 1 : 0), C.orange);
    R(c, cx + (fl === 2 ? 1 : 0), gy - 44, 1, 1, C.lit);
  }
  if (night > 0.05) {
    const dots: [number, number][] = [];
    for (let k = 0; k <= 26; k += 2) { const a = Math.PI * (k / 26); dots.push([x + Math.cos(a) * 38 + 1, gy - 4 - Math.sin(a) * 56 + 2]); }
    lightDots(c, dots, night, t, 3);
  }
}

// a crate to jump over, and a present block floating over the path
export function crate(c: Ctx, x: number, gy: number) {
  box(c, x - 6, gy - 12, 12, 12, C.wood);
  R(c, x - 5, gy - 11, 10, 1, "#e09a5a");
  for (let k = 0; k < 8; k++) { R(c, x - 4 + k, gy - 10 + k, 1, 1, C.woodDark); R(c, x + 3 - k, gy - 10 + k, 1, 1, C.woodDark); }
}
export function giftBlock(c: Ctx, x: number, y: number, col: string, dark: string) {
  box(c, x - 5, y, 10, 10, col);
  R(c, x - 4, y + 1, 8, 1, C.white);
  R(c, x - 1, y + 1, 2, 8, C.gold); R(c, x - 4, y + 4, 8, 2, C.gold);
  R(c, x - 4, y + 8, 8, 1, dark);
  R(c, x - 3, y - 2, 2, 2, C.gold); R(c, x + 1, y - 2, 2, 2, C.gold);
}

// soft glows round the lights at night (drawn after the night tint, so they stay bright)
const glows: { x: number; y: number; r: number }[] = [];
function lightDots(_c: Ctx, at: [number, number][], _night: number, _t: number, r = 4) {
  for (const [x, y] of at) glows.push({ x, y, r });
}
export function takeGlows() { return glows.splice(0, glows.length); }
