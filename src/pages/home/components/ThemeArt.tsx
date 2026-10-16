/**
 * "Personal" card art: Claudy's 30th, quietly re-theming itself. The
 * background, lettering and tiles cross-fade through three palettes, and
 * the cake and party details follow along. The lettering is the original type used as a
 * mask (/home/claudy-type.png). Motion: index.css (hw-theme-*, hw-party-flame).
 */

const FONT = "Inter, ui-sans-serif, system-ui, sans-serif";
const CORAL = "#ef795a";

const TILES = [
  { x: 516, y: 40, w: 252, h: 272 },
  { x: 32, y: 323, w: 737, h: 276 },
  { x: 32, y: 612, w: 735, h: 273 },
];

function Cake() {
  return (
    <g>
      <rect className="hw-theme-fg" x="574" y="196" width="136" height="74" rx="12" />
      <rect className="hw-theme-fg" x="598" y="150" width="88" height="50" rx="10" />
      <path d="M598 166 q11 12 22 0 t22 0 t22 0 t22 0 V160 a10 10 0 0 0 -10 -10 H608 a10 10 0 0 0 -10 10 Z" fill="#fff" />
      <path d="M574 214 q17 14 34 0 t34 0 t34 0 t34 0 V208 a12 12 0 0 0 -12 -12 H586 a12 12 0 0 0 -12 12 Z" fill="#fff" />
      <rect x="560" y="268" width="164" height="8" rx="4" fill="#fff" />
      {[620, 642, 664].map((x, i) => (
        <g key={x}>
          <rect x={x - 4} y="118" width="8" height="32" rx="3" fill="#fff" />
          <path
            className="hw-party-flame"
            style={{ animationDelay: `${i * 0.23}s` }}
            d={`M${x} 92 c8 10 9 16 0 22 c-9 -6 -8 -12 0 -22 Z`}
            fill={CORAL}
          />
        </g>
      ))}
    </g>
  );
}

function Details() {
  return (
    <g className="hw-theme-fg" fontFamily={FONT} textAnchor="middle">
      <text x="400" y="420" fontSize="22" fontWeight="600" letterSpacing="4">
        COME PARTY
      </text>
      <text x="400" y="482" fontSize="50" fontWeight="800">
        Sat, Nov 14
      </text>
      <text x="400" y="530" fontSize="26" fontWeight="500">
        7PM · The Loft
      </text>
    </g>
  );
}

export default function ThemeArt({ className = "" }: { className?: string }) {
  return (
    <div className={`hw overflow-hidden ${className}`}>
      <svg viewBox="0 0 800 700" className="block h-full w-full" aria-hidden>
        <defs>
          <mask id="hw-claudy-type" maskUnits="userSpaceOnUse" x="25" y="20" width="470" height="290">
            <image href="/home/claudy-type.png" x="25" y="20" width="470" height="290" />
          </mask>
        </defs>
        <rect className="hw-theme-bg" width="800" height="700" />
        <rect className="hw-theme-ink" x="25" y="20" width="470" height="290" mask="url(#hw-claudy-type)" />
        {TILES.map((t, i) => (
          <rect
            key={i}
            className="hw-theme-tile"
            style={{ animationDelay: `${i * 0.12}s, ${i * 0.12}s` }}
            x={t.x}
            y={t.y}
            width={t.w}
            height={t.h}
            rx="16"
            stroke="#fff"
            strokeOpacity="0.7"
            strokeWidth="2"
          />
        ))}
        <Cake />
        <Details />
      </svg>
    </div>
  );
}
