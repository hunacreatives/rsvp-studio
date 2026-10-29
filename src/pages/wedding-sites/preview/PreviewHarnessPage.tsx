import { useSearchParams } from "react-router-dom";
import { normalizeEventContent } from "../content/normalize";
import { theSmiths } from "../content/fixtures/the-smiths";
import { miasBirthday } from "../content/fixtures/mias-birthday";
import { isabellaAndMateo } from "../content/fixtures/isabella-and-mateo";
import { sparseDraft } from "../content/fixtures/sparse-draft";
import { scrapbookDemoWedding } from "../content/fixtures/scrapbook-demo";
import { cinematicDemoBirthday } from "../content/fixtures/cinematic-demo";
import { pickleballDemoBirthday } from "../content/fixtures/pickleball-demo";
import { openPlayDemo } from "../content/fixtures/open-play-demo";
import { capizDemo } from "../content/fixtures/capiz-demo";
import { caladoDemo } from "../content/fixtures/calado-demo";
import { underGlassDemo } from "../content/fixtures/under-glass-demo";
import { debutDemo } from "../content/fixtures/debut-demo";
import { loveLetterDemo } from "../content/fixtures/love-letter-demo";
import { promenadeDemo } from "../content/fixtures/promenade-demo";
import { getTemplateDefinition, listTemplateDefinitions } from "../engine/registry";
import { resolveTemplate } from "../engine/render";
import type { PresentationState } from "../presentation/types";
import { parseSpec } from "../spec/schema";
import { definitionFromSpec } from "../spec/definitionFromSpec";
import { botanicalSpec } from "../spec/samples/botanical";
import HarnessEditor from "./HarnessEditor";

// Uploadable-template specs rendered through the generic spec runtime
// (template id "spec:<name>"), so a spec can be compared side by side with
// the hand-coded template it reproduces.
const specSamples: Record<string, { label: string; spec: unknown }> = {
  "spec:botanical": { label: "Botanical — as uploaded spec", spec: botanicalSpec },
};

// Internal, dev-only harness for rendering an event-site template against
// fixture content without needing a real client account or Supabase row.
// Gated behind import.meta.env.DEV in src/router/config.tsx.
//
// Usage: /internal/event-site-preview?template=<templateId>&fixture=<fixtureId>
// (&panel=1 adds the real builder panels on the left, on local state)
// Two intentionally different fixtures are available: a 2-host wedding
// (the-smiths) and a 1-host birthday (mias-birthday) — proving the
// canonical content model isn't wedding-specific.

const GIFTS = [
  { id: "gift-1", label: "GCash", accountName: "Isabella Reyes", accountNumber: "0917 123 4567", qrUrl: "/brand/monogram-dark.png" },
  { id: "gift-2", label: "Maya", accountName: "Mateo Cruz", accountNumber: "0918 765 4321" },
];

const fixtures: Record<string, unknown> = {
  "scrapbook-demo": scrapbookDemoWedding,
  "cinematic-demo": cinematicDemoBirthday,
  "pickleball-demo": pickleballDemoBirthday,
  "open-play-demo": openPlayDemo,
  "capiz-demo": capizDemo,
  "calado-demo": caladoDemo,
  "under-glass-demo": underGlassDemo,
  // The same design for a 50th anniversary.
  "under-glass-anniversary": { ...underGlassDemo, occasion: "anniversary", hosts: [{ id: "a1", name: "Ramon Reyes" }, { id: "a2", name: "Elena Reyes" }], custom: { ...underGlassDemo.custom, honoree: "", milestone: "50" } },
  "debut-demo": debutDemo,
  "love-letter-demo": loveLetterDemo,
  "promenade-demo": promenadeDemo,
  "isabella-and-mateo": isabellaAndMateo,
  "the-smiths": theSmiths,
  "sparse-draft": sparseDraft,
  "mias-birthday": miasBirthday,
  // Cash gifts (GCash/Maya with a QR) on top of a full wedding and the Cinematic demo.
  "gifts-demo": { ...isabellaAndMateo, cashGifts: GIFTS, cashGiftNote: "Your presence is the best gift. If you’d like to give, here’s how." },
  "cinematic-gifts": { ...cinematicDemoBirthday, cashGifts: GIFTS.slice(0, 1) },
};

function buildPreviewPresentation(templateId: string): PresentationState {
  return { activeTemplateId: templateId, byTemplate: {} };
}

