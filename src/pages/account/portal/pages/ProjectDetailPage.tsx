import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import GuestTable from "../../components/GuestTable";
import { getTemplateDefinition } from "@/pages/wedding-sites/engine/registry";
import { usePortal } from "../PortalContext";
import * as api from "../api";
import { ActivityList, InvoiceTable, ProjectStatusPill, TaskList, useProjectCover } from "../components/blocks";
import { formatDate, formatLongDate, servicesLabel } from "../format";
import type { Project } from "../types";
import { Cover, FilterTabs, OutlineCard, Panel, PillButton, ProgressBar, SectionTitle } from "../ui";

type Tab = "overview" | "website" | "guests";

export default function ProjectDetailPage() {
  const { projectId } = useParams();
  const { projects, tasks, activity, invoices } = usePortal();
  const navigate = useNavigate();
  const cover = useProjectCover();
  const [tab, setTab] = useState<Tab>("overview");
  const project = projects.find((p) => p.id === projectId);

  if (!project) return <Navigate to="/account/projects" replace />;

  const done = project.project_status === "completed";
  const projectTasks = tasks
    .filter((t) => t.event_id === project.id)
    .sort((a, b) => Number(!!a.done_at) - Number(!!b.done_at) || (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999"));
  const projectActivity = activity.filter((a) => a.event_id === project.id).slice(0, 8);
  const projectInvoices = invoices.filter((i) => i.event_id === project.id && i.status !== "void");

  return (
    <>
      <Link to="/account/projects" className="mb-5 inline-flex items-center gap-1 text-[13px] font-medium uppercase tracking-[0.1em] text-[var(--slate)] hover:text-[var(--ink)]">
        <i className="ri-arrow-left-line" /> All projects
      </Link>

      <div className="overflow-hidden rounded-[24px] bg-[var(--paper)]">
        <Cover url={cover(project)} name={project.name} className="h-[170px] rounded-[24px] md:h-[220px]">
          <span className="absolute bottom-4 left-5">
            <ProjectStatusPill project={project} />
          </span>
        </Cover>
        <div className="px-5 pb-6 pt-5 md:px-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="font-display text-[2.1rem] font-semibold leading-tight tracking-[-0.02em] text-[var(--ink)] md:text-[2.6rem]">
                {project.name}
              </h1>
              <p className="text-[16px] text-[var(--ink)]">{servicesLabel(project.services, project.event_type)}</p>
              {project.event_date ? (
                <p className="mt-1 flex items-center gap-1.5 text-[14px] text-[var(--slate)]">
                  <i className="ri-calendar-event-line" /> {formatLongDate(project.event_date)}
                </p>
              ) : null}
            </div>
            <PillButton tone="dark" onClick={() => navigate(`/account/messages?project=${project.id}`)}>
              <i className="ri-chat-3-line" /> Message the studio
            </PillButton>
          </div>

          <div className="mt-6 flex items-center justify-between text-[13px]">
            <span className="text-[var(--ink)]">Project progress</span>
            <span className="text-[var(--slate)]">{project.progress}%</span>
          </div>
          <div className="mt-3">
            <ProgressBar value={project.progress} />
          </div>
          <div className="mt-6 grid grid-cols-2 gap-4 border-t border-[#dcdce0] pt-4 text-[13px]">
            <div>
              <p className="uppercase tracking-[0.04em] text-[var(--slate)]">{done ? "Status" : "Next step"}</p>
              <p className="text-[var(--ink)]">{done ? "Project Complete" : project.next_step || "We’ll post your next step soon"}</p>
            </div>
            <div>
              <p className="uppercase tracking-[0.04em] text-[var(--slate)]">{done ? "Completed" : "Due"}</p>
              <p className="text-[var(--ink)]">{(done ? formatDate(project.completed_at) : formatDate(project.next_step_due)) || "—"}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mb-8 mt-8">
        <FilterTabs<Tab>
          value={tab}
          onChange={setTab}
          options={[
            { value: "overview", label: "Overview" },
            { value: "website", label: "Website" },
            { value: "guests", label: "Guests" },
          ]}
        />
      </div>

      {tab === "overview" ? (
        <div className="space-y-12">
          <div className="grid gap-10 xl:grid-cols-2 xl:gap-6">
            <section className="min-w-0">
              <SectionTitle>Tasks</SectionTitle>
              <TaskList tasks={projectTasks} showProject={false} emptyText="Nothing needs your attention right now." />
            </section>
            <section className="min-w-0">
              <SectionTitle>Activity</SectionTitle>
              <ActivityList items={projectActivity} showProject={false} />
            </section>
          </div>
          <section className="min-w-0">
            <SectionTitle action={<Link to="/account/billing" className="text-[14px] font-medium text-[var(--acc-blue)] hover:underline">All billing →</Link>}>
              Invoices
            </SectionTitle>
            <InvoiceTable invoices={projectInvoices} />
          </section>
        </div>
      ) : tab === "website" ? (
        <WebsiteTab project={project} />
      ) : (
        <GuestsTab project={project} />
      )}
    </>
  );
}

function WebsiteTab({ project }: { project: Project }) {
  const { sites } = usePortal();
  const navigate = useNavigate();
  const site = sites[project.id];
  const builder = `/account/events/${project.id}/site-builder`;

  if (site) {
    const template = site.templateId ? getTemplateDefinition(site.templateId)?.label ?? site.templateId : null;
    const publicUrl = `${window.location.origin}/invite/${site.slug}`;
    return (
      <OutlineCard className="p-6 md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="eyebrow">Your website</p>
            <p className="mt-2 font-display text-2xl font-semibold text-[var(--ink)]">{template ? `${template} template` : "No template chosen yet"}</p>
            <p className="mt-1 text-[14px] text-[var(--slate)]">
              {site.publishedAt ? `Published ${formatDate(site.publishedAt)}` : "Draft — not published yet"}
            </p>
          </div>
          <span className={`rounded-full px-3 py-1 text-[12px] font-semibold uppercase tracking-[0.06em] ${site.publishedAt ? "bg-[#ecfbcc] text-[#3d5a12]" : "bg-[#ececec] text-[#55556a]"}`}>
            {site.publishedAt ? "Live" : "Draft"}
          </span>
        </div>
        {site.publishedAt ? (
          <div className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl bg-[var(--paper)] px-4 py-3">
            <i className="ri-link text-[var(--slate)]" />
            <a href={publicUrl} target="_blank" rel="noreferrer" className="min-w-0 truncate text-[14px] text-[var(--acc-blue)] hover:underline">
              {publicUrl}
            </a>
            <PillButton className="ml-auto" onClick={() => navigator.clipboard?.writeText(publicUrl)}>
              Copy link
            </PillButton>
          </div>
        ) : null}
        <div className="mt-6 flex flex-wrap gap-3">
          <PillButton tone="primary" onClick={() => navigate(`${builder}/edit`)}>
            <i className="ri-edit-2-line" /> Edit website
          </PillButton>
          <PillButton onClick={() => navigate(builder)}>Change template</PillButton>
        </div>
      </OutlineCard>
    );
  }

  if (project.site_url) {
    return (
      <OutlineCard className="p-6 md:p-8">
        <p className="eyebrow">Your website</p>
        <p className="mt-2 font-display text-2xl font-semibold text-[var(--ink)]">Designed and hosted by our studio</p>
        <a href={project.site_url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-[15px] text-[var(--acc-blue)] hover:underline">
          {project.site_url.replace(/^https?:\/\//, "")} <i className="ri-external-link-line" />
        </a>
        <p className="mt-4 text-[14px] text-[var(--slate)]">Need a change? Message us and we’ll update it for you.</p>
        <div className="mt-5">
          <PillButton onClick={() => navigate(`/account/messages?project=${project.id}`)}>Request a change</PillButton>
        </div>
      </OutlineCard>
    );
  }

  return (
    <Panel className="px-6 py-12 text-center">
      <i className="ri-global-line text-3xl text-[var(--slate)]" />
      <p className="mt-3 font-display text-xl font-semibold text-[var(--ink)]">No website yet</p>
      <p className="mx-auto mt-1 max-w-md text-[14px] text-[var(--slate)]">
        If our studio is designing your site, it will appear here once it’s live. You can also build one yourself from a template.
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-3">
        <PillButton tone="primary" onClick={() => navigate(builder)}>Build it yourself</PillButton>
        <PillButton onClick={() => navigate(`/account/messages?project=${project.id}`)}>Ask the studio</PillButton>
      </div>
    </Panel>
  );
}

const DEMO_GUESTS: api.Guest[] = [
  { id: "g1", name: "Maria Santos", email: "maria@example.com", message: "Can’t wait to celebrate with you both!", created_at: new Date().toISOString() },
  { id: "g2", name: "Paolo Cruz", email: "paolo@example.com", message: null, created_at: new Date(Date.now() - 86_400_000).toISOString() },
  { id: "g3", name: "Bea Reyes", email: "bea@example.com", message: "See you there 💛", created_at: new Date(Date.now() - 3 * 86_400_000).toISOString() },
];

function GuestsTab({ project }: { project: Project }) {
  const { demo } = usePortal();
  const [guests, setGuests] = useState<api.Guest[] | null>(null);

  useEffect(() => {
    let live = true;
    if (demo) setGuests(DEMO_GUESTS);
    else api.loadGuests(project).then((g) => live && setGuests(g));
    return () => {
      live = false;
    };
  }, [project, demo]);

  if (!guests) return <p className="text-[var(--slate)]">Loading RSVPs…</p>;
  if (!guests.length) {
    return (
      <Panel className="px-6 py-12 text-center">
        <i className="ri-group-line text-3xl text-[var(--slate)]" />
        <p className="mt-3 font-display text-xl font-semibold text-[var(--ink)]">No RSVPs yet</p>
        <p className="mx-auto mt-1 max-w-md text-[14px] text-[var(--slate)]">Responses will appear here as soon as guests reply on your event website.</p>
      </Panel>
    );
  }
  return <GuestTable guests={guests} />;
}
