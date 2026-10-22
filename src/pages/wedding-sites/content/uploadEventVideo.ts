import { supabase } from "../../../lib/supabase";

// An animated Save the Date's video (Studio only): straight to R2 like event photos
// (api/_lib/media-handlers.ts allows mp4 for staff, up to 50 MB). No Supabase fallback —
// videos only live on R2.
export async function uploadEventVideo(file: File, eventId: string): Promise<string> {
  if (file.type !== "video/mp4") throw new Error("Please choose an MP4 video.");
  if (file.size > 50 * 1024 * 1024) throw new Error("That video is over 50 MB — please export a smaller one.");
  const { data } = await supabase.auth.getSession();
  const res = await fetch("/api/media-upload", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token ?? ""}` },
    body: JSON.stringify({ eventId, contentType: file.type, size: file.size }),
  }).catch(() => null);
  if (!res || !(res.headers.get("content-type") ?? "").includes("json")) throw new Error("Video uploads only work on the live site (thersvpstudio.com).");
  const out = (await res.json().catch(() => ({}))) as { uploadUrl?: string; headers?: Record<string, string>; publicUrl?: string; error?: string; fallback?: boolean };
  if (out.fallback) throw new Error("Video uploads need R2 storage, which isn’t set up here.");
  if (!res.ok || !out.uploadUrl || !out.publicUrl) throw new Error(out.error ?? "Couldn’t upload that video — please try again.");
  const put = await fetch(out.uploadUrl, { method: "PUT", headers: out.headers, body: file }).catch(() => null);
  if (!put?.ok) throw new Error("Upload didn’t finish — check your connection and try again.");
  return out.publicUrl;
}
