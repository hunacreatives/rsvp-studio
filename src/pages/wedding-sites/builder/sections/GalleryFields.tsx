import type { Gallery, GalleryItem, EventContent } from "../../content/types";
import { createId } from "../../content/id";
import { FormField, inputStyle } from "../components/FormField";
import { ListEditor } from "../components/ListEditor";
import { ImageUploadField } from "../components/ImageUploadField";

interface GalleryFieldsProps {
  content: EventContent;
  onChange: (next: EventContent) => void;
  eventId: string | undefined;
  /** The template shows only this many photos (and no gallery title). */
  limit?: number;
}

// V1 simplification: one gallery, managed here. Real upload now exists
// (see ImageUploadField / supabase/event-site-images-storage.sql) —
// multiple galleries is still an additive follow-up.
function ensureGallery(content: EventContent): Gallery {
  return content.galleries[0] ?? { id: createId("gallery"), items: [] };
}

export default function GalleryFields({ content, onChange, eventId, limit }: GalleryFieldsProps) {
  const gallery = ensureGallery(content);

  function updateGallery(patch: Partial<Gallery>) {
    const next = { ...gallery, ...patch };
    const galleries = content.galleries.length > 0 ? [next, ...content.galleries.slice(1)] : [next];
    onChange({ ...content, galleries });
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

      <ListEditor<GalleryItem>
        items={gallery.items}
        onChange={(items) => updateGallery({ items })}
        createItem={() => ({
          id: createId("gallery-item"),
          order: gallery.items.length + 1,
          image: {
            id: createId("image"),
            masterUrl: "",
            width: 1600,
            height: 1600,
            alt: "",
            focalPoint: { x: 0.5, y: 0.5 },
            createdAt: new Date().toISOString(),
          },
        })}
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
            <FormField label="Caption (optional)">
              <input
                style={inputStyle}
                value={item.caption ?? ""}
                onChange={(e) => update({ caption: e.target.value || undefined })}
              />
            </FormField>
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
              <summary style={{ fontSize: 12, color: "var(--slate)", cursor: "pointer" }}>More options</summary>
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
