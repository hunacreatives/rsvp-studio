import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from "react";

// Stationery, drawn in code and shared by the paper-and-envelope templates
// (Debut, Love Letter): paper sheets with grain, fibres, light and shadow
// (lace, deckled or plain edges), an envelope (back, pocket, flap), a wax
// seal, gold-foil flourishes and rosettes. No image files.
//
// Colours come from CSS variables the template sets: --st-paper (the card),
// --st-env (the envelope paper). Base styles: STATIONERY_CSS below.

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

/** A point and its outward normal at distance `s` around a rounded rectangle (clockwise from the top-left corner's end). */
function roundedRectAt(x0: number, y0: number, x1: number, y1: number, R: number) {
  const top = x1 - x0 - 2 * R, side = y1 - y0 - 2 * R, arc = (Math.PI * R) / 2;
  const segs: [number, (t: number) => [number, number, number, number]][] = [
    [top, (t) => [x0 + R + t, y0, 0, -1]],
    [arc, (t) => { const a = -Math.PI / 2 + t / R; return [x1 - R + R * Math.cos(a), y0 + R + R * Math.sin(a), Math.cos(a), Math.sin(a)]; }],
    [side, (t) => [x1, y0 + R + t, 1, 0]],
    [arc, (t) => { const a = t / R; return [x1 - R + R * Math.cos(a), y1 - R + R * Math.sin(a), Math.cos(a), Math.sin(a)]; }],
    [top, (t) => [x1 - R - t, y1, 0, 1]],
    [arc, (t) => { const a = Math.PI / 2 + t / R; return [x0 + R + R * Math.cos(a), y1 - R + R * Math.sin(a), Math.cos(a), Math.sin(a)]; }],
    [side, (t) => [x0, y1 - R - t, -1, 0]],
    [arc, (t) => { const a = Math.PI + t / R; return [x0 + R + R * Math.cos(a), y0 + R + R * Math.sin(a), Math.cos(a), Math.sin(a)]; }],
  ];
  const perimeter = segs.reduce((n, [len]) => n + len, 0);
  const at = (s: number): [number, number, number, number] => {
    s = ((s % perimeter) + perimeter) % perimeter;
    for (const [len, f] of segs) {
      if (s <= len) return f(s);
      s -= len;
    }
    return segs[0][1](0);
  };
  return { perimeter, at };
}

/**
 * A scalloped paper-lace edge: identical round scallops running continuously
 * around a softly rounded rectangle, corners included (their spacing divides
 * the whole perimeter exactly, so every scallop is the same). `holes` is the
 * embossed decoration: a small eyelet in each scallop and a pin-prick between.
 */
export function lacePath(w: number, h: number, r: number): { edge: string; holes: string } {
  const pad = r;
  const { perimeter, at } = roundedRectAt(pad, pad, w - pad, h - pad, r * 2.4);
  const n = Math.max(12, Math.round(perimeter / (2.1 * r)));
  const lambda = perimeter / n;
  const bump = r * 0.85;
  const f = (v: number) => v.toFixed(1);
  let edge = "";
  const steps = n * 18;
  for (let k = 0; k <= steps; k++) {
    const sPos = (k / steps) * perimeter;
    const t = (sPos / lambda) % 1;
    const v = bump * Math.sqrt(Math.max(0, 1 - (2 * t - 1) ** 2));
    const [x, y, nx, ny] = at(sPos);
    edge += `${edge ? "L" : "M"}${f(x + nx * v)} ${f(y + ny * v)}`;
  }
  const dot = (x: number, y: number, rr: number) => `M${f(x - rr)} ${f(y)}a${f(rr)} ${f(rr)} 0 1 0 ${f(2 * rr)} 0a${f(rr)} ${f(rr)} 0 1 0 ${f(-2 * rr)} 0Z`;
  let holes = "";
  for (let i = 0; i < n; i++) {
    const [x, y, nx, ny] = at((i + 0.5) * lambda);
    holes += dot(x + nx * bump * 0.42, y + ny * bump * 0.42, r * 0.15);
    const [px, py, pnx, pny] = at(i * lambda);
    holes += dot(px - pnx * r * 0.4, py - pny * r * 0.4, r * 0.07);
  }
  return { edge: `${edge}Z`, holes };
}

