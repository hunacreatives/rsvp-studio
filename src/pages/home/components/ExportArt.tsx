/**
 * "Export to sheet" card art: a guest list tilted on yellow, with the
 * spreadsheet file popping out of it. Same flat, bold language as the
 * How It Works characters; the file tag reuses their hw-bob motion.
 */

const FONT = "Inter, ui-sans-serif, system-ui, sans-serif";
const NAVY = "#24275b";

const ROWS = [
  { name: "Alex & Maria", rsvp: "Yes", party: "2" },
  { name: "Lola Nena", rsvp: "Yes", party: "1" },
  { name: "Tito Ben", rsvp: "No", party: "0" },
  { name: "Bea Santos", rsvp: "Maybe", party: "3" },
  { name: "Paolo Cruz", rsvp: "Yes", party: "2" },
];

const CHIP: Record<string, { bg: string; ink: string }> = {
  Yes: { bg: "#dcf1e3", ink: "#1f7a47" },
  No: { bg: "#fcded9", ink: "#c2492e" },
  Maybe: { bg: "#fbefc7", ink: "#9a7300" },
};

export default function ExportArt({ className = "" }: { className?: string }) {
  return (
    <div className={`hw overflow-hidden ${className}`}>
      <svg viewBox="0 0 800 700" className="block h-full w-full" aria-hidden>
        <rect width="800" height="700" fill="#f7cb46" />

        <g transform="rotate(-4 400 330)" fontFamily={FONT}>
          <rect x="110" y="88" width="560" height="460" rx="28" fill="#fff" />
          <path d="M110 158 V116 a28 28 0 0 1 28 -28 H642 a28 28 0 0 1 28 28 V158 Z" fill="#4662ae" />
          <g fill="#fff" fontSize="22" fontWeight="600" letterSpacing="1.5">
            <text x="146" y="131">GUEST</text>
            <text x="424" y="131">RSVP</text>
            <text x="566" y="131">PARTY</text>
          </g>
          <g stroke="#efe7f0" strokeWidth="3">
            <line x1="400" y1="158" x2="400" y2="548" />
            <line x1="542" y1="158" x2="542" y2="548" />
            {ROWS.slice(1).map((_, i) => (
              <line key={i} x1="110" y1={158 + (i + 1) * 78} x2="670" y2={158 + (i + 1) * 78} />
            ))}
          </g>
          {ROWS.map((r, i) => {
            const y = 158 + i * 78;
            const c = CHIP[r.rsvp];
            return (
              <g key={r.name}>
                <text x="146" y={y + 48} fontSize="26" fill={NAVY}>
                  {r.name}
                </text>
                <rect x="420" y={y + 21} width={r.rsvp === "Maybe" ? 104 : 74} height="36" rx="18" fill={c.bg} />
                <text x={420 + (r.rsvp === "Maybe" ? 52 : 37)} y={y + 46} fontSize="20" fontWeight="600" fill={c.ink} textAnchor="middle">
                  {r.rsvp}
                </text>
                <text x="566" y={y + 48} fontSize="26" fill={NAVY}>
                  {r.party}
                </text>
              </g>
            );
          })}
        </g>

        {/* The spreadsheet file, sliding out bottom-right */}
        <g transform="translate(560 420) rotate(9)">
          <g className="hw-bob">
            <path d="M0 18 a18 18 0 0 1 18 -18 H112 L160 48 V192 a18 18 0 0 1 -18 18 H18 a18 18 0 0 1 -18 -18 Z" fill="#2e9e63" />
            <path d="M112 0 V30 a18 18 0 0 0 18 18 H160 Z" fill="#7fd1a2" />
            <g fill="none" stroke="#fff" strokeWidth="6" strokeLinejoin="round">
              <rect x="34" y="70" width="92" height="72" rx="8" />
              <line x1="34" y1="94" x2="126" y2="94" />
              <line x1="34" y1="118" x2="126" y2="118" />
              <line x1="70" y1="70" x2="70" y2="142" />
            </g>
            <text x="80" y="186" fontFamily={FONT} fontSize="26" fontWeight="700" fill="#fff" textAnchor="middle" letterSpacing="2">
              XLSX
            </text>
            <circle cx="6" cy="20" r="34" fill="#ef795a" />
            <path d="M6 4 V34 M-8 22 L6 36 L20 22" fill="none" stroke="#fff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        </g>
      </svg>
    </div>
  );
}
