import { useEffect, useRef, useState } from "react";
import { uploadEventImage, UploadEventImageError } from "../../content/uploadEventImage";
import type { ImageAsset } from "../../content/types";
import { useIsPhone } from "../useIsPhone";

interface ImageUploadFieldProps {
  eventId: string | undefined;
  masterUrl: string;
  /** Kept for callers; there's no link box any more (photos are uploaded, never pasted). */
  onUrlChange?: (url: string) => void;
  onUploaded: (image: ImageAsset) => void;
  /** The caller shows the photo itself (e.g. a Reposition frame): just this button, no thumbnail. */
  replaceLabel?: string;
}

/**
 * One photo: "Upload a photo" when there's none, else the photo with a Replace button. The
 * chosen photo shows straight away (faded) while it uploads. No link box: hosts upload from
 * their phone or computer, and the address it's stored at is never their concern.
 */
export function ImageUploadField({ eventId, masterUrl, onUploaded, replaceLabel }: ImageUploadFieldProps) {
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
    setLocalPreview(URL.createObjectURL(file));
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
  const shown = localPreview || masterUrl;
  return (
    <div>
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
      {replaceLabel && !localPreview ? (
        <button type="button" onClick={() => inputRef.current?.click()} disabled={disabled} style={{ minHeight: 44, padding: "0 14px", borderRadius: 8, border: "1px solid var(--line)", background: "#fff", fontSize: 14, fontWeight: 600, color: "var(--ink)", cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.6 : 1 }}>
          {uploading ? "Uploading…" : replaceLabel}
        </button>
      ) : shown ? (
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ position: "relative", display: "inline-block", lineHeight: 0 }}>
            <img src={shown} alt="" style={{ maxHeight: 96, maxWidth: 160, borderRadius: 8, display: "block", opacity: uploading ? 0.55 : 1 }} />
            {uploading ? (
              <span aria-live="polite" style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", fontSize: 13, fontWeight: 600, color: "var(--ink)", lineHeight: 1.2 }}>
                Uploading…
              </span>
            ) : null}
          </span>
          <button type="button" onClick={() => inputRef.current?.click()} disabled={disabled} style={{ minHeight: 44, padding: "0 14px", borderRadius: 8, border: "1px solid var(--line)", background: "#fff", fontSize: 14, fontWeight: 600, color: "var(--ink)", cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.6 : 1 }}>
            {uploading ? "Uploading…" : "Replace"}
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => inputRef.current?.click()} disabled={disabled} style={{ width: isPhone ? "100%" : undefined, minHeight: 48, padding: "0 18px", borderRadius: 8, border: "1px dashed var(--line)", background: "#fff", fontSize: 15, fontWeight: 600, color: "var(--ink)", cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.6 : 1 }}>
          {uploading ? "Uploading…" : "Upload a photo"}
        </button>
      )}
      {error ? <p style={{ fontSize: 12, color: "#b3382c", marginTop: 6 }}>{error}</p> : null}
    </div>
  );
}
