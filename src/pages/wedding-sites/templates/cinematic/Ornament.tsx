// Cinematic-only decorative pieces — real cutout stickers from the
// reference site's own public/ assets (party-hat.png, heart-sticker.png),
// not redrawn. Purely decorative, never announced.

export function PartyHatSticker({ className }: { className?: string }) {
  return (
    <img
      src="/event-templates/cinematic/party-hat.webp"
      alt=""
      aria-hidden
      className={`cn-sticker cn-sticker--hat${className ? ` ${className}` : ""}`}
    />
  );
}

export function HeartSticker({ className }: { className?: string }) {
  return (
    <img
      src="/event-templates/cinematic/heart-sticker.webp"
      alt=""
      aria-hidden
      className={`cn-sticker cn-sticker--heart${className ? ` ${className}` : ""}`}
    />
  );
}

/**
 * Editor-only affordance. Rendered ONLY when the template receives
 * `editorPreview`, so it can never appear on a published site — it
 * exists so a half-filled draft still shows the page's real structure
 * instead of collapsing every empty section away.
 */
export function EditorHint({ children }: { children: string }) {
  return <span className="cn-hint">{children}</span>;
}

/** Empty photo frame shown in the builder where a gallery photo will go,
 *  so the hero keeps its two-photo composition before photos are added. */
export function PhotoSlot({ className }: { className?: string }) {
  return (
    <div className={`cn-photo__win--empty${className ? ` ${className}` : ""}`}>
      <span>Add a photo</span>
    </div>
  );
}

/** Small hand-drawn heart outline for the floating doodles + divider —
 *  simple enough to be a genuine local redraw rather than needing an
 *  asset (see docs/template-builder-decisions.md on when that's fine). */
export function HeartDoodle({ size = 16, color = "currentColor", filled = false }: { size?: number; color?: string; filled?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? color : "none"} stroke={color} strokeWidth={filled ? 0 : 1.3}>
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}
