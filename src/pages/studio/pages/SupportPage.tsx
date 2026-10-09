import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { usePortal } from "@/pages/account/portal/PortalContext";
import * as api from "@/pages/account/portal/api";
import ChatPane from "@/pages/account/portal/components/ChatPane";
import { formatDate, inboxStamp } from "@/pages/account/portal/format";
import { categoryLabel, isClosed, isOverdue, parseTicket, replyDueAt, STAFF_STATUS, STATUS_STYLE, SUPPORT_CATEGORIES, ticketCode } from "@/pages/account/portal/support";
import type { SupportCategory, SupportStatus, ThreadSummary } from "@/pages/account/portal/types";
import { Avatar, ErrorText, Field, Input, Modal, PillButton, PrimaryButton, Textarea } from "@/pages/account/portal/ui";
import { formatMoney } from "@/pages/account/portal/format";
import { isOverdue as invoiceOverdue } from "@/pages/account/portal/components/blocks";
import { Link } from "react-router-dom";
import { StudioHeader, useStudio } from "../StudioLayout";
import * as studio from "../studioApi";

type Tab = "needs_reply" | "waiting" | "resolved" | "all";
type Who = "everyone" | "mine" | "unassigned";
const TABS: { id: Tab; label: string }[] = [
  { id: "needs_reply", label: "Needs reply" },
  { id: "waiting", label: "Waiting on customer" },
  { id: "resolved", label: "Resolved" },
  { id: "all", label: "All" },
];

/**
 * Studio → Support. Every support request, by status; the oldest unanswered
 * (and urgent ones) first. Search by request number or any word in the
 * conversation. Statuses move by themselves when either side replies.
 */
