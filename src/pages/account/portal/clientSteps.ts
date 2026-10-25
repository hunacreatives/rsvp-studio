import type { SiteInfo } from "./api";
import type { GuestStats } from "./guestStats";
import { isUnclaimed, type Project } from "./types";

// The Coordinator desk and Clients: the one next thing to do on each client's event, in the
// order it usually comes up. A design, the hand-over (a client's free site goes live once they
// accept), publishing, the guest list, replies, then seating and check-in as the day gets
// close; in the last three days, check-in and replies come first. Pure (no reads), so
// scripts/check-client-steps.ts can run it.

export type ClientStepKey = "done" | "view" | "design" | "publish" | "handover" | "guestList" | "deadline" | "waiting" | "checkin" | "seat" | "ready";

export type ClientStep = {
  key: ClientStepKey;
  /** What's next, on its own: "12 haven't replied", "Replies close Fri". */
  label: string;
  /** The same as a button, where the row already shows the reply count or that it isn't
   *  published (so it isn't said twice): "Send a reminder". */
  cta: string;
  to: string;
  /** Today or tomorrow: shown in the warning colour. */
  urgent?: boolean;
};

export type ClientStepInput = {
  project: Pick<Project, "id" | "event_date" | "project_status" | "access" | "client_of" | "handed_over_at" | "handover_to">;
  site?: Pick<SiteInfo, "publishedAt" | "deadline" | "ended"> | null;
  /** Undefined while loading (and for studio events on their own table): reply steps wait. */
  stats?: Pick<GuestStats, "invited" | "waiting">;
  /** Mesa's day-of check-in is already on for this event (one of my plans). */
  checkinOn?: boolean;
  /** YYYY-MM-DD. Default: today in Manila. */
  today?: string;
};

/** Today in Manila, YYYY-MM-DD. */
export const manilaToday = () => new Date(Date.now() + 8 * 3_600_000).toISOString().slice(0, 10);

/** Whole days from `today` to a date (negative once it's passed), or null with no date. */
export function daysFrom(today: string, date: string | null | undefined): number | null {
  if (!date) return null;
  return Math.round((Date.parse(`${date.slice(0, 10)}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
}

/** "Sat" for a YYYY-MM-DD date. */
export const weekday = (date: string) => new Date(`${date.slice(0, 10)}T00:00:00Z`).toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });

export function nextClientStep({ project, site, stats, checkinOn = false, today = manilaToday() }: ClientStepInput): ClientStep {
  const page = `/account/projects/${project.id}`;
  const invites = `${page}?tab=guests&list=invites`;
  const mesa = `/tools/seating-chart-maker?event=${project.id}`;
  const days = daysFrom(today, project.event_date);

  if (project.project_status === "completed" || (days !== null && days < 0) || site?.ended) return { key: "done", label: "Done", cta: "Open", to: page };
  if (project.access === "viewer") return { key: "view", label: "View only", cta: "Open", to: page };

  // The last few days: the day itself comes first, whatever else is still open.
  const closes = site ? daysFrom(today, site.deadline) : null;
  if (site?.publishedAt && days !== null && days <= 3) {
    if (days <= 2 && !checkinOn) return { key: "checkin", label: "Set up check-in", cta: "Set up check-in", to: mesa, urgent: days <= 1 };
    if (stats?.waiting) return { key: "waiting", label: `${stats.waiting} haven’t replied`, cta: "Send a reminder", to: invites, urgent: days <= 1 };
  }

  if (!site) return { key: "design", label: "Pick a design", cta: "Pick a design", to: `/account/events/${project.id}/site-builder` };
  // A client event I still own: hand it over once there's a design (a free site goes live
  // after the client accepts; coordinator-fixes.sql).
  if (isUnclaimed(project) && !project.handover_to) return { key: "handover", label: "Hand over to your client", cta: "Hand over", to: `${page}#people` };
  if (isUnclaimed(project) && !site.publishedAt) return { key: "handover", label: "Waiting for your client to accept", cta: "Open", to: `${page}#people` };
  if (!site.publishedAt) return { key: "publish", label: "Finish and publish", cta: "Finish and publish", to: `/account/events/${project.id}/site-builder/edit` };
  if (stats && !stats.invited) return { key: "guestList", label: "Add the guest list", cta: "Add the guest list", to: invites };

  if (stats?.waiting && closes !== null && closes >= 0 && closes <= 3) {
    const when = closes === 0 ? "today" : closes === 1 ? "tomorrow" : weekday(site.deadline!);
    return { key: "deadline", label: `Replies close ${when}`, cta: `Replies close ${when}`, to: invites, urgent: closes <= 1 };
  }
  if (stats?.waiting) return { key: "waiting", label: `${stats.waiting} haven’t replied`, cta: "Send a reminder", to: invites };
  if (days !== null && days <= 2 && !checkinOn) return { key: "checkin", label: "Set up check-in", cta: "Set up check-in", to: mesa, urgent: days <= 1 };
  if (days !== null && days <= 14 && !checkinOn) return { key: "seat", label: "Seat your guests", cta: "Seat your guests", to: mesa };
  return { key: "ready", label: "All set for now", cta: "Open", to: page };
}

/** Client events in the next 7 days (today included), soonest first. */
export function thisWeek<P extends Pick<Project, "event_date" | "project_status">>(projects: P[], today = manilaToday()): P[] {
  return projects
    .filter((p) => {
      const d = daysFrom(today, p.event_date);
      return p.project_status !== "completed" && d !== null && d >= 0 && d <= 7;
    })
    .sort((a, b) => a.event_date!.localeCompare(b.event_date!));
}

/** Search by event name: case and accents don't matter ("jose" finds "José & Ria"). */
export function matchesClient(p: Pick<Project, "name">, query: string) {
  const fold = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  const q = fold(query.trim());
  return !q || fold(p.name).includes(q);
}
