import { useState } from "react";
import { usePortal } from "../PortalContext";
import { PageHeader } from "../PortalLayout";
import { InvoiceTable, isOverdue } from "../components/blocks";
import { formatMoney } from "../format";
import { ErrorText, Field, Input, Modal, PillButton, PrimaryButton, Textarea } from "../ui";

/**
 * Billing: what's left to pay (each with its own Pay button), then what's been
 * paid (receipts). No separate "amount due" card repeating the same invoices —
 * the list is the summary; a total appears only when there's more than one.
 */
export default function BillingPage() {
  const { invoices } = usePortal();
  const [detailsOpen, setDetailsOpen] = useState(false);

  const unpaid = invoices.filter((i) => i.status === "open").sort((a, b) => (a.due_date ?? "0000").localeCompare(b.due_date ?? "0000"));
  const paid = invoices.filter((i) => i.status === "paid").sort((a, b) => (b.paid_at ?? "").localeCompare(a.paid_at ?? ""));
  const owed = unpaid.reduce((s, i) => s + i.amount, 0);
  const totalPaid = paid.reduce((s, i) => s + i.amount, 0);
  const late = unpaid.filter(isOverdue).length;

  return (
    <>
      <PageHeader title="Billing" sub="What you owe, what you’ve paid, and your receipts." />

      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <h2 className="font-display text-[1.8rem] font-semibold leading-tight text-[var(--ink)]">To pay</h2>
          {unpaid.length > 1 ? (
            <p className={`text-[15px] ${late ? "text-[#c2412d]" : "text-[var(--slate)]"}`}>
              {formatMoney(owed)} across {unpaid.length} invoices{late ? ` · ${late} overdue` : ""}
            </p>
          ) : null}
        </div>
        <InvoiceTable invoices={unpaid} payable empty="You’re all paid up — nothing to pay right now." />
        {unpaid.length ? <p className="mt-3 text-[13px] text-[var(--slate)]">Open an invoice to see exactly what it covers, then pay with GCash, Maya, card or QR Ph. Your receipt appears below as soon as the payment goes through.</p> : null}
      </section>

      <section className="mt-12">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <h2 className="font-display text-[1.8rem] font-semibold leading-tight text-[var(--ink)]">Paid</h2>
          {totalPaid > 0 ? <p className="text-[15px] text-[var(--slate)]">{formatMoney(totalPaid)} paid so far</p> : null}
        </div>
        <InvoiceTable invoices={paid} empty="No payments yet — receipts will show here." />
      </section>

      <div className="mt-10 flex flex-wrap items-center justify-between gap-4 px-1 md:px-8">
        <div>
          <p className="text-[16px] text-[var(--ink)]">Billing details</p>
          <p className="text-[13px] text-[var(--slate)]">The name and email on your invoices and receipts.</p>
        </div>
        <PillButton onClick={() => setDetailsOpen(true)}>Edit details</PillButton>
      </div>

      <BillingDetailsModal open={detailsOpen} onClose={() => setDetailsOpen(false)} />
    </>
  );
}

function BillingDetailsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { profile, saveProfile } = usePortal();
  const [name, setName] = useState(profile.billing_name ?? profile.full_name ?? "");
  const [email, setEmail] = useState(profile.billing_email ?? profile.email ?? "");
  const [address, setAddress] = useState(profile.billing_address ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await saveProfile({ billing_name: name.trim() || null, billing_email: email.trim() || null, billing_address: address.trim() || null });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t save — please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Billing details">
      <p className="-mt-2 mb-5 text-[14px] text-[var(--slate)]">These appear on your invoices and receipts.</p>
      <div className="space-y-4">
        <Field label="Name on your receipts">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name, or your company’s" />
        </Field>
        <Field label="Billing email" hint="Invoices and payment reminders go here.">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Billing address (optional)">
          <Textarea value={address} onChange={(e) => setAddress(e.target.value)} className="!min-h-[90px]" />
        </Field>
      </div>
      <p className="mt-5 rounded-xl bg-[var(--paper)] px-4 py-3 text-[13px] text-[var(--slate)]">
        Pay online with GCash, Maya, card or QR Ph — open any unpaid invoice and tap Pay now.
      </p>
      <ErrorText>{error}</ErrorText>
      <div className="mt-6 flex justify-end">
        <PrimaryButton onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save details"}
        </PrimaryButton>
      </div>
    </Modal>
  );
}
