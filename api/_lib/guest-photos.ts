// Premium guest photo sharing: guests upload from /invite/<slug>/photos.
// Runs inside api/wedding-rsvp.ts (?op=photo-url / ?op=photo-done) — the Hobby plan
// allows 12 functions. Two steps, so only real uploads are listed:
//   POST ?op=photo-url  { slug, password, contentType, size }
//        → { uploadUrl, headers, token }   a 5-minute signed R2 PUT (events/<id>/guests/…)
//   POST ?op=photo-done { token, name }
//        → { photo }                       checks the file arrived, then lists it
// Guards: Premium site with sharing switched on, published, not ended or deleted, the
// site password if it has one, image types only (≤ 10 MB), at most 500 photos per event
// and 60 per 10 minutes. The files go with the site's other photos in the daily clean-up.
import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { presign, r2PublicUrl, r2Ready } from "./r2.js";

const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const MAX_BYTES = 10 * 1024 * 1024;
const PER_EVENT = 500;
const BURST = 60;

const key = () => createHash("sha256").update(`guest-photo:${process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""}`).digest();
const sign = (payload: string) => createHmac("sha256", key()).update(payload).digest("base64url");
const clean = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** The site, if guests may share photos on it right now; otherwise an error to show. */
async function openSite(db: SupabaseClient, slug: string, password: string) {
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) return { error: "We couldn’t find this event.", status: 404 };
  const { data: site } = await db.from("wedding_sites").select("*").eq("slug", slug).maybeSingle();
  if (!site?.published_at) return { error: "We couldn’t find this event.", status: 404 };
  const { data: ev } = await db.from("events").select("id, deleted_at").eq("id", site.event_id).maybeSingle();
  if (!ev || ev.deleted_at) return { error: "This event is no longer available.", status: 404 };
  const { data: premium } = await db.rpc("event_is_premium", { p_event: ev.id });
  if (!site.photo_sharing || premium !== true) return { error: "Photo sharing isn’t switched on for this event.", status: 403 };
  const pass = typeof site.site_password === "string" ? site.site_password : "";
  if (pass && password.trim().toLowerCase() !== pass.trim().toLowerCase()) return { error: "This invitation is private. Open it again with the hosts’ password.", status: 403 };
  const { data: until } = await db.rpc("site_live_until", { p_event: ev.id });
  if (typeof until === "string" && Date.parse(until) < Date.now()) return { error: "This event has ended, so photo sharing is closed.", status: 410 };
  return { eventId: ev.id as string };
}

export async function guestPhotoHandler(db: SupabaseClient, req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!r2Ready()) return res.status(503).json({ error: "Photo sharing isn’t available right now. Please try again later." });
  const body = (req.body ?? {}) as Record<string, unknown>;

  if (req.query.op === "photo-url") {
    const site = await openSite(db, clean(body.slug, 80).toLowerCase(), clean(body.password, 40));
    if ("error" in site) return res.status(site.status!).json({ error: site.error });
    const contentType = clean(body.contentType, 40);
    const size = Number(body.size);
    if (!TYPES[contentType]) return res.status(400).json({ error: "Please choose a photo (JPEG, PNG or WebP)." });
    if (!Number.isInteger(size) || size <= 0 || size > MAX_BYTES) return res.status(400).json({ error: "That photo is too big. Please choose one under 10 MB." });

    const { count: total } = await db.from("guest_photos").select("id", { count: "exact", head: true }).eq("event_id", site.eventId);
    if ((total ?? 0) >= PER_EVENT) return res.status(429).json({ error: "This event’s photo album is full." });
    const since = new Date(Date.now() - 10 * 60_000).toISOString();
    const { count: recent } = await db.from("guest_photos").select("id", { count: "exact", head: true }).eq("event_id", site.eventId).gte("created_at", since);
    if ((recent ?? 0) >= BURST) return res.status(429).json({ error: "Lots of photos are coming in right now. Please try again in a few minutes." });

    const objectKey = `events/${site.eventId}/guests/${randomUUID()}.${TYPES[contentType]}`;
    const headers = { "Content-Type": contentType, "Cache-Control": "public, max-age=31536000, immutable" };
    const payload = Buffer.from(JSON.stringify({ k: objectKey, e: site.eventId, x: Date.now() + 15 * 60_000 })).toString("base64url");
    return res.status(200).json({
      uploadUrl: presign("PUT", objectKey, { ...headers, "Content-Length": String(size) }, 300),
      headers,
      token: `${payload}.${sign(payload)}`,
    });
  }

  if (req.query.op === "photo-done") {
    const [payload, sig] = clean(body.token, 2000).split(".");
    const want = payload ? Buffer.from(sign(payload)) : Buffer.alloc(0);
    const got = Buffer.from(sig ?? "");
    if (!payload || got.length !== want.length || !timingSafeEqual(got, want)) return res.status(400).json({ error: "That upload link has expired. Please try again." });
    const t = JSON.parse(Buffer.from(payload, "base64url").toString()) as { k: string; e: string; x: number };
    if (t.x < Date.now()) return res.status(400).json({ error: "That upload link has expired. Please try again." });
    const url = r2PublicUrl(t.k);
    // Only list it once the file is really there.
    const head = await fetch(url, { method: "HEAD" }).catch(() => null);
    if (!head?.ok) return res.status(400).json({ error: "The photo didn’t finish uploading. Please try again." });
    const { data: dupe } = await db.from("guest_photos").select("id").eq("url", url).maybeSingle();
    if (dupe) return res.status(200).json({ photo: dupe });
    const { data: photo, error } = await db
      .from("guest_photos")
      .insert({ event_id: t.e, url, uploader_name: clean(body.name, 80) || null })
      .select("id, url, uploader_name, created_at")
      .single();
    if (error) return res.status(500).json({ error: "Couldn’t save your photo. Please try again." });
    return res.status(200).json({ photo });
  }

  return res.status(404).json({ error: "Not found" });
}
