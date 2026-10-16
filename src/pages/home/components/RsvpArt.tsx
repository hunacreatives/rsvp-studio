/**
 * "Effortless" card art: an RSVP card on coral. A cursor taps "Joyfully
 * accepts", the button fills, and an "RSVP sent" pill pops up. Motion lives
 * in index.css (hw-rsvp-*); with reduced motion it rests on the answered card.
 */

const FONT = "Inter, ui-sans-serif, system-ui, sans-serif";
const SERIF = "Lora, Georgia, serif";
const NAVY = "#24275b";
const BLUE = "#4662ae";

export default function RsvpArt({ className = "" }: { className?: string }) {
  return (
    <div className={`hw overflow-hidden ${className}`}>
      <svg viewBox="0 0 800 700" className="block h-full w-full" aria-hidden>
        <rect width="800" height="700" fill="#ef795a" />

        <g transform="rotate(3 400 330)" fontFamily={FONT}>
          <rect x="150" y="70" width="500" height="510" rx="32" fill="#fff" />
          <text x="400" y="138" fontSize="22" fontWeight="700" letterSpacing="6" fill="#ef795a" textAnchor="middle">
            R.S.V.P.
          </text>
          <text x="400" y="196" fontFamily={SERIF} fontSize="42" fontWeight="600" fill={NAVY} textAnchor="middle">
            Will you be there?
          </text>
          <text x="400" y="236" fontSize="22" fill="#6b6f8a" textAnchor="middle">
            Alex &amp; Maria · April 26
          </text>

          {/* Accept: outline, with the filled state laid over it */}
          <rect x="200" y="280" width="400" height="84" rx="42" fill="#fff" stroke={NAVY} strokeWidth="3" />
          <text x="400" y="331" fontSize="26" fontWeight="600" fill={NAVY} textAnchor="middle">
            Joyfully accepts
          </text>
          <g className="hw-rsvp-fill">
            <rect x="200" y="280" width="400" height="84" rx="42" fill={BLUE} />
            <circle cx="262" cy="322" r="17" fill="#fff" />
            <path d="M254 322 l6 6 l11 -12" fill="none" stroke={BLUE} strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
            <text x="412" y="331" fontSize="26" fontWeight="600" fill="#fff" textAnchor="middle">
              Joyfully accepts
            </text>
          </g>

          <rect x="200" y="384" width="400" height="84" rx="42" fill="#fff" stroke="#d9d6e4" strokeWidth="3" />
          <text x="400" y="435" fontSize="26" fill="#6b6f8a" textAnchor="middle">
            Regretfully declines
          </text>

          {/* Party size stepper */}
          <text x="212" y="530" fontSize="24" fill={NAVY}>
            Guests
          </text>
          <g fill="none" stroke={NAVY} strokeWidth="3" strokeLinecap="round">
            <circle cx="468" cy="522" r="22" />
            <line x1="458" y1="522" x2="478" y2="522" />
            <circle cx="572" cy="522" r="22" />
            <line x1="562" y1="522" x2="582" y2="522" />
            <line x1="572" y1="512" x2="572" y2="532" />
          </g>
          <text x="520" y="531" fontSize="26" fontWeight="600" fill={NAVY} textAnchor="middle">
            2
          </text>

          <circle className="hw-rsvp-ripple" cx="470" cy="322" r="60" fill="#fff" />
          <g transform="translate(462 318)">
            <g className="hw-rsvp-cursor">
              <path
                d="M0 0 L0 58 L15 45 L27 70 L39 64 L27 40 L46 40 Z"
                fill="#fff"
                stroke={NAVY}
                strokeWidth="4"
                strokeLinejoin="round"
              />
            </g>
          </g>
        </g>

        <g transform="translate(400 628)">
          <g className="hw-rsvp-toast">
            <rect x="-135" y="-34" width="270" height="68" rx="34" fill={NAVY} />
            <circle cx="-92" cy="0" r="17" fill="#7fd1a2" />
            <path d="M-100 0 l6 6 l11 -12" fill="none" stroke={NAVY} strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
            <text x="18" y="9" fontFamily={FONT} fontSize="25" fontWeight="600" fill="#fff" textAnchor="middle">
              RSVP sent
            </text>
          </g>
        </g>
      </svg>
    </div>
  );
}
