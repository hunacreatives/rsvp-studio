import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { slugify } from "@/pages/wedding-sites/content/slugify";
import { emptyEventContent, defaultPresentation } from "@/pages/wedding-sites/builder/useEventSiteDraft";
import type { EventContent } from "@/pages/wedding-sites/content/types";

export type EventType = "wedding" | "birthday" | "anniversary" | "baby" | "engagement" | "other";

export interface CreateEventInput {
  eventType: EventType;
  hostNames: string[]; // 1 or 2, depending on eventType — see CreateEventForm
  venueName?: string; // omitted if "still deciding"
  eventDate?: string; // omitted if "still deciding"
  /** "Add a client": who to send the hand-over invite to, right after (optional). */
  clientEmail?: string;
}

const EVENT_TYPE_LABEL: Record<EventType, string> = {
  wedding: "Wedding",
  birthday: "Birthday",
  anniversary: "Anniversary",
  baby: "Celebration",
  engagement: "Engagement",
  other: "Celebration",
};

function buildEventName(input: CreateEventInput): string {
  const names = input.hostNames.filter(Boolean);
  if (names.length >= 2) return `${names[0]} & ${names[1]}`;
  if (names.length === 1) return `${names[0]}'s ${EVENT_TYPE_LABEL[input.eventType]}`;
  return EVENT_TYPE_LABEL[input.eventType];
}

/**
 * Self-serve event creation. Inserts an `events` row (owner_id = the
 * current user — this only works once `self-serve-events-schema.sql`'s
 * insert policy has been run) with `table_name` left null, meaning RSVPs
 * for this event go into the new shared `rsvps` table, not a
 * hand-provisioned per-event table. See Decision 1 in
 * docs/template-builder-decisions.md.
 *
 * Also immediately seeds a `wedding_sites` draft from the same quick-start
 * answers (hosts/date/venue), reusing the exact EventContent shape the
 * builder already uses — so the couple lands on the template gallery with
 * real content already in place instead of a blank draft.
 *
 * `forClient`: a coordinator adding a client's event (supabase/coordinator-desk.sql). They own
 * it (client_of = them) until the client takes it over.
 */
export function useCreateEvent({ forClient = false }: { forClient?: boolean } = {}) {
  const [status, setStatus] = useState<"idle" | "creating" | "error">("idle");
  const [errorDetail, setErrorDetail] = useState<string | null>(null);

  async function createEvent(input: CreateEventInput): Promise<string | null> {
    setStatus("creating");
    setErrorDetail(null);

    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
      console.error("useCreateEvent: no active session");
      setErrorDetail("You need to be signed in to create an event.");
      setStatus("error");
      return null;
    }

    const name = buildEventName(input);

    const { data: event, error: eventError } = await supabase
      .from("events")
      .insert({
        owner_id: session.user.id,
        name,
        event_type: input.eventType,
        event_date: input.eventDate || null,
        table_name: null,
        ...(forClient ? { client_of: session.user.id } : {}),
      })
      .select("id")
      .single();

    if (eventError || !event) {
      console.error("useCreateEvent: failed to insert events row", eventError);
      const message = eventError?.message ?? "";
      setErrorDetail(
        /CLIENT_LIMIT/.test(message)
          ? "You can have 10 clients at a time before handing them over. Hand one over to add another."
          : forClient && (eventError?.code === "PGRST204" || /client_of/.test(message))
            ? "Adding clients isn’t switched on yet. Please try again in a little while."
            : /PROJECT_LIMIT/.test(message)
              ? "Accounts can have 10 projects at a time. Delete one to start another."
              : /FREE_LIMIT/.test(message)
                ? "Free accounts can have 3 projects at a time. Make one Premium or delete one to start another."
                : "Couldn’t create your event — please try again.",
      );
      setStatus("error");
      return null;
    }

    const seededContent: EventContent = {
      ...emptyEventContent(""), // rsvpTableName is unused when table_name is null — the shared `rsvps` table is looked up by event_id server-side, same as legacy events look up table_name.
      hosts: input.hostNames.filter(Boolean).map((hostName, index) => ({
        id: `host-${index + 1}`,
        name: hostName,
      })),
      eventDate: input.eventDate ?? "",
      primaryLocation: { id: "location-main", name: input.venueName ?? "", addressLine: "" },
    };

    const baseSlug = slugify(name);
    const UNIQUE_VIOLATION = "23505";
    let siteError = null;

    for (let attempt = 1; attempt <= 20; attempt++) {
      const slug = attempt === 1 ? baseSlug : `${baseSlug}-${attempt}`;
      const { error } = await supabase.from("wedding_sites").insert({
        event_id: event.id,
        slug,
        draft_content: seededContent,
        draft_presentation: defaultPresentation(),
      });
      if (!error) {
        siteError = null;
        break;
      }
      siteError = error;
      // Someone else already has this exact slug (same couple names) —
      // try the next suffix. Any other failure (RLS, network, bad schema)
      // isn't fixable by retrying, so stop immediately.
      if (error.code !== UNIQUE_VIOLATION) break;
    }

    if (siteError) {
      console.error("useCreateEvent: failed to insert wedding_sites draft", siteError);
      setErrorDetail(
        siteError.code === UNIQUE_VIOLATION
          ? "That event name is taken too many times over — try adding a middle name or nickname."
          : "Something went wrong creating your event site. Please try again."
      );
      setStatus("error");
      return null;
    }

    setStatus("idle");
    return event.id as string;
  }

  return { createEvent, status, errorDetail };
}
