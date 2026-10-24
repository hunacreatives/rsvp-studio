import type { CSSProperties } from "react";

// Lacquer Door's drawings: everything is drawn here, fine-lined and flat (no gradients on
// the lacquer, no glitter). Cinnabar lacquer, a darker lacquer for rails and frames, leaf-gold
// hairlines, rice paper behind the lattice.

export const CINNABAR = "#B3352B";
export const LACQUER = "#5E1915";
export const GOLD = "#B08D4A";
export const PAPER = "#F5EEE2";

const svg = (w: number, h: number, body: string) => `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`)}`;

/**
 * The window lattice (燈籠框, the "lantern frame"): a grid with a rectangle inside every cell,
 * tied to the grid by a short bar in the middle of each side. One tile, cinnabar bars with a
 * lacquer shadow on one side so they read as carved; it repeats a whole number of times
 * across every panel (background-repeat: round).
 */
const BARS = [
  // the grid (half a bar on each edge, so neighbouring tiles join)
  [0, 0, 40, 1.7],
  [0, 54.3, 40, 1.7],
  [0, 0, 1.7, 56],
  [38.3, 0, 1.7, 56],
  // the lantern inside
  [8.3, 10.3, 23.4, 3.4],
  [8.3, 42.3, 23.4, 3.4],
  [8.3, 10.3, 3.4, 35.4],
  [28.3, 10.3, 3.4, 35.4],
  // its ties
  [18.3, 0, 3.4, 10.3],
  [18.3, 45.7, 3.4, 10.3],
  [0, 26.3, 8.3, 3.4],
  [31.7, 26.3, 8.3, 3.4],
];
const rects = (fill: string, dx = 0, dy = 0) => BARS.map(([x, y, w, h]) => `<rect x="${x + dx}" y="${y + dy}" width="${w}" height="${h}" fill="${fill}"/>`).join("");
export const LATTICE = svg(40, 56, `${rects(LACQUER, 0.8, 0.9)}${rects(CINNABAR)}`);

/** The same lattice, set square (the transom and the photo frames). */
export const LATTICE_SQ = svg(40, 40, (() => {
  const b = [
    [0, 0, 40, 1.6],
    [0, 38.4, 40, 1.6],
    [0, 0, 1.6, 40],
    [38.4, 0, 1.6, 40],
    [9.3, 9.3, 21.4, 3.2],
    [9.3, 27.5, 21.4, 3.2],
    [9.3, 9.3, 3.2, 21.4],
    [27.5, 9.3, 3.2, 21.4],
    [18.4, 0, 3.2, 9.3],
    [18.4, 30.7, 3.2, 9.3],
    [0, 18.4, 9.3, 3.2],
    [30.7, 18.4, 9.3, 3.2],
  ];
  const r = (fill: string, d: number) => b.map(([x, y, w, h]) => `<rect x="${x + d}" y="${y + d}" width="${w}" height="${h}" fill="${fill}"/>`).join("");
  return `${r(LACQUER, 0.8)}${r(CINNABAR, 0)}`;
})());

/** The carved skirt panel at the foot of each door: a recessed field and a cartouche with
 *  concave corners (海棠開光), in gold line. Stretches with the door; the lines stay fine. */
export function Skirt() {
  return (
    <svg className="lq-skirt" viewBox="0 0 160 100" preserveAspectRatio="none" aria-hidden>
      <rect x="1" y="1" width="158" height="98" fill="none" stroke={GOLD} strokeWidth="1" vectorEffect="non-scaling-stroke" />
      <path
        d="M30 18 H130 Q130 28 140 28 V72 Q130 72 130 82 H30 Q30 72 20 72 V28 Q30 28 30 18 Z"
        fill={LACQUER}
        fillOpacity=".35"
        stroke={GOLD}
        strokeWidth="1"
        vectorEffect="non-scaling-stroke"
      />
      <path d="M36 25 H124 Q124 33 132 33 V67 Q124 67 124 75 H36 Q36 67 28 67 V33 Q36 33 36 25 Z" fill="none" stroke={GOLD} strokeOpacity=".55" strokeWidth=".8" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/** A brass door ring on its boss (鋪首). It hangs from the knob, so it can sway. */
export function Ring() {
  return (
    <svg className="lq-ring" viewBox="0 0 40 60" aria-hidden>
      <circle cx="20" cy="15" r="12" fill={LACQUER} stroke={GOLD} strokeWidth="1.4" />
      <circle cx="20" cy="15" r="8.2" fill="none" stroke={GOLD} strokeWidth=".7" strokeOpacity=".7" />
      <g className="lq-ring__swing">
        <rect x="18.4" y="15" width="3.2" height="8" rx="1.2" fill={GOLD} />
        <circle cx="20" cy="38" r="13.5" fill="none" stroke={GOLD} strokeWidth="2.8" />
        <circle cx="20" cy="38" r="13.5" fill="none" stroke="#6e5428" strokeWidth=".7" strokeOpacity=".6" />
      </g>
      <circle cx="20" cy="15" r="3.4" fill={GOLD} />
    </svg>
  );
}

/** Gold meander corners (回紋) for a framed panel: put inside a positioned box. */
export function Corners({ className = "" }: { className?: string }) {
  const c = (pos: string) => (
    <svg key={pos} className={`lq-corner lq-corner--${pos}`} viewBox="0 0 24 24" aria-hidden>
      <path d="M1.5 22.5 V1.5 H22.5 M6 22.5 V6 H17 V12.5 H11.5 V17" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="square" />
    </svg>
  );
  return <span className={`lq-corners ${className}`}>{["tl", "tr", "bl", "br"].map(c)}</span>;
}

/** A short gold rule with a lattice knot in the middle. */
export function Knot({ className = "", style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg className={`lq-knot ${className}`} style={style} viewBox="0 0 132 14" aria-hidden>
      <path d="M0 7 H52 M80 7 H132" stroke="currentColor" strokeWidth="1" />
      <rect x="59" y="0.9" width="8.6" height="8.6" transform="rotate(45 66 7)" fill="none" stroke="currentColor" strokeWidth="1" />
      <rect x="62.2" y="4.2" width="2.6" height="2.6" transform="rotate(45 66 7)" fill="currentColor" />
      <path d="M52 7 H57 M75 7 H80" stroke="currentColor" strokeWidth="1" strokeDasharray="1.5 2" />
    </svg>
  );
}

/**
 * The lid of a tiered betrothal box (the gift boxes the groom's family carries in), with its
 * carrying handle arching over the top. Drawn to the box's width; its height follows.
 */
export function BoxLid() {
  return (
    <svg className="lq-lid" viewBox="0 0 600 150" aria-hidden>
      {/* the handle */}
      <path d="M70 140 V58 Q70 12 120 12 H480 Q530 12 530 58 V140" fill="none" stroke={LACQUER} strokeWidth="13" />
      <path d="M70 140 V58 Q70 12 120 12 H480 Q530 12 530 58 V140" fill="none" stroke={GOLD} strokeWidth="1.1" />
      <rect x="282" y="4" width="36" height="16" rx="2" fill={LACQUER} stroke={GOLD} strokeWidth="1.1" />
      {/* the lid, stepped */}
      <path d="M58 150 L86 104 H514 L542 150 Z" fill={CINNABAR} />
      <path d="M58 150 L86 104 H514 L542 150" fill="none" stroke={GOLD} strokeWidth="1.1" />
      <rect x="110" y="88" width="380" height="16" fill={LACQUER} />
      <path d="M110 88 H490 M110 104 H490" stroke={GOLD} strokeWidth="1.1" />
      <circle cx="300" cy="78" r="10" fill={LACQUER} stroke={GOLD} strokeWidth="1.1" />
      <circle cx="300" cy="78" r="3.6" fill={GOLD} />
      <path d="M120 128 H480" stroke={GOLD} strokeWidth=".8" strokeOpacity=".7" />
    </svg>
  );
}

/** The box's base: a plinth, a little wider than the tiers, on two bracket feet. */
export function BoxBase() {
  return (
    <svg className="lq-base" viewBox="0 0 600 60" aria-hidden>
      <rect x="44" y="0" width="512" height="22" fill={LACQUER} />
      <path d="M44 1 H556 M44 21.5 H556" stroke={GOLD} strokeWidth="1.1" />
      <path d="M58 22 H164 Q164 36 148 38 Q128 40 122 58 H70 Q68 36 58 32 Z" fill={LACQUER} />
      <path d="M542 22 H436 Q436 36 452 38 Q472 40 478 58 H530 Q532 36 542 32 Z" fill={LACQUER} />
      <path d="M70 58 Q68 36 58 32 M122 58 Q128 40 148 38 Q164 36 164 22 M530 58 Q532 36 542 32 M478 58 Q472 40 452 38 Q436 36 436 22" fill="none" stroke={GOLD} strokeWidth="1" />
    </svg>
  );
}

/** A red envelope (ang pao), for the gifts. */
export function AngPao() {
  return (
    <svg className="lq-angpao" viewBox="0 0 44 64" aria-hidden>
      <rect x="1" y="1" width="42" height="62" rx="2" fill={CINNABAR} />
      <rect x="4" y="4" width="36" height="56" rx="1" fill="none" stroke={GOLD} strokeWidth=".9" />
      <path d="M1 3 L22 22 L43 3" fill="none" stroke={LACQUER} strokeWidth="1.2" />
      <circle cx="22" cy="24" r="5.5" fill={GOLD} />
      <circle cx="22" cy="24" r="2" fill={CINNABAR} />
    </svg>
  );
}

/** The ceremony's mark: a pair of lattice doors. The banquet's: a round table set for ten. */
export function DoorsMark() {
  return (
    <svg className="lq-mark" viewBox="0 0 48 48" aria-hidden>
      <rect x="6" y="5" width="36" height="40" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <path d="M24 5 V45 M9 9 H21 V30 H9 Z M27 9 H39 V30 H27 Z M9 34 H21 V41 H9 Z M27 34 H39 V41 H27 Z" fill="none" stroke="currentColor" strokeWidth=".9" />
      <path d="M13 9 V30 M17 9 V30 M9 16 H21 M9 23 H21 M31 9 V30 M35 9 V30 M27 16 H39 M27 23 H39" stroke="currentColor" strokeWidth=".5" />
      <circle cx="21.5" cy="32" r="1.1" fill="currentColor" />
      <circle cx="26.5" cy="32" r="1.1" fill="currentColor" />
    </svg>
  );
}
export function TableMark() {
  const seats = Array.from({ length: 10 }, (_, i) => {
    const a = (i / 10) * Math.PI * 2;
    return <circle key={i} cx={24 + Math.cos(a) * 19} cy={24 + Math.sin(a) * 19} r="2.4" fill="none" stroke="currentColor" strokeWidth=".9" />;
  });
  return (
    <svg className="lq-mark" viewBox="0 0 48 48" aria-hidden>
      <circle cx="24" cy="24" r="13" fill="none" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="24" cy="24" r="6" fill="none" stroke="currentColor" strokeWidth=".7" />
      {seats}
    </svg>
  );
}
