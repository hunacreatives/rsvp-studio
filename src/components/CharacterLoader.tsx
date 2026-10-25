import { useEffect, useState, type CSSProperties } from "react";

/**
 * Three of the login screen's cartoon characters, side by side, as a loading
 * screen: they peek up, then take turns hopping and blinking, with a short
 * message underneath. CSS-only (no pointer
 * tracking, no timers), so it's cheap to show while code or data loads.
 * Static under prefers-reduced-motion. Studio/dashboard only — never on a
 * guest-facing event site.
 */

/** Where each character sits (% of the 640×703 illustration), and what it pivots around. */
export const CHARACTER_LAYOUT = [
  { name: "purple", x: 0, y: 68.14, w: 21.88, origin: "11% 100%" },
  { name: "pink", x: 7.5, y: 52.77, w: 43.59, origin: "29% 78%" },
  { name: "hexagon", x: 52.81, y: 47.8, w: 29.22, origin: "67% 77%" },
  { name: "orange", x: 28.12, y: 70.55, w: 38.59, origin: "47% 98%" },
  { name: "green", x: 65.16, y: 75.39, w: 34.84, origin: "82% 98%" },
] as const;

/** The blue one (drawn on top, carries the speech bubble) and its bubble. */
export const BLUE_LAYOUT = { x: 31.25, y: 23.76, w: 33.91, origin: "48% 54%" } as const;
export const BUBBLE_LAYOUT = { x: 22.03, y: 0, w: 56.09 } as const;

/** Each character's eyes (% of the canvas; w/h as % of its width). Purple's are closed (dashes). */
export const CHARACTER_EYES: Record<string, { x: number; y: number; w: number; h: number }[]> = {
  blue: [{ x: 44.92, y: 36.21, w: 1.72, h: 1.72 }, { x: 48.52, y: 36.21, w: 1.72, h: 1.72 }],
  pink: [{ x: 27.42, y: 62.66, w: 1.72, h: 1.72 }, { x: 30.94, y: 62.66, w: 1.64, h: 1.72 }],
  hexagon: [{ x: 61.87, y: 59.46, w: 1.56, h: 1.56 }, { x: 74.06, y: 60.74, w: 1.56, h: 1.56 }],
  purple: [{ x: 7.73, y: 73.12, w: 2.34, h: 0.7 }, { x: 11.02, y: 72.69, w: 2.34, h: 0.7 }],
  orange: [{ x: 42.57, y: 83.49, w: 1.96, h: 1.88 }, { x: 54.68, y: 83.78, w: 1.88, h: 1.88 }],
  green: [{ x: 75.39, y: 83.85, w: 1.72, h: 1.72 }, { x: 84.3, y: 82.57, w: 1.72, h: 1.72 }],
};

/** Each character's mouth, a separate piece (% of the canvas). */
export const CHARACTER_MOUTH: Record<string, { x: number; y: number; w: number }> = {
  blue: { x: 40.62, y: 34.99, w: 12.5 },
  pink: { x: 23.12, y: 61.59, w: 12.34 },
  hexagon: { x: 63.28, y: 59.89, w: 8.91 },
  purple: { x: 5.16, y: 73.54, w: 9.22 },
  orange: { x: 44.53, y: 83.21, w: 8.75 },
  green: { x: 75.16, y: 82.93, w: 11.25 },
};

/** How each character blinks: both eyes together, each at its own pace (some double-blink). */
export const CHARACTER_BLINK: Record<string, string> = {
  blue: "rs-blink 4.6s infinite -1.2s",
  pink: "rs-blink2 6.8s infinite -3.1s",
  hexagon: "rs-blink 5.7s infinite -0.4s",
  orange: "rs-blink 4.1s infinite -2.6s",
  green: "rs-blink2 7.4s infinite -5.2s",
};

/**
 * When one loader hands over to another (the page's code finishes loading, then
 * its data starts), the second one carries straight on instead of fading in and
 * peeking up again.
 */
let lastLoaderGone = 0;

const img = (name: string) => `/account/characters/${name}.webp`;

/** The illustration's canvas and each character's own size, in its pixels. */
const CANVAS_H = 703;
const SIZE: Record<string, [number, number]> = { pink: [279, 177], blue: [217, 213], orange: [247, 194] };

/** The loader's three, left to right: heart, waving pentagon, circle. */
const TRIO = ["pink", "blue", "orange"] as const;
const POS: Record<string, { x: number; y: number; w: number }> = {
  ...Object.fromEntries(CHARACTER_LAYOUT.map((c) => [c.name, c])),
  blue: BLUE_LAYOUT,
};
const TRIO_W = TRIO.reduce((n, name) => n + SIZE[name][0], 0);

