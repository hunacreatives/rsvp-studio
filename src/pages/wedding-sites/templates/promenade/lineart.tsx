import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { BRIEFS, BRIEF_PALETTE, READY, paintingUrl, type PaintingName } from "./art";

// Promenade's finished line art: fine gold drawings with soft blush and sage
// washes, standing in for each watercolour until the designers' painting
// arrives (then the painting replaces it). In the designers' brief (?brief=1)
// each piece gets a numbered pin; tapping it pops up what to paint.

const GOLD = "var(--pm-gold)";
const BLUSH = "#e9c9c1";
const ROSE = "#d9a7a0";
const SAGE = "#a9b496";
const line = { fill: "none", stroke: GOLD, strokeWidth: 1.5, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

/** A small open rose seen from above (blush wash, gold line). */
function Rose({ x, y, r = 12, tone = BLUSH }: { x: number; y: number; r?: number; tone?: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle r={r} fill={tone} opacity=".55" />
      <path d={`M0 ${-r * 0.2} C${r * 0.5} ${-r * 0.5} ${r * 0.55} ${r * 0.25} 0 ${r * 0.35} C${-r * 0.55} ${r * 0.3} ${-r * 0.6} ${-r * 0.45} ${r * 0.1} ${-r * 0.65} C${r * 0.85} ${-r * 0.8} ${r * 1.0} ${r * 0.2} ${r * 0.35} ${r * 0.75} C${-r * 0.35} ${r * 1.1} ${-r * 1.0} ${r * 0.5} ${-r * 0.85} ${-r * 0.2}`} {...line} strokeWidth={1.2} />
    </g>
  );
}

/** A pointed leaf with a centre vein (sage wash, gold line). */
function Leaf({ x, y, a, s = 1 }: { x: number; y: number; a: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${a}) scale(${s})`}>
      <path d="M0 0 C7 -8 20 -8 28 0 C20 8 7 8 0 0 Z" fill={SAGE} opacity=".5" />
      <path d="M0 0 C7 -8 20 -8 28 0 C20 8 7 8 0 0 Z M2 0 H25" {...line} strokeWidth={1} />
    </g>
  );
}

export function ClockArt() {
  const ticks = Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * Math.PI * 2;
    return <path key={i} d={`M${120 + Math.sin(a) * 36} ${86 - Math.cos(a) * 36} L${120 + Math.sin(a) * (i % 3 ? 33 : 30)} ${86 - Math.cos(a) * (i % 3 ? 33 : 30)}`} {...line} strokeWidth={i % 3 ? 1 : 1.6} />;
  });
  return (
    <svg className="pm-line pm-line--clock" viewBox="0 0 240 190" aria-hidden>
      <Leaf x={52} y={128} a={-150} s={1.2} />
      <Leaf x={188} y={128} a={-30} s={1.2} />
      <Leaf x={70} y={150} a={160} />
      <Leaf x={170} y={150} a={20} />
      <circle cx="120" cy="86" r="46" fill="#fffdf8" />
      <circle cx="120" cy="86" r="46" {...line} strokeWidth={2.4} />
      <circle cx="120" cy="86" r="40" {...line} strokeWidth={0.8} />
      {ticks}
      <path d="M120 86 L120 62 M120 86 L136 94" {...line} strokeWidth={2} />
      <circle cx="120" cy="86" r="2.6" fill={GOLD} />
      <path d="M120 40 V32 M112 30 C112 22 128 22 128 30" {...line} />
      <Rose x={84} y={134} r={15} />
      <Rose x={110} y={146} r={12} tone={ROSE} />
      <Rose x={152} y={136} r={14} />
      <Rose x={132} y={150} r={9} />
      <circle cx="64" cy="118" r="3" fill={ROSE} opacity=".7" />
      <circle cx="178" cy="116" r="3" fill={ROSE} opacity=".7" />
    </svg>
  );
}

export function GarlandArt() {
  const side = (flip: 1 | -1) => (
    <g transform={flip === 1 ? undefined : "translate(600 0) scale(-1 1)"}>
      <path d="M300 60 C250 52 210 70 170 62 C130 54 90 72 30 62" {...line} />
      <Leaf x={262} y={56} a={-160} />
      <Leaf x={232} y={66} a={150} s={0.9} />
      <Leaf x={196} y={62} a={-170} s={0.9} />
      <Leaf x={160} y={60} a={160} s={0.8} />
      <Leaf x={122} y={64} a={-165} s={0.75} />
      <Leaf x={86} y={66} a={170} s={0.65} />
      <Rose x={214} y={70} r={8} />
      <Rose x={140} y={56} r={6} tone={ROSE} />
      <circle cx="60" cy="64" r="2.5" fill={ROSE} opacity=".7" />
    </g>
  );
  return (
    <svg className="pm-line pm-line--garland" viewBox="0 0 600 120" aria-hidden>
      {side(1)}
      {side(-1)}
      <Leaf x={300} y={60} a={-120} s={1.1} />
      <Leaf x={300} y={60} a={-60} s={1.1} />
      <Rose x={300} y={60} r={20} />
      <Rose x={272} y={70} r={13} tone={ROSE} />
      <Rose x={328} y={70} r={13} tone={ROSE} />
    </svg>
  );
}

export function VenueArt() {
  return (
    <svg className="pm-line pm-line--venue" viewBox="0 0 260 220" aria-hidden>
      <ellipse cx="130" cy="196" rx="110" ry="8" fill={SAGE} opacity=".25" />
      <path d="M70 92 C70 46 190 46 190 92" fill={BLUSH} opacity=".3" />
      <path d="M70 92 C70 46 190 46 190 92 M64 92 H196 M66 100 H194 M130 52 V36 M126 36 C126 30 134 30 134 36" {...line} />
      {[78, 106, 154, 182].map((x) => (
        <path key={x} d={`M${x} 100 V176 M${x - 5} 100 H${x + 5} M${x - 5} 176 H${x + 5}`} {...line} />
      ))}
      <path d="M58 176 H202 M50 186 H210 M44 196 H216" {...line} />
      <path d="M106 140 C112 126 148 126 154 140" {...line} strokeWidth={1} opacity=".6" />
      <Leaf x={56} y={178} a={-140} />
      <Leaf x={204} y={178} a={-40} />
      <Rose x={64} y={184} r={10} />
      <Rose x={196} y={184} r={10} tone={ROSE} />
      <Rose x={46} y={176} r={6} tone={ROSE} />
      <Rose x={214} y={176} r={6} />
    </svg>
  );
}

export function StayArt() {
  return (
    <svg className="pm-line pm-line--stay" viewBox="0 0 200 240" aria-hidden>
      <path d="M100 20 V34 M92 18 C92 10 108 10 108 18" {...line} />
      <path d="M58 94 C58 46 142 46 142 94" fill={BLUSH} opacity=".25" />
      <path d="M58 94 C58 46 142 46 142 94 V190 H58 Z" {...line} />
      {[72, 86, 100, 114, 128].map((x) => (
        <path key={x} d={`M${x} ${x === 100 ? 46 : 56} V190`} {...line} strokeWidth={1} />
      ))}
      <path d="M58 120 H142 M50 190 H150 M54 198 H146" {...line} />
      <path d="M86 160 C86 150 94 146 100 150 C104 142 118 146 114 158 C112 166 100 170 92 168" {...line} strokeWidth={1} />
      <Leaf x={62} y={176} a={-120} />
      <Leaf x={140} y={170} a={-60} />
      <Rose x={74} y={182} r={11} />
      <Rose x={126} y={180} r={10} tone={ROSE} />
      <Rose x={100} y={188} r={7} />
    </svg>
  );
}

/** The hero scene as line art: a gazebo by the sea, a couple walking toward it, flowers in the corners. */
export function HeroArt() {
  return (
    <svg className="pm-hero__art" viewBox="0 0 400 720" preserveAspectRatio="xMidYMax meet" aria-hidden>
      <defs>
        <linearGradient id="pm-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f6e6df" />
          <stop offset=".55" stopColor="#f8efe4" />
          <stop offset="1" stopColor="#eef0e4" />
        </linearGradient>
      </defs>
      <rect width="400" height="720" fill="url(#pm-sky)" />
      <g transform="translate(0 150)">
      <path d="M0 470 C80 462 140 466 200 464 C260 462 320 466 400 470" {...line} opacity=".5" />
      <path d="M30 486 H140 M240 490 H370" {...line} strokeWidth={0.8} opacity=".35" />
      <g opacity=".85" transform="translate(200 470) scale(.72) translate(-200 -470)">
        <path d="M130 330 C130 250 270 250 270 330" fill={BLUSH} opacity=".3" />
        <path d="M130 330 C130 250 270 250 270 330 M122 330 H278 M124 340 H276 M200 258 V236 M194 236 C194 226 206 226 206 236" {...line} />
        {[140, 172, 228, 260].map((x) => (
          <path key={x} d={`M${x} 340 V470 M${x - 6} 340 H${x + 6}`} {...line} />
        ))}
        <path d="M112 470 H288 M102 482 H298" {...line} />
      </g>
      </g>
      <path d="M0 640 C80 630 320 630 400 640 V720 H0 Z" fill="#f4eee4" />
      <g transform="translate(200 668) scale(.62)">
        <path d="M-26 -60 C-34 -20 -44 20 -50 52 C-30 58 -6 58 2 52 C-2 20 -8 -20 -12 -60 Z" fill="#fffdf8" />
        <path d="M-26 -60 C-34 -20 -44 20 -50 52 C-30 58 -6 58 2 52 C-2 20 -8 -20 -12 -60 Z" {...line} />
        <circle cx="-19" cy="-74" r="9" {...line} />
        <path d="M6 -62 H30 L28 52 H18 L18 -10 L16 52 H6 Z" fill="#5a4e44" opacity=".85" />
        <circle cx="18" cy="-74" r="9" fill="#5a4e44" opacity=".85" />
        <path d="M-12 -40 C-4 -34 4 -34 8 -40" {...line} />
      </g>
      <Leaf x={12} y={690} a={-60} s={1.6} />
      <Leaf x={40} y={700} a={-100} s={1.4} />
      <Rose x={34} y={676} r={18} />
      <Rose x={66} y={696} r={13} tone={ROSE} />
      <Leaf x={388} y={690} a={-120} s={1.6} />
      <Leaf x={360} y={700} a={-80} s={1.4} />
      <Rose x={366} y={676} r={18} tone={ROSE} />
      <Rose x={334} y={698} r={12} />
    </svg>
  );
}

const ART: Partial<Record<PaintingName, () => ReactNode>> = { clock: ClockArt, garland: GarlandArt, venue: VenueArt, stay: StayArt };

/** One illustration: the designers' painting when it's in, otherwise the line art; in the brief, with its pin. */
export function Painting({ name, brief, className = "", alt = "" }: { name: PaintingName; brief: boolean; className?: string; alt?: string }) {
  const Art = ART[name];
  const body = READY[name] ? <img className="pm-painting" src={paintingUrl(name)} alt={alt} loading="lazy" decoding="async" /> : Art ? <Art /> : null;
  return (
    <div className={`pm-art ${className}`}>
      {body}
      {brief ? <Pin name={name} /> : null}
    </div>
  );
}

const ORDER = Object.keys(BRIEFS) as PaintingName[];

/** A numbered pin; tapping it pops up what the designers should paint here. */
export function Pin({ name, style }: { name: PaintingName; style?: CSSProperties }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const b = BRIEFS[name];
  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);
  return (
    <span ref={ref} className={`pm-pin${open ? " is-open" : ""}`} style={style} onClick={(e) => e.stopPropagation()}>
      <button type="button" className="pm-pin__dot" aria-expanded={open} aria-label={`Brief: ${b.title}`} onClick={() => setOpen((v) => !v)}>
        {ORDER.indexOf(name) + 1}
      </button>
      {open ? (
        <span className="pm-pin__bubble" role="dialog">
          <span className="pm-pin__file">{b.file}</span>
          <strong>{b.title}</strong>
          <span className="pm-pin__size">{b.size}</span>
          <span className="pm-pin__notes">
            {b.notes.map((n, i) => (
              <span key={i}>{n}</span>
            ))}
          </span>
          <span className="pm-pin__swatches" aria-label="Palette">
            {BRIEF_PALETTE.slice(0, 6).map(([hex]) => (
              <i key={hex} style={{ background: hex }} title={hex} />
            ))}
          </span>
        </span>
      ) : null}
    </span>
  );
}

/** The brief's dock: a small button at the bottom; opens the overview (style, palette, how to send). */
export function BriefDock() {
  const [open, setOpen] = useState(false);
  return (
    <div className={`pm-dock${open ? " is-open" : ""}`}>
      {open ? (
        <div className="pm-dock__panel" role="dialog" aria-label="Design brief">
          <button type="button" className="pm-dock__close" aria-label="Close" onClick={() => setOpen(false)}>
            ×
          </button>
          <p className="pm-dock__kicker">Design brief · Promenade</p>
          <p className="pm-dock__title">{ORDER.length} paintings to replace the gold drawings</p>
          <p>Each numbered pin marks a piece. Tap it to see the file name, size and what to paint.</p>
          <p>
            <strong>Style:</strong> soft, romantic watercolour; loose edges, gentle washes, airy. Transparent PNG unless it says JPG. Generic people, no recognisable faces.
          </p>
          <div className="pm-dock__palette">
            {BRIEF_PALETTE.map(([hex, label]) => (
              <span key={hex}>
                <i style={{ background: hex }} />
                {label} <b>{hex}</b>
              </span>
            ))}
          </div>
          <p>
            <strong>Send:</strong> files named exactly as shown (e.g. clock.png), at the sizes shown, to Francis.
          </p>
        </div>
      ) : null}
      <button type="button" className="pm-dock__btn" onClick={() => setOpen((v) => !v)}>
        <span className="pm-dock__dot" /> Design brief
      </button>
    </div>
  );
}
