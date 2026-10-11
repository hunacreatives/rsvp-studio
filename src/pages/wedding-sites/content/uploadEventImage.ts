import { supabase } from "../../../lib/supabase";
import { createId } from "./id";
import { compressImage } from "../../../lib/compressImage";
import type { ImageAsset } from "./types";

const BUCKET = "event-site-images";
const MAX_MB = 15;
const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

export class UploadEventImageError extends Error {}

function readNaturalSize(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new UploadEventImageError("Could not read image dimensions."));
    };
    img.src = url;
  });
}

/**
 * Uploads a photo to the public `event-site-images` bucket (see
 * supabase/event-site-images-storage.sql), scoped under the event's own
 * id so storage RLS can check upload ownership from the path alone.
 * Returns a real ImageAsset — the caller just merges it into content.
 */
export async function uploadEventImage(original: File, eventId: string): Promise<ImageAsset> {
  // The picker accepts image/* (so phones open their photo library); the real
  // type check happens here, after phone photos are shrunk to ≤2400px JPEGs.
  const isHeic = /\.(heic|heif)$/i.test(original.name) || /image\/hei[cf]/.test(original.type);
  if (!original.type.startsWith("image/") && !isHeic) {
    throw new UploadEventImageError("Please choose a PNG, JPEG, WebP, or GIF image.");
  }
  const file = await compressImage(original, { maxEdge: 2400, quality: 0.85 });
  if (!ACCEPTED_TYPES.includes(file.type)) {
    throw new UploadEventImageError(
      isHeic
        ? "This browser can’t open HEIC photos. Choose the photo from your Photos app, or save it as a JPEG first."
        : "Please choose a PNG, JPEG, WebP, or GIF image.",
    );
  }
  if (file.size > MAX_MB * 1024 * 1024) {
    throw new UploadEventImageError(`That photo is over ${MAX_MB} MB — please choose a smaller file.`);
  }

  const { width, height } = await readNaturalSize(file);

  const id = createId("image");
  const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${eventId}/${id}.${extension}`;

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });
  if (uploadError) {
    throw new UploadEventImageError(uploadError.message);
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);

  return {
    id,
    masterUrl: data.publicUrl,
    width,
    height,
    alt: "",
    focalPoint: { x: 0.5, y: 0.5 },
    createdAt: new Date().toISOString(),
  };
}
