import { useSearchParams } from "react-router-dom";
import { normalizeEventContent } from "../content/normalize";
import { theSmiths } from "../content/fixtures/the-smiths";
import { miasBirthday } from "../content/fixtures/mias-birthday";
import { isabellaAndMateo } from "../content/fixtures/isabella-and-mateo";
import { sparseDraft } from "../content/fixtures/sparse-draft";
import { scrapbookDemoWedding } from "../content/fixtures/scrapbook-demo";
import { cinematicDemoBirthday } from "../content/fixtures/cinematic-demo";
import { listTemplateDefinitions } from "../engine/registry";
import { resolveTemplate } from "../engine/render";
import type { PresentationState } from "../presentation/types";

// Internal, dev-only harness for rendering an event-site template against
// fixture content without needing a real client account or Supabase row.
// Gated behind import.meta.env.DEV in src/router/config.tsx.
//
// Usage: /internal/event-site-preview?template=<templateId>&fixture=<fixtureId>
// Two intentionally different fixtures are available: a 2-host wedding
// (the-smiths) and a 1-host birthday (mias-birthday) — proving the
// canonical content model isn't wedding-specific.

const fixtures: Record<string, unknown> = {
  "scrapbook-demo": scrapbookDemoWedding,
  "cinematic-demo": cinematicDemoBirthday,
  "isabella-and-mateo": isabellaAndMateo,
  "the-smiths": theSmiths,
  "sparse-draft": sparseDraft,
  "mias-birthday": miasBirthday,
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
  const rawFixture = fixtures[fixtureId] ?? scrapbookDemoWedding;
  const content = normalizeEventContent(rawFixture);
  const resolved = templateId ? resolveTemplate(buildPreviewPresentation(templateId)) : undefined;

  return (
    <div style={{ minHeight: "100vh", background: "#f5f5f2" }}>
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          display: "flex",
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
          </select>
        </label>
      </div>

      {resolved ? (
        <div style={{ width: previewWidth ?? "100%", maxWidth: "100%", margin: "0 auto" }}>
          <resolved.definition.component content={content} settings={resolved.settings} editorPreview={editorPreview} />
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
