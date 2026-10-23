import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import GuestTable from "../../components/GuestTable";
import GuestEditor from "../../components/GuestEditor";
import InviteShareButtons from "@/components/InviteShare";
import { getTemplateDefinition } from "@/pages/wedding-sites/engine/registry";
import { useTemplateCatalog } from "@/pages/wedding-sites/engine/catalog";
import { usePortal } from "../PortalContext";
import * as api from "../api";
import ProjectDangerZone from "../components/ProjectDangerZone";
import InviteList from "../components/InviteList";
import GuestPhotosAdmin from "../components/GuestPhotosAdmin";
import { supabase } from "@/lib/supabase";
import DiyExtras from "../components/DiyExtras";
import EventOverview from "../components/EventOverview";
import DomainCard from "../components/DomainCard";
import SaveTheDateCard from "../components/SaveTheDateCard";
import { ActivityList, CopyLink, DiySiteSummary, InvoiceTable, ProjectStatusPill, TaskList, isDiy, useProjectCover, nextStepLabel } from "../components/blocks";
import { countdown, formatDate, formatLongDate, servicesLabel } from "../format";
import type { Project } from "../types";
import { Cover, FilterTabs, OutlineCard, Panel, PillButton, ProgressBar, SectionTitle } from "../ui";

type Tab = "overview" | "website" | "guests";

