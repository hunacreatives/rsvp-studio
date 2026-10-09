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
import { parseSpec, type FontSlot, type TemplateSpec } from "@/pages/wedding-sites/spec/schema";
import { StudioHeader } from "../StudioLayout";
import { createDraftVersion, templateIdFrom } from "../templatesApi";
import { assembleSpec, curvedToArt, type AiLayer, type AiResult } from "./importer/assemble";
import { detectText, type DetectedBox, type Detection } from "./importer/detect";
import { matchFonts } from "./importer/fontMatch";
import { measureLayers, type LineMetrics } from "./importer/measure";
import { analyseSvg, type SvgAnalysis } from "./importer/svg";
import { toWebsite } from "./importer/website";
import { alphaShape, buildSvgLayers, measureShadow, renderTextMask, svgContext, svgDetection, type SvgBuild } from "./importer/svgImport";
import { FIXTURES } from "./checks";
import { useFidelityHook } from "./importer/fidelityHook";
import { mergeVersions, phoneFiles, phonePhotoPicks, reconcilePhone } from "./importer/pair";
import { withControls } from "./importer/controls";

type Stage = "upload" | "measuring" | "thinking" | "finishing" | "phone" | "review";
/** The phone version of a two-version design, traced on its own. */
interface PhoneVersion {
  a: SvgAnalysis;
  det: Detection;
  /** The AI's reading of the phone file (tied to the desktop's at assembly). */
  raw: AiResult;
  build: SvgBuild;
}
type Mode = "svg" | "images";

/** Share of the smaller box covered by the other. */
const overlapShare = (a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) => {
  const ix = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
  const iy = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  return (ix * iy) / Math.min(a.w * a.h, b.w * b.h);
};

const layersKey = (text: number[], photos: { p: number }[]) => `${text.join(",")}|${photos.map((p) => p.p).join(",")}`;

/**
 * Boxes whose letters come out of the artwork: the ones kept as text, plus
 * any same-colour fragment sitting mostly inside one of them (rising
 * handwriting can split a name into overlapping boxes; the AI may drop the
 * fragment, but its letters must not stay behind as a ghost).
 */
const removalBoxes = (ai: AiResult, boxes: DetectedBox[]) => {
  const kept = new Set(textBoxes(ai));
  const keptBoxes = boxes.filter((b) => kept.has(b.n));
  for (const b of boxes) {
    if (kept.has(b.n)) continue;
    const host = keptBoxes.find((k) => k.color === b.color && overlapShare(k, b) > 0.6 && k.w * k.h >= b.w * b.h);
    if (host) kept.add(b.n);
  }
  return [...kept].sort((x, y) => x - y);
};

/** Box numbers the AI kept as text (everything else stays in the artwork). */
const textBoxes = (ai: AiResult) => [...new Set(ai.layers.filter((l) => l.role !== "ignore").flatMap((l) => l.boxes))].sort((a, b) => a - b);

/**
 * Studio → Templates → Import a design with AI. Either ONE SVG file (its
 * letters are found from the file's structure and removed for clean art) or
 * two image exports (with and without text, diffed). Claude labels what each
 * piece of text is; fonts are confirmed by test-rendering; staff review the
 * result against the original and save a draft — then the normal checklist
 * + publish flow takes over.
 */
