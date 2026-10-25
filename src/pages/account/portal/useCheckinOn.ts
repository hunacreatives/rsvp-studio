import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

// Which client events have Mesa's day-of check-in switched on (in one of my plans for them),
// for the next step on the Coordinator desk and Clients (both read it the same way).

/** This week's events whose day-of check-in is on (in one of my Mesa plans for them). */
export function useCheckinOn(ids: string[], demo: boolean) {
  const [on, setOn] = useState<Record<string, boolean>>({});
  const key = ids.join(",");
  useEffect(() => {
    if (demo || !key) return;
    let alive = true;
    supabase
      .from("seating_charts")
      .select("event_id, checkin_token, checkin_until")
      .in("event_id", key.split(","))
      .then(({ data }) => {
        if (!alive) return;
        const next: Record<string, boolean> = {};
        for (const c of (data ?? []) as { event_id: string; checkin_token: string | null; checkin_until: string | null }[])
          if (c.checkin_token && c.checkin_until && Date.parse(c.checkin_until) > Date.now()) next[c.event_id] = true;
        setOn(next);
      });
    return () => {
      alive = false;
    };
  }, [key, demo]);
  return on;
}

