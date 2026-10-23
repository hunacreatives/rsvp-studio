import type { CSSProperties } from "react";
import type { ImageAsset } from "../../content/types";

/**
 * How a photo sits in its frame: cropped around its focal point and, if the host zoomed in
 * (ImageAsset.zoom, set in the builder's Reposition frame), enlarged around that same point.
 * The frame must clip (overflow: hidden), as every photo frame here does.
 */
export function photoFit(image: Pick<ImageAsset, "focalPoint" | "zoom"> | null | undefined, x = 0.5, y = 0.5): CSSProperties {
  const fx = (image?.focalPoint?.x ?? x) * 100;
  const fy = (image?.focalPoint?.y ?? y) * 100;
  const z = Math.min(3, Math.max(1, image?.zoom ?? 1));
  return z > 1.001
    ? // The separate `scale` property, so it adds to any transform a design already gives its photos.
      { objectPosition: `${fx}% ${fy}%`, scale: String(z), transformOrigin: `${fx}% ${fy}%` }
    : { objectPosition: `${fx}% ${fy}%` };
}
