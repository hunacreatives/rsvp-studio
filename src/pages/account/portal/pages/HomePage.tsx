import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePortal } from "../PortalContext";
import { PageHeader } from "../PortalLayout";
import { ActivityList, PlanningBanner, ProjectCard, TaskList } from "../components/blocks";
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
