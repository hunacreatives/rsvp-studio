import { supabase } from "../../../lib/supabase";
import { createId } from "./id";
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
export async function uploadEventImage(file: File, eventId: string): Promise<ImageAsset> {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    throw new UploadEventImageError("Please choose a PNG, JPEG, WebP, or GIF image.");
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
