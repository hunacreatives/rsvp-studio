import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ErrorText, Field, Input, OutlineCard, PrimaryButton, Select } from "@/pages/account/portal/ui";
import { parseSpec } from "@/pages/wedding-sites/spec/schema";
import { StudioHeader } from "../StudioLayout";
import { createDraftVersion, getTemplate, templateIdFrom } from "../templatesApi";

const EVENT_TYPES = [
  { id: "wedding", label: "Wedding" },
  { id: "birthday", label: "Birthday" },
  { id: "anniversary", label: "Anniversary" },
  { id: "other", label: "Other" },
];

/**
 * Upload a template: its file (template.json) plus its artwork. Creates a
 * draft — nothing reaches customers until it's previewed and published.
 */
export default function TemplateNewPage() {
  const navigate = useNavigate();
  const specRef = useRef<HTMLInputElement>(null);
  const artRef = useRef<HTMLInputElement>(null);
  const [label, setLabel] = useState("");
  const [tier, setTier] = useState<"free" | "premium">("free");
  const [eventTypes, setEventTypes] = useState<string[]>(["wedding"]);
  const [specFile, setSpecFile] = useState<File | null>(null);
  const [rawSpec, setRawSpec] = useState<unknown>(null);
  const [problems, setProblems] = useState<string[]>([]);
  const [art, setArt] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ?for=<id>: a new version of an existing template (name and ID locked).
  const [params] = useSearchParams();
  const forId = params.get("for");
  useEffect(() => {
    if (!forId) return;
    getTemplate(forId)
      .then(({ template }) => {
        setLabel(template.label);
        setTier(template.tier);
        setEventTypes(template.event_types);
      })
      .catch(() => setError("Couldn't load that template."));
  }, [forId]);

  const id = forId ?? templateIdFrom(label);

  const readSpec = async (file: File | undefined) => {
    setSpecFile(file ?? null);
    setRawSpec(null);
    setProblems([]);
    if (!file) return;
    try {
      const json = JSON.parse(await file.text());
      const parsed = parseSpec(json);
      if ("errors" in parsed) setProblems(parsed.errors);
      else {
        setRawSpec(json);
        if (!forId && !label && typeof json?.label === "string") setLabel(json.label);
        if (parsed.spec.meta.eventTypes.length) setEventTypes(parsed.spec.meta.eventTypes);
      }
    } catch {
      setProblems(["This isn't a valid JSON file."]);
    }
  };

  // Art the template file refers to by name, and whether each was attached.
  const needed = rawSpec
    ? Object.values((rawSpec as { assets?: Record<string, { url: string }> }).assets ?? {})
        .map((a) => a.url)
        .filter((u) => !/^(https?:)?\/\//.test(u) && !u.startsWith("/"))
    : [];
  const missing = needed.filter((n) => !art.some((f) => f.name === n));

  const submit = async () => {
    setError(null);
    if (!label.trim() || id.length < 2) return setError("Give the template a name.");
    if (!rawSpec) return setError("Attach a valid template file.");
    if (missing.length) return setError(`Attach the missing artwork: ${missing.join(", ")}`);
    setBusy(true);
    try {
      await createDraftVersion({ templateId: id, label: label.trim(), tier, eventTypes, rawSpec, files: art, isNew: !forId });
      navigate(`/studio/templates/${id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
      setBusy(false);
    }
  };

  return (
    <>
      <Link to={forId ? `/studio/templates/${forId}` : "/studio/templates"} className="mb-4 inline-flex items-center gap-1 text-[13px] font-medium uppercase tracking-[0.1em] text-[var(--slate)] hover:text-[var(--ink)]">
        <i className="ri-arrow-left-line" /> Templates
      </Link>
      <StudioHeader
        title={forId ? `New version of ${label || "template"}` : "Upload a template"}
        sub={forId ? "Sites already published keep the version they were built with. New sites get this one once you publish it." : "It starts as a draft. You’ll preview it and run the checklist before customers can use it."}
      />

      <OutlineCard className="max-w-3xl p-6 md:p-8">
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Template name" hint={id ? `ID: ${id}` : "Shown to customers in the gallery"}>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Garden Arch" disabled={!!forId} />
          </Field>
          <Field label="Tier">
            <Select value={tier} onChange={(e) => setTier(e.target.value as "free" | "premium")}>
              <option value="free">Free</option>
              <option value="premium">Premium</option>
            </Select>
          </Field>
        </div>

        <div className="mt-5">
          <p className="mb-2 text-[14px] font-medium text-[var(--ink)]">Made for</p>
          <div className="flex flex-wrap gap-2">
            {EVENT_TYPES.map((t) => {
              const on = eventTypes.includes(t.id);
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setEventTypes(on ? eventTypes.filter((x) => x !== t.id) : [...eventTypes, t.id])}
                  className="rounded-full border px-3 py-1 text-[13px]"
                  style={{ borderColor: "var(--ink)", background: on ? "var(--ink)" : "#fff", color: on ? "#fff" : "var(--ink)" }}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <button
            type="button"
            onClick={() => specRef.current?.click()}
            className="rounded-2xl border-2 border-dashed border-[var(--line)] px-5 py-6 text-left hover:border-[var(--ink)]"
          >
            <i className="ri-file-code-line text-2xl text-[var(--ink)]" />
            <p className="mt-2 font-semibold text-[var(--ink)]">{specFile ? specFile.name : "Template file"}</p>
            <p className="text-[13px] text-[var(--slate)]">{rawSpec ? "Valid template ✓" : "template.json — the layout, colours, fonts and text boxes"}</p>
          </button>
          <input ref={specRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => readSpec(e.target.files?.[0])} />

          <button
            type="button"
            onClick={() => artRef.current?.click()}
            className="rounded-2xl border-2 border-dashed border-[var(--line)] px-5 py-6 text-left hover:border-[var(--ink)]"
          >
            <i className="ri-image-2-line text-2xl text-[var(--ink)]" />
            <p className="mt-2 font-semibold text-[var(--ink)]">{art.length ? `${art.length} artwork file${art.length === 1 ? "" : "s"}` : "Artwork"}</p>
            <p className="text-[13px] text-[var(--slate)]">The images the template file refers to (WebP or PNG)</p>
          </button>
          <input
            ref={artRef}
            type="file"
            multiple
            accept="image/webp,image/png,image/jpeg,image/svg+xml,video/mp4"
            className="hidden"
            onChange={(e) => setArt(Array.from(e.target.files ?? []))}
          />
        </div>

        {problems.length ? (
          <div className="mt-5 rounded-2xl bg-[#fff3f0] px-5 py-4 text-[13px] text-[#c2412d]">
            <p className="font-semibold">The template file has problems:</p>
            <ul className="mt-1 list-disc pl-5">
              {problems.slice(0, 12).map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </div>
        ) : null}
        {rawSpec && needed.length ? (
          <p className="mt-4 text-[13px] text-[var(--slate)]">
            Artwork needed: {needed.map((n) => (missing.includes(n) ? `${n} (missing)` : `${n} ✓`)).join(" · ")}
          </p>
        ) : null}

        <ErrorText>{error}</ErrorText>
        <PrimaryButton className="mt-6" onClick={submit} disabled={busy}>
          {busy ? "Uploading…" : "Create draft"}
        </PrimaryButton>
      </OutlineCard>
    </>
  );
}
