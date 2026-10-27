// Riviera's yacht, drawn: the bow and the stern keep their shape; the hull between them is CSS
// (styles.ts) and grows with the sections. Ids are prefixed per page so two yachts on one page
// (the design gallery) don't share gradients.

export function Bow({ uid }: { uid: string }) {
  const id = (n: string) => `${uid}-${n}`;
  return (
    <svg className="rv-bow" viewBox="0 0 600 520" preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id={id("top")} x1="0" x2="1">
          <stop offset="0" stopColor="#c3ccd4" />
          <stop offset=".014" stopColor="#eef2f5" />
          <stop offset=".03" stopColor="#fff" />
          <stop offset=".97" stopColor="#fff" />
          <stop offset=".986" stopColor="#eef2f5" />
          <stop offset="1" stopColor="#c3ccd4" />
        </linearGradient>
        <radialGradient id={id("hatch")} cx=".35" cy=".3" r=".9">
          <stop offset="0" stopColor="#55626f" />
          <stop offset="1" stopColor="#252d37" />
        </radialGradient>
        <linearGradient id={id("steel")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f4f7f9" />
          <stop offset=".45" stopColor="#9aa6b1" />
          <stop offset=".6" stopColor="#e8edf1" />
          <stop offset="1" stopColor="#a7b2bc" />
        </linearGradient>
        <radialGradient id={id("red")}>
          <stop offset="0" stopColor="#ff5a4a" stopOpacity=".55" />
          <stop offset="1" stopColor="#ff5a4a" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={id("green")}>
          <stop offset="0" stopColor="#3dff95" stopOpacity=".5" />
          <stop offset="1" stopColor="#3dff95" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* the hull, and the deck inside its gunwale */}
      <path d="M300 0 C 342 4.5 462 81.7 532 237.7 C 570 319.4 597 416 600 520 L 0 520 C 3 416 30 319.4 68 237.7 C 138 81.7 258 4.5 300 0 Z" fill={`url(#${id("top")})`} />
      <path d="M300 16.3 C 336 22.3 440 95.1 504 242.2 C 538 320.9 566 416 568 520 L 32 520 C 34 416 62 320.9 96 242.2 C 160 95.1 264 22.3 300 16.3 Z" fill="#fbfbf9" stroke="#d9dfe4" strokeWidth="2" />
      {/* stainless rub rail on the sheer */}
      <path d="M300 3 C 340 7.4 458 84.7 528 239.2 C 566 320.9 593 416 596 520 M300 3 C 260 7.4 142 84.7 72 239.2 C 34 320.9 7 416 4 520" fill="none" stroke={`url(#${id("steel")})`} strokeWidth="5" />
      {/* navigation lights: red to port, green to starboard */}
      <circle cx="108" cy="223" r="5" fill="#e0392f" />
      <circle cx="108" cy="223" r="14" fill={`url(#${id("red")})`} />
      <circle cx="492" cy="223" r="5" fill="#1fbf6a" />
      <circle cx="492" cy="223" r="14" fill={`url(#${id("green")})`} />
      {/* the bow rail, on stanchions */}
      <path d="M300 40.1 C 330 46.1 420 111.4 478 245.1 C 512 319.4 556 416 558 520 M300 40.1 C 270 46.1 180 111.4 122 245.1 C 88 319.4 44 416 42 520" fill="none" stroke="#b5bfc8" strokeWidth="3" />
      <g fill="#b5bfc8">
        {[[300, 40, 5], [390, 95, 4], [210, 95, 4], [452, 186, 4], [148, 186, 4], [494, 290, 4], [106, 290, 4], [534, 394, 4], [66, 394, 4]].map(([x, y, r]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r={r} />
        ))}
      </g>
      {/* anchor windlass, two cleats, the foredeck hatch */}
      <rect x="284" y="68" width="32" height="18" rx="6" fill="#dfe5ea" stroke="#b5bfc8" />
      <circle cx="300" cy="75" r="5" fill="#9aa6b1" />
      <rect x="250" y="108" width="22" height="8" rx="4" fill="#c7d0d8" />
      <rect x="328" y="108" width="22" height="8" rx="4" fill="#c7d0d8" />
      <rect x="262" y="156" width="76" height="70" rx="10" fill={`url(#${id("hatch")})`} stroke="#e6ebef" strokeWidth="5" />
      <path d="M272 164.9 L 300 164.9" stroke="rgba(255,255,255,0.25)" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function Stern({ uid }: { uid: string }) {
  const id = (n: string) => `${uid}-${n}`;
  return (
    <svg className="rv-stern" viewBox="0 0 600 190" preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id={id("stop")} x1="0" x2="1">
          <stop offset="0" stopColor="#c3ccd4" />
          <stop offset=".03" stopColor="#fff" />
          <stop offset=".97" stopColor="#fff" />
          <stop offset="1" stopColor="#c3ccd4" />
        </linearGradient>
        <pattern id={id("teak")} width="110" height="139" patternUnits="userSpaceOnUse">
          <image href="/event-templates/riviera/teak.jpg" width="110" height="139" preserveAspectRatio="none" />
        </pattern>
      </defs>
      {/* the transom */}
      <path d="M0 0 L600 0 L600 70 C600 118 578 136 540 140 L60 140 C22 136 0 118 0 70 Z" fill={`url(#${id("stop")})`} />
      <path d="M32 0 L568 0 L568 64 C568 100 552 114 524 116 L76 116 C48 114 32 100 32 64 Z" fill="#fbfbf9" stroke="#d9dfe4" strokeWidth="2" />
      {/* the swim platform, in teak, with a ladder */}
      <path d="M40 132 L560 132 L560 168 C560 180 552 186 540 186 L60 186 C48 186 40 180 40 168 Z" fill={`url(#${id("teak")})`} stroke="#e6ebef" strokeWidth="4" />
      <path d="M470 140 L470 182 M500 140 L500 182 M470 152 L500 152 M470 166 L500 166" stroke="#b5bfc8" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
