import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePortal } from "../PortalContext";
import { PageHeader } from "../PortalLayout";
import { ActivityList, byWhen, EventList, isDiy, isPast, TaskList } from "../components/blocks";
import { useGuestStats } from "../guestStats";
import NewProjectModal, { Choice } from "../components/NewProjectModal";
import { SectionTitle } from "../ui";
import PartnerStrip from "../components/PartnerStrip";
import PartnerApplyCard from "../components/PartnerApplyCard";
import NeedsAttention from "../components/NeedsAttention";
import CoordinatorDesk from "../components/CoordinatorDesk";
import { isClientEvent, isCoordinator } from "../types";

export default function HomePage() {
  const { projects: everything, tasks, activity, profile, demo } = usePortal();
  const stats = useGuestStats(everything, demo);
  // Coordinators' clients live on the Coordinator desk (and under Clients), not "Your events".
  const projects = everything.filter((p) => !isClientEvent(p));
  const navigate = useNavigate();
  const [newOpen, setNewOpen] = useState(false);

  // Coming up first (soonest first), then past events.
  const ordered = [...projects].sort(byWhen);
  const openTasks = tasks
    .filter((t) => !t.done_at)
    .sort((a, b) => (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999"))
    .slice(0, 4);
  // Tasks are the studio's: someone who only builds their own sites never gets any, so an
  // empty "all caught up" box would just be space. Activity shows once there is some.
  const studioClient = projects.some((p) => !isDiy(p));
  const showTasks = openTasks.length > 0 || studioClient;
  const recent = activity.slice(0, 4);

  const tasksAndActivity =
    showTasks || recent.length ? (
      <div className={`mt-12 grid gap-10 xl:gap-6 ${showTasks && recent.length ? "xl:grid-cols-2" : ""}`}>
        {showTasks ? (
          <section className="min-w-0">
            <SectionTitle>Upcoming Tasks</SectionTitle>
            <TaskList tasks={openTasks} />
          </section>
        ) : null}
        {recent.length ? (
          <section className="min-w-0">
            <SectionTitle>Recent Activity</SectionTitle>
            <ActivityList items={recent} />
          </section>
        ) : null}
      </div>
    ) : null;

  // Coordinators (said so, or have a client): the Coordinator desk is their Home.
  if (isCoordinator(profile, everything)) return <CoordinatorDesk>{tasksAndActivity}</CoordinatorDesk>;

  return (
    <>
      {/* Home is the overview; the full list lives under Projects (same title twice confused people). */}
      <PageHeader title={`Welcome back${profile.full_name ? `, ${profile.full_name.trim().split(/\s+/)[0]}` : ""}`} />
      <PartnerStrip />
      <PartnerApplyCard />
      <NeedsAttention stats={stats} projects={projects} />

      {projects.length === 0 ? (
        <FirstVisit onOwn={() => setNewOpen(true)} />
      ) : (
        <>
          <SectionTitle
            action={
              projects.length > 5 ? (
                <button onClick={() => navigate("/account/projects")} className="inline-flex min-h-[44px] items-center text-[14px] font-medium text-[var(--acc-blue)] hover:underline md:min-h-0">
                  All {projects.length} events →
                </button>
              ) : undefined
            }
          >
            Your events
          </SectionTitle>
          {/* The ones coming up; past ones only fill the list when there's room. */}
          <EventList projects={ordered.filter((p, i) => !isPast(p) || i < 3).slice(0, 5)} stats={stats} />
        </>
      )}

      {tasksAndActivity}

      <NewProjectModal open={newOpen} onClose={() => setNewOpen(false)} />
    </>
  );
}

/**
 * No events yet: what brings them here. Their own celebration → the usual "Start a new event";
 * a coordinator or planner → "Add a client". Once they have one, Home shows their clients first.
 */
function FirstVisit({ onOwn }: { onOwn: () => void }) {
  // A coordinator starts by adding a client (PortalLayout opens it): that's all it takes.
  const navigate = useNavigate();
  const coordinator = () => navigate("/account?new=client");
  return (
    <section>
      <SectionTitle sub="Tell us what brings you here.">Let’s get you started</SectionTitle>
      <div className="grid gap-3 md:grid-cols-2">
        <Choice icon="ri-cake-3-line" title="Planning my own celebration" body="Make your event site, invite your guests and keep track of replies." onClick={onOwn} />
        <Choice icon="ri-team-line" title="I’m a coordinator or planner" body="Set up events for your clients, then hand each one over when it’s ready." onClick={coordinator} />
      </div>
    </section>
  );
}
