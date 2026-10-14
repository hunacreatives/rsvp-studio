import { useEffect, useId, useRef, useState, type CSSProperties, type RefObject } from "react";

// The Pickleball template's artwork, all drawn here as vectors (no image
// files): the wavy frame, the hand-drawn stripes, the crossed paddles, the
// ball and the little net. Colours come from the theme through CSS variables
// (--pb-ink green, --pb-pink, --pb-cream), so Look & Feel recolours them.

/** Live size of an element (the frame redraws its waves to fit). */
export function useSize<T extends HTMLElement>(ref: RefObject<T | null>) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      const { width, height } = e.contentRect;
      setSize((s) => (Math.abs(s.w - width) < 0.5 && Math.abs(s.h - height) < 0.5 ? s : { w: width, h: height }));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return size;
}

/**
 * A rounded rectangle traced with an even sine wave all the way round,
 * corners included (that's what makes the big loops at the corners). The
 * number of waves is rounded so the wave closes up exactly, at any size.
 */
export function wavyRectPath(w: number, h: number, o: { inset: number; radius: number; amp: number; wave: number }) {
  const x0 = o.inset, y0 = o.inset, x1 = w - o.inset, y1 = h - o.inset;
  const r = Math.max(0, Math.min(o.radius, (x1 - x0) / 2, (y1 - y0) / 2));
  const top = x1 - x0 - 2 * r, side = y1 - y0 - 2 * r, arc = (Math.PI * r) / 2;
  if (top <= 0 || side <= 0) return "";
  const P = 2 * top + 2 * side + 4 * arc;
  const waves = Math.max(6, Math.round(P / o.wave));
  const lambda = P / waves;
  // Point and outward normal at distance s along the perimeter (clockwise from the top-left corner's end).
  const at = (s: number): [number, number, number, number] => {
    const segs: [number, (t: number) => [number, number, number, number]][] = [
      [top, (t) => [x0 + r + t, y0, 0, -1]],
      [arc, (t) => { const a = -Math.PI / 2 + t / r; return [x1 - r + r * Math.cos(a), y0 + r + r * Math.sin(a), Math.cos(a), Math.sin(a)]; }],
      [side, (t) => [x1, y0 + r + t, 1, 0]],
      [arc, (t) => { const a = t / r; return [x1 - r + r * Math.cos(a), y1 - r + r * Math.sin(a), Math.cos(a), Math.sin(a)]; }],
      [top, (t) => [x1 - r - t, y1, 0, 1]],
      [arc, (t) => { const a = Math.PI / 2 + t / r; return [x0 + r + r * Math.cos(a), y1 - r + r * Math.sin(a), Math.cos(a), Math.sin(a)]; }],
      [side, (t) => [x0, y1 - r - t, -1, 0]],
      [arc, (t) => { const a = Math.PI + t / r; return [x0 + r + r * Math.cos(a), y0 + r + r * Math.sin(a), Math.cos(a), Math.sin(a)]; }],
    ];
    for (const [len, f] of segs) {
      if (s <= len) return f(s);
      s -= len;
    }
    return segs[0][1](0);
  };
  const step = Math.max(2, lambda / 28);
  let d = "";
  for (let s = 0; s <= P + 0.01; s += step) {
    const [x, y, nx, ny] = at(Math.min(s, P));
    const k = o.amp * Math.sin((2 * Math.PI * s) / lambda);
    d += `${d ? "L" : "M"}${(x + nx * k).toFixed(1)} ${(y + ny * k).toFixed(1)}`;
  }
  return `${d}Z`;
}

