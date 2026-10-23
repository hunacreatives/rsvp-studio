import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getTemplateDefinition } from "../engine/registry";
import { useTemplateCatalog } from "../engine/catalog";
import { resolveTemplate } from "../engine/render";
import { editorGroups } from "./ContentEditor";
import DetailsPanel, { openPanelPage } from "./DetailsPanel";
import GuestSettings from "./GuestSettings";
import EventTypeSetting from "./EventTypeSetting";
import CreateEventModal from "@/pages/account/components/CreateEventModal";
import PreviewCanvas from "./components/PreviewCanvas";
import { usePreviewClickToEdit, usePreviewFollow, type SiteOps } from "./components/usePreviewFollow";
import PreviewPhotoTools from "./components/PreviewPhotoTools";
import PreviewSectionTools from "./components/PreviewSectionTools";
import { useEventSiteDraft } from "./useEventSiteDraft";
import { PublishDialog, usePublishFlow } from "./PublishDialog";
import { loadPairingFonts } from "../presentation/loadFonts";
import { SiteCreditProvider } from "../engine/siteCredit";
import { UpgradeDialog, peso, useSitePlan, useUpgradeFlow } from "./SitePlan";
import { DomainReturnDialog, useDomainReturn } from "./DomainPicker";
import { isPhoneNow, useIsPhone } from "./useIsPhone";
import CharacterLoader from "@/components/CharacterLoader";
import { inquiryLink } from "@/pages/enquire/prefill";
import { inOrder } from "../templates/shared/siteEdit";
import { addItem, addSub, getField, removeItem, setField, type ListKey } from "./pageEdit";
import { DEFAULT_HIDEABLE, PageEditProvider, UndoToast, useUndoToast, type PageEdit } from "./pageEdit";
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
    undo,
    redo,
    canUndo,
    canRedo,
    checkpoint,
    eventType,
    changeEventType,
  } = useEventSiteDraft(eventId);
  const navigate = useNavigate();
  const [startingAnother, setStartingAnother] = useState(false);
  // Phones start on the phone preview (a scaled-down desktop page is unreadable there).
  const [device, setDevice] = useState<"desktop" | "phone">(() => (isPhoneNow() ? "phone" : "desktop"));
  const isPhone = useIsPhone();
  // Editing happens on the page itself; the panel (phones: the Edit tab) holds the rest.
  const [tab, setTab] = useState<"edit" | "preview">("preview");
  const [editorCollapsed, setEditorCollapsed] = useState(true);
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
  // The preview follows the field being edited (components/usePreviewFollow.ts).
  const editorRef = useRef<HTMLDivElement>(null);
  const previewScrollRef = useRef<HTMLDivElement>(null);
  const previewContentRef = useRef<HTMLDivElement>(null);
  usePreviewFollow(editorRef, previewScrollRef, previewContentRef);
  const resolved = resolveTemplate(presentation);
  const activeDefinition = getTemplateDefinition(presentation.activeTemplateId);
  // "Have us design it": the enquiry form, filled in from this site.
  const hostNames = content.hosts.map((h) => h.name).filter(Boolean).join(" & ");
  const designForMe = inquiryLink({
    service: "website",
    design: "custom",
    date: content.eventDate || undefined,
    names: hostNames || undefined,
    from: `${hostNames || "DIY site"}${activeDefinition ? ` (${activeDefinition.label} template)` : ""}`,
  });
  const offerDesign = !!plan && !plan.managed;
  loadPairingFonts(resolved?.settings.fontPairingId);

  // Undo, section switches and the "Removed … · Undo" message, for the panel and the page.
  const undoToast = useUndoToast();
  const sectionLabel = useCallback(
    (key: string) =>
      activeDefinition?.sections?.find((x) => x.key === key || x.vis?.includes(key))?.label ?? (activeDefinition?.hideable ?? DEFAULT_HIDEABLE).find((h) => h.key === key)?.label ?? "Section",
    [activeDefinition],
  );
  const hideSection = useCallback(
    (keys: string | string[], on: boolean) => {
      const list = Array.isArray(keys) ? keys : [keys];
      checkpoint();
      setPresentation((p) => {
        const r = resolveTemplate(p);
        if (!r) return p;
        const sectionVisibility = { ...r.settings.sectionVisibility };
        for (const k of list) sectionVisibility[k] = on;
        return { ...p, byTemplate: { ...p.byTemplate, [r.definition.id]: { ...r.settings, sectionVisibility } } };
      });
      if (!on) undoToast.notify(`${sectionLabel(list[0])} hidden`);
    },
    [checkpoint, setPresentation, sectionLabel, undoToast],
  );
  const moveSection = useCallback(
    (key: string, by: -1 | 1) => {
      checkpoint();
      setPresentation((p) => {
        const r = resolveTemplate(p);
        const movable = r?.definition.sections;
        if (!r || !movable) return p;
        const order = inOrder(movable.map((x) => x.key), r.settings.sectionOrder);
        const i = order.indexOf(key);
        const to = i + by;
        if (i < 0 || to < 0 || to >= order.length) return p;
        [order[i], order[to]] = [order[to], order[i]];
        return { ...p, byTemplate: { ...p.byTemplate, [r.definition.id]: { ...r.settings, sectionOrder: order } } };
      });
    },
    [checkpoint, setPresentation],
  );
  // Editing on the page: text in place, "+ Add …", a hidden section's Show (components/usePreviewFollow.ts).
  const latestContent = useRef(content);
  latestContent.current = content;
  const siteOps: SiteOps = {
    begin: checkpoint,
    get: (list, id, path) => getField(latestContent.current, list, id, path),
    set: (list, id, path, value) => setContent((c) => setField(c, list, id, path, value)),
    add: (spec) => {
      checkpoint();
      if (spec.includes(":")) {
        const r = addSub(latestContent.current, spec);
        if (!r) return null;
        setContent(r.content);
        return { list: spec.split(":")[0], id: r.id, path: r.path };
      }
      const r = addItem(latestContent.current, spec as ListKey);
      if (!r) return null;
      setContent(r.content);
      return { list: spec, id: r.id };
    },
    remove: (list, id) => setContent((c) => removeItem(c, list as ListKey, id)),
    show: (keys) => hideSection(keys, true),
  };
  usePreviewClickToEdit(
    editorRef,
    previewContentRef,
    {
      shown: () => (isPhone ? tab === "edit" : !editorCollapsed),
      open: () => (isPhone ? setTab("edit") : setEditorCollapsed(false)),
    },
    siteOps,
  );
  const pageEdit = useMemo<PageEdit>(
    () => ({ undo, redo, canUndo, canRedo, checkpoint, hideSection, moveSection, notify: undoToast.notify }),
    [undo, redo, canUndo, canRedo, checkpoint, hideSection, moveSection, undoToast.notify],
  );
  // ⌘Z / ⇧⌘Z (Ctrl on Windows). In a text box the browser's own undo works on what's typed.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k !== "z" && k !== "y") return;
      const t = e.target as HTMLElement;
      if (t.closest?.("input, textarea, select, [contenteditable='true']")) return;
      e.preventDefault();
      if (k === "y" || e.shiftKey) redo();
      else undo();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

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
  // The Details panel (DetailsPanel.tsx): the content groups in page order, Style, Settings.
  const groups = editorGroups({
    content,
    onChange: setContent,
    eventId,
    template: activeDefinition,
    premium: !!plan?.premium,
    onUpgrade: canUpgrade ? upgrade.open : undefined,
    visibility: resolved?.settings.sectionVisibility,
    onShowSection: resolved ? hideSection : undefined,
    hasCover: !!resolved?.settings.heroImage?.masterUrl,
    order: activeDefinition?.sections ? inOrder(activeDefinition.sections.map((x) => x.key), resolved?.settings.sectionOrder) : activeDefinition?.hideable?.map((h) => h.key),
  });
  const editorBody = (
    <PageEditProvider value={pageEdit}>
      <div ref={editorRef} style={{ height: "100%" }}>
        <DetailsPanel
          groups={groups}
          presentation={presentation}
          setPresentation={setPresentation}
          eventId={eventId}
          onShowSection={resolved ? hideSection : undefined}
          onClose={() => (isPhone ? setTab("preview") : setEditorCollapsed(true))}
          settings={
            <>
              {/* Studio projects: the Studio sets the event type. */}
              {plan && !plan.managed ? (
                <EventTypeSetting
                  eventType={eventType}
                  design={activeDefinition}
                  onChange={changeEventType}
                  onPickDesign={() => void save().then(() => navigate(`/account/events/${eventId}/site-builder`))}
                />
              ) : null}
              <GuestSettings eventId={eventId} slug={slug} premium={!!plan?.premium} onUpgrade={canUpgrade ? upgrade.open : undefined} price={canUpgrade ? peso(plan!.upgradeCentavos) : undefined} />
            </>
          }
        />
      </div>
    </PageEditProvider>
  );
  const dialogs = (
    <>
      {startingAnother ? <CreateEventModal onClose={() => setStartingAnother(false)} /> : null}
      <PublishDialog flow={flow} slug={slug} upsell={canUpgrade ? { price: peso(plan!.upgradeCentavos), open: upgrade.open } : null} />
      <UpgradeDialog
        flow={upgrade}
        plan={plan}
        onSettings={() => {
          if (isPhone) setTab("edit");
          else setEditorCollapsed(false);
          requestAnimationFrame(() => openPanelPage("settings"));
        }}
      />
      <DomainReturnDialog flow={domainReturn} />
      <UndoToast toast={undoToast.toast} onUndo={undo} onClose={undoToast.close} />
    </>
  );
  const undoButtons = (
    <span style={{ display: "inline-flex", gap: 2, flexShrink: 0 }}>
      <button type="button" onClick={undo} disabled={!canUndo} aria-label="Undo" title="Undo (⌘Z)" style={histBtn(!canUndo)}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M9 14 4 9l5-5" /><path d="M4 9h11a5 5 0 0 1 0 10h-3" /></svg>
      </button>
      <button type="button" onClick={redo} disabled={!canRedo} aria-label="Redo" title="Redo (⇧⌘Z)" style={histBtn(!canRedo)}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="m15 14 5-5-5-5" /><path d="M20 9H9a5 5 0 0 0 0 10h3" /></svg>
      </button>
    </span>
  );
  const renderPreview = (phoneLayout: boolean) =>
    resolved ? (
      <PreviewCanvas
        scrollRef={previewScrollRef}
        contentRefOut={previewContentRef}
        // A new design opens at its top, not wherever the last one was scrolled to.
        key={`${device}:${presentation.activeTemplateId}`}
        // Phone layout: the phone preview renders at the screen's real width, unscaled.
        deviceWidth={device === "phone" ? (phoneLayout ? "fill" : 390) : undefined}
        gutter={phoneLayout ? (device === "phone" ? 0 : 12) : undefined}
      >
        <PageEditProvider value={pageEdit}>
        {/* The preview shows the credit exactly as guests will see it. */}
        <SiteCreditProvider value={{ show: true, slug }}>
          <resolved.definition.component content={content} settings={resolved.settings} editorPreview />
        </SiteCreditProvider>
        {/* Add, drop, adjust and replace photos on the page itself. */}
        <PreviewSectionTools root={previewContentRef} scroller={previewScrollRef} definition={activeDefinition} order={resolved.settings.sectionOrder} content={content} setContent={setContent} />
        <PreviewPhotoTools root={previewContentRef} scroller={previewScrollRef} eventId={eventId} content={content} setContent={setContent} presentation={presentation} setPresentation={setPresentation} galleryLimit={activeDefinition?.galleryLimit} />
        </PageEditProvider>
      </PreviewCanvas>
    ) : (
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", background: "#f5f5f2", padding: phoneLayout ? 24 : 48, color: "var(--slate)" }}>
        Select a template to preview it.
      </div>
    );

  // The ⋯ menu (phone and desktop): plan, save now, have us design it, live site, unpublish.
  const closeMoreMenu = () => setMenuOpen(false);
  const moreItems = (
    <>
    {plan && !plan.managed ? (
      canUpgrade ? (
        <button type="button" role="menuitem" onClick={() => { closeMoreMenu(); upgrade.open(); }} style={menuItem}>
          <span style={{ display: "block", fontSize: 12, color: "var(--slate)", fontWeight: 400 }}>Free plan</span>
          <span style={{ color: "var(--acc-blue)" }}>Upgrade to Premium · {peso(plan.upgradeCentavos)}</span>
        </button>
      ) : (
        <div style={{ ...menuItem, cursor: "default", fontWeight: 400, color: "var(--slate)" }}>{plan.premium ? "Premium plan" : "Free plan"}</div>
      )
    ) : null}
    <button type="button" role="menuitem" onClick={() => { closeMoreMenu(); void save(); }} style={menuItem}>
      Save now
    </button>
    {plan && !plan.managed ? (
      <button type="button" role="menuitem" onClick={() => { closeMoreMenu(); void save(); setStartingAnother(true); }} style={menuItem}>
        Start another event
      </button>
    ) : null}
    {offerDesign ? (
      <Link role="menuitem" to={designForMe} onClick={closeMoreMenu} style={{ ...menuItem, textDecoration: "none" }}>
        Have us design it &rarr;
      </Link>
    ) : null}
    {publishedAt && slug ? (
      <>
        <a role="menuitem" href={`/invite/${slug}`} target="_blank" rel="noopener noreferrer" onClick={closeMoreMenu} style={{ ...menuItem, textDecoration: "none" }}>
          View live site &rarr;
        </a>
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            closeMoreMenu();
            if (window.confirm("Take your site offline? Guests won’t be able to open it or RSVP until you publish again (free).")) unpublish();
          }}
          style={{ ...menuItem, color: "#b3382c" }}
        >
          Unpublish
        </button>
      </>
    ) : null}
    </>
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
          {undoButtons}
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
                {moreItems}
              </div>
            </>
          ) : null}
        </header>
        {dialogs}

        <div role="tablist" aria-label="Builder view" style={{ display: "flex", flexShrink: 0, borderBottom: "1px solid var(--line)", background: "#fff" }}>
          {tabBtn("preview", "Page")}
          {tabBtn("edit", "Details")}
        </div>

        <div style={{ flex: 1, minHeight: 0, position: "relative" }}>
          <div
            role="tabpanel"
            id="builder-panel-edit"
            aria-labelledby="builder-tab-edit"
            inert={tab !== "edit"}
            style={{ position: "absolute", inset: 0, overflow: "hidden", background: "#fff", zIndex: tab === "edit" ? 1 : 0, visibility: tab === "edit" ? "visible" : "hidden" }}
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
      {/* One row: the design (back to templates), the preview size, then undo/redo, the save
          state, ⋯ (plan, design help, live site) and Publish. Everything saves on its own. */}
      <header style={{ position: "relative", display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: 16, height: 60, padding: "0 16px 0 12px", borderBottom: "1px solid var(--line)", background: "#fff" }}>
        <Link to={`/account/events/${eventId}/site-builder`} title="Change design" style={{ display: "inline-flex", alignItems: "center", gap: 8, minWidth: 0, justifySelf: "start", padding: "6px 10px", borderRadius: 8, fontSize: 14, fontWeight: 600, color: "var(--ink)", textDecoration: "none" }} className="dp-hover">
          <span aria-hidden style={{ color: "var(--slate)" }}>&larr;</span>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{activeDefinition?.label ?? "Choose a design"}</span>
        </Link>
        <span style={{ display: "inline-flex", border: "1px solid var(--line)", borderRadius: 999, padding: 2 }} role="group" aria-label="Preview size">
          {(["desktop", "phone"] as const).map((d) => (
            <button
              key={d}
              onClick={() => setDevice(d)}
              aria-pressed={device === d}
              style={{ padding: "6px 14px", borderRadius: 999, border: "none", fontSize: 12.5, fontWeight: 600, cursor: "pointer", background: device === d ? "var(--ink)" : "transparent", color: device === d ? "#fff" : "var(--ink)" }}
            >
              {d === "desktop" ? "Computer" : "Phone"}
            </button>
          ))}
        </span>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10 }}>
          {undoButtons}
          <span aria-live="polite" style={{ fontSize: 12, whiteSpace: "nowrap", color: publishedAt && hasUnpublishedChanges && !unsaved ? "#8a5a00" : "var(--slate)" }}>
            {publishedAt && hasUnpublishedChanges && !unsaved && saveStatus !== "saving" ? "Saved · not live yet" : saveText}
          </span>
          <button
            type="button"
            aria-label="More options"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
            style={{ width: 36, height: 36, borderRadius: 999, border: "1px solid var(--line)", background: "#fff", color: "var(--ink)", fontSize: 18, lineHeight: 1, cursor: "pointer" }}
          >
            &#8943;
          </button>
          <button onClick={flow.start} style={{ padding: "9px 18px", borderRadius: 999, border: "none", background: "var(--ink)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
            {publishedAt ? "Update live site" : "Publish"}
          </button>
        </div>
        {menuOpen ? (
          <>
            <div onClick={closeMoreMenu} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
            <div role="menu" style={{ position: "absolute", top: 54, right: 120, zIndex: 41, width: 260, background: "#fff", border: "1px solid var(--line)", borderRadius: 14, boxShadow: "0 16px 40px -12px rgba(0,7,39,0.3)", padding: 6 }}>
              {moreItems}
            </div>
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
                overflow: "hidden",
                borderRight: "1px solid var(--line)",
              }}
            >
              {editorBody}
            </div>
          </div>

          {/* Closed (the default — editing happens on the page): a "Details" tab on the screen's
              edge. Open, the panel's own × closes it. */}
          {editorCollapsed ? (
          <button
            onClick={() => setEditorCollapsed((v) => !v)}
            title={editorCollapsed ? "Open the details panel" : "Close the panel — edit on the page"}
            aria-label={editorCollapsed ? "Open the details panel" : "Close the details panel"}
            aria-expanded={!editorCollapsed}
            style={{
              position: "absolute",
              top: "50%",
              left: "100%",
              transform: editorCollapsed ? "translate(0, -50%)" : "translate(-50%, -50%)",
              minWidth: 44,
              height: 44,
              padding: editorCollapsed ? "0 14px 0 10px" : 0,
              gap: 6,
              borderRadius: editorCollapsed ? "0 999px 999px 0" : 999,
              border: "1px solid var(--line)",
              borderLeft: editorCollapsed ? "none" : "1px solid var(--line)",
              background: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              boxShadow: "0 2px 10px rgba(0,7,39,0.14)",
              zIndex: 5,
              fontSize: 13,
              fontWeight: 600,
              color: "var(--ink)",
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
                transition: "transform 0.32s cubic-bezier(0.65, 0, 0.35, 1)",
                transform: editorCollapsed ? "rotate(180deg)" : "none",
              }}
            >
              &#8249;
            </span>
            {editorCollapsed ? "Details" : null}
          </button>
          ) : null}
        </div>
        {renderPreview(false)}
      </div>
    </div>
  );
}

const histBtn = (off: boolean): React.CSSProperties => ({ width: 36, height: 36, display: "grid", placeItems: "center", border: 0, borderRadius: 999, background: "none", color: "var(--ink)", cursor: off ? "default" : "pointer", opacity: off ? 0.3 : 1 });

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
