import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { drawSeal, GOLD_WAX, type WaxLook } from "./wax";

// The things on the table: cotton cards, the envelope, the wax seal, the fabric swatches, the
// map under the vellum, a stamp. Photos and renders live in /event-templates/letterpress/.

export const ART = "/event-templates/letterpress";

/** A sheet of cotton paper with a deckled edge and its shadow on the linen; children are its print. */
export function Paper({ className = "", children, style, ...rest }: { className?: string; children?: ReactNode; style?: CSSProperties; [attr: string]: unknown }) {
  return (
    <div className={`lp-paper ${className}`} style={style} {...rest}>
      <i className="lp-shade" aria-hidden />
      <div className="lp-sheet">{children}</div>
    </div>
  );
}

/** A wax seal with the initials pressed in, drawn at the device's pixels for its CSS size. */
export function Seal({ letters, font, look = GOLD_WAX, seed = 3, className = "" }: { letters: string[]; font: string; look?: WaxLook; seed?: number; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const key = letters.join("|");
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    let alive = true, last = 0;
    const paint = (force = false) => {
      const w = Math.round(cv.clientWidth);
      if (!alive || w < 4 || (w === last && !force)) return;
      last = w;
      drawSeal(cv, w, key.split("|").filter(Boolean), font, look, seed);
    };
    paint();
    const ro = new ResizeObserver(() => paint());
    ro.observe(cv);
    // again once the display face has loaded (the initials are set in it)
    document.fonts?.load(`italic 400 40px ${font}`).then(() => paint(true)).catch(() => {});
    return () => { alive = false; ro.disconnect(); };
  }, [key, font, look, seed]);
  return <canvas ref={ref} className={`lp-seal ${className}`} aria-hidden />;
}

// a euro flap: a shallow point with a rounded tip, as a polygon (x from the hinge at 100%)
function flapPoints(mirror: boolean): string {
  const pts: [number, number][] = [[100, 0]];
  const steps = 14;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    // upper edge comes in to the tip, a rounded tip, the lower edge goes back out
    const y = t * 100;
    const k = 1 - Math.abs(t - 0.5) * 2; // 0 at the corners, 1 at the tip
    const x = 100 - 100 * (k < 0.82 ? k / 0.82 * 0.93 : 0.93 + 0.07 * Math.sin(((k - 0.82) / 0.18) * Math.PI / 2));
    pts.push([x, y]);
  }
  pts.push([100, 100]);
  return `polygon(${pts.map(([x, y]) => `${(mirror ? 100 - x : x).toFixed(2)}% ${y.toFixed(2)}%`).join(", ")})`;
}
const FLAP = flapPoints(false);
const FLAP_BACK = flapPoints(true);

/** The big envelope: ink-blue cotton, a painted liner, sealed with the couple's initials. */
export function Envelope({ letters, font }: { letters: string[]; font: string }) {
  return (
    <div className="lp-env" aria-hidden>
      <i className="lp-env__shade" />
      <div className="lp-env__body">
        <svg className="lp-env__seams" viewBox="0 0 100 100" preserveAspectRatio="none">
          <path d="M0.6 0.6 L58 50 L0.6 99.4" fill="none" stroke="rgba(255,255,255,0.16)" strokeWidth="0.35" vectorEffect="non-scaling-stroke" />
          <path d="M0.6 1.4 L57 50 L0.6 98.6" fill="none" stroke="rgba(0,0,0,0.28)" strokeWidth="0.6" vectorEffect="non-scaling-stroke" transform="translate(0.4 0.3)" />
        </svg>
        <i className="lp-flapshadow" style={{ clipPath: FLAP }} />
        <div className="lp-seal-wrap">
          <Seal letters={letters} font={font} className="lp-seal-b" />
        </div>
      </div>
      <i className="lp-openshadow" style={{ clipPath: FLAP_BACK }} />
      <div className="lp-flap">
        <div className="lp-flap__front" style={{ clipPath: FLAP }} />
        <div className="lp-flap__back" style={{ clipPath: FLAP_BACK }}>
          <div className="lp-flap__liner" style={{ clipPath: FLAP_BACK }} />
        </div>
        <div className="lp-seal-wrap">
          <Seal letters={letters} font={font} className="lp-seal-a" />
        </div>
      </div>
    </div>
  );
}

/** A small envelope lying open (the gifts note's, the reply card's): `tone` its paper. */
export function SmallEnvelope({ className = "", children }: { className?: string; children?: ReactNode }) {
  return (
    <div className={`lp-senv ${className}`} aria-hidden>
      <i className="lp-senv__shade" />
      <div className="lp-senv__flap" style={{ clipPath: "polygon(0 100%, 6% 30%, 44% 3%, 50% 0, 56% 3%, 94% 30%, 100% 100%)" }}>
        <div className="lp-senv__liner" style={{ clipPath: "polygon(4% 100%, 9% 36%, 45% 10%, 50% 7%, 55% 10%, 91% 36%, 96% 100%)" }} />
      </div>
      <div className="lp-senv__body">
        <svg className="lp-env__seams" viewBox="0 0 100 100" preserveAspectRatio="none">
          <path d="M0.8 99 L50 46 L99.2 99" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="0.35" vectorEffect="non-scaling-stroke" />
          <path d="M0.8 98 L50 45 L99.2 98" fill="none" stroke="rgba(0,0,0,0.2)" strokeWidth="0.6" vectorEffect="non-scaling-stroke" transform="translate(0.3 0.6)" />
        </svg>
        {children}
      </div>
    </div>
  );
}

