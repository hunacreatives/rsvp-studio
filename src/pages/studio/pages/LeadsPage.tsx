import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePortal } from "@/pages/account/portal/PortalContext";
import { formatDate } from "@/pages/account/portal/format";
import { FilterTabs, PillButton } from "@/pages/account/portal/ui";
import { StudioHeader } from "../StudioLayout";
import * as studio from "../studioApi";

// Studio → Leads. Everyone who filled in an inquiry form (project, partner, or a
// question from the FAQ page). Reply from your own email, mark them contacted, and
// turn them into a project when you start working together.

type Filter = "new" | "contacted" | "converted" | "archived" | "all";
const FORM_LABEL: Record<string, string> = { "project-inquiry": "Project inquiry", "partner-inquiry": "Partner inquiry", "faq-question": "Question (FAQ page)" };
const STATUS_LABEL: Record<studio.LeadStatus, string> = { new: "New", contacted: "Contacted", converted: "Project started", archived: "Archived", spam: "Spam" };
// Shown first, in this order; anything else the form sent follows.
const ORDER = ["interested_in", "occasion", "event_date", "event_location", "guest_count", "services", "design_type", "semi_collections", "bespoke_collections", "addons", "budget", "timeline", "vision", "message", "business_name", "role", "looking_for", "regions", "volume", "event_brief", "ig_handle", "instagram", "hear_about"];
const HIDDEN = new Set(["your_name", "full_name", "email", "website"]);
const LABEL: Record<string, string> = { interested_in: "Asked about", event_date: "Event date", event_location: "Where", guest_count: "Guests", design_type: "Custom or Semi-Custom", semi_collections: "Collections", bespoke_collections: "Stationery suites", addons: "Add-ons", vision: "Their vision", ig_handle: "Instagram", hear_about: "Found us via", event_brief: "Event brief", looking_for: "Looking for" };
const labelize = (k: string) => LABEL[k] ?? k.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());

export default function LeadsPage() {
  const { demo } = usePortal();
  const navigate = useNavigate();
  const [leads, setLeads] = useState<studio.Lead[] | null>(null);
  const [filter, setFilter] = useState<Filter>("new");
  const [busy, setBusy] = useState<string | null>(null);
  const reload = () => studio.loadLeads().then((l) => setLeads(l ?? []));
  useEffect(() => {
    if (demo) return setLeads([]);
    reload();
  }, [demo]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const l of leads ?? []) c[l.status] = (c[l.status] ?? 0) + 1;
    return c;
  }, [leads]);
  const shown = (leads ?? []).filter((l) => (filter === "all" ? l.status !== "spam" : filter === "archived" ? l.status === "archived" || l.status === "spam" : l.status === filter));

  const setStatus = async (l: studio.Lead, status: studio.LeadStatus) => {
    setBusy(l.id);
    try {
      await studio.setLeadStatus(l.id, status);
      await reload();
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <StudioHeader title="Leads" sub="Everyone who filled in an inquiry form. Reply from your email, then turn them into a project when you start working together." />
      <div className="mb-5">
        <FilterTabs<Filter>
          value={filter}
          onChange={setFilter}
          options={[
            { value: "new", label: `New (${counts.new ?? 0})` },
            { value: "contacted", label: `Contacted (${counts.contacted ?? 0})` },
            { value: "converted", label: "Project started" },
            { value: "archived", label: "Archived" },
            { value: "all", label: "All" },
          ]}
        />
      </div>
      {demo ? <p className="text-[14px] text-[var(--slate)]">Leads aren’t part of demo data.</p> : null}
      {leads === null ? <p className="text-[14px] text-[var(--slate)]">Loading…</p> : null}

      <div className="space-y-4">
        {shown.map((l) => {
          const v = l.values ?? {};
          const keys = [...ORDER.filter((k) => k in v), ...Object.keys(v).filter((k) => !ORDER.includes(k) && !HIDDEN.has(k))].filter((k) => (Array.isArray(v[k]) ? v[k].length : v[k]));
          const mailto = `mailto:${l.email}?subject=${encodeURIComponent("Your inquiry with The RSVP Studio")}&body=${encodeURIComponent(`Hi ${(l.name ?? "").split(" ")[0] || "there"},\n\n`)}`;
          return (
            <article key={l.id} className="rounded-[22px] border border-[var(--line)] bg-white p-5">
              <header className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[17px] font-semibold text-[var(--ink)]">{l.name || "No name"}</p>
                  <p className="text-[13px] text-[var(--slate)]">
                    {FORM_LABEL[l.form] ?? l.form} · {formatDate(l.created_at)}
                    {l.status !== "new" ? ` · ${STATUS_LABEL[l.status]}` : ""}
                  </p>
                  <p className="mt-1 text-[14px]">
                    {l.email ? <a href={mailto} className="text-[var(--acc-blue)] hover:underline">{l.email}</a> : null}
                    {l.phone ? <span className="text-[var(--slate)]"> · {l.phone}</span> : null}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {l.email ? (
                    <a href={mailto}>
                      <PillButton disabled={busy === l.id}>Reply by email</PillButton>
                    </a>
                  ) : null}
                  {l.status === "new" ? <PillButton disabled={busy === l.id} onClick={() => setStatus(l, "contacted")}>Mark contacted</PillButton> : null}
                  {l.status !== "converted" && l.form !== "faq-question" ? (
                    <PillButton tone="dark" disabled={busy === l.id} onClick={() => navigate(`/studio/projects?project=new&lead=${l.id}`)}>
                      Turn into project
                    </PillButton>
                  ) : null}
                  {l.status === "converted" && l.event_id ? (
                    <PillButton onClick={() => navigate(`/studio/projects?project=${l.event_id}`)}>Open project</PillButton>
                  ) : null}
                  {l.status !== "archived" && l.status !== "converted" ? (
                    <PillButton disabled={busy === l.id} onClick={() => setStatus(l, "archived")}>Archive</PillButton>
                  ) : l.status === "archived" ? (
                    <PillButton disabled={busy === l.id} onClick={() => setStatus(l, "new")}>Move back to New</PillButton>
                  ) : null}
                </div>
              </header>
              {keys.length ? (
                <dl className="mt-4 grid gap-x-6 gap-y-2 text-[14px] sm:grid-cols-2">
                  {keys.map((k) => (
                    <div key={k} className={["vision", "message", "event_brief"].includes(k) ? "sm:col-span-2" : ""}>
                      <dt className="text-[12px] uppercase tracking-[0.06em] text-[var(--slate)]">{labelize(k)}</dt>
                      <dd className="whitespace-pre-line text-[var(--ink)]">
                        {Array.isArray(v[k]) ? (v[k] as string[]).join(", ") : /^\d{4}-\d{2}-\d{2}$/.test(String(v[k])) ? formatDate(String(v[k])) : String(v[k])}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : null}
              {l.attachments?.length ? <p className="mt-3 text-[13px] text-[var(--slate)]">Files (in the hello@ email): {l.attachments.join(", ")}</p> : null}
            </article>
          );
        })}
        {leads && !shown.length ? (
          <div className="rounded-[22px] border border-dashed border-[var(--line)] bg-white/60 p-10 text-center text-[14px] text-[var(--slate)]">
            {filter === "new" ? "No new leads — new inquiries show up here (and in your hello@ inbox)." : "Nothing in this list."}
          </div>
        ) : null}
      </div>
    </>
  );
}
