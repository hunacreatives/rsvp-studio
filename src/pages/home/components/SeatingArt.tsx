/**
 * "Seating, sorted" card art: three round tables from above on pink.
 * A guest's dot walks in and takes the one free seat, then their table
 * lights up with "You're at Table 2". Motion: index.css (hw-seat-*).
 */

const FONT = "Inter, ui-sans-serif, system-ui, sans-serif";
const NAVY = "#24275b";

const TABLES = [
  { n: 1, x: 225, y: 285 },
  { n: 2, x: 575, y: 285 },
  { n: 3, x: 400, y: 520 },
];
// The free seat at table 2 (bottom-right, 45°) is where the guest sits.
const FREE = { t: 2, k: 1 };
const SEAT_R = 108;

function seat(t: { x: number; y: number }, k: number) {
  const a = (k * Math.PI) / 4;
  return { x: t.x + SEAT_R * Math.cos(a), y: t.y + SEAT_R * Math.sin(a) };
}

export default function SeatingArt({ className = "" }: { className?: string }) {
  const free = seat(TABLES[1], FREE.k);
  return (
    <div className={`hw overflow-hidden ${className}`}>
      <svg viewBox="0 0 800 700" className="block h-full w-full" aria-hidden>
        <rect width="800" height="700" fill="#ed8bb9" />

        <circle className="hw-seat-ring" cx={TABLES[1].x} cy={TABLES[1].y} r="142" fill="none" stroke="#fff" strokeWidth="4" />

        {TABLES.map((t) => (
          <g key={t.n}>
            {Array.from({ length: 8 }, (_, k) => {
              const p = seat(t, k);
              const isFree = t.n === FREE.t && k === FREE.k;
              return (
                <circle
                  key={k}
                  cx={p.x}
                  cy={p.y}
                  r="17"
                  fill={isFree ? "none" : NAVY}
                  stroke={isFree ? "#fff" : "none"}
                  strokeWidth="3"
                  strokeDasharray={isFree ? "5 5" : undefined}
                />
              );
            })}
            <circle cx={t.x} cy={t.y} r="76" fill="#fff" />
            <text x={t.x} y={t.y + 16} fontFamily={FONT} fontSize="44" fontWeight="700" fill="#c7487f" textAnchor="middle">
              {t.n}
            </text>
          </g>
        ))}

        {/* the guest, walking in from the corner to the free seat */}
        <g transform={`translate(${free.x} ${free.y})`}>
          <g className="hw-seat-guest">
            <g className="hw-seat-name">
              <rect x="-38" y="-62" width="76" height="34" rx="17" fill="#fff" />
              <text y="-39" fontFamily={FONT} fontSize="18" fontWeight="600" fill={NAVY} textAnchor="middle">
                Bea
              </text>
            </g>
            <circle r="17" fill="#f7cb46" stroke={NAVY} strokeWidth="3" />
          </g>
        </g>

        <g transform={`translate(${TABLES[1].x} 100)`}>
          <g className="hw-seat-tag">
            <rect x="-120" y="-26" width="240" height="52" rx="26" fill="#fff" />
            <text y="8" fontFamily={FONT} fontSize="21" fontWeight="600" fill={NAVY} textAnchor="middle">
              You&rsquo;re at Table 2
            </text>
          </g>
        </g>
      </svg>
    </div>
  );
}
