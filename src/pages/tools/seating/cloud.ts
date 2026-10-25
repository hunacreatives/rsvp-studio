import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { bgImage, parseChart, setBgImage } from "./store";
import type { Chart } from "./model";

// Plans saved to an account (supabase/seating-charts.sql): the browser copy stays the
// working copy, and every change is sent up a couple of seconds later, so a plan survives
// a cleared browser (iPhones wipe a site's storage after 7 days without a visit) and opens
// on any device. A share link gives a read-only view to anyone who has it.

export function useSignedIn(): { userId: string | null; ready: boolean } {
  const [state, setState] = useState<{ userId: string | null; ready: boolean }>({ userId: null, ready: false });
  useEffect(() => {
    let alive = true;
    supabase.auth.getSession().then(({ data }) => alive && setState({ userId: data.session?.user.id ?? null, ready: true }));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => alive && setState({ userId: session?.user.id ?? null, ready: true }));
    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, []);
  return state;
}

export type CloudState = "off" | "saving" | "saved" | "error" | "limit";

/** `eventId`: the event the row was linked to (Undo after a delete puts the link back too). */
export async function saveCloud(chart: Chart, eventId?: string | null): Promise<CloudState> {
  const event = chart.site?.eventId ?? eventId;
  const background = bgImage(chart.bg?.key);
  const { error } = await supabase
    .from("seating_charts")
    .upsert(
      // A plan made from an event (or sent to one) stays linked to it.
      { id: chart.id, title: chart.title.slice(0, 120) || "Seating plan", chart, background: chart.bg ? background : null, updated_at: new Date(chart.updatedAt).toISOString(), ...(event ? { event_id: event } : {}) },
      { onConflict: "id" },
    );
  if (!error) return "saved";
  return /SEATING_CHART_LIMIT/.test(error.message) ? "limit" : "error";
}

export interface CloudRow {
  id: string;
  title: string;
  updated_at: string;
  event_id: string | null;
  /** The event it's for, when it's linked to one: its name and date. */
  event?: { name: string; event_date: string | null } | null;
}

export async function listCloud(): Promise<CloudRow[]> {
  const { data } = await supabase.from("seating_charts").select("id, title, updated_at, event_id, event:events(name, event_date)").order("updated_at", { ascending: false }).limit(60);
  return (data ?? []) as unknown as CloudRow[];
}

/** Other people's plans for the same event (event_plans in coordinator-fixes.sql): plans are each
 *  person's own, so the couple and their coordinator can each have one. */
export async function otherPlans(eventId: string): Promise<{ owner_name: string; updated_at: string }[]> {
  const { data, error } = await supabase.rpc("event_plans", { p_event: eventId });
  if (error || !data) return [];
  return (data as { owner_name: string; mine: boolean; updated_at: string }[]).filter((p) => !p.mine);
}

export async function loadCloud(id: string): Promise<Chart | null> {
  const { data } = await supabase.from("seating_charts").select("chart, background").eq("id", id).maybeSingle();
  if (!data) return null;
  const row = data as { chart: unknown; background: string | null };
  const c = parseChart(row.chart);
  if (c?.bg && row.background?.startsWith("data:image/")) setBgImage(c.bg.key, row.background);
  return c;
}

export async function deleteCloud(id: string) {
  await supabase.from("seating_charts").delete().eq("id", id);
}

/** The plan's view-only link (made once, then reused). Saves the plan first. */
export async function shareLink(chart: Chart): Promise<string | null> {
  const saved = await saveCloud(chart);
  if (saved !== "saved") return null;
  const { data } = await supabase.from("seating_charts").select("share_token").eq("id", chart.id).maybeSingle();
  let token = (data as { share_token: string | null } | null)?.share_token ?? null;
  if (!token) {
    const bytes = crypto.getRandomValues(new Uint8Array(12));
    token = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    const { error } = await supabase.from("seating_charts").update({ share_token: token }).eq("id", chart.id);
    if (error) return null;
  }
  return `${window.location.origin}/tools/seating-chart-maker/view/${token}`;
}

export async function stopSharing(chart: Chart) {
  await supabase.from("seating_charts").update({ share_token: null }).eq("id", chart.id);
}

export async function getShared(token: string): Promise<Chart | null> {
  const { data, error } = await supabase.rpc("get_shared_chart", { p_token: token });
  if (error || !data) return null;
  const c = parseChart(data);
  const bg = (data as { background?: unknown }).background;
  if (c?.bg && typeof bg === "string" && bg.startsWith("data:image/")) setBgImage(c.bg.key, bg);
  return c;
}
