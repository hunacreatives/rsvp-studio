import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import GuestTable, { type Guest } from "./GuestTable";

export type Event = {
  id: string;
  name: string;
  event_date: string | null;
  table_name: string;
};

export default function EventsSection({ events }: { events: Event[] }) {
  const [activeId, setActiveId] = useState<string | null>(events[0]?.id ?? null);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(false);

  const activeEvent = events.find((e) => e.id === activeId);

  useEffect(() => {
    if (!activeEvent) return;
    setLoading(true);
    supabase
      .from(activeEvent.table_name)
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setGuests((data ?? []) as Guest[]);
        setLoading(false);
      });
  }, [activeEvent]);

  if (events.length === 0) {
    return (
      <div className="rounded-2xl p-10 text-center" style={{ background: "#fff", border: "1px solid var(--line)" }}>
        <p style={{ color: "var(--slate)" }}>No events linked to your account yet.</p>
      </div>
    );
  }

  return (
    <div>
      {events.length > 1 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {events.map((e) => (
            <button
              key={e.id}
              onClick={() => setActiveId(e.id)}
              className="px-4 py-2.5 rounded-xl text-[13px] font-medium transition-colors"
              style={{
                background: activeId === e.id ? "var(--ink)" : "#fff",
                color: activeId === e.id ? "#fff" : "var(--slate)",
                border: "1px solid var(--line)",
              }}
            >
              {e.name}
            </button>
          ))}
        </div>
      )}

      <div className="mb-6">
        <p className="eyebrow mb-2">RSVP Responses</p>
        <h2 className="font-display text-2xl font-semibold" style={{ color: "var(--ink)" }}>
          {activeEvent?.name}
        </h2>
        {activeEvent?.event_date && (
          <p className="text-[13px] mt-1" style={{ color: "var(--slate)" }}>
            {new Date(activeEvent.event_date).toLocaleDateString(undefined, {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        )}
      </div>

      {loading ? <p style={{ color: "var(--slate)" }}>Loading RSVPs…</p> : <GuestTable guests={guests} />}
    </div>
  );
}
