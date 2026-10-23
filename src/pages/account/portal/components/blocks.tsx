import { useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { usePortal } from "../PortalContext";
import { countdown, daysUntil, formatDate, formatMoney, servicesLabel, timeAgo } from "../format";
import type { GuestStats } from "../guestStats";
import type { Activity, ActivityKind, Invoice, Project, Task } from "../types";
import { Cover, Panel, PillButton, PrimaryButton, ProgressBar, StatusPill } from "../ui";

/** Best cover for a project: studio-set cover, else the site builder's hero. */
export function useProjectCover() {
  const { sites } = usePortal();
  return (p: Project) => p.cover_image_url || sites[p.id]?.heroUrl || null;
}

/** A site the customer builds themselves (Build Your Website) — not a studio project. */
export const isDiy = (p: Pick<Project, "managed_by_studio">) => p.managed_by_studio === false;

export function ProjectStatusPill({ project }: { project: Project }) {
  const { sites } = usePortal();
  // DIY sites have no studio progress: they're a draft until published, then live.
  // Premium ones say so, so it's clear which site uses the one free live slot.
  if (isDiy(project)) {
    const site = sites[project.id];
    const status = site?.ended ? <StatusPill tone="grey">Ended</StatusPill> : site?.publishedAt ? <StatusPill tone="lime">Live</StatusPill> : <StatusPill tone="grey">Draft</StatusPill>;
    if (!site?.premium) return status;
    return (
      <span className="inline-flex flex-wrap gap-1.5">
        {status}
        <StatusPill tone="gold">Premium</StatusPill>
      </span>
    );
  }
  return project.project_status === "completed" ? (
    <StatusPill tone="lime">Completed</StatusPill>
  ) : (
    <StatusPill tone="lavender">In Progress</StatusPill>
  );
}

/** Today's date in Manila (so "overdue" flips at midnight Philippine time, not 8 AM). */
const todayIso = () => new Date(Date.now() + 8 * 3_600_000).toISOString().slice(0, 10);

export function isOverdue(inv: Invoice) {
  return inv.status === "open" && !!inv.due_date && inv.due_date < todayIso();
}

export function InvoicePill({ invoice }: { invoice: Invoice }) {
  if (invoice.status === "paid") return <StatusPill tone="lime" size="md">Paid</StatusPill>;
  if (invoice.status === "void") return <StatusPill tone="grey" size="md">Cancelled</StatusPill>;
  if (isOverdue(invoice)) return <StatusPill tone="coral" size="md">Overdue</StatusPill>;
  return <StatusPill tone="lavender" size="md">Unpaid</StatusPill>;
}

/** "Your turn" when the client has to act, "We're working on" when the studio does. */
export const nextStepLabel = (p: Pick<Project, "next_step_owner">) => (p.next_step_owner === "client" ? "Your turn" : p.next_step_owner === "studio" ? "We’re working on" : "Next step");

/** For DIY sites, in place of studio progress / next step: where the website is at. */
export function DiySiteSummary({ project }: { project: Project }) {
  const { sites } = usePortal();
  const site = sites[project.id];
  const live = !!site?.publishedAt;
  // Guest list + photos are kept 30 days after the site ends (supabase/project-lifecycle.sql).
  const keptUntil = site?.liveUntil ? new Date(Date.parse(site.liveUntil) + 30 * 86_400_000).toISOString() : null;
  const [left, leftValue, right, rightValue] = site?.ended
    ? [
        "Website",
        `Ended ${formatDate(site.liveUntil)}`,
        "Guest list",
        site.guestsPurgedAt ? `Removed ${formatDate(site.guestsPurgedAt)}` : `Download it before ${formatDate(keptUntil)}`,
      ]
    : live
      ? ["Website", `Live since ${formatDate(site!.publishedAt)}`, "Next step", "Share your link with your guests"]
      : ["Website", site ? "Draft — not published yet" : "Not started", "Next step", site ? "Publish it when it’s ready" : "Pick a template"];
  return (
    <div className="mt-6 grid grid-cols-2 gap-4 border-t border-[#dcdce0] pt-4 text-[13px]">
      <div>
        <p className="uppercase tracking-[0.04em] text-[var(--slate)]">{left}</p>
        <p className="text-[var(--ink)]">{leftValue}</p>
      </div>
      <div>
        <p className="uppercase tracking-[0.04em] text-[var(--slate)]">{right}</p>
        <p className="text-[var(--ink)]">{rightValue}</p>
      </div>
    </div>
  );
}

/** "Share your link with your guests", as the button that does it. */
export function CopyLink({ url, label = "Copy your link to share", pill = false }: { url: string; label?: string; /** Sized like the PillButtons beside it. */ pill?: boolean }) {
  const [copied, setCopied] = useState(false);
  const copy = () =>
    navigator.clipboard?.writeText(url).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      },
      () => window.prompt("Copy your link:", url),
    );
  if (pill)
    return (
      <PillButton onClick={copy}>
        <i className={copied ? "ri-check-line" : "ri-link"} /> {copied ? "Copied" : label}
      </PillButton>
    );
  return (
    <button
      type="button"
      onClick={copy}
      className="mt-1 inline-flex min-h-9 items-center gap-1.5 rounded-full border border-[rgba(0,7,39,0.22)] bg-white px-3.5 text-[13px] font-medium text-[var(--ink)] hover:border-[var(--ink)]"
    >
      <i className={copied ? "ri-check-line" : "ri-link"} /> {copied ? "Copied" : label}
    </button>
  );
}

