import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getTemplateDefinition } from "../engine/registry";
import { useTemplateCatalog } from "../engine/catalog";
import { resolveTemplate } from "../engine/render";
import ContentEditor from "./ContentEditor";
import PreviewCanvas from "./components/PreviewCanvas";
import { useEventSiteDraft } from "./useEventSiteDraft";
import { PublishDialog, usePublishFlow } from "./PublishDialog";
import LookAndFeel from "./LookAndFeel";
import { loadPairingFonts } from "../presentation/loadFonts";
import { SiteCreditProvider } from "../engine/siteCredit";
import { PlanBadge, UpgradeDialog, peso, useSitePlan, useUpgradeFlow } from "./SitePlan";

// V1 builder shell: template picker + content editing forms + a live
// preview, all against a real Supabase-backed draft. Requires
// supabase/wedding-sites-schema.sql to have been run against the
// project's database first — see docs/template-builder-decisions.md.
export default function BuilderShellPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const {
    status,
    saveStatus,
    slug,
    publishedAt,
    content,
    setContent,
    presentation,
    save,
    publish,
    unpublish,
    hasUnpublishedChanges,
    unsaved,
    setPresentation,
  } = useEventSiteDraft(eventId);
  const [device, setDevice] = useState<"desktop" | "phone">("desktop");
  const [lookOpen, setLookOpen] = useState(false);
  const flow = usePublishFlow(eventId, publish, save);
  const { plan, reload: reloadPlan } = useSitePlan(eventId);
  const upgrade = useUpgradeFlow(eventId, reloadPlan);
  // Publishing a Premium template (paid, or a ₱0 promo) can make the site Premium.
  useEffect(() => {
    if (flow.step.kind === "live") reloadPlan();
  }, [flow.step.kind, reloadPlan]);
  const canUpgrade = !!plan && !plan.managed && !plan.premium && plan.upgradeCentavos > 0;

  const catalog = useTemplateCatalog();
  const resolved = resolveTemplate(presentation);
  const activeDefinition = getTemplateDefinition(presentation.activeTemplateId);
  const [editorCollapsed, setEditorCollapsed] = useState(false);
  loadPairingFonts(resolved?.settings.fontPairingId);

  if (status === "loading" || (!resolved && presentation.activeTemplateId && !catalog.ready)) {
    return <div style={{ padding: 48, color: "var(--slate)" }}>Loading your event site…</div>;
  }
  if (status === "error") {
    return (
      <div style={{ padding: 48, color: "var(--slate)" }}>
        We couldn&apos;t open your website. Please refresh the page, or message us if it keeps happening.
      </div>
    );
  }

  return (
    // data-lenis-prevent: the app runs a global Lenis smooth-scroll
    // instance (mounted in App.tsx) that otherwise hijacks all wheel/touch
    // input for page-level scrolling. This is an app-like internal tool
    // with its own internally-scrolling panes, not a marketing scroll
    // page, so it opts out of Lenis entirely and uses native scrolling.
    <div data-lenis-prevent style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <header
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 16,
          padding: "12px 20px",
          borderBottom: "1px solid var(--line)",
          background: "#fff",
        }}
      >
        <Link
          to={`/account/events/${eventId}/site-builder`}
          style={{ fontSize: 13, color: "var(--slate)", whiteSpace: "nowrap" }}
        >
          &larr; Templates
        </Link>
        <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>
          {activeDefinition?.label ?? "No template selected"}
        </span>

        <PlanBadge plan={plan} onUpgrade={upgrade.open} />

        <div style={{ flex: 1 }} />

        <span style={{ fontSize: 12, color: "var(--slate)" }}>
          {saveStatus === "saving" ? "Saving…" : unsaved ? "Unsaved changes" : saveStatus === "error" ? "Couldn’t save — check your connection" : saveStatus === "saved" ? "All changes saved" : ""}
        </span>
        <button
          onClick={() => save()}
          style={{
            padding: "8px 16px",
            borderRadius: 999,
            border: "1px solid var(--line)",
            background: "#fff",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Save
        </button>
        <span style={{ display: "inline-flex", border: "1px solid var(--line)", borderRadius: 999, padding: 2 }} role="group" aria-label="Preview size">
          {(["desktop", "phone"] as const).map((d) => (
            <button
              key={d}
              onClick={() => setDevice(d)}
              aria-pressed={device === d}
              style={{ padding: "6px 12px", borderRadius: 999, border: "none", fontSize: 12, fontWeight: 600, cursor: "pointer", background: device === d ? "var(--ink)" : "transparent", color: device === d ? "#fff" : "var(--ink)" }}
            >
              {d === "desktop" ? "Computer" : "Phone"}
            </button>
          ))}
        </span>
        {publishedAt && hasUnpublishedChanges ? (
          <span style={{ fontSize: 12, fontWeight: 600, color: "#8a5a00", background: "#fff1d6", borderRadius: 999, padding: "4px 10px" }}>Edits not live yet</span>
        ) : null}
        <button
          onClick={flow.start}
          style={{
            padding: "8px 16px",
            borderRadius: 999,
            border: "none",
            background: "var(--ink)",
            color: "#fff",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {publishedAt ? "Update live site" : "Publish site"}
        </button>
        {publishedAt && slug ? (
          <>
            <a href={`/invite/${slug}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: "var(--slate)" }}>
              View live site &rarr;
            </a>
            <button
              onClick={() => window.confirm("Take your site offline? Guests won’t be able to open it or RSVP until you publish again (free).") && unpublish()}
              style={{ fontSize: 12, color: "var(--slate)", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
            >
              Unpublish
            </button>
          </>
        ) : null}
      </header>
      <PublishDialog flow={flow} slug={slug} upsell={canUpgrade ? { price: peso(plan!.upgradeCentavos), open: upgrade.open } : null} />
      <UpgradeDialog flow={upgrade} plan={plan} />

      <div style={{ flex: 1, display: "flex", minHeight: 0, overflow: "hidden" }}>
        <div
          style={{
            position: "relative",
            flexShrink: 0,
            width: editorCollapsed ? 0 : 380,
            transition: "width 0.32s cubic-bezier(0.65, 0, 0.35, 1)",
          }}
        >
          {/* Clips the editor content only — kept separate from the
              outer width-animated wrapper so the circular toggle below
              (a sibling, not a descendant of this clipping box) never
              gets cut off as it sits half outside the shrinking panel. */}
          <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
            <div
              style={{
                width: 380,
                height: "100%",
                minHeight: 0,
                overflowY: "auto",
                padding: "16px 20px",
                borderRight: "1px solid var(--line)",
              }}
            >
              <details open={lookOpen} onToggle={(e) => setLookOpen((e.target as HTMLDetailsElement).open)} style={{ borderBottom: "1px solid var(--line)", marginBottom: 8 }}>
                <summary style={{ padding: "14px 4px", cursor: "pointer", fontWeight: 600, fontSize: 14, color: "var(--ink)" }}>Look &amp; feel</summary>
                <div style={{ padding: "4px 4px 20px" }}>
                  <LookAndFeel presentation={presentation} onChange={setPresentation} eventId={eventId} />
                </div>
              </details>
              <ContentEditor content={content} onChange={setContent} eventId={eventId} template={activeDefinition} />
            </div>
          </div>

          <button
            onClick={() => setEditorCollapsed((v) => !v)}
            title={editorCollapsed ? "Show editor" : "Hide editor — full-screen preview"}
            aria-label={editorCollapsed ? "Show editor" : "Hide editor"}
            style={{
              position: "absolute",
              top: "50%",
              left: "100%",
              transform: "translate(-50%, -50%)",
              width: 44,
              height: 44,
              borderRadius: "50%",
              border: "1px solid var(--line)",
              background: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              boxShadow: "0 2px 10px rgba(0,7,39,0.14)",
              zIndex: 5,
              transition: "left 0.32s cubic-bezier(0.65, 0, 0.35, 1), box-shadow 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 4px 14px rgba(0,7,39,0.22)")}
            onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "0 2px 10px rgba(0,7,39,0.14)")}
          >
            <span
              aria-hidden
              style={{
                display: "inline-block",
                fontSize: 16,
                color: "var(--ink)",
                transition: "transform 0.32s cubic-bezier(0.65, 0, 0.35, 1)",
                transform: editorCollapsed ? "rotate(180deg)" : "none",
              }}
            >
              &#8249;
            </span>
          </button>
        </div>
        {resolved ? (
          <PreviewCanvas key={device} deviceWidth={device === "phone" ? 390 : undefined}>
            {/* The preview shows the credit exactly as guests will see it. */}
            <SiteCreditProvider value={{ show: !plan?.premium, slug }}>
              <resolved.definition.component content={content} settings={resolved.settings} editorPreview />
            </SiteCreditProvider>
          </PreviewCanvas>
        ) : (
          <div style={{ flex: 1, minHeight: 0, overflowY: "auto", background: "#f5f5f2", padding: 48, color: "var(--slate)" }}>
            Select a template to preview it.
          </div>
        )}
      </div>
    </div>
  );
}