/** A canvas-% point → % of the character's own box. */
const local = (name: string, x: number, y: number) => {
  const c = POS[name];
  const hPct = (SIZE[name][1] / CANVAS_H) * 100;
  return { left: `${((x - c.x) / c.w) * 100}%`, top: `${((y - c.y) / hPct) * 100}%` };
};

const CSS = `
.rs-loader { opacity: 0; animation: rs-loader-in .35s ease-out .15s forwards; }
@keyframes rs-loader-in { to { opacity: 1 } }
@keyframes rs-peek { from { opacity: 0; transform: translateY(18%) } to { opacity: 1; transform: translateY(0) } }
@keyframes rs-hop { 0%, 50%, 100% { transform: translateY(0) scaleY(1) } 8% { transform: translateY(0) scaleY(.94) } 22% { transform: translateY(-16%) scaleY(1.03) } 36% { transform: translateY(0) scaleY(.97) } 42% { transform: translateY(0) scaleY(1) } }
@keyframes rs-blink { 0%, 95%, 100% { transform: scaleY(1) } 97% { transform: scaleY(0.08) } }
@keyframes rs-blink2 { 0%, 90%, 94%, 100% { transform: scaleY(1) } 92%, 96% { transform: scaleY(0.08) } }
@keyframes rs-dots { 0%, 20% { opacity: .15 } 50% { opacity: 1 } 100% { opacity: .15 } }
.rs-loader.rs-l-cont { opacity: 1; animation: none; }
.rs-loader .rs-l-row { display: flex; align-items: flex-end; justify-content: center; gap: 4%; width: clamp(240px, 78vw, 480px); }
.rs-loader.rs-l-inline .rs-l-row { width: clamp(180px, 50vw, 260px); }
.rs-loader .rs-l-char { position: relative; flex: none; transform-origin: 50% 100%; will-change: transform; }
.rs-loader .rs-l-char > img { display: block; width: 100%; height: auto; }
.rs-loader .rs-l-eye { position: absolute; transform: translate(-50%, -50%); }
.rs-loader .rs-l-eye > span { display: block; width: 100%; height: 100%; background: #0B0B12; border-radius: 999px; transform-origin: 50% 50%; }
.rs-loader .rs-l-dot { animation: rs-dots 1.4s infinite; }
@media (prefers-reduced-motion: reduce) {
  .rs-loader, .rs-loader .rs-l-char, .rs-loader .rs-l-eye > span, .rs-loader .rs-l-dot { animation: none !important; opacity: 1 !important; transform: none !important; }
}
`;

export default function CharacterLoader({
  message = "Getting things ready…",
  fullScreen = false,
  className = "",
}: {
  /** Shown under the characters. */
  message?: string;
  /** Fill the viewport (min-height 100dvh, centred) on the warm-white page background. */
  fullScreen?: boolean;
  className?: string;
}) {
  const [cont] = useState(() => Date.now() - lastLoaderGone < 1500);
  useEffect(() => () => void (lastLoaderGone = Date.now()), []);
  // A trailing "…" becomes three softly pulsing dots.
  const trimmed = message.replace(/(…|\.\.\.)$/, "");
  const dots = trimmed !== message;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`rs-loader ${cont ? "rs-l-cont" : ""} flex flex-col items-center justify-center px-4 text-center ${fullScreen ? "" : "rs-l-inline py-10"} ${className}`}
      style={fullScreen ? { minHeight: "100dvh", background: "var(--warm-white)" } : undefined}
    >
      <style>{CSS}</style>
      <div className="rs-l-row select-none" aria-hidden>
        {TRIO.map((name, i) => {
          const [w, h] = SIZE[name];
          const c = POS[name];
          const m = CHARACTER_MOUTH[name];
          // They take turns: one hops, then the next.
          const hop = `rs-hop 1.8s ease-in-out ${(cont ? 0 : 0.7) + i * 0.3}s infinite`;
          return (
            <div
              key={name}
              className="rs-l-char"
              style={{ width: `${(w / TRIO_W) * 92}%`, aspectRatio: `${w} / ${h}`, animation: cont ? hop : `rs-peek .5s cubic-bezier(.2,.9,.3,1.25) ${i * 0.12}s both, ${hop}` }}
            >
              <img src={img(name)} alt="" width={w} height={h} draggable={false} decoding="async" />
              <img src={img(`${name}-mouth`)} alt="" draggable={false} decoding="async" style={{ position: "absolute", ...local(name, m.x, m.y), width: `${(m.w / c.w) * 100}%` }} />
              {CHARACTER_EYES[name].map((e, j) => (
                <span key={j} className="rs-l-eye" style={{ ...local(name, e.x, e.y), width: `${(e.w / c.w) * 100}%`, aspectRatio: `${e.w} / ${e.h}` }}>
                  <span style={{ animation: CHARACTER_BLINK[name] }} />
                </span>
              ))}
            </div>
          );
        })}
      </div>
      <p className="mt-7 max-w-sm text-[16px] font-medium md:mt-9 md:text-[18px]" style={{ color: "var(--slate)" }}>
        {dots ? trimmed : message}
        {dots ? (
          <span aria-hidden>
            <span className="rs-l-dot">.</span>
            <span className="rs-l-dot" style={{ animationDelay: ".2s" }}>.</span>
            <span className="rs-l-dot" style={{ animationDelay: ".4s" }}>.</span>
          </span>
        ) : null}
      </p>
    </div>
  );
}

