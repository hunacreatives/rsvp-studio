import { supabase } from "../../../lib/supabase";
import { createId } from "./id";
import { compressImage } from "../../../lib/compressImage";
import type { ImageAsset } from "./types";

const BUCKET = "event-site-images";
const MAX_MB = 10;
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
 * Event photos go straight to Cloudflare R2 (free for guests to view): the API
 * checks who's uploading and hands back a 5-minute signed address
 * (api/_lib/media-handlers.ts). Until R2 is set up the API says so (503) and the
 * photo goes to the `event-site-images` Supabase bucket as before.
 * Returns a real ImageAsset — the caller just merges it into content.
 */
async function uploadToR2(file: File, eventId: string): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  const res = await fetch("/api/media-upload", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token ?? ""}` },
    body: JSON.stringify({ eventId, contentType: file.type, size: file.size }),
  }).catch(() => null);
  // Not set up yet (503), or no API here (local dev without it): use Supabase.
  if (!res || res.status === 503 || !(res.headers.get("content-type") ?? "").includes("json")) return null;
  const out = (await res.json().catch(() => ({}))) as { uploadUrl?: string; headers?: Record<string, string>; publicUrl?: string; error?: string };
  if (!res.ok || !out.uploadUrl || !out.publicUrl) throw new UploadEventImageError(out.error ?? "Couldn’t upload that photo — please try again.");
  const put = await fetch(out.uploadUrl, { method: "PUT", headers: out.headers, body: file }).catch(() => null);
  if (!put?.ok) throw new UploadEventImageError("Upload didn’t finish — check your connection and try again.");
  return out.publicUrl;
}

export async function uploadEventImage(original: File, eventId: string): Promise<ImageAsset> {
  // The picker accepts image/* (so phones open their photo library); the real
  // type check happens here, after phone photos are shrunk to ≤2400px JPEGs.
  const isHeic = /\.(heic|heif)$/i.test(original.name) || /image\/hei[cf]/.test(original.type);
  if (!original.type.startsWith("image/") && !isHeic) {
    throw new UploadEventImageError("Please choose a PNG, JPEG, WebP, or GIF image.");
  }
  // Always re-encoded (even small photos), which also strips the phone's GPS location.
  const file = await compressImage(original, { maxEdge: 2400, quality: 0.85, stripLocation: true });
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
  let masterUrl = await uploadToR2(file, eventId);
  if (!masterUrl) {
    const extension = { "image/png": "png", "image/webp": "webp", "image/gif": "gif" }[file.type] ?? "jpg";
    const path = `${eventId}/${id}.${extension}`;
    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: false });
    if (uploadError) throw new UploadEventImageError(uploadError.message);
    masterUrl = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  }

  return {
    id,
    masterUrl,
    width,
    height,
    alt: "",
    focalPoint: { x: 0.5, y: 0.5 },
    createdAt: new Date().toISOString(),
  };
}
