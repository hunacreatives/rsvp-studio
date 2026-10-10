import { Link, useNavigate } from "react-router-dom";
import { usePortal } from "../PortalContext";
import { formatDate, formatMoney, servicesLabel, timeAgo } from "../format";
import type { Activity, ActivityKind, Invoice, Project, Task } from "../types";
import { Cover, Panel, PrimaryButton, ProgressBar, StatusPill } from "../ui";

/** Best cover for a project: studio-set cover, else the site builder's hero. */
export function useProjectCover() {
  const { sites } = usePortal();
  return (p: Project) => p.cover_image_url || sites[p.id]?.heroUrl || null;
}

export function ProjectStatusPill({ project }: { project: Project }) {
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

/** Home grid card (design: Home → "Your Projects"). */
export function ProjectCard({ project }: { project: Project }) {
  const cover = useProjectCover();
  return (
    <Link
      to={`/account/projects/${project.id}`}
      className="group flex flex-col overflow-hidden rounded-[24px] bg-[var(--paper)] transition-shadow hover:shadow-[0_18px_40px_-24px_rgba(0,7,39,0.35)]"
    >
      <Cover url={cover(project)} name={project.name} className="aspect-[16/12] rounded-[24px] sm:aspect-[4/3]">
        <span className="absolute bottom-4 left-4">
          <ProjectStatusPill project={project} />
        </span>
      </Cover>
      <div className="flex flex-1 flex-col px-4 pb-5 pt-4">
        <p className="text-[19px] font-semibold text-[var(--ink)] group-hover:underline">{project.name}</p>
        <p className="mt-0.5 text-[15px] leading-snug text-[var(--ink)]">{servicesLabel(project.services, project.event_type)}</p>
        <div className="mt-3 border-t border-[#dcdce0] pt-3 text-[12.5px] text-[var(--ink)]">
          <p>Last updated {formatDate(project.updated_at)}</p>
          {project.project_status !== "completed" && project.next_step ? (
            <p className="font-semibold">
              {nextStepLabel(project)}: {project.next_step}
            </p>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

/** Full-width card with progress (design: Projects page). */
export function ProjectRow({ project }: { project: Project }) {
  const cover = useProjectCover();
  const done = project.project_status === "completed";
  return (
    <Link to={`/account/projects/${project.id}`} className="group block overflow-hidden rounded-[24px] bg-[var(--paper)]">
      <Cover url={cover(project)} name={project.name} className="h-[150px] rounded-[24px] md:h-[184px]">
        <span className="absolute bottom-4 left-5">
          <ProjectStatusPill project={project} />
        </span>
      </Cover>
      <div className="px-5 pb-5 pt-5 md:px-6">
        <p className="text-[20px] font-semibold text-[var(--ink)] group-hover:underline">{project.name}</p>
        <p className="text-[15px] text-[var(--ink)]">{servicesLabel(project.services, project.event_type)}</p>
        <div className="mt-6 flex items-center justify-between text-[13px]">
          <span className="text-[var(--ink)]">Project progress</span>
          <span className="text-[var(--slate)]">{project.progress}%</span>
        </div>
        <div className="mt-3">
          <ProgressBar value={project.progress} />
        </div>
        <div className="mt-6 grid grid-cols-2 gap-4 border-t border-[#dcdce0] pt-4 text-[13px]">
          <div>
            <p className="uppercase tracking-[0.04em] text-[var(--slate)]">{done ? "Status" : nextStepLabel(project)}</p>
            <p className="text-[var(--ink)]">{done ? "Project Complete" : project.next_step || "We’ll post your next step soon"}</p>
          </div>
          <div>
            <p className="uppercase tracking-[0.04em] text-[var(--slate)]">{done ? "Completed" : "Due"}</p>
            <p className="text-[var(--ink)]">
              {done ? formatDate(project.completed_at) || "—" : formatDate(project.next_step_due) || "—"}
            </p>
          </div>
        </div>
      </div>
    </Link>
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
    <Panel className="px-6 py-2">
      <ul>
        {tasks.map((t, i) => {
          const done = !!t.done_at;
          return (
            <li key={t.id} className={`flex items-center gap-4 py-4 ${i ? "border-t border-[#dcdce0]" : ""}`}>
              <button
                onClick={() => toggleTask(t.id, !done)}
                aria-label={done ? `Mark “${t.title}” as not done` : `Mark “${t.title}” as done`}
                className="grid h-6 w-6 shrink-0 place-items-center rounded-full border transition-colors"
                style={{ borderColor: done ? "var(--acc-green)" : "var(--ink)", background: done ? "var(--acc-green)" : "#fff" }}
              >
                {done ? <i className="ri-check-line text-[15px] text-white" /> : null}
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

export function ActivityList({ items, showProject = true }: { items: Activity[]; showProject?: boolean }) {
  const { projects } = usePortal();
  const cover = useProjectCover();
  if (!items.length) {
    return (
      <Panel className="px-6 py-10 text-center text-[15px] text-[var(--slate)]">
        <i className="ri-time-line mb-1 block text-2xl" />
        Updates from the studio will show up here.
      </Panel>
    );
  }
  return (
    <Panel className="px-6 py-2">
      <ul>
        {items.map((a, i) => {
          const project = projects.find((p) => p.id === a.event_id);
          return (
            <li key={a.id} className={`flex items-center gap-4 py-4 ${i ? "border-t border-[#dcdce0]" : ""}`}>
              <Cover url={project ? cover(project) : null} name={project?.name ?? ""} className="h-12 w-[78px] shrink-0 rounded-xl">
                <span className="absolute inset-0 grid place-items-center bg-[rgba(0,7,39,0.28)] text-lg text-white">
                  <i className={ACTIVITY_ICON[a.kind]} />
                </span>
              </Cover>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold text-[var(--ink)]">{a.title}</p>
                <p className="truncate text-[14px] text-[var(--slate)]">
                  {[showProject ? project?.name : null, a.detail].filter(Boolean).join(" • ")}
                </p>
              </div>
              <span className="shrink-0 text-[12.5px] text-[var(--slate)]">{timeAgo(a.created_at)}</span>
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
              <span className="block truncate text-[13px] text-[var(--slate)]">{project ? inv.description : `Invoice ${inv.number}`}</span>
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

export function PlanningBanner() {
  const navigate = useNavigate();
  return (
    <div className="relative overflow-hidden rounded-[22px]">
      <img src="/account/balloons.webp" alt="" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-[rgba(0,7,39,0.12)]" />
      <div className="relative px-6 py-16 text-center text-white md:py-24">
        <p className="font-display text-[2rem] font-semibold leading-tight drop-shadow md:text-[2.8rem]">Planning another event?</p>
        <p className="mx-auto mt-3 max-w-xl text-[16px] drop-shadow md:text-[20px]">Create a new project for a beautiful, seamless experience.</p>
        <PrimaryButton className="mt-8" onClick={() => navigate("/enquire#start")}>
          Start an Inquiry
        </PrimaryButton>
      </div>
    </div>
  );
}
