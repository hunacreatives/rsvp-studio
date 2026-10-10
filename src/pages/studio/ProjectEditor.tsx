import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { usePortal } from "@/pages/account/portal/PortalContext";
import { InvoicePill } from "@/pages/account/portal/components/blocks";
import InvoiceActions, { invoiceSummary } from "./InvoiceActions";
import { formatDate, formatMoney } from "@/pages/account/portal/format";
import type { PersonLite, Project, ProjectStatus } from "@/pages/account/portal/types";
import { Cover, ErrorText, Field, Input, OutlineCard, PillButton, Select, Textarea } from "@/pages/account/portal/ui";
import * as studio from "./studioApi";

const SERVICE_PRESETS = ["Wedding Website", "Event Website", "Digital Invitations", "Digital Save the Date", "Monogram Design", "Stationery Design", "RSVP Management"];
const EVENT_TYPES = [
  { value: "wedding", label: "Wedding" },
  { value: "birthday", label: "Birthday" },
  { value: "anniversary", label: "Anniversary" },
  { value: "other", label: "Other celebration" },
];

/** Runs a studio write, then reloads the portal snapshot. */
function useAction() {
  const { refresh, demo } = usePortal();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = async (fn: () => Promise<unknown>) => {
    if (demo) return setError("Read-only in demo mode.");
    setBusy(true);
    setError(null);
    try {
      await fn();
      await refresh();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      return false;
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, run };
}

function Card({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <OutlineCard className="p-5 md:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="font-display text-[1.3rem] font-semibold text-[var(--ink)]">{title}</h3>
        {action}
      </div>
      {children}
    </OutlineCard>
  );
}

function ServicesPicker({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const toggle = (s: string) => onChange(value.includes(s) ? value.filter((x) => x !== s) : [...value, s]);
  return (
    <div className="flex flex-wrap gap-2">
      {SERVICE_PRESETS.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => toggle(s)}
          className="rounded-full border px-3 py-1 text-[13px] transition-colors"
          style={{ borderColor: "var(--ink)", background: value.includes(s) ? "var(--ink)" : "#fff", color: value.includes(s) ? "#fff" : "var(--ink)" }}
        >
          {s}
        </button>
      ))}
    </div>
  );
}

