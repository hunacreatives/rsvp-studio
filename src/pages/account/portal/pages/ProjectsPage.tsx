import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePortal } from "../PortalContext";
import { PageHeader } from "../PortalLayout";
import { ProjectRow } from "../components/blocks";
import { FilterTabs, Panel, PrimaryButton } from "../ui";

type Filter = "all" | "in_progress" | "completed";

export default function ProjectsPage() {
  const { projects } = usePortal();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<Filter>("all");

  const visible = projects
    .filter((p) => filter === "all" || p.project_status === filter)
    .sort(
      (a, b) =>
        Number(a.project_status === "completed") - Number(b.project_status === "completed") ||
        b.updated_at.localeCompare(a.updated_at),
    );

  return (
    <>
      <PageHeader title="Your Projects" sub="View your projects, track progress, and see what’s coming next." />
      <div className="-mt-3 mb-7">
        <FilterTabs<Filter>
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: "All" },
            { value: "in_progress", label: "In Progress" },
            { value: "completed", label: "Completed" },
          ]}
        />
      </div>

      <div className="space-y-5">
        {visible.map((p) => (
          <ProjectRow key={p.id} project={p} />
        ))}
        {visible.length === 0 && projects.length > 0 ? (
          <Panel className="px-6 py-10 text-center text-[15px] text-[var(--slate)]">No projects in this view.</Panel>
        ) : null}

        <Panel className="px-6 py-14 text-center">
          <i className="ri-add-line text-2xl text-[var(--ink)]" />
          <p className="mt-6 text-[20px] font-semibold text-[var(--ink)]">Planning another event?</p>
          <p className="mx-auto mt-2 max-w-xs text-[15px] text-[var(--ink)]">
            Start an inquiry and create another RSVP Studio experience.
          </p>
          <PrimaryButton className="mt-8" onClick={() => navigate("/enquire#start")}>
            Start an Inquiry
          </PrimaryButton>
        </Panel>
      </div>
    </>
  );
}
