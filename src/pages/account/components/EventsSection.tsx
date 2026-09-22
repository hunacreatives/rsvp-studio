import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import GuestTable, { type Guest } from "./GuestTable";
import EventCard from "./EventCard";
import CreateEventModal from "./CreateEventModal";

export type Event = {
  id: string;
  name: string;
  event_date: string | null;
  table_name: string | null;
  event_type?: string | null;
  status?: string | null;
  role: "Owner" | "Member";
};

interface SiteSummary {
  venueName?: string;
  heroImageUrl?: string;
}

// Card-grid "Upcoming Events" dashboard (Decision 5) — the grid is the
// entry point; opening a card drills into that event's RSVP list (the
// previous flat behavior of this component).
export default function EventsSection({ events }: { events: Event[] }) {
  const navigate = useNavigate();
  const [view, setView] = useState<"grid" | "guests">("grid");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loadingGuests, setLoadingGuests] = useState(false);
  const [siteSummaries, setSiteSummaries] = useState<Record<string, SiteSummary>>({});
  const [search, setSearch] = useState("");
  const [creatingEvent, setCreatingEvent] = useState(false);
  const [localEvents, setLocalEvents] = useState(events);

  useEffect(() => setLocalEvents(events), [events]);

  const activeEvent = localEvents.find((e) => e.id === activeId);
  const visibleEvents = localEvents.filter(
    (e) => e.status !== "archived" && e.name.toLowerCase().includes(search.toLowerCase())
  );

  // One batched query for venue/hero-image previews, rather than one
  // query per card — every event's wedding_sites draft (if it has one
  // yet) is fetched together.
  useEffect(() => {
    const ids = localEvents.map((e) => e.id);
    if (ids.length === 0) return;
    supabase
      .from("wedding_sites")
      .select("event_id, draft_content")
      .in("event_id", ids)
      .then(({ data }) => {
        const summaries: Record<string, SiteSummary> = {};
        for (const row of data ?? []) {
          const content = row.draft_content as {
            primaryLocation?: { name?: string };
            galleries?: { items?: { image?: { masterUrl?: string } }[] }[];
          } | null;
          summaries[row.event_id as string] = {
            venueName: content?.primaryLocation?.name || undefined,
            heroImageUrl: content?.galleries?.[0]?.items?.[0]?.image?.masterUrl || undefined,
          };
        }
        setSiteSummaries(summaries);
      });
  }, [localEvents]);

  useEffect(() => {
    if (view !== "guests" || !activeEvent) return;
    setLoadingGuests(true);
    const query = activeEvent.table_name
      ? supabase.from(activeEvent.table_name).select("*")
      : supabase.from("rsvps").select("*").eq("event_id", activeEvent.id);
    query.order("created_at", { ascending: false }).then(({ data }) => {
      setGuests((data ?? []) as Guest[]);
      setLoadingGuests(false);
    });
  }, [view, activeEvent]);

  async function handleArchive(eventId: string) {
    await supabase.from("events").update({ status: "archived" }).eq("id", eventId);
    setLocalEvents((prev) => prev.map((e) => (e.id === eventId ? { ...e, status: "archived" } : e)));
  }

  if (view === "guests" && activeEvent) {
    return (
      <div>
        <button
          onClick={() => setView("grid")}
          className="text-[13px] mb-6"
          style={{ color: "var(--slate)", background: "none", border: "none", cursor: "pointer" }}
        >
          &larr; Back to Events
        </button>
        <div className="mb-6">
          <p className="eyebrow mb-2">RSVP Responses</p>
          <h2 className="font-display text-2xl font-semibold" style={{ color: "var(--ink)" }}>
            {activeEvent.name}
          </h2>
          {activeEvent.event_date && (
            <p className="text-[13px] mt-1" style={{ color: "var(--slate)" }}>
              {new Date(activeEvent.event_date).toLocaleDateString(undefined, {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          )}
        </div>
        {loadingGuests ? <p style={{ color: "var(--slate)" }}>Loading RSVPs…</p> : <GuestTable guests={guests} />}
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <h2 className="font-display text-2xl font-semibold" style={{ color: "var(--ink)" }}>
          Upcoming Events
        </h2>
        <div className="flex items-center gap-3">
          <input
            placeholder="Find Event"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-4 py-2.5 rounded-full text-[13px]"
            style={{ background: "var(--paper)", border: "none", minWidth: 160 }}
          />
          <button
            onClick={() => setCreatingEvent(true)}
            className="px-5 py-2.5 rounded-full text-[13px] font-medium"
            style={{ background: "var(--ink)", color: "#fff" }}
          >
            + Create Event
          </button>
        </div>
      </div>

      {visibleEvents.length === 0 ? (
        <div className="rounded-2xl p-10 text-center" style={{ background: "#fff", border: "1px solid var(--line)" }}>
          <p style={{ color: "var(--slate)" }}>No events yet — create one to get started.</p>
        </div>
      ) : (
        <div className="grid gap-6" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))" }}>
          {visibleEvents.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              role={event.role}
              venueName={siteSummaries[event.id]?.venueName}
              heroImageUrl={siteSummaries[event.id]?.heroImageUrl}
              onOpen={() => {
                setActiveId(event.id);
                setView("guests");
              }}
              onEditWebsite={() => navigate(`/account/events/${event.id}/site-builder/edit`)}
              onArchive={() => handleArchive(event.id)}
            />
          ))}
        </div>
      )}

      {creatingEvent ? <CreateEventModal onClose={() => setCreatingEvent(false)} /> : null}
    </div>
  );
}