export function TaskList({ tasks, showProject = true, emptyText = "You’re all caught up." }: { tasks: Task[]; showProject?: boolean; emptyText?: string }) {
  const { projects, toggleTask } = usePortal();
  const name = (id: string) => projects.find((p) => p.id === id)?.name ?? "";
  if (!tasks.length) {
    return (
      <Panel className="px-6 py-10 text-center text-[15px] text-[var(--slate)]">
        <i className="ri-checkbox-circle-line mb-1 block text-2xl" />
        {emptyText}
      </Panel>
    );
  }
  return (
    <Panel className="px-4 py-2 sm:px-6">
      <ul>
        {tasks.map((t, i) => {
          const done = !!t.done_at;
          return (
            <li key={t.id} className={`flex items-center gap-3 py-3 sm:gap-4 sm:py-4 ${i ? "border-t border-[#dcdce0]" : ""}`}>
              {/* 44px tap area around the 24px circle. */}
              <button
                onClick={() => toggleTask(t.id, !done)}
                aria-label={done ? `Mark “${t.title}” as not done` : `Mark “${t.title}” as done`}
                className="-ml-2.5 grid h-11 w-11 shrink-0 place-items-center rounded-full"
              >
                <span
                  className="grid h-6 w-6 place-items-center rounded-full border transition-colors"
                  style={{ borderColor: done ? "var(--acc-green)" : "var(--ink)", background: done ? "var(--acc-green)" : "#fff" }}
                >
                  {done ? <i className="ri-check-line text-[15px] text-white" /> : null}
                </span>
              </button>
              <div className="min-w-0">
                <p className={`text-[15px] font-semibold text-[var(--ink)] ${done ? "line-through opacity-60" : ""}`}>{t.title}</p>
                <p className="text-[14px] text-[var(--slate)]">
                  {[showProject ? name(t.event_id) : null, t.due_date ? `Due ${formatDate(t.due_date)}` : null].filter(Boolean).join(" • ")}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

const ACTIVITY_ICON: Record<ActivityKind, string> = {
  update: "ri-megaphone-line",
  status: "ri-flag-2-line",
  file: "ri-file-text-line",
  invoice: "ri-bill-line",
  payment: "ri-checkbox-circle-line",
  task: "ri-task-line",
  rsvp: "ri-group-line",
};

export function ActivityList({ items, showProject = true, emptyText = "Updates from the studio will show up here." }: { items: Activity[]; showProject?: boolean; emptyText?: string }) {
  const { projects } = usePortal();
  const cover = useProjectCover();
  if (!items.length) {
    return (
      <Panel className="px-6 py-10 text-center text-[15px] text-[var(--slate)]">
        <i className="ri-time-line mb-1 block text-2xl" />
        {emptyText}
      </Panel>
    );
  }
  return (
    <Panel className="px-4 py-2 sm:px-6">
      <ul>
        {items.map((a, i) => {
          const project = projects.find((p) => p.id === a.event_id);
          return (
            <li key={a.id} className={`flex items-center gap-3 py-4 sm:gap-4 ${i ? "border-t border-[#dcdce0]" : ""}`}>
              <Cover url={project ? cover(project) : null} name={project?.name ?? ""} initials={false} className="h-11 w-11 shrink-0 rounded-xl sm:h-12 sm:w-[78px]">
                <span className="absolute inset-0 grid place-items-center bg-[rgba(0,7,39,0.28)] text-lg text-white">
                  <i className={ACTIVITY_ICON[a.kind]} />
                </span>
              </Cover>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-[15px] font-semibold leading-snug text-[var(--ink)] sm:line-clamp-1">{a.title}</p>
                <p className="line-clamp-2 break-words text-[14px] text-[var(--slate)] sm:line-clamp-1">
                  {[showProject ? project?.name : null, a.detail].filter(Boolean).join(" • ")}
                </p>
                {/* Phones: the time sits under the text so the title gets the full width. */}
                <p className="text-[13px] text-[var(--slate)] sm:hidden">{timeAgo(a.created_at)}</p>
              </div>
              <span className="hidden shrink-0 text-[12.5px] text-[var(--slate)] sm:inline">{timeAgo(a.created_at)}</span>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}

/**
 * A list of invoices. Every row opens the invoice itself (the full breakdown —
 * what it's for, amount, due date, notes) where the customer pays or gets the
 * receipt. `payable`: unpaid rows show a "View & pay" button so the next step is obvious.
 */
export function InvoiceTable({ invoices, empty = "No invoices here yet.", payable = false }: { invoices: Invoice[]; empty?: string; payable?: boolean }) {
  const { projects } = usePortal();
  const navigate = useNavigate();
  if (!invoices.length) {
    return <Panel className="px-6 py-10 text-center text-[15px] text-[var(--slate)]">{empty}</Panel>;
  }
  return (
    <div className="overflow-hidden rounded-[22px] border border-[rgba(0,7,39,0.16)] bg-white">
      {invoices.map((inv, i) => {
        const project = projects.find((p) => p.id === inv.event_id);
        const paid = inv.status === "paid";
        return (
          <button
            key={inv.id}
            onClick={() => navigate(`/account/billing/${inv.id}`)}
            className={`grid w-full grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 px-5 py-4 text-left transition-colors hover:bg-[var(--paper)] md:grid-cols-[1.4fr_1fr_1fr_auto] md:px-8 ${i ? "border-t border-[rgba(0,7,39,0.12)]" : ""}`}
          >
            <span className="min-w-0">
              <span className="block truncate text-[16px] text-[var(--ink)]">{project?.name ?? inv.description}</span>
              <span className="line-clamp-2 text-[13px] text-[var(--slate)] md:line-clamp-1">{project ? inv.description : `Invoice ${inv.number}`}</span>
            </span>
            <span className="hidden md:block">
              <span className="block text-[12px] uppercase tracking-[0.04em] text-[var(--slate)]">{paid ? "Paid" : "Due"}</span>
              <span className={`block text-[14px] ${isOverdue(inv) ? "font-medium text-[#c2412d]" : "text-[var(--ink)]"}`}>
                {formatDate(paid ? inv.paid_at : inv.due_date) || "Now"}
                {isOverdue(inv) ? " · overdue" : ""}
              </span>
            </span>
            <span className="hidden md:block">
              <span className="block text-[12px] uppercase tracking-[0.04em] text-[var(--slate)]">Amount</span>
              <span className="block text-[14px] text-[var(--ink)]">{formatMoney(inv.amount)}</span>
            </span>
            <span className="justify-self-end">
              {payable && inv.status === "open" ? (
                <span className="inline-flex items-center rounded-full bg-[var(--acc-blue)] px-5 py-2 text-[14px] font-medium text-white">View &amp; pay</span>
              ) : paid ? (
                <span className="text-[14px] font-medium text-[var(--acc-blue)]">Receipt →</span>
              ) : (
                <InvoicePill invoice={inv} />
              )}
            </span>
            <span className="col-span-2 flex items-center justify-between text-[13px] text-[var(--slate)] md:hidden">
              <span>{formatMoney(inv.amount)}</span>
              <span className={isOverdue(inv) ? "font-medium text-[#c2412d]" : ""}>
                {paid ? "Paid" : isOverdue(inv) ? "Overdue since" : "Due"} {formatDate(paid ? inv.paid_at : inv.due_date) || "now"}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}


/** Upcoming first (soonest first, undated after), then past events (latest first). */
export function byWhen(a: Project, b: Project) {
  const da = daysUntil(a.event_date);
  const db = daysUntil(b.event_date);
  const pa = isPast(a);
  const pb = isPast(b);
  if (pa !== pb) return Number(pa) - Number(pb);
  if (pa) return (db ?? 0) - (da ?? 0);
  return (da ?? 1e6) - (db ?? 1e6) || b.updated_at.localeCompare(a.updated_at);
}

/** The event is over (its date passed, or the studio marked it done). */
export const isPast = (p: Project) => p.project_status === "completed" || (daysUntil(p.event_date) ?? 0) < 0;

/**
 * Events as one list of compact rows (Home, Projects), like Billing's: what it is and when, then
 * the number hosts open the dashboard for (who's replied), then the next thing to do. The whole
 * row opens the event; its buttons sit above that link.
 */
export function EventList({ projects, stats }: { projects: Project[]; stats: Record<string, GuestStats> }) {
  return (
    <ul className="divide-y divide-[rgba(0,7,39,0.1)] overflow-hidden rounded-[22px] border border-[rgba(0,7,39,0.14)] bg-white">
      {projects.map((p) => (
        <EventRow key={p.id} project={p} stats={stats[p.id]} />
      ))}
    </ul>
  );
}

function EventRow({ project, stats }: { project: Project; stats?: GuestStats }) {
  const { sites } = usePortal();
  const navigate = useNavigate();
  const cover = useProjectCover();
  const site = sites[project.id];
  const diy = isDiy(project);
  const live = !!site?.publishedAt && !site?.ended;
  const past = isPast(project);
  const href = `/account/projects/${project.id}`;
  const when = [formatDate(project.event_date), !past ? countdown(project.event_date) : ""].filter(Boolean).join(" · ");

  // The middle: guest numbers once a site can take replies; studio progress otherwise.
  let middle: ReactNode = null;
  if (diy || stats?.replies) {
    if (diy && !site?.publishedAt) middle = <p className="text-[14px] text-[var(--slate)]">Not published yet</p>;
    else if (stats) {
      const of = stats.invited - stats.waiting;
      middle = (
        <div>
          {stats.invited ? (
            <div className="mb-1.5 h-[5px] w-full overflow-hidden rounded-full bg-[#e6e6ea]" role="progressbar" aria-valuenow={of} aria-valuemin={0} aria-valuemax={stats.invited} aria-label="Replied">
              <div className="h-full rounded-full bg-[var(--ink)]" style={{ width: `${(of / stats.invited) * 100}%` }} />
            </div>
          ) : null}
          <p className="text-[14px] text-[var(--ink)]">
            {stats.invited ? (
              <>
                <b className="font-semibold">{of}</b> of {stats.invited} replied
              </>
            ) : stats.replies ? (
              <>
                <b className="font-semibold">{stats.replies}</b> {stats.replies === 1 ? "reply" : "replies"}
              </>
            ) : (
              <span className="text-[var(--slate)]">No replies yet</span>
            )}
            {stats.coming ? <span className="text-[var(--slate)]"> · {stats.coming} coming</span> : null}
          </p>
        </div>
      );
    } else middle = <p className="text-[14px] text-[var(--slate)]">&nbsp;</p>;
  } else if (!diy) {
    middle = (
      <div>
        <div className="mb-1.5">
          <ProgressBar value={project.progress} />
        </div>
        <p className="truncate text-[14px] text-[var(--ink)]">
          {past ? "Complete" : project.next_step ? `${nextStepLabel(project)}: ${project.next_step}` : `${project.progress}% done`}
        </p>
      </div>
    );
  }

  return (
    <li className="relative grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-3 px-4 py-4 transition-colors hover:bg-[var(--paper)] md:grid-cols-[auto_minmax(0,1.3fr)_minmax(0,1fr)_auto] md:gap-x-6 md:px-6">
      <Cover url={cover(project)} name={project.name} small className="h-14 w-[76px] shrink-0 rounded-xl md:h-16 md:w-[88px]" />
      <div className="min-w-0">
        <Link to={href} className="flex flex-wrap items-center gap-x-2.5 gap-y-1 after:absolute after:inset-0 after:content-['']">
          <span className="truncate text-[17px] font-semibold text-[var(--ink)]">{project.name}</span>
          <ProjectStatusPill project={project} />
        </Link>
        <p className="mt-0.5 truncate text-[14px] text-[var(--slate)]" title={servicesLabel(project.services, project.event_type)}>
          {/* When first: it's what matters at a glance; the kind of event can run off the end. */}
          {[when || "Date not set", servicesLabel(project.services, project.event_type)].join(" · ")}
        </p>
      </div>
      <div className="col-span-2 min-w-0 md:col-span-1">{middle}</div>
      <div className="relative z-[1] col-span-2 flex flex-wrap items-center gap-2 md:col-span-1 md:justify-end">
        {diy && live ? <CopyLink url={`${window.location.origin}/invite/${site!.slug}`} label="Copy link" /> : null}
        {diy && live ? (
          <button type="button" onClick={() => navigate(`${href}?tab=guests`)} className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-[rgba(0,7,39,0.22)] bg-white px-3.5 text-[13px] font-medium text-[var(--ink)] hover:border-[var(--ink)]">
            <i className="ri-group-line" /> Guests
          </button>
        ) : null}
        {diy && !site?.publishedAt && !past ? (
          <button type="button" onClick={() => navigate(`/account/events/${project.id}/site-builder${site ? "/edit" : ""}`)} className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-[var(--ink)] px-3.5 text-[13px] font-medium text-white hover:opacity-90">
            <i className="ri-edit-2-line" /> {site ? "Continue building" : "Pick a design"}
          </button>
        ) : null}
        {!diy ? <i className="ri-arrow-right-s-line hidden text-[20px] text-[var(--slate)] md:block" aria-hidden /> : null}
      </div>
    </li>
  );
}