export default function SupportPage() {
  const { threads, projects, people, profile } = usePortal();
  const [who, setWho] = useState<Who>("everyone");
  const [saved, setSaved] = useState<studio.SavedReply[]>([]);
  const reloadSaved = () => studio.loadSavedReplies().then(setSaved);
  useEffect(() => {
    reloadSaved();
  }, []);
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState<Tab>("needs_reply");
  const [query, setQuery] = useState("");
  const [textHits, setTextHits] = useState<Set<string> | null>(null);

  const requests = useMemo(() => threads.filter((t) => t.kind === "support" && t.ticket_number), [threads]);
  const emailOf = (t: ThreadSummary) => people[t.profile_id]?.email ?? "";
  const projectOf = (t: ThreadSummary) => projects.find((p) => p.id === t.event_id);

  // Words in any message of any request (not just the latest), from the server.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 3 || parseTicket(q) !== null) return setTextHits(null);
    let live = true;
    const t = setTimeout(async () => {
      const { data } = await supabase.from("messages").select("thread_id").ilike("body", `%${q.replace(/[%_]/g, "")}%`).limit(200);
      if (live) setTextHits(new Set((data ?? []).map((m) => m.thread_id as string)));
    }, 250);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [query]);

  const counts = useMemo(() => {
    const c = { needs_reply: 0, waiting: 0, resolved: 0, all: requests.length, overdue: 0 };
    for (const t of requests) {
      if (t.status) c[t.status]++;
      if (isOverdue(t)) c.overdue++;
    }
    return c;
  }, [requests]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const n = parseTicket(q);
    let list = requests;
    if (n !== null) list = list.filter((t) => t.ticket_number === n);
    else if (q) {
      list = list.filter(
        (t) =>
          textHits?.has(t.id) ||
          [t.counterpartName, emailOf(t), categoryLabel(t.category), projectOf(t)?.name, t.lastMessage?.body].some((v) => v?.toLowerCase().includes(q)),
      );
    } else if (tab !== "all") list = list.filter((t) => t.status === tab);
    if (!q && who === "mine") list = list.filter((t) => t.assigned_to === profile.id);
    if (!q && who === "unassigned") list = list.filter((t) => !t.assigned_to);
    const waitingSince = (t: ThreadSummary) => new Date(t.last_customer_at ?? t.last_message_at).getTime();
    return [...list].sort((a, b) =>
      tab === "needs_reply" && !q
        ? Number(b.urgent) - Number(a.urgent) || waitingSince(a) - waitingSince(b)
        : new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime(),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requests, tab, who, query, textHits, people, projects]);

  // Typing an exact number opens that request.
  useEffect(() => {
    const n = parseTicket(query);
    const hit = n !== null ? requests.find((t) => t.ticket_number === n) : undefined;
    if (hit && params.get("thread") !== hit.id) open(hit.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, requests]);

  const activeId = params.get("thread");
  const active = requests.find((t) => t.id === activeId) ?? null;
  const open = (id: string | null) => {
    const next = new URLSearchParams(params);
    if (id) next.set("thread", id);
    else next.delete("thread");
    setParams(next);
  };

  return (
    <>
      <StudioHeader
        title="Support"
        sub={`${counts.needs_reply} need a reply${counts.overdue ? ` · ${counts.overdue} overdue` : ""} · we promise a reply within 1 business day (Mon–Fri, 9 AM–6 PM Manila).`}
      />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => (setTab(t.id), setQuery(""))}
            className={`rounded-full border px-4 py-2 text-[13px] transition-colors ${tab === t.id && !query ? "border-[var(--ink)] bg-[var(--ink)] text-white" : "border-[var(--line)] bg-white text-[var(--ink)] hover:border-[var(--ink)]"}`}
          >
            {t.label} <span className="opacity-60">{counts[t.id]}</span>
          </button>
        ))}
        <span className="ml-auto inline-flex rounded-full border border-[var(--line)] bg-white p-0.5 text-[13px]">
          {(["everyone", "mine", "unassigned"] as Who[]).map((w) => (
            <button key={w} onClick={() => setWho(w)} className={`rounded-full px-3 py-1.5 ${who === w ? "bg-[var(--ink)] text-white" : "text-[var(--ink)]"}`}>
              {w === "mine" ? "Assigned to me" : w === "unassigned" ? "Unassigned" : "Everyone"}
            </button>
          ))}
        </span>
      </div>

      <div className={`grid h-[720px] overflow-hidden rounded-[22px] border border-[var(--line)] bg-white md:grid-cols-[320px_1fr] ${active ? "xl:grid-cols-[300px_1fr_280px]" : ""}`}>
        <div className={`min-h-0 flex-col border-r border-[var(--line)] ${active ? "hidden md:flex" : "flex"}`}>
          <div className="p-4">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search: SUP-1042, a name, email or any word"
              className="w-full rounded-full bg-[var(--paper)] px-4 py-2.5 text-[13px] outline-none"
            />
          </div>
          <ul className="min-h-0 flex-1 overflow-y-auto" data-lenis-prevent>
            {shown.map((t) => {
              const late = isOverdue(t);
              return (
                <li key={t.id}>
                  <button
                    onClick={() => open(t.id)}
                    className={`flex w-full gap-3 border-b border-[var(--line)] px-4 py-3 text-left ${t.id === activeId ? "bg-[#f1f1f3]" : "hover:bg-[var(--paper)]"}`}
                  >
                    <Avatar name={t.counterpartName} url={t.counterpartAvatar} size={36} tone="#cfd6ea" />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className={`truncate text-[13px] text-[var(--ink)] ${t.unread ? "font-bold" : "font-semibold"}`}>{t.counterpartName}</span>
                        <span className="shrink-0 text-[10px] text-[var(--slate)]">{inboxStamp(t.last_message_at)}</span>
                      </span>
                      <span className="flex items-center gap-1.5 text-[12px] text-[var(--ink)]">
                        <span className="font-medium">{ticketCode(t.ticket_number)}</span>
                        <span className="truncate text-[var(--slate)]">· {categoryLabel(t.category)}</span>
                      </span>
                      <span className="mt-1 flex flex-wrap items-center gap-1.5">
                        {t.urgent ? <Chip tone="late">Urgent</Chip> : null}
                        {t.assigned_to ? <Chip tone="open">{t.assigned_to === profile.id ? "You" : (people[t.assigned_to]?.full_name ?? "Team").split(" ")[0]}</Chip> : null}
                        {late ? <Chip tone="late">Overdue</Chip> : null}
                        {tab === "all" || query ? <Chip tone={t.status === "resolved" ? "done" : t.status === "waiting" ? "you" : "open"}>{STAFF_STATUS[t.status ?? "needs_reply"]}</Chip> : null}
                        <span className="min-w-0 flex-1 truncate text-[11px] text-[var(--slate)]">
                          {t.lastMessage?.internal ? <span className="font-medium text-[#8a6a00]">Note: </span> : null}
                          {t.lastMessage?.body || (t.lastMessage?.attachments.length ? "Sent a file" : "")}
                        </span>
                        {t.unread ? <span className="h-2 w-2 rounded-full bg-[var(--acc-blue)]" /> : null}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
            {!shown.length ? (
              <li className="p-8 text-center text-[13px] text-[var(--slate)]">
                {query ? `Nothing matches “${query.trim()}”.` : tab === "needs_reply" ? "All caught up — nobody is waiting on us." : "No requests here."}
              </li>
            ) : null}
          </ul>
        </div>
        <div className={`min-h-0 ${active ? "flex flex-col" : "hidden md:flex md:flex-col"}`}>
          {active ? (
            <ChatPane
              key={active.id}
              thread={active}
              header={`${ticketCode(active.ticket_number)} · ${categoryLabel(active.category)}${projectOf(active) ? ` · ${projectOf(active)!.name}` : ""}`}
              onBack={() => open(null)}
              toolbar={<StaffToolbar t={active} email={emailOf(active)} eventDate={projectOf(active)?.event_date ?? null} />}
              allowNotes
              composerExtras={(insert) => (
                <SavedReplies replies={saved} reload={reloadSaved} firstName={(active.counterpartName || "").split(" ")[0]} onPick={insert} />
              )}
            />
          ) : (
            <div className="grid flex-1 place-items-center text-[14px] text-[var(--slate)]">Pick a request, or search by its number.</div>
          )}
        </div>
        {active ? <CustomerPanel t={active} requests={requests} onOpen={open} /> : null}
      </div>
    </>
  );
}

function Chip({ tone, children }: { tone: keyof typeof STATUS_STYLE; children: React.ReactNode }) {
  return (
    <span className="shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-medium" style={STATUS_STYLE[tone]}>
      {children}
    </span>
  );
}

/** Status, topic and urgency for the request that's open, plus when a reply is due. */
function StaffToolbar({ t, email, eventDate }: { t: ThreadSummary; email: string; eventDate: string | null }) {
  const { refresh, demo, people, profile } = usePortal();
  const team = Object.values(people).filter((p) => p.is_staff);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const save = async (patch: { status?: SupportStatus; urgent?: boolean; category?: SupportCategory; assigned_to?: string | null }) => {
    setBusy(true);
    setError(null);
    try {
      if (demo) throw new Error("Changes are turned off in demo mode.");
      await api.updateSupportRequest(t.id, patch);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t save.");
    }
    setBusy(false);
  };
  const due = t.status === "needs_reply" ? replyDueAt(t.last_customer_at ?? t.last_message_at) : null;
  return (
    <>
      <Chip tone={t.status === "resolved" ? "done" : t.status === "waiting" ? "you" : "open"}>{isClosed(t) ? "Closed" : STAFF_STATUS[t.status ?? "needs_reply"]}</Chip>
      {due ? (
        <span className={`text-[12px] ${isOverdue(t) ? "font-medium text-[#c2412d]" : "text-[var(--slate)]"}`}>
          {isOverdue(t) ? "Overdue — " : ""}reply due {due.toLocaleString("en-PH", { timeZone: "Asia/Manila", weekday: "short", hour: "numeric", minute: "2-digit" })}
        </span>
      ) : null}
      <span className="text-[12px] text-[var(--slate)]">
        {email}
        {eventDate ? ` · event ${formatDate(eventDate)}` : ""}
      </span>
      <span className="ml-auto flex flex-wrap items-center gap-2">
        {!t.assigned_to ? (
          <button disabled={busy} onClick={() => save({ assigned_to: profile.id })} className="rounded-full border border-[var(--line)] bg-white px-3 py-1 text-[12px] font-medium text-[var(--ink)]">
            Assign to me
          </button>
        ) : null}
        <select
          value={t.assigned_to ?? ""}
          disabled={busy}
          onChange={(e) => save({ assigned_to: e.target.value || null })}
          className="rounded-full border border-[var(--line)] bg-white px-2.5 py-1 text-[12px] text-[var(--ink)]"
          aria-label="Assigned to"
        >
          <option value="">Unassigned</option>
          {team.map((m) => (
            <option key={m.id} value={m.id}>{m.id === profile.id ? "Me" : m.full_name || m.email}</option>
          ))}
        </select>
        <select
          value={t.category ?? "other"}
          disabled={busy}
          onChange={(e) => save({ category: e.target.value as SupportCategory })}
          className="rounded-full border border-[var(--line)] bg-white px-2.5 py-1 text-[12px] text-[var(--ink)]"
          aria-label="Topic"
        >
          {SUPPORT_CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>{c.label}</option>
          ))}
        </select>
        <button
          disabled={busy}
          onClick={() => save({ urgent: !t.urgent })}
          className={`rounded-full border px-3 py-1 text-[12px] font-medium ${t.urgent ? "border-[#c2412d] text-[#c2412d]" : "border-[var(--line)] text-[var(--ink)]"}`}
        >
          {t.urgent ? "Urgent ✓" : "Mark urgent"}
        </button>
        {t.status === "resolved" ? (
          <button disabled={busy} onClick={() => save({ status: "needs_reply" })} className="rounded-full border border-[var(--line)] bg-white px-3 py-1 text-[12px] font-medium text-[var(--ink)]">
            Reopen
          </button>
        ) : (
          <button disabled={busy} onClick={() => save({ status: "resolved" })} className="rounded-full bg-[var(--ink)] px-3 py-1 text-[12px] font-medium text-white">
            Resolve
          </button>
        )}
      </span>
      {error ? <span className="w-full text-[12px] text-[#c2412d]">{error}</span> : null}
    </>
  );
}

