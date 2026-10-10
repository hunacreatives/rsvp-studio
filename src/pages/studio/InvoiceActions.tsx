import { useState } from "react";
import { usePortal } from "@/pages/account/portal/PortalContext";
import { formatDate, formatMoney, paidByLabel } from "@/pages/account/portal/format";
import type { Invoice } from "@/pages/account/portal/types";
import { ErrorText, Field, Input, Modal, PillButton, PrimaryButton, Select, Textarea } from "@/pages/account/portal/ui";
import * as studio from "./studioApi";

// What staff can do with one invoice — on the project page and in Studio → Invoices.
// Anything that emails the client asks first.

const METHODS = [
  ["bank_transfer", "Bank transfer"],
  ["gcash", "GCash"],
  ["paymaya", "Maya"],
  ["cash", "Cash"],
  ["card", "Card"],
  ["other", "Other"],
] as const;

const manilaToday = () => new Date(Date.now() + 8 * 3_600_000).toISOString().slice(0, 10);

type Dialog = null | "record" | "edit" | "void" | "unpaid";

export function invoiceSummary(inv: Invoice) {
  if (inv.status === "paid") return `Paid ${formatDate(inv.paid_at)}${inv.paid_method ? ` · ${paidByLabel(inv.paid_method)}` : ""}`;
  if (inv.status === "void") return "Cancelled";
  return `${inv.due_date ? `Due ${formatDate(inv.due_date)}` : "Due now"}${inv.last_reminded_at ? ` · reminded ${formatDate(inv.last_reminded_at)}` : ""}`;
}

