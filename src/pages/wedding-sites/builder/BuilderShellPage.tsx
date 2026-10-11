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
import { DomainReturnDialog, useDomainReturn } from "./DomainPicker";
import { isPhoneNow, useIsPhone } from "./useIsPhone";
import CharacterLoader from "@/components/CharacterLoader";
import "./builder.css";

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
  // Phones start on the phone preview (a scaled-down desktop page is unreadable there).
  const [device, setDevice] = useState<"desktop" | "phone">(() => (isPhoneNow() ? "phone" : "desktop"));
  const [lookOpen, setLookOpen] = useState(false);
  const isPhone = useIsPhone();
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);
  const flow = usePublishFlow(eventId, publish, save, !publishedAt);
  const domainReturn = useDomainReturn(eventId);
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
    return <CharacterLoader fullScreen message="Loading your website…" />;
  }
  if (status === "error") {
    return (
      <div style={{ padding: 48, color: "var(--slate)" }}>
        We couldn&apos;t open your website. Please refresh the page, or message us if it keeps happening.
      </div>
    );
  }

  const saveText = saveStatus === "saving" ? "Saving…" : unsaved ? "Unsaved changes" : saveStatus === "error" ? "Couldn’t save — check your connection" : saveStatus === "saved" ? "All changes saved" : "";
  const editorBody = (
    <>
      <details open={lookOpen} onToggle={(e) => setLookOpen((e.target as HTMLDetailsElement).open)} style={{ borderBottom: "1px solid var(--line)", marginBottom: 8 }}>
        <summary style={{ padding: "14px 4px", cursor: "pointer", fontWeight: 600, fontSize: 14, color: "var(--ink)" }}>Look &amp; feel</summary>
        <div style={{ padding: "4px 4px 20px" }}>
          <LookAndFeel presentation={presentation} onChange={setPresentation} eventId={eventId} loadFontPreviews={lookOpen} />
        </div>
      </details>
      <ContentEditor content={content} onChange={setContent} eventId={eventId} template={activeDefinition} />
    </>
  );
  const dialogs = (
    <>
      <PublishDialog flow={flow} slug={slug} upsell={canUpgrade ? { price: peso(plan!.upgradeCentavos), open: upgrade.open } : null} />
      <UpgradeDialog flow={upgrade} plan={plan} />
      <DomainReturnDialog flow={domainReturn} />
    </>
  );
  const renderPreview = (phoneLayout: boolean) =>
    resolved ? (
      <PreviewCanvas
        key={device}
        // Phone layout: the phone preview renders at the screen's real width, unscaled.
        deviceWidth={device === "phone" ? (phoneLayout ? "fill" : 390) : undefined}
        gutter={phoneLayout ? (device === "phone" ? 0 : 12) : undefined}
      >
        {/* The preview shows the credit exactly as guests will see it. */}
        <SiteCreditProvider value={{ show: true, slug }}>
          <resolved.definition.component content={content} settings={resolved.settings} editorPreview />
        </SiteCreditProvider>
      </PreviewCanvas>
    ) : (
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", background: "#f5f5f2", padding: phoneLayout ? 24 : 48, color: "var(--slate)" }}>
        Select a template to preview it.
      </div>
    );

  if (isPhone) {
    // Phones (< 768px): one-row header, Edit | Preview tabs (both panes stay
    // mounted so each keeps its scroll position), no fixed bottom bar — the
    // iOS keyboard pushes those around; the header is always on screen anyway.
    const phoneStatus =
      saveStatus === "saving"
        ? "Saving…"
        : unsaved
          ? "Unsaved changes"
          : saveStatus === "error"
            ? "Couldn’t save — check your connection"
            : publishedAt && hasUnpublishedChanges
              ? "Saved · edits not live yet"
              : saveStatus === "saved"
                ? "All changes saved"
                : publishedAt
                  ? "Live"
                  : "Draft — not published yet";
    const statusColor = saveStatus === "error" && !unsaved ? "#b3382c" : publishedAt && hasUnpublishedChanges && !unsaved && saveStatus !== "saving" ? "#8a5a00" : "var(--slate)";
    const closeMenu = () => setMenuOpen(false);
    const tabBtn = (t: "edit" | "preview", label: string) => (
      <button
        key={t}
        type="button"
        role="tab"
        id={`builder-tab-${t}`}
        aria-selected={tab === t}
        aria-controls={`builder-panel-${t}`}
        onClick={() => setTab(t)}
        style={{
          flex: 1,
          minHeight: 44,
          border: "none",
          background: "none",
          fontSize: 15,
          fontWeight: 600,
          color: tab === t ? "var(--ink)" : "var(--slate)",
          borderBottom: tab === t ? "2px solid var(--ink)" : "2px solid transparent",
          cursor: "pointer",
        }}
      >
        {label}
      </button>
    );
    return (
      <div data-lenis-prevent className="rb-shell" style={{ display: "flex", flexDirection: "column" }}>
        <header style={{ position: "relative", display: "flex", alignItems: "center", gap: 8, height: 56, flexShrink: 0, padding: "0 8px 0 4px", borderBottom: "1px solid var(--line)", background: "#fff" }}>
          <Link
            to={`/account/events/${eventId}/site-builder`}
            aria-label="Back to templates"
            style={{ width: 44, height: 44, flexShrink: 0, display: "grid", placeItems: "center", fontSize: 22, color: "var(--ink)", textDecoration: "none" }}
          >
            &larr;
          </Link>
          <div style={{ flex: 1, minWidth: 0, lineHeight: 1.3 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {activeDefinition?.label ?? "No template selected"}
            </div>
            <div aria-live="polite" style={{ fontSize: 12, color: statusColor, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {phoneStatus}
            </div>
          </div>
          <button
            type="button"
            onClick={flow.start}
            style={{ flexShrink: 0, minHeight: 44, padding: "0 16px", borderRadius: 999, border: "none", background: "var(--ink)", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
          >
            {publishedAt ? "Update" : "Publish"}
          </button>
          <button
            type="button"
            aria-label="More options"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
            style={{ flexShrink: 0, width: 44, height: 44, borderRadius: 999, border: "1px solid var(--line)", background: "#fff", color: "var(--ink)", fontSize: 20, lineHeight: 1, cursor: "pointer" }}
          >
            &#8943;
          </button>
          {menuOpen ? (
            <>
              <div onClick={closeMenu} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
              <div
                role="menu"
                style={{ position: "absolute", top: 52, right: 8, zIndex: 41, width: 260, maxWidth: "calc(100vw - 16px)", background: "#fff", border: "1px solid var(--line)", borderRadius: 14, boxShadow: "0 16px 40px -12px rgba(0,7,39,0.3)", padding: 6 }}
              >
                {plan && !plan.managed ? (
                  canUpgrade ? (
                    <button type="button" role="menuitem" onClick={() => { closeMenu(); upgrade.open(); }} style={menuItem}>
                      <span style={{ display: "block", fontSize: 12, color: "var(--slate)", fontWeight: 400 }}>Free plan</span>
                      <span style={{ color: "var(--acc-blue)" }}>Upgrade to Premium · {peso(plan.upgradeCentavos)}</span>
                    </button>
                  ) : (
                    <div style={{ ...menuItem, cursor: "default", fontWeight: 400, color: "var(--slate)" }}>{plan.premium ? "Premium plan" : "Free plan"}</div>
                  )
                ) : null}
                <button type="button" role="menuitem" onClick={() => { closeMenu(); void save(); }} style={menuItem}>
                  Save now
                </button>
                {publishedAt && slug ? (
                  <>
                    <a role="menuitem" href={`/invite/${slug}`} target="_blank" rel="noopener noreferrer" onClick={closeMenu} style={{ ...menuItem, textDecoration: "none" }}>
                      View live site &rarr;
                    </a>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        closeMenu();
                        if (window.confirm("Take your site offline? Guests won’t be able to open it or RSVP until you publish again (free).")) unpublish();
                      }}
                      style={{ ...menuItem, color: "#b3382c" }}
                    >
                      Unpublish
                    </button>
                  </>
                ) : null}
              </div>
            </>
          ) : null}
        </header>
        {dialogs}

        <div role="tablist" aria-label="Builder view" style={{ display: "flex", flexShrink: 0, borderBottom: "1px solid var(--line)", background: "#fff" }}>
          {tabBtn("edit", "Edit")}
          {tabBtn("preview", "Preview")}
        </div>

        <div style={{ flex: 1, minHeight: 0, position: "relative" }}>
          <div
            role="tabpanel"
            id="builder-panel-edit"
            aria-labelledby="builder-tab-edit"
            inert={tab !== "edit"}
            style={{ position: "absolute", inset: 0, overflowY: "auto", padding: "4px 16px 40px", background: "#fff", zIndex: tab === "edit" ? 1 : 0, visibility: tab === "edit" ? "visible" : "hidden" }}
          >
            {editorBody}
          </div>
          <div
            role="tabpanel"
            id="builder-panel-preview"
            aria-labelledby="builder-tab-preview"
            inert={tab !== "preview"}
            style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", background: "#e3ded4", zIndex: tab === "preview" ? 1 : 0, visibility: tab === "preview" ? "visible" : "hidden" }}
          >
            <div role="group" aria-label="Preview size" style={{ display: "flex", justifyContent: "center", padding: "8px 12px", flexShrink: 0 }}>
              <span style={{ display: "inline-flex", border: "1px solid var(--line)", borderRadius: 999, padding: 2, background: "#fff" }}>
                {(["phone", "desktop"] as const).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDevice(d)}
                    aria-pressed={device === d}
                    style={{ minHeight: 40, padding: "0 18px", borderRadius: 999, border: "none", fontSize: 14, fontWeight: 600, cursor: "pointer", background: device === d ? "var(--ink)" : "transparent", color: device === d ? "#fff" : "var(--ink)" }}
                  >
                    {d === "desktop" ? "Computer" : "Phone"}
                  </button>
                ))}
              </span>
            </div>
            {renderPreview(true)}
          </div>
        </div>
      </div>
    );
  }

  return (
    // data-lenis-prevent: the app runs a global Lenis smooth-scroll
    // instance (mounted in App.tsx) that otherwise hijacks all wheel/touch
    // input for page-level scrolling. This is an app-like internal tool
    // with its own internally-scrolling panes, not a marketing scroll
    // page, so it opts out of Lenis entirely and uses native scrolling.
    <div data-lenis-prevent className="rb-shell" style={{ display: "flex", flexDirection: "column" }}>
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

        <span style={{ fontSize: 12, color: "var(--slate)" }}>{saveText}</span>
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
      {dialogs}

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
              {editorBody}
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
        {renderPreview(false)}
      </div>
    </div>
  );
}

const menuItem: React.CSSProperties = {
  display: "block",
  width: "100%",
  minHeight: 48,
  padding: "12px 14px",
  border: "none",
  borderRadius: 10,
  background: "none",
  textAlign: "left",
  fontSize: 15,
  fontWeight: 600,
  color: "var(--ink)",
  cursor: "pointer",
  lineHeight: 1.35,
};
