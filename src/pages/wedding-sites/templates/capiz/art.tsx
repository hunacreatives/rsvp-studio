import type { CSSProperties } from "react";

// Capiz's materials, drawn in code: capiz shell panes (milky when unlit, honey-amber and
// mottled when light comes through, every pane a little different), the adobe stone of the
// house's base, dust in the light, and one small sampaguita mark. The lime plaster and the
// narra are photographed textures (public/event-templates/capiz/*.webp).

const tile = (w: number, h: number, body: string) => `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${body}</svg>`)}`;

/** Capiz with light behind it: honey-amber, mottled where the shell is thicker. */
export const CAPIZ = tile(
  320,
  320,
  '<filter id="a" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency=".014 .032" numOctaves="4" seed="3" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 .98  .3 0 0 0 .64  .36 0 0 0 .36  0 0 0 0 1"/></filter><rect width="100%" height="100%" filter="url(#a)"/>',
);

/** Capiz shell: thin laminated flakes and fine striations, pale and translucent (laid over each pane). */
export const FLAKE = tile(
  160,
  160,
  '<filter id="c" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".035 .22" numOctaves="3" seed="5" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 .97  0 0 0 0 .9  0 0 0 1.6 -.62"/></filter><rect width="100%" height="100%" filter="url(#c)"/>',
);

/** Adobe stone: two courses of cut blocks with recessed joints (multiplied over the base). */
export const STONE = tile(
  360,
  180,
  '<filter id="s" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".09" numOctaves="4" seed="21" stitchTiles="stitch" result="n"/><feDiffuseLighting in="n" lighting-color="#fff" surfaceScale="1.6"><feDistantLight azimuth="225" elevation="55"/></feDiffuseLighting><feComponentTransfer><feFuncR type="linear" slope=".4" intercept=".62"/><feFuncG type="linear" slope=".4" intercept=".62"/><feFuncB type="linear" slope=".4" intercept=".62"/></feComponentTransfer></filter><rect width="100%" height="100%" filter="url(#s)"/>' +
    '<g fill="none" stroke-linecap="square"><path d="M0 1H360M0 91H360M1 1V91M181 1V91M91 91V180M271 91V180" stroke="#000" stroke-opacity=".2" stroke-width="2"/><path d="M0 3H360M0 93H360M3 3V91M183 3V91M93 93V180M273 93V180" stroke="#fff" stroke-opacity=".25" stroke-width="1"/></g>',
);

/** Deterministic 0–1 noise per pane, so every pane looks a little different but never changes. */
const rnd = (n: number) => {
  const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};

/** The look of one pane, as CSS variables (styles.ts .cz-pane reads them). */
function paneVars(i: number, seed = 0): CSSProperties {
  const k = i * 7 + seed * 131;
  return {
    ["--x" as string]: `${Math.round(rnd(k + 1) * 320)}px`,
    ["--y" as string]: `${Math.round(rnd(k + 2) * 320)}px`,
    ["--t" as string]: (rnd(k + 3) * 0.1).toFixed(3),
    ["--g" as string]: (0.78 + rnd(k + 4) * 0.22).toFixed(2),
  } as CSSProperties;
}

/** A grid of capiz panes in a narra lattice (the gaps between panes are the wood). */
export function Panes({ cols, rows, seed = 0, className = "" }: { cols: number; rows: number; seed?: number; className?: string }) {
  return (
    <div className={`cz-lattice ${className}`} style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, gridTemplateRows: `repeat(${rows}, 1fr)` }} aria-hidden>
      {Array.from({ length: cols * rows }, (_, i) => (
        <span key={i} className="cz-pane" style={paneVars(i, seed)} />
      ))}
    </div>
  );
}

/** A tall window set in the wall, lit from behind: arched for the ceremony (like a church), square-headed for the reception. */
export function Niche({ arched = false, seed = 0 }: { arched?: boolean; seed?: number }) {
  return (
    <div className={`cz-niche cz-wood${arched ? " cz-niche--arch" : ""}`} aria-hidden>
      <Panes cols={4} rows={arched ? 8 : 7} seed={seed} />
    </div>
  );
}

/** A few motes of dust drifting in the light by the window. */
export function Motes() {
  return (
    <div className="cz-motes" aria-hidden>
      {Array.from({ length: 12 }, (_, i) => (
        <span
          key={i}
          className="cz-mote"
          style={
            {
              left: `${22 + rnd(i + 40) * 56}%`,
              top: `${30 + rnd(i + 80) * 55}%`,
              ["--s" as string]: `${1.2 + rnd(i + 120) * 2}px`,
              ["--dur" as string]: `${11 + rnd(i + 160) * 10}s`,
              ["--del" as string]: `${-rnd(i + 200) * 14}s`,
              ["--dx" as string]: `${(rnd(i + 240) - 0.5) * 50}px`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}

/** One sampaguita bloom, line-drawn: five petals and a small heart. */
export function Sampaguita({ size = 26, className = "" }: { size?: number; className?: string }) {
  return (
    <svg className={`cz-bloom ${className}`} width={size} height={size} viewBox="-20 -20 40 40" aria-hidden>
      {[0, 72, 144, 216, 288].map((r) => (
        <path key={r} d="M0 -2.5 C 4.2 -6 4.6 -13 0 -17 C -4.6 -13 -4.2 -6 0 -2.5Z" transform={`rotate(${r})`} />
      ))}
      <circle r="2.1" />
    </svg>
  );
}
