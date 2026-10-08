import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { ErrorText, FilterTabs, Field, Input, OutlineCard, PillButton, PrimaryButton, Select } from "@/pages/account/portal/ui";
import PreviewCanvas from "@/pages/wedding-sites/builder/components/PreviewCanvas";
import { normalizeEventContent } from "@/pages/wedding-sites/content/normalize";
import { isabellaAndMateo } from "@/pages/wedding-sites/content/fixtures/isabella-and-mateo";
import type { EventContent } from "@/pages/wedding-sites/content/types";
import { defaultSectionVisibility } from "@/pages/wedding-sites/presentation/types";
import { BINDING_FIELDS, BINDING_INFO, type BindingField } from "@/pages/wedding-sites/spec/bindings";
import SpecTemplate from "@/pages/wedding-sites/spec/runtime/SpecTemplate";
import { parseSpec, type TemplateSpec } from "@/pages/wedding-sites/spec/schema";
import { StudioHeader } from "../StudioLayout";
import { createDraftVersion, templateIdFrom } from "../templatesApi";
import { assembleSpec, type AiLayer, type AiResult } from "./importer/assemble";
import { detectText, type Detection } from "./importer/detect";
import { measureLayers, type LineMetrics } from "./importer/measure";
import { FIXTURES } from "./checks";

type Stage = "upload" | "measuring" | "thinking" | "review";

/**
 * Studio → Templates → Import a design with AI. The designer's two exports
 * (with and without text) are measured in the browser; Claude labels what
 * each piece of text is; staff review the result against the original and
 * save it as a draft — then the normal checklist + publish flow takes over.
 */
