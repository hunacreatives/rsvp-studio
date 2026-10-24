import type { CSSProperties } from "react";

// Porcelain Garden's drawings, all fine cobalt linework the way a blue-and-white painter
// works: an outline first, then a thin wash (peony on the petals, celadon on the leaves, a
// pale cobalt in the bands). Nothing is filled clip art; each petal is an outline with the
// paper showing through. The line colour comes from CSS (--pg-line), so the celadon scheme
// redraws everything in jade green.
//
// Every drawn stroke has pathLength=1, so a design can draw it in (stroke-dashoffset 1 → 0).

const f = (n: number) => +n.toFixed(1);
const pt = (cx: number, cy: number, r: number, a: number) => `${f(cx + r * Math.cos(a))},${f(cy + r * Math.sin(a))}`;
const rnd = (n: number) => {
  const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};

// ---------------------------------------------------------------------------
// The peony (牡丹, riches and honour): ruffled petals in three rings, a bud, cut leaves.

/** One petal: a fan from the heart of the flower with a ruffled outer edge. */
function petal(cx: number, cy: number, a: number, r0: number, r1: number, w: number, seed: number): string {
  const n = 3;
  const edge: string[] = [];
  for (let k = 0; k <= n; k++) {
    const t = a - w + (2 * w * k) / n;
    const r = r1 * (k === 0 || k === n ? 0.78 : 0.86 + rnd(seed * 9 + k) * 0.05);
    if (k === 0) edge.push(pt(cx, cy, r, t));
    else {
      const tm = a - w + (2 * w * (k - 0.5)) / n;
      edge.push(`Q${pt(cx, cy, r1 * (1.1 + rnd(seed * 5 + k) * 0.06), tm)} ${pt(cx, cy, r, t)}`);
    }
  }
  return `M${pt(cx, cy, r0, a - w * 0.25)}Q${pt(cx, cy, r1 * 0.45, a - w * 1.15)} ${edge[0]}${edge.slice(1).join("")}Q${pt(cx, cy, r1 * 0.45, a + w * 1.15)} ${pt(cx, cy, r0, a + w * 0.25)}Z`;
}

/** The fine grooves on a petal. */
function grooves(cx: number, cy: number, a: number, r0: number, r1: number, w: number): string {
  return [-0.35, 0.3]
    .map((o) => `M${pt(cx, cy, r0 * 1.6, a + w * o * 0.5)}Q${pt(cx, cy, r1 * 0.55, a + w * o * 0.9)} ${pt(cx, cy, r1 * 0.78, a + w * o)}`)
    .join("");
}

interface BloomProps {
  x: number;
  y: number;
  r: number;
  /** Turn of the whole flower (degrees) and how much it's foreshortened (1 = face on). */
  turn?: number;
  tilt?: number;
  seed?: number;
}

export function Bloom({ x, y, r, turn = 0, tilt = 0.8, seed = 1 }: BloomProps) {
  const rings = [
    { n: 7, r1: r, r0: r * 0.18, w: (Math.PI / 7) * 1.3, off: 0, cls: "pg-wash-1" },
    { n: 6, r1: r * 0.76, r0: r * 0.16, w: (Math.PI / 6) * 1.12, off: 0.5, cls: "pg-wash-2" },
    { n: 5, r1: r * 0.5, r0: r * 0.12, w: (Math.PI / 5) * 1.0, off: 1.2, cls: "pg-wash-3" },
  ];
  return (
    <g transform={`translate(${x} ${y}) rotate(${turn}) scale(1 ${tilt})`}>
      {rings.map((ring, ri) =>
        Array.from({ length: ring.n }, (_, i) => {
          const a = ring.off + (i * 2 * Math.PI) / ring.n + (rnd(seed * 31 + ri * 7 + i) - 0.5) * 0.18;
          const s = seed * 100 + ri * 10 + i;
          return (
            <g key={`${ri}-${i}`}>
              <path className={`pg-petal ${ring.cls}`} d={petal(0, 0, a, ring.r0, ring.r1 * (0.92 + rnd(s) * 0.1), ring.w, s)} pathLength={1} vectorEffect="non-scaling-stroke" />
              {ri < 2 ? <path className="pg-fine" d={grooves(0, 0, a, ring.r0, ring.r1, ring.w)} pathLength={1} vectorEffect="non-scaling-stroke" /> : null}
            </g>
          );
        }),
      )}
      {/* the heart: a ring of stamens */}
      {Array.from({ length: 9 }, (_, i) => {
        const a = (i * 2 * Math.PI) / 9;
        return <circle key={i} className="pg-dot" cx={f(Math.cos(a) * r * 0.12)} cy={f(Math.sin(a) * r * 0.12)} r={Math.max(0.9, r * 0.022)} />;
      })}
    </g>
  );
}

