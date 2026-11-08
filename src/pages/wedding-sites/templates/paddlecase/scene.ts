// The Paddle Case: one Blender still of an open case on a walnut table, seen from straight above
// (~/rsvp-teaser/pickle3d/paddlecase.py), and where each object's words go in it.

export const BASE = "/event-templates/paddlecase";
export const STILL = `${BASE}/open.webp`;
/** The still's size in px: the scene is laid out at exactly this size, then moved by one transform. */
export const IMG = [3240, 2160] as const;
/** The opening: the closed case, the zipper pull sliding down, the lid swinging open (1080×720). */
export const INTRO_FRAMES = 62;
export const introFrame = (i: number) => `${BASE}/intro/f${String(i).padStart(2, "0")}.webp`;

type Pt = [number, number];
export type Quad = [Pt, Pt, Pt, Pt];
export type SurfaceKey = "title" | "paddle" | "message" | "schedule" | "rsvp" | "bring" | "wear";

/** Each object's printable face: its corners (top left, top right, bottom right, bottom left) as
 *  fractions of the still, from the render. */
export const SURFACES: Record<SurfaceKey, Quad> = {
  paddle: [[0.44167, 0.22222], [0.59907, 0.22222], [0.59907, 0.56944], [0.44167, 0.56944]],
  message: [[0.52039, 0.62447], [0.6019, 0.65046], [0.57591, 0.83386], [0.4944, 0.80787]],
  title: [[0.11852, 0.1875], [0.34074, 0.1875], [0.34074, 0.38194], [0.11852, 0.38194]],
  schedule: [[0.11038, 0.4756], [0.23508, 0.46252], [0.24703, 0.71884], [0.12233, 0.73192]],
  rsvp: [[0.24889, 0.48251], [0.36419, 0.49764], [0.34926, 0.7536], [0.23396, 0.73847]],
  bring: [[0.12778, 0.75833], [0.33148, 0.75833], [0.33148, 0.83889], [0.12778, 0.83889]],
  wear: [[0.80734, 0.28677], [0.91324, 0.27008], [0.92969, 0.50489], [0.8238, 0.52159]],
};

/** Each surface's own box in design px (its words are set at this size, then mapped onto the quad). */
export const SIZES: Record<SurfaceKey, [number, number]> = {
  title: [960, 560],
  paddle: [680, 1000],
  message: [600, 900],
  schedule: [680, 930],
  rsvp: [620, 920],
  bring: [900, 240],
  wear: [520, 940],
};

/** The affine that lays a w×h box onto a quad (from three of its corners). */
export function quadMatrix(key: SurfaceKey): string {
  const [w, h] = SIZES[key];
  const q = SURFACES[key].map(([x, y]) => [x * IMG[0], y * IMG[1]]);
  const a = (q[1][0] - q[0][0]) / w, b = (q[1][1] - q[0][1]) / w;
  const c = (q[3][0] - q[0][0]) / h, d = (q[3][1] - q[0][1]) / h;
  return `matrix(${a.toFixed(6)}, ${b.toFixed(6)}, ${c.toFixed(6)}, ${d.toFixed(6)}, ${q[0][0].toFixed(2)}, ${q[0][1].toFixed(2)})`;
}

/** A camera stop: the rectangle of the still to frame (fractions). */
export type Rect = [number, number, number, number];
export function bbox(names: SurfaceKey[], pad: number): Rect {
  let x0 = 1, y0 = 1, x1 = 0, y1 = 0;
  for (const n of names)
    for (const [x, y] of SURFACES[n]) {
      x0 = Math.min(x0, x);
      y0 = Math.min(y0, y);
      x1 = Math.max(x1, x);
      y1 = Math.max(y1, y);
    }
  return [x0 - pad, y0 - pad, x1 + pad, y1 + pad];
}
/** The whole case (a computer), the case body (a phone), the card's 4:3 (covers it edge to edge). */
export const WHOLE: Rect = [0.03, 0.06, 0.97, 0.94];
export const BODY: Rect = [0.355, 0.07, 0.675, 0.93];
export const CARD: Rect = [0.056, 0.03, 0.946, 0.97];

