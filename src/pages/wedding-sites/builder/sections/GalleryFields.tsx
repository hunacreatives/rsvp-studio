import { useRef, useState } from "react";
import type { Gallery, GalleryItem, EventContent, ImageAsset } from "../../content/types";
import { createId } from "../../content/id";
import { uploadEventImage, UploadEventImageError } from "../../content/uploadEventImage";
import { FormField, inputStyle } from "../components/FormField";
import { ListEditor } from "../components/ListEditor";
import Reposition from "../components/Reposition";

interface GalleryFieldsProps {
  content: EventContent;
  onChange: (next: EventContent) => void;
  eventId: string | undefined;
  /** The template shows only this many photos (and no gallery title). */
  limit?: number;
  /** The design shows the back of each photo (TemplateDefinition.photoBacks). */
  backs?: boolean;
}

// V1 simplification: one gallery, managed here. Real upload now exists
// (see ImageUploadField / supabase/event-site-images-storage.sql) —
// multiple galleries is still an additive follow-up.
function ensureGallery(content: EventContent): Gallery {
  return content.galleries[0] ?? { id: createId("gallery"), items: [] };
}

function newGalleryItem(order: number, uploaded?: ImageAsset): GalleryItem {
  return {
    id: createId("gallery-item"),
    order,
    image: {
      id: createId("image"),
      masterUrl: uploaded?.masterUrl ?? "",
      width: uploaded?.width ?? 1600,
      height: uploaded?.height ?? 1600,
      alt: "",
      focalPoint: { x: 0.5, y: 0.5 },
      createdAt: new Date().toISOString(),
    },
  };
}

export default function GalleryFields({ content, onChange, eventId, limit, backs = false }: GalleryFieldsProps) {
  const gallery = ensureGallery(content);

  function updateGallery(patch: Partial<Gallery>) {
    const next = { ...gallery, ...patch };
    const galleries = content.galleries.length > 0 ? [next, ...content.galleries.slice(1)] : [next];
    onChange({ ...content, galleries });
  }

  // Several photos at once (phones: pick a batch from the camera roll). Uploads
  // run one after another; the new items are appended to the LATEST content, so
  // edits made while they upload aren't lost.
  const latest = useRef(content);
  latest.current = content;
  function appendUploaded(images: ImageAsset[]) {
    const current = latest.current;
    const g = ensureGallery(current);
    const items = [...g.items, ...images.map((img, i) => newGalleryItem(g.items.length + i + 1, img))];
    const next = { ...g, items };
    const galleries = current.galleries.length > 0 ? [next, ...current.galleries.slice(1)] : [next];
    onChange({ ...current, galleries });
  }

  return (
    <div>
      {limit ? (
        <p style={{ margin: "0 0 12px", fontSize: 13, color: "var(--slate)" }}>
          This design shows your first {limit === 1 ? "photo" : `${limit} photos`}.
        </p>
      ) : (
        <FormField label="Gallery title (optional)">
          <input
            style={inputStyle}
            placeholder="Our story in photos"
            value={gallery.title ?? ""}
            onChange={(e) => updateGallery({ title: e.target.value || undefined })}
          />
        </FormField>
      )}

      <AddPhotosButton eventId={eventId} onUploaded={appendUploaded} />

      <ListEditor<GalleryItem>
        list="gallery"
        items={gallery.items}
        onChange={(items) => updateGallery({ items })}
        createItem={() => newGalleryItem(gallery.items.length + 1)}
        addLabel=""
        emptyLabel="No photos yet."
        renderItem={(item, update) => (
          <div style={{ paddingTop: 30 }}>
            {item.image.masterUrl ? (
              <>
                <Reposition
                  url={item.image.masterUrl}
                  width={item.image.width}
                  height={item.image.height}
                  aspect={item.image.width >= item.image.height ? "4 / 3" : "4 / 5"}
                  focus={item.image.focalPoint}
                  onChange={(focalPoint) => update({ image: { ...item.image, focalPoint } })}
                  zoom={item.image.zoom ?? 1}
                  onZoom={(zoom) => update({ image: { ...item.image, zoom } })}
                  style={{ marginBottom: 12 }}
                />
              </>
            ) : null}
            <FormField label="" hint={backs ? "Start with the year to place it in its decade, e.g. “1968 — Our wedding day”." : undefined}>
              <input
                style={inputStyle}
                aria-label="Caption"
                value={item.caption ?? ""}
                placeholder={backs ? "1968 — Our wedding day" : "Caption (optional)"}
                onChange={(e) => {
                  // The screen-reader description follows the caption until the host writes their own.
                  const follows = !item.image.alt || item.image.alt === (item.caption ?? "");
                  update({ caption: e.target.value || undefined, ...(follows ? { image: { ...item.image, alt: e.target.value } } : {}) });
                }}
              />
            </FormField>
            {backs ? (
              <FormField label="" hint="Guests tap the photo to turn it over and read this, in handwriting.">
                <textarea
                  style={{ ...inputStyle, minHeight: 64, resize: "vertical" }}
                  aria-label="Written on the back"
                  maxLength={160}
                  placeholder="Written on the back (optional), e.g. “Baguio, June 1968. Kasama si Ben.”"
                  value={item.back ?? ""}
                  onChange={(e) => update({ back: e.target.value || undefined })}
                />
              </FormField>
            ) : null}
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
              <ReplacePhoto eventId={eventId} has={!!item.image.masterUrl} onUploaded={(u) => update({ image: { ...item.image, masterUrl: u.masterUrl, width: u.width, height: u.height, focalPoint: { x: 0.5, y: 0.5 }, zoom: 1 } })} />
              <details style={{ flex: "1 1 200px" }}>
                <summary className="rb-summary-tap" style={{ fontSize: 13, color: "var(--slate)", cursor: "pointer" }}>More</summary>
                <FormField label="Describe it for screen readers" hint="Leave empty to use the caption.">
                  <input style={inputStyle} placeholder={item.caption || "Us at Taal Lake"} value={item.image.alt} onChange={(e) => update({ image: { ...item.image, alt: e.target.value } })} />
                </FormField>
                <FormField label="Photo shape">
                  <select style={inputStyle} value={item.layoutHint ?? ""} onChange={(e) => update({ layoutHint: (e.target.value || undefined) as GalleryItem["layoutHint"] })}>
                    <option value="">Standard</option>
                    <option value="wide">Wide</option>
                    <option value="portrait">Portrait</option>
                  </select>
                </FormField>
              </details>
            </div>
          </div>
        )}
      />
    </div>
  );
}

