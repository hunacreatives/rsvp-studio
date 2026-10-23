import { useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

// Calado's objects, drawn in code: a beech embroidery hoop with a brass clasp holding a
// piece of cotton, the baby's name in satin stitch (fine diagonal threads, raised off the
// cloth) with a running-stitch line under it, and thread skeins for the motif colours.

/** The hoop: two beech rings and a clasp, the cotton stretched taut inside. */
export function Hoop({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`cl-hoop ${className}`}>
      <div className="cl-hoop__cloth">{children}</div>
      <span className="cl-hoop__ring cl-hoop__ring--inner" aria-hidden />
      <span className="cl-hoop__ring cl-hoop__ring--outer" aria-hidden />
      <span className="cl-hoop__clasp" aria-hidden>
        <i />
        <i />
      </span>
    </div>
  );
}

type Box = { x: number; y: number; w: number; h: number };

/**
 * The name, stitched. Each line is SVG text filled with a satin-stitch pattern (threads at
 * an angle, a highlight and a shadow), outlined a shade darker and lifted off the cloth by
 * a small shadow. With `play`, each line is revealed left to right by a mask sweep with a
 * needle riding just ahead of it, then the running stitch underneath appears dash by dash.
 */
export function StitchedName({ lines, play, label }: { lines: string[]; play: boolean; label: string }) {
  const raw = useId().replace(/[^a-zA-Z0-9]/g, "");
  const id = (k: string) => `cl${raw}${k}`;
  const longest = Math.max(1, ...lines.map((l) => l.length));
  // Pinyon Script runs wide: size the lines so the longest fits the cloth.
  const fs = Math.round(Math.max(110, Math.min(250, 1750 / longest)));
  const lh = Math.round(fs * 1.02);
  const top = Math.round(fs * 0.92);
  const underlineY = top + lh * (lines.length - 1) + Math.round(fs * 0.42);
  const height = underlineY + 30;
  const textRefs = useRef<(SVGTextElement | null)[]>([]);
  const [boxes, setBoxes] = useState<Box[]>([]);

  // Measure each stitched line (after the script font has loaded), so the sweep and the
  // needle run exactly across the letters.
  const measure = () => setBoxes(textRefs.current.map((t) => (t ? (({ x, y, width: w, height: h }) => ({ x, y, w, h }))(t.getBBox()) : { x: 0, y: 0, w: 0, h: 0 })));
  useLayoutEffect(measure, [lines.join("|"), fs]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    let alive = true;
    document.fonts?.ready.then(() => alive && measure());
    return () => {
      alive = false;
    };
  }, [lines.join("|"), fs]); // eslint-disable-line react-hooks/exhaustive-deps

  const STITCH = 1.6; // seconds per line
  const ux0 = Math.min(...boxes.map((b) => b.x).filter(Number.isFinite), 500) + 20;
  const ux1 = Math.max(...boxes.map((b) => b.x + b.w).filter(Number.isFinite), 500) - 20;
  return (
    <svg className={`cl-name${play ? " is-play" : ""}`} viewBox={`0 0 1000 ${height}`} role="img" aria-label={label}>
      <defs>
        {/* satin stitch: long threads at an angle, each with a highlight and a shadow */}
        <pattern id={id("satin")} patternUnits="userSpaceOnUse" width="5" height="5" patternTransform="rotate(-36)">
          <rect width="5" height="5" className="cl-thread" />
          <rect width="1.5" height="5" className="cl-thread__hi" />
          <rect x="3.9" width="1.1" height="5" className="cl-thread__lo" />
        </pattern>
        <filter id={id("raise")} x="-5%" y="-10%" width="110%" height="125%">
          <feDropShadow dx="0.9" dy="1.4" stdDeviation="0.9" floodColor="#3a2c1c" floodOpacity="0.32" />
        </filter>
        {play ? (
          <mask id={id("sweep")} maskUnits="userSpaceOnUse" x="0" y="0" width="1000" height={height}>
            {boxes.map((b, i) => (
              <rect key={i} className="cl-sweep" x={b.x - 12} y={b.y - 20} width={b.w + 24} height={b.h + 40} fill="#fff" style={{ animationDelay: `${0.9 + i * (STITCH + 0.25)}s`, animationDuration: `${STITCH}s` }} />
            ))}
            <rect className="cl-sweep" x={ux0 - 10} y={underlineY - 12} width={ux1 - ux0 + 20} height="24" fill="#fff" style={{ animationDelay: `${0.9 + lines.length * (STITCH + 0.25)}s`, animationDuration: "1.3s", animationTimingFunction: "steps(14, end)" }} />
          </mask>
        ) : null}
      </defs>

      <g mask={play ? `url(#${id("sweep")})` : undefined} filter={`url(#${id("raise")})`}>
        {/* a darker thread outlining each letter, then the satin fill (its stroke thickens the
            script's thin strokes to the weight of real embroidery) */}
        {lines.map((l, i) => (
          <text key={`o${i}`} x="500" y={top + i * lh} textAnchor="middle" className="cl-name__edge" fontSize={fs} aria-hidden>
            {l}
          </text>
        ))}
        {lines.map((l, i) => (
          <text key={i} ref={(el) => { textRefs.current[i] = el; }} x="500" y={top + i * lh} textAnchor="middle" className="cl-name__text" fontSize={fs} fill={`url(#${id("satin")})`} stroke={`url(#${id("satin")})`}>
            {l}
          </text>
        ))}
        {boxes.length ? <path className="cl-running" d={`M${ux0} ${underlineY} H${ux1}`} /> : null}
      </g>

      {/* the needle, riding just ahead of each line's sweep */}
      {play
        ? boxes.map((b, i) => (
            <g
              key={i}
              className="cl-needle"
              style={{ ["--x0" as string]: `${b.x}px`, ["--x1" as string]: `${b.x + b.w}px`, animationDelay: `${0.9 + i * (STITCH + 0.25)}s`, animationDuration: `${STITCH}s` } as CSSProperties}
            >
              <g transform={`translate(0 ${b.y + b.h * 0.42})`}>
                <path className="cl-needle__thread" d="M0 0 C -26 10, -46 4, -64 18" />
                <g transform="rotate(-38)">
                  <rect x="-2" y="-46" width="4" height="62" rx="2" className="cl-needle__steel" />
                  <rect x="-0.8" y="-42" width="1.6" height="9" rx="0.8" className="cl-needle__eye" />
                </g>
              </g>
            </g>
          ))
        : null}
    </svg>
  );
}

/** A skein of embroidery floss in one motif colour, with its paper band. */
export function Skein({ color, index }: { color: string; index: number }) {
  return (
    <span className="cl-skein" style={{ ["--c" as string]: color, ["--i" as string]: index } as CSSProperties}>
      <span className="cl-skein__loop cl-skein__loop--l" />
      <span className="cl-skein__band" />
      <span className="cl-skein__loop cl-skein__loop--r" />
    </span>
  );
}

/** A small cross-stitch, the mark between paired names and in headings. */
export const Cross = ({ className = "" }: { className?: string }) => <span className={`cl-x ${className}`} aria-hidden />;
