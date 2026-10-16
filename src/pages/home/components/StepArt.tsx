/**
 * The How It Works illustrations, drawn in SVG so the characters can move:
 * eyes glance and blink, bodies breathe, and card 2's form types itself in.
 * All motion lives in index.css under "How It Works characters".
 */

const FONT = "Inter, ui-sans-serif, system-ui, sans-serif";
const BLUE = "#4662ae";
const NAVY = "#24275b";

function Services() {
  return (
    <svg viewBox="0 0 1325 1253" className="block h-full w-full" aria-hidden>
      <rect width="1325" height="1253" fill={BLUE} />

      {/* Digital Save the Date — sleepy pink flower */}
      <g className="hw-breathe">
        <g fill="#ed8bb9">
          <circle cx="308" cy="210" r="95" />
          <circle cx="497" cy="210" r="95" />
          <circle cx="308" cy="390" r="95" />
          <circle cx="497" cy="390" r="95" />
          <rect x="308" y="210" width="189" height="180" />
        </g>
        <g fill="none" stroke="#000" strokeWidth="7" strokeLinecap="round">
          <path d="M350 282 a18 18 0 0 0 36 0" />
          <path d="M412 282 a18 18 0 0 0 36 0" />
          <path d="M310 286 C 345 350 450 365 488 290" />
        </g>
      </g>
      <g className="hw-spin" fill="#ee4c9b">
        <circle cx="545" cy="105" r="30" />
        <circle cx="583" cy="148" r="30" />
        <circle cx="540" cy="182" r="30" />
        <circle cx="514" cy="130" r="30" />
        <circle cx="545" cy="142" r="22" />
      </g>

      {/* Stationery — hexagon with googly eyes */}
      <path
        d="M742 305 L840 125 L1058 125 L1157 305 L1058 485 L840 485 Z"
        fill="#62b5da"
        stroke="#62b5da"
        strokeWidth="30"
        strokeLinejoin="round"
      />
      <g className="hw-blink" style={{ animationDelay: "1.4s" }}>
        <circle cx="905" cy="305" r="42" fill="#fff" stroke="#000" strokeWidth="4" />
        <circle cx="995" cy="305" r="42" fill="#fff" stroke="#000" strokeWidth="4" />
        <g className="hw-look-around">
          <circle cx="905" cy="325" r="18" fill="#000" />
          <circle cx="993" cy="325" r="18" fill="#000" />
        </g>
      </g>

      {/* RSVP Management — content yellow stack */}
      <g className="hw-squish">
        <rect x="210" y="730" width="378" height="180" rx="90" fill="#f7cb46" />
        <rect x="210" y="910" width="378" height="180" rx="90" fill="#f7cb46" />
        <g fill="none" stroke="#000" strokeWidth="7" strokeLinecap="round">
          <path d="M345 962 a18 18 0 0 0 36 0" />
          <path d="M412 962 a18 18 0 0 0 36 0" />
          <path d="M306 968 C 345 1035 445 1045 486 968" />
        </g>
      </g>

      {/* Monogram — coral circle looking up at its seal */}
      <circle cx="917" cy="903" r="188" fill="#ef795a" />
      <g className="hw-blink" style={{ animationDelay: "3.1s" }}>
        <circle cx="872" cy="918" r="45" fill="#fff" />
        <circle cx="962" cy="918" r="45" fill="#fff" />
        <g className="hw-look-up">
          <circle cx="890" cy="900" r="18" fill="#000" />
          <circle cx="980" cy="900" r="18" fill="#000" />
        </g>
      </g>
      <g className="hw-bob">
        <circle cx="1062" cy="778" r="55" fill="#fcded9" />
        <text x="1060" y="802" fontFamily="Lora, Georgia, serif" fontStyle="italic" fontSize="72" textAnchor="middle" fill="#000">
          V
        </text>
      </g>

      <g fill="#fff" fontFamily={FONT} fontSize="46" textAnchor="middle">
        <text x="402" y="592">Digital Save the Date</text>
        <text x="948" y="592">Stationery</text>
        <text x="398" y="1160">RSVP Management</text>
        <text x="917" y="1165">Monogram</text>
      </g>
    </svg>
  );
}

// Each field types in turn, then the form clears and starts again.
const FIELDS = [
  { label: "Event Type", value: "Wedding", y: 236, w: 212 },
  { label: "Couple’s Name", value: "Alex & Maria", y: 576, w: 294 },
  { label: "Event Date", value: "April 26, 2026", y: 910, w: 332 },
];

function Details() {
  return (
    <svg viewBox="0 0 1325 1253" className="block h-full w-full" aria-hidden>
      <rect width="1325" height="1253" fill="#f0c7de" />
      {FIELDS.map((f, i) => (
        <g key={f.label} fontFamily={FONT}>
          <text x="110" y={f.y - 51} fontSize="62" fill="#000">
            {f.label}
          </text>
          <rect x="110" y={f.y} width="1112" height="182" rx="55" fill="#f5dfec" />
          <text x="198" y={f.y + 107} fontSize="50" fill="#000">
            {f.value}
          </text>
          <g transform="translate(198 0)">
            <g className={`hw-type hw-type--${i + 1}`}>
              <rect className="hw-cover" x="0" y={f.y + 24} width={f.w + 40} height="134" fill="#f5dfec" />
              <rect className={`hw-caret hw-caret--${i + 1}`} x="-2" y={f.y + 58} width="5" height="62" fill="#000" />
            </g>
          </g>
        </g>
      ))}
    </svg>
  );
}

function WeGotYou() {
  return (
    <svg viewBox="0 0 1325 1253" className="block h-full w-full" aria-hidden>
      <rect width="1325" height="1253" fill="#f7cc47" />
      <g className="hw-sway">
        <path
          d="M275 300 A120 120 0 0 1 395 183 L410 183 A118 118 0 0 1 528 297 A120 120 0 0 1 648 183 L665 183 A120 120 0 0 1 785 297 A116 116 0 0 1 900 183 L915 183 A124 124 0 0 1 1040 305 L1040 665 A257 257 0 0 1 783 922 L530 922 A255 255 0 0 1 275 667 Z"
          fill={BLUE}
        />
        <circle cx="540" cy="568" r="94" fill="#fff" />
        <circle className="hw-look-side" cx="540" cy="568" r="37" fill={NAVY} />
        {/* Right eye: open, then it closes into the wink and opens again. */}
        <g className="hw-eye-r">
          <circle cx="756" cy="572" r="94" fill="#fff" />
          <circle className="hw-look-side" cx="756" cy="572" r="37" fill={NAVY} />
        </g>
        <g fill="none" stroke="#fff" strokeWidth="22" strokeLinecap="round" strokeLinejoin="round">
          <polyline className="hw-wink" points="807,516 700,607 808,630" />
          <path className="hw-grin" d="M533 735 C 600 790 700 830 783 735" />
        </g>
      </g>
      <defs>
        <path id="hw-arc" d="M250 920 Q 660 1230 1100 880" />
      </defs>
      <text fontFamily={FONT} fontSize="150" fill={NAVY}>
        <textPath href="#hw-arc" startOffset="50%" textAnchor="middle">
          we got you!
        </textPath>
      </text>
    </svg>
  );
}

export default function StepArt({ step }: { step: number }) {
  return (
    <div className="hw aspect-[1325/1253] w-full overflow-hidden rounded-[14px] shadow-[0_30px_60px_-30px_rgba(0,7,39,0.28)]">
      {step === 1 ? <Services /> : step === 2 ? <Details /> : <WeGotYou />}
    </div>
  );
}
