import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "react-router-dom";
import { usePortal } from "../PortalContext";
import { PageHeader } from "../PortalLayout";
import ChatPane, { FileChips, pickFiles } from "../components/ChatPane";
import { inboxStamp } from "../format";
import * as api from "../api";
import { categoryLabel, customerStatus, isClosed, STATUS_STYLE, requestCode } from "../support";
import { Link } from "react-router-dom";
import type { ThreadSummary } from "../types";
import { Avatar, ErrorText, Field, Input, Modal, PrimaryButton, Select, Textarea } from "../ui";

export function threadContext(t: ThreadSummary, projectName: (id: string) => string | undefined) {
  if (t.kind === "support" && t.ticket_number) return `${requestCode(t.ticket_number)} · ${categoryLabel(t.category)}`;
  return (t.event_id && projectName(t.event_id)) || t.subject;
}

/** A status chip for support requests, in the customer's words. */
export function SupportChip({ t }: { t: ThreadSummary }) {
  if (t.kind !== "support" || !t.status) return null;
  const s = customerStatus(t);
  return (
    <span className="shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-[12px] font-medium" style={STATUS_STYLE[s.tone]}>
      {s.label}
    </span>
  );
}

/** Under a support request's title: its status and "Mark as solved". */
function SupportToolbar({ t }: { t: ThreadSummary }) {
  const { refresh, demo } = usePortal();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const solved = t.status === "resolved";
  return (
    <>
      <SupportChip t={t} />
      <span className="text-[13px] text-[var(--slate)] md:text-[12px]">
        {solved ? "Still not fixed? Just reply here within 7 days." : t.status === "waiting" ? "We’ve replied — over to you." : "We reply within 1 business day."}
      </span>
      {!solved ? (
        <button
          disabled={busy || demo}
          onClick={async () => {
            setBusy(true);
            setError(null);
            try {
              await api.resolveMyRequest(t.id);
              await refresh();
            } catch (e) {
              setError(e instanceof Error ? e.message : "Couldn’t update it.");
            }
            setBusy(false);
          }}
          className="ml-auto min-h-[40px] rounded-full border border-[var(--line)] bg-white px-4 py-1 text-[13px] font-medium text-[var(--ink)] hover:border-[var(--ink)] disabled:opacity-50 md:min-h-0 md:px-3 md:text-[12px]"
        >
          {busy ? "Saving…" : "This is sorted — close it"}
        </button>
      ) : null}
      {error ? <span className="w-full text-[12px] text-[#c2412d]">{error}</span> : null}
    </>
  );
}

const PHONE = "(max-width: 767px)";

/** True below the md breakpoint (where an open conversation takes the whole screen). */
function useIsPhone() {
  const [phone, setPhone] = useState(() => typeof window !== "undefined" && window.matchMedia(PHONE).matches);
  useEffect(() => {
    const mq = window.matchMedia(PHONE);
    const on = () => setPhone(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return phone;
}

/**
 * The part of the screen the keyboard isn't covering. iOS Safari doesn't shrink the
 * layout for the keyboard, so the full-screen chat sizes itself to this instead —
 * that keeps the reply box sitting right above the keyboard.
 */
function useVisibleViewport(enabled: boolean) {
  const [vp, setVp] = useState<{ height: number; top: number } | null>(null);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!enabled || !vv) return setVp(null);
    const on = () => setVp({ height: vv.height, top: vv.offsetTop });
    on();
    vv.addEventListener("resize", on);
    vv.addEventListener("scroll", on);
    return () => {
      vv.removeEventListener("resize", on);
      vv.removeEventListener("scroll", on);
    };
  }, [enabled]);
  return vp;
}