export function NewProjectForm({
  onCreated,
  prefill,
  leadId,
}: {
  onCreated: (id: string) => void;
  /** From a lead ("Turn into project"): what they told us on the inquiry form. */
  prefill?: { name: string; type: string; date: string; services: string[] };
  leadId?: string;
}) {
  const [name, setName] = useState(prefill?.name ?? "");
  const [type, setType] = useState(prefill?.type ?? "wedding");
  const [date, setDate] = useState(prefill?.date ?? "");
  const [services, setServices] = useState<string[]>(prefill?.services ?? []);
  const { busy, error, run } = useAction();

  return (
    <Card title={leadId ? "New project from a lead" : "New project"}>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Project name" hint="Shown to the client, e.g. “Nikki & Alan”">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Event type">
          <Select value={type} onChange={(e) => setType(e.target.value)}>
            {EVENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </Select>
        </Field>
        <Field label="Event date">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
      </div>
      <div className="mt-4">
        <p className="mb-2 text-[14px] font-medium text-[var(--ink)]">Services</p>
        <ServicesPicker value={services} onChange={setServices} />
      </div>
      <p className="mt-4 text-[13px] text-[var(--slate)]">After creating it, generate an invite code and send it to the client so they can link the project to their account.</p>
      <ErrorText>{error}</ErrorText>
      <PillButton
        tone="primary"
        className="mt-5"
        disabled={busy || !name.trim()}
        onClick={async () => {
          let id = "";
          const ok = await run(async () => {
            id = await studio.createProject({ name: name.trim(), event_type: type, event_date: date || null, services });
            if (leadId) await studio.setLeadStatus(leadId, "converted", id);
          });
          if (ok && id) onCreated(id);
        }}
      >
        Create project
      </PillButton>
    </Card>
  );
}

export default function ProjectEditor({
  project,
  owner,
  members,
  onOpenInbox,
}: {
  project: Project;
  owner?: PersonLite;
  members: PersonLite[];
  onOpenInbox: () => void;
}) {
  return (
    <div className="space-y-5">
      <DetailsCard project={project} />
      <ProgressCard project={project} />
      <ClientCard project={project} owner={owner} members={members} onOpenInbox={onOpenInbox} />
      <UpdateCard project={project} />
      <TasksCard project={project} />
      <InvoicesCard project={project} />
    </div>
  );
}

function DetailsCard({ project }: { project: Project }) {
  const [name, setName] = useState(project.name);
  const [type, setType] = useState(project.event_type ?? "other");
  const [date, setDate] = useState(project.event_date ?? "");
  const [services, setServices] = useState(project.services);
  const [siteUrl, setSiteUrl] = useState(project.site_url ?? "");
  const [cover, setCover] = useState(project.cover_image_url);
  const fileRef = useRef<HTMLInputElement>(null);
  const { busy, error, run } = useAction();

  return (
    <Card title="Details">
      <div className="grid gap-5 md:grid-cols-[1fr_220px]">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Project name"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Field label="Event type">
            <Select value={type} onChange={(e) => setType(e.target.value)}>
              {EVENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </Select>
          </Field>
          <Field label="Event date"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <Field label="Live site URL" hint="For studio-built sites (shown on the client’s Website tab)">
            <Input value={siteUrl} onChange={(e) => setSiteUrl(e.target.value)} placeholder="https://slug.thersvpstudio.com" />
          </Field>
        </div>
        <div>
          <p className="mb-1.5 text-[14px] font-medium text-[var(--ink)]">Cover</p>
          <Cover url={cover} name={name} className="aspect-[4/3] rounded-2xl" />
          <PillButton className="mt-2 w-full" onClick={() => fileRef.current?.click()} disabled={busy}>Upload cover</PillButton>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              await run(async () => {
                const url = await studio.uploadCover(project.id, f);
                await studio.updateProject(project.id, { cover_image_url: url });
                setCover(url);
              });
            }}
          />
        </div>
      </div>
      <div className="mt-4">
        <p className="mb-2 text-[14px] font-medium text-[var(--ink)]">Services</p>
        <ServicesPicker value={services} onChange={setServices} />
      </div>
      <ErrorText>{error}</ErrorText>
      <PillButton
        tone="primary"
        className="mt-5"
        disabled={busy || !name.trim()}
        onClick={() => run(() => studio.updateProject(project.id, { name: name.trim(), event_type: type, event_date: date || null, services, site_url: siteUrl.trim() || null }))}
      >
        Save details
      </PillButton>
    </Card>
  );
}

function ProgressCard({ project }: { project: Project }) {
  const [status, setStatus] = useState<ProjectStatus>(project.project_status);
  const [progress, setProgress] = useState(project.progress);
  const [nextStep, setNextStep] = useState(project.next_step ?? "");
  const [due, setDue] = useState(project.next_step_due ?? "");
  const [owner, setOwner] = useState<"" | "client" | "studio">(project.next_step_owner ?? "");
  const { busy, error, run } = useAction();

  const announcement = () => {
    if (status === "completed" && project.project_status !== "completed") return "Project completed";
    if (nextStep.trim() && nextStep.trim() !== (project.next_step ?? "")) return `${owner === "client" ? "Your turn" : owner === "studio" ? "We’re working on" : "Next step"}: ${nextStep.trim()}`;
    return undefined;
  };

  return (
    <Card title="Progress">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Status">
          <Select value={status} onChange={(e) => setStatus(e.target.value as ProjectStatus)}>
            <option value="in_progress">In progress</option>
            <option value="completed">Completed</option>
          </Select>
        </Field>
        <Field label={`Progress — ${progress}%`}>
          <input type="range" min={0} max={100} step={5} value={progress} onChange={(e) => setProgress(Number(e.target.value))} className="mt-3 w-full accent-[var(--ink)]" />
        </Field>
        <Field label="Next step" hint="Short and specific — the client sees this on their dashboard.">
          <Input value={nextStep} onChange={(e) => setNextStep(e.target.value)} placeholder={owner === "client" ? "e.g. Approve your invitation design" : "e.g. Your first design draft"} />
        </Field>
        <Field label="Whose turn is it?">
          <Select value={owner} onChange={(e) => setOwner(e.target.value as "" | "client" | "studio")}>
            <option value="studio">Ours — client sees “We’re working on”</option>
            <option value="client">The client’s — they see “Your turn”</option>
            <option value="">Not set — “Next step”</option>
          </Select>
        </Field>
        <Field label="Due">
          <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
        </Field>
      </div>
      <ErrorText>{error}</ErrorText>
      <div className="mt-5 flex flex-wrap gap-2">
        <PillButton
          tone="primary"
          disabled={busy}
          onClick={() =>
            run(() =>
              studio.updateProject(
                project.id,
                { project_status: status, progress: status === "completed" ? 100 : progress, next_step: nextStep.trim() || null, next_step_due: due || null, next_step_owner: owner || null },
                announcement(),
              ),
            )
          }
        >
          Save{announcement() ? " & notify client" : ""}
        </PillButton>
      </div>
    </Card>
  );
}

