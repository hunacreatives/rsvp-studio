import { Fragment, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { usePortal } from "../PortalContext";
import * as api from "../api";
import { formatBytes, formatDate, formatTime } from "../format";
import type { Attachment, Message, ThreadSummary } from "../types";
import { Avatar } from "../ui";

export const MAX_FILES = 6;

/** Validates picked files against the 10 MB / 6-file limits. */
export function pickFiles(current: File[], incoming: FileList | null): { files: File[]; error: string | null } {
  const next = [...current];
  let error: string | null = null;
  for (const f of Array.from(incoming ?? [])) {
    if (f.size > api.MAX_FILE_BYTES) error = `${f.name} is over 10 MB.`;
    else if (next.length >= MAX_FILES) error = `Up to ${MAX_FILES} files per message.`;
    else next.push(f);
  }
  return { files: next, error };
}

export function FileChips({ files, onRemove }: { files: File[]; onRemove: (i: number) => void }) {
  if (!files.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {files.map((f, i) => (
        <span key={`${f.name}-${i}`} className="inline-flex max-w-[220px] items-center gap-1.5 rounded-full bg-[var(--paper)] py-1 pl-3 pr-1 text-[12px] text-[var(--ink)]">
          <i className="ri-attachment-2" />
          <span className="truncate">{f.name}</span>
          <button onClick={() => onRemove(i)} aria-label={`Remove ${f.name}`} className="grid h-5 w-5 place-items-center rounded-full hover:bg-black/10">
            <i className="ri-close-line" />
          </button>
        </span>
      ))}
    </div>
  );
}

function AttachmentCard({ a, demo }: { a: Attachment; demo: boolean }) {
  const [busy, setBusy] = useState(false);
  const open = async () => {
    if (demo) return;
    setBusy(true);
    const url = await api.attachmentUrl(a.path);
    setBusy(false);
    if (url) window.open(url, "_blank", "noopener");
  };
  const isImage = a.type.startsWith("image/");
  return (
    <button
      onClick={open}
      className="flex w-full max-w-[360px] items-center gap-4 rounded-xl border border-[var(--line)] bg-white p-3 text-left shadow-[0_6px_18px_-10px_rgba(0,7,39,0.3)] transition-colors hover:border-[var(--ink)]"
    >
      <span className="grid h-14 w-[70px] shrink-0 place-items-center rounded-lg bg-[#e6e6ea] text-2xl text-[var(--slate)]">
        <i className={isImage ? "ri-image-line" : a.type === "application/pdf" ? "ri-file-pdf-2-line" : "ri-file-line"} />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[14px] font-semibold text-[var(--ink)]">{a.name}</span>
        <span className="block text-[12px] text-[var(--slate)]">{busy ? "Opening…" : formatBytes(a.size)}</span>
      </span>
    </button>
  );
}

/**
 * One conversation. Shared by the client Messages page and the studio
 * inbox — "mine" is always the signed-in viewer.
 */
export default function ChatPane({
  thread,
  header,
  onBack,
  toolbar,
  closedNote,
  allowNotes,
  composerExtras,
}: {
  thread: ThreadSummary;
  header?: ReactNode;
  onBack?: () => void;
  /** Extra controls under the title (support: status, mark solved…). */
  toolbar?: ReactNode;
  /** When set, the conversation is read-only and this replaces the reply box. */
  closedNote?: ReactNode;
  /** Staff on support requests: a "Note to team" switch (customers never see notes). */
  allowNotes?: boolean;
  /** Extra composer tools (saved replies…); `insert` puts text into the reply box. */
  composerExtras?: (insert: (text: string) => void) => ReactNode;
}) {
  const { profile, people, getMessages, sendMessage, onMessage, markRead, demo } = usePortal();
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [note, setNote] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let live = true;
    setMessages(null);
    getMessages(thread.id).then((m) => live && setMessages([...m]));
    markRead(thread.id);
    const off = onMessage((m) => {
      if (m.thread_id !== thread.id) return;
      setMessages((prev) => (prev && !prev.some((x) => x.id === m.id) ? [...prev, m] : prev));
      markRead(thread.id);
    });
    return () => {
      live = false;
      off();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thread.id]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [messages]);

  const send = async () => {
    if (!body.trim() && !files.length) return;
    setSending(true);
    setError(null);
    try {
      const m = await sendMessage(thread.id, body.trim(), files, note ? { internal: true } : undefined);
      setMessages((prev) => (prev && !prev.some((x) => x.id === m.id) ? [...prev, m] : prev));
      setBody("");
      setFiles([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Message didn’t send — try again.");
    } finally {
      setSending(false);
    }
  };

  const nameOf = (id: string) => (id === profile.id ? profile.full_name : people[id]?.full_name) ?? (people[id]?.is_staff ? "The RSVP Studio" : "Client");
  const avatarOf = (id: string) => (id === profile.id ? profile.avatar_url : people[id]?.avatar_url) ?? null;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-3 border-b border-[var(--line)] px-4 py-4 md:px-5">
        {onBack ? (
          <button onClick={onBack} aria-label="Back to conversations" className="grid h-9 w-9 place-items-center rounded-full hover:bg-black/5 md:hidden">
            <i className="ri-arrow-left-line text-xl" />
          </button>
        ) : null}
        <Avatar name={thread.counterpartName} url={thread.counterpartAvatar} size={48} tone="#e4e4e8" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold text-[var(--ink)]">{thread.counterpartName}</p>
          <p className="truncate text-[14px] text-[var(--ink)]">{header ?? thread.subject}</p>
        </div>
      </div>
      {toolbar ? <div className="flex flex-wrap items-center gap-2 border-b border-[var(--line)] bg-[#fafafb] px-4 py-2.5 md:px-5">{toolbar}</div> : null}

      <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto px-4 py-5 md:px-5" data-lenis-prevent>
        {messages === null ? (
          <p className="py-10 text-center text-[14px] text-[var(--slate)]">Loading…</p>
        ) : messages.length === 0 ? (
          <p className="py-10 text-center text-[14px] text-[var(--slate)]">No messages yet — say hello.</p>
        ) : (
          messages.map((m, i) => {
            const mine = m.sender_id === profile.id;
            const showDay = i === 0 || new Date(messages[i - 1].created_at).toDateString() !== new Date(m.created_at).toDateString();
            return (
              <Fragment key={m.id}>
                {showDay ? (
                  <div className="my-4 flex items-center gap-3 text-[11px] text-[var(--slate)]">
                    <span className="h-px flex-1 bg-[var(--line)]" />
                    {formatDate(m.created_at)}
                    <span className="h-px flex-1 bg-[var(--line)]" />
                  </div>
                ) : null}
                <div className={`mb-4 flex items-end gap-3 ${mine ? "flex-row-reverse" : ""}`}>
                  <Avatar name={nameOf(m.sender_id)} url={avatarOf(m.sender_id)} size={36} tone="#e4e4e8" />
                  <div className={`flex max-w-[78%] flex-col gap-2 ${mine ? "items-end" : "items-start"}`}>
                    {m.body ? (
                      <div
                        className={`rounded-2xl px-4 py-3 text-[14px] leading-relaxed text-[var(--ink)] ${m.internal ? "border border-dashed border-[#e0c06a] bg-[#fff7dc]" : mine ? "bg-[#e4ecff]" : "bg-[var(--paper)]"}`}
                      >
                        {m.internal ? (
                          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-[#8a6a00]">
                            <i className="ri-lock-line" /> Internal note · {nameOf(m.sender_id)}
                          </p>
                        ) : null}
                        <p className="whitespace-pre-line">{m.body}</p>
                        <p className={`mt-2 text-[11px] text-[var(--slate)] ${mine ? "text-right" : ""}`}>{formatTime(m.created_at)}</p>
                      </div>
                    ) : null}
                    {m.attachments.map((a) => (
                      <AttachmentCard key={a.path + a.name} a={a} demo={demo} />
                    ))}
                  </div>
                </div>
              </Fragment>
            );
          })
        )}
      </div>

      {closedNote ? (
        <div className="border-t border-[var(--line)] bg-[#fafafb] px-4 py-4 text-center text-[13px] text-[var(--slate)] md:px-5">{closedNote}</div>
      ) : (
      <div className={`border-t px-4 py-4 md:px-5 ${note ? "border-[#e0c06a] bg-[#fffbec]" : "border-[var(--line)]"}`}>
        {allowNotes || composerExtras ? (
          <div className="mb-2.5 flex flex-wrap items-center gap-2">
            {allowNotes ? (
              <span className="inline-flex rounded-full border border-[var(--line)] bg-white p-0.5 text-[12px]">
                <button onClick={() => setNote(false)} className={`rounded-full px-3 py-1 ${!note ? "bg-[var(--ink)] text-white" : "text-[var(--ink)]"}`}>
                  Reply to customer
                </button>
                <button onClick={() => setNote(true)} className={`rounded-full px-3 py-1 ${note ? "bg-[#8a6a00] text-white" : "text-[var(--ink)]"}`}>
                  <i className="ri-lock-line" /> Note to team
                </button>
              </span>
            ) : null}
            {composerExtras?.((text) => setBody((b) => (b.trim() ? `${b.trimEnd()}\n\n${text}` : text)))}
          </div>
        ) : null}
        <FileChips files={files} onRemove={(i) => setFiles((f) => f.filter((_, j) => j !== i))} />
        {error ? <p className="mb-2 text-[13px] text-[#c2412d]">{error}</p> : null}
        <div className={`flex items-center gap-3 ${files.length ? "mt-3" : ""}`}>
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-full bg-[var(--paper)] px-4">
            <button onClick={() => fileRef.current?.click()} aria-label="Attach files" className="text-xl text-[var(--ink)]">
              <i className="ri-attachment-2" />
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
            <textarea
              rows={1}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder={note ? "Write a note for the team (the customer won’t see it)…" : "Type a message here…"}
              className="max-h-32 min-w-0 flex-1 resize-none bg-transparent py-3 text-[14px] text-[var(--ink)] outline-none"
            />
          </div>
          <button
            onClick={send}
            disabled={sending || (!body.trim() && !files.length)}
            aria-label="Send"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[var(--acc-blue)] text-white transition-opacity disabled:bg-[#bcd0ff]"
          >
            <i className={sending ? "ri-loader-4-line animate-spin" : "ri-send-plane-2-fill"} />
          </button>
        </div>
      </div>
      )}
    </div>
  );
}
