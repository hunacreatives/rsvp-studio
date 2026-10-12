import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { presign, r2PublicUrl, r2Ready } from "./r2.js";

// POST /api/media-upload (→ pay-checkout?op=upload-url, vercel.json): a 5-minute
// presigned URL for the browser to PUT one event photo straight to R2.
//   body: { eventId, contentType, size }
//   → { uploadUrl, headers, publicUrl }  ·  503 { fallback: true } when R2 isn't set up
// (the builder then uploads to Supabase Storage as before).
// The server picks the key; the type, exact size and cache header are signed, so the
// browser can't upload anything else. Who may upload and how much: supabase/media-r2.sql.

const db = createClient(process.env.VITE_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };
const MAX_BYTES = 10 * 1024 * 1024;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function uploadUrlHandler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!r2Ready()) return res.status(503).json({ fallback: true });

  const token = String(req.headers.authorization ?? "").replace(/^Bearer\s+/i, "");
  const { data: auth } = token ? await db.auth.getUser(token) : { data: { user: null } };
  if (!auth?.user) return res.status(401).json({ error: "Please log in again." });

  const body = (req.body ?? {}) as { eventId?: string; contentType?: string; size?: number };
  const eventId = String(body.eventId ?? "");
  const contentType = String(body.contentType ?? "");
  const size = Number(body.size);
  if (!UUID.test(eventId)) return res.status(404).json({ error: "We couldn’t find that event." });
  if (!TYPES[contentType]) return res.status(400).json({ error: "Please choose a PNG, JPEG, WebP or GIF image." });
  if (!Number.isInteger(size) || size <= 0) return res.status(400).json({ error: "That file looks empty." });
  if (size > MAX_BYTES) return res.status(400).json({ error: "That photo is over 10 MB — please choose a smaller file." });

  const { data: allowed } = await db.rpc("media_upload_allowed", { p_user: auth.user.id, p_event: eventId });
  if (allowed !== true) return res.status(404).json({ error: "We couldn’t find that event." });

  const key = `events/${eventId.toLowerCase()}/${randomUUID()}.${TYPES[contentType]}`;
  const { error: limit } = await db.rpc("claim_upload", { p_user: auth.user.id, p_event: eventId, p_bytes: size, p_key: key });
  if (limit) {
    const m = limit.message;
    return res.status(429).json({
      error: /event/.test(m)
        ? "This website has reached its photo limit (200 photos). Remove some before adding more."
        : /day/.test(m)
          ? "You’ve uploaded a lot today — please try again tomorrow."
          : /hour/.test(m)
            ? "You’ve uploaded a lot in the last hour — please try again in a little while."
            : "Couldn’t start the upload — please try again.",
    });
  }

  const headers = { "Content-Type": contentType, "Cache-Control": "public, max-age=31536000, immutable" };
  return res.status(200).json({
    uploadUrl: presign("PUT", key, { ...headers, "Content-Length": String(size) }, 300),
    headers,
    publicUrl: r2PublicUrl(key),
  });
}
