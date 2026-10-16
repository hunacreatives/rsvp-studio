import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

// Promenade's art data and pieces. The illustrations are watercolours painted by
// the studio's designers: until each file is in public/event-templates/promenade/
// (and switched on in READY), the page shows finished gold line art in its place
// (lineart.tsx). With ?brief=1 each piece gets a numbered pin whose pop-up says
// what to paint (BRIEFS), so the link itself is the designers' brief. Also here:
// the dress-code figures (drawn in code, in the host's colours), the photo
// carousel, the confetti and the embossed envelope paper.

export type PaintingName = "envelope" | "seal" | "hero" | "clock" | "garland" | "venue" | "stay";

/** Flip to true as each file arrives in public/event-templates/promenade/. */
export const READY: Record<PaintingName, boolean> = {
  envelope: false,
  seal: false,
  hero: false,
  clock: false,
  garland: false,
  venue: false,
  stay: false,
};

export const paintingUrl = (name: PaintingName) => `/event-templates/promenade/${name}.${name === "hero" || name === "envelope" ? "jpg" : "png"}`;

/** True when the page was opened with ?brief=1 (the designers' brief). */
export function useBriefMode() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    setOn(new URLSearchParams(window.location.search).get("brief") === "1");
  }, []);
  return on;
}

// The palette the paintings should sit in (the page's own colours).
export const BRIEF_PALETTE: [string, string][] = [
  ["#fbf6ec", "Cream (the page)"],
  ["#e9c9c1", "Blush"],
  ["#d9a7a0", "Dusty rose"],
  ["#a9b496", "Sage"],
  ["#7f8c6a", "Deep sage"],
  ["#c2a06a", "Muted gold"],
  ["#4b4036", "Warm brown (text)"],
];

type Brief = { title: string; file: string; size: string; notes: string[] };

// What the designers should paint for each slot (shown in the brief's pop-up bubbles).
export const BRIEFS: Record<PaintingName, Brief> = {
  envelope: {
    title: "Envelope paper",
    file: "envelope.jpg",
    size: "2400 × 2400 px, JPG, seamless tile",
    notes: ["White/ivory paper with a soft blind-embossed floral pattern (no colour).", "Even light, no folds or shadows — the flap and shadows are drawn by the site.", "Must tile seamlessly in every direction."],
  },
  seal: {
    title: "Gold wax seal",
    file: "seal.png",
    size: "1000 × 1000 px, transparent PNG",
    notes: ["A real-looking gold wax seal from straight above, soft natural shadow.", "Keep the centre plain — the couple’s initials are pressed in by the site.", "A wreath or border around the rim is welcome."],
  },
  hero: {
    title: "Hero painting",
    file: "hero.jpg",
    size: "1600 × 2600 px (tall, phone shape), JPG",
    notes: ["A romantic watercolour scene: a couple seen from behind walking toward a garden gazebo, chapel or terrace; soft sky.", "Keep the middle third calm — the names sit there.", "Generic couple, no faces. Hosts can replace it with their own photo."],
  },
  clock: {
    title: "Countdown clock",
    file: "clock.png",
    size: "1000 × 1000 px, transparent PNG",
    notes: ["A small vintage clock (gold rim) tucked into blush roses and sage leaves.", "Centred; flowers mostly below and to the sides."],
  },
  garland: {
    title: "Rose garland",
    file: "garland.png",
    size: "2400 × 600 px, transparent PNG",
    notes: ["A horizontal garland: blush roses in the centre, smaller flowers and sage leaves trailing out.", "Thin at the ends so it fades out."],
  },
  venue: {
    title: "Venue",
    file: "venue.png",
    size: "1200 × 1200 px, transparent PNG",
    notes: ["A light, airy garden gazebo or chapel with flowers at its base.", "Mostly line with soft colour washes."],
  },
  stay: {
    title: "Birdcage (where to stay)",
    file: "stay.png",
    size: "1000 × 1200 px, transparent PNG",
    notes: ["A vintage gold birdcage with flowers inside or climbing it — a cosy ‘home for the night’ feeling."],
  },
};

// ---------------------------------------------------------------------------
// Dress code: two couples drawn in code, dressed in the host's motif colours —
// the darkest colour for the suits, the others for the gowns.