/** Replace one photo (or upload it, for an old empty slot). */
function ReplacePhoto({ eventId, has, onUploaded }: { eventId: string | undefined; has: boolean; onUploaded: (image: ImageAsset) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <span>
      <button type="button" disabled={!eventId || busy} onClick={() => ref.current?.click()} style={{ minHeight: 44, padding: "0 14px", borderRadius: 8, border: "1px solid var(--line)", background: "#fff", fontSize: 14, fontWeight: 600, color: "var(--ink)", cursor: busy ? "default" : "pointer" }}>
        {busy ? "Uploading…" : has ? "Replace photo" : "Upload photo"}
      </button>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f || !eventId) return;
          setBusy(true);
          setError(null);
          try {
            onUploaded(await uploadEventImage(f, eventId));
          } catch (err) {
            setError(err instanceof UploadEventImageError ? err.message : "Upload failed — please try again.");
          } finally {
            setBusy(false);
          }
        }}
      />
      {error ? <span style={{ display: "block", fontSize: 12, color: "#b3382c", marginTop: 4 }}>{error}</span> : null}
    </span>
  );
}

function AddPhotosButton({ eventId, onUploaded }: { eventId: string | undefined; onUploaded: (images: ImageAsset[]) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(files: File[]) {
    if (!eventId || files.length === 0) return;
    setError(null);
    const uploaded: ImageAsset[] = [];
    let failed = 0;
    let lastError = "";
    for (let i = 0; i < files.length; i++) {
      setProgress({ done: i, total: files.length });
      try {
        uploaded.push(await uploadEventImage(files[i], eventId));
      } catch (err) {
        failed++;
        lastError = err instanceof UploadEventImageError ? err.message : "Upload failed — please try again.";
      }
    }
    setProgress(null);
    if (uploaded.length) onUploaded(uploaded);
    if (failed) setError(failed === files.length ? lastError : `${failed} of ${files.length} photos couldn’t be added. ${lastError}`);
  }

  const busy = progress !== null;
  return (
    <div style={{ marginBottom: 14 }}>
      <button
        type="button"
        className="rb-tap44"
        onClick={() => inputRef.current?.click()}
        disabled={!eventId || busy}
        style={{
          width: "100%",
          padding: "10px 16px",
          borderRadius: 8,
          border: "1px solid var(--line)",
          background: "#fff",
          color: "var(--ink)",
          fontSize: 14,
          fontWeight: 600,
          cursor: !eventId || busy ? "default" : "pointer",
          opacity: !eventId ? 0.6 : 1,
        }}
      >
        {progress ? `Uploading ${progress.done + 1} of ${progress.total}…` : "Add photos"}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        style={{ display: "none" }}
        onChange={(e) => {
          void handleFiles(Array.from(e.target.files ?? []));
          e.target.value = "";
        }}
      />
      <p style={{ fontSize: 12, color: "var(--slate)", margin: "4px 0 0" }} aria-live="polite">
        {busy ? "Keep this page open until it finishes." : "Pick several at once from your phone or computer."}
      </p>
      {error ? <p style={{ fontSize: 12, color: "#b3382c", margin: "4px 0 0" }}>{error}</p> : null}
    </div>
  );
}
