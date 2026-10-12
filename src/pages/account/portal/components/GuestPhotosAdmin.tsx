import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

// Guests → Shared photos (Premium photo sharing, supabase/guest-features.sql): what
// guests added on the photo page. Hide takes a photo off the page (and can be undone);
// Remove deletes it from the album for good. Files are cleaned up with the site's
// other photos after the event.

type Photo = { id: string; url: string; uploader_name: string | null; hidden: boolean; created_at: string };

export default function GuestPhotosAdmin({ eventId, slug }: { eventId: string; slug: string | null }) {
  const [photos, setPhotos] = useState<Photo[] | null>(null);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    Promise.all([
      supabase.from("guest_photos").select("id, url, uploader_name, hidden, created_at").eq("event_id", eventId).order("created_at", { ascending: false }),
      supabase.from("wedding_sites").select("photo_sharing").eq("event_id", eventId).maybeSingle(),
    ]).then(([p, s]) => {
      setPhotos(p.error ? null : ((p.data ?? []) as Photo[]));
      setSharing(!s.error && !!s.data?.photo_sharing);
    });
  }, [eventId]);

  // Not set up, or sharing never used: nothing to show.
  if (!photos || (!photos.length && !sharing)) return null;

  const setHidden = async (id: string, hidden: boolean) => {
    setPhotos(photos.map((p) => (p.id === id ? { ...p, hidden } : p)));
    await supabase.from("guest_photos").update({ hidden }).eq("id", id);
  };
  const remove = async (id: string) => {
    setPhotos(photos.filter((p) => p.id !== id));
    await supabase.from("guest_photos").delete().eq("id", id);
  };

  return (
    <section className="mt-12">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="font-display text-[1.4rem] font-semibold text-[var(--ink)]">Shared photos</h2>
        {slug ? (
          <a href={`/invite/${slug}/photos`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[44px] items-center text-[14px] text-[var(--acc-blue)] hover:underline md:min-h-0">
            Open the photo page →
          </a>
        ) : null}
      </div>
      {photos.length ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {photos.map((p) => (
            <li key={p.id} className="overflow-hidden rounded-2xl border border-[var(--line)] bg-white">
              <a href={p.url} target="_blank" rel="noopener noreferrer" className="block aspect-square bg-[var(--paper)]">
                <img src={p.url} alt="" loading="lazy" className={`h-full w-full object-cover ${p.hidden ? "opacity-35" : ""}`} />
              </a>
              <div className="flex items-center gap-1 px-3 py-2">
                <span className="min-w-0 flex-1 truncate text-[13px] text-[var(--slate)]">{p.hidden ? "Hidden" : p.uploader_name || "A guest"}</span>
                <button onClick={() => setHidden(p.id, !p.hidden)} className="min-h-[44px] px-2 text-[13px] text-[var(--acc-blue)] md:min-h-[32px]">
                  {p.hidden ? "Show" : "Hide"}
                </button>
                <button onClick={() => remove(p.id)} className="min-h-[44px] px-2 text-[13px] text-[#c2412d] md:min-h-[32px]">
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[14px] text-[var(--slate)]">No photos yet. Guests add them from the link at the bottom of your website, or the QR code in the builder.</p>
      )}
    </section>
  );
}