// ---------------------------------------------------------------------------
// Real-looking materials, generated (no image files): tiles rendered by the
// browser from SVG filters — lit noise for paper grain, stretched noise for
// fibres, low-frequency lit noise for velvet folds.

const tile = (w: number, h: number, body: string) => `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${body}</svg>`)}`;

/** Paper grain: fine bumps lit from the top left (mostly white, multiplied over the paper). */
export const PAPER_GRAIN = tile(
  280,
  280,
  '<filter id="p" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".78" numOctaves="4" seed="7" stitchTiles="stitch" result="n"/><feDiffuseLighting in="n" lighting-color="#fff" surfaceScale="1.35" result="l"><feDistantLight azimuth="225" elevation="58"/></feDiffuseLighting><feComponentTransfer><feFuncR type="linear" slope=".55" intercept=".47"/><feFuncG type="linear" slope=".55" intercept=".47"/><feFuncB type="linear" slope=".55" intercept=".47"/></feComponentTransfer></filter><rect width="100%" height="100%" filter="url(#p)"/>',
);

/** Paper fibres: long, faint streaks. */
export const PAPER_FIBRES = tile(
  420,
  420,
  '<filter id="f" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".03 .55" numOctaves="2" seed="11" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 .55  0 0 0 0 .5  0 0 0 0 .42  0 0 0 -1.6 1.15"/></filter><rect width="100%" height="100%" filter="url(#f)"/>',
);

/** Felt paper: a coarse, fibrous surface, lit (multiplied over coloured paper). */
export const FELT = tile(
  320,
  320,
  '<filter id="t" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".42 .5" numOctaves="4" seed="9" stitchTiles="stitch" result="n"/><feDiffuseLighting in="n" lighting-color="#fff" surfaceScale="2.2" result="l"><feDistantLight azimuth="235" elevation="50"/></feDiffuseLighting><feComponentTransfer><feFuncR type="linear" slope=".6" intercept=".42"/><feFuncG type="linear" slope=".6" intercept=".42"/><feFuncB type="linear" slope=".6" intercept=".42"/></feComponentTransfer></filter><rect width="100%" height="100%" filter="url(#t)"/>',
);

/**
 * A lace ribbon across the width: scalloped along both long edges, with a row of
 * eyelets and a centre band of little cut flowers. Holes show what's behind it.
 */
export function LaceRibbon({ className = "", height = 70 }: { className?: string; height?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const { w } = useSize(ref);
  const id = useId().replace(/:/g, "");
  const h = height, r = h * 0.13;
  let d = "";
  if (w) {
    const n = Math.max(6, Math.round(w / (2 * r)));
    const rx = w / (2 * n);
    const f = (v: number) => v.toFixed(1);
    d = `M0 ${f(r)}`;
    for (let i = 0; i < n; i++) d += `a${f(rx)} ${f(r)} 0 0 1 ${f(2 * rx)} 0`;
    d += `V${f(h - r)}`;
    for (let i = 0; i < n; i++) d += `a${f(rx)} ${f(r)} 0 0 1 ${f(-2 * rx)} 0`;
    d += "Z";
    const hole = (cx: number, cy: number, hr: number) => `M${f(cx - hr)} ${f(cy)}a${f(hr)} ${f(hr)} 0 1 0 ${f(2 * hr)} 0a${f(hr)} ${f(hr)} 0 1 0 ${f(-2 * hr)} 0Z`;
    for (let i = 0; i < n; i++) {
      const cx = rx * (2 * i + 1);
      d += hole(cx, r * 0.9, r * 0.32) + hole(cx, h - r * 0.9, r * 0.32);
      if (i % 2 === 0) {
        // a little cut flower: five petals round a centre
        const cy = h / 2;
        for (let k = 0; k < 5; k++) {
          const a = (k / 5) * Math.PI * 2 - Math.PI / 2;
          d += hole(cx + Math.cos(a) * r * 0.75, cy + Math.sin(a) * r * 0.75, r * 0.28);
        }
      } else {
        d += hole(cx, h / 2 - r * 0.6, r * 0.14) + hole(cx, h / 2 + r * 0.6, r * 0.14);
      }
    }
  }
  return (
    <div ref={ref} className={`st-ribbon ${className}`} style={{ height: h }} aria-hidden>
      {w ? (
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
          <defs>
            <pattern id={`${id}-g`} width="280" height="280" patternUnits="userSpaceOnUse">
              <image href={PAPER_GRAIN} width="280" height="280" />
            </pattern>
          </defs>
          <path d={d} fill="var(--st-lace, #efe7d6)" fillRule="evenodd" />
          <path d={d} fill={`url(#${id}-g)`} fillRule="evenodd" style={{ mixBlendMode: "multiply" }} opacity=".8" />
          <path d={`M0 ${r * 2.1}H${w}M0 ${h - r * 2.1}H${w}`} stroke="#8a7b5c" strokeOpacity=".35" strokeWidth=".8" strokeDasharray="2 3" />
        </svg>
      ) : null}
    </div>
  );
}