export type Cam = { s: number; x: number; y: number };
/** Where the scene goes to show `r` in a vw×vh frame: fitted and centred, and never showing past
 *  the still's edge when the still is bigger than the frame. */
export function frameFor(r: Rect, vw: number, vh: number): Cam {
  const w = (r[2] - r[0]) * IMG[0], h = (r[3] - r[1]) * IMG[1];
  const s = Math.min(vw / w, vh / h);
  const cx = ((r[0] + r[2]) / 2) * IMG[0], cy = ((r[1] + r[3]) / 2) * IMG[1];
  let x = vw / 2 - cx * s, y = vh / 2 - cy * s;
  const W = IMG[0] * s, H = IMG[1] * s;
  x = W > vw ? Math.min(0, Math.max(vw - W, x)) : (vw - W) / 2;
  y = H > vh ? Math.min(0, Math.max(vh - H, y)) : (vh - H) / 2;
  return { s, x, y };
}
const smooth = (t: number) => t * t * (3 - 2 * t);
/** The camera between stops a and b, t of the way (zoom in log space, so the move feels even). */
export function between(a: Cam, b: Cam, t: number): Cam {
  const k = smooth(Math.min(1, Math.max(0, t)));
  return { s: Math.exp(Math.log(a.s) + (Math.log(b.s) - Math.log(a.s)) * k), x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
}

/**
 * Fits a surface's words to its fixed face: the words are sized from `--fit` (1 = the design's
 * own size), which shrinks until they fit (never below `min`). The surface is the face (its
 * padding the margins); `.pc-in` inside it holds the words.
 */
export function fitSurface(el: HTMLElement, min: number) {
  const inner = el.querySelector<HTMLElement>(":scope > .pc-in");
  if (!inner) return;
  const cs = getComputedStyle(el);
  const room = el.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
  const fits = (f: number) => {
    el.style.setProperty("--fit", String(f));
    return inner.offsetHeight <= room + 0.5 && inner.scrollWidth <= inner.clientWidth + 1;
  };
  if (fits(1)) return;
  let lo = min, hi = 1;
  for (let i = 0; i < 8; i++) {
    const mid = (lo + hi) / 2;
    if (fits(mid)) lo = mid;
    else hi = mid;
  }
  el.style.setProperty("--fit", lo.toFixed(3));
}

// ---- words

const NUMBERS = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
/** 35 → "thirty-five" (up to 119; past that the number itself). */
export function ageWords(n: number): string {
  if (n < 20) return NUMBERS[n];
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? `-${NUMBERS[n % 10]}` : "");
  if (n < 120) return `one hundred${n % 100 ? ` ${ageWords(n % 100)}` : ""}`;
  return String(n);
}
/** 35 → "XXXV". */
export function roman(n: number): string {
  const R: [number, string][] = [[100, "C"], [90, "XC"], [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"]];
  let out = "";
  for (const [v, s] of R) while (n >= v) { out += s; n -= v; }
  return out;
}
/** The celebrant's initials: "Nico Santos" → "NS"; two celebrants → "N&R" (their first names). */
export function initialsOf(names: string[]): string {
  const people = names.map((n) => n.trim()).filter(Boolean);
  if (!people.length) return "";
  const letter = (w: string) => (w.match(/\p{L}/u)?.[0] ?? "").toUpperCase();
  if (people.length > 1) return people.slice(0, 3).map((p) => letter(p)).filter(Boolean).join("&");
  const words = people[0].split(/\s+/).filter((w) => /\p{L}/u.test(w));
  if (words.length <= 1) return letter(words[0] ?? "");
  return letter(words[0]) + letter(words[words.length - 1]);
}