/** The wavy frame, drawn to fit its parent. `size` sets the wave scale. */
export function WavyFrame({ size = "lg", className = "", fill = "none" }: { size?: "lg" | "sm"; className?: string; fill?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const { w, h } = useSize(ref);
  // Waves scale with the frame's width, within limits, like the printed card.
  const unit = size === "lg" ? Math.min(Math.max(w / 600, 0.62), 1.15) : Math.min(Math.max(w / 600, 0.55), 0.9) * 0.62;
  const stroke = size === "lg" ? Math.max(7, 11 * unit) : Math.max(3.5, 6 * unit);
  const amp = (size === "lg" ? 15 : 8) * unit;
  const d = w && h ? wavyRectPath(w, h, { inset: amp + stroke / 2 + 1, radius: (size === "lg" ? 70 : 40) * unit, amp, wave: (size === "lg" ? 128 : 100) * unit }) : "";
  return (
    <div ref={ref} className={`pb-frame ${className}`} aria-hidden>
      {d ? (
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
          {fill !== "none" ? <path className="pb-frame__fill" d={d} fill={fill} /> : null}
          <path className="pb-frame__path" d={d} pathLength={1} fill="none" stroke="var(--pb-ink)" strokeWidth={stroke} strokeLinejoin="round" />
        </svg>
      ) : null}
    </div>
  );
}

/** `a` blended into `b` (hex colours): weight 1 = all `a`. Falls back to `a`. */
export function mixHex(a: string, b: string, weight: number) {
  const rgb = (h: string) => {
    const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(h.trim());
    if (!m) return null;
    const x = m[1].length === 3 ? m[1].split("").map((c) => c + c).join("") : m[1];
    return [0, 2, 4].map((i) => parseInt(x.slice(i, i + 2), 16));
  };
  const ca = rgb(a), cb = rgb(b);
  if (!ca || !cb) return a;
  return `#${ca.map((v, i) => Math.round(v * weight + cb[i] * (1 - weight)).toString(16).padStart(2, "0")).join("")}`;
}

/**
 * The stripes, as a repeating tile: each edge wobbles like a hand-painted
 * line, and the wobble repeats exactly every tile so there's no seam.
 */
export function stripesTile(pink: string, cream: string) {
  const W = 120, H = 600;
  const edge = (x: number, p1: number, p2: number) => {
    const pts: string[] = [];
    for (let y = 0; y <= H; y += 12) {
      const t = (2 * Math.PI * y) / H;
      pts.push(`${(x + 2.6 * Math.sin(t + p1) + 1.4 * Math.sin(3 * t + p2) + 0.8 * Math.sin(5 * t + p1 * 2)).toFixed(2)} ${y}`);
    }
    return pts;
  };
  const left = edge(30, 0.4, 1.9);
  const right = edge(90, 2.2, 0.3).reverse();
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="${cream}"/><path d="M${left.join("L")}L${right.join("L")}Z" fill="${pink}"/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

/** A pickleball: a solid ball with its holes; the holes turn when `spin`. */
export function Ball({ size = 48, className = "", style, spin = false }: { size?: number; className?: string; style?: CSSProperties; spin?: boolean }) {
  const holes: [number, number, number][] = [
    [50, 22, 6], [30, 32, 5.5], [70, 32, 5.5], [20, 52, 5], [50, 46, 6.5], [80, 52, 5], [34, 66, 5.8], [66, 66, 5.8], [50, 80, 5.5], [26, 78, 3.6], [74, 78, 3.6],
  ];
  return (
    <svg className={`pb-ball ${className}`} style={style} width={size} height={size} viewBox="0 0 100 100" aria-hidden>
      <circle cx="50" cy="50" r="46" fill="var(--pb-ink)" />
      <g className={spin ? "pb-ball__holes" : undefined} style={{ transformOrigin: "50px 50px" }}>
        {holes.map(([x, y, r], i) => (
          <circle key={i} cx={x} cy={y} r={r} fill="var(--pb-cream)" />
        ))}
      </g>
      <path d="M22 26 Q34 12 54 10" fill="none" stroke="var(--pb-cream)" strokeOpacity=".35" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

/** One paddle's drawing (face with a dot texture, edge guard, throat, wrapped grip), 120×250 units. */
function PaddleShape({ id }: { id: string }) {
  const face = "M14 34 Q14 8 42 8 H78 Q106 8 106 34 V122 Q106 150 82 160 H38 Q14 150 14 122 Z";
  return (
    <>
      <path d={face} fill="var(--pb-cream)" />
      <path d={face} fill={`url(#${id}-dots)`} opacity=".8" />
      <path d="M25 38 Q25 19 46 19 H74 Q95 19 95 38 V118 Q95 139 78 147 H42 Q25 139 25 118 Z" fill="none" stroke="var(--pb-cream)" strokeWidth="6" />
      <path d={face} fill="none" stroke="var(--pb-ink)" strokeWidth="7" strokeLinejoin="round" />
      <path d="M46 158 L50 176 H70 L74 158 Z" fill="var(--pb-ink)" />
      <rect x="47" y="174" width="26" height="64" rx="8" fill="var(--pb-ink)" />
      {[184, 196, 208, 220].map((y) => (
        <path key={y} d={`M49 ${y + 6} L71 ${y - 2}`} stroke="var(--pb-cream)" strokeWidth="3.2" strokeLinecap="round" opacity=".9" />
      ))}
      <rect x="44" y="234" width="32" height="10" rx="5" fill="var(--pb-ink)" />
    </>
  );
}

/**
 * Two paddles crossed at the grips (one SVG; each turns around the crossing
 * point, so the opening can swing them in), the ball bobbing above.
 */
export function CrossedPaddles({ ball = true, small = false }: { ball?: boolean; small?: boolean }) {
  const id = useId().replace(/:/g, "");
  // Paddle units: the grip's middle (60, 206) sits on the crossing point (150, 214).
  const place = "translate(90 8)";
  return (
    <div className={`pb-crest${small ? " pb-crest--sm" : ""}`} aria-hidden>
      <svg className="pb-crest__paddles" viewBox="0 0 300 250">
        <defs>
          <pattern id={`${id}-dots`} width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <circle cx="3.5" cy="3.5" r="1.55" fill="var(--pb-ink)" />
          </pattern>
        </defs>
        <g className="pb-paddle pb-paddle--l">
          <g transform={place}>
            <PaddleShape id={id} />
          </g>
        </g>
        <g className="pb-paddle pb-paddle--r">
          <g transform={place}>
            <PaddleShape id={id} />
          </g>
        </g>
      </svg>
      {ball ? (
        <div className="pb-crest__ball">
          <div className="pb-bob">
            <Ball size={56} spin />
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** A short line of text set on a gentle arc ("Join us for"). */
export function ArcText({ text, variant = "gentle" }: { text: string; variant?: "gentle" | "arch" }) {
  const id = useId().replace(/:/g, "");
  const arch = variant === "arch";
  return (
    <svg className={`pb-arctext${arch ? " pb-arctext--arch" : ""}`} viewBox={arch ? "0 0 400 200" : "0 0 320 64"} role="img" aria-label={text}>
      {/* arch: the card's top is a semicircle centred at (200, 200) with radius 200; the words sit on radius 152 */}
      <path id={`${id}-arc`} d={arch ? "M51.3 168.4 A152 152 0 0 1 348.7 168.4" : "M24 58 Q160 6 296 58"} fill="none" />
      <text>
        <textPath href={`#${id}-arc`} startOffset="50%" textAnchor="middle">
          {text}
        </textPath>
      </text>
    </svg>
  );
}

/** A small net with a ball rallying back and forth over it. */
export function Rally() {
  return (
    <div className="pb-rally" aria-hidden>
      <svg className="pb-rally__net" viewBox="0 0 120 60">
        <rect x="6" y="14" width="108" height="8" rx="3" fill="var(--pb-ink)" />
        {Array.from({ length: 9 }, (_, i) => (
          <path key={i} d={`M${14 + i * 11.5} 22 V56`} stroke="var(--pb-ink)" strokeWidth="1.6" opacity=".55" />
        ))}
        {[30, 40, 50].map((y) => (
          <path key={y} d={`M8 ${y} H112`} stroke="var(--pb-ink)" strokeWidth="1.6" opacity=".55" />
        ))}
        <rect x="2" y="10" width="7" height="50" rx="3" fill="var(--pb-ink)" />
        <rect x="111" y="10" width="7" height="50" rx="3" fill="var(--pb-ink)" />
      </svg>
      <div className="pb-rally__ball">
        <Ball size={26} spin />
      </div>
    </div>
  );
}

/** A watercolour sticker from public/event-templates/pickleball/ (the studio's own "Claudy at 30" art: its drinks, and the gear from its What to Bring sheet). */
export type StickerName = "bucket" | "champagne" | "martini" | "spritz" | "bottle" | "paddle-check" | "towel" | "shirt" | "fan";
export function Sticker({ name, className = "", style }: { name: StickerName; className?: string; style?: CSSProperties }) {
  return <img className={`pb-sticker ${className}`} style={style} src={`/event-templates/pickleball/${name}.webp`} alt="" draggable={false} loading="lazy" decoding="async" />;
}

/** A four-point sparkle. */
export function Sparkle({ className = "", style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg className={`pb-sparkle ${className}`} style={style} viewBox="0 0 40 40" aria-hidden>
      <path d="M20 2 C21.5 14 26 18.5 38 20 C26 21.5 21.5 26 20 38 C18.5 26 14 21.5 2 20 C14 18.5 18.5 14 20 2 Z" fill="var(--pb-ink)" />
    </svg>
  );
}
