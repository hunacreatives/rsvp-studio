import { supabase } from "@/lib/supabase";
import { freeSeats, isHonorific, type Chart, type Guest, type Table } from "./model";

// Day-of check-in (Premium; supabase/seating-checkin.sql). The host makes a link; ushers open
// it on their phones with no account and check guests in. Arrivals live apart from the plan
// (seating_checkins), so several phones never clash and the host's autosave never undoes them.
// A phone keeps the plan and its own check-ins, and queues what it can't send yet, so a weak
// signal at the venue never stops the door.

export interface DayRow {
  guest_id: string;
  state: "here" | "away" | "none";
  arrived_at: string | null;
  table_id: string | null;
  seat: number | null;
  name: string | null;
  party: number | null;
  by: string | null;
  updated_at: string;
}
export type DayItem = { guest_id: string; state: DayRow["state"]; at?: string; table_id?: string; seat?: number; name?: string; party?: number; by?: string };

// ---- the host -------------------------------------------------------------------
export interface LinkState {
  token: string | null;
  until: string | null;
  has_pin: boolean;
  /** The coordinator it was emailed to (they get the day-before reminder too). */
  contact?: string | null;
}

/** Make the link (or a new one), turn it off, or set or clear the PIN. */
export async function checkinLink(chartId: string, action: "make" | "new" | "off" | "pin", pin?: string | null): Promise<LinkState> {
  const { data, error } = await supabase.rpc("checkin_link", { p_chart: chartId, p_action: action, p_pin: pin ?? null });
  if (error) throw new Error(/PREMIUM/.test(error.message) ? "premium" : /PIN_FORMAT/.test(error.message) ? "pin" : /NOT_YOURS/.test(error.message) ? "saved" : "error");
  return data as LinkState;
}

/** The link's state without changing it (the host's own row). */
export async function linkState(chartId: string): Promise<LinkState | null> {
  // (checkin_contact comes with seating-checkin-mail.sql; without it, read the rest.)
  let res = await supabase.from("seating_charts").select("checkin_token, checkin_until, checkin_pin, checkin_contact").eq("id", chartId).maybeSingle();
  if (res.error) res = await supabase.from("seating_charts").select("checkin_token, checkin_until, checkin_pin").eq("id", chartId).maybeSingle();
  if (res.error || !res.data) return null;
  const r = res.data as { checkin_token: string | null; checkin_until: string | null; checkin_pin: string | null; checkin_contact?: string | null };
  return { token: r.checkin_token, until: r.checkin_until, has_pin: !!r.checkin_pin, contact: r.checkin_contact ?? null };
}