export default function MessagesPage() {
  const { threads, projects } = usePortal();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const [composeFor, setComposeFor] = useState<string | null | undefined>(undefined); // undefined = closed
  const projectName = (id: string) => projects.find((p) => p.id === id)?.name;

  // ?project=<id> → open that project's conversation, or start one.
  useEffect(() => {
    const pid = params.get("project");
    if (!pid) return;
    const existing = threads.find((t) => t.event_id === pid && t.kind === "project");
    const next = new URLSearchParams(params);
    next.delete("project");
    if (existing) next.set("thread", existing.id);
    else setComposeFor(pid);
    setParams(next, { replace: true });
  }, [params, threads, setParams]);

  const activeId = params.get("thread");
  const active = threads.find((t) => t.id === activeId) ?? null;
  const phone = useIsPhone();
  const fullScreen = phone && !!active;
  const vp = useVisibleViewport(fullScreen);

  // Phones: the page behind the full-screen conversation stays put.
  useEffect(() => {
    if (!fullScreen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [fullScreen]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return threads;
    return threads.filter((t) =>
      [t.counterpartName, t.subject, threadContext(t, projectName), t.lastMessage?.body].some((s) => s?.toLowerCase().includes(q)),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threads, query, projects]);

  const open = (id: string | null) => {
    const next = new URLSearchParams(params);
    if (id) next.set("thread", id);
    else next.delete("thread");
    setParams(next);
  };

  // Desktop: land on the newest conversation instead of an empty pane.
  useEffect(() => {
    if (!activeId && threads.length && window.matchMedia("(min-width: 768px)").matches) open(threads[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, threads.length]);

  const renderChat = (t: ThreadSummary) => (
    <ChatPane
      key={t.id}
      thread={t}
      header={threadContext(t, projectName)}
      onBack={() => open(null)}
      toolbar={t.kind === "support" && t.status ? <SupportToolbar t={t} /> : undefined}
      closedNote={
        t.kind === "support" && isClosed(t) ? (
          <>
            This request is done and closed.{" "}
            <Link to="/account/help/contact" className="font-medium text-[var(--acc-blue)] hover:underline">
              Start a new request
            </Link>{" "}
            and mention {requestCode(t.ticket_number)} if it&rsquo;s related.
          </>
        ) : undefined
      }
    />
  );

  return (
    <>
      <PageHeader
        title="Messages"
        action={<PrimaryButton onClick={() => setComposeFor(null)}>+ New Message</PrimaryButton>}
      />

      {/* Phones: the list is part of the page (no box-in-a-page scrolling); a conversation opens full screen. */}
      <div className="grid grid-cols-1 overflow-hidden rounded-[22px] border border-[var(--line)] bg-white md:h-[640px] md:grid-cols-[270px_1fr] [&>*]:min-w-0">
        <div className="flex min-h-0 flex-col md:border-r md:border-[var(--line)]">
          <div className="p-3 md:p-4">
            <label className="flex items-center gap-2 rounded-full bg-[#efeaf4] px-5 py-2.5">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search Messages..."
                className="min-w-0 flex-1 bg-transparent text-[16px] text-[var(--ink)] outline-none placeholder:text-[var(--slate)] md:text-[13px]"
              />
              <i className="ri-search-line text-lg text-[var(--ink)]" />
            </label>
          </div>
          <ul className="md:min-h-0 md:flex-1 md:overflow-y-auto" data-lenis-prevent>
            {filtered.map((t) => (
              <li key={t.id}>
                <button
                  onClick={() => open(t.id)}
                  className={`flex w-full items-start gap-3 border-b border-[var(--line)] px-4 py-4 text-left md:py-3.5 transition-colors ${t.id === activeId ? "bg-[#f1f1f3]" : "hover:bg-[var(--paper)]"}`}
                >
                  <Avatar name={t.counterpartName} seed={t.counterpartId} url={t.counterpartAvatar} size={40} tone="#cfd6ea" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className={`truncate text-[15px] text-[var(--ink)] md:text-[13px] ${t.unread ? "font-bold" : "font-semibold"}`}>{t.counterpartName}</span>
                      <span className="shrink-0 text-[12px] text-[var(--slate)] md:text-[11px]">{inboxStamp(t.last_message_at)}</span>
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="min-w-0 flex-1 truncate text-[14px] text-[var(--ink)] md:text-[13px]">{threadContext(t, projectName)}</span>
                      <SupportChip t={t} />
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="min-w-0 flex-1 truncate text-[14px] text-[var(--slate)] md:text-[12px]">{t.lastMessage?.body || (t.lastMessage?.attachments.length ? "Sent a file" : "")}</span>
                      {t.unread ? <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--acc-blue)]" aria-label="Unread" /> : null}
                    </span>
                  </span>
                </button>
              </li>
            ))}
            {!filtered.length ? (
              <li className="px-6 py-10 text-center text-[14px] text-[var(--slate)]">
                {threads.length ? "No conversations match." : "No messages yet. Start a conversation with our team."}
              </li>
            ) : null}
          </ul>
        </div>

        <div className="hidden min-h-0 md:flex md:flex-col">
          {active && !phone ? (
            renderChat(active)
          ) : (
            <div className="grid flex-1 place-items-center p-8 text-center text-[14px] text-[var(--slate)]">
              <div>
                <i className="ri-chat-smile-2-line mb-2 block text-3xl" />
                Pick a conversation, or start a new one.
              </div>
            </div>
          )}
        </div>
      </div>

      {fullScreen && active
        ? createPortal(
            <div
              className="fixed inset-x-0 top-0 z-[60] flex h-[100dvh] flex-col bg-white md:hidden"
              style={vp ? { height: vp.height, transform: `translateY(${vp.top}px)` } : undefined}
              role="dialog"
              aria-modal="true"
              aria-label={threadContext(active, projectName) ?? "Conversation"}
            >
              {renderChat(active)}
            </div>,
            document.body,
          )
        : null}

      {composeFor !== undefined ? (
        <NewMessageModal
          projectId={composeFor}
          onClose={() => setComposeFor(undefined)}
          onCreated={(id) => {
            setComposeFor(undefined);
            open(id);
          }}
        />
      ) : null}
    </>
  );
}

function NewMessageModal({ projectId, onClose, onCreated }: { projectId: string | null; onClose: () => void; onCreated: (threadId: string) => void }) {
  const { projects, startThread } = usePortal();
  const initial = projects.find((p) => p.id === projectId);
  const [eventId, setEventId] = useState(projectId ?? "");
  const [subject, setSubject] = useState(initial ? initial.name : "");
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const submit = async () => {
    if (!body.trim()) return setError("Write a message first.");
    setBusy(true);
    setError(null);
    try {
      const project = projects.find((p) => p.id === eventId);
      const t = await startThread({
        eventId: eventId || null,
        kind: eventId ? "project" : "general",
        subject: subject.trim() || project?.name || "General question",
        body: body.trim(),
        files,
      });
      onCreated(t.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t send — please try again.");
      setBusy(false);
    }
  };

  return (
    <Modal open onClose={onClose} title="New message" width={560}>
      <p className="-mt-2 mb-4 rounded-xl bg-[var(--paper)] px-4 py-3 text-[13px] text-[var(--slate)]">
        For your designs and project. Something not working, or a billing question?{" "}
        <Link to="/account/help/contact" className="font-medium text-[var(--acc-blue)] hover:underline">
          Contact support
        </Link>{" "}
        — you’ll get a request number and a reply within 1 business day.
      </p>
      <div className="space-y-4">
        <Field label="Event">
          <Select
            value={eventId}
            onChange={(e) => {
              setEventId(e.target.value);
              const p = projects.find((x) => x.id === e.target.value);
              if (p && (!subject || projects.some((x) => x.name === subject))) setSubject(p.name);
            }}
          >
            <option value="">General question</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </Select>
        </Field>
        <Field label="Subject">
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="What’s this about?" />
        </Field>
        <Field label="Message">
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write your message here…" />
        </Field>
        <div>
          <button onClick={() => fileRef.current?.click()} className="inline-flex min-h-[44px] items-center gap-1.5 text-[14px] font-medium text-[var(--acc-blue)] md:min-h-0">
            <i className="ri-attachment-2" /> Attach files
          </button>
          <input
            ref={fileRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              const r = pickFiles(files, e.target.files);
              setFiles(r.files);
              setError(r.error);
              e.target.value = "";
            }}
          />
          <div className="mt-2">
            <FileChips files={files} onRemove={(i) => setFiles((f) => f.filter((_, j) => j !== i))} />
          </div>
        </div>
      </div>
      <ErrorText>{error}</ErrorText>
      <div className="mt-6 flex justify-end">
        <PrimaryButton onClick={submit} disabled={busy}>{busy ? "Sending…" : "Send message"}</PrimaryButton>
      </div>
    </Modal>
  );
}