/** Insert a saved reply into the reply box ({name} → the customer's first name); manage the list. */
function SavedReplies({ replies, reload, firstName, onPick }: { replies: studio.SavedReply[]; reload: () => void; firstName: string; onPick: (text: string) => void }) {
  const [open, setOpen] = useState(false);
  const [managing, setManaging] = useState(false);
  const fill = (body: string) => body.replaceAll("{name}", firstName || "there");
  return (
    <span className="relative">
      <button onClick={() => setOpen((o) => !o)} className="rounded-full border border-[var(--line)] bg-white px-3 py-1 text-[12px] text-[var(--ink)]">
        <i className="ri-chat-quote-line" /> Saved replies
      </button>
      {open ? (
        <span className="absolute bottom-full left-0 z-20 mb-2 block w-[320px] rounded-2xl border border-[var(--line)] bg-white p-2 shadow-[0_18px_40px_-18px_rgba(0,7,39,0.35)]">
          {replies.map((r) => (
            <button
              key={r.id}
              onClick={() => (onPick(fill(r.body)), setOpen(false))}
              className="block w-full rounded-xl px-3 py-2 text-left hover:bg-[var(--paper)]"
            >
              <span className="block text-[13px] font-medium text-[var(--ink)]">{r.title}</span>
              <span className="block truncate text-[12px] text-[var(--slate)]">{fill(r.body)}</span>
            </button>
          ))}
          {!replies.length ? <span className="block px-3 py-2 text-[12px] text-[var(--slate)]">No saved replies yet.</span> : null}
          <button onClick={() => (setManaging(true), setOpen(false))} className="mt-1 block w-full rounded-xl px-3 py-2 text-left text-[12px] font-medium text-[var(--acc-blue)] hover:bg-[var(--paper)]">
            Manage saved replies…
          </button>
        </span>
      ) : null}
      <ManageSavedReplies open={managing} onClose={() => setManaging(false)} replies={replies} reload={reload} />
    </span>
  );
}