// pinking shears: a zigzag all round a swatch, as a polygon
function pinked(nx: number, ny: number, d: number): string {
  const p: string[] = [];
  for (let i = 0; i <= nx * 2; i++) p.push(`${((i / (nx * 2)) * 100).toFixed(2)}% ${i % 2 ? 0 : d}%`);
  for (let i = 1; i <= ny * 2; i++) p.push(`${i % 2 ? 100 : 100 - d}% ${((i / (ny * 2)) * 100).toFixed(2)}%`);
  for (let i = nx * 2 - 1; i >= 0; i--) p.push(`${((i / (nx * 2)) * 100).toFixed(2)}% ${i % 2 ? 100 : 100 - d}%`);
  for (let i = ny * 2 - 1; i >= 1; i--) p.push(`${i % 2 ? 0 : d}% ${((i / (ny * 2)) * 100).toFixed(2)}%`);
  return `polygon(${p.join(", ")})`;
}
const PINK = pinked(7, 10, 3.4);

/** The motif colours as fabric: pinked swatches of linen and silk, overlapping on a strip. */
export function Swatches({ colors }: { colors: string[] }) {
  return (
    <div className="lp-swatches" aria-label="The colours of the day">
      {colors.slice(0, 6).map((c, i) => (
        <i key={`${c}-${i}`} className={`lp-swatch${i % 2 ? " lp-swatch--silk" : ""}`} style={{ ["--c" as string]: c, clipPath: PINK, rotate: `${[-3, 2, -1.5, 3, -2.5, 1.5][i]}deg` } as CSSProperties} />
      ))}
    </div>
  );
}

/** The map card under the vellum: a few lanes, a river, the venue, a compass rose, in fine ink. */
export function MapArt() {
  return (
    <svg className="lp-map" viewBox="0 0 500 700" aria-hidden>
      <g fill="none" stroke="currentColor" strokeLinecap="round">
        <path d="M-10 560 C 90 520, 160 600, 250 540 S 420 430, 520 470" strokeWidth="9" opacity="0.18" />
        <path d="M-10 560 C 90 520, 160 600, 250 540 S 420 430, 520 470" strokeWidth="1.2" opacity="0.6" />
        <path d="M60 -10 C 90 140, 40 260, 120 380 S 230 600, 210 710" strokeWidth="2.2" opacity="0.9" />
        <path d="M-10 240 C 120 260, 260 200, 330 250 S 450 330, 510 300" strokeWidth="1.6" opacity="0.85" strokeDasharray="7 6" />
        <path d="M330 250 C 340 320, 300 380, 320 470" strokeWidth="1.6" opacity="0.85" />
        <path d="M420 -10 C 400 90, 440 160, 380 230" strokeWidth="1.1" opacity="0.5" />
        {Array.from({ length: 26 }, (_, i) => {
          const x = 380 + (i % 6) * 18 + (i % 2) * 7, y = 560 + Math.floor(i / 6) * 22;
          return <circle key={i} cx={x} cy={y} r="5" strokeWidth="1" opacity="0.45" />;
        })}
        <g transform="translate(410 120)" opacity="0.75">
          <circle r="34" strokeWidth="1" />
          <circle r="27" strokeWidth="0.6" />
          <path d="M0 -46 L6 0 L0 46 L-6 0 Z M-46 0 L0 -6 L46 0 L0 6 Z" strokeWidth="1" />
        </g>
      </g>
      <g transform="translate(318 470)">
        <circle r="13" fill="none" stroke="currentColor" strokeWidth="1.3" />
        <circle r="5" fill="currentColor" />
      </g>
    </svg>
  );
}

/** A postage stamp: perforated, a dried rose for its picture. */
export function Stamp({ className = "" }: { className?: string }) {
  return (
    <div className={`lp-stamp ${className}`} aria-hidden>
      <div className="lp-stamp__pic" style={{ backgroundImage: `url(${ART}/rose.webp)` }} />
      <b>30</b>
    </div>
  );
}

/**
 * Phone-sized copies of the big props ("-m"): [its width, the full image's width, the prop's
 * widest width on the table in inches (--u)]. On a phone an inch is 6.9% of the screen, so the
 * copy has every pixel a 3× screen shows; computers keep the full image.
 */
const PHONE_COPY: Record<string, [number, number, number]> = {
  "limonium.webp": [520, 1523, 5.2],
  "grass.webp": [620, 1623, 6.2],
  "ribbon.webp": [1560, 3000, 15.6],
  "pen.webp": [540, 1491, 5.3],
  "ribbon-tail.webp": [900, 2288, 9],
  "rose.webp": [260, 696, 2.62], // set by its height (6.2in), this wide
  "thistle.webp": [350, 988, 3.48], // set by its height (5.4in), this wide
};

/** A photographed or rendered thing lying on the table. */
export function Prop({ src, className, alt = "" }: { src: string; className: string; alt?: string }) {
  const copy = PHONE_COPY[src];
  const pick = copy
    ? {
        srcSet: `${ART}/${src.replace(".webp", "-m.webp")} ${copy[0]}w, ${ART}/${src} ${copy[1]}w`,
        sizes: `(max-width: 700px) ${(copy[2] * 6.9).toFixed(1)}vw, ${Math.round(copy[2] * 96)}px`,
      }
    : {};
  return <img className={`lp-prop ${className}`} src={`${ART}/${src}`} {...pick} alt={alt} aria-hidden={alt ? undefined : true} decoding="async" draggable={false} />;
}