/** The same three characters as a still decoration (they only blink) — e.g. a page header. */
export function CharacterTrio({ className = "", style }: { className?: string; style?: CSSProperties }) {
  return (
    <div className={`rs-loader rs-l-cont ${className}`} style={style} aria-hidden>
      <style>{CSS}</style>
      <div className="rs-l-row select-none" style={{ width: "100%" }}>
        {TRIO.map((name) => {
          const [w, h] = SIZE[name];
          const c = POS[name];
          const m = CHARACTER_MOUTH[name];
          return (
            <div key={name} className="rs-l-char" style={{ width: `${(w / TRIO_W) * 92}%`, aspectRatio: `${w} / ${h}` }}>
              <img src={img(name)} alt="" width={w} height={h} draggable={false} decoding="async" />
              <img src={img(`${name}-mouth`)} alt="" draggable={false} decoding="async" style={{ position: "absolute", ...local(name, m.x, m.y), width: `${(m.w / c.w) * 100}%` }} />
              {CHARACTER_EYES[name].map((e, j) => (
                <span key={j} className="rs-l-eye" style={{ ...local(name, e.x, e.y), width: `${(e.w / c.w) * 100}%`, aspectRatio: `${e.w} / ${e.h}` }}>
                  <span style={{ animation: CHARACTER_BLINK[name] }} />
                </span>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Every character's own size (px), for drawing any of them on its own. */
export const CHARACTER_SIZE: Record<string, [number, number]> = {
  pink: [279, 177], blue: [217, 213], orange: [247, 194], hexagon: [187, 204], purple: [140, 224], green: [223, 160],
};
const ALL_POS: Record<string, { x: number; y: number; w: number }> = { ...Object.fromEntries(CHARACTER_LAYOUT.map((c) => [c.name, c])), blue: BLUE_LAYOUT };

/**
 * One character with its face (mouth, eyes that blink), sized by its container's width. For
 * scenes (the service pages' closing card); `className`/`style` carry the scene's motion.
 */
/** The middle of each body (canvas units), for turning a face the other way; the arms make
 *  some characters lopsided, so it isn't always the middle of the picture. */
const BODY_CX: Record<string, number> = { orange: 45.4 };

/** `faceLeft`: the eyes and smile turned to the other side of the face (arms stay put), for
 *  a character who should be looking at someone on their left. */
export function Character({ name, className = "", style, faceLeft = false }: { name: keyof typeof CHARACTER_SIZE | string; className?: string; style?: CSSProperties; faceLeft?: boolean }) {
  const [w, h] = CHARACTER_SIZE[name];
  const c = ALL_POS[name];
  const m = CHARACTER_MOUTH[name];
  const cx = BODY_CX[name] ?? c.x + c.w / 2;
  const at = (x: number, y: number) => ({ left: `${((x - c.x) / c.w) * 100}%`, top: `${((y - c.y) / ((h / CANVAS_H) * 100)) * 100}%` });
  // Mirrored across the body's middle: an eye's centre, the mouth's left edge.
  const eyeX = (x: number) => (faceLeft ? 2 * cx - x : x);
  const mouthX = faceLeft ? 2 * cx - (m.x + m.w) : m.x;
  return (
    <div className={className} style={{ position: "relative", aspectRatio: `${w} / ${h}`, ...style }} aria-hidden>
      <style>{CSS}</style>
      <img src={img(name)} alt="" width={w} height={h} draggable={false} decoding="async" style={{ display: "block", width: "100%", height: "auto" }} />
      <img src={img(`${name}-mouth`)} alt="" draggable={false} decoding="async" style={{ position: "absolute", ...at(mouthX, m.y), width: `${(m.w / c.w) * 100}%`, ...(faceLeft ? { transform: "scaleX(-1)" } : {}) }} />
      {CHARACTER_EYES[name].map((e, j) => (
        <span key={j} style={{ position: "absolute", ...at(eyeX(e.x), e.y), width: `${(e.w / c.w) * 100}%`, aspectRatio: `${e.w} / ${e.h}`, transform: "translate(-50%, -50%)" }}>
          <span className="rs-eye" style={{ display: "block", width: "100%", height: "100%", background: "#0B0B12", borderRadius: 999, transformOrigin: "50% 50%", animation: CHARACTER_BLINK[name] }} />
        </span>
      ))}
    </div>
  );
}