export default function PreviewHarnessPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const fixtureId = searchParams.get("fixture") ?? "scrapbook-demo";
  const templateId = searchParams.get("template") ?? "";
  // Chrome can't open a window narrower than ~500px, so narrow layouts
  // are checked by constraining the PREVIEW BOX instead. Templates that
  // size from their own container (e.g. Scrapbook's container queries)
  // respond to this exactly as they would to a real phone viewport.
  const widthParam = searchParams.get("width");
  // Mirrors what the builder passes, so editor-only affordances can be
  // checked here instead of needing a real signed-in draft.
  const editorPreview = searchParams.get("editor") === "1";
  const previewWidth = widthParam ? Number(widthParam) : undefined;

  const templates = listTemplateDefinitions();
  // fixture=demo: the template's own sample (what its gallery card shows).
  const rawFixture = fixtureId === "demo" ? getTemplateDefinition(templateId)?.demoContent ?? scrapbookDemoWedding : fixtures[fixtureId] ?? scrapbookDemoWedding;
  const content = normalizeEventContent(rawFixture);
  const sample = specSamples[templateId];
  const parsed = sample ? parseSpec(sample.spec) : undefined;
  const specDefinition =
    sample && parsed && "spec" in parsed ? definitionFromSpec({ id: templateId, label: sample.label, tier: "free", spec: parsed.spec }) : undefined;
  const resolved = specDefinition
    ? { definition: specDefinition, settings: specDefinition.defaultSettings }
    : templateId
      ? resolveTemplate(buildPreviewPresentation(templateId))
      : undefined;

  // ?bare=1: no toolbar (RSVP Template Studio's screenshots)
  const bare = searchParams.get("bare") === "1";
  return (
    <div style={{ minHeight: "100vh", background: "#f5f5f2" }}>
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          display: bare ? "none" : "flex",
          flexWrap: "wrap",
          gap: 12,
          alignItems: "center",
          padding: "12px 16px",
          background: "#000727",
          color: "#fffff9",
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          fontSize: 13,
          maxWidth: "100%",
          overflowX: "hidden",
        }}
      >
        <strong>Event Site Preview Harness (dev only)</strong>
        <label style={{ display: "flex", gap: 6, alignItems: "center", minWidth: 0 }}>
          Fixture:
          <select
            style={{ maxWidth: 150, minWidth: 0 }}
            value={fixtureId}
            onChange={(e) => {
              const next = new URLSearchParams(searchParams);
              next.set("fixture", e.target.value);
              setSearchParams(next);
            }}
          >
            {Object.keys(fixtures).map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: "flex", gap: 6, alignItems: "center", minWidth: 0 }}>
          <input
            type="checkbox"
            checked={editorPreview}
            onChange={(e) => {
              const next = new URLSearchParams(searchParams);
              if (e.target.checked) next.set("editor", "1");
              else next.delete("editor");
              setSearchParams(next);
            }}
          />
          Editor mode
        </label>
        <label style={{ display: "flex", gap: 6, alignItems: "center", minWidth: 0 }}>
          Width:
          <select
            style={{ maxWidth: 110, minWidth: 0 }}
            value={widthParam ?? ""}
            onChange={(e) => {
              const next = new URLSearchParams(searchParams);
              if (e.target.value) next.set("width", e.target.value);
              else next.delete("width");
              setSearchParams(next);
            }}
          >
            <option value="">Full</option>
            <option value="1440">1440</option>
            <option value="1024">1024</option>
            <option value="768">768</option>
            <option value="390">390</option>
          </select>
        </label>
        <label style={{ display: "flex", gap: 6, alignItems: "center", minWidth: 0 }}>
          Template:
          <select
            style={{ maxWidth: 150, minWidth: 0 }}
            value={templateId}
            onChange={(e) => {
              const next = new URLSearchParams(searchParams);
              next.set("template", e.target.value);
              setSearchParams(next);
            }}
          >
            <option value="">— select a template —</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label} ({t.archetype})
              </option>
            ))}
            {Object.entries(specSamples).map(([id, s]) => (
              <option key={id} value={id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {parsed && "errors" in parsed ? (
        <div style={{ padding: 32, color: "#c2412d", fontFamily: "monospace", fontSize: 13 }}>
          <strong>Spec failed validation:</strong>
          <ul>{parsed.errors.map((e) => <li key={e}>{e}</li>)}</ul>
        </div>
      ) : resolved && !specDefinition && searchParams.get("panel") === "1" ? (
        <HarnessEditor key={`${templateId}:${fixtureId}`} initial={content} templateId={templateId} cover={searchParams.get("cover") === "1"} />
      ) : resolved ? (
        <div data-harness-render data-gallery-width={resolved.definition.galleryWidth ?? 1100} style={{ width: previewWidth ?? "100%", maxWidth: "100%", margin: "0 auto" }}>
          <resolved.definition.component content={content} settings={resolved.settings} editorPreview={editorPreview} live={searchParams.get("live") === "1"} demo={searchParams.get("demo") === "1"} gallery={searchParams.get("gallery") === "1"} />
        </div>
      ) : (
        <div style={{ padding: 48, textAlign: "center", color: "#868697" }}>
          {templates.length === 0
            ? "No templates are registered yet."
            : "Select a template above to preview it against the chosen fixture."}
        </div>
      )}
    </div>
  );
}
