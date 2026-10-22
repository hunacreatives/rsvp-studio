// Open Play's drawings: a pickleball (with its holes), a paddle for the open-play rack, and
// the net. All in code, coloured by CSS variables, so they follow the palette.

export function Ball({ size = 22, className = "" }: { size?: number; className?: string }) {
  return (
    <svg className={`op-ball ${className}`} width={size} height={size} viewBox="0 0 40 40" aria-hidden>
      <circle cx="20" cy="20" r="18.5" className="op-ball__body" />
      {[
        [20, 9],
        [11, 15],
        [29, 15],
        [14, 26],
        [26, 26],
        [20, 20],
        [20, 31],
      ].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="2.4" className="op-ball__hole" />
      ))}
    </svg>
  );
}

/** One paddle in the rack: face, edge guard, grip, with a name written along the grip. */
export function Paddle({ name, tone, empty = false }: { name?: string; tone: number; empty?: boolean }) {
  return (
    <svg className={`op-paddle ${empty ? "op-paddle--empty" : ""}`} viewBox="0 0 60 150" aria-hidden={!name} role={name ? "img" : undefined} aria-label={name}>
      <rect x="4" y="4" width="52" height="86" rx="24" className={`op-paddle__face op-tone-${tone % 4}`} />
      <rect x="4" y="4" width="52" height="86" rx="24" className="op-paddle__edge" />
      {empty ? null : <circle cx="30" cy="40" r="9" className="op-paddle__logo" />}
      <rect x="22" y="88" width="16" height="10" rx="3" className="op-paddle__throat" />
      <rect x="21" y="96" width="18" height="50" rx="6" className="op-paddle__grip" />
      {name ? (
        <text x="30" y="121" className="op-paddle__name" transform="rotate(-90 30 121)" textAnchor="middle">
          {name.length > 9 ? `${name.slice(0, 8)}…` : name}
        </text>
      ) : null}
    </svg>
  );
}
