import type { CSSProperties } from "react";
import type { ImageAsset } from "../../content/types";
import { photoFit } from "./photoFit";

// A photo frame for the free designs: the photo, an "Add a photo" placeholder in the
// builder, or nothing on the published site.
export function PhotoSlot({
  image,
  editorPreview,
  className = "",
  style,
  label = "Add a photo",
  eager = false,
}: {
  image?: ImageAsset | null;
  editorPreview?: boolean;
  className?: string;
  style?: CSSProperties;
  label?: string;
  eager?: boolean;
}) {
  if (image?.masterUrl) {
    return (
      <div className={className} style={style}>
        <img
          src={image.masterUrl}
          alt={image.alt || ""}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          style={{ width: "100%", height: "100%", objectFit: "cover", ...photoFit(image, 0.5, 0.5), display: "block" }}
        />
      </div>
    );
  }
  if (!editorPreview) return null;
  return (
    // data-add-photo: the builder opens the photo picker on a click here, and takes photos dropped on it.
    <div className={`${className} photo-slot--empty`} style={{ cursor: "pointer", ...style }} data-add-photo role="button" aria-label={label}>
      <span className="photo-slot__label">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <circle cx="12" cy="12" r="3.2" />
          <path d="M8 5l1.5-2h5L16 5" />
        </svg>
        {label}
        {label.length > 4 ? <small style={{ fontSize: "0.85em", fontWeight: 500, letterSpacing: 0, opacity: 0.75 }}>Click, or drop one here</small> : null}
      </span>
    </div>
  );
}

/**
 * The builder keeps empty frames on the page so there's always somewhere to add the next photo:
 * the photos, then empty frames up to `min`, and always one spare. The published site shows
 * just the photos.
 */
export function withAddSlots<T>(items: T[], editorPreview: boolean | undefined, min: number): (T | null)[] {
  if (!editorPreview) return items;
  return [...items, ...Array<null>(Math.max(min - items.length, 1)).fill(null)];
}
