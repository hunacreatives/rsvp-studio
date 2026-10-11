import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { usePortal } from "@/pages/account/portal/PortalContext";
import { ProjectStatusPill } from "@/pages/account/portal/components/blocks";
import { formatDate } from "@/pages/account/portal/format";
import { FilterTabs, PillButton } from "@/pages/account/portal/ui";
import ProjectEditor, { NewProjectForm } from "../ProjectEditor";
import { projectFromLead } from "../leads";
import * as studio from "../studioApi";
import { StudioHeader, useStudio } from "../StudioLayout";

type Filter = "all" | "in_progress" | "completed" | "unlinked" | "diy" | "deleted";

export default function ProjectsPage() {
  const { projects, demo, refresh } = usePortal();
  const { owners, members } = useStudio();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const selected = params.get("project");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  // Studio projects vs websites customers built themselves (Build Your Website).
  const isDiy = (p: (typeof projects)[number]) => p.managed_by_studio === false;
  const studioProjects = projects.filter((p) => !isDiy(p));
  const diyCount = projects.length - studioProjects.length;
  const [diy, setDiy] = useState<Record<string, studio.DiySite>>({});
  useEffect(() => {
    if (filter !== "diy" || demo) return;
    studio.loadDiySites(projects.filter(isDiy).map((p) => p.id)).then(setDiy);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, projects, demo]);

  // Deleted in the last 30 days — restorable until the daily job removes them.
  const [deleted, setDeleted] = useState<studio.DeletedProject[]>([]);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  useEffect(() => {
    if (filter === "deleted" && !demo) studio.loadDeletedProjects().then(setDeleted);
  }, [filter, demo]);
  const restore = async (id: string) => {
    setRestoring(id);
    setRestoreError(null);
    try {
      await studio.restoreProject(id);
      setDeleted((d) => d.filter((p) => p.id !== id));
      await refresh();
    } catch (e) {
      setRestoreError(e instanceof Error ? e.message : "Couldn’t restore it.");
    } finally {
      setRestoring(null);
    }
  };

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return projects.filter((p) => {
      if (filter === "diy" ? !isDiy(p) : isDiy(p)) return false;
      if (filter === "unlinked" ? !!p.owner_id : filter !== "all" && filter !== "diy" && p.project_status !== filter) return false;
      const owner = owners[p.id];
      return !q || `${p.name} ${owner?.email ?? ""} ${owner?.full_name ?? ""}`.toLowerCase().includes(q);
    });
  }, [projects, query, owners, filter]);

  const select = (id: string) => {
    const next = new URLSearchParams(params);
    next.set("project", id);
    setParams(next);
  };
  const project = projects.find((p) => p.id === selected) ?? null;
  // "Turn into project" from Studio → Leads: pre-fill from what they told us.
  const leadId = params.get("lead");
  const [lead, setLead] = useState<studio.Lead | null>(null);
  useEffect(() => {
    if (!leadId) return setLead(null);
    studio.loadLeads().then((all) => setLead(all?.find((l) => l.id === leadId) ?? null));
  }, [leadId]);

  return (
    <>
      <StudioHeader
        title="Projects"
        sub={filter === "diy" ? "Websites customers built themselves with Build Your Website." : "Every client project — set progress, tasks, invoices, and access."}
        action={
          <PillButton tone="dark" className="!px-5 !py-2.5" onClick={() => select("new")} disabled={demo}>
            <i className="ri-add-line" /> New project
          </PillButton>
        }
      />
      <div className="mb-5">
        <FilterTabs<Filter>
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: `All (${studioProjects.length})` },
            { value: "in_progress", label: "In progress" },
            { value: "completed", label: "Completed" },
            { value: "unlinked", label: "No client yet" },
            { value: "diy", label: `DIY websites (${diyCount})` },
            { value: "deleted", label: "Deleted" },
          ]}
        />
      </div>

      {filter === "deleted" ? (
        <section className="rounded-[22px] border border-[var(--line)] bg-white">
          {deleted.length ? (
            <ul className="divide-y divide-[var(--line)]">
              {deleted.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <span className="min-w-0">
                    <span className="block truncate text-[15px] font-semibold text-[var(--ink)]">{p.name}</span>
                    <span className="block text-[13px] text-[var(--slate)]">
                      {p.managed_by_studio ? "Studio project" : "DIY website"} · deleted {formatDate(p.deleted_at)} · removed for good {formatDate(new Date(Date.parse(p.deleted_at) + 30 * 86_400_000).toISOString())}
                    </span>
                  </span>
                  <PillButton onClick={() => restore(p.id)} disabled={restoring === p.id || demo}>
                    {restoring === p.id ? "Restoring…" : "Restore"}
                  </PillButton>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-5 py-8 text-[14px] text-[var(--slate)]">Nothing deleted in the last 30 days.</p>
          )}
          {restoreError ? <p className="px-5 pb-4 text-[13px] text-[#c2412d]">{restoreError}</p> : null}
        </section>
      ) : (
      <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
        <aside className="space-y-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search projects or clients"
            className="w-full rounded-full border border-[var(--line)] bg-white px-4 py-2.5 text-[14px] outline-none focus:border-[var(--ink)]"
          />
          <ul className="max-h-[72vh] space-y-1.5 overflow-y-auto pr-1" data-lenis-prevent>
            {visible.map((p) => {
              const owner = owners[p.id];
              return (
                <li key={p.id}>
                  <button
                    onClick={() => select(p.id)}
                    className={`w-full rounded-2xl border px-4 py-3 text-left transition-colors ${selected === p.id ? "border-[var(--ink)] bg-white" : "border-transparent bg-white/70 hover:bg-white"}`}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate font-semibold text-[var(--ink)]">{p.name}</span>
                      <span className="text-[12px] text-[var(--slate)]">{p.progress}%</span>
                    </span>
                    <span className="block truncate text-[12px] text-[var(--slate)]">
                      {owner ? owner.email || owner.full_name : p.owner_id ? "Client" : "No client linked yet"}
                    </span>
                    {filter === "diy" && diy[p.id] ? (
                      <span className="mt-1 block text-[12px] text-[var(--slate)]">
                        {/* Live / Draft is the pill below; this line is just the details. */}
                        {diy[p.id].published_at ? (
                          <>
                            <a href={`/invite/${diy[p.id].slug}`} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="text-[var(--acc-blue)] hover:underline">View site</a>
                            {" · "}
                          </>
                        ) : null}
                        {`${diy[p.id].rsvps} RSVP${diy[p.id].rsvps === 1 ? "" : "s"}`}
                        {diy[p.id].paid ? ` · paid ₱${diy[p.id].paid.toLocaleString("en-PH")}` : ""}
                        {diy[p.id].template ? ` · ${diy[p.id].template}` : ""}
                      </span>
                    ) : null}
                    <span className="mt-1.5 flex items-center justify-between">
                      <ProjectStatusPill project={p} />
                      <span className="text-[11px] text-[var(--slate)]">{formatDate(p.updated_at)}</span>
                    </span>
                  </button>
                </li>
              );
            })}
            {!visible.length ? <li className="px-2 py-6 text-[14px] text-[var(--slate)]">No projects match.</li> : null}
          </ul>
        </aside>

        <section className="min-w-0">
          {selected === "new" ? (
            leadId && !lead ? (
              <p className="text-[14px] text-[var(--slate)]">Loading the lead…</p>
            ) : (
              <NewProjectForm
                key={lead?.id ?? "blank"}
                onCreated={(id) => {
                  const next = new URLSearchParams(params);
                  next.delete("lead");
                  next.set("project", id);
                  setParams(next);
                }}
                prefill={lead ? projectFromLead(lead) : undefined}
                leadId={lead?.id}
              />
            )
          ) : project ? (
            <ProjectEditor
              key={project.id}
              project={project}
              owner={owners[project.id]}
              members={members[project.id] ?? []}
              onOpenInbox={() => navigate(`/studio/inbox?project=${project.id}`)}
              onDeleted={() => {
                const next = new URLSearchParams(params);
                next.delete("project");
                setParams(next);
              }}
            />
          ) : (
            <div className="grid min-h-[320px] place-items-center rounded-[22px] border border-dashed border-[var(--line)] bg-white/60 text-[var(--slate)]">
              Select a project to manage it.
            </div>
          )}
        </section>
      </div>
      )}
    </>
  );
}
