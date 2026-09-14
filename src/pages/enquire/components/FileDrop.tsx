import { useRef, useState } from "react";

const MAX_MB = 10;
const MAX_FILES = 6;
const ACCEPT = "image/png,image/jpeg,image/webp,image/gif,application/pdf";

export type PickedFile = { file: File; url?: string };

export default function FileDrop({
  files,
  onChange,
  label = "Attach images or a PDF (up to 10 MB each)",
}: {
  files: PickedFile[];
  onChange: (f: PickedFile[]) => void;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const add = (list: FileList | null) => {
    if (!list) return;
    setError(null);
    const incoming = Array.from(list);
    const next: PickedFile[] = [...files];
    for (const file of incoming) {
      if (next.length >= MAX_FILES) {
        setError(`You can attach up to ${MAX_FILES} files.`);
        break;
      }
      if (file.size > MAX_MB * 1024 * 1024) {
        setError(`"${file.name}" is over ${MAX_MB} MB.`);
        continue;
      }
      if (next.some((p) => p.file.name === file.name && p.file.size === file.size)) {
        continue;
      }
      next.push({
        file,
        url: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
      });
    }
    onChange(next);
  };

  const remove = (i: number) => {
    const p = files[i];
    if (p.url) URL.revokeObjectURL(p.url);
    onChange(files.filter((_, idx) => idx !== i));
  };

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          add(e.dataTransfer.files);
        }}
        className={`cursor-pointer rounded-lg border border-dashed p-6 text-center transition-colors ${
          dragging ? "border-[var(--acc-blue)] bg-[var(--acc-blue)]/5" : "border-[var(--line)] hover:border-[var(--ink)]"
        }`}
      >
        <i className="ri-upload-cloud-2-line text-2xl text-[var(--slate)]" />
        <p className="mt-2 text-xs text-[var(--slate)]">
          <span className="font-medium text-[var(--ink)]">Click to upload</span> or drag &amp; drop
        </p>
        <p className="mt-1 text-[11px] text-[var(--slate)]">{label}</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => {
            add(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {error && <p className="mt-2 text-xs text-[var(--acc-coral)]">{error}</p>}

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
              <p className="truncate px-2 py-1 text-[10px] text-[var(--slate)]">{p.file.name}</p>
              <button
                type="button"
                onClick={() => remove(i)}
                aria-label={`Remove ${p.file.name}`}
                className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-black/55 text-white backdrop-blur"
              >
                <i className="ri-close-line text-sm" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
