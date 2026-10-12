import type { SupabaseClient } from "@supabase/supabase-js";
import { r2Delete, r2List, r2PublicUrl, r2Ready } from "./r2.js";

// Removing an ended or deleted site's photos (lifecycle_due → 'photos', supabase/media-r2.sql).
// Photos may be in either store: Supabase `event-site-images/<eventId>/` (older uploads)
// and R2 `events/<eventId>/` (newer). Safety:
//   • the event id must be a UUID — an empty or odd id could otherwise point at a whole bucket;
//   • due-ness is re-checked right before deleting (photo_purge_ok);
//   • files whose link is used anywhere else (another site, the blog) are kept;
//   • PHOTO_PURGE env: "live" deletes, "off" skips, anything else (default) is a dry run
//     that only logs what it would delete — photo_purge_log, Studio staff can read it.
// After a live run the site's content no longer links to the removed photos.

const BUCKET = "event-site-images";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type PurgeMode = "off" | "dry" | "live";
export const purgeMode = (): PurgeMode => (process.env.PHOTO_PURGE === "live" ? "live" : process.env.PHOTO_PURGE === "off" ? "off" : "dry");

type Store = { name: "supabase" | "r2"; list(id: string): Promise<{ key: string; url: string }[]>; remove(keys: string[]): Promise<void> };

function stores(db: SupabaseClient): Store[] {
  const supa: Store = {
    name: "supabase",
    async list(id) {
      const out: { key: string; url: string }[] = [];
      for (let offset = 0; offset < 20_000; offset += 1000) {
        const { data, error } = await db.storage.from(BUCKET).list(id, { limit: 1000, offset });
        if (error) throw new Error(`storage list: ${error.message}`);
        for (const f of data ?? []) {
          const key = `${id}/${f.name}`;
          out.push({ key, url: db.storage.from(BUCKET).getPublicUrl(key).data.publicUrl });
        }
        if (!data || data.length < 1000) break;
      }
      return out;
    },
    async remove(keys) {
      for (let i = 0; i < keys.length; i += 1000) {
        const { error } = await db.storage.from(BUCKET).remove(keys.slice(i, i + 1000));
        if (error) throw new Error(`storage remove: ${error.message}`);
      }
    },
  };
  if (!r2Ready()) return [supa];
  const r2: Store = {
    name: "r2",
    async list(id) {
      return (await r2List(`events/${id}/`)).map((key) => ({ key, url: r2PublicUrl(key) }));
    },
    remove: r2Delete,
  };
  return [supa, r2];
}

/** Drop every image in this site's content that points at its own (now removed) photos. */
export function stripOwnPhotos(value: unknown, eventId: string): unknown {
  const own = (u: unknown) => typeof u === "string" && (u.includes(`/${BUCKET}/${eventId}/`) || u.includes(`/events/${eventId}/`));
  const walk = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(walk).filter((x) => x !== undefined);
    if (!v || typeof v !== "object") return v;
    const o = v as Record<string, unknown>;
    if (own(o.masterUrl)) return undefined; // an ImageAsset
    const next: Record<string, unknown> = {};
    for (const [k, child] of Object.entries(o)) {
      if ((k === "qrUrl" || k === "logoUrl" || k === "url") && own(child)) continue;
      const w = walk(child);
      if (w !== undefined) next[k] = w;
    }
    if ("image" in o && !("image" in next)) return undefined; // a gallery item that lost its photo
    return next;
  };
  return walk(value);
}

async function log(db: SupabaseClient, row: Record<string, unknown>) {
  await db.from("photo_purge_log").insert(row);
}

export async function purgeEventPhotos(db: SupabaseClient, eventId: string, mode: Exclude<PurgeMode, "off">) {
  if (!UUID.test(eventId)) throw new Error(`refusing photo purge for "${eventId}"`);
  const { data: reason } = await db.rpc("photo_purge_ok", { p_event: eventId });
  if (reason !== "ended" && reason !== "deleted") return { skipped: true as const, complete: false };

  const { data: refs } = await db.rpc("photo_refs_elsewhere", { p_event: eventId });
  const keep = new Set((refs ?? []) as string[]);
  let complete = true;
  for (const store of stores(db)) {
    try {
      const files = await store.list(eventId);
      const doomed = files.filter((f) => !keep.has(f.url));
      if (mode === "live" && doomed.length) await store.remove(doomed.map((f) => f.key));
      if (files.length)
        await log(db, { event_id: eventId, reason, store: store.name, found: files.length, deleted: mode === "live" ? doomed.length : 0, kept_shared: files.length - doomed.length, dry_run: mode !== "live" });
    } catch (e) {
      complete = false;
      await log(db, { event_id: eventId, reason, store: store.name, dry_run: mode !== "live", error: e instanceof Error ? e.message : String(e) });
    }
  }

  if (mode === "live" && complete && reason === "ended") {
    // The site stays (its thank-you page, the owner's dashboard): just stop linking to removed photos.
    const { data: ws } = await db.from("wedding_sites").select("id, draft_content, published_content, draft_presentation, published_presentation").eq("event_id", eventId).maybeSingle();
    if (ws) {
      await db
        .from("wedding_sites")
        .update({
          draft_content: stripOwnPhotos(ws.draft_content, eventId),
          published_content: ws.published_content == null ? null : stripOwnPhotos(ws.published_content, eventId),
          draft_presentation: stripOwnPhotos(ws.draft_presentation, eventId),
          published_presentation: ws.published_presentation == null ? null : stripOwnPhotos(ws.published_presentation, eventId),
        })
        .eq("id", ws.id);
    }
    await db.from("events").update({ photos_purged_at: new Date().toISOString() }).eq("id", eventId);
  }
  return { skipped: false as const, reason, complete };
}
