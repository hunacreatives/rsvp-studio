// Shrink a phone photo in the browser before uploading: camera shots are 3–15 MB,
// which is slow on mobile data and too big for some endpoints. Images over `maxEdge`
// pixels on their long side are scaled down and re-encoded as JPEG (or WebP; big PNGs
// always become WebP so a transparent background stays transparent).
// Non-images, GIFs (animation) and files already small enough pass through unchanged.

export async function compressImage(
  file: File,
  {
    maxEdge = 2000,
    quality = 0.85,
    type = "image/jpeg",
    skipUnderBytes = 600_000,
    stripLocation = false,
  }: {
    maxEdge?: number;
    quality?: number;
    type?: "image/jpeg" | "image/webp";
    skipUnderBytes?: number;
    /** Always re-encode camera photos (JPEG/HEIC/WebP), even small ones, and keep the
     *  re-encoded copy — that drops EXIF, including where the photo was taken. PNGs
     *  (transparency) and GIFs (animation) are left as they are. */
    stripLocation?: boolean;
  } = {},
): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif" || file.type === "image/svg+xml") return file;
  const camera = stripLocation && file.type !== "image/png";
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return file; // a format the browser can't decode (e.g. HEIC on some browsers): upload as-is
  }
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && file.size <= skipUnderBytes && !camera) {
    bitmap.close();
    return file;
  }
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return file;
  }
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  // A PNG may have a transparent background (a monogram, a logo): JPEG would turn it
  // black, so shrunk PNGs become WebP, which keeps transparency.
  const outType = file.type === "image/png" ? "image/webp" : type;
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, outType, quality));
  if (!blob || (blob.size >= file.size && !camera)) return file;
  // Browsers that can't make WebP hand back a PNG: keep that type and name.
  const madeType = blob.type || outType;
  const ext = madeType === "image/webp" ? "webp" : madeType === "image/png" ? "png" : "jpg";
  return new File([blob], file.name.replace(/\.[^.]+$/, "") + "." + ext, { type: madeType, lastModified: Date.now() });
}
