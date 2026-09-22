import { useRef, useState } from "react";
import { inputStyle } from "./FormField";
import { uploadEventImage, UploadEventImageError } from "../../content/uploadEventImage";
import type { ImageAsset } from "../../content/types";

interface ImageUploadFieldProps {
  eventId: string | undefined;
  masterUrl: string;
  onUrlChange: (url: string) => void;
  onUploaded: (image: ImageAsset) => void;
}

/**
 * Pasting an already-hosted URL and uploading a file both land on the
 * same field: masterUrl. Upload is the common path now that
 * uploadEventImage()/the event-site-images bucket exist (see
 * supabase/event-site-images-storage.sql) — URL paste stays for anyone
 * who already has the photo hosted elsewhere.
 */
export function ImageUploadField({ eventId, masterUrl, onUrlChange, onUploaded }: ImageUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File | undefined) {
    if (!file || !eventId) return;
    setUploading(true);
    setError(null);
    try {
      const image = await uploadEventImage(file, eventId);
      onUploaded(image);
    } catch (err) {
      setError(err instanceof UploadEventImageError ? err.message : "Upload failed — please try again.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          style={{ ...inputStyle, flex: 1 }}
          placeholder="https://…"
          value={masterUrl}
          onChange={(e) => onUrlChange(e.target.value)}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={!eventId || uploading}
          style={{
            padding: "10px 14px",
            borderRadius: 8,
            border: "1px solid var(--line)",
            background: "#fff",
            fontSize: 13,
            fontWeight: 600,
            color: "var(--ink)",
            cursor: !eventId || uploading ? "default" : "pointer",
            opacity: !eventId || uploading ? 0.6 : 1,
            whiteSpace: "nowrap",
          }}
        >
          {uploading ? "Uploading…" : "Upload photo"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          style={{ display: "none" }}
          onChange={(e) => {
            void handleFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>
      <p style={{ fontSize: 12, color: "var(--slate)", marginTop: 4 }}>
        Paste a link to an already-hosted photo, or upload one directly.
      </p>
      {error ? <p style={{ fontSize: 12, color: "#b3382c", marginTop: 4 }}>{error}</p> : null}
      {masterUrl ? (
        <img
          src={masterUrl}
          alt=""
          style={{ marginTop: 8, maxHeight: 120, borderRadius: 8, display: "block" }}
        />
      ) : null}
    </div>
  );
}
