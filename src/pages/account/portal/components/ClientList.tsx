import { useState } from "react";
import { Link } from "react-router-dom";
import { usePortal } from "../PortalContext";
import { byWhen, isPast } from "./blocks";
import { daysFrom, manilaToday, matchesClient, nextClientStep, thisWeek } from "../clientSteps";
import { useCheckinOn } from "../useCheckinOn";
import type { GuestStats } from "../guestStats";
import { daysUntil, formatDate } from "../format";
import { isUnclaimed, type Project } from "../types";
import { FilterTabs, Panel } from "../ui";

// Coordinator desk + Clients: every client's event as one row each, Stripe-style: who and when,
// where the replies are, and the one next thing to do (clientSteps.ts) as the row's button.
// Search by name; This week, Upcoming or Past.

type Filter = "week" | "upcoming" | "past";

export default function ClientList({ clients, stats }: { clients: Project[]; stats: Record<string, GuestStats> }) {
  const { demo } = usePortal();
  const week = thisWeek(clients);
  const [filter, setFilter] = useState<Filter>(() => (week.length ? "week" : "upcoming"));
  const [query, setQuery] = useState("");
  // Check-in only matters in the last two weeks: read it for those.
  const today = manilaToday();
  const soon = clients.filter((p) => {
    const d = daysFrom(today, p.event_date);
    return d !== null && d >= 0 && d <= 14;
  });
  const checkinOn = useCheckinOn(
    soon.map((p) => p.id),
    demo,
  );
  const inFilter = (p: Project) => (filter === "week" ? week.includes(p) : (filter === "past") === isPast(p));
  const visible = clients.filter((p) => inFilter(p) && matchesClient(p, query)).sort(byWhen);
  if (filter === "past") visible.reverse();

  return (
    <>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="relative block min-w-0 sm:w-[300px]">
          <span className="sr-only">Search clients</span>
          <i className="ri-search-line pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[17px] text-[var(--slate)]" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search clients"
            autoComplete="off"
            className="min-h-[44px] w-full rounded-full border border-[rgba(0,7,39,0.18)] bg-white pl-11 pr-4 text-[16px] text-[var(--ink)] outline-none focus:border-[var(--ink)] md:min-h-[40px] md:text-[15px]"
          />
        </label>
        <FilterTabs<Filter>
          value={filter}
          onChange={setFilter}
          options={[
            ...(week.length ? [{ value: "week" as const, label: `This week · ${week.length}` }] : []),
            { value: "upcoming", label: "Upcoming" },
            { value: "past", label: "Past" },
          ]}
        />
      </div>
      {visible.length ? (
        <ul aria-label="Clients" className="divide-y divide-[rgba(0,7,39,0.1)] overflow-hidden rounded-[22px] border border-[rgba(0,7,39,0.14)] bg-white">
          {visible.map((p) => (
            <ClientRow key={p.id} project={p} stats={stats[p.id]} checkinOn={!!checkinOn[p.id]} />
          ))}
        </ul>
      ) : (
        <Panel className="px-6 py-10 text-center text-[15px] text-[var(--slate)]">
          {query.trim() ? `No clients match “${query.trim()}”.` : filter === "past" ? "No past events yet." : "Nothing coming up."}
        </Panel>
      )}
    </>
  );
}

/** "Nov 1 · 6 days", "Today", "Mar 2, 2027 · 128 days"; past: just the date. */
function whenLabel(date: string | null) {
  if (!date) return "Date not set";
  const d = daysUntil(date) ?? 0;
  const thisYear = date.slice(0, 4) === new Date().toISOString().slice(0, 4);
  const day = formatDate(date, thisYear ? { month: "short", day: "numeric" } : undefined);
  if (d < 0) return formatDate(date);
  return `${day} · ${d === 0 ? "Today" : d === 1 ? "Tomorrow" : `${d} days`}`;
}

function ClientRow({ project, stats, checkinOn }: { project: Project; stats?: GuestStats; checkinOn: boolean }) {
  const { sites } = usePortal();
  const site = sites[project.id];
  const step = nextClientStep({ project, site, stats, checkinOn });
  const href = `/account/projects/${project.id}`;
  const quiet = step.key === "done" || step.key === "ready" || step.key === "view";

  // Replies once the site is live; until then, that it isn't.
  const replies = !site?.publishedAt ? (
    <span className="text-[var(--slate)]">Not published yet</span>
  ) : !stats ? (
    <span>&nbsp;</span>
  ) : stats.invited ? (
    <>
      <b className="font-semibold">{stats.invited - stats.waiting}</b> of {stats.invited} replied
    </>
  ) : stats.replies ? (
    <>
      <b className="font-semibold">{stats.replies}</b> {stats.replies === 1 ? "reply" : "replies"}
    </>
  ) : (
    <span className="text-[var(--slate)]">No replies yet</span>
  );

  return (
    <li className="relative grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 px-4 py-3.5 transition-colors hover:bg-[var(--paper)] md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_auto] md:gap-x-6 md:px-6">
      <div className="min-w-0">
        <Link to={href} className="block truncate text-[16px] font-semibold text-[var(--ink)] after:absolute after:inset-0 after:content-['']">
          {project.name}
        </Link>
        <p className="truncate text-[14px] text-[var(--slate)]">
          {whenLabel(project.event_date)}
          {isUnclaimed(project) && project.handover_to ? " · Hand-over sent" : ""}
        </p>
        {/* Phones: replies under the date (the middle column is for wider screens). */}
        <p className="mt-0.5 truncate text-[14px] text-[var(--ink)] md:hidden">{replies}</p>
      </div>
      <p className="hidden truncate text-[14px] text-[var(--ink)] md:block">{replies}</p>
      {quiet ? (
        <span className="justify-self-end text-[14px] text-[var(--slate)]">
          {step.label}
          <i className="ri-arrow-right-s-line ml-1 align-middle text-[18px]" aria-hidden />
        </span>
      ) : (
        <Link
          to={step.to}
          className={`relative z-[1] inline-flex min-h-[44px] items-center gap-1 justify-self-end whitespace-nowrap text-right text-[14px] font-medium hover:underline md:min-h-0 ${step.urgent ? "text-[#c2412d]" : "text-[var(--acc-blue)]"}`}
        >
          {step.cta} <i className="ri-arrow-right-line" aria-hidden />
        </Link>
      )}
    </li>
  );
}
