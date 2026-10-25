import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePortal } from "../PortalContext";
import { PageHeader } from "../PortalLayout";
import { byWhen, EventList, isPast } from "../components/blocks";
import { useGuestStats } from "../guestStats";
import { FilterTabs, Panel, PrimaryButton } from "../ui";
import NewProjectModal from "../components/NewProjectModal";
import { isClientEvent } from "../types";

type Filter = "all" | "upcoming" | "past";

export default function ProjectsPage() {
  const { projects: everything, demo } = usePortal();
  // Couples' events this person coordinates live under Clients.
  const projects = everything.filter((p) => !isClientEvent(p));
  const stats = useGuestStats(projects, demo);
  const navigate = useNavigate();
  const [filter, setFilter] = useState<Filter>("all");
  // The same "New project" choice as Home (inquiry, build it yourself, or an invite code).
  const [newOpen, setNewOpen] = useState(false);

  const visible = projects.filter((p) => filter === "all" || (filter === "past") === isPast(p)).sort(byWhen);

  return (
    <>
      <PageHeader title="Your events" />
      <div className="-mt-3 mb-7">
        <FilterTabs<Filter>
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: "All" },
            { value: "upcoming", label: "Upcoming" },
            { value: "past", label: "Past" },
          ]}
        />
      </div>

      <div className="space-y-5">
        {visible.length ? <EventList projects={visible} stats={stats} /> : null}
        {visible.length === 0 && projects.length > 0 ? (
          <Panel className="px-6 py-10 text-center text-[15px] text-[var(--slate)]">No events here.</Panel>
        ) : null}

        {projects.length === 0 ? (
          <Panel className="px-6 py-12 text-center">
            <p className="text-[20px] font-semibold text-[var(--ink)]">No events yet</p>
            <p className="mx-auto mt-2 max-w-xs text-[15px] text-[var(--ink)]">Have us make it, or build it yourself.</p>
            <PrimaryButton className="mt-6" onClick={() => setNewOpen(true)}>
              Start an event
            </PrimaryButton>
          </Panel>
        ) : null}
      </div>
      <NewProjectModal open={newOpen} onClose={() => setNewOpen(false)} />
    </>
  );
}