function ClientCard({ project, owner, members, onOpenInbox }: { project: Project; owner?: PersonLite; members: PersonLite[]; onOpenInbox: () => void }) {
  const [codes, setCodes] = useState<{ code: string; used_at: string | null }[]>([]);
  const { demo } = usePortal();
  const { busy, error, run } = useAction();
  const [toast, setToast] = useState<string | null>(null);
  const [sendTo, setSendTo] = useState("");
  const flash = (t: string) => {
    setToast(t);
    setTimeout(() => setToast(null), 2500);
  };
  const copy = (code: string) => {
    navigator.clipboard?.writeText(code);
    flash(`Copied ${code}`);
  };
  const unused = codes.find((c) => !c.used_at);

  useEffect(() => {
    if (!demo) studio.loadInviteCodes(project.id).then(setCodes);
  }, [project.id, demo]);

  return (
    <Card title="Client access" action={<PillButton onClick={onOpenInbox}><i className="ri-chat-3-line" /> Messages</PillButton>}>
      <div className="space-y-1 text-[14px]">
        {owner ? (
          <p className="text-[var(--ink)]"><span className="text-[var(--slate)]">Owner:</span> {owner.full_name || "—"} · {owner.email}</p>
        ) : (
          <p className="text-[var(--slate)]">Not linked to a client yet — generate a code and send it to them.</p>
        )}
        {members.map((m) => (
          <p key={m.id} className="text-[var(--ink)]"><span className="text-[var(--slate)]">Member:</span> {m.full_name || "—"} · {m.email}</p>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {codes.map((c) => (
          <button
            key={c.code}
            onClick={() => copy(c.code)}
            title={c.used_at ? `Used ${formatDate(c.used_at)}` : "Click to copy"}
            className={`rounded-full px-3 py-1 font-mono text-[13px] ${c.used_at ? "bg-[var(--paper)] text-[var(--slate)] line-through" : "bg-[#ecfbcc] text-[#3d5a12]"}`}
          >
            {c.code}
          </button>
        ))}
      </div>
      <ErrorText>{error}</ErrorText>
      <PillButton
        className="mt-4"
        disabled={busy}
        onClick={() =>
          run(async () => {
            const code = await studio.createInviteCode(project.id);
            copy(code);
            setCodes(await studio.loadInviteCodes(project.id));
          })
        }
      >
        Generate invite code
      </PillButton>
      {unused ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Input type="email" value={sendTo} onChange={(e) => setSendTo(e.target.value)} placeholder="client@email.com" className="!w-[240px]" />
          <PillButton
            tone="dark"
            disabled={busy || !/^\S+@\S+\.\S+$/.test(sendTo.trim())}
            onClick={() =>
              window.confirm(`Email code ${unused.code} to ${sendTo.trim()}?`) &&
              run(async () => {
                await studio.emailInviteCode(project.id, unused.code, sendTo.trim());
                flash(`Code sent to ${sendTo.trim()}`);
                setSendTo("");
              })
            }
          >
            Email code to client
          </PillButton>
        </div>
      ) : null}
      {toast ? <p className="mt-2 text-[13px] font-medium text-[#2f6b2f]">{toast}</p> : null}
      <p className="mt-2 text-[12px] text-[var(--slate)]">Each code works once. The first person to use one becomes the main client; extra codes add co-hosts.</p>
    </Card>
  );
}

function UpdateCard({ project }: { project: Project }) {
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const { busy, error, run } = useAction();
  return (
    <Card title="Post an update">
      <div className="space-y-3">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Design draft uploaded" />
        <Textarea value={detail} onChange={(e) => setDetail(e.target.value)} placeholder="Optional detail" className="!min-h-[70px]" />
      </div>
      <ErrorText>{error}</ErrorText>
      <PillButton
        tone="primary"
        className="mt-4"
        disabled={busy || !title.trim()}
        onClick={async () => {
          const ok = await run(() => studio.postUpdate(project.id, title.trim(), detail.trim() || null));
          if (ok) {
            setTitle("");
            setDetail("");
          }
        }}
      >
        Post to Recent Activity
      </PillButton>
    </Card>
  );
}

function TasksCard({ project }: { project: Project }) {
  const { tasks } = usePortal();
  const mine = tasks.filter((t) => t.event_id === project.id);
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const { busy, error, run } = useAction();
  return (
    <Card title="Client tasks">
      <ul className="divide-y divide-[var(--line)]">
        {mine.map((t) => (
          <li key={t.id} className="flex items-center gap-3 py-2.5">
            <input
              type="checkbox"
              checked={!!t.done_at}
              onChange={(e) => run(() => studio.setTask(t.id, { done_at: e.target.checked ? new Date().toISOString() : null }))}
              className="h-4 w-4 accent-[var(--acc-green)]"
            />
            <span className={`flex-1 text-[14px] ${t.done_at ? "text-[var(--slate)] line-through" : "text-[var(--ink)]"}`}>{t.title}</span>
            <span className="text-[12px] text-[var(--slate)]">{t.due_date ? `Due ${formatDate(t.due_date)}` : ""}</span>
            <button onClick={() => window.confirm(`Delete the task “${t.title}”?`) && run(() => studio.deleteTask(t.id))} aria-label={`Delete ${t.title}`} className="text-[var(--slate)] hover:text-[#c2412d]">
              <i className="ri-delete-bin-line" />
            </button>
          </li>
        ))}
        {!mine.length ? <li className="py-2 text-[14px] text-[var(--slate)]">No tasks yet.</li> : null}
      </ul>
      <div className="mt-4 grid gap-2 md:grid-cols-[1fr_170px_auto]">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Review guest list" />
        <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
        <PillButton
          tone="dark"
          disabled={busy || !title.trim()}
          onClick={async () => {
            const ok = await run(() => studio.addTask(project.id, title.trim(), due || null));
            if (ok) {
              setTitle("");
              setDue("");
            }
          }}
        >
          Add task
        </PillButton>
      </div>
      <ErrorText>{error}</ErrorText>
    </Card>
  );
}

function InvoicesCard({ project }: { project: Project }) {
  const { invoices } = usePortal();
  const mine = invoices.filter((i) => i.event_id === project.id);
  const [desc, setDesc] = useState("");
  const [amount, setAmount] = useState("");
  const [due, setDue] = useState("");
  const [notes, setNotes] = useState("");
  const { busy, error, run } = useAction();

  return (
    <Card title="Invoices">
      <ul className="divide-y divide-[var(--line)]">
        {mine.map((inv) => (
          <li key={inv.id} className="flex flex-wrap items-center gap-3 py-3">
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] text-[var(--ink)]">{inv.description}</span>
              <span className="block text-[12px] text-[var(--slate)]">
                {inv.number} · {formatMoney(inv.amount)} · {invoiceSummary(inv)}
              </span>
            </span>
            <InvoicePill invoice={inv} />
            <InvoiceActions inv={inv} />
          </li>
        ))}
        {!mine.length ? <li className="py-2 text-[14px] text-[var(--slate)]">No invoices yet.</li> : null}
      </ul>

      <div className="mt-5 rounded-2xl bg-[var(--paper)] p-4">
        <p className="mb-3 text-[14px] font-semibold text-[var(--ink)]">New invoice</p>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Description"><Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="e.g. Wedding Website — 60% deposit" /></Field>
          <Field label="Amount (₱)"><Input type="number" min={0} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
          <Field label="Due date"><Input type="date" value={due} onChange={(e) => setDue(e.target.value)} /></Field>
        </div>
        <div className="mt-3">
          <Field label="Notes (optional, shown on the invoice)"><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="!min-h-[60px]" /></Field>
        </div>
        <ErrorText>{error}</ErrorText>
        <PillButton
          tone="primary"
          className="mt-4"
          disabled={busy || !desc.trim() || !(Number(amount) > 0)}
          onClick={async () => {
            if (!window.confirm(`Send this invoice to the client?\n\n${desc.trim()} — ${formatMoney(Number(amount))}${due ? `, due ${formatDate(due)}` : ", due now"}\n\nThey’ll get an email with a Pay now button.`)) return;
            const ok = await run(() =>
              studio.createInvoice({ event_id: project.id, description: desc.trim(), amount: Number(amount), due_date: due || null, payment_url: null, notes: notes.trim() || null }),
            );
            if (ok) {
              setDesc("");
              setAmount("");
              setDue("");
              setNotes("");
            }
          }}
        >
          Send invoice to client
        </PillButton>
      </div>
    </Card>
  );
}