/** Velvet: soft folds catching the light (overlaid on the wine). */
export const VELVET_FOLDS = tile(
  1100,
  1100,
  '<filter id="v" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".0032" numOctaves="3" seed="4" stitchTiles="stitch" result="n"/><feDiffuseLighting in="n" lighting-color="#fff" surfaceScale="9" result="l"><feDistantLight azimuth="250" elevation="38"/></feDiffuseLighting><feComponentTransfer><feFuncR type="linear" slope="1.1" intercept="-.38"/><feFuncG type="linear" slope="1.1" intercept="-.38"/><feFuncB type="linear" slope="1.1" intercept="-.38"/></feComponentTransfer></filter><rect width="100%" height="100%" filter="url(#v)"/>',
);

/** A torn (deckled) paper edge: a rectangle whose sides wobble finely. */
export function decklePath(w: number, h: number, seed = 1) {
  const rnd = (i: number) => {
    const x = Math.sin(i * 127.1 + seed * 311.7) * 43758.5453;
    return x - Math.floor(x);
  };
  const m = 3, step = 5;
  let d = "", k = 0;
  const jit = () => (rnd(k++) - 0.5) * 2.4 + (rnd(k++) - 0.5) * 1.2;
  for (let x = m; x <= w - m; x += step) d += `${d ? "L" : "M"}${x.toFixed(1)} ${(m + jit()).toFixed(1)}`;
  for (let y = m; y <= h - m; y += step) d += `L${(w - m + jit()).toFixed(1)} ${y.toFixed(1)}`;
  for (let x = w - m; x >= m; x -= step) d += `L${x.toFixed(1)} ${(h - m + jit()).toFixed(1)}`;
  for (let y = h - m; y >= m; y -= step) d += `L${(m + jit()).toFixed(1)} ${y.toFixed(1)}`;
  return `${d}Z`;
}

export type PaperTone = "ivory" | "blush" | "cream";
const TONE: Record<PaperTone, string> = { ivory: "var(--st-paper)", blush: "#ecd9d3", cream: "#f6efdf" };

/**
 * A sheet of paper sized to its content: lace-edged, deckle-edged or plain,
 * with grain, fibres, light falling across it and a two-layer shadow so it
 * sits on the velvet. `tilt` turns it a little, like a card on a table.
 */