function ManageSavedReplies({ open, onClose, replies, reload }: { open: boolean; onClose: () => void; replies: studio.SavedReply[]; reload: () => void }) {
  const { demo } = usePortal();
  const [editing, setEditing] = useState<{ id?: string; title: string; body: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const run = async (work: () => Promise<unknown>) => {
    setError(null);
    try {
      if (demo) throw new Error("Changes are turned off in demo mode.");
      await work();
      setEditing(null);
      reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t save.");
    }
  };
  return (
    <Modal open={open} onClose={onClose} title="Saved replies" width={620}>
      {editing ? (
        <div className="space-y-4">
          <Field label="Title">
            <Input value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} placeholder="e.g. How to pay an invoice" />
          </Field>
          <Field label="Reply" hint="{name} is replaced with the customer’s first name.">
            <Textarea value={editing.body} onChange={(e) => setEditing({ ...editing, body: e.target.value })} rows={6} />
          </Field>
          <ErrorText>{error}</ErrorText>
          <div className="flex justify-end gap-2">
            <PillButton onClick={() => setEditing(null)}>Cancel</PillButton>
            <PrimaryButton disabled={!editing.title.trim() || !editing.body.trim()} onClick={() => run(() => studio.saveSavedReply(editing))}>
              Save
            </PrimaryButton>
          </div>
        </div>
      ) : (
        <>
          <div className="divide-y divide-[var(--line)]">
            {replies.map((r) => (
              <div key={r.id} className="flex items-start gap-3 py-3">
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-medium text-[var(--ink)]">{r.title}</span>
                  <span className="line-clamp-2 block text-[13px] text-[var(--slate)]">{r.body}</span>
                </span>
                <PillButton onClick={() => setEditing({ id: r.id, title: r.title, body: r.body })}>Edit</PillButton>
                <PillButton tone="danger" onClick={() => run(() => studio.deleteSavedReply(r.id))}>
                  Delete
                </PillButton>
              </div>
            ))}
          </div>
          <ErrorText>{error}</ErrorText>
          <div className="mt-5 flex justify-end">
            <PrimaryButton onClick={() => setEditing({ title: "", body: "Hi {name}, " })}>+ New saved reply</PrimaryButton>
          </div>
        </>
      )}
    </Modal>
  );
}

