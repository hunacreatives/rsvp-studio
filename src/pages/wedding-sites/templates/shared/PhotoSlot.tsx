import type { CSSProperties } from "react";
import type { ImageAsset } from "../../content/types";

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
          style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: `${(image.focalPoint?.x ?? 0.5) * 100}% ${(image.focalPoint?.y ?? 0.5) * 100}%`, display: "block" }}
        />
      </div>
    );
  }
  if (!editorPreview) return null;
  return (
    <div className={`${className} photo-slot--empty`} style={style}>
      <span className="photo-slot__label">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <circle cx="12" cy="12" r="3.2" />
          <path d="M8 5l1.5-2h5L16 5" />
        </svg>
        {label}
      </span>
    </div>
  );
}