export default function TemplateImportPage() {
  const navigate = useNavigate();
  const [label, setLabel] = useState("");
  const [tier, setTier] = useState<"free" | "premium">("free");
  const [hint, setHint] = useState("");
  const [designFile, setDesignFile] = useState<File | null>(null);
  const [artFile, setArtFile] = useState<File | null>(null);
  const [stage, setStage] = useState<Stage>("upload");
  const [det, setDet] = useState<Detection | null>(null);
  const [ai, setAi] = useState<AiResult | null>(null);
  const [metrics, setMetrics] = useState<LineMetrics[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const askAi = async (d: Detection) => {
    setStage("thinking");
    const { data } = await supabase.auth.getSession();
    const r = await fetch("/api/template-ai", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${data.session?.access_token ?? ""}` },
      body: JSON.stringify({
        tiles: d.tiles,
        width: d.width,
        height: d.height,
        hint: hint.trim() || undefined,
        boxes: d.boxes.map((b) => ({ n: b.n, x: +b.x.toFixed(3), y: +b.y.toFixed(3), w: +b.w.toFixed(3), h: +b.h.toFixed(3), color: b.color })),
      }),
    });
    const out = await r.json().catch(() => ({ error: `The AI request failed (${r.status}).` }));
    if (!r.ok || !out.result) throw new Error(out.error ?? "The AI request failed.");
    setAi(out.result as AiResult);
    setStage("review");
  };

  const analyse = async () => {
    setError(null);
    if (!label.trim()) return setError("Give the template a name.");
    if (!designFile || !artFile) return setError("Add both images.");
    try {
      setStage("measuring");
      const d = await detectText(designFile, artFile);
      setDet(d);
      await askAi(d);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setStage(det && ai ? "review" : "upload");
    }
  };

  // Re-measure whenever the wording or fonts change (not on palette/role edits).
  const measureKey = ai ? JSON.stringify([ai.fonts.display.family, ai.fonts.body.family, ai.layers.map((l) => [l.lines, l.font, l.weight, l.italic, l.uppercase, l.letterSpacing])]) : "";
  useEffect(() => {
    if (!ai) return;
    let live = true;
    measureLayers(ai).then((m) => live && setMetrics(m));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [measureKey]);
  const rawSpec = useMemo(() => (det && ai ? assembleSpec(det, ai, metrics) : null), [det, ai, metrics]);
  const artUrl = useMemo(() => (det ? URL.createObjectURL(det.art) : null), [det]);
  useEffect(() => () => void (artUrl && URL.revokeObjectURL(artUrl)), [artUrl]);
  const parsed = useMemo(() => {
    if (!rawSpec || !artUrl) return null;
    const preview = { ...rawSpec, assets: { artwork: { ...rawSpec.assets.artwork, url: artUrl } } };
    return parseSpec(preview);
  }, [rawSpec, artUrl]);
  const spec = parsed && "spec" in parsed ? parsed.spec : null;

  const save = async () => {
    if (!rawSpec || !det || !ai) return;
    setSaving(true);
    setError(null);
    try {
      const id = templateIdFrom(label);
      await createDraftVersion({ templateId: id, label: label.trim(), tier, eventTypes: ai.eventTypes, rawSpec, files: [det.art], isNew: true });
      navigate(`/studio/templates/${id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save.");
      setSaving(false);
    }
  };

  const updateLayer = (i: number, patch: Partial<AiLayer>) =>
    setAi((cur) => (cur ? { ...cur, layers: cur.layers.map((l, j) => (j === i ? { ...l, ...patch } : l)) } : cur));

  return (
    <>
      <Link to="/studio/templates" className="mb-4 inline-flex items-center gap-1 text-[13px] font-medium uppercase tracking-[0.1em] text-[var(--slate)] hover:text-[var(--ink)]">
        <i className="ri-arrow-left-line" /> Templates
      </Link>
      <StudioHeader
        title="Import a design with AI"
        sub="Upload the design twice — once as it is, once with the text hidden. The AI makes the text editable; you check it and save a draft."
      />

      {stage !== "review" ? (
        <OutlineCard className="max-w-3xl p-6 md:p-8">
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Template name" hint={label ? `ID: ${templateIdFrom(label)}` : "Shown to customers in the gallery"}>
              <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Garden Arch" />
            </Field>
            <Field label="Tier">
              <Select value={tier} onChange={(e) => setTier(e.target.value as "free" | "premium")}>
                <option value="free">Free</option>
                <option value="premium">Premium</option>
              </Select>
            </Field>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <DropZone icon="ri-image-line" title="Full design" sub="Exactly as guests should see it, with sample names and date" file={designFile} onFile={setDesignFile} />
            <DropZone icon="ri-image-edit-line" title="Same design, text hidden" sub="Everything else stays exactly in place" file={artFile} onFile={setArtFile} />
          </div>
          <details className="mt-4 text-[13px] text-[var(--slate)]">
            <summary className="cursor-pointer font-medium text-[var(--ink)]">How to export the two images</summary>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Canva: Share → Download → PNG. Then select the text you want customers to change, plus any wording, delete it, and download again. Undo afterwards.</li>
              <li>Figma / Illustrator: export the frame as PNG, hide the text layers, export again at the same size.</li>
              <li>Text you leave in the second image stays part of the artwork and can’t be edited.</li>
              <li>Phone-shaped designs (portrait) work best. Keep straight (unrotated) text for anything customers will change.</li>
            </ul>
          </details>

          <div className="mt-5">
            <Field label="Anything the AI should know? (optional)">
              <Input value={hint} onChange={(e) => setHint(e.target.value)} placeholder="e.g. A 1st birthday for one child; the script font is Great Vibes" />
            </Field>
          </div>

          <ErrorText>{error}</ErrorText>
          <PrimaryButton className="mt-6" onClick={analyse} disabled={stage !== "upload"}>
            {stage === "measuring" ? "Finding the text…" : stage === "thinking" ? "AI is reading the design…" : "Analyse design"}
          </PrimaryButton>
          {stage === "thinking" ? <p className="mt-3 text-[13px] text-[var(--slate)]">Found {det?.boxes.length} pieces of text. This usually takes 20–60 seconds.</p> : null}
        </OutlineCard>
      ) : null}

      {stage === "review" && det && ai ? (
        <div className="grid gap-6 xl:grid-cols-[1fr_400px]">
          <ReviewPreview spec={spec} det={det} ai={ai} errors={parsed && "errors" in parsed ? parsed.errors : []} />
          <aside className="space-y-5">
            <OutlineCard className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[var(--slate)]">Text ({ai.layers.length})</p>
                <PillButton onClick={() => askAi(det).catch((e: Error) => (setError(e.message), setStage("review")))}>Ask AI again</PillButton>
              </div>
              <div className="max-h-[52vh] space-y-3 overflow-y-auto pr-1">
                {ai.layers.map((l, i) => (
                  <LayerRow key={i} layer={l} onChange={(p) => updateLayer(i, p)} />
                ))}
              </div>
            </OutlineCard>

            {ai.notes.length ? (
              <OutlineCard className="p-5">
                <p className="mb-2 text-[13px] font-semibold uppercase tracking-[0.08em] text-[var(--slate)]">Double-check</p>
                <ul className="list-disc space-y-1 pl-5 text-[13px] text-[var(--ink)]">
                  {ai.notes.map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
              </OutlineCard>
            ) : null}

            <OutlineCard className="p-5">
              <p className="mb-3 text-[13px] font-semibold uppercase tracking-[0.08em] text-[var(--slate)]">Fonts & colours</p>
              {(["display", "body"] as const).map((k) => (
                <label key={k} className="mb-2 flex items-center gap-2 text-[13px]">
                  <span className="w-16 text-[var(--slate)]">{k === "display" ? "Headline" : "Text"}</span>
                  <Input
                    value={ai.fonts[k].family}
                    onChange={(e) => setAi({ ...ai, fonts: { ...ai.fonts, [k]: { ...ai.fonts[k], family: e.target.value } } })}
                  />
                </label>
              ))}
              <div className="mt-3 flex flex-wrap gap-2">
                {(Object.keys(ai.palette) as (keyof AiResult["palette"])[]).map((k) => (
                  <label key={k} className="flex flex-col items-center gap-1 text-[11px] text-[var(--slate)]">
                    <input
                      type="color"
                      value={ai.palette[k]}
                      onChange={(e) => setAi({ ...ai, palette: { ...ai.palette, [k]: e.target.value } })}
                      className="h-8 w-10 cursor-pointer rounded border border-[var(--line)]"
                    />
                    {k}
                  </label>
                ))}
              </div>
            </OutlineCard>

            <OutlineCard className="p-5">
              <ErrorText>{error}</ErrorText>
              <PrimaryButton className="w-full" onClick={save} disabled={saving || !spec}>
                {saving ? "Saving…" : "Save as draft"}
              </PrimaryButton>
              <p className="mt-2 text-[12px] text-[var(--slate)]">Next you’ll run the checklist and publish it to the gallery.</p>
              <button onClick={() => setStage("upload")} className="mt-3 text-[13px] text-[var(--slate)] underline">
                Start over with different images
              </button>
            </OutlineCard>
          </aside>
        </div>
      ) : null}
    </>
  );
}

function DropZone({ icon, title, sub, file, onFile }: { icon: string; title: string; sub: string; file: File | null; onFile: (f: File | null) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => ref.current?.click()}
        onDragOver={(e) => (e.preventDefault(), setOver(true))}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          onFile(e.dataTransfer.files[0] ?? null);
        }}
        className="rounded-2xl border-2 border-dashed px-5 py-6 text-left hover:border-[var(--ink)]"
        style={{ borderColor: over ? "var(--ink)" : "var(--line)" }}
      >
        <i className={`${icon} text-2xl text-[var(--ink)]`} />
        <p className="mt-2 font-semibold text-[var(--ink)]">{title}</p>
        <p className="truncate text-[13px] text-[var(--slate)]">{file ? `${file.name} ✓` : sub}</p>
      </button>
      <input ref={ref} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="hidden" onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
    </>
  );
}

