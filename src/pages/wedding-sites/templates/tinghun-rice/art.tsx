import { Fragment, useId } from "react";
import { zhRuns } from "./content";

// Rice Paper's marks, all drawn: the family seal (印章) pressed in vermilion, a papercut 囍,
// and <Zh>, which sets the Chinese runs of a mixed line in the Chinese face (lang="zh-Hant").

export const VERMILION = "#c8372d";

/** A mixed line ("多謝 · Thank you"): Chinese runs in their own spans, the rest as it is. */
export function Zh({ text }: { text: string }) {
  return (
    <>
      {zhRuns(text).map((r, i) =>
        r.zh ? (
          <span key={i} lang="zh-Hant" className="rp-zh">
            {r.text}
          </span>
        ) : (
          <Fragment key={i}>{r.text}</Fragment>
        ),
      )}
    </>
  );
}

/**
 * The seal: a square chop carved with the two family names in relief-cut (白文, the
 * characters left as paper), its edges and ink a little uneven like a real impression. Two
 * layers: the ink, and a faint spread of ink into the paper around it (the bleed).
 */
export function Seal({ chars, zh, label }: { chars: string[]; zh: boolean; label: string }) {
  const raw = useId().replace(/[^a-zA-Z0-9]/g, "");
  const mask = `rp-cut-${raw}`;
  const rough = `rp-rough-${raw}`;
  const n = Math.max(1, Math.min(2, chars.length));
  const cells = n === 2 ? [30.5, 69.5] : [50];
  const font = zh ? '"Noto Serif TC", "Songti TC", "PMingLiU", serif' : '"Lora", Georgia, serif';
  // Two characters side by side are drawn tall, the way a seal carver fits them to the square.
  const size = n === 2 ? (zh ? 35 : 40) : zh ? 58 : 56;
  const stretch = n === 2 ? (zh ? 1.72 : 1.5) : 1.05;
  return (
    <span className="rp-seal" role="img" aria-label={label}>
      <span className="rp-seal__shadow" aria-hidden />
      <svg className="rp-seal__bleed" viewBox="0 0 100 100" aria-hidden>
        <rect x="4" y="4" width="92" height="92" rx="4" fill={VERMILION} mask={`url(#${mask})`} />
      </svg>
      <svg className="rp-seal__ink" viewBox="0 0 100 100" aria-hidden>
        <defs>
          <mask id={mask} maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="100">
            <rect width="100" height="100" fill="#fff" />
            <rect x="10" y="10" width="80" height="80" rx="1.5" fill="none" stroke="#000" strokeWidth="1.5" />
            {chars.slice(0, n).map((c, i) => (
              <text
                key={i}
                transform={`translate(${cells[i]} 51) scale(1 ${stretch})`}
                fontSize={size}
                fontWeight={zh ? 700 : 600}
                fill="#000"
                textAnchor="middle"
                dominantBaseline="central"
                style={{ fontFamily: font, fontStyle: "normal", fontSynthesis: "none", letterSpacing: 0 }}
              >
                {c}
              </text>
            ))}
          </mask>
          <filter id={rough} x="-6%" y="-6%" width="112%" height="112%" colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.09" numOctaves="2" seed="11" result="warp" />
            <feDisplacementMap in="SourceGraphic" in2="warp" scale="2.6" xChannelSelector="R" yChannelSelector="G" result="shape" />
            <feTurbulence type="fractalNoise" baseFrequency="0.62" numOctaves="2" seed="4" result="grain" />
            <feColorMatrix in="grain" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -16 12.2" result="holes" />
            <feComposite in="shape" in2="holes" operator="in" />
          </filter>
        </defs>
        <g filter={`url(#${rough})`}>
          <rect x="4" y="4" width="92" height="92" rx="4" fill={VERMILION} mask={`url(#${mask})`} />
        </g>
      </svg>
    </span>
  );
}

/** One 喜 of the papercut, as cut bars (x offset `o`). */
function half(o: number) {
  return (
    <>
      <rect x={o + 3} y="2" width="40" height="6" />
      <rect x={o + 20} y="2" width="6" height="19" />
      <rect x={o + 9} y="15" width="28" height="6" />
      <path d={`M${o + 9} 26h28v18h-28z M${o + 15} 32v6h16v-6z`} fillRule="evenodd" />
      <path d={`M${o + 12} 47h6l3 9h-6z M${o + 28} 47h6l-3 9h-6z`} />
      <rect x={o} y="56" width="46" height="6" />
      <path d={`M${o + 7} 68h32v28h-32z M${o + 13} 74v16h20v-16z`} fillRule="evenodd" />
    </>
  );
}

/** The papercut 囍 (double happiness), cut from one sheet: the two 喜 joined at their long bars.
 *  It hangs from a small loop at the top, where the red thread ends. */
export function PapercutXi({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 -12 100 112" role="img" aria-label="囍, double happiness">
      <g fill={VERMILION}>
        {half(0)}
        {half(54)}
        <rect x="42" y="2" width="16" height="6" />
        <rect x="45" y="56" width="10" height="6" />
        <rect x="49.2" y="-3" width="1.6" height="6" />
      </g>
      <circle cx="50" cy="-6.5" r="3.6" fill="none" stroke={VERMILION} strokeWidth="1.5" />
    </svg>
  );
}

/** Rice paper's fibres: a few long, faint, wandering strands (a tile, multiplied over the paper). */
export const FIBRES = (() => {
  let seed = 20261024;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  let body = "";
  for (let i = 0; i < 20; i++) {
    const x = rnd() * 420;
    const y = rnd() * 420;
    const a = rnd() * Math.PI * 2;
    const l = 14 + rnd() * 46;
    const x2 = x + Math.cos(a) * l;
    const y2 = y + Math.sin(a) * l;
    const qx = (x + x2) / 2 + (rnd() - 0.5) * 18;
    const qy = (y + y2) / 2 + (rnd() - 0.5) * 18;
    body += `<path d="M${x.toFixed(1)} ${y.toFixed(1)}Q${qx.toFixed(1)} ${qy.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}" stroke-width="${(0.35 + rnd() * 0.55).toFixed(2)}" opacity="${(0.1 + rnd() * 0.22).toFixed(2)}"/>`;
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="420" height="420"><g fill="none" stroke="#9a8a70" stroke-linecap="round">${body}</g></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
})();
