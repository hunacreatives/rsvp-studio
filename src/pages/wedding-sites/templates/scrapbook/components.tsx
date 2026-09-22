import type { CSSProperties, ReactNode } from "react";
import type { ImageAsset } from "../../content/types";

// Scrapbook-specific presentational primitives. These belong to this
// template only (see docs/template-builder-decisions.md: templates own
// their visuals) — they are not generic components other templates reuse.

export type Tone = "red" | "paper";

const FLOWER_SRC = {
  red: "/event-templates/scrapbook/flower-red.webp",
  yellow: "/event-templates/scrapbook/flower-yellow.webp",
  cream: "/event-templates/scrapbook/flower-cream.webp",
  pressed: "/event-templates/scrapbook/flower-pressed-yellow.webp",
  "sprig-pink": "/event-templates/scrapbook/flower-sprig-pink.webp",
  "sprig-yellow": "/event-templates/scrapbook/flower-sprig-yellow.webp",
  "sprig-green": "/event-templates/scrapbook/flower-sprig-green.webp",
} as const;

export type FlowerVariant = keyof typeof FLOWER_SRC;

/** Real pressed-flower cutouts extracted from the reference design by
 *  scripts/design-import — purely decorative, never announced. */
export function Flower({ variant, width, style, className }: { variant: FlowerVariant; width: string | number; style?: CSSProperties; className?: string }) {
  return (
    <img
      src={FLOWER_SRC[variant]}
      alt=""
      aria-hidden
      className={`sb-decor${className ? ` ${className}` : ""}`}
      style={{ width, height: "auto", ...style }}
    />
  );
}

export function Stamp({ width = 46, style }: { width?: number | string; style?: CSSProperties }) {
  return (
    <img
      src="/event-templates/scrapbook/stamp-butterfly.webp"
      alt=""
      aria-hidden
      className="sb-decor"
      style={{ width, height: "auto", ...style }}
    />
  );
}

