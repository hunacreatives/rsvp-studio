import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { matchInvitees } from "./inviteMatch";
import type { Project } from "./types";

// The guest numbers on the dashboard's event rows and "Needs your attention": replies, people
// coming, and (with an invite list) who hasn't replied yet, matched the way Guests → Invite list
// matches them. Two reads for all the events at once; kept for the session so moving between
// Home and Projects shows them straight away, then refreshed.

export type GuestStats = {
  /** Replies in. */
  replies: number;
  /** People coming (each reply's party). */
  coming: number;
  declined: number;
  /** On the hosts' invite list. */
  invited: number;
  /** On the invite list with no reply yet. */
  waiting: number;
};

type Row = { id: string; event_id: string; name: string; email: string | null; phone: string | null; attending: boolean | null; guest_count: number | null; invitee_id: string | null };
type Inv = { id: string; event_id: string; name: string; contact: string | null };

let cache: Record<string, GuestStats> = {};

/** Every row (the API returns at most 1,000 at a time). */
async function all<T>(table: "rsvps" | "invitees", cols: string, ids: string[]): Promise<T[] | null> {
  const out: T[] = [];
  for (let from = 0; from < 20000; from += 1000) {
    const { data, error } = await supabase.from(table).select(cols).in("event_id", ids).order("id").range(from, from + 999);
    if (error) return null;
    out.push(...((data ?? []) as T[]));
    if (!data || data.length < 1000) break;
  }
  return out;
}

export function summarise(replies: Row[], invitees: Inv[]): GuestStats {
  const rows = matchInvitees(invitees, replies);
  return {
    replies: replies.length,
    coming: replies.filter((r) => r.attending !== false).reduce((n, r) => n + (r.attending === false ? 0 : r.guest_count ?? 1), 0),
    declined: replies.filter((r) => r.attending === false).length,
    invited: invitees.length,
    waiting: rows.filter((r) => !r.reply).length,
  };
}

const DEMO: Record<string, GuestStats> = {
  "demo-project-nikki": { replies: 46, coming: 81, declined: 6, invited: 120, waiting: 74 },
  "demo-project-francis": { replies: 64, coming: 102, declined: 9, invited: 70, waiting: 6 },
};

/** Guest numbers per event id (events on a studio per-event table aren't counted). */
export function useGuestStats(projects: Project[], demo: boolean): Record<string, GuestStats> {
  const ids = projects.filter((p) => !p.table_name).map((p) => p.id);
  const key = ids.join(",");
  const [stats, setStats] = useState<Record<string, GuestStats>>(() => (demo ? DEMO : cache));
  useEffect(() => {
    if (demo || !key) return;
    let live = true;
    const list = key.split(",");
    Promise.all([all<Row>("rsvps", "id, event_id, name, email, phone, attending, guest_count, invitee_id", list), all<Inv>("invitees", "id, event_id, name, contact", list)]).then(([r, i]) => {
      if (!live || !r) return;
      const replies = r;
      const invitees = i ?? [];
      const next: Record<string, GuestStats> = {};
      for (const id of list) next[id] = summarise(replies.filter((x) => x.event_id === id), invitees.filter((x) => x.event_id === id));
      cache = { ...cache, ...next };
      setStats(cache);
    });
    return () => {
      live = false;
    };
  }, [key, demo]);
  return stats;
}
