import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import GuestTable, { type Guest } from "./components/GuestTable";

type Event = {
  id: string;
  name: string;
  event_date: string | null;
  table_name: string;
};

export default function AccountDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<Event[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [guestsLoading, setGuestsLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        navigate("/");
        return;
      }

      const ownEvents = await supabase
        .from("events")
        .select("id, name, event_date, table_name")
        .eq("owner_id", session.user.id);
      const memberEvents = await supabase
        .from("event_members")
        .select("events(id, name, event_date, table_name)")
        .eq("profile_id", session.user.id);

      const combined: Event[] = [
        ...(ownEvents.data ?? []),
        ...((memberEvents.data ?? []).flatMap((r) => (r.events ? [r.events as unknown as Event] : []))),
      ];

      if (combined.length === 0) {
        navigate("/account/onboarding");
        return;
      }

      setEvents(combined);
      setActiveId(combined[0].id);
      setLoading(false);
    })();
  }, [navigate]);

  useEffect(() => {
    if (!activeId) return;
    const event = events.find((e) => e.id === activeId);
    if (!event) return;

    setGuestsLoading(true);
    supabase
      .from(event.table_name)
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setGuests((data ?? []) as Guest[]);
        setGuestsLoading(false);
      });
  }, [activeId, events]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center" style={{ background: "var(--warm-white)" }}>
        <p style={{ color: "var(--slate)" }}>Loading…</p>
      </div>
    );
  }

  const activeEvent = events.find((e) => e.id === activeId);

  return (
    <div className="min-h-screen" style={{ background: "var(--warm-white)" }}>
      <div className="container-x py-10">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <p className="eyebrow mb-2">RSVP Responses</p>
            <h1 className="font-display text-3xl font-semibold" style={{ color: "var(--ink)" }}>
              {activeEvent?.name}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {events.length > 1 && (
              <select
                value={activeId ?? ""}
                onChange={(e) => setActiveId(e.target.value)}
                className="rounded-xl px-4 py-2.5 text-[14px] outline-none"
                style={{ background: "#fff", border: "1px solid var(--line)" }}
              >
                {events.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
            )}
            <button onClick={handleSignOut} className="btn btn-ghost !py-2.5 !px-5 !text-[12px]">
              Sign Out
            </button>
          </div>
        </div>

        {guestsLoading ? (
          <p style={{ color: "var(--slate)" }}>Loading RSVPs…</p>
        ) : (
          <GuestTable guests={guests} />
        )}
      </div>
    </div>
  );
}
