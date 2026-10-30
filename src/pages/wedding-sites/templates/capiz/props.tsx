// Capiz: the house's ironwork and carving, drawn as vectors. A farol (the old glass-and-iron
// lantern) hanging from a wall bracket or a chain, or on the street's cast-iron post; the
// calado's pierced fretwork and the corbels under the beam, as mask shapes the CSS fills with
// narra (so they carry the wood's grain).

const IRON = "#140f0c";

/** The lantern itself, centred on x = 50 in a 100-wide box, its top at y = 0. */
function Lantern({ id, y = 0 }: { id: string; y?: number }) {
  return (
    <g transform={`translate(0 ${y})`}>
      <defs>
        <radialGradient id={`${id}-g`} cx="50%" cy="58%" r="70%">
          <stop offset="0" stopColor="#fffaea" />
          <stop offset="0.35" stopColor="#ffe2a6" />
          <stop offset="1" stopColor="#d98e43" />
        </radialGradient>
        <linearGradient id={`${id}-s`} x1="0" x2="1">
          <stop offset="0" stopColor="#7a4a22" />
          <stop offset="1" stopColor="#d9954c" />
        </linearGradient>
        <linearGradient id={`${id}-i`} x1="0" x2="1">
          <stop offset="0" stopColor="#0b0807" />
          <stop offset="0.45" stopColor="#3a2e26" />
          <stop offset="1" stopColor="#0b0807" />
        </linearGradient>
      </defs>
      <circle cx="50" cy="5" r="4" fill={`url(#${id}-i)`} />
      <rect x="48" y="8" width="4" height="10" fill={IRON} />
      <path d="M28 36 L50 16 L72 36 Z" fill={`url(#${id}-i)`} />
      <path d="M50 16 L72 36 H58 Z" fill="#000" opacity="0.35" />
      <rect x="24" y="35" width="52" height="5" rx="1" fill={`url(#${id}-i)`} />
      {/* the glass: the face toward us, and the two turned away */}
      <rect x="30" y="40" width="9" height="62" fill={`url(#${id}-s)`} transform="scale(-1 1) translate(-69 0)" />
      <rect x="61" y="40" width="9" height="62" fill={`url(#${id}-s)`} />
      <rect x="39" y="40" width="22" height="62" fill={`url(#${id}-g)`} />
      <ellipse cx="50" cy="78" rx="3.2" ry="6.5" fill="#fffef6" />
      <ellipse cx="50" cy="80" rx="7" ry="11" fill="#fff3d0" opacity="0.45" />
      {/* the iron frame */}
      <g stroke={IRON} strokeWidth="2.2" fill="none">
        <path d="M30 40 V102 M39 40 V102 M61 40 V102 M70 40 V102 M30 41 H70 M30 101 H70" />
        <path d="M30 71 H39 M61 71 H70" strokeWidth="1.4" />
      </g>
      <rect x="27" y="101" width="46" height="5" rx="1" fill={`url(#${id}-i)`} />
      <path d="M31 106 H69 L57 122 H43 Z" fill={`url(#${id}-i)`} />
      <circle cx="50" cy="127" r="3" fill={IRON} />
    </g>
  );
}

/** A farol: on a scrolled wall bracket (from the left), or hanging on a chain. */
export function Farol({ id, mount = "bracket", className = "" }: { id: string; mount?: "bracket" | "chain"; className?: string }) {
  if (mount === "chain")
    return (
      <svg className={`cz-farol ${className}`} viewBox="0 0 100 230" aria-hidden>
        <g stroke={IRON} strokeWidth="2" fill="none">
          {Array.from({ length: 8 }, (_, i) => (
            <ellipse key={i} cx="50" cy={6 + i * 12} rx={i % 2 ? 1.4 : 3.2} ry="6" />
          ))}
        </g>
        <Lantern id={id} y={96} />
      </svg>
    );
  return (
    <svg className={`cz-farol ${className}`} viewBox="0 0 150 200" aria-hidden>
      <g fill="none" stroke={IRON} strokeLinecap="round">
        <path d="M2 4 V60" strokeWidth="6" />
        <path d="M2 14 H100" strokeWidth="4.5" />
        <path d="M2 52 C 30 52 52 40 66 26 C 74 18 84 14 96 14" strokeWidth="3" />
        <path d="M30 46 C 26 38 30 30 38 31 C 44 32 44 40 39 42" strokeWidth="2.2" />
        <path d="M60 30 C 56 24 60 18 66 20" strokeWidth="2" />
        <path d="M100 14 V30" strokeWidth="2.4" />
      </g>
      <g transform="translate(50 26) scale(1)">
        <Lantern id={id} />
      </g>
    </svg>
  );
}

