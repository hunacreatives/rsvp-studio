import { useRef, useState } from "react";
import { compressImage } from "@/lib/compressImage";

// Must match api/enquire.ts: at most 5 files and 3,000,000 decoded bytes in total, and
// the whole request (base64 adds ~33%) has to stay under the host's ~4.5 MB body cap —
// over that the request is rejected outright. Photos are shrunk in the browser first,
// so a few camera-roll shots fit comfortably; PDFs can't be shrunk and count as-is.
export const MAX_FILES = 5;
export const MAX_TOTAL_BYTES = 2_900_000;
const ALLOWED = /\.(pdf|jpe?g|png|webp|heic|heif)$/i;
const TYPE_EXT: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/heic": "heic", "image/heif": "heif", "application/pdf": "pdf" };
const ACCEPT = "image/png,image/jpeg,image/webp,image/heic,image/heif,.heic,.heif,application/pdf";

export type PickedFile = { file: File; url?: string };

const mb = (n: number) => `${(n / 1_000_000).toFixed(1)} MB`;

export default function FileDrop({
  files,
  onChange,
  label = "Up to 5 images or PDFs — large photos are resized automatically",
}: {
  files: PickedFile[];
  onChange: (f: PickedFile[]) => void;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const touch = typeof window !== "undefined" && window.matchMedia?.("(hover: none)").matches;

  const used = files.reduce((n, p) => n + p.file.size, 0);

  const add = async (list: FileList | null) => {
    if (!list || busy) return;
    const incoming = Array.from(list);
    if (!incoming.length) return;
    setErrors([]);
    setBusy(true);
    const problems: string[] = [];
    const next: PickedFile[] = [...files];
    let total = used;
    try {
      for (const original of incoming) {
        if (next.length >= MAX_FILES) {
          problems.push(`You can attach up to ${MAX_FILES} files — the rest weren’t added.`);
          break;
        }
        const ext = TYPE_EXT[original.type];
        if (!ALLOWED.test(original.name) && !ext) {
          problems.push(`“${original.name}” isn’t an image or PDF, so it wasn’t added.`);
          continue;
        }
        // The server checks the file name, so make sure it ends in the right extension.
        let file = ALLOWED.test(original.name) ? original : new File([original], `${original.name || "file"}.${ext}`, { type: original.type });
        if (file.type.startsWith("image/")) {
          const named = file;
          file = await compressImage(named, { maxEdge: 1600, quality: 0.8 });
          // Still too big for what's left? One smaller pass before giving up.
          if (file.size > MAX_TOTAL_BYTES - total) file = await compressImage(named, { maxEdge: 1200, quality: 0.7, skipUnderBytes: 0 });
        }
        if (file.size > MAX_TOTAL_BYTES - total) {
          const left = MAX_TOTAL_BYTES - total;
          problems.push(
            `“${original.name}” (${mb(file.size)}) is too large to attach here${left < MAX_TOTAL_BYTES ? ` — about ${mb(Math.max(0, left))} of space is left` : ""}. You can email it to hello@thersvpstudio.com after sending.`,
          );
          continue;
        }
        if (next.some((p) => p.file.name === file.name && p.file.size === file.size)) continue;
        next.push({ file, url: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined });
        total += file.size;
      }
    } finally {
      setBusy(false);
    }
    setErrors(problems);
    onChange(next);
  };

  const remove = (i: number) => {
    const p = files[i];
    if (p.url) URL.revokeObjectURL(p.url);
    setErrors([]);
    onChange(files.filter((_, idx) => idx !== i));
  };

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        aria-disabled={busy || undefined}
        onClick={() => !busy && inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            if (!busy) inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          void add(e.dataTransfer.files);
        }}
        className={`cursor-pointer rounded-lg border border-dashed p-6 text-center transition-colors ${
          dragging ? "border-[var(--acc-blue)] bg-[var(--acc-blue)]/5" : "border-[var(--line)] hover:border-[var(--ink)]"
        }`}
      >
        <i className={`${busy ? "ri-loader-4-line animate-spin" : "ri-upload-cloud-2-line"} text-2xl text-[var(--slate)]`} aria-hidden />
        <p className="mt-2 text-sm text-[var(--slate)] md:text-xs">
          {busy ? (
            <span className="font-medium text-[var(--ink)]">Preparing your files…</span>
          ) : touch ? (
            <span className="font-medium text-[var(--ink)]">Tap to add photos or a PDF</span>
          ) : (
            <>
              <span className="font-medium text-[var(--ink)]">Click to upload</span> or drag &amp; drop
            </>
          )}
        </p>
        <p className="mt-1 text-xs text-[var(--slate)] md:text-[11px]">{label}</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => {
            void add(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      <div aria-live="polite">
        {errors.map((msg) => (
          <p key={msg} className="mt-2 text-[13px] text-[#c2410c]">
            {msg}
          </p>
        ))}
      </div>

      {files.length > 0 && (
        <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {files.map((p, i) => (
            <li
              key={`${p.file.name}-${i}`}
              className="relative overflow-hidden rounded-lg border border-[var(--line)] bg-white"
            >
              {p.url ? (
                <img src={p.url} alt={p.file.name} className="h-24 w-full object-cover" />
              ) : (
                <div className="flex h-24 items-center justify-center bg-[var(--paper)]">
                  <i className="ri-file-pdf-2-line text-2xl text-[var(--slate)]" />
                </div>
              )}
              <p className="truncate px-2 py-1 text-xs text-[var(--slate)]">{p.file.name}</p>
              <button
                type="button"
                onClick={() => remove(i)}
                aria-label={`Remove ${p.file.name}`}
                className="absolute right-0 top-0 grid h-11 w-11 place-items-center"
              >
                <span className="grid h-7 w-7 place-items-center rounded-full bg-black/55 text-white backdrop-blur">
                  <i className="ri-close-line text-base" />
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