/** A closed bud with its sepals, pointing along `turn` (degrees, 0 = up). */
export function Bud({ x, y, s = 1, turn = 0 }: { x: number; y: number; s?: number; turn?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${turn}) scale(${s})`}>
      <path className="pg-petal pg-wash-2" d="M0 6C-11 4 -13 -9 -6 -17C-3 -21 -1 -24 0 -27C1 -24 3 -21 6 -17C13 -9 11 4 0 6Z" pathLength={1} vectorEffect="non-scaling-stroke" />
      <path className="pg-fine" d="M0 4C-4 -4 -4 -14 0 -25M-6 -15C-3 -8 -2 -2 -1 3" pathLength={1} vectorEffect="non-scaling-stroke" />
      <path className="pg-leaf" d="M0 7C-9 6 -14 -1 -15 -8C-9 -4 -4 -2 0 2C4 -2 9 -4 15 -8C14 -1 9 6 0 7Z" pathLength={1} vectorEffect="non-scaling-stroke" />
    </g>
  );
}

/** A cut peony leaf: three pointed leaflets on one stalk, with their midribs. `turn`: degrees, 0 = pointing right. */
export function Leaf({ x, y, s = 1, turn = 0 }: { x: number; y: number; s?: number; turn?: number }) {
  const leaflet = (len: number, w: number) => `M0 0C${f(len * 0.22)} ${f(-w * 1.1)} ${f(len * 0.7)} ${f(-w * 1.05)} ${len} 0C${f(len * 0.68)} ${f(w * 0.75)} ${f(len * 0.24)} ${f(w * 1.05)} 0 0Z`;
  const rib = (len: number) => `M0 0Q${f(len * 0.5)} ${f(-len * 0.03)} ${f(len * 0.9)} 0`;
  return (
    <g transform={`translate(${x} ${y}) rotate(${turn}) scale(${s})`}>
      <path className="pg-stem pg-stem--fine" d="M0 0L14 0" pathLength={1} vectorEffect="non-scaling-stroke" />
      <g transform="translate(14 0)">
        <path className="pg-leaf" d={leaflet(42, 11)} pathLength={1} vectorEffect="non-scaling-stroke" />
        <path className="pg-fine" d={rib(42)} pathLength={1} vectorEffect="non-scaling-stroke" />
        <g transform="rotate(-42)">
          <path className="pg-leaf" d={leaflet(30, 9)} pathLength={1} vectorEffect="non-scaling-stroke" />
          <path className="pg-fine" d={rib(30)} pathLength={1} vectorEffect="non-scaling-stroke" />
        </g>
        <g transform="rotate(40)">
          <path className="pg-leaf" d={leaflet(32, 9)} pathLength={1} vectorEffect="non-scaling-stroke" />
          <path className="pg-fine" d={rib(32)} pathLength={1} vectorEffect="non-scaling-stroke" />
        </g>
      </g>
    </g>
  );
}

/**
 * The peony branch for the hero: rising from the lower left, two open flowers, a bud and its
 * leaves. Corners mirror it (CSS scale), so one drawing serves both.
 */
export function PeonyBranch({ className = "", style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg className={`pg-art pg-branch ${className}`} style={style} viewBox="0 0 520 400" aria-hidden>
      {/* stems first, under everything */}
      <path className="pg-stem" d="M-14 410C36 380 86 346 134 306C184 264 230 226 272 200C292 188 306 180 318 176" pathLength={1} vectorEffect="non-scaling-stroke" />
      <path className="pg-stem pg-stem--fine" d="M-14 418C38 386 90 350 138 310" pathLength={1} vectorEffect="non-scaling-stroke" />
      <path className="pg-stem" d="M196 254C200 222 196 186 184 156C178 140 172 128 166 118" pathLength={1} vectorEffect="non-scaling-stroke" />
      <path className="pg-stem" d="M290 190C330 150 372 112 412 92C428 84 442 78 454 76" pathLength={1} vectorEffect="non-scaling-stroke" />
      <path className="pg-stem pg-stem--fine" d="M232 226C262 252 296 276 338 290" pathLength={1} vectorEffect="non-scaling-stroke" />
      <Leaf x={70} y={360} s={1.7} turn={-122} />
      <Leaf x={92} y={342} s={1.55} turn={20} />
      <Leaf x={150} y={294} s={1.4} turn={-100} />
      <Leaf x={190} y={258} s={1.3} turn={40} />
      <Leaf x={192} y={190} s={1.05} turn={-160} />
      <Leaf x={338} y={290} s={1.2} turn={10} />
      <Leaf x={360} y={128} s={1.1} turn={-64} />
      <Leaf x={404} y={100} s={0.95} turn={36} />
      <Bud x={166} y={118} s={1.5} turn={-14} />
      <Bloom x={458} y={74} r={42} turn={-30} tilt={0.7} seed={3} />
      <Bloom x={320} y={180} r={84} turn={10} tilt={0.8} seed={1} />
    </svg>
  );
}

/** A small sprig (one flower, two leaves) for headings and the footer. */
export function PeonySprig({ className = "", size = 64 }: { className?: string; size?: number }) {
  return (
    <svg className={`pg-art pg-sprig ${className}`} width={size} height={size * 0.62} viewBox="0 0 120 74" aria-hidden>
      <path className="pg-stem" d="M6 66C26 58 44 50 60 40" pathLength={1} vectorEffect="non-scaling-stroke" />
      <Leaf x={22} y={60} s={0.62} turn={-150} />
      <Leaf x={36} y={54} s={0.55} turn={-40} />
      <path className="pg-stem pg-stem--fine" d="M60 40C78 36 96 40 108 48" pathLength={1} vectorEffect="non-scaling-stroke" />
      <Bud x={108} y={48} s={0.55} turn={110} />
      <Bloom x={62} y={36} r={24} turn={8} tilt={0.78} seed={5} />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// One pair of mandarin ducks (鴛鴦): faithful partners, swimming toward each other among
// lotus leaves. The drake (crest, the orange "sail" on his back) on the left; the duck on the right.

export function Ducks({ className = "" }: { className?: string }) {
  return (
    <svg className={`pg-art pg-ducks ${className}`} viewBox="0 0 400 150" aria-hidden>
      {/* water */}
      <path className="pg-fine pg-ripple" d="M24 118C44 114 60 122 80 118M118 124C140 120 156 128 178 124M222 124C244 120 260 128 282 124M320 118C340 114 356 122 376 118" pathLength={1} vectorEffect="non-scaling-stroke" />
      <path className="pg-fine pg-ripple pg-ripple--2" d="M60 134C80 130 96 138 118 134M168 138C190 134 208 142 232 138M282 134C304 130 320 138 340 134" pathLength={1} vectorEffect="non-scaling-stroke" />
      {/* lotus leaves and one bud at the edges */}
      <path className="pg-leaf" d="M8 112C8 100 30 94 48 98C60 101 66 108 60 113C50 118 22 120 8 112Z" pathLength={1} vectorEffect="non-scaling-stroke" />
      <path className="pg-fine" d="M34 106L18 108M34 106L46 101M34 106L52 110" pathLength={1} vectorEffect="non-scaling-stroke" />
      <path className="pg-leaf" d="M392 112C392 100 370 94 352 98C340 101 334 108 340 113C350 118 378 120 392 112Z" pathLength={1} vectorEffect="non-scaling-stroke" />
      <path className="pg-fine" d="M366 106L382 108M366 106L354 101M366 106L348 110" pathLength={1} vectorEffect="non-scaling-stroke" />
      <path className="pg-stem pg-stem--fine" d="M372 98C374 82 372 66 366 54" pathLength={1} vectorEffect="non-scaling-stroke" />
      <path className="pg-petal pg-wash-2" d="M366 54C356 50 354 38 360 30C362 26 364 22 366 18C368 22 370 26 372 30C378 38 376 50 366 54Z" pathLength={1} vectorEffect="non-scaling-stroke" />
      <path className="pg-fine" d="M366 52C362 44 362 34 366 22" pathLength={1} vectorEffect="non-scaling-stroke" />

      {/* the drake, facing right: the swept crest, the upright "sail" feather. Head first, so the body covers the neck. */}
      <g className="pg-bob">
      <g transform="translate(64 30)">
        <path className="pg-petal pg-wash-2" d="M74 62C72 49 74 35 82 26C88 19 99 18 104 24C106 27 106 30 105 32L114 35C111 38 107 39 103 38C100 44 96 52 94 64Z" pathLength={1} vectorEffect="non-scaling-stroke" />
        <path className="pg-petal pg-wash-1" d="M92 19C82 13 68 16 60 27C65 27 69 29 71 31C67 35 65 41 66 48C70 42 76 38 83 36C80 31 84 23 92 19Z" pathLength={1} vectorEffect="non-scaling-stroke" />
        <path className="pg-fine" d="M86 19C78 19 71 22 66 27M80 26C76 30 72 34 70 40M101 27C95 25 88 27 83 31M98 34C94 38 90 42 86 45" pathLength={1} vectorEffect="non-scaling-stroke" />
        <circle className="pg-dot" cx={100} cy={26} r={1.6} />
        <path className="pg-petal pg-wash-1" d="M0 54C12 57 22 49 38 47C54 45 66 47 80 52C92 57 100 64 100 72C100 76 98 79 96 81Q72 84 48 81Q24 79 8 78C5 72 3 62 0 54Z" pathLength={1} vectorEffect="non-scaling-stroke" />
        <path className="pg-petal pg-wash-gold" d="M55 49C53 38 57 27 65 20C69 28 71 39 69 49Z" pathLength={1} vectorEffect="non-scaling-stroke" />
        <path className="pg-fine" d="M59 48C58 40 60 32 64 25M64 48C64 41 66 34 67 29" pathLength={1} vectorEffect="non-scaling-stroke" />
        <path className="pg-line" d="M26 62C42 55 58 55 74 59C81 61 86 65 89 70" pathLength={1} vectorEffect="non-scaling-stroke" />
        <path className="pg-fine" d="M34 68C44 64 56 64 66 68M8 60C14 62 20 60 26 58M86 56C90 60 92 64 92 68" pathLength={1} vectorEffect="non-scaling-stroke" />
        <path className="pg-line" d="M-8 81C8 77 22 85 40 81C54 78 64 84 80 82C90 81 98 78 110 80" pathLength={1} vectorEffect="non-scaling-stroke" />
      </g>

      </g>
      {/* the duck, facing left: smaller and plainer, a fine line back from the eye */}
      <g className="pg-bob pg-bob--2">
      <g transform="translate(338 38) scale(-1 1)">
        <path className="pg-petal pg-wash-2" d="M66 56C64 44 67 31 74 24C80 19 90 18 95 24C97 27 97 30 96 32L105 35C101 38 97 38 94 37C91 42 88 49 86 58Z" pathLength={1} vectorEffect="non-scaling-stroke" />
        <path className="pg-fine" d="M78 21C73 22 69 25 67 31M91 27C85 26 80 27 75 31" pathLength={1} vectorEffect="non-scaling-stroke" />
        <circle className="pg-dot" cx={91} cy={27} r={1.5} />
        <path className="pg-petal pg-wash-3" d="M2 50C12 53 22 45 36 43C50 41 62 43 74 48C85 53 92 59 92 67C92 70 91 72 89 74Q66 77 46 75Q24 73 8 72C5 66 4 56 2 50Z" pathLength={1} vectorEffect="non-scaling-stroke" />
        <path className="pg-line" d="M24 57C38 51 52 51 66 55C73 57 78 61 81 66" pathLength={1} vectorEffect="non-scaling-stroke" />
        <path className="pg-fine" d="M32 63C42 59 52 59 60 63M10 56C15 58 20 56 25 54" pathLength={1} vectorEffect="non-scaling-stroke" />
        <path className="pg-line" d="M-6 74C10 70 22 78 40 74C54 71 64 77 80 75C88 74 96 71 104 73" pathLength={1} vectorEffect="non-scaling-stroke" />
      </g>
      </g>
    </svg>
  );
}

// ---------------------------------------------------------------------------
// The porcelain plate that frames the names: a rim, a band of lotus panels, a gold line, and
// the plain white well.

export function Plate({ className = "", panels = 16 }: { className?: string; panels?: number }) {
  const R1 = 93;
  const R0 = 77;
  const step = (2 * Math.PI) / panels;
  return (
    <svg className={`pg-art pg-plate ${className}`} viewBox="-100 -100 200 200" aria-hidden>
      <circle className="pg-plate__body" r={99} />
      <circle className="pg-plate__band" r={(R0 + R1) / 2} strokeWidth={R1 - R0} />
      <circle className="pg-line" r={98} vectorEffect="non-scaling-stroke" />
      <circle className="pg-fine" r={95.6} vectorEffect="non-scaling-stroke" />
      <circle className="pg-line" r={R1} vectorEffect="non-scaling-stroke" />
      {Array.from({ length: panels }, (_, i) => {
        const a = i * step - Math.PI / 2;
        const w = step * 0.42;
        // a lotus panel: a pointed arch from the inner ring, its tip toward the rim
        const d = `M${pt(0, 0, R0, a - w)}C${pt(0, 0, R0 + 9, a - w * 1.05)} ${pt(0, 0, R1 - 4, a - w * 0.5)} ${pt(0, 0, R1 - 1.5, a)}C${pt(0, 0, R1 - 4, a + w * 0.5)} ${pt(0, 0, R0 + 9, a + w * 1.05)} ${pt(0, 0, R0, a + w)}`;
        const inner = `M${pt(0, 0, R0 + 1.5, a - w * 0.55)}C${pt(0, 0, R0 + 7, a - w * 0.55)} ${pt(0, 0, R1 - 7, a - w * 0.25)} ${pt(0, 0, R1 - 5, a)}C${pt(0, 0, R1 - 7, a + w * 0.25)} ${pt(0, 0, R0 + 7, a + w * 0.55)} ${pt(0, 0, R0 + 1.5, a + w * 0.55)}`;
        return (
          <g key={i}>
            <path className={`pg-panel${i % 2 ? " pg-panel--alt" : ""}`} d={d} vectorEffect="non-scaling-stroke" />
            <path className="pg-fine" d={inner} vectorEffect="non-scaling-stroke" />
            <circle className="pg-dot" cx={f(Math.cos(a + step / 2) * (R0 + 4.5))} cy={f(Math.sin(a + step / 2) * (R0 + 4.5))} r={0.9} />
          </g>
        );
      })}
      <circle className="pg-line" r={R0} vectorEffect="non-scaling-stroke" />
      <circle className="pg-gold" r={73.2} vectorEffect="non-scaling-stroke" />
      <circle className="pg-fine" r={71} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/** A small round dish for a motif colour: the colour in the well, a white rim, a fine line. */
export function Dish({ color }: { color: string }) {
  return (
    <svg className="pg-art pg-dish" viewBox="-50 -50 100 100" aria-hidden>
      <circle r={47} className="pg-plate__body" />
      <circle r={47} className="pg-line" vectorEffect="non-scaling-stroke" />
      <circle r={41} className="pg-fine" vectorEffect="non-scaling-stroke" />
      <circle r={34} fill={color} />
      <circle r={34} className="pg-fine" vectorEffect="non-scaling-stroke" />
      <ellipse cx={-10} cy={-12} rx={14} ry={7} fill="#fff" opacity={0.22} transform="rotate(-30)" />
    </svg>
  );
}

/** For the ceremony: a teapot and two cups (the tea ceremony, 敬茶). */
export function TeaSet({ className = "" }: { className?: string }) {
  return (
    <svg className={`pg-art pg-icon ${className}`} viewBox="0 0 120 80" aria-hidden>
      <path className="pg-petal pg-wash-cobalt" d="M34 34C26 38 24 52 30 60C34 66 42 68 52 68C62 68 70 66 74 60C80 52 78 38 70 34Z" vectorEffect="non-scaling-stroke" />
      <path className="pg-line" d="M36 34C40 30 64 30 68 34M44 31C44 27 48 25 52 25C56 25 60 27 60 31M52 25V21M50 21H54" vectorEffect="non-scaling-stroke" />
      <path className="pg-line" d="M76 40C84 38 88 44 86 50C84 56 78 58 74 56" vectorEffect="non-scaling-stroke" />
      <path className="pg-line" d="M30 48C24 46 18 40 14 32L20 33C22 38 26 42 30 44" vectorEffect="non-scaling-stroke" />
      <path className="pg-fine" d="M34 48C44 52 60 52 72 48M40 42C42 46 46 47 50 45C52 49 57 49 60 45C63 47 66 46 68 42" vectorEffect="non-scaling-stroke" />
      <path className="pg-petal pg-wash-cobalt" d="M88 60C88 66 92 68 98 68C104 68 108 66 108 60Z" vectorEffect="non-scaling-stroke" />
      <path className="pg-petal pg-wash-cobalt" d="M90 70H106" vectorEffect="non-scaling-stroke" />
      <path className="pg-petal pg-wash-cobalt" d="M4 60C4 66 8 68 14 68C20 68 24 66 24 60Z" vectorEffect="non-scaling-stroke" />
      <path className="pg-line" d="M6 70H22M14 50C12 46 16 44 14 40M98 50C96 46 100 44 98 40" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/** For the lauriat: a covered bowl and chopsticks on a rest. */
export function Bowl({ className = "" }: { className?: string }) {
  return (
    <svg className={`pg-art pg-icon ${className}`} viewBox="0 0 120 80" aria-hidden>
      <path className="pg-petal pg-wash-cobalt" d="M26 44C26 58 40 68 60 68C80 68 94 58 94 44Z" vectorEffect="non-scaling-stroke" />
      <path className="pg-line" d="M50 68L48 74H72L70 68" vectorEffect="non-scaling-stroke" />
      <path className="pg-petal" d="M28 42C30 30 44 22 60 22C76 22 90 30 92 42Z" vectorEffect="non-scaling-stroke" />
      <path className="pg-line" d="M56 22C56 18 58 16 60 16C62 16 64 18 64 22M24 43H96" vectorEffect="non-scaling-stroke" />
      <path className="pg-fine" d="M36 36C44 32 52 34 60 31C68 34 76 32 84 36M34 52C46 56 74 56 86 52" vectorEffect="non-scaling-stroke" />
      <path className="pg-line" d="M8 76L42 60M14 78L46 63" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/** A small curled cloud (如意), for corners and between things. */
export function Cloud({ className = "", flip = false }: { className?: string; flip?: boolean }) {
  return (
    <svg className={`pg-art pg-cloud ${className}`} viewBox="0 0 60 30" aria-hidden style={flip ? { transform: "scaleX(-1)" } : undefined}>
      <path
        className="pg-line"
        d="M4 24C10 24 12 18 18 18C16 12 22 6 28 8C30 2 40 2 42 8C48 6 54 12 50 18C56 18 58 24 54 26M30 16C30 12 36 12 36 16C36 19 32 19 32 17M18 18C20 22 24 23 28 21M42 18C42 22 46 23 50 20"
        vectorEffect="non-scaling-stroke"
      />
      <path className="pg-fine" d="M10 28H52" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/**
 * A frame corner: the inverted (scooped) corner of a Chinese panel, over the two CSS border
 * lines of a .pg-frame (outer at 0.5px, inner at 6.5px), with a small curl in the scoop.
 * It sits in the top-left; the other corners turn it with CSS.
 */
export function Corner({ className = "" }: { className?: string }) {
  return (
    <svg className={`pg-art pg-corner ${className}`} viewBox="0 0 30 30" width="30" height="30" aria-hidden>
      <rect className="pg-corner__mask" x="-1" y="-1" width="31" height="31" />
      <path className="pg-line" d="M30 0.5H13A12.5 12.5 0 0 1 0.5 13V30" />
      <path className="pg-fine" d="M30 6.5H19.6A20.6 20.6 0 0 1 6.5 19.6V30" />
      <path className="pg-fine" d="M5 5C9 5 10.5 8 9 9.6C7.6 11 5.6 10 6.2 8.4" />
    </svg>
  );
}

/** A few loose petals for the hero, drifting down slowly (only when the page is "alive"). */
export function Petals() {
  const ALL = [
    { x: 14, d: 0, s: 1, dur: 17 },
    { x: 36, d: -6, s: 0.8, dur: 21 },
    { x: 62, d: -11, s: 1.1, dur: 19 },
    { x: 81, d: -3, s: 0.75, dur: 23 },
    { x: 50, d: -15, s: 0.9, dur: 25 },
  ];
  return (
    <div className="pg-petals" aria-hidden>
      {ALL.map((p, i) => (
        <span key={i} className="pg-fall" style={{ left: `${p.x}%`, animationDuration: `${p.dur}s`, animationDelay: `${p.d}s`, ["--ps" as string]: p.s } as CSSProperties}>
          <svg viewBox="0 0 20 14" className="pg-fall__petal">
            <path d="M1 8C3 2 11 0 18 4C14 9 8 13 1 8Z" />
          </svg>
        </span>
      ))}
    </div>
  );
}