/** The street's cast-iron lamp post, its farol on top. */
export function LampPost({ id, className = "" }: { id: string; className?: string }) {
  return (
    <svg className={`cz-post-lamp ${className}`} viewBox="0 0 100 560" preserveAspectRatio="xMidYMax meet" aria-hidden>
      <defs>
        <linearGradient id={`${id}-p`} x1="0" x2="1">
          <stop offset="0" stopColor="#060504" />
          <stop offset="0.38" stopColor="#3b322b" />
          <stop offset="0.55" stopColor="#1a1512" />
          <stop offset="1" stopColor="#050403" />
        </linearGradient>
      </defs>
      <Lantern id={id} />
      <rect x="44" y="128" width="12" height="18" fill={`url(#${id}-p)`} />
      <path d="M38 146 H62 L58 158 H42 Z" fill={`url(#${id}-p)`} />
      <rect x="45" y="158" width="10" height="300" fill={`url(#${id}-p)`} />
      <g stroke="#000" strokeOpacity="0.55" strokeWidth="0.8">
        <path d="M48 160 V456 M52 160 V456" />
      </g>
      <rect x="41" y="300" width="18" height="7" rx="2" fill={`url(#${id}-p)`} />
      <path d="M42 456 H58 L66 500 H34 Z" fill={`url(#${id}-p)`} />
      <rect x="28" y="500" width="44" height="12" rx="2" fill={`url(#${id}-p)`} />
      <rect x="24" y="512" width="52" height="48" fill={`url(#${id}-p)`} />
      <rect x="24" y="512" width="52" height="3" fill="#4a3f36" opacity="0.6" />
    </svg>
  );
}

const svgUrl = (w: number, h: number, body: string) => `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}' viewBox='0 0 ${w} ${h}'>${body}</svg>`)}")`;

/** The calado's fretwork as a mask (opaque where the wood is): rosettes on a diamond lattice,
 *  leaf-shaped piercings between them and a plain rail above and below. Repeats along x. */
export const CALADO_MASK = (() => {
  const petals = (cx: number, cy: number) =>
    Array.from({ length: 8 }, (_, i) => `<ellipse cx='${cx}' cy='${cy - 22}' rx='5.2' ry='11' transform='rotate(${i * 45} ${cx} ${cy})'/>`).join("") + `<circle cx='${cx}' cy='${cy}' r='5'/>`;
  const leaf = (cx: number, cy: number, r: number) => `<path transform='translate(${cx} ${cy}) rotate(${r})' d='M0 -16 C 9 -8 9 6 0 16 C -9 6 -9 -8 0 -16 Z'/>`;
  const holes = [petals(0, 70), petals(160, 70), petals(80, 70), leaf(40, 46, 40), leaf(40, 94, -40), leaf(120, 46, -40), leaf(120, 94, 40), `<circle cx='40' cy='70' r='3.5'/>`, `<circle cx='120' cy='70' r='3.5'/>`].join("");
  return svgUrl(160, 140, `<defs><mask id='m'><rect width='160' height='140' fill='#fff'/><g fill='#000'>${holes}</g></mask></defs><rect width='160' height='140' fill='#000' mask='url(#m)'/>`);
})();

/** A corbel (cane) under the beam: a scrolled bracket, wider at the top, one every 240px. */
export const CORBEL_MASK = svgUrl(240, 110, `<path d='M0 0 H70 V12 C 70 30 58 40 46 50 C 34 60 30 74 34 88 C 37 98 30 108 18 110 H0 Z' fill='#000'/>`);