export default function TemplateImportPage() {
  const navigate = useNavigate();
  const [label, setLabel] = useState("");
  const [tier, setTier] = useState<"free" | "premium">("free");
  const [hint, setHint] = useState("");
  const [mode, setMode] = useState<Mode>("svg");
  const [svgFile, setSvgFile] = useState<File | null>(null);
  const [mobileFile, setMobileFile] = useState<File | null>(null);
  const [phone, setPhone] = useState<PhoneVersion | null>(null);
  const [phoneMetrics, setPhoneMetrics] = useState<LineMetrics[]>([]);
  const [svgA, setSvgA] = useState<SvgAnalysis | null>(null);
  const [build, setBuild] = useState<SvgBuild | null>(null);
  // Website mode: tall, page-shaped designs become real responsive websites
  // (art-heavy bands inside them stay traced). Cards stay traced.
  const [websiteMode, setWebsiteMode] = useState(true);
  const [designFile, setDesignFile] = useState<File | null>(null);
  const [artFile, setArtFile] = useState<File | null>(null);
  const [stage, setStage] = useState<Stage>("upload");
  const [det, setDet] = useState<Detection | null>(null);
  const [ai, setAi] = useState<AiResult | null>(null);
  const [metrics, setMetrics] = useState<LineMetrics[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [score, setScore] = useState<MatchScore | null>(null);

  const askAi = async (d: Pick<Detection, "tiles" | "width" | "height" | "boxes">, m: Mode, a: SvgAnalysis | null = svgA, note?: string): Promise<AiResult> => {
    setStage("thinking");
    const { data } = await supabase.auth.getSession();
    const r = await fetch("/api/template-ai", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${data.session?.access_token ?? ""}` },
      body: JSON.stringify({
        tiles: d.tiles,
        width: d.width,
        height: d.height,
        hint: [note, hint.trim()].filter(Boolean).join(" ") || undefined,
        mode: m,
        ...(m === "svg" && a ? svgContext(a) : {}),
        boxes: d.boxes.map((b) => ({ n: b.n, x: +b.x.toFixed(3), y: +b.y.toFixed(3), w: +b.w.toFixed(3), h: +b.h.toFixed(3), color: b.color })),
      }),
    });
    const out = await r.json().catch(() => ({ error: `The AI request failed (${r.status}).` }));
    if (!r.ok || !out.result) throw new Error(out.error ?? "The AI request failed.");
    return out.result as AiResult;
  };

  /** SVG import: remove the confirmed text for clean art, recreate shadows, match fonts. */
  const finishSvg = async (a: SvgAnalysis, base: Omit<Detection, "art" | "artSize">, result: AiResult): Promise<AiResult> => {
    setStage("finishing");
    result = curvedToArt(result, base.boxes);
    const kept = removalBoxes(result, base.boxes);
    // A frame (PNG) sitting on a photo (JPEG): the photo is the slot.
    const picks = (result.photos ?? []).map((x) => {
      const pic = a.pictures.find((p) => p.n === x.p);
      if (!pic || pic.format === "jpeg") return x;
      const photo = a.pictures.find((p) => p.format === "jpeg" && p.n !== pic.n && overlapShare(p, pic) > 0.6);
      return photo && !(result.photos ?? []).some((y) => y.p === photo.n) ? { ...x, p: photo.n } : x;
    });
    // Never a photo slot: background textures, or transparent PNGs (stickers,
    // illustrations — real photos have no see-through areas).
    const rejected: string[] = [];
    const checked = await Promise.all(
      picks.map(async (x) => {
        const pic = a.pictures.find((p) => p.n === x.p);
        if (!pic || pic.background || pic.masked) return rejected.push(`P${x.p}`), null;
        // See-through means a sticker or illustration, unless it's a photo cut to an oval.
        const shape = await alphaShape(pic.src, pic.crop);
        if (shape.clear > 0.1 && !shape.oval) return rejected.push(`P${x.p}`), null;
        return shape.clear > 0.1 ? { ...x, oval: true, fit: shape.fit } : x;
      }),
    );
    result = {
      ...result,
      photos: checked.filter((x): x is NonNullable<typeof x> => !!x),
      notes: rejected.length ? [...result.notes, `Kept ${rejected.join(", ")} as artwork: see-through illustrations or background textures can't be photo slots.`] : result.notes,
    };
    const b = await buildSvgLayers(a, kept, result.photos ?? [], Object.fromEntries((result.bands ?? []).map((x) => [x.b, x.key])));
    const layers = await Promise.all(
      result.layers.map(async (l) => {
        if (l.role === "ignore") return l;
        for (const n of l.boxes) {
          const shadow = await measureShadow(a, n);
          if (shadow) return { ...l, shadow };
        }
        return l;
      }),
    );
    const byK = new Map(a.leaves.map((l) => [l.k, l]));
    const glyphs = new Map(a.candidates.map((c) => [c.n, c.ks.map((k) => byK.get(k)!).filter(Boolean).sort((p, q) => p.x - q.x)]));
    const fm = await matchFonts({ ...result, layers }, base.boxes, await renderTextMask(a, kept), glyphs);
    const SLOT_NAME = { display: "Headline", body: "Text", accent: "Accent", extra: "Extra" } as const;
    const fontNotes = fm.report.map(
      (r) =>
        `${SLOT_NAME[r.slot]} font: ${r.family} (${Math.round(r.score * 100)}% match${r.others.length ? `; also tried ${r.others.map(([f, v]) => `${f} ${Math.round(v * 100)}%`).join(", ")}` : ""}).`,
    );
    setBuild(b);
    setDet({ ...base, art: b.bands[0].art, artSize: b.bands[0].artSize });
    artKey.current = layersKey(kept, result.photos ?? []);
    const final: AiResult = {
      ...result,
      fonts: { ...fm.fonts, display: fm.fonts.display!, body: fm.fonts.body! },
      layers: layers.map((l, i) => (fm.layers[i] ? { ...l, font: fm.layers[i].font, weight: fm.layers[i].weight } : l)),
      available: fm.available,
      fontScore: fm.report.length ? fm.report.reduce((t, r) => t + r.score, 0) / fm.report.length : undefined,
      // The AI's own font guesses are superseded by the measured match.
      notes: [...fontNotes, ...result.notes.filter((n) => !/\bfont|typeface|\bface\b/i.test(n))],
    };
    setAi(final);
    return final;
  };

  /**
   * The phone version of the design (optional second file): traced like the
   * desktop one, read by the AI for its text, with its photo slots matched to
   * the desktop's by image so one set of photos fills both.
   */
  const importPhone = async (file: File, deskA: SvgAnalysis, desk: AiResult): Promise<PhoneVersion> => {
    setStage("phone");
    const a = await analyseSvg(file);
    if (!a.candidates.length) throw new Error("Couldn't find any text shapes in the phone version's SVG.");
    const base = await svgDetection(a);
    const raw = curvedToArt(await askAi(base, "svg", a, "This file is the PHONE version of the design: the same wording and photos, laid out for a phone screen."), base.boxes);
    setStage("phone");
    const picks = await Promise.all(
      phonePhotoPicks(deskA, desk.photos ?? [], a).map(async (x) => {
        const pic = a.pictures.find((p) => p.n === x.p)!;
        const shape = await alphaShape(pic.src, pic.crop);
        return shape.clear > 0.1 && shape.oval ? { ...x, oval: true, fit: shape.fit } : x;
      }),
    );
    const kept = removalBoxes(raw, base.boxes);
    const build = await buildSvgLayers(a, kept, picks, Object.fromEntries((raw.bands ?? []).map((x) => [x.b, x.key])));
    const layers = await Promise.all(
      raw.layers.map(async (l) => {
        if (l.role === "ignore") return l;
        for (const n of l.boxes) {
          const shadow = await measureShadow(a, n);
          if (shadow) return { ...l, shadow };
        }
        return l;
      }),
    );
    return { a, det: { ...base, art: build.bands[0].art, artSize: build.bands[0].artSize }, raw: { ...raw, layers, photos: picks }, build };
  };

  const analyse = async () => {
    setError(null);
    if (!label.trim()) return setError("Give the template a name.");
    try {
      if (mode === "svg") {
        if (!svgFile) return setError("Add the SVG file.");
        setStage("measuring");
        const a = await analyseSvg(svgFile);
        // A tall, desktop-width design is a website; phone-width ones already fit phones.
        setWebsiteMode(a.width >= 700 && a.height / a.width >= 1.6);
        if (!a.candidates.length) throw new Error("Couldn't find any text shapes in this SVG. If the text was flattened into a picture, use the two-image method instead.");
        setSvgA(a);
        const base = await svgDetection(a);
        setDet({ ...base, art: new File([], "artwork.webp"), artSize: { w: base.width, h: base.height } });
        const desk = await finishSvg(a, base, await askAi(base, "svg", a));
        setPhone(null);
        if (mobileFile) {
          // Two versions: both are traced exactly; no automatic phone layout.
          setWebsiteMode(false);
          setPhone(await importPhone(mobileFile, a, desk));
        }
        setStage("review");
      } else {
        if (!designFile || !artFile) return setError("Add both images.");
        setStage("measuring");
        const d = await detectText(designFile, artFile);
        setDet(d);
        setAi(await askAi(d, "images"));
        setStage("review");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setStage(det && ai ? "review" : "upload");
    }
  };

  const retryAi = async () => {
    if (!det) return;
    setError(null);
    try {
      if (mode === "svg" && svgA) {
        await finishSvg(svgA, det, await askAi(det, "svg"));
        setStage("review");
      }
      else {
        setAi(await askAi(det, "images"));
        setStage("review");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setStage("review");
    }
  };

  // SVG import: when a box is switched to/from "not text", or a picture
  // to/from "customer photo", rebuild the layers so the art matches.
  const artKey = useRef("");
  const keptKey = ai && mode === "svg" && det ? layersKey(removalBoxes(ai, det.boxes), ai.photos ?? []) : "";
  useEffect(() => {
    if (!svgA || !ai || !keptKey || stage !== "review" || keptKey === artKey.current) return;
    let live = true;
    const t = setTimeout(async () => {
      const b = await buildSvgLayers(svgA, removalBoxes(ai, det!.boxes), ai.photos ?? [], Object.fromEntries((ai.bands ?? []).map((x) => [x.b, x.key])));
      // The phone version follows the same choices (its text roles come from the desktop's).
      const pb =
        phone && phoneAi
          ? await buildSvgLayers(phone.a, removalBoxes(phoneAi, phone.det.boxes), phone.raw.photos ?? [], Object.fromEntries((phone.raw.bands ?? []).map((x) => [x.b, x.key])))
          : null;
      if (!live) return;
      artKey.current = keptKey;
      setBuild(b);
      setDet((d) => (d ? { ...d, art: b.bands[0].art, artSize: b.bands[0].artSize } : d));
      if (pb) setPhone((ph) => (ph ? { ...ph, build: pb, det: { ...ph.det, art: pb.bands[0].art, artSize: pb.bands[0].artSize } } : ph));
    }, 300);
    return () => {
      live = false;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keptKey, svgA, stage]);

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
  const svgBuild = mode === "svg" ? build : null;
  // Two-version designs: the phone text follows the desktop's labels (edits on the review screen included).
  const phoneAi = useMemo(() => (phone && ai ? reconcilePhone(ai, phone.raw) : null), [phone, ai]);
  const phoneMeasureKey = phoneAi ? JSON.stringify([phoneAi.fonts.display.family, phoneAi.fonts.body.family, phoneAi.layers.map((l) => [l.lines, l.font, l.weight, l.italic, l.uppercase, l.letterSpacing])]) : "";
  useEffect(() => {
    if (!phoneAi) return setPhoneMetrics([]);
    let live = true;
    measureLayers(phoneAi).then((m) => live && setPhoneMetrics(m));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phoneMeasureKey]);
  const rawSpec = useMemo(() => {
    if (!det || !ai) return null;
    const assembled = assembleSpec(det, ai, metrics, svgBuild ?? undefined);
    // Drawn forms and buttons become real controls over the drawing.
    const live = (raw: ReturnType<typeof assembleSpec>, a: SvgAnalysis, b: SvgBuild) => withControls(raw, a, b).raw as typeof raw;
    if (phone && phoneAi && svgBuild && svgA) return mergeVersions(live(assembled, svgA, svgBuild), live(assembleSpec(phone.det, phoneAi, phoneMetrics, phone.build), phone.a, phone.build));
    // Website mode: rebuild traced bands as real responsive sections.
    if (!svgBuild || !svgA) return assembled;
    return live(websiteMode ? (toWebsite(assembled, svgA, svgBuild) as typeof assembled) : assembled, svgA, svgBuild);
  }, [det, ai, metrics, svgBuild, websiteMode, svgA, phone, phoneAi, phoneMetrics]);
  // Every art file the template uses (background per band + on-top layers).
  const files = useMemo(
    () => (svgBuild ? [...svgBuild.bands.map((b) => b.art), ...svgBuild.overlays.map((o) => o.file), ...(phone ? phoneFiles(phone.build) : [])] : det ? [det.art] : []),
    [svgBuild, det, phone],
  );
  const fileUrls = useMemo(() => new Map(files.map((f) => [f.name, URL.createObjectURL(f)])), [files]);
  useEffect(() => () => fileUrls.forEach((u) => URL.revokeObjectURL(u)), [fileUrls]);
  const parsed = useMemo(() => {
    if (!rawSpec) return null;
    const assets = Object.fromEntries(Object.entries(rawSpec.assets).map(([k, v]) => [k, { ...v, url: fileUrls.get(v.url) ?? v.url }]));
    return parseSpec({ ...rawSpec, assets });
  }, [rawSpec, fileUrls]);
  const spec = parsed && "spec" in parsed ? parsed.spec : null;

  // DEV: let the fidelity harness (scripts/fidelity) render and measure this import.
  const fidelityContent = useMemo(() => (ai ? designContent(ai, svgBuild) : null), [ai, svgBuild]);
  const fidelitySources = useMemo(() => (rawSpec as { __sources?: Record<string, Source> } | null)?.__sources ?? {}, [rawSpec]);
  const fidelityPhone = useMemo(
    () => (phone ? { a: phone.a, build: phone.build, sources: (rawSpec as { __phoneSources?: Record<string, Source> } | null)?.__phoneSources ?? {} } : null),
    [phone, rawSpec],
  );
  useFidelityHook({ spec: stage === "review" ? spec : null, content: fidelityContent, det, svgA: mode === "svg" ? svgA : null, build: svgBuild, sources: fidelitySources, score, notes: ai?.notes ?? [], phone: fidelityPhone });

  const save = async () => {
    if (!rawSpec || !det || !ai) return;
    setSaving(true);
    setError(null);
    try {
      const id = templateIdFrom(label);
      await createDraftVersion({ templateId: id, label: label.trim(), tier, eventTypes: ai.eventTypes, rawSpec, files, isNew: true, ingestReport: { importedFrom: mode, fileName: (mode === "svg" ? svgFile : designFile)?.name, ...(phone && mobileFile ? { phoneFileName: mobileFile.name } : {}), match: score, notes: ai.notes } });
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
        sub="Upload the design’s SVG file. The AI finds the text, makes it editable and cleans it out of the artwork; you check the result and save a draft."
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

          <div className="mt-6">
            <FilterTabs<Mode>
              value={mode}
              onChange={setMode}
              options={[
                { value: "svg", label: "One SVG file" },
                { value: "images", label: "Two images" },
              ]}
            />
          </div>
          {mode === "svg" ? (
            <>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <DropZone icon="ri-file-code-line" title="Design SVG" sub="Canva: Share → Download → SVG" file={svgFile} onFile={setSvgFile} accept="image/svg+xml,.svg" />
                <DropZone
                  icon="ri-smartphone-line"
                  title="Phone version (optional)"
                  sub="The same design laid out for phones. Leave empty and the phone layout is made for you."
                  file={mobileFile}
                  onFile={setMobileFile}
                  accept="image/svg+xml,.svg"
                />
              </div>
              <p className="mt-3 text-[13px] text-[var(--slate)]">
                Works when the text is still text in the design tool (not flattened into a picture). If the import can’t find the text, use “Two images”.
              </p>
            </>
          ) : (
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <DropZone icon="ri-image-line" title="Full design" sub="Exactly as guests should see it, with sample names and date" file={designFile} onFile={setDesignFile} />
              <DropZone icon="ri-image-edit-line" title="Same design, text hidden" sub="Everything else stays exactly in place" file={artFile} onFile={setArtFile} />
            </div>
          )}
          <details className="mt-4 text-[13px] text-[var(--slate)]" hidden={mode === "svg"}>
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
            {stage === "measuring"
              ? mode === "svg"
                ? "Reading the file…"
                : "Finding the text…"
              : stage === "thinking"
                ? "AI is reading the design…"
                : stage === "finishing"
                  ? "Matching fonts and cleaning the artwork…"
                  : stage === "phone"
                    ? "Reading the phone version…"
                    : "Analyse design"}
          </PrimaryButton>
          {stage === "thinking" ? (
            <p className="mt-3 text-[13px] text-[var(--slate)]">
              Found {det?.boxes.length} {mode === "svg" ? "lines that look like text" : "pieces of text"}
              {svgA ? ` among ${svgA.leaves.length.toLocaleString()} elements` : ""}. This usually takes 10–60 seconds.
            </p>
          ) : null}
        </OutlineCard>
      ) : null}

      {stage === "review" && det && ai ? (
        <div className="grid gap-6 xl:grid-cols-[1fr_400px]">
          <ReviewPreview
            spec={spec}
            det={det}
            ai={ai}
            build={svgBuild}
            errors={parsed && "errors" in parsed ? parsed.errors : []}
            sources={(rawSpec as { __sources?: Record<string, Source> } | null)?.__sources ?? {}}
            onScore={setScore}
          />
          <aside className="space-y-5">
            <OutlineCard className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[var(--slate)]">Text ({ai.layers.length})</p>
                <PillButton onClick={retryAi}>Ask AI again</PillButton>
              </div>
              <div className="max-h-[52vh] space-y-3 overflow-y-auto pr-1">
                {ai.layers.map((l, i) => (
                  <LayerRow key={i} layer={l} slots={(["display", "body", "accent", "extra"] as const).filter((k) => ai.fonts[k])} onChange={(p) => updateLayer(i, p)} />
                ))}
              </div>
            </OutlineCard>

            {mode === "svg" && svgA?.pictures.length ? (
              <OutlineCard className="p-5">
                <p className="mb-1 text-[13px] font-semibold uppercase tracking-[0.08em] text-[var(--slate)]">
                  Photos ({(ai.photos ?? []).length} of {svgA.pictures.length} pictures)
                </p>
                <p className="mb-3 text-[12px] text-[var(--slate)]">Ticked pictures become photo slots customers fill with their own. The rest stay part of the design.</p>
                <div className="grid max-h-[40vh] grid-cols-3 gap-2 overflow-y-auto pr-1">
                  {svgA.pictures.map((pic) => {
                    const on = (ai.photos ?? []).some((x) => x.p === pic.n);
                    return (
                      <label key={pic.n} className="cursor-pointer rounded-lg border p-1 text-[11px]" style={{ borderColor: on ? "var(--acc-blue)" : "var(--line)" }}>
                        <div
                          className="w-full rounded"
                          style={{
                            aspectRatio: `${pic.w * det.width} / ${pic.h * det.height}`,
                            backgroundImage: `url(${det.designUrl})`,
                            backgroundSize: `${100 / pic.w}% ${100 / pic.h}%`,
                            backgroundPosition: `${pic.w < 1 ? (pic.x / (1 - pic.w)) * 100 : 0}% ${pic.h < 1 ? (pic.y / (1 - pic.h)) * 100 : 0}%`,
                          }}
                        />
                        <span className="mt-1 flex items-center gap-1">
                          <input
                            type="checkbox"
                            checked={on}
                            onChange={() =>
                              setAi({ ...ai, photos: on ? (ai.photos ?? []).filter((x) => x.p !== pic.n) : [...(ai.photos ?? []), { p: pic.n, hint: "Photo" }] })
                            }
                          />
                          P{pic.n}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </OutlineCard>
            ) : null}

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
              {(["display", "body", "accent", "extra"] as const)
                .filter((k) => ai.fonts[k])
                .map((k) => (
                  <label key={k} className="mb-2 flex items-center gap-2 text-[13px]">
                    <span className="w-16 text-[var(--slate)]">{FONT_SLOT_LABEL[k]}</span>
                    <Input value={ai.fonts[k]!.family} onChange={(e) => setAi({ ...ai, fonts: { ...ai.fonts, [k]: { ...ai.fonts[k]!, family: e.target.value } } })} />
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

function DropZone({
  icon,
  title,
  sub,
  file,
  onFile,
  accept = "image/png,image/jpeg,image/webp,image/svg+xml",
}: {
  icon: string;
  title: string;
  sub: string;
  file: File | null;
  onFile: (f: File | null) => void;
  accept?: string;
}) {
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
      <input ref={ref} type="file" accept={accept} className="hidden" onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
    </>
  );
}

const ROLE_OPTIONS: { value: string; label: string }[] = [
  { value: "static", label: "Fixed wording" },
  ...BINDING_FIELDS.map((f) => ({ value: f, label: BINDING_INFO[f].label })),
  { value: "ignore", label: "Not text — ignore" },
];

const FONT_SLOT_LABEL = { display: "Headline", body: "Text", accent: "Accent", extra: "Extra" } as const;

function LayerRow({ layer, slots, onChange }: { layer: AiLayer; slots: FontSlot[]; onChange: (p: Partial<AiLayer>) => void }) {
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
        {layer.role !== "ignore" && slots.length > 1 ? (
          <select value={layer.font} onChange={(e) => onChange({ font: e.target.value as FontSlot })} className="rounded-full border border-[var(--line)] bg-white px-2.5 py-1 text-[12px]" title="Font">
            {slots.map((k) => (
              <option key={k} value={k}>
                {FONT_SLOT_LABEL[k]} font
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
/** Parse "4:00 PM" / "13:00" into an ISO time on the given day. */
function timeOn(day: string, text: string | undefined): string {
  const m = text?.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)?/i);
  const d = day.slice(0, 10) || "2026-12-12";
  if (!m) return `${d}T00:00:00`;
  let h = +m[1];
  if (/p/i.test(m[3] ?? "") && h < 12) h += 12;
  if (/a/i.test(m[3] ?? "") && h === 12) h = 0;
  return `${d}T${String(Math.min(23, h)).padStart(2, "0")}:${m[2] ?? "00"}:00`;
}

function designContent(ai: AiResult, build?: SvgBuild | null): EventContent {
  const base = normalizeEventContent(isabellaAndMateo);
  // Multi-line details (an address) keep the design's line breaks; paragraphs re-wrap.
  const text = (field: string, format?: string) => {
    const l = ai.layers.find((x) => x.role === "field" && x.field === field && (!format || x.format === format));
    if (!l) return undefined;
    const avg = l.lines.reduce((n, t) => n + t.length, 0) / l.lines.length;
    return l.lines.join(l.lines.length === 2 && avg <= 25 ? "\n" : " ");
  };
  const names = text("hosts.names");
  const h0 = text("hosts.0.name");
  const h1 = text("hosts.1.name");
  const joiner = ai.layers.find((l) => l.field === "hosts.names")?.joiner ?? "&";
  const hostNames = h0 || h1 ? [h0, h1].filter(Boolean) : names ? names.split(new RegExp(`\\s*(?:${joiner.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}|\\n)\\s*`, "i")) : [];
  const venue = text("venue.name") ?? text("venue.nameOrAddress");
  const eventDate = designDate(ai) ?? base.eventDate;

  // Repeating content straight from the design's own wording.
  const val = (group: string, i: number, part: string) => text(`${group}.${i}.${part}`);
  const count = (group: string) => {
    let n = 0;
    for (const l of ai.layers) {
      const m = l.role === "field" && l.field?.match(/^(\w+)\.(\d+)\./);
      if (m && m[1] === group) n = Math.max(n, +m[2] + 1);
    }
    return n;
  };
  const range = (group: string) => Array.from({ length: count(group) }, (_, i) => i);
  const content: EventContent = {
    ...base,
    eventDate,
    hosts: hostNames.length ? hostNames.map((name, i) => ({ id: `h${i}`, name: name as string })) : base.hosts,
    primaryLocation: { ...base.primaryLocation, name: venue ?? base.primaryLocation.name, addressLine: text("venue.address") ?? base.primaryLocation.addressLine },
  };
  if (count("schedule"))
    content.schedule = range("schedule").map((i) => ({
      id: `s${i}`,
      label: val("schedule", i, "label") ?? "",
      startTime: timeOn(eventDate, val("schedule", i, "time")),
      description: val("schedule", i, "description"),
      location: val("schedule", i, "place") ? { id: `l${i}`, name: val("schedule", i, "place")!, addressLine: "" } : undefined,
    }));
  if (count("faqs")) content.faqs = range("faqs").map((i) => ({ id: `f${i}`, order: i, question: val("faqs", i, "question") ?? "", answer: val("faqs", i, "answer") ?? "" }));
  if (count("travel")) content.travelInformation = range("travel").map((i) => ({ id: `t${i}`, title: val("travel", i, "title") ?? "", body: val("travel", i, "body") ?? "" }));
  if (count("stay"))
    content.accommodations = range("stay").map((i) => ({ id: `a${i}`, name: val("stay", i, "name") ?? "", addressLine: val("stay", i, "address") ?? "", notes: val("stay", i, "notes") }));
  if (count("people")) content.keyPeople = range("people").map((i) => ({ id: `p${i}`, name: val("people", i, "name") ?? "", role: val("people", i, "role") }));
  if (count("registry")) content.registryLinks = range("registry").map((i) => ({ id: `r${i}`, storeName: val("registry", i, "store") ?? "", url: "#" }));
  if (count("story")) content.story = range("story").map((i) => val("story", i, "text") ?? "").join("\n\n");
  else if (text("story.first")) content.story = text("story.first");
  // The design's own photos in its photo slots.
  if (build?.photos.length) {
    content.galleries = [
      {
        id: "design",
        items: build.photos.map((ph, i) => ({
          id: `ph${i}`,
          order: i,
          image: { id: `img${i}`, masterUrl: ph.src, width: 1000, height: 1000, alt: "", focalPoint: { x: 0.5, y: 0.5 }, createdAt: "" },
        })),
      },
    ];
  }
  return content;
}

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/** Rebuild the design's own date from its date pieces (day / month / year / time, or a full date). */
function designDate(ai: AiResult): string | undefined {
  const pieces = ai.layers.filter((l) => l.role === "field" && l.field === "eventDate");
  const get = (...formats: string[]) => pieces.find((l) => formats.includes(l.format ?? "long"))?.lines.join(" ");
  const full = get("long", "medium", "numeric", "weekdayMonthDay", "monthDay");
  let y: number | undefined, m: number | undefined, d: number | undefined;
  if (full) {
    const numeric = full.match(/(\d{1,2})[./-](\d{1,2})[./-](\d{4})/);
    const parsed = new Date(full.replace(/(\d)(st|nd|rd|th)\b/gi, "$1"));
    if (numeric) [d, m, y] = [+numeric[1], +numeric[2] - 1, +numeric[3]];
    else if (!Number.isNaN(parsed.getTime())) [y, m, d] = [parsed.getFullYear(), parsed.getMonth(), parsed.getDate()];
    // No year in the design ("Friday, September 18"): the next year that day is that weekday.
    if (!numeric && !/\b\d{4}\b/.test(full) && m !== undefined && d !== undefined) {
      const wd = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"].findIndex((w) => new RegExp(`\\b${w}`, "i").test(full));
      const now = new Date().getFullYear();
      y = now;
      for (let k = 0; k < 12 && wd >= 0; k++) if (new Date(now + k, m, d).getDay() === wd) ((y = now + k), (k = 99));
    }
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

export interface MatchScore {
  /** 0–100 overall. */
  total: number;
  placement: number;
  fit: number;
  fonts: number | null;
  /** Text layers enlarged on a phone to stay readable (wide designs). */
  phoneEnlarged: number;
  textLayers: number;
  /** Lines that are furthest off, worst first. */
  worst: { id: string; text: string; score: number; fits: boolean }[];
}

type Source = { canvas: string; x: number; y: number; w: number; h: number };

/**
 * Measure the rendered template against the original: where each line of
 * text actually lands vs. where its letters are in the design, whether it
 * fits its box, plus the font match. Rendered at the design's real width.
 */
function measureMatch(root: HTMLElement, sources: Record<string, Source>, spec: TemplateSpec, fontScore: number | null): MatchScore {
  let wsum = 0, psum = 0, fitW = 0;
  const lines: MatchScore["worst"] = [];
  for (const el of Array.from(root.querySelectorAll<HTMLElement>("[data-layer-id]"))) {
    const id = el.dataset.layerId!;
    const src = sources[id];
    const canvas = (el.closest(".rs-frame") as HTMLElement | null) ?? el.parentElement;
    const span = el.firstElementChild as HTMLElement | null;
    if (!src || !canvas || !span || !span.textContent?.trim()) continue;
    const c = canvas.getBoundingClientRect();
    const range = document.createRange();
    range.selectNodeContents(span);
    const r = range.getBoundingClientRect();
    if (!c.width || !r.width) continue;
    const rx = (r.left - c.left) / c.width, ry = (r.top - c.top) / c.height, rw = r.width / c.width, rh = r.height / c.height;
    const rotated = /rotate/.test(el.style.transform);
    const dx = Math.abs(rx + rw / 2 - (src.x + src.w / 2)) / Math.max(src.w, 0.02);
    const dy = Math.abs(ry + rh / 2 - (src.y + src.h / 2)) / Math.max(src.h, 0.005);
    const dw = rotated ? 0 : Math.abs(rw / src.w - 1);
    const score = Math.exp(-(dx + dy * 0.5 + dw));
    const fits = span.offsetHeight <= el.clientHeight + 2 && span.scrollWidth <= el.clientWidth + 2;
    const w = Math.max(src.w * src.h, 1e-5);
    wsum += w;
    psum += w * score;
    fitW += fits ? w : 0;
    lines.push({ id, text: span.textContent.trim().slice(0, 48), score: Math.round(score * 100), fits });
  }
  // Phone: a 390px screen; canvas text below the 11px floor gets enlarged.
  let phoneEnlarged = 0, textLayers = 0;
  for (const sec of spec.sections) {
    if (sec.kind !== "canvas") continue;
    const phoneW = Math.min(sec.maxWidth, sec.padding === "none" ? 390 : 390 - 2 * 12);
    for (const l of sec.layers) {
      if (l.type !== "text") continue;
      textLayers++;
      if ((l.size / 100) * phoneW < 11) phoneEnlarged++;
    }
  }
  const placement = wsum ? psum / wsum : 1;
  const fit = wsum ? fitW / wsum : 1;
  const total = fontScore === null ? 0.65 * placement + 0.35 * fit : 0.45 * placement + 0.25 * fit + 0.3 * fontScore;
  return {
    total: Math.round(total * 100),
    placement: Math.round(placement * 100),
    fit: Math.round(fit * 100),
    fonts: fontScore === null ? null : Math.round(fontScore * 100),
    phoneEnlarged,
    textLayers,
    worst: lines.filter((x) => x.score < 80 || !x.fits).sort((p, q) => p.score - q.score).slice(0, 6),
  };
}

function ReviewPreview({
  spec,
  det,
  ai,
  build,
  errors,
  sources,
  onScore,
}: {
  spec: TemplateSpec | null;
  det: Detection;
  ai: AiResult;
  build: SvgBuild | null;
  errors: string[];
  sources: Record<string, Source>;
  onScore: (s: MatchScore | null) => void;
}) {
  const [mode, setMode] = useState<"compare" | "site">("compare");
  const [device, setDevice] = useState<"desktop" | "phone">("phone");
  const [fixtureId, setFixtureId] = useState(FIXTURES[0].id);
  const [mix, setMix] = useState(0.5);
  const [difference, setDifference] = useState(false);
  const own = useMemo(() => designContent(ai, build), [ai, build]);
  const heroOnly = useMemo(() => (spec ? { ...spec, sections: spec.sections.filter((s) => s.kind === "canvas" || s.kind === "layout") } : null), [spec]);
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [innerH, setInnerH] = useState(0);
  const [canvasRect, setCanvasRect] = useState<{ left: number; top: number; width: number } | null>(null);
  const [score, setScore] = useState<MatchScore | null>(null);

  // Render at the design's real width (so text sizes are true), scaled to fit.
  const first = heroOnly?.sections.find((s) => s.kind === "canvas" || s.kind === "layout");
  const designW = !first ? 600 : first.kind === "layout" ? first.designWidth : first.kind === "canvas" ? first.maxWidth + (first.padding === "none" ? 0 : 48) : 600;

  useLayoutEffect(() => {
    if (mode !== "compare" || !outer.current || !inner.current) return;
    const o = outer.current;
    const el = inner.current;
    const measure = () => {
      const k = Math.min(1, o.clientWidth / designW);
      setScale(k);
      setInnerH(el.offsetHeight * k);
      const canvas = el.querySelector<HTMLElement>("[data-spec-root] section > div");
      // Website sections fill the full width; the canvas finder still lands on the first section.
      if (!canvas) return;
      const a = el.getBoundingClientRect();
      const b = canvas.getBoundingClientRect();
      setCanvasRect({ left: (b.left - a.left) / k, top: (b.top - a.top) / k, width: b.width / k });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(o);
    ro.observe(el);
    return () => ro.disconnect();
  }, [mode, heroOnly, designW]);

  // Score once fonts have loaded and text has been fitted.
  useEffect(() => {
    if (mode !== "compare" || !inner.current || !heroOnly) return;
    let live = true;
    const run = () => {
      if (!live || !inner.current) return;
      const s = measureMatch(inner.current, sources, heroOnly, ai.fontScore ?? null);
      setScore(s);
      onScore(s);
    };
    const t = setTimeout(() => document.fonts.ready.then(() => setTimeout(run, 400)), 300);
    return () => {
      live = false;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, heroOnly, own, sources]);

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
  const tone = (v: number) => (v >= 90 ? "#3d5a12" : v >= 75 ? "#8a6100" : "#c2412d");

  return (
    <section className="min-w-0">
      {score ? (
        <div className="mb-4 rounded-[18px] border border-[var(--line)] bg-white px-5 py-4">
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
            <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[var(--slate)]">
              Match <span className="ml-1 font-serif text-[28px] normal-case tracking-normal" style={{ color: tone(score.total) }}>{score.total}%</span>
            </p>
            <p className="text-[13px] text-[var(--slate)]">
              Text placement <b style={{ color: tone(score.placement) }}>{score.placement}%</b> · Fits its boxes <b style={{ color: tone(score.fit) }}>{score.fit}%</b>
              {score.fonts !== null ? (
                <>
                  {" "}
                  · Fonts <b style={{ color: tone(score.fonts) }}>{score.fonts}%</b>
                </>
              ) : null}
            </p>
          </div>
          {score.phoneEnlarged ? (
            <p className="mt-2 text-[12px] text-[#8a6100]">
              On phones, {score.phoneEnlarged} of {score.textLayers} text boxes are below a readable size and get enlarged, so they may crowd. Designs made at phone width (about 400–600px wide) avoid this.
            </p>
          ) : null}
          {score.worst.length ? (
            <details className="mt-2 text-[12px] text-[var(--slate)]">
              <summary className="cursor-pointer">Lines to check ({score.worst.length})</summary>
              <ul className="mt-1 space-y-0.5 pl-4">
                {score.worst.map((w) => (
                  <li key={w.id}>
                    “{w.text}” — {w.score}% placed{w.fits ? "" : ", doesn’t fit its box"}
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </div>
      ) : null}

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
          <>
            <FilterTabs<"desktop" | "phone">
              value={device}
              onChange={setDevice}
              options={[
                { value: "phone", label: "Phone" },
                { value: "desktop", label: "Desktop" },
              ]}
            />
            <select value={fixtureId} onChange={(e) => setFixtureId(e.target.value)} className="rounded-full border border-[var(--line)] bg-white px-3 py-1.5 text-[13px]">
              {FIXTURES.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>
          </>
        )}
      </div>

      {mode === "compare" ? (
        <div className="rounded-[22px] border border-[var(--line)] bg-white p-4">
          <div ref={outer} className="relative mx-auto w-full overflow-hidden" style={{ height: innerH || undefined, maxWidth: designW }}>
            <div ref={inner} className="absolute left-0 top-0" style={{ width: designW, transform: `scale(${scale})`, transformOrigin: "0 0" }}>
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
          </div>
          <p className="mt-3 text-center text-[12px] text-[var(--slate)]">
            {difference ? "Black means a perfect match; bright outlines show text that’s off." : "Slide to fade between the template (with the design’s own wording) and the original."}
          </p>
        </div>
      ) : (
        <div className="flex h-[78vh] flex-col overflow-hidden rounded-[22px] border border-[var(--line)]">
          <PreviewCanvas deviceWidth={device === "phone" ? 390 : 1024}>
            <SpecTemplate spec={spec} content={fixture.content} editorPreview={fixture.editor} settings={settings} />
          </PreviewCanvas>
        </div>
      )}
    </section>
  );
}
