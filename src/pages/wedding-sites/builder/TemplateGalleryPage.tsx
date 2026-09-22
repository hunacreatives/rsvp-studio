import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import Navbar from "@/pages/home/components/Navbar";
import { listTemplateDefinitions, type TemplateArchetype, type TemplateDefinition } from "../engine/registry";
import type { PresentationState } from "../presentation/types";
import { useEventSiteDraft } from "./useEventSiteDraft";
import TemplateMockupPreview from "./components/TemplateMockupPreview";

const EVENT_TYPE_LABEL: Record<string, string> = {
  wedding: "Wedding",
  birthday: "Birthday",
  anniversary: "Anniversary",
  other: "Celebration",
};

// The dedicated entry point for building an event website/evite — a real
// page of its own, not a dropdown buried inside the RSVP-management
// dashboard. Works for any event type (wedding, birthday, anniversary,
// etc.), not just weddings. Hosts land here first, browse templates as
// photo-forward cards (name below, action revealed on hover), and picking
// one takes them into the editor with that template already selected as
// their DRAFT (never publishes anything by itself).

function TemplateCard({
  template,
  selected,
  onSelect,
}: {
  template: TemplateDefinition;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    // A div, not a <button>: templates that preview with real demo
    // content can contain their own buttons, and nesting interactive
    // elements is invalid HTML.
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      className="text-left group"
      style={{ cursor: "pointer" }}
    >
      <div
        className="relative rounded-2xl overflow-hidden transition-shadow"
        style={{
          aspectRatio: "4 / 3",
          border: selected ? "2px solid var(--ink)" : "1px solid var(--line)",
          boxShadow: "0 1px 3px rgba(0,7,39,0.06)",
        }}
      >
        <TemplateMockupPreview template={template} />

        {template.tier === "premium" ? (
          <span
            className="absolute top-3 left-3 px-2 py-0.5 rounded-full text-[11px] font-semibold"
            style={{ background: "var(--acc-yellow)", color: "var(--ink)" }}
          >
            Premium
          </span>
        ) : null}

        <div
          className={`absolute inset-0 flex items-center justify-center transition-opacity ${
            selected ? "" : "opacity-0 group-hover:opacity-100"
          }`}
          style={{
            background: "rgba(0,7,39,0.55)",
            opacity: selected ? 1 : undefined,
          }}
        >
          <span
            className="px-5 py-2.5 rounded-full text-[13px] font-medium"
            style={{ background: "#fff", color: "var(--ink)" }}
          >
            {selected ? "Selected — continue editing →" : "Select Design →"}
          </span>
        </div>
      </div>

      <p className="font-display text-center text-[17px] mt-3" style={{ color: "var(--ink)" }}>
        {template.label}
      </p>
    </div>
  );
}

export default function TemplateGalleryPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { status, errorDetail, presentation, setPresentation, save } = useEventSiteDraft(eventId);
  const templates = listTemplateDefinitions();
  const [eventType, setEventType] = useState<string | null>(null);
  const [archetypeFilter, setArchetypeFilter] = useState<TemplateArchetype | "all">("all");

  useEffect(() => {
    if (!eventId) return;
    supabase
      .from("events")
      .select("event_type")
      .eq("id", eventId)
      .maybeSingle()
      .then(({ data }) => setEventType((data?.event_type as string | null) ?? null));
  }, [eventId]);

  const subtitle = `${EVENT_TYPE_LABEL[eventType ?? ""] ?? "Event"} Website`;
  const archetypes = Array.from(new Set(templates.map((t) => t.archetype)));
  const visibleTemplates = templates.filter((t) => archetypeFilter === "all" || t.archetype === archetypeFilter);

  async function chooseTemplate(templateId: string) {
    // Computed explicitly (not via setPresentation's updater callback)
    // so the exact new value can be passed straight to save() below —
    // save() previously ran with the pre-update `presentation` still in
    // its closure (state updates are async), silently persisting the OLD
    // template selection while the UI showed the new one as "Selected".
    const nextPresentation: PresentationState = presentation.byTemplate[templateId]
      ? { ...presentation, activeTemplateId: templateId }
      : {
          activeTemplateId: templateId,
          byTemplate: {
            ...presentation.byTemplate,
            [templateId]: templates.find((t) => t.id === templateId)?.defaultSettings ?? presentation.byTemplate[templateId],
          },
        };

    setPresentation(nextPresentation);
    // Persist the selection immediately so it's never lost, then move into
    // the editor. Selecting a template only ever touches draft state —
    // nothing is published here.
    await save({ presentation: nextPresentation });
    navigate(`/account/events/${eventId}/site-builder/edit`);
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--warm-white)" }}>
      <Navbar />
      <div className="container-x py-14">
        <p className="eyebrow mb-3 text-center">{subtitle}</p>
        <h1 className="font-display text-3xl md:text-4xl font-semibold text-center" style={{ color: "var(--ink)" }}>
          Choose Your Design
        </h1>
        <p className="mt-3 text-center max-w-xl mx-auto" style={{ color: "var(--slate)" }}>
          Enter your details once and switch designs later without losing anything you&apos;ve
          written.
        </p>

        {/* Filter row — "All Layouts" is a real, functional archetype
            filter (only as many pills as there are actual archetypes among
            registered templates); no decorative dropdowns for facets
            (Collection/Color/Matching Prints) that don't map to anything
            real yet. */}
        <div className="flex flex-wrap justify-center gap-2 mt-8">
          <button
            onClick={() => setArchetypeFilter("all")}
            className="px-4 py-2 rounded-full text-[13px] font-medium"
            style={{
              background: archetypeFilter === "all" ? "var(--ink)" : "var(--paper)",
              color: archetypeFilter === "all" ? "#fff" : "var(--ink)",
            }}
          >
            All Layouts
          </button>
          {archetypes.map((archetype) => (
            <button
              key={archetype}
              onClick={() => setArchetypeFilter(archetype)}
              className="px-4 py-2 rounded-full text-[13px] font-medium capitalize"
              style={{
                background: archetypeFilter === archetype ? "var(--ink)" : "var(--paper)",
                color: archetypeFilter === archetype ? "#fff" : "var(--ink)",
              }}
            >
              {archetype.replace("-", " ")}
            </button>
          ))}
        </div>

        {status === "loading" ? (
          <p className="mt-10 text-center" style={{ color: "var(--slate)" }}>
            Loading&hellip;
          </p>
        ) : status === "error" ? (
          <div className="mt-10 text-center">
            <p style={{ color: "var(--slate)" }}>Couldn&apos;t load this event&apos;s site yet.</p>
            {errorDetail ? (
              <p className="mt-2 text-[12px]" style={{ color: "var(--acc-coral)" }}>
                {errorDetail}
              </p>
            ) : null}
          </div>
        ) : (
          <div
            className="mt-10 grid gap-x-6 gap-y-10"
            style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}
          >
            {visibleTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                selected={presentation.activeTemplateId === template.id}
                onSelect={() => chooseTemplate(template.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
