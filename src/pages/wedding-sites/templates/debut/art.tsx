import { useId, useRef, type CSSProperties } from "react";
export * from "../shared/stationery";

// The Debut's own artwork (the shared paper, envelope, seal and flourishes live
// in ../shared/stationery): the "of" rule, the icons for the 18 Roses /
// Candles / Treasures lists, the petal shower after a yes, and the drifting
// velvet petals.

/** "· —— OF —— ·" */
export function OfRule({ word = "of" }: { word?: string }) {
  return (
    <div className="db-ofrule" aria-hidden={false}>
      <span className="db-ofrule__dot" />
      <span className="db-ofrule__line" />
      <span className="db-ofrule__word">{word}</span>
      <span className="db-ofrule__line" />
      <span className="db-ofrule__dot" />
    </div>
  );
}

export type ListIcon = "rose" | "candle" | "treasure" | "shot" | "escort" | "star";

/** Which icon a group gets from its title ("18 Roses" → rose…). */
export function iconFor(title: string): ListIcon {
  const t = title.toLowerCase();
  if (/rose/.test(t)) return "rose";
  if (/candle/.test(t)) return "candle";
  if (/treasure|gift/.test(t)) return "treasure";
  if (/shot|toast|drink/.test(t)) return "shot";
  if (/escort|partner/.test(t)) return "escort";
  return "star";
}

/** Fine-line icons for the debut lists. */
export function ListGlyph({ icon, size = 64 }: { icon: ListIcon; size?: number }) {
  const s = { fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <svg className="db-glyph" width={size} height={size} viewBox="0 0 48 48" aria-hidden>
      {icon === "rose" ? (
        <g {...s}>
          <path d="M24 30 C16 30 13 22 17 16 C19 13 23 12 24 14 C25 12 29 13 31 16 C35 22 32 30 24 30 Z" />
          <path d="M24 14 C21 17 21 22 24 24 C27 22 27 17 24 14 M19 19 C21 23 24 25 24 25 M29 19 C27 23 24 25 24 25" />
          <path d="M24 30 V44 M24 37 C20 34 16 35 15 37 C18 39 21 39 24 37 M24 40 C27 37 31 38 32 40" />
        </g>
      ) : icon === "candle" ? (
        <g {...s}>
          <path d="M24 6 C27 10 28 13 24 17 C20 13 21 10 24 6 Z" fill="currentColor" fillOpacity=".25" />
          <path d="M24 17 V20" />
          <rect x="18.5" y="20" width="11" height="20" rx="1.5" />
          <path d="M14 42 H34 M18.5 25 C21 26 22 24 24 26" />
        </g>
      ) : icon === "treasure" ? (
        <g {...s}>
          <rect x="10" y="20" width="28" height="20" rx="1.5" />
          <path d="M8 14 H40 V20 H8 Z M24 14 V40 M24 14 C20 8 13 8 14 12 C15 15 24 14 24 14 C24 14 33 15 34 12 C35 8 28 8 24 14" />
        </g>
      ) : icon === "shot" ? (
        <g {...s}>
          <path d="M15 10 H33 L30 40 H18 Z M16.5 20 H31.5" />
          <path d="M20 26 V34" strokeOpacity=".5" />
        </g>
      ) : icon === "escort" ? (
        <g {...s}>
          <path d="M14 22 C14 16 18 12 24 12 C30 12 34 16 34 22 M14 22 H34 M17 22 L19 38 H29 L31 22 M24 12 V8 M22 8 H26" />
          <path d="M20 30 C22 32 26 32 28 30" />
        </g>
      ) : (
        <g {...s}>
          <path d="M24 8 L28 20 L40 20 L30 27 L34 39 L24 32 L14 39 L18 27 L8 20 L20 20 Z" />
        </g>
      )}
    </svg>
  );
}

