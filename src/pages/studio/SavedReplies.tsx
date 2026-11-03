import { useState } from "react";
import { usePortal } from "@/pages/account/portal/PortalContext";
import { ErrorText, Field, Input, Modal, PillButton, PrimaryButton, Textarea } from "@/pages/account/portal/ui";
import * as studio from "./studioApi";

// The team's saved replies (supabase/support-team-tools.sql), shared by Support and Leads.

/** Insert a saved reply into the reply box ({name} → the customer's first name); manage the list. */
export default function SavedReplies({ replies, reload, firstName, onPick }: { replies: studio.SavedReply[]; reload: () => void; firstName: string; onPick: (text: string) => void }) {
  const [open, setOpen] = useState(false);
  const [managing, setManaging] = useState(false);
  const fill = (body: string) => body.replaceAll("{name}", firstName || "there");
  return (
    <span className="relative">
      <button onClick={() => setOpen((o) => !o)} className="min-h-[40px] md:min-h-0 rounded-full border border-[var(--line)] bg-white px-3 py-1 text-[13px] text-[var(--ink)] md:text-[12px]">
        <i className="ri-chat-quote-line" /> Saved replies
      </button>
      {open ? (
        <span className="fixed inset-x-4 bottom-[calc(150px_+_env(safe-area-inset-bottom))] z-[130] mb-2 block max-h-[50dvh] overflow-y-auto rounded-2xl md:absolute md:inset-x-auto md:bottom-full md:left-0 md:z-20 md:w-[320px] border border-[var(--line)] bg-white p-2 shadow-[0_18px_40px_-18px_rgba(0,7,39,0.35)]">
          {replies.map((r) => (
            <button
              key={r.id}
              onClick={() => (onPick(fill(r.body)), setOpen(false))}
              className="block min-h-[44px] w-full rounded-xl px-3 py-2 text-left hover:bg-[var(--paper)]"
            >
              <span className="block text-[14px] font-medium md:text-[13px] text-[var(--ink)]">{r.title}</span>
              <span className="block truncate text-[12px] text-[var(--slate)]">{fill(r.body)}</span>
            </button>
          ))}
          {!replies.length ? <span className="block px-3 py-2 text-[12px] text-[var(--slate)]">No saved replies yet.</span> : null}
          <button onClick={() => (setManaging(true), setOpen(false))} className="mt-1 block min-h-[44px] w-full rounded-xl px-3 py-2 text-left text-[13px] font-medium text-[var(--acc-blue)] md:min-h-0 md:text-[12px] hover:bg-[var(--paper)]">
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
          <Field label="Reply" hint="{name} becomes their first name.">
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
                <PillButton tone="danger" onClick={() => window.confirm(`Delete the saved reply “${r.title}”?`) && run(() => studio.deleteSavedReply(r.id))}>
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