/** Email the link to the coordinator (api/notify.ts, kind checkin_invite). */
export async function emailCoordinator(chartId: string, email: string): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  const r = await fetch("/api/notify", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${data.session?.access_token ?? ""}` },
    body: JSON.stringify({ kind: "checkin_invite", chartId, email }),
  }).catch(() => null);
  if (!r) return "Couldn’t reach us. Check your connection and try again.";
  if (r.ok) return null;
  const out = (await r.json().catch(() => null)) as { error?: string } | null;
  return out?.error ?? "Couldn’t send it. Please try again.";
}

export const dayUrl = (token: string) => `${window.location.origin}/tools/seating-chart-maker/day/${token}`;

/** Walk-ins and day-of moves the host hasn't brought into the plan yet. */
export async function dayChanges(chartId: string, since?: string): Promise<DayRow[]> {
  let q = supabase.from("seating_checkins").select("*").eq("chart_id", chartId);
  if (since) q = q.gt("updated_at", since);
  const { data } = await q.limit(3500);
  return ((data ?? []) as DayRow[]).filter((r) => r.state === "here" && (r.guest_id.startsWith("w") ? !!r.name : !!r.table_id));
}

// ---- a phone ----------------------------------------------------------------------
export type DayError = "off" | "pin" | "premium" | "network";

export async function openDay(token: string, pin: string | null, bgKey: string | null): Promise<{ chart: unknown; chart_at: string; background: string | null } | { error: DayError }> {
  try {
    const { data, error } = await supabase.rpc("checkin_chart", { p_token: token, p_pin: pin, p_bg: bgKey });
    if (error || !data) return { error: "network" };
    const d = data as { error?: DayError; chart: unknown; chart_at: string; background: string | null };
    return d.error ? { error: d.error } : d;
  } catch {
    return { error: "network" };
  }
}

export async function syncDay(token: string, pin: string | null, since: string | null, items: DayItem[]): Promise<{ now: string; chart_at: string; rows: DayRow[] } | { error: DayError }> {
  try {
    const { data, error } = await supabase.rpc("checkin_sync", { p_token: token, p_pin: pin, p_since: since, p_items: items });
    if (error || !data) return { error: "network" };
    const d = data as { error?: DayError; now: string; chart_at: string; rows: DayRow[] };
    return d.error ? { error: d.error } : d;
  } catch {
    return { error: "network" };
  }
}

/** What a phone keeps for a link: the plan, everyone's check-ins, where it's up to, and the
 *  check-ins it hasn't been able to send. */
export interface DayCache {
  chart: Chart | null;
  chartAt: string | null;
  rows: Record<string, DayRow>;
  since: string | null;
  queue: DayItem[];
  by: string;
  pin: string | null;
}
const key = (token: string) => `seating:day:${token}`;
export function readCache(token: string): DayCache {
  try {
    const raw = localStorage.getItem(key(token));
    if (raw) return { chart: null, chartAt: null, rows: {}, since: null, queue: [], by: "", pin: null, ...JSON.parse(raw) };
  } catch {
    /* a fresh start */
  }
  return { chart: null, chartAt: null, rows: {}, since: null, queue: [], by: "", pin: null };
}
export function writeCache(token: string, c: DayCache) {
  try {
    localStorage.setItem(key(token), JSON.stringify(c));
  } catch {
    /* too full: it still works for this visit */
  }
}

// ---- what the phone shows (pure) ------------------------------------------------------
/**
 * The plan as it stands on the day: guests who can't come (their reply, or marked away at the
 * door) off their seats, day-of moves applied, walk-ins seated. `arrived`: who's here.
 */
export function dayView(chart: Chart, rows: Record<string, DayRow>) {
  const live = rows;
  const guests: Guest[] = [];
  for (const g of chart.guests) {
    const r = live[g.id];
    if (g.reply === "no" || r?.state === "away") continue;
    guests.push(r?.state === "here" && r.table_id ? { ...g, tableId: r.table_id, seat: r.seat } : g);
  }
  const walkGroup = "day-walk-ins";
  for (const r of Object.values(live)) {
    if (!r.guest_id.startsWith("w") || r.state === "none" || !r.name) continue;
    guests.push({ id: r.guest_id, name: r.name, groupId: walkGroup, party: `w:${r.guest_id.split("-")[0]}`, tableId: r.table_id, seat: r.seat, tags: ["plusone"] });
  }
  const arrived = new Set(Object.values(live).filter((r) => r.state === "here").map((r) => r.guest_id));
  const view: Chart = { ...chart, guests, groups: [...chart.groups, { id: walkGroup, name: "Walk-ins", cat: "other" }] };
  return { view, arrived };
}

/** Households (by `party`) for the search and the counts. */
export function households(view: Chart) {
  const by = new Map<string, Guest[]>();
  for (const g of view.guests) (by.get(g.party) ?? by.set(g.party, []).get(g.party)!).push(g);
  return [...by.values()];
}

/** Where a walk-in party of `n` fits: a spare table first, then the table with most room. */
export function walkInSpot(view: Chart, n: number): { table: Table; seats: number[] } | null {
  const free = (t: Table) => freeSeats(t, view.guests.filter((g) => g.tableId === t.id));
  const fits = view.tables.filter((t) => t.shape !== "head" && t.shape !== "sweetheart" && free(t).length >= n);
  if (!fits.length) return null;
  const best = [...fits].sort((a, b) => Number(!!b.spare) - Number(!!a.spare) || free(b).length - free(a).length)[0];
  return { table: best, seats: free(best).slice(0, n) };
}

/** A walk-in party as items to send: the first person by name, the rest as their guests. */
export function walkInItems(name: string, n: number, table: Table, seats: number[], by: string): DayItem[] {
  const id = `w${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
  const at = new Date().toISOString();
  const first = name.trim().split(/\s+/).find((w) => !isHonorific(w)) || "Guest";
  return seats.slice(0, n).map((seat, i) => ({ guest_id: `${id}-${i}`, state: "here" as const, at, table_id: table.id, seat, name: i ? `Guest of ${first}${n > 2 ? ` ${i}` : ""}` : name.trim().slice(0, 120), party: n, by }));
}
