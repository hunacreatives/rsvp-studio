import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePortal } from "../PortalContext";
import { PageHeader } from "../PortalLayout";
import { ActivityList, isOverdue, PlanningBanner, ProjectCard, TaskList } from "../components/blocks";
import { formatDate, formatMoney } from "../format";
import NewProjectModal from "../components/NewProjectModal";
import { EmptyState, PrimaryButton, SectionTitle } from "../ui";

export default function HomePage() {
  const { projects, tasks, activity } = usePortal();
  const navigate = useNavigate();
  const [newOpen, setNewOpen] = useState(false);

  // In-progress first, then most recently updated.
  const ordered = [...projects].sort(
    (a, b) =>
      Number(a.project_status === "completed") - Number(b.project_status === "completed") ||
      b.updated_at.localeCompare(a.updated_at),
  );
  const openTasks = tasks
    .filter((t) => !t.done_at)
    .sort((a, b) => (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999"))
    .slice(0, 4);

  return (
    <>
      <PageHeader title="Your Projects" />
      <NeedsAttention />

      {projects.length === 0 ? (
        <EmptyState
          icon="ri-folder-add-line"
          title="No projects yet"
          body="Start an inquiry with our studio, build a site yourself, or link a project we set up for you with your invite code."
          action={<PrimaryButton onClick={() => setNewOpen(true)}>Start a Project</PrimaryButton>}
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {ordered.slice(0, 3).map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </div>
          {projects.length > 3 ? (
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => navigate("/account/projects")}
                className="rounded-full bg-[var(--acc-blue)] px-4 py-1.5 text-[14px] font-medium uppercase tracking-[0.02em] text-white hover:bg-[#2453bd]"
              >
                Show more
              </button>
            </div>
          ) : null}
        </>
      )}

      <div className="mt-14 grid gap-10 xl:grid-cols-2 xl:gap-6">
        <section className="min-w-0">
          <SectionTitle>Upcoming Tasks</SectionTitle>
          <TaskList tasks={openTasks} />
        </section>
        <section className="min-w-0">
          <SectionTitle>Recent Activity</SectionTitle>
          <ActivityList items={activity.slice(0, 4)} />
        </section>
      </div>

      <div className="mt-14">
        <PlanningBanner />
      </div>

      <NewProjectModal open={newOpen} onClose={() => setNewOpen(false)} />
    </>
  );
}

/**
 * The few things that need the customer, on top: money owed, a reply we're
 * waiting for, and steps that are their turn. Nothing to do → nothing shown.
 */
function NeedsAttention() {
  const { projects, invoices, threads } = usePortal();
  const navigate = useNavigate();
  const unpaid = invoices.filter((i) => i.status === "open").sort((a, b) => (a.due_date ?? "0000").localeCompare(b.due_date ?? "0000"));
  const owed = unpaid.reduce((s, i) => s + i.amount, 0);
  const waitingOnThem = threads.filter((t) => t.kind === "support" && t.status === "waiting");
  const theirTurn = projects.filter((p) => p.project_status !== "completed" && p.next_step && p.next_step_owner === "client");
  const items: { icon: string; text: string; tone?: "late"; onClick: () => void }[] = [];
  if (unpaid.length) {
    const next = unpaid[0];
    items.push({
      icon: "ri-bank-card-line",
      text: `${formatMoney(owed)} to pay${isOverdue(next) ? ` · overdue since ${formatDate(next.due_date)}` : next.due_date ? ` · due ${formatDate(next.due_date)}` : " · due now"}`,
      tone: isOverdue(next) ? "late" : undefined,
      onClick: () => navigate(unpaid.length === 1 ? `/account/billing/${next.id}` : "/account/billing"),
    });
  }
  for (const t of waitingOnThem.slice(0, 2)) {
    items.push({ icon: "ri-chat-3-line", text: "We’re waiting for your reply on a support request", onClick: () => navigate(`/account/messages?thread=${t.id}`) });
  }
  for (const p of theirTurn.slice(0, 2)) {
    items.push({ icon: "ri-task-line", text: `Your turn: ${p.next_step}${p.next_step_due ? ` by ${formatDate(p.next_step_due)}` : ""}`, onClick: () => navigate(`/account/projects/${p.id}`) });
  }
  if (!items.length) return null;
  return (
    <section className="mb-8 rounded-[22px] bg-[#fff6e3] p-4 md:p-5">
      <p className="mb-2 text-[13px] font-semibold uppercase tracking-[0.06em] text-[#8a5a00]">Needs your attention</p>
      <ul className="space-y-1">
        {items.map((it, i) => (
          <li key={i}>
            <button onClick={it.onClick} className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left text-[15px] text-[var(--ink)] hover:bg-black/5">
              <i className={`${it.icon} text-[18px] ${it.tone === "late" ? "text-[#c2412d]" : "text-[#8a5a00]"}`} />
              <span className={`flex-1 ${it.tone === "late" ? "font-medium text-[#c2412d]" : ""}`}>{it.text}</span>
              <i className="ri-arrow-right-s-line text-[var(--slate)]" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