export default function ProjectDetailPage() {
  const { projectId } = useParams();
  const { projects, tasks, activity, invoices, sites } = usePortal();
  const navigate = useNavigate();
  const cover = useProjectCover();
  // ?tab=guests opens straight on the guest list (the daily RSVP summary email links here).
  const [tab, setTab] = useState<Tab>(() => {
    const q = new URLSearchParams(window.location.search);
    const t = q.get("tab");
    // Back from a domain renewal payment → the Website tab, where the domain lives.
    if (q.has("renewed") || q.has("domain_cancelled")) return "website";
    return t === "website" || t === "guests" ? t : "overview";
  });
  const project = projects.find((p) => p.id === projectId);
  // Overview → "Invite list →" / "All replies →": the Guests tab, on that list (GuestsTab reads ?list).
  const openGuests = (list: "replies" | "invites") => {
    const q = new URLSearchParams(window.location.search);
    q.set("tab", "guests");
    if (list === "invites") q.set("list", "invites");
    else q.delete("list");
    navigate({ search: q.toString() }, { replace: true });
    setTab("guests");
    window.scrollTo({ top: 0 });
  };

  if (!project) return <Navigate to="/account/projects" replace />;

  const done = project.project_status === "completed";
  const diy = isDiy(project);
  const site = sites[project.id];
  const projectTasks = tasks
    .filter((t) => t.event_id === project.id)
    .sort((a, b) => Number(!!a.done_at) - Number(!!b.done_at) || (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999"));
  const projectActivity = activity.filter((a) => a.event_id === project.id).slice(0, 8);
  const projectInvoices = invoices.filter((i) => i.event_id === project.id && i.status !== "void");

  return (
    <>
      <Link to="/account/projects" className="mb-3 inline-flex min-h-[44px] items-center gap-1 text-[13px] font-medium uppercase tracking-[0.1em] text-[var(--slate)] hover:text-[var(--ink)]">
        <i className="ri-arrow-left-line" /> All events
      </Link>

      {/* The event at a glance: a small cover (not a banner), what and when, and what to do. */}
      <div className="rounded-[24px] bg-[var(--paper)] p-4 md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-5">
          <div className="flex min-w-0 flex-1 items-center gap-4 md:gap-5">
            <Cover url={cover(project)} name={project.name} small className="h-[72px] w-[96px] shrink-0 rounded-2xl md:h-[88px] md:w-[118px]" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <h1 className="font-display text-[1.75rem] font-semibold leading-tight tracking-[-0.02em] text-[var(--ink)] md:text-[2.2rem]">{project.name}</h1>
                <ProjectStatusPill project={project} />
              </div>
              <p className="mt-1 text-[14px] text-[var(--slate)] md:text-[15px]">
                {[project.event_date ? formatLongDate(project.event_date) : "Date not set", !done && project.event_date ? countdown(project.event_date) : "", servicesLabel(project.services, project.event_type)].filter(Boolean).join(" · ")}
              </p>
            </div>
          </div>
            {diy ? (
              <div className="flex flex-wrap gap-2">
                {site?.publishedAt && !site.ended ? <CopyLink url={`${window.location.origin}/invite/${site.slug}`} label="Copy link" pill /> : null}
                {site?.publishedAt ? (
                  <PillButton onClick={() => window.open(`/invite/${site.slug}`, "_blank", "noopener")}>
                    <i className="ri-external-link-line" /> View site
                  </PillButton>
                ) : null}
                <PillButton tone="dark" onClick={() => navigate(`/account/events/${project.id}/site-builder${site ? "/edit" : ""}`)}>
                  <i className="ri-edit-2-line" /> {site?.publishedAt ? "Edit site" : site ? "Continue building" : "Pick a template"}
                </PillButton>
              </div>
            ) : (
              <PillButton tone="dark" onClick={() => navigate(`/account/messages?project=${project.id}`)}>
                <i className="ri-chat-3-line" /> Message the studio
              </PillButton>
            )}
          </div>

          {diy ? (
            // Only when there's something to say that the header doesn't (an ended site's guest list).
            site?.ended ? <DiySiteSummary project={project} /> : null
          ) : (
            <>
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
              <p className="text-[var(--ink)]">{(done ? formatDate(project.completed_at) : formatDate(project.next_step_due)) || "—"}</p>
            </div>
          </div>
            </>
          )}
      </div>

      <div className="mb-8 mt-6">
        <FilterTabs<Tab>
          fill
          value={tab}
          onChange={setTab}
          options={[
            { value: "overview", label: "Overview" },
            { value: "website", label: "Website" },
            { value: "guests", label: "Guests" },
          ]}
        />
      </div>

      {tab === "overview" && diy ? (
        // A site the host runs themselves: the guest summary (EventOverview), then invoices once
        // they've paid for something.
        <div className="space-y-12">
          <EventOverview project={project} openGuests={openGuests} />
          {projectInvoices.length ? (
            <section className="min-w-0">
              <SectionTitle action={<Link to="/account/billing" className="inline-flex min-h-[44px] items-center text-[14px] font-medium text-[var(--acc-blue)] hover:underline md:min-h-0">All billing →</Link>}>
                Invoices
              </SectionTitle>
              <InvoiceTable invoices={projectInvoices} payable />
            </section>
          ) : null}
        </div>
      ) : tab === "overview" ? (
        <div className="space-y-12">
          <div className={`grid gap-10 xl:gap-6 ${!diy || projectTasks.length ? "xl:grid-cols-2" : ""}`}>
            {!diy || projectTasks.length ? (
              <section className="min-w-0">
                <SectionTitle>Tasks</SectionTitle>
                <TaskList tasks={projectTasks} showProject={false} emptyText="Nothing needs your attention right now." />
              </section>
            ) : null}
            <section className="min-w-0">
              <SectionTitle>Activity</SectionTitle>
              <ActivityList items={projectActivity} showProject={false} emptyText={diy ? "New replies will show up here." : undefined} />
            </section>
          </div>
          {!diy || projectInvoices.length ? (
            <section className="min-w-0">
              <SectionTitle action={<Link to="/account/billing" className="inline-flex min-h-[44px] items-center text-[14px] font-medium text-[var(--acc-blue)] hover:underline md:min-h-0">All billing →</Link>}>
                Invoices
              </SectionTitle>
              <InvoiceTable invoices={projectInvoices} payable />
            </section>
          ) : null}
        </div>
      ) : tab === "website" ? (
        <>
          <SaveTheDateCard project={project} />
          <WebsiteTab project={project} />
          {diy && site ? <DomainCard project={project} slug={site.slug} /> : null}
          {diy ? <DiyExtras project={project} /> : null}
          <ProjectDangerZone project={project} />
        </>
      ) : (
        <GuestsTab project={project} />
      )}
    </>
  );
}

function WebsiteTab({ project }: { project: Project }) {
  const { sites } = usePortal();
  const navigate = useNavigate();
  useTemplateCatalog(); // so uploaded templates show their real name
  const site = sites[project.id];
  const builder = `/account/events/${project.id}/site-builder`;

  if (site) {
    const template = site.templateId ? getTemplateDefinition(site.templateId)?.label ?? site.templateId : null;
    const publicUrl = `${window.location.origin}/invite/${site.slug}`;
    return (
      <OutlineCard className="p-5 sm:p-6 md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="eyebrow">Your website</p>
            <p className="mt-2 font-display text-2xl font-semibold text-[var(--ink)]">{template ? `${template} template` : "No template chosen yet"}</p>
            <p className="mt-1 text-[14px] text-[var(--slate)]">
              {site.publishedAt ? `Published ${formatDate(site.publishedAt)}` : "Draft — not published yet"}
            </p>
            {/* How long it stays up (supabase/project-lifecycle.sql) — a detail, so it lives here, not on the cards. */}
            {site.liveUntil && !site.ended ? (
              <p className="mt-1 text-[14px] text-[var(--slate)]">
                {site.publishedAt ? "Stays online until" : "Once published, stays online until"} {formatDate(site.liveUntil)}.
              </p>
            ) : null}
            {site.ended ? (
              <p className="mt-1 text-[14px] text-[var(--slate)]">
                Went offline {formatDate(site.liveUntil)}.{" "}
                {site.guestsPurgedAt
                  ? `Guest list and photos removed ${formatDate(site.guestsPurgedAt)}.`
                  : `Guest list and photos kept until ${formatDate(new Date(Date.parse(site.liveUntil!) + 30 * 86_400_000).toISOString())}. Save anything you want to keep before then.`}
              </p>
            ) : null}
          </div>
        </div>
        {site.publishedAt ? (
          <div className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl bg-[var(--paper)] px-4 py-3">
            <i className="ri-link text-[var(--slate)]" />
            <a href={publicUrl} target="_blank" rel="noreferrer" className="min-w-0 flex-1 break-all text-[14px] text-[var(--acc-blue)] hover:underline sm:flex-none sm:truncate">
              {publicUrl}
            </a>
            <PillButton className="ml-auto" onClick={() => navigator.clipboard?.writeText(publicUrl)}>
              Copy link
            </PillButton>
          </div>
        ) : null}
        {site.publishedAt && !site.ended ? <InviteShareButtons url={publicUrl} slug={site.slug} title={project.name} className="mt-3" /> : null}
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
      <OutlineCard className="p-5 sm:p-6 md:p-8">
        <p className="eyebrow">Your website</p>
        <p className="mt-2 font-display text-2xl font-semibold text-[var(--ink)]">Designed and hosted by our studio</p>
        <a href={project.site_url} target="_blank" rel="noreferrer" className="mt-2 inline-flex min-h-[44px] items-center gap-1.5 break-all text-[15px] text-[var(--acc-blue)] hover:underline">
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
  { id: "g1", name: "Maria Santos", email: "maria@example.com", message: "Can’t wait to celebrate with you both!", created_at: new Date().toISOString(), attending: true, guest_count: 2, dietary: "Vegetarian" },
  { id: "g2", name: "Paolo Cruz", email: "paolo@example.com", message: null, created_at: new Date(Date.now() - 86_400_000).toISOString(), attending: false, guest_count: 0 },
  { id: "g3", name: "Bea Reyes", email: "bea@example.com", message: "See you there 💛", created_at: new Date(Date.now() - 3 * 86_400_000).toISOString(), attending: true, guest_count: 1 },
  { id: "g4", name: "Miguel Tan", email: "miguel@example.com", message: null, created_at: new Date(Date.now() - 4 * 86_400_000).toISOString(), attending: true, guest_count: 2, dietary: "No seafood" },
  { id: "g5", name: "Carla Villanueva", email: "carla@example.com", message: "Congratulations, Nikki and Alan!", created_at: new Date(Date.now() - 5 * 86_400_000).toISOString(), attending: true, guest_count: 1 },
  { id: "g6", name: "Josh Ramos", email: "josh@example.com", message: "So sorry, we’ll be abroad. Sending love!", created_at: new Date(Date.now() - 6 * 86_400_000).toISOString(), attending: false, guest_count: 0 },
  { id: "g7", name: "Andrea Lim", email: "andrea@example.com", message: null, created_at: new Date(Date.now() - 8 * 86_400_000).toISOString(), attending: true, guest_count: 3 },
];

function GuestsTab({ project }: { project: Project }) {
  const { demo, sites } = usePortal();
  const [guests, setGuests] = useState<api.Guest[] | null>(null);
  // ?list=invites (from Home's "haven't replied"): straight to the invite list.
  const [view, setView] = useState<"replies" | "invites">(() => (new URLSearchParams(window.location.search).get("list") === "invites" ? "invites" : "replies"));
  const [deadline, setDeadline] = useState<string | null>(null);
  // Adding or fixing a reply by hand (null = closed; "new" = add).
  const [editing, setEditing] = useState<api.Guest | "new" | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const site = sites[project.id];
  // Studio-built events keep their RSVPs in their own table: no invite list or photos there.
  const diy = !project.table_name;

  useEffect(() => {
    let live = true;
    if (demo) setGuests(DEMO_GUESTS);
    else api.loadGuests(project).then((g) => live && setGuests(g));
    if (!demo && diy)
      supabase
        .from("wedding_sites")
        .select("deadline:published_content->>rsvpDeadline")
        .eq("event_id", project.id)
        .maybeSingle()
        .then(({ data }) => live && setDeadline(((data as { deadline?: string | null } | null)?.deadline as string | null) ?? null));
    return () => {
      live = false;
    };
  }, [project, demo, diy, reloadKey]);

  if (!guests) return <p className="text-[var(--slate)]">Loading RSVPs…</p>;
  const canManage = diy && !demo;
  const manage = canManage
    ? {
        onAdd: () => setEditing("new"),
        onEdit: (g: api.Guest) => setEditing(g),
        onDelete: async (g: api.Guest) => {
          if (!window.confirm(`Remove ${g.name || "this reply"}? This can’t be undone.`)) return;
          const { error } = await supabase.from("rsvps").delete().eq("id", g.id);
          if (error) return window.alert("Couldn’t remove it. Please try again.");
          setGuests((cur) => cur?.filter((x) => x.id !== g.id) ?? cur);
        },
      }
    : undefined;
  const replies = !guests.length ? (
    <Panel className="px-6 py-12 text-center">
      <i className="ri-group-line text-3xl text-[var(--slate)]" />
      <p className="mt-3 font-display text-xl font-semibold text-[var(--ink)]">No RSVPs yet</p>
      <p className="mx-auto mt-1 max-w-md text-[14px] text-[var(--slate)]">Responses will appear here as soon as guests reply on your event website.</p>
      {canManage ? (
        <button onClick={() => setEditing("new")} className="btn btn-ghost mt-5">
          Add a reply by hand
        </button>
      ) : null}
    </Panel>
  ) : (
    <GuestTable
      guests={guests}
      manage={manage}
      onToggleWall={
        demo
          ? undefined
          : async (g) => {
              const next = !g.message_hidden;
              const { error } = await supabase.from("rsvps").update({ message_hidden: next }).eq("id", g.id);
              if (error) return window.alert("Couldn’t change it. Please try again.");
              setGuests((cur) => cur?.map((x) => (x.id === g.id ? { ...x, message_hidden: next } : x)) ?? cur);
            }
      }
    />
  );
  const editor = editing ? (
    <GuestEditor
      eventId={project.id}
      guest={editing === "new" ? null : editing}
      onClose={() => setEditing(null)}
      onSaved={() => {
        setEditing(null);
        setReloadKey((k) => k + 1);
      }}
    />
  ) : null;
  if (!diy) return replies;
  return (
    <>
      <div className="mb-6">
        <FilterTabs<"replies" | "invites">
          value={view}
          onChange={setView}
          options={[
            { value: "replies", label: `Replies${guests.length ? ` (${guests.length})` : ""}` },
            { value: "invites", label: "Invite list" },
          ]}
        />
      </div>
      {view === "replies" ? (
        replies
      ) : (
        <InviteList
          eventId={project.id}
          guests={guests}
          eventName={project.name}
          siteUrl={site?.slug && site.publishedAt ? `${window.location.origin}/invite/${site.slug}` : null}
          deadline={deadline}
          demo={demo}
        />
      )}
      {!demo ? <GuestPhotosAdmin eventId={project.id} slug={site?.slug ?? null} /> : null}
      {editor}
    </>
  );
}