/** A small burst of falling rose petals (after a guest says yes). */
export function PetalShower() {
  const petals = useRef(
    Array.from({ length: 26 }, (_, i) => ({
      i,
      x: (Math.random() - 0.5) * 520,
      y: 220 + Math.random() * 260,
      rot: (Math.random() < 0.5 ? -1 : 1) * (120 + Math.random() * 300),
      delay: Math.random() * 0.35,
      size: 12 + Math.random() * 14,
      tone: i % 3,
    })),
  ).current;
  return (
    <div className="db-petals" aria-hidden>
      {petals.map((p) => (
        <span key={p.i} style={{ ["--x" as string]: `${p.x}px`, ["--y" as string]: `${p.y}px`, ["--r" as string]: `${p.rot}deg`, animationDelay: `${p.delay}s` }}>
          <svg width={p.size} height={p.size * 1.2} viewBox="0 0 20 24">
            <path d="M10 1 C17 6 19 15 10 23 C1 15 3 6 10 1 Z" fill={p.tone === 0 ? "var(--db-wine)" : p.tone === 1 ? "#c25b6e" : "#e9a9b4"} />
          </svg>
        </span>
      ))}
    </div>
  );
}

/** One velvet petal (falling). */
function VelvetPetal({ size, tone }: { size: number; tone: number }) {
  const id = useId().replace(/:/g, "");
  const c = [
    ["#8a3443", "#5a1a26"],
    ["#7a2a38", "#4e1520"],
    ["#93404f", "#601d2a"],
  ][tone % 3];
  return (
    <svg width={size} height={size * 1.15} viewBox="0 0 40 46">
      <defs>
        <radialGradient id={`${id}-p`} cx="45%" cy="40%" r="65%">
          <stop offset="0" stopColor={c[0]} />
          <stop offset="1" stopColor={c[1]} />
        </radialGradient>
      </defs>
      <path d="M20 2 C34 8 39 24 30 37 C26 43 21 45 20 44 C19 45 14 43 10 37 C1 24 6 8 20 2 Z" fill={`url(#${id}-p)`} />
      <path d="M20 8 C25 16 25 28 20 40" fill="none" stroke="#000" strokeOpacity=".15" strokeWidth="1.4" />
      <path d="M12 12 C15 9 19 8 22 9" fill="none" stroke="#fff" strokeOpacity=".18" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/**
 * The sky behind the cards: muted velvet petals drifting down, blended into
 * the background. A sticky, screen-tall layer, so
 * it follows the reader down the page (never position:fixed — see the builder's
 * scaled preview note). `still`: reduced motion — petals rest, nothing moves.
 */
export function RoseSky({ still, petals = 16 }: { still: boolean; petals?: number }) {
  const list = useRef(
    Array.from({ length: petals }, (_, i) => ({
      i,
      x: Math.round(Math.random() * 100),
      y: Math.round(Math.random() * 90),
      size: 16 + Math.random() * 18,
      dur: 12 + Math.random() * 9,
      delay: -Math.random() * 21,
      sway: 20 + Math.random() * 50,
      r1: Math.round(Math.random() * 180),
      r2: Math.round(180 + Math.random() * 360),
      tone: i,
    })),
  ).current;
  return (
    <div className={`db-sky${still ? " db-sky--still" : ""}`} aria-hidden>
      {list.map((p) => (
        <span
          key={p.i}
          className="db-sky__petal"
          style={{ left: `${p.x}%`, top: still ? `${p.y}%` : undefined, animationDuration: `${p.dur}s`, animationDelay: `${p.delay}s`, ["--sway" as string]: `${p.sway}px`, ["--r1" as string]: `${p.r1}deg`, ["--r2" as string]: `${p.r2}deg` } as CSSProperties}
        >
          <VelvetPetal size={p.size} tone={p.tone} />
        </span>
      ))}
    </div>
  );
}

/** Velvet pile: a fine noise tile (used as an overlay on the wine). */
export const VELVET_NOISE = `url("data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 .85  0 0 0 0 .9  0 0 0 .55 0"/></filter><rect width="100%" height="100%" filter="url(#n)"/></svg>',
)}")`;
