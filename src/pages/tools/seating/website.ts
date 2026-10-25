import { supabase } from "@/lib/supabase";
import type { Reply } from "./replies";
import type { Invitee, SeatMatch } from "./seatmatch";

export { householdLine, matchSeats, type Invitee, type SeatMatch } from "./seatmatch";
export type { Reply } from "./replies";

// Send seats to the event website: each household's table goes onto the event's invite
// list (invitees.table_label), which the site's "Find your table" page and every guest's
// personal invite link read (supabase/guest-links.sql, seating-website.sql). Mesa matches
// its households to the invite list by name; households not on it can be added.

export interface SiteEvent {
  id: string;
  name: string;
  date: string | null;
  slug: string | null;
  live: boolean;
  premium: boolean;
  finder: boolean;
  /** An older custom site that keeps replies in its own table: Mesa can't read them. */
  legacy: boolean;
  /** wedding, debut, birthday… (events.event_type) */
  type: string | null;
}


/** The host's events (owned or shared with them) and their websites. */
export async function myEvents(userId: string): Promise<SiteEvent[]> {
  const cols = "id, name, event_date, event_type, deleted_at, table_name";
  const [own, member] = await Promise.all([supabase.from("events").select(cols).eq("owner_id", userId), supabase.from("event_members").select(`events(${cols})`).eq("profile_id", userId)]);
  type E = { id: string; name: string; event_date: string | null; event_type: string | null; deleted_at: string | null; table_name: string | null };
  const byId = new Map<string, E>();
  for (const e of (own.data ?? []) as E[]) byId.set(e.id, e);
  for (const r of (member.data ?? []) as unknown as { events: E | null }[]) if (r.events) byId.set(r.events.id, r.events);
  const events = [...byId.values()].filter((e) => !e.deleted_at);
  if (!events.length) return [];
  const ids = events.map((e) => e.id);
  const [sites, life] = await Promise.all([supabase.from("wedding_sites").select("event_id, slug, published_at, table_finder").in("event_id", ids), supabase.rpc("project_lifecycle", { p_ids: ids })]);
  const site = new Map(((sites.data ?? []) as { event_id: string; slug: string | null; published_at: string | null; table_finder?: boolean }[]).map((s) => [s.event_id, s]));
  const premium = new Map(((life.data ?? []) as { event_id: string; premium: boolean }[]).map((l) => [l.event_id, l.premium]));
  return events
    .map((e) => {
      const s = site.get(e.id);
      return { id: e.id, name: e.name, date: e.event_date, slug: s?.slug ?? null, live: !!s?.published_at, premium: !!premium.get(e.id), finder: !!s?.table_finder, legacy: !!e.table_name, type: e.event_type };
    })
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
}

export async function loadInvitees(eventId: string): Promise<Invitee[] | null> {
  const { data, error } = await supabase.from("invitees").select("id, name, party_size, table_label, contact, token").eq("event_id", eventId).limit(1000);
  return error ? null : (data as Invitee[]);
}

/** Every reply for the event (hosts can read their own: rsvps_select_own). */
export async function loadReplies(eventId: string): Promise<Reply[] | null> {
  const cols = "id, name, email, phone, attending, guest_count, kid_count, dietary, invitee_id, answers, updated_at, created_at";
  const { data, error } = await supabase.from("rsvps").select(cols).eq("event_id", eventId).order("created_at", { ascending: true }).limit(3000);
  return error ? null : (data as Reply[]);
}

/** The host's saved plan for an event, if they've made one (newest first). */
export async function planForEvent(eventId: string): Promise<{ id: string; title: string; updated_at: string } | null> {
  const { data } = await supabase.from("seating_charts").select("id, title, updated_at").eq("event_id", eventId).order("updated_at", { ascending: false }).limit(1);
  return ((data ?? []) as { id: string; title: string; updated_at: string }[])[0] ?? null;
}

/** Link a plan saved to the account to its event (Start from my RSVPs does this at once). */
export async function linkPlan(chartId: string, eventId: string) {
  await supabase.from("seating_charts").update({ event_id: eventId }).eq("id", chartId);
}

/** Write the tables (and, if asked, add the missing households and switch the finder on). */
export async function sendSeats(eventId: string, chartId: string, m: SeatMatch, opts: { add: boolean; clear: boolean; finder: boolean }) {
  const changes = m.matched.filter((x) => x.invitee.table_label !== x.table);
  for (let i = 0; i < changes.length; i += 20)
    await Promise.all(changes.slice(i, i + 20).map((x) => supabase.from("invitees").update({ table_label: x.table.slice(0, 40) }).eq("id", x.invitee.id)));
  // Lines Mesa didn't seat lose an old table, so nobody is sent to the wrong one.
  const stale = opts.clear ? m.unseated.filter((x) => x.table_label).map((x) => x.id) : [];
  if (stale.length) await supabase.from("invitees").update({ table_label: null }).in("id", stale);
  // Each household's invite-list line, so later replies find them without guessing by name.
  const links: Record<string, string> = Object.fromEntries(m.matched.map((x) => [x.party, x.invitee.id]));
  let added = 0;
  if (opts.add && m.missing.length) {
    const rows = m.missing.map((x) => ({ event_id: eventId, name: x.line, party_size: Math.min(20, x.size), table_label: x.table.slice(0, 40) }));
    const { data, error } = await supabase.from("invitees").insert(rows).select("id");
    if (error) throw new Error(/INVITE_LIMIT/.test(error.message) ? "Your invite list has room for 1,000 guests." : "Couldn’t add the new guests to your invite list.");
    // Postgres returns inserted rows in the order they were given.
    ((data ?? []) as { id: string }[]).forEach((r, i) => m.missing[i] && (links[m.missing[i].party] = r.id));
    added = data?.length ?? rows.length;
  }
  if (opts.finder) await supabase.from("wedding_sites").update({ table_finder: true }).eq("event_id", eventId);
  await supabase.from("seating_charts").update({ event_id: eventId }).eq("id", chartId);
  return { updated: changes.length, added, cleared: stale.length, links };
}