export function Paper({
  children,
  edge = "lace",
  tone = "ivory",
  tilt = 0,
  className = "",
  style,
  scallop = 11,
  seed = 1,
}: {
  children: ReactNode;
  edge?: "lace" | "deckle" | "plain";
  tone?: PaperTone;
  tilt?: number;
  className?: string;
  style?: CSSProperties;
  scallop?: number;
  seed?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { w, h } = useSize(ref);
  const id = useId().replace(/:/g, "");
  const lace = w && h && edge === "lace" ? lacePath(w, h, scallop) : null;
  const d = !w || !h ? "" : lace ? lace.edge : edge === "deckle" ? decklePath(w, h, seed) : `M1 1H${w - 1}V${h - 1}H1Z`;
  const inset = edge === "lace" ? scallop * 1.75 : 14;
  return (
    <div ref={ref} className={`st-paper st-paper--${edge} ${className}`} style={{ ...style, ...(tilt ? { ["--tilt" as string]: `${tilt}deg` } : {}) }}>
      {d ? (
        <svg className="st-paper__sheet" width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden>
          <defs>
            <pattern id={`${id}-g`} width="280" height="280" patternUnits="userSpaceOnUse">
              <image href={PAPER_GRAIN} width="280" height="280" />
            </pattern>
            <pattern id={`${id}-f`} width="420" height="420" patternUnits="userSpaceOnUse" patternTransform={`rotate(${(seed * 37) % 180})`}>
              <image href={PAPER_FIBRES} width="420" height="420" />
            </pattern>
            <linearGradient id={`${id}-l`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#fff" stopOpacity=".55" />
              <stop offset=".45" stopColor="#fff" stopOpacity="0" />
              <stop offset="1" stopColor="#5a2a20" stopOpacity=".16" />
            </linearGradient>
          </defs>
          <path d={d} fill={TONE[tone]} fillRule="evenodd" />
          <path d={d} fill={`url(#${id}-g)`} fillRule="evenodd" style={{ mixBlendMode: "multiply" }} opacity=".85" />
          <path d={d} fill={`url(#${id}-f)`} fillRule="evenodd" opacity=".14" />
          <path d={d} fill={`url(#${id}-l)`} fillRule="evenodd" style={{ mixBlendMode: "soft-light" }} />
          {lace ? (
            <>
              <path d={lace.holes} fill="#6b4434" opacity=".13" />
              <rect x={inset} y={inset} width={Math.max(0, w - inset * 2)} height={Math.max(0, h - inset * 2)} fill="none" stroke={`url(#${id}-foil)`} strokeWidth=".9" />
              <FoilGradient id={`${id}-foil`} />
            </>
          ) : null}
        </svg>
      ) : null}
      <div className="st-paper__body">{children}</div>
    </div>
  );
}

/** The lace-edged ivory card (the invitation itself). */
export function LaceCard({ children, className = "", style, scallop = 11 }: { children: ReactNode; className?: string; style?: CSSProperties; scallop?: number }) {
  return (
    <Paper edge="lace" scallop={scallop} className={className} style={style}>
      {children}
    </Paper>
  );
}

/** Gold foil: a metallic sweep (use as a stroke or fill: url(#id)). */
export function FoilGradient({ id, box }: { id: string; box?: [number, number] }) {
  return (
    <linearGradient id={id} {...(box ? { gradientUnits: "userSpaceOnUse" as const, x1: 0, y1: 0, x2: box[0], y2: box[1] } : { x1: "0", y1: "0", x2: "1", y2: ".35" })}>
      <stop offset="0" stopColor="#7d5a1f" />
      <stop offset=".22" stopColor="#e3c47a" />
      <stop offset=".42" stopColor="#a47b2d" />
      <stop offset=".6" stopColor="#f1d892" />
      <stop offset=".8" stopColor="#8f6a26" />
      <stop offset="1" stopColor="#c9a456" />
    </linearGradient>
  );
}

// The envelope, drawn at its real pixel size (so blurs and shadows stay round):
// the back (seen through the opening), the front pocket (side flaps under the
// bottom flap, all meeting at the point where the seal sits), and the top flap.
// Burgundy paper lit from the top left; each layer casts a soft shadow on the
// one beneath, and paper edges catch a thin line of light.

export const TIP_Y = 0.555; // the point, as a share of the envelope's height

function useBox() {
  const ref = useRef<HTMLDivElement>(null);
  const size = useSize(ref);
  return { ref, ...size };
}

function GrainFill({ id, d, blend = "multiply", opacity = 0.6 }: { id: string; d: string; blend?: CSSProperties["mixBlendMode"]; opacity?: number }) {
  return (
    <>
      <defs>
        <pattern id={`${id}-grain`} width="280" height="280" patternUnits="userSpaceOnUse">
          <image href={PAPER_GRAIN} width="280" height="280" />
        </pattern>
      </defs>
      <path d={d} fill={`url(#${id}-grain)`} style={{ mixBlendMode: blend }} opacity={opacity} />
    </>
  );
}

const env = (k: number) => (k >= 0 ? `color-mix(in srgb, var(--st-env) ${100 - k}%, #fff)` : `color-mix(in srgb, var(--st-env) ${100 + k}%, #000)`);

/** The inside back of the envelope (seen through the opening), with its shadow on the velvet. */
export function EnvelopeBack() {
  const { ref, w, h } = useBox();
  const id = useId().replace(/:/g, "");
  return (
    <div ref={ref} className="st-envbox st-envbox--back" aria-hidden>
      {w && h ? (
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
          <defs>
            <linearGradient id={`${id}-in`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={env(-45)} />
              <stop offset=".6" stopColor={env(-30)} />
              <stop offset="1" stopColor={env(-20)} />
            </linearGradient>
          </defs>
          <rect width={w} height={h} rx="3" fill={`url(#${id}-in)`} />
          <GrainFill id={id} d={`M0 0H${w}V${h}H0Z`} />
        </svg>
      ) : null}
    </div>
  );
}

/** The front pocket: side flaps, the bottom flap over them, a V opening at the top. */
export function Pocket() {
  const { ref, w, h } = useBox();
  const id = useId().replace(/:/g, "");
  if (!w || !h) return <div ref={ref} className="st-envbox" aria-hidden />;
  const tx = w / 2, ty = h * TIP_Y;
  const left = `M0 0L${tx} ${ty}L0 ${h}Z`;
  const right = `M${w} 0L${tx} ${ty}L${w} ${h}Z`;
  const bottom = `M0 ${h}L${tx} ${ty}L${w} ${h}Z`;
  const all = `M0 0L${tx} ${ty}L${w} 0V${h}H0Z`;
  return (
    <div ref={ref} className="st-envbox st-envbox--front" aria-hidden>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
        <defs>
          <linearGradient id={`${id}-l`} x1="0" y1="0" x2="1" y2=".6">
            <stop offset="0" stopColor={env(9)} />
            <stop offset="1" stopColor={env(0)} />
          </linearGradient>
          <linearGradient id={`${id}-r`} x1="1" y1="0" x2="0" y2=".6">
            <stop offset="0" stopColor={env(-6)} />
            <stop offset="1" stopColor={env(-16)} />
          </linearGradient>
          <linearGradient id={`${id}-b`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={env(4)} />
            <stop offset="1" stopColor={env(-12)} />
          </linearGradient>
          <filter id={`${id}-soft`} x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="5" />
          </filter>
          <clipPath id={`${id}-sides`}>
            <path d={`${left}${right}`} />
          </clipPath>
        </defs>
        <path d={left} fill={`url(#${id}-l)`} />
        <path d={right} fill={`url(#${id}-r)`} />
        {/* the bottom flap's shadow on the side flaps */}
        <g clipPath={`url(#${id}-sides)`}>
          <path d={`M-20 ${h + 4}L${tx} ${ty - 6}L${w + 20} ${h + 4}`} fill="none" stroke="#12020a" strokeOpacity=".55" strokeWidth="14" filter={`url(#${id}-soft)`} />
        </g>
        <path d={bottom} fill={`url(#${id}-b)`} />
        {/* paper edges catching the light */}
        <path d={`M0 ${h}L${tx} ${ty}L${w} ${h}`} fill="none" stroke="#fff" strokeOpacity=".16" strokeWidth="1.2" transform="translate(0 1)" />
        <path d={`M0 0L${tx} ${ty}L${w} 0`} fill="none" stroke="#fff" strokeOpacity=".2" strokeWidth="1.1" />
        <path d={`M${w - 0.5} 0V${h}M0.5 0V${h}`} stroke="#000" strokeOpacity=".25" strokeWidth="1" />
        <GrainFill id={id} d={all} />
      </svg>
    </div>
  );
}

/** The top flap, folded down over the opening (it swings up to open), casting its shadow on the pocket. */
export function Flap() {
  const { ref, w, h } = useBox();
  const id = useId().replace(/:/g, "");
  if (!w || !h) return <div ref={ref} className="st-envbox" aria-hidden />;
  const tx = w / 2, ty = h * TIP_Y;
  const flap = `M0 0L${w} 0L${tx} ${ty}Z`;
  return (
    <div ref={ref} className="st-envbox st-envbox--flap" aria-hidden>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ overflow: "visible" }}>
        <defs>
          <linearGradient id={`${id}-f`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={env(12)} />
            <stop offset=".7" stopColor={env(2)} />
            <stop offset="1" stopColor={env(-4)} />
          </linearGradient>
          <radialGradient id={`${id}-sheen`} cx="35%" cy="15%" r="60%">
            <stop offset="0" stopColor="#fff" stopOpacity=".12" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
          <filter id={`${id}-soft`} x="-10%" y="-10%" width="120%" height="140%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
        </defs>
        {/* its shadow on the pocket below */}
        <path d={`M0 4L${tx} ${ty + 10}L${w} 4`} fill="none" stroke="#12020a" strokeOpacity=".6" strokeWidth="16" filter={`url(#${id}-soft)`} />
        <path d={flap} fill={`url(#${id}-f)`} />
        <path d={flap} fill={`url(#${id}-sheen)`} />
        <path d={`M0 0L${tx} ${ty}L${w} 0`} fill="none" stroke="#fff" strokeOpacity=".18" strokeWidth="1.1" transform="translate(0 -0.6)" />
        <path d={`M2 1H${w - 2}`} stroke="#fff" strokeOpacity=".22" strokeWidth="1" />
        <GrainFill id={id} d={flap} />
      </svg>
    </div>
  );
}

/**
 * A gold wax seal: an uneven, melted rim, a domed and slightly lumpy surface
 * with a glossy highlight (specular lighting on blurred alpha + noise), and the
 * mark pressed into the middle (default "18").
 */
export function WaxSeal({
  text = "18",
  className = "",
  tone = "gold",
  shape = "round",
  sprig = false,
}: {
  text?: string;
  className?: string;
  /** gold wax, or ivory/cream wax */
  tone?: "gold" | "ivory";
  /** a round seal, or a tall oval one */
  shape?: "round" | "oval";
  /** a small embossed leaf sprig above the mark */
  sprig?: boolean;
}) {
  const T = tone === "ivory"
    ? { a: "#fffaf0", b: "#eee3cf", c: "#c9b796", inner: "#efe5d2", rim: "#bfae8c", ring: "#c9b791", text: "#c4b08a", hi: "#ffffff", lo: "#5e4c30", shadow: "#1d2410" }
    : { a: "#ecd08a", b: "#c0943f", c: "#7c561c", inner: "#b48a3c", rim: "#7a5420", ring: "#9a7230", text: "#a17733", hi: "#fff1c2", lo: "#4a3210", shadow: "#1a0408" };
  const ox = shape === "oval" ? 0.8 : 1;
  const oy = shape === "oval" ? 1.04 : 1;
  const id = useId().replace(/:/g, "");
  const pts: string[] = [];
  for (let i = 0; i <= 120; i++) {
    const t = (i / 120) * Math.PI * 2;
    const r = 46 * (1 + 0.055 * Math.sin(5 * t + 1) + 0.035 * Math.sin(9 * t + 2.3) + 0.022 * Math.sin(14 * t + 0.4) + 0.012 * Math.sin(23 * t));
    pts.push(`${(60 + r * ox * Math.cos(t)).toFixed(2)} ${(60 + r * oy * Math.sin(t)).toFixed(2)}`);
  }
  const small = text.length > 2;
  const fs = text.length > 3 ? 15 : small ? 19 : 30;
  const ty = (sprig ? 8 : 0) + (small ? 66.5 : 70.5) - (text.length > 3 ? 2 : 0);
  const irx = 33 * ox, iry = 33 * oy;
  return (
    <svg className={`st-seal ${className}`} viewBox={shape === "oval" ? "10 0 100 120" : "0 0 120 120"} aria-hidden>
      <defs>
        <radialGradient id={`${id}-g`} cx="40%" cy="34%" r="78%">
          <stop offset="0" stopColor={T.a} />
          <stop offset=".5" stopColor={T.b} />
          <stop offset="1" stopColor={T.c} />
        </radialGradient>
        <filter id={`${id}-wax`} x="-25%" y="-25%" width="150%" height="150%">
          <feTurbulence type="fractalNoise" baseFrequency=".045" numOctaves="2" seed="5" result="lumps" />
          <feGaussianBlur in="SourceAlpha" stdDeviation="5" result="dome" />
          <feComposite in="dome" in2="lumps" operator="arithmetic" k2="1" k3=".35" result="bump" />
          <feSpecularLighting in="bump" surfaceScale="5" specularConstant=".85" specularExponent="18" lightingColor={tone === "ivory" ? "#ffffff" : "#fff6d6"} result="spec">
            <fePointLight x="28" y="16" z="70" />
          </feSpecularLighting>
          <feComposite in="spec" in2="SourceAlpha" operator="in" result="gloss" />
          <feDiffuseLighting in="bump" surfaceScale="4" diffuseConstant="1" lightingColor="#fff" result="shade">
            <feDistantLight azimuth="225" elevation="50" />
          </feDiffuseLighting>
          <feComposite in="SourceGraphic" in2="shade" operator="arithmetic" k1="1.05" result="lit" />
          <feComposite in="gloss" in2="lit" operator="arithmetic" k2=".75" k3="1" result="out" />
          <feComposite in="out" in2="SourceAlpha" operator="in" />
        </filter>
        <filter id={`${id}-press`} x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="1" result="b" />
          <feOffset in="b" dx="-1" dy="-1.2" result="hi" />
          <feOffset in="b" dx="1" dy="1.2" result="lo" />
          <feFlood floodColor={T.hi} floodOpacity=".8" />
          <feComposite in2="lo" operator="in" result="hiC" />
          <feFlood floodColor={T.lo} floodOpacity={tone === "ivory" ? 0.75 : 0.9} />
          <feComposite in2="hi" operator="in" result="loC" />
          <feMerge>
            <feMergeNode in="loC" />
            <feMergeNode in="hiC" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id={`${id}-sh`} x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="2" stdDeviation="1.2" floodColor={T.shadow} floodOpacity=".55" />
          <feDropShadow dx="0" dy="6" stdDeviation="5" floodColor={T.shadow} floodOpacity=".35" />
        </filter>
      </defs>
      <g filter={`url(#${id}-sh)`}>
        <g filter={`url(#${id}-wax)`}>
          <path d={`M${pts.join("L")}Z`} fill={`url(#${id}-g)`} />
          <ellipse cx="60" cy="60" rx={irx} ry={iry} fill={T.inner} />
          <ellipse cx="60" cy="60" rx={irx} ry={iry} fill="none" stroke={T.rim} strokeWidth="2" />
        </g>
      </g>
      <g filter={`url(#${id}-press)`}>
        <ellipse cx="60" cy="60" rx={irx - 4.5} ry={iry - 4.5} fill="none" stroke={T.ring} strokeWidth="1" />
        {sprig ? (
          <g fill="none" stroke={T.text} strokeWidth="1.6" strokeLinecap="round">
            <path d="M60 58 C60 50 60 44 60 38" />
            <path d="M60 44 C55 43 52 40 52 36 C56 36 59 39 60 44 Z M60 49 C65 48 68 45 68 41 C64 41 61 44 60 49 Z M60 39 C58 35 58 32 60 29 C62 32 62 35 60 39 Z" fill={T.text} fillOpacity=".55" />
          </g>
        ) : null}
        <text x="60" y={ty} textAnchor="middle" fontFamily="Cinzel, Georgia, serif" fontWeight="600" fontSize={fs} fill={T.text} letterSpacing={text.length > 3 ? 1 : 0}>
          {text}
        </text>
      </g>
    </svg>
  );
}

/** A centred flourish in gold foil: fine lines either side of a little scroll. */
export function Flourish({ className = "", lines = false }: { className?: string; lines?: boolean }) {
  const id = useId().replace(/:/g, "");
  const ink = `url(#${id}-f)`;
  if (!lines)
    return (
      <svg className={`st-flourish st-flourish--mark ${className}`} viewBox="146 0 68 24" aria-hidden>
        <defs>
          <FoilGradient id={`${id}-f`} box={[360, 60]} />
        </defs>
        <path d="M150 12 C160 2 170 2 172 10 C174 16 166 18 164 13 M210 12 C200 2 190 2 188 10 C186 16 194 18 196 13 M172 10 C175 4 185 4 188 10 M180 6 L180 18 M176 12 H184" fill="none" stroke={ink} strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    );
  return (
    <svg className={`st-flourish ${className}`} viewBox="0 0 360 24" aria-hidden>
      <defs>
        <FoilGradient id={`${id}-f`} box={[360, 60]} />
      </defs>
      <path d="M8 12 H150" stroke={ink} strokeWidth="1.2" />
      <path d="M210 12 H352" stroke={ink} strokeWidth="1.2" />
      <path d="M150 12 C160 2 170 2 172 10 C174 16 166 18 164 13 M210 12 C200 2 190 2 188 10 C186 16 194 18 196 13 M172 10 C175 4 185 4 188 10 M180 6 L180 18 M176 12 H184" fill="none" stroke={ink} strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="4" cy="12" r="2" fill={ink} />
      <circle cx="356" cy="12" r="2" fill={ink} />
    </svg>
  );
}

/** An eight-petal rosette, used as a bullet. */
export function Rosette({ size = 16 }: { size?: number }) {
  const rid = useId().replace(/:/g, "");
  return (
    <svg className="st-rosette" width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <defs>
        <FoilGradient id={`${rid}-f`} />
      </defs>
      {Array.from({ length: 8 }, (_, i) => (
        <ellipse key={i} cx="12" cy="6.2" rx="2.6" ry="4.6" fill={`url(#${rid}-f)`} transform={`rotate(${i * 45} 12 12)`} />
      ))}
      <circle cx="12" cy="12" r="2.6" fill="var(--st-paper)" />
      <circle cx="12" cy="12" r="1.4" fill={`url(#${rid}-f)`} />
    </svg>
  );
}


/** Base styles for the shared stationery pieces (each template adds its own on top). */
export const STATIONERY_CSS = `
/* Paper: a sheet with grain, light and a contact + ambient shadow, turned a little */
.st-paper{position:relative;transform:rotate(var(--tilt,0deg));}
.st-paper__sheet{position:absolute;inset:0;overflow:visible;filter:drop-shadow(0 1px 1px rgba(25,0,8,.55)) drop-shadow(0 10px 14px rgba(20,0,6,.3)) drop-shadow(0 26px 40px rgba(20,0,6,.25));}
.st-paper__body{position:relative;padding:clamp(40px,7cqw,58px) clamp(26px,6cqw,52px);text-align:center;}
/* Ink pressed into the paper: multiplied over the grain, with a faint letterpress lip */
.st-paper__body :is(p,h1,h2,li,label,em,.st-ink){mix-blend-mode:multiply;}
.st-paper__body :is(p,h1,h2,li){text-shadow:0 1px 0 rgba(255,255,255,.45);}
.st-flourish{display:block;width:min(70%,300px);height:auto;margin:clamp(8px,1.6cqw,14px) auto;color:var(--st-ink);}
.st-flourish--mark{width:clamp(54px,12cqw,74px)!important;}
.st-rosette{flex:none;color:var(--st-ink);}
.st-seal{display:block;width:100%;height:auto;overflow:visible;}
.st-ribbon{position:relative;width:100%;filter:drop-shadow(0 1px 1px rgba(20,24,10,.45)) drop-shadow(0 6px 10px rgba(20,24,10,.3));}
.st-ribbon svg{display:block;}
.st-envbox{position:absolute;inset:0;}
.st-envbox svg{display:block;overflow:visible;}
/* the pocket's edge shades the card tucked inside it */
.st-envbox--front{filter:drop-shadow(0 -1.5px 1.5px rgba(30,0,10,.35)) drop-shadow(0 -7px 12px rgba(30,0,10,.28));}
/* the envelope on the velvet */
.st-envbox--back{filter:drop-shadow(0 2px 2px rgba(10,0,4,.5)) drop-shadow(0 22px 32px rgba(10,0,4,.45));}
`;
