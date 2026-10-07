import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { usePortal } from "@/pages/account/portal/PortalContext";
import ChatPane from "@/pages/account/portal/components/ChatPane";
import { inboxStamp } from "@/pages/account/portal/format";
import type { PersonLite } from "@/pages/account/portal/types";
import { Avatar, ErrorText, Field, Input, Modal, PillButton, PrimaryButton, Select, Textarea } from "@/pages/account/portal/ui";

/** All client conversations. Studio replies come from the signed-in staff member. */
export default function StudioInbox({ owners }: { owners: Record<string, PersonLite> }) {
  const { threads, projects } = usePortal();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const [composeFor, setComposeFor] = useState<string | null>(null);
  const projectName = (id: string | null) => (id ? projects.find((p) => p.id === id)?.name : undefined);

  // Opened from a project ("Messages" button): jump to its thread or offer to start one.
  useEffect(() => {
    const pid = params.get("project");
    if (!pid || params.get("thread")) return;
    const existing = threads.find((t) => t.event_id === pid);
    const next = new URLSearchParams(params);
    next.delete("project");
    if (existing) next.set("thread", existing.id);
    else setComposeFor(pid);
    setParams(next, { replace: true });
  }, [params, threads, setParams]);

  const activeId = params.get("thread");
  const active = threads.find((t) => t.id === activeId) ?? null;
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return threads.filter((t) => !q || [t.counterpartName, t.subject, projectName(t.event_id), t.lastMessage?.body].some((s) => s?.toLowerCase().includes(q)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threads, query, projects]);

  const open = (id: string) => {
    const next = new URLSearchParams(params);
    next.set("thread", id);
    setParams(next);
  };

  return (
    <>
      <div className="mb-4 flex justify-end">
        <PillButton tone="dark" onClick={() => setComposeFor("")}>+ Message a client</PillButton>
      </div>
      <div className="grid h-[680px] overflow-hidden rounded-[22px] border border-[var(--line)] bg-white md:grid-cols-[300px_1fr]">
        <div className={`min-h-0 flex-col border-r border-[var(--line)] ${active ? "hidden md:flex" : "flex"}`}>
          <div className="p-4">
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search conversations" className="w-full rounded-full bg-[var(--paper)] px-4 py-2.5 text-[13px] outline-none" />
          </div>
          <ul className="min-h-0 flex-1 overflow-y-auto" data-lenis-prevent>
            {filtered.map((t) => (
              <li key={t.id}>
                <button onClick={() => open(t.id)} className={`flex w-full gap-3 border-b border-[var(--line)] px-4 py-3 text-left ${t.id === activeId ? "bg-[#f1f1f3]" : "hover:bg-[var(--paper)]"}`}>
                  <Avatar name={t.counterpartName} url={t.counterpartAvatar} size={38} tone="#cfd6ea" />
                  <span className="min-w-0 flex-1">
                    <span className="flex justify-between gap-2">
                      <span className={`truncate text-[13px] text-[var(--ink)] ${t.unread ? "font-bold" : "font-semibold"}`}>{t.counterpartName}</span>
                      <span className="shrink-0 text-[10px] text-[var(--slate)]">{inboxStamp(t.last_message_at)}</span>
                    </span>
                    <span className="block truncate text-[12px] text-[var(--ink)]">
                      {t.kind === "support" ? "🛟 " : ""}
                      {projectName(t.event_id) ?? t.subject}
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="min-w-0 flex-1 truncate text-[11px] text-[var(--slate)]">{t.lastMessage?.body || (t.lastMessage?.attachments.length ? "Sent a file" : "")}</span>
                      {t.unread ? <span className="h-2 w-2 rounded-full bg-[var(--acc-blue)]" /> : null}
                    </span>
                  </span>
                </button>
              </li>
            ))}
            {!filtered.length ? <li className="p-8 text-center text-[13px] text-[var(--slate)]">No conversations.</li> : null}
          </ul>
        </div>
        <div className={`min-h-0 ${active ? "flex flex-col" : "hidden md:flex md:flex-col"}`}>
          {active ? (
            <ChatPane
              key={active.id}
              thread={active}
              header={`${projectName(active.event_id) ?? "General"} · ${active.subject}`}
              onBack={() => {
                const next = new URLSearchParams(params);
                next.delete("thread");
                setParams(next);
              }}
            />
          ) : (
            <div className="grid flex-1 place-items-center text-[14px] text-[var(--slate)]">Select a conversation.</div>
          )}
        </div>
      </div>
      {composeFor !== null ? (
        <ComposeModal
          projectId={composeFor}
          owners={owners}
          onClose={() => setComposeFor(null)}
          onCreated={(id) => {
            setComposeFor(null);
            open(id);
          }}
        />
      ) : null}
    </>
  );
}

function ComposeModal({ projectId, owners, onClose, onCreated }: { projectId: string; owners: Record<string, PersonLite>; onClose: () => void; onCreated: (id: string) => void }) {
  const { projects, startThread } = usePortal();
  const linked = projects.filter((p) => owners[p.id]);
  const [eventId, setEventId] = useState(owners[projectId] ? projectId : linked[0]?.id ?? "");
  const [subject, setSubject] = useState(projects.find((p) => p.id === eventId)?.name ?? "");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    const owner = owners[eventId];
    if (!owner) return setError("That project isn’t linked to a client yet.");
    if (!body.trim()) return setError("Write a message.");
    setBusy(true);
    try {
      const t = await startThread({ profileId: owner.id, eventId, kind: "project", subject: subject.trim() || "Project update", body: body.trim(), files: [] });
      onCreated(t.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t send.");
      setBusy(false);
    }
  };

  return (
    <Modal open onClose={onClose} title="Message a client">
      <div className="space-y-4">
        <Field label="Project">
          <Select value={eventId} onChange={(e) => { setEventId(e.target.value); setSubject(projects.find((p) => p.id === e.target.value)?.name ?? ""); }}>
            {linked.map((p) => (
              <option key={p.id} value={p.id}>{p.name} — {owners[p.id]?.email}</option>
            ))}
          </Select>
        </Field>
        {projectId && !owners[projectId] ? <p className="text-[13px] text-[#c2412d]">That project has no linked client yet — send them an invite code first.</p> : null}
        <Field label="Subject"><Input value={subject} onChange={(e) => setSubject(e.target.value)} /></Field>
        <Field label="Message"><Textarea value={body} onChange={(e) => setBody(e.target.value)} /></Field>
      </div>
      <ErrorText>{error}</ErrorText>
      <div className="mt-6 flex justify-end">
        <PrimaryButton onClick={send} disabled={busy || !linked.length}>{busy ? "Sending…" : "Send"}</PrimaryButton>
      </div>
    </Modal>
  );
}