const lum = (hex: string) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return 0.5;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/** Suits and gowns from the motif colours (or the fallbacks when there are none). */
export function dressColours(motif: string[], fallback: { suit: string; gowns: string[] }) {
  const clean = motif.filter((c) => /^#?[0-9a-f]{6}$/i.test(c.trim())).map((c) => (c.startsWith("#") ? c : `#${c}`));
  if (!clean.length) return fallback;
  const byDark = [...clean].sort((a, b) => lum(a) - lum(b));
  const suit = lum(byDark[0]) < 0.35 ? byDark[0] : fallback.suit;
  const gowns = clean.filter((c) => c !== suit && lum(c) < 0.93);
  return { suit, gowns: gowns.length ? gowns : fallback.gowns };
}

function Gentleman({ x, suit }: { x: number; suit: string }) {
  return (
    <g transform={`translate(${x} 0)`}>
      <path d="M-4 222 h-11 a3 3 0 0 0 0 6 h12 Z M4 222 h11 a3 3 0 0 1 0 6 h-12 Z" fill="#2b2622" />
      <path d="M-14 118 L-11 224 H-1 L0 140 L1 224 H11 L14 118 Z" fill={suit} />
      <path d="M-20 64 C-24 70 -24 100 -21 128 L-15 130 L-14 92 Z M20 64 C24 70 24 100 21 128 L15 130 L14 92 Z" fill={suit} />
      <path d="M-18 60 C-10 56 10 56 18 60 L16 130 H-16 Z" fill={suit} />
      <path d="M-18 60 C-10 56 10 56 18 60 L16 130 H-16 Z" fill="url(#pm-cloth)" />
      <path d="M-5 58 L0 92 L5 58 Z" fill="#fbf7f0" />
      <path d="M-1.6 62 L0 86 L1.6 62 Z" fill="#2b2622" opacity=".85" />
      <path d="M-6 58 L-9 74 L-1 92 M6 58 L9 74 L1 92" fill="none" stroke="#000" strokeOpacity=".25" strokeWidth="1" />
      <rect x="-3.4" y="46" width="6.8" height="10" rx="2" fill="#e2c3a8" />
      <ellipse cx="0" cy="38" rx="10" ry="11.5" fill="#e2c3a8" />
      <path d="M-10 36 C-11 24 11 22 10 34 C6 29 -4 28 -10 36 Z" fill="#3b2f27" />
      <circle cx="-21" cy="130" r="3.2" fill="#e2c3a8" />
      <circle cx="21" cy="130" r="3.2" fill="#e2c3a8" />
    </g>
  );
}

function Lady({ x, gown, id }: { x: number; gown: string; id: string }) {
  return (
    <g transform={`translate(${x} 0)`}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={gown} />
          <stop offset=".55" stopColor={gown} stopOpacity=".88" />
          <stop offset="1" stopColor={gown} />
        </linearGradient>
      </defs>
      <path d="M-9 94 C-20 140 -32 190 -40 226 C-20 232 20 232 40 226 C32 190 20 140 9 94 Z" fill={`url(#${id})`} />
      <path d="M-9 94 C-20 140 -32 190 -40 226 C-20 232 20 232 40 226 C32 190 20 140 9 94 Z" fill="url(#pm-cloth)" />
      <path d="M-3 100 C-8 150 -12 190 -14 228 M4 100 C8 150 14 190 18 228" fill="none" stroke="#fff" strokeOpacity=".28" strokeWidth="1.2" />
      <path d="M-11 60 C-6 58 6 58 11 60 L9 96 H-9 Z" fill={gown} />
      <path d="M-10 94 H10" stroke="#000" strokeOpacity=".18" strokeWidth="2" />
      <path d="M-12 62 C-17 78 -18 98 -16 116 M12 62 C17 78 18 98 16 116" fill="none" stroke="#e2c3a8" strokeWidth="4" strokeLinecap="round" />
      <rect x="-3" y="47" width="6" height="12" rx="2.5" fill="#e2c3a8" />
      <ellipse cx="0" cy="38" rx="9.5" ry="11" fill="#e2c3a8" />
      <path d="M-10 40 C-12 24 12 22 10 38 C9 30 -6 26 -10 40 Z" fill="#4a3528" />
      <circle cx="6" cy="27" r="6" fill="#4a3528" />
    </g>
  );
}

/** Two couples, side by side, in the host's colours. */
export function DressFigures({ suit, gowns }: { suit: string; gowns: string[] }) {
  const g1 = gowns[0], g2 = gowns[1] ?? gowns[0];
  return (
    <svg className="pm-dress" viewBox="0 0 400 240" role="img" aria-label="Two couples dressed for the occasion">
      <defs>
        <linearGradient id="pm-cloth" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".18" />
          <stop offset=".5" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity=".16" />
        </linearGradient>
      </defs>
      <ellipse cx="200" cy="230" rx="180" ry="6" fill="#000" opacity=".06" />
      <Gentleman x={70} suit={suit} />
      <Lady x={122} gown={g1} id="pm-gown-a" />
      <Gentleman x={268} suit={suit} />
      <Lady x={320} gown={g2} id="pm-gown-b" />
    </svg>
  );
}

/** A swipeable row of photos with dots. */
export function Carousel({ items }: { items: { url: string; alt: string; focal?: { x: number; y: number } }[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [at, setAt] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onScroll = () => setAt(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)));
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);
  const go = (i: number) => ref.current?.scrollTo({ left: i * ref.current.clientWidth, behavior: "smooth" });
  return (
    <div className="pm-carousel">
      <div ref={ref} className="pm-carousel__track">
        {items.map((p, i) => (
          <div key={i} className="pm-carousel__slide">
            <img src={p.url} alt={p.alt} loading="lazy" style={{ objectPosition: `${(p.focal?.x ?? 0.5) * 100}% ${(p.focal?.y ?? 0.5) * 100}%` }} />
          </div>
        ))}
      </div>
      {items.length > 1 ? (
        <div className="pm-carousel__dots">
          {items.map((_, i) => (
            <button key={i} type="button" aria-label={`Photo ${i + 1}`} className={i === at ? "is-on" : ""} onClick={() => go(i)} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

/** Gold confetti falling after a yes. */
export function Confetti() {
  const bits = useRef(
    Array.from({ length: 46 }, (_, i) => ({
      i,
      x: (Math.random() - 0.5) * 640,
      y: 260 + Math.random() * 380,
      r: (Math.random() < 0.5 ? -1 : 1) * (200 + Math.random() * 520),
      d: Math.random() * 0.4,
      w: 4 + Math.random() * 5,
      tone: i % 3,
    })),
  ).current;
  return (
    <div className="pm-confetti" aria-hidden>
      {bits.map((b) => (
        <span
          key={b.i}
          style={{ ["--x" as string]: `${b.x}px`, ["--y" as string]: `${b.y}px`, ["--r" as string]: `${b.r}deg`, animationDelay: `${b.d}s`, width: b.w, height: b.w * 1.8, background: ["#c2a06a", "#e3c98f", "#e9c9c1"][b.tone] } as CSSProperties}
        />
      ))}
    </div>
  );
}

/** Embossed paper: a soft blind-embossed floral pattern (until the designers' envelope paper arrives). */
const tile = (w: number, h: number, body: string) => `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${body}</svg>`)}`;
// A small leafy vine with a five-petal flower at its tip (pointed leaves alternate along a curved stem).
const leaf = (x: number, y: number, a: number, s = 1) => `<path transform="translate(${x} ${y}) rotate(${a}) scale(${s})" d="M0 0 C5 -5 12 -5 17 0 C12 5 5 5 0 0Z"/>`;
const flower = (x: number, y: number, r: number) =>
  `<g transform="translate(${x} ${y})">${[0, 72, 144, 216, 288].map((a) => `<ellipse cx="0" cy="${-r}" rx="${r * 0.55}" ry="${r * 0.9}" transform="rotate(${a})"/>`).join("")}<circle r="${r * 0.42}" fill="#fff"/></g>`;
const vine = (x: number, y: number, rot: number, flip = 1) =>
  `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${flip} 1)"><path d="M0 0 C18 -10 34 -10 52 -24 C64 -34 72 -48 76 -62" fill="none" stroke="#000" stroke-width="1.8" stroke-linecap="round"/>${leaf(12, -6, -40, 0.8)}${leaf(22, -9, 40, 0.9)}${leaf(38, -15, -55, 0.9)}${leaf(50, -23, 25, 0.85)}${leaf(62, -38, -70, 0.8)}${flower(76, -66, 6)}${flower(30, -2, 3.5)}</g>`;
export const EMBOSS = tile(
  320,
  320,
  `<filter id="e" filterUnits="userSpaceOnUse" x="0" y="0" width="320" height="320"><feGaussianBlur in="SourceAlpha" stdDeviation=".9" result="b"/><feDiffuseLighting in="b" lighting-color="#fff" surfaceScale="2.2" result="l"><feDistantLight azimuth="225" elevation="52"/></feDiffuseLighting><feComponentTransfer><feFuncR type="linear" slope=".5" intercept=".56"/><feFuncG type="linear" slope=".5" intercept=".56"/><feFuncB type="linear" slope=".5" intercept=".56"/></feComponentTransfer></filter><g filter="url(#e)"><rect width="320" height="320" fill="none"/>${vine(20, 120, -6)}${vine(190, 70, 18, -1)}${vine(110, 250, -20)}${vine(270, 230, 8, -1)}${vine(-20, 300, 10)}${vine(300, 140, -12)}</g>`,
);