export default function InvoiceActions({ inv, compact = false }: { inv: Invoice; compact?: boolean }) {
  const { refresh, demo } = usePortal();
  const [dialog, setDialog] = useState<Dialog>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const run = async (fn: () => Promise<unknown>, close = true) => {
    if (demo) return setError("Read-only in demo mode.");
    setBusy(true);
    setError(null);
    try {
      await fn();
      await refresh();
      if (close) setDialog(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  const remind = () =>
    window.confirm(`Email the client a reminder about ${formatMoney(inv.amount)} (invoice ${inv.number})?`) &&
    run(async () => {
      await studio.sendInvoiceReminder(inv.id);
      setSent(true);
    }, false);

  return (
    <>
      {inv.status === "open" ? (
        <>
          <PillButton disabled={busy} onClick={() => setDialog("record")}>Record payment</PillButton>
          {!compact ? (
            <>
              <PillButton disabled={busy || sent} onClick={remind}>{sent ? "Reminder sent" : "Send reminder"}</PillButton>
              <PillButton disabled={busy} onClick={() => setDialog("edit")}>Edit</PillButton>
              <PillButton tone="danger" disabled={busy} onClick={() => setDialog("void")}>Cancel invoice</PillButton>
            </>
          ) : null}
        </>
      ) : inv.status === "paid" && !compact ? (
        <PillButton disabled={busy} onClick={() => setDialog("unpaid")}>Undo paid</PillButton>
      ) : null}
      {error && !dialog ? <span className="w-full text-[12px] text-[#c2412d]">{error}</span> : null}

      {dialog === "record" ? <RecordPayment inv={inv} busy={busy} error={error} onClose={() => setDialog(null)} onSave={(p) => run(() => studio.recordPayment(inv.id, p))} /> : null}
      {dialog === "edit" ? <EditInvoice inv={inv} busy={busy} error={error} onClose={() => setDialog(null)} onSave={(p) => run(() => studio.updateInvoice(inv.id, p))} /> : null}
      {dialog === "void" || dialog === "unpaid" ? (
        <TellClient
          title={dialog === "void" ? `Cancel invoice ${inv.number}?` : `Mark invoice ${inv.number} unpaid?`}
          body={
            dialog === "void"
              ? `It disappears from the client’s list of things to pay (${formatMoney(inv.amount)}). This can’t be undone — issue a new invoice if needed.`
              : "Use this if it was marked paid by mistake. The client already got a receipt, so it’s worth telling them."
          }
          confirm={dialog === "void" ? "Cancel invoice" : "Mark unpaid"}
          busy={busy}
          error={error}
          onClose={() => setDialog(null)}
          onConfirm={(tell, note) => run(() => (dialog === "void" ? studio.voidInvoice(inv.id, tell, note) : studio.markInvoiceUnpaid(inv.id, tell, note)))}
        />
      ) : null}
    </>
  );
}

function RecordPayment({ inv, busy, error, onClose, onSave }: { inv: Invoice; busy: boolean; error: string | null; onClose: () => void; onSave: (p: { paidOn: string; method: string; reference: string; sendReceipt: boolean }) => void }) {
  const [paidOn, setPaidOn] = useState(manilaToday());
  const [method, setMethod] = useState("bank_transfer");
  const [reference, setReference] = useState("");
  const [sendReceipt, setSendReceipt] = useState(true);
  return (
    <Modal open onClose={onClose} title={`Record a payment — ${formatMoney(inv.amount)}`}>
      <p className="-mt-2 mb-5 text-[14px] text-[var(--slate)]">For payments made outside the online checkout. Online (PayMongo) payments are recorded automatically.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Date received">
          <Input type="date" value={paidOn} max={manilaToday()} onChange={(e) => setPaidOn(e.target.value)} />
        </Field>
        <Field label="How they paid">
          <Select value={method} onChange={(e) => setMethod(e.target.value)}>
            {METHODS.map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="mt-4">
        <Field label="Reference (optional)" hint="Bank or GCash reference number, so you can match it later.">
          <Input value={reference} onChange={(e) => setReference(e.target.value)} />
        </Field>
      </div>
      <label className="mt-4 flex items-center gap-2 text-[14px] text-[var(--ink)]">
        <input type="checkbox" checked={sendReceipt} onChange={(e) => setSendReceipt(e.target.checked)} /> Email the client a receipt
      </label>
      <ErrorText>{error}</ErrorText>
      <div className="mt-6 flex justify-end gap-2">
        <PillButton onClick={onClose}>Cancel</PillButton>
        <PrimaryButton disabled={busy || !paidOn} onClick={() => onSave({ paidOn, method, reference, sendReceipt })}>
          {busy ? "Saving…" : "Mark as paid"}
        </PrimaryButton>
      </div>
    </Modal>
  );
}

function EditInvoice({ inv, busy, error, onClose, onSave }: { inv: Invoice; busy: boolean; error: string | null; onClose: () => void; onSave: (p: { description: string; amount: number; due_date: string | null; notes: string | null }) => void }) {
  const [description, setDescription] = useState(inv.description);
  const [amount, setAmount] = useState(String(inv.amount));
  const [due, setDue] = useState(inv.due_date ?? "");
  const [notes, setNotes] = useState(inv.notes ?? "");
  return (
    <Modal open onClose={onClose} title={`Edit invoice ${inv.number}`}>
      <p className="-mt-2 mb-5 text-[14px] text-[var(--slate)]">The client sees the change on their invoice straight away. No email is sent.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Description"><Input value={description} onChange={(e) => setDescription(e.target.value)} /></Field>
        <Field label="Amount (₱)"><Input type="number" min={0} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
        <Field label="Due date"><Input type="date" value={due} onChange={(e) => setDue(e.target.value)} /></Field>
      </div>
      <div className="mt-4">
        <Field label="Notes (shown on the invoice)"><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="!min-h-[60px]" /></Field>
      </div>
      <ErrorText>{error}</ErrorText>
      <div className="mt-6 flex justify-end gap-2">
        <PillButton onClick={onClose}>Cancel</PillButton>
        <PrimaryButton
          disabled={busy || !description.trim() || !(Number(amount) > 0)}
          onClick={() => onSave({ description: description.trim(), amount: Number(amount), due_date: due || null, notes: notes.trim() || null })}
        >
          {busy ? "Saving…" : "Save changes"}
        </PrimaryButton>
      </div>
    </Modal>
  );
}

function TellClient({ title, body, confirm, busy, error, onClose, onConfirm }: { title: string; body: string; confirm: string; busy: boolean; error: string | null; onClose: () => void; onConfirm: (tell: boolean, note: string) => void }) {
  const [tell, setTell] = useState(true);
  const [note, setNote] = useState("");
  return (
    <Modal open onClose={onClose} title={title}>
      <p className="-mt-2 text-[14px] text-[var(--slate)]">{body}</p>
      <label className="mt-5 flex items-center gap-2 text-[14px] text-[var(--ink)]">
        <input type="checkbox" checked={tell} onChange={(e) => setTell(e.target.checked)} /> Let the client know by email
      </label>
      {tell ? (
        <div className="mt-3">
          <Field label="Note to the client (optional)">
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} className="!min-h-[70px]" placeholder="e.g. We’ve replaced this with a corrected invoice." />
          </Field>
        </div>
      ) : null}
      <ErrorText>{error}</ErrorText>
      <div className="mt-6 flex justify-end gap-2">
        <PillButton onClick={onClose}>Keep it</PillButton>
        <PrimaryButton disabled={busy} onClick={() => onConfirm(tell, note)}>
          {busy ? "Saving…" : confirm}
        </PrimaryButton>
      </div>
    </Modal>
  );
}
