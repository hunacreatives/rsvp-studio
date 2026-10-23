import { useRef, useState } from "react";
import type { Gallery, GalleryItem, EventContent, ImageAsset } from "../../content/types";
import { createId } from "../../content/id";
import { uploadEventImage, UploadEventImageError } from "../../content/uploadEventImage";
import { FormField, inputStyle } from "../components/FormField";
import { ListEditor } from "../components/ListEditor";
import { ImageUploadField } from "../components/ImageUploadField";

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
        items={gallery.items}
        onChange={(items) => updateGallery({ items })}
        createItem={() => newGalleryItem(gallery.items.length + 1)}
        addLabel="Add photo"
        emptyLabel="No photos yet."
        renderItem={(item, update) => (
          <div>
            <FormField label="Photo">
              <ImageUploadField
                eventId={eventId}
                masterUrl={item.image.masterUrl}
                onUrlChange={(masterUrl) => update({ image: { ...item.image, masterUrl } })}
                onUploaded={(uploaded) =>
                  update({
                    image: {
                      ...item.image,
                      masterUrl: uploaded.masterUrl,
                      width: uploaded.width,
                      height: uploaded.height,
                    },
                  })
                }
              />
            </FormField>
            <FormField label="Describe this photo" hint="Helps guests who use screen readers. E.g. “Us at Taal Lake”.">
              <input
                style={inputStyle}
                value={item.image.alt}
                onChange={(e) => update({ image: { ...item.image, alt: e.target.value } })}
              />
            </FormField>
            <FormField label="Caption (optional)" hint={backs ? "Start with the year to place it in its decade, e.g. “1968 — Our wedding day”." : undefined}>
              <input
                style={inputStyle}
                value={item.caption ?? ""}
                placeholder={backs ? "1968 — Our wedding day" : undefined}
                onChange={(e) => update({ caption: e.target.value || undefined })}
              />
            </FormField>
            {backs ? (
              <FormField label="Written on the back (optional)" hint="Guests tap the photo to turn it over and read this, in handwriting.">
                <textarea
                  style={{ ...inputStyle, minHeight: 64, resize: "vertical" }}
                  maxLength={160}
                  placeholder="Baguio, June 1968. Kasama si Ben at si Nena."
                  value={item.back ?? ""}
                  onChange={(e) => update({ back: e.target.value || undefined })}
                />
              </FormField>
            ) : null}
            {item.image.masterUrl ? (
              <FormField label="What should stay in view?" hint="Tap the most important part of the photo — it stays visible when the photo is cropped.">
                <FocusPicker
                  url={item.image.masterUrl}
                  focus={item.image.focalPoint}
                  onChange={(focalPoint) => update({ image: { ...item.image, focalPoint } })}
                />
              </FormField>
            ) : null}
            <details style={{ marginTop: 8 }}>
              <summary className="rb-summary-tap" style={{ fontSize: 12, color: "var(--slate)", cursor: "pointer" }}>More options</summary>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 8 }}>
              <FormField label="Focus across (0–1)">
                <input
                  type="number"
                  min={0}
                  max={1}
                  step={0.05}
                  style={inputStyle}
                  value={item.image.focalPoint.x}
                  onChange={(e) =>
                    update({ image: { ...item.image, focalPoint: { ...item.image.focalPoint, x: Number(e.target.value) } } })
                  }
                />
              </FormField>
              <FormField label="Focus down (0–1)">
                <input
                  type="number"
                  min={0}
                  max={1}
                  step={0.05}
                  style={inputStyle}
                  value={item.image.focalPoint.y}
                  onChange={(e) =>
                    update({ image: { ...item.image, focalPoint: { ...item.image.focalPoint, y: Number(e.target.value) } } })
                  }
                />
              </FormField>
            </div>
            <FormField label="Photo shape (optional)">
              <select
                style={inputStyle}
                value={item.layoutHint ?? ""}
                onChange={(e) =>
                  update({
                    layoutHint: (e.target.value || undefined) as GalleryItem["layoutHint"],
                  })
                }
              >
                <option value="">Standard</option>
                <option value="wide">Wide</option>
                <option value="portrait">Portrait</option>
              </select>
            </FormField>
            </details>
          </div>
        )}
      />
    </div>
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

/** Tap a point on the photo to set its focus (what stays visible when cropped). */
function FocusPicker({ url, focus, onChange }: { url: string; focus: { x: number; y: number }; onChange: (f: { x: number; y: number }) => void }) {
  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Set the photo’s focus point"
      onClick={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        const round = (n: number) => Math.round(Math.min(1, Math.max(0, n)) * 100) / 100;
        onChange({ x: round((e.clientX - r.left) / r.width), y: round((e.clientY - r.top) / r.height) });
      }}
      className="rb-focus"
      style={{ position: "relative", cursor: "crosshair", borderRadius: 10, overflow: "hidden", lineHeight: 0 }}
    >
      <img src={url} alt="" style={{ width: "100%", display: "block" }} />
      <span
        aria-hidden
        style={{
          position: "absolute",
          left: `${focus.x * 100}%`,
          top: `${focus.y * 100}%`,
          width: 22,
          height: 22,
          marginLeft: -11,
          marginTop: -11,
          borderRadius: 999,
          border: "3px solid #fff",
          boxShadow: "0 0 0 2px rgba(0,7,39,.6)",
          background: "rgba(24,98,221,.5)",
        }}
      />
    </div>
  );
}