/** Small calligraphic swash used between lines on the burgundy cards. */
export function Flourish({ width = 76, color = "currentColor" }: { width?: number; color?: string }) {
  return (
    <svg className="sb-flourish" width={width} height={10} viewBox="0 0 76 10" fill="none" aria-hidden>
      <path d="M2 6c6-5 12 4 18 0s12-5 18 0 12 4 18 0 12-5 18 0" stroke={color} strokeWidth="0.9" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Deterministic geometry per placement. The reference's photos are not
 * one component scaled around the page — each sits at its own size,
 * crop and angle — so placements declare a preset instead of every call
 * site re-specifying (and accidentally matching) the same numbers.
 * Never randomised: a random tilt would also change on every re-render.
 */
export const POLAROID_PRESETS = {
  hero: { aspect: "7/5", rotate: -2.2, withTape: false, variant: "polaroid" },
  venue: { aspect: "5/4", rotate: -3.5, withTape: false, variant: "polaroid" },
  venueSmall: { aspect: "4/5", rotate: 2.6, withTape: false, variant: "print" },
  storyLeft: { aspect: "4/5", rotate: -5, withTape: true, variant: "polaroid" },
  storyRight: { aspect: "5/6", rotate: 3.4, withTape: true, variant: "print" },
  travel: { aspect: "5/4", rotate: -3, withTape: true, variant: "polaroid" },
  final: { aspect: "16/9", rotate: 1.8, withTape: false, variant: "print" },
  person: { aspect: "4/5", rotate: 0, withTape: false, variant: "polaroid" },
} as const;

export type PolaroidPreset = keyof typeof POLAROID_PRESETS;

interface PolaroidProps {
  image: ImageAsset;
  /** Preferred: declares this placement's geometry. */
  preset?: PolaroidPreset;
  /** Deterministic overrides — never randomised per render. */
  rotate?: number;
  tapeRotate?: number;
  withTape?: boolean;
  variant?: "polaroid" | "print";
  /** CSS aspect-ratio for the photo window, e.g. "4/5" or "5/4". */
  aspect?: string;
  caption?: string;
  style?: CSSProperties;
  className?: string;
}

export function Polaroid({
  image,
  preset,
  rotate,
  tapeRotate = -3,
  withTape,
  variant,
  aspect,
  caption,
  style,
  className,
}: PolaroidProps) {
  const base = preset ? POLAROID_PRESETS[preset] : undefined;
  const rot = rotate ?? base?.rotate ?? 0;
  const tape = withTape ?? base?.withTape ?? false;
  const kind = variant ?? base?.variant ?? "polaroid";
  const ar = aspect ?? base?.aspect ?? "4/5";
  return (
    <figure
      className={`sb-pol${kind === "print" ? " sb-pol--print" : ""}${className ? ` ${className}` : ""}`}
      style={{ ["--rot" as string]: `${rot}deg`, ["--tape-rot" as string]: `${tapeRotate}deg`, ...style }}
    >
      {tape ? <img src="/event-templates/scrapbook/tape-strip.webp" alt="" aria-hidden className="sb-pol__tape" /> : null}
      <div className="sb-pol__frame">
        <div className="sb-pol__win" style={{ ["--ar" as string]: ar }}>
          <img
            src={image.masterUrl}
            alt={image.alt}
            style={{ objectPosition: `${image.focalPoint.x * 100}% ${image.focalPoint.y * 100}%` }}
          />
        </div>
        {caption ? <figcaption className="sb-pol__cap">{caption}</figcaption> : null}
      </div>
    </figure>
  );
}

/**
 * Editor-only affordance. Rendered ONLY when the template receives
 * `editorPreview`, so it can never appear on a published site — it
 * exists so a half-filled draft still shows the page's real structure
 * instead of collapsing every empty section away.
 */
export function EditorHint({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <span className="sb-hint" style={style}>
      {children}
    </span>
  );
}

/** Empty Polaroid frame shown in the builder where a gallery photo will
 *  go, so the collage keeps its composition before photos are uploaded. */
export function PolaroidSlot({
  preset,
  rotate,
  aspect,
  withTape,
  label = "Add a photo",
  variant,
}: {
  preset?: PolaroidPreset;
  rotate?: number;
  aspect?: string;
  withTape?: boolean;
  label?: string;
  variant?: "polaroid" | "print";
}) {
  const base = preset ? POLAROID_PRESETS[preset] : undefined;
  const rot = rotate ?? base?.rotate ?? 0;
  const tape = withTape ?? base?.withTape ?? false;
  const kind = variant ?? base?.variant ?? "polaroid";
  const ar = aspect ?? base?.aspect ?? "4/5";
  return (
    <figure
      className={`sb-pol sb-pol--slot${kind === "print" ? " sb-pol--print" : ""}`}
      style={{ ["--rot" as string]: `${rot}deg` }}
    >
      {tape ? <img src="/event-templates/scrapbook/tape-strip.webp" alt="" aria-hidden className="sb-pol__tape" /> : null}
      <div className="sb-pol__frame">
        <div className="sb-pol__win sb-pol__win--empty" style={{ ["--ar" as string]: ar }}>
          <span>{label}</span>
        </div>
      </div>
    </figure>
  );
}

export function StationeryCard({
  children,
  rotate = 0,
  paper = false,
  style,
  className,
}: {
  children: ReactNode;
  rotate?: number;
  paper?: boolean;
  style?: CSSProperties;
  className?: string;
}) {
  return (
    <div
      className={`sb-card${paper ? " sb-card--paper" : ""}${className ? ` ${className}` : ""}`}
      style={{ ["--rot" as string]: `${rotate}deg`, ...style }}
    >
      {children}
    </div>
  );
}

/**
 * The open envelope, extracted from the reference design rather than
 * approximated in CSS. Both source instances are partly occluded (a
 * stationery card cuts the right flap slope in one, a dried-flower stem
 * crosses the apex in the other), so this asset is a reconstruction:
 * the fully-visible LEFT half (flap slope + lace trim) was isolated
 * with a hand-traced silhouette mask (its body colour sits almost
 * exactly on the page's own beige, so a color-distance key could not
 * separate them — see docs/template-builder-decisions.md) and then
 * mirrored onto the right half, since the flap is bilaterally
 * symmetric by construction. Real paper texture, fold-line shading and
 * the scalloped lace edge are preserved from the source photograph;
 * nothing here is redrawn.
 */
export function Envelope({ style, className }: { style?: CSSProperties; className?: string }) {
  return (
    <img
      src="/event-templates/scrapbook/envelope.webp"
      alt=""
      aria-hidden
      className={`sb-decor${className ? ` ${className}` : ""}`}
      style={{ width: "100%", height: "auto", aspectRatio: "229/345", filter: "drop-shadow(0 10px 20px rgba(0,0,0,.16))", ...style }}
    />
  );
}

/** One full-width paper section, with the subtle noise + linen texture
 *  layers that keep the flat colours from looking digital. */
export function Section({
  tone,
  id,
  children,
  style,
}: {
  tone: Tone;
  id?: string;
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <section id={id} className={`sb-sec sb-sec--${tone === "red" ? "red" : "paper"}`} style={style}>
      <div className="sb-tex" aria-hidden />
      <div className="sb-weave" aria-hidden />
      <div className="sb-wrap">{children}</div>
    </section>
  );
}

/** Absolutely-positioned collage child on desktop, plain stacked block
 *  on narrow widths (see .sb-collage in styles.ts). */
export function CollageItem({
  x,
  y,
  w,
  z,
  decor = false,
  filler = false,
  children,
  style,
}: {
  x: string;
  y: string;
  w: string;
  z?: number;
  /** Decoration rather than content: stays a small accent when the
   *  collage un-stacks into a single column. */
  decor?: boolean;
  /** Exists only to hold the desktop composition together (the
   *  envelope, the stamp). Dropped entirely in the stacked view, where
   *  it would otherwise occupy a whole screen saying nothing. */
  filler?: boolean;
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div
      className={`sb-collage__item${decor ? " sb-collage__item--decor" : ""}${filler ? " sb-collage__item--filler" : ""}`}
      style={{ ["--x" as string]: x, ["--y" as string]: y, ["--w" as string]: w, zIndex: z, ...style }}
    >
      {children}
    </div>
  );
}
