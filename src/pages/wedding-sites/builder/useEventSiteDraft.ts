import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { normalizeEventContent } from "../content/normalize";
import { slugify } from "../content/slugify";
import type { EventContent } from "../content/types";
import type { PresentationState } from "../presentation/types";
import { defaultBaseTemplateSettings } from "../engine/render";

// Data layer for the builder shell. Talks to the `wedding_sites` table
// added in supabase/wedding-sites-schema.sql — that migration must be run
// (via the Supabase dashboard, per the existing project convention)
// before this hook can do anything beyond fail to find a row.
//
// The underlying table/column names are still "wedding_sites" — kept
// as-is post-generalization since it's an internal identifier nobody
// outside the codebase ever sees, and it was already run against
// production with zero rows at stake; a cosmetic rename to
// "event_sites" is a trivial, purely-additive follow-up if wanted later.
// See docs/template-builder-decisions.md.
//
// Always reads/writes draft_content + draft_presentation. Publishing is
// the one explicit action that copies draft -> published. See Decision 6
// in docs/template-builder-decisions.md.

const DEFAULT_TEMPLATE_ID = "editorial-formal";

/** Exported so useCreateEvent can seed a real draft (hosts/date/venue)
 *  from the quick-start form instead of duplicating this shape. */
export function emptyEventContent(rsvpTableName: string): EventContent {
  return {
    id: "",
    slug: "",
    hosts: [{ id: "host-1", name: "" }],
    eventDate: "",
    // NOT seeded from the account portal's event name — that's an
    // internal RSVP-management label (e.g. "Tercel's 41st Birthday"),
    // not a venue name, and defaulting to it produced a confusing
    // pre-filled value that looked broken in the rendered template.
    primaryLocation: { id: "location-main", name: "", addressLine: "" },
    schedule: [],
    accommodations: [],
    travelInformation: [],
    galleries: [],
    registryLinks: [],
    faqs: [],
    keyPeople: [],
    rsvpTableName,
  };
}

/** Also exported for useCreateEvent — a fresh draft always starts on the
 *  same default template, whether it's created here or at event-creation
 *  time. */
export function defaultPresentation(): PresentationState {
  return {
    activeTemplateId: DEFAULT_TEMPLATE_ID,
    byTemplate: { [DEFAULT_TEMPLATE_ID]: defaultBaseTemplateSettings() },
  };
}

interface EventInfo {
  id: string;
  name: string;
  table_name: string;
}

export type DraftStatus = "loading" | "ready" | "error";
export type SaveStatus = "idle" | "saving" | "saved" | "error";

export function useEventSiteDraft(eventId: string | undefined) {
  const [siteId, setSiteId] = useState<string | null>(null);
  const [slug, setSlug] = useState<string>("");
  const [content, setContent] = useState<EventContent>(() => emptyEventContent(""));
  const [presentation, setPresentation] = useState<PresentationState>(defaultPresentation());
  const [publishedAt, setPublishedAt] = useState<string | null>(null);
  const [status, setStatus] = useState<DraftStatus>("loading");
  const [errorDetail, setErrorDetail] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!eventId) return;
      setStatus("loading");

      const { data: event, error: eventError } = await supabase
        .from("events")
        .select("id, name, table_name")
        .eq("id", eventId)
        .maybeSingle<EventInfo>();

      if (!event) {
        const detail = eventError ? eventError.message : `No event found for id ${eventId}`;
        console.error("useEventSiteDraft: failed to load event", eventError ?? eventId);
        if (!cancelled) {
          setErrorDetail(detail);
          setStatus("error");
        }
        return;
      }

      const { data: existing } = await supabase
        .from("wedding_sites")
        .select("id, slug, draft_content, draft_presentation, published_at")
        .eq("event_id", eventId)
        .maybeSingle();

      if (cancelled) return;

      if (existing) {
        setSiteId(existing.id);
        setSlug(existing.slug);
        setContent(normalizeEventContent(existing.draft_content));
        const draftPresentation = existing.draft_presentation as PresentationState;
        setPresentation(
          draftPresentation && draftPresentation.activeTemplateId ? draftPresentation : defaultPresentation()
        );
        setPublishedAt(existing.published_at);
        setStatus("ready");
        return;
      }

      // First time this event's site is opened: create the draft row.
      //
      // FUTURE SUBSCRIPTION GATE: today an account can build a site for
      // every event it's linked to, with no limit. The plan is for
      // free/unpaid accounts to be limited to exactly one site build; the
      // check belongs right here, before this insert — e.g. "does this
      // profile already own a wedding_sites row (via another event) and
      // are they unsubscribed? If so, block and prompt to upgrade instead
      // of creating a second one." Not implemented yet — no billing/plan
      // concept exists anywhere in this codebase today.
      const initialContent = emptyEventContent(event.table_name);
      const initialPresentation = defaultPresentation();
      const baseSlug = slugify(event.name);

      const { data: inserted, error: insertError } = await supabase
        .from("wedding_sites")
        .insert({
          event_id: eventId,
          slug: baseSlug,
          draft_content: initialContent,
          draft_presentation: initialPresentation,
        })
        .select("id, slug")
        .single();

      if (cancelled) return;

      if (insertError || !inserted) {
        // Most likely cause: slug collision, or wedding-sites-schema.sql
        // hasn't been run yet. Surface as an error rather than silently
        // retrying forever.
        console.error("useEventSiteDraft: failed to create wedding_sites draft", insertError);
        setErrorDetail(insertError?.message ?? "Insert failed");
        setStatus("error");
        return;
      }

      setSiteId(inserted.id);
      setSlug(inserted.slug);
      setContent(initialContent);
      setPresentation(initialPresentation);
      setStatus("ready");
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  // Accepts optional overrides so a caller that just called setContent/
  // setPresentation can save the EXACT value it computed, instead of
  // relying on this closure's `content`/`presentation` — those reflect
  // this render's state, not a state update scheduled moments earlier in
  // the same event handler (state updates are async; calling save()
  // immediately after setPresentation() would otherwise persist the
  // stale pre-update value, since this callback's closure hasn't seen
  // the update yet). Bug found via template selection silently reverting
  // to the previous template on reload — see decision log.
  const save = useCallback(async (overrides?: { content?: EventContent; presentation?: PresentationState }) => {
    if (!siteId) return;
    setSaveStatus("saving");
    const nextContent = overrides?.content ?? content;
    const nextPresentation = overrides?.presentation ?? presentation;
    const { error } = await supabase
      .from("wedding_sites")
      .update({ draft_content: nextContent, draft_presentation: nextPresentation })
      .eq("id", siteId);
    setSaveStatus(error ? "error" : "saved");
  }, [siteId, content, presentation]);

  const publish = useCallback(async () => {
    if (!siteId) return;
    setSaveStatus("saving");
    const nowIso = new Date().toISOString();
    const { error } = await supabase
      .from("wedding_sites")
      .update({
        draft_content: content,
        draft_presentation: presentation,
        published_content: content,
        published_presentation: presentation,
        published_at: nowIso,
      })
      .eq("id", siteId);
    if (!error) setPublishedAt(nowIso);
    setSaveStatus(error ? "error" : "saved");
  }, [siteId, content, presentation]);

  return {
    status,
    errorDetail,
    saveStatus,
    slug,
    publishedAt,
    content,
    setContent,
    presentation,
    setPresentation,
    save,
    publish,
  };
}
