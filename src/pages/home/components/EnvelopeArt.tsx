/**
 * "Interactive" card art: the sky-blue envelope. Every few seconds the seal
 * lifts, the flap folds open and an invitation rises out, then it all
 * closes and the seal stamps back on. Motion: index.css (hw-env-*).
 */

const LINE = "#4a5ea8";
const SKY = "#60c6e1";

export default function EnvelopeArt({ className = "" }: { className?: string }) {
  return (
    <div className={`hw overflow-hidden ${className}`}>
      <svg viewBox="0 0 800 700" className="block h-full w-full" aria-hidden>
        {/* inside of the envelope, seen once the flap opens */}
        <rect width="800" height="700" fill="#4fb2cf" />

        <g className="hw-env-card">
          <rect x="230" y="70" width="340" height="380" rx="14" fill="#fffdf8" />
          <text x="400" y="150" fontFamily="Lora, Georgia, serif" fontStyle="italic" fontSize="38" fill="#24275b" textAnchor="middle">
            You&rsquo;re invited
          </text>
          <text x="400" y="190" fontFamily="Inter, ui-sans-serif, system-ui, sans-serif" fontSize="20" letterSpacing="3" fill="#6b6f8a" textAnchor="middle">
            ALEX &amp; MARIA
          </text>
          <path d="M400 236 c-10 -14 -30 -8 -26 8 c3 12 26 26 26 26 s23 -14 26 -26 c4 -16 -16 -22 -26 -8 Z" fill="#ef795a" />
        </g>

        {/* front pocket: everything but the top triangle */}
        <path d="M0 0 L400 352 L800 0 V700 H0 Z" fill={SKY} />
        <g stroke={LINE} strokeWidth="2.5">
          <line x1="0" y1="700" x2="400" y2="352" />
          <line x1="800" y1="700" x2="400" y2="352" />
        </g>

        <g className="hw-env-flap">
          <path d="M0 0 H800 L400 352 Z" fill={SKY} />
          <path d="M0 0 L400 352 L800 0" fill="none" stroke={LINE} strokeWidth="2.5" />
        </g>

        <g className="hw-env-seal">
          <circle cx="400" cy="352" r="83" fill="#dd665c" />
          <circle cx="400" cy="352" r="62" fill="#e57a63" />
          <g fill="none" stroke="#f2d14c" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round">
            <ellipse cx="382" cy="362" rx="22" ry="27" transform="rotate(-12 382 362)" />
            <path d="M372 350 l11 24 l13 -36 c9 -20 26 -26 40 -16" />
          </g>
        </g>
      </svg>
    </div>
  );
}