const ROLE_OPTIONS: { value: string; label: string }[] = [
  { value: "static", label: "Fixed wording" },
  ...BINDING_FIELDS.map((f) => ({ value: f, label: BINDING_INFO[f].label })),
  { value: "ignore", label: "Not text — ignore" },
];

function LayerRow({ layer, onChange }: { layer: AiLayer; onChange: (p: Partial<AiLayer>) => void }) {
  const value = layer.role === "field" ? layer.field ?? "static" : layer.role;
  const formats = layer.role === "field" && layer.field ? BINDING_INFO[layer.field].formats : undefined;
  const scale = layer.scale ?? 1;
  return (
    <div className="rounded-xl border border-[var(--line)] p-3" style={{ opacity: layer.role === "ignore" ? 0.5 : 1 }}>
      <div className="flex items-start gap-2">
        <span className="shrink-0 rounded bg-[#ff00aa] px-1.5 text-[11px] font-bold leading-5 text-white">{layer.boxes.join(",")}</span>
        <p className="line-clamp-2 text-[13px] text-[var(--ink)]">{layer.lines.join(" / ")}</p>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <select
          value={value}
          onChange={(e) => {
            const v = e.target.value;
            if (v === "static" || v === "ignore") onChange({ role: v, field: undefined, format: undefined });
            else onChange({ role: "field", field: v as BindingField, format: BINDING_INFO[v as BindingField].formats?.[0]?.id });
          }}
          className="rounded-full border border-[var(--line)] bg-white px-2.5 py-1 text-[12px]"
        >
          {ROLE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {formats ? (
          <select value={layer.format ?? formats[0].id} onChange={(e) => onChange({ format: e.target.value })} className="rounded-full border border-[var(--line)] bg-white px-2.5 py-1 text-[12px]">
            {formats.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
        ) : null}
        {layer.role !== "ignore" ? (
          <span className="ml-auto inline-flex items-center gap-1 text-[12px] text-[var(--slate)]">
            Size
            <button className="h-6 w-6 rounded-full border border-[var(--line)]" onClick={() => onChange({ scale: +(scale - 0.05).toFixed(2) })}>
              −
            </button>
            {Math.round(scale * 100)}%
            <button className="h-6 w-6 rounded-full border border-[var(--line)]" onClick={() => onChange({ scale: +(scale + 0.05).toFixed(2) })}>
              +
            </button>
          </span>
        ) : null}
      </div>
    </div>
  );
}

/** The design's own wording as event content, so the comparison view
 *  should match the original exactly when the template is right. */
function designContent(ai: AiResult): EventContent {
  const base = normalizeEventContent(isabellaAndMateo);
  const text = (field: string, format?: string) => ai.layers.find((l) => l.role === "field" && l.field === field && (!format || l.format === format))?.lines.join(" ");
  const names = text("hosts.names");
  const h0 = text("hosts.0.name");
  const h1 = text("hosts.1.name");
  const joiner = ai.layers.find((l) => l.field === "hosts.names")?.joiner ?? "&";
  const hostNames = h0 || h1 ? [h0, h1].filter(Boolean) : names ? names.split(new RegExp(`\\s*(?:${joiner.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}|\\n)\\s*`, "i")) : [];
  const venue = text("venue.name") ?? text("venue.nameOrAddress");
  return {
    ...base,
    eventDate: designDate(ai) ?? base.eventDate,
    hosts: hostNames.length ? hostNames.map((name, i) => ({ id: `h${i}`, name: name as string })) : base.hosts,
    primaryLocation: { ...base.primaryLocation, name: venue ?? base.primaryLocation.name, addressLine: text("venue.address") ?? base.primaryLocation.addressLine },
  };
}

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/** Rebuild the design's own date from its date pieces (day / month / year / time, or a full date). */
function designDate(ai: AiResult): string | undefined {
  const pieces = ai.layers.filter((l) => l.role === "field" && l.field === "eventDate");
  const get = (...formats: string[]) => pieces.find((l) => formats.includes(l.format ?? "long"))?.lines.join(" ");
  const full = get("long", "medium", "numeric");
  let y: number | undefined, m: number | undefined, d: number | undefined;
  if (full) {
    const numeric = full.match(/(\d{1,2})[./-](\d{1,2})[./-](\d{4})/);
    const parsed = new Date(full.replace(/(\d)(st|nd|rd|th)\b/gi, "$1"));
    if (numeric) [d, m, y] = [+numeric[1], +numeric[2] - 1, +numeric[3]];
    else if (!Number.isNaN(parsed.getTime())) [y, m, d] = [parsed.getFullYear(), parsed.getMonth(), parsed.getDate()];
  }
  const day = get("day")?.match(/\d{1,2}/)?.[0];
  const month = get("month", "monthShort")?.trim().slice(0, 3).toLowerCase();
  const year = get("year")?.match(/\d{4}/)?.[0];
  if (day) d = +day;
  if (month && MONTHS.includes(month)) m = MONTHS.indexOf(month);
  if (year) y = +year;
  if (y === undefined || m === undefined || d === undefined) return undefined;
  let hh = 0, mm = 0;
  const t = get("time")?.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)?/i);
  if (t) {
    hh = +t[1] % 12 + (/p/i.test(t[3] ?? "") ? 12 : 0);
    mm = +(t[2] ?? 0);
  }
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${y}-${pad(m + 1)}-${pad(d)}T${pad(hh)}:${pad(mm)}:00`;
}

function ReviewPreview({ spec, det, ai, errors }: { spec: TemplateSpec | null; det: Detection; ai: AiResult; errors: string[] }) {
  const [mode, setMode] = useState<"compare" | "site">("compare");
  const [fixtureId, setFixtureId] = useState(FIXTURES[0].id);
  const [mix, setMix] = useState(0.5);
  const [difference, setDifference] = useState(false);
  const own = useMemo(() => designContent(ai), [ai]);
  const heroOnly = useMemo(() => (spec ? { ...spec, sections: spec.sections.filter((s) => s.kind === "canvas") } : null), [spec]);
  const wrap = useRef<HTMLDivElement>(null);
  const [canvasRect, setCanvasRect] = useState<{ left: number; top: number; width: number } | null>(null);

  // Find the rendered canvas so the original can sit exactly on top of it.
  useLayoutEffect(() => {
    if (mode !== "compare" || !wrap.current) return;
    const el = wrap.current;
    const measure = () => {
      const canvas = el.querySelector<HTMLElement>("[data-spec-root] section > div");
      if (!canvas) return;
      const a = el.getBoundingClientRect();
      const b = canvas.getBoundingClientRect();
      setCanvasRect({ left: b.left - a.left, top: b.top - a.top, width: b.width });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [mode, heroOnly]);

  if (!spec || !heroOnly) {
    return (
      <div className="rounded-[22px] border border-[var(--line)] bg-white p-6 text-[13px] text-[#c2412d]">
        <p className="font-semibold">The generated template has problems:</p>
        <ul className="mt-1 list-disc pl-5">
          {errors.slice(0, 10).map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      </div>
    );
  }
  const fixture = FIXTURES.find((f) => f.id === fixtureId) ?? FIXTURES[0];
  const settings = { paletteId: spec.tokens.defaultPaletteId, fontPairingId: "", sectionVisibility: { ...defaultSectionVisibility } };

  return (
    <section className="min-w-0">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <FilterTabs<"compare" | "site">
          value={mode}
          onChange={setMode}
          options={[
            { value: "compare", label: "Compare with original" },
            { value: "site", label: "Full website" },
          ]}
        />
        {mode === "compare" ? (
          <>
            <label className="flex items-center gap-2 text-[13px] text-[var(--slate)]">
              Template
              <input type="range" min={0} max={1} step={0.01} value={mix} onChange={(e) => setMix(+e.target.value)} disabled={difference} />
              Original
            </label>
            <label className="flex items-center gap-1.5 text-[13px] text-[var(--slate)]">
              <input type="checkbox" checked={difference} onChange={(e) => setDifference(e.target.checked)} />
              Show differences
            </label>
          </>
        ) : (
          <select value={fixtureId} onChange={(e) => setFixtureId(e.target.value)} className="rounded-full border border-[var(--line)] bg-white px-3 py-1.5 text-[13px]">
            {FIXTURES.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label}
              </option>
            ))}
          </select>
        )}
      </div>

      {mode === "compare" ? (
        <div className="rounded-[22px] border border-[var(--line)] bg-white p-4">
          <div ref={wrap} className="relative mx-auto" style={{ width: det.width > det.height ? "100%" : "min(100%, 520px)" }}>
            <SpecTemplate spec={heroOnly} content={own} settings={settings} />
            {canvasRect ? (
              <img
                src={det.designUrl}
                alt="Original design"
                className="pointer-events-none absolute"
                style={{
                  left: canvasRect.left,
                  top: canvasRect.top,
                  width: canvasRect.width,
                  zIndex: 60, // above every template layer (layers use z 0–50)
                  opacity: difference ? 1 : mix,
                  mixBlendMode: difference ? "difference" : "normal",
                }}
              />
            ) : null}
          </div>
          <p className="mt-3 text-center text-[12px] text-[var(--slate)]">
            {difference ? "Black means a perfect match; bright outlines show text that’s off." : "Slide to fade between the template (with the design’s own wording) and the original."}
          </p>
        </div>
      ) : (
        <div className="flex h-[78vh] flex-col overflow-hidden rounded-[22px] border border-[var(--line)]">
          <PreviewCanvas deviceWidth={390}>
            <SpecTemplate spec={spec} content={fixture.content} editorPreview={fixture.editor} settings={settings} />
          </PreviewCanvas>
        </div>
      )}
    </section>
  );
}