/** Who the customer is: contact details, projects, billing, and their other requests. */
function CustomerPanel({ t, requests, onOpen }: { t: ThreadSummary; requests: ThreadSummary[]; onOpen: (id: string) => void }) {
  const { projects, invoices, people } = usePortal();
  const { directory, owners, members } = useStudio();
  const person = directory.find((c) => c.id === t.profile_id);
  const theirs = projects.filter((p) => (owners[p.id]?.id ?? p.owner_id) === t.profile_id || (members[p.id] ?? []).some((m) => m.id === t.profile_id));
  const open = invoices.filter((i) => i.status === "open" && theirs.some((p) => p.id === i.event_id));
  const late = open.filter(invoiceOverdue);
  const others = requests.filter((r) => r.profile_id === t.profile_id && r.id !== t.id);
  const email = person?.email ?? people[t.profile_id]?.email;
  return (
    <aside className="hidden min-h-0 overflow-y-auto border-l border-[var(--line)] p-5 text-[13px] xl:block" data-lenis-prevent>
      <div className="flex items-center gap-3">
        <Avatar name={t.counterpartName} url={t.counterpartAvatar} size={44} tone="#cfd6ea" />
        <span className="min-w-0">
          <span className="block truncate text-[15px] font-semibold text-[var(--ink)]">{t.counterpartName}</span>
          {email ? <a href={`mailto:${email}`} className="block truncate text-[var(--acc-blue)] hover:underline">{email}</a> : null}
        </span>
      </div>
      <dl className="mt-4 space-y-1.5 text-[var(--slate)]">
        {person?.phone ? <Row label="Phone">{person.phone}</Row> : null}
        {person?.location ? <Row label="Location">{person.location}</Row> : null}
        {person?.created_at ? <Row label="Customer since">{formatDate(person.created_at)}</Row> : null}
      </dl>

      <h3 className="mt-6 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--slate)]">Projects</h3>
      {theirs.length ? (
        theirs.map((p) => (
          <Link key={p.id} to={`/studio/projects?project=${p.id}`} className="mt-2 block rounded-xl bg-[var(--paper)] px-3 py-2 hover:bg-[#ececee]">
            <span className="block font-medium text-[var(--ink)]">{p.name}</span>
            <span className="block text-[12px] text-[var(--slate)]">
              {p.event_date ? `Event ${formatDate(p.event_date)}` : "No event date"} · {p.project_status.replace("_", " ")}
            </span>
          </Link>
        ))
      ) : (
        <p className="mt-2 text-[var(--slate)]">No linked projects.</p>
      )}

      <h3 className="mt-6 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--slate)]">Billing</h3>
      <p className={`mt-2 ${late.length ? "font-medium text-[#c2412d]" : "text-[var(--ink)]"}`}>
        {open.length ? `${formatMoney(open.reduce((s, i) => s + i.amount, 0))} open${late.length ? ` · ${late.length} overdue` : ""}` : "Nothing outstanding"}
      </p>

      <h3 className="mt-6 text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--slate)]">Other requests</h3>
      {others.length ? (
        others.map((r) => (
          <button key={r.id} onClick={() => onOpen(r.id)} className="mt-2 flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left hover:bg-[var(--paper)]">
            <span>
              <span className="block font-medium text-[var(--ink)]">{ticketCode(r.ticket_number)}</span>
              <span className="block text-[12px] text-[var(--slate)]">{categoryLabel(r.category)}</span>
            </span>
            <Chip tone={r.status === "resolved" ? "done" : r.status === "waiting" ? "you" : "open"}>{STAFF_STATUS[r.status ?? "needs_reply"]}</Chip>
          </button>
        ))
      ) : (
        <p className="mt-2 text-[var(--slate)]">None — this is their first.</p>
      )}
    </aside>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <dt>{label}</dt>
      <dd className="text-right text-[var(--ink)]">{children}</dd>
    </div>
  );
}
