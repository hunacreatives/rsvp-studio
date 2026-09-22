import type { Gallery, GalleryItem, EventContent } from "../../content/types";
import { createId } from "../../content/id";
import { FormField, inputStyle } from "../components/FormField";
import { ListEditor } from "../components/ListEditor";
import { ImageUploadField } from "../components/ImageUploadField";

interface GalleryFieldsProps {
  content: EventContent;
  onChange: (next: EventContent) => void;
  eventId: string | undefined;
}

// V1 simplification: one gallery, managed here. Real upload now exists
// (see ImageUploadField / supabase/event-site-images-storage.sql) —
// multiple galleries is still an additive follow-up.
function ensureGallery(content: EventContent): Gallery {
  return content.galleries[0] ?? { id: createId("gallery"), items: [] };
}

export default function GalleryFields({ content, onChange, eventId }: GalleryFieldsProps) {
  const gallery = ensureGallery(content);

  function updateGallery(patch: Partial<Gallery>) {
    const next = { ...gallery, ...patch };
    const galleries = content.galleries.length > 0 ? [next, ...content.galleries.slice(1)] : [next];
    onChange({ ...content, galleries });
  }

  return (
    <div>
      <FormField label="Gallery title (optional)">
        <input
          style={inputStyle}
          placeholder="Our Engagement"
          value={gallery.title ?? ""}
          onChange={(e) => updateGallery({ title: e.target.value || undefined })}
        />
      </FormField>

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
            <FormField label="Alt text">
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
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <FormField label="Focal point X (0–1)">
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
              <FormField label="Focal point Y (0–1)">
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
            <FormField label="Layout hint (optional)">
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
          </div>
        )}
      />
    </div>
  );
}
