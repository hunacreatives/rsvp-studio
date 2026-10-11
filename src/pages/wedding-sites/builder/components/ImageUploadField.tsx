import { useEffect, useRef, useState } from "react";
import { inputStyle } from "./FormField";
import { uploadEventImage, UploadEventImageError } from "../../content/uploadEventImage";
import type { ImageAsset } from "../../content/types";
import { useIsPhone } from "../useIsPhone";

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
 *
 * Phones: a full-width "Upload photo" button comes first (the link field is
 * secondary), and the chosen photo shows straight away while it uploads.
 */
export function ImageUploadField({ eventId, masterUrl, onUrlChange, onUploaded }: ImageUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const isPhone = useIsPhone();

  useEffect(() => () => {
    if (localPreview) URL.revokeObjectURL(localPreview);
  }, [localPreview]);

  async function handleFile(file: File | undefined) {
    if (!file || !eventId) return;
    setUploading(true);
    setError(null);
    if (isPhone) setLocalPreview(URL.createObjectURL(file));
    try {
      const image = await uploadEventImage(file, eventId);
      onUploaded(image);
    } catch (err) {
      setError(err instanceof UploadEventImageError ? err.message : "Upload failed — please try again.");
    } finally {
      setUploading(false);
      setLocalPreview(null);
    }
  }

  const disabled = !eventId || uploading;
  const uploadButton = (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      disabled={disabled}
      style={{
        padding: "10px 14px",
        borderRadius: 8,
        border: "1px solid var(--line)",
        background: "#fff",
        fontSize: isPhone ? 15 : 13,
        fontWeight: 600,
        color: "var(--ink)",
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.6 : 1,
        whiteSpace: "nowrap",
        ...(isPhone ? { width: "100%", minHeight: 48 } : null),
      }}
    >
      {uploading ? "Uploading…" : "Upload photo"}
    </button>
  );
  const urlInput = (
    <input
      style={{ ...inputStyle, flex: 1 }}
      placeholder="https://…"
      aria-label="Photo link"
      value={masterUrl}
      onChange={(e) => onUrlChange(e.target.value)}
    />
  );
  const fileInput = (
    <input
      ref={inputRef}
      type="file"
      accept="image/*"
      style={{ display: "none" }}
      onChange={(e) => {
        void handleFile(e.target.files?.[0]);
        e.target.value = "";
      }}
    />
  );

  return (
    <div>
      {isPhone ? (
        <>
          {uploadButton}
          {fileInput}
          <p style={{ fontSize: 12, color: "var(--slate)", margin: "10px 0 6px" }}>Or paste a link to a photo:</p>
          {urlInput}
        </>
      ) : (
        <>
          <div style={{ display: "flex", gap: 8 }}>
            {urlInput}
            {uploadButton}
            {fileInput}
          </div>
          <p style={{ fontSize: 12, color: "var(--slate)", marginTop: 4 }}>
            Upload a photo from your phone or computer — or paste a link to one.
          </p>
        </>
      )}
      {error ? <p style={{ fontSize: 12, color: "#b3382c", marginTop: 4 }}>{error}</p> : null}
      {localPreview ? (
        <div style={{ position: "relative", marginTop: 8, display: "inline-block" }}>
          <img src={localPreview} alt="" style={{ maxHeight: 120, maxWidth: "100%", borderRadius: 8, display: "block", opacity: 0.55 }} />
          <span
            style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", fontSize: 13, fontWeight: 600, color: "var(--ink)" }}
            aria-live="polite"
          >
            Uploading…
          </span>
        </div>
      ) : masterUrl ? (
        <img
          src={masterUrl}
          alt=""
          style={{ marginTop: 8, maxHeight: 120, borderRadius: 8, display: "block" }}
        />
      ) : null}
    </div>
  );
}
