import { useState } from "react";
import { usePortal } from "../PortalContext";
import { PageHeader } from "../PortalLayout";
import { InvoiceTable, isOverdue } from "../components/blocks";
import { formatLongDate, formatMoney } from "../format";
import { ErrorText, Field, FilterTabs, Input, Modal, PillButton, PrimaryButton, Textarea } from "../ui";
import { useNavigate } from "react-router-dom";

type Filter = "all" | "open" | "paid";

export default function BillingPage() {
  const { invoices } = usePortal();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<Filter>("open");
  const [detailsOpen, setDetailsOpen] = useState(false);

  const live = invoices.filter((i) => i.status !== "void");
  const open = live.filter((i) => i.status === "open").sort((a, b) => (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999"));
  const totalPaid = live.filter((i) => i.status === "paid").reduce((s, i) => s + i.amount, 0);
  const outstanding = open.reduce((s, i) => s + i.amount, 0);
  const next = open[0];
  const shown = live.filter((i) => filter === "all" || i.status === filter);

  return (
    <>
      <PageHeader title="Billing" sub="View your invoices, payment history, and billing details." />

      {/* The summary: what's owed and by when. Which invoices make it up is the list below. */}
      {next ? (
        <div className="flex flex-wrap items-end justify-between gap-4 px-1 md:px-8">
          <div>
            <p className="text-[13px] uppercase tracking-[0.04em] text-[var(--slate)]">Amount due</p>
            <p className="text-[28px] font-semibold text-[var(--ink)]">{formatMoney(outstanding)}</p>
            {/* The due date carries the status: only an overdue invoice needs flagging. */}
            <p className={`flex flex-wrap items-center gap-2 text-[13px] ${isOverdue(next) ? "text-[#c2412d]" : "text-[var(--slate)]"}`}>
              {open.length > 1 ? `${open.length} invoices · next due ` : ""}
              {next.due_date ? `${open.length > 1 ? "" : "Due "}${formatLongDate(next.due_date)}` : "Due on receipt"}
              {isOverdue(next) ? <span className="rounded-full border border-[#c2412d] px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.04em]">Overdue</span> : null}
            </p>
          </div>
          <PillButton tone="primary" onClick={() => navigate(`/account/billing/${next.id}`)}>
            {next.payment_url ? "Pay now" : "View invoice"}
          </PillButton>
        </div>
      ) : (
        <div className="px-1 md:px-8">
          <p className="text-[13px] uppercase tracking-[0.04em] text-[var(--slate)]">Amount due</p>
          <p className="text-[28px] font-semibold text-[var(--ink)]">{formatMoney(0)}</p>
          <p className="text-[13px] text-[var(--slate)]">You’re all paid up.</p>
        </div>
      )}

      <div className="mt-14 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-[2.2rem] font-semibold leading-tight text-[var(--ink)] md:text-[2.6rem]">Invoices</h2>
          <p className="text-[18px] text-[var(--ink)]">
            Your complete billing history.{totalPaid > 0 ? <span className="text-[var(--slate)]"> {formatMoney(totalPaid)} paid so far.</span> : null}
          </p>
        </div>
        <FilterTabs<Filter>
          value={filter}
          onChange={setFilter}
          options={[
            { value: "open", label: "Open" },
            { value: "paid", label: "Paid" },
            { value: "all", label: "All" },
          ]}
        />
      </div>
      <div className="mt-8">
        <InvoiceTable invoices={shown} empty={filter === "open" ? "Nothing to pay right now." : filter === "paid" ? "No paid invoices yet." : undefined} />
      </div>

      <div className="mt-10 flex flex-wrap items-center justify-between gap-4 px-1 md:px-8">
        <div>
          <p className="text-[16px] text-[var(--ink)]">Billing details</p>
          <p className="text-[13px] text-[var(--slate)]">Manage your billing information and payment details.</p>
        </div>
        <PillButton onClick={() => setDetailsOpen(true)}>Manage billing</PillButton>
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
        <Field label="Billing name">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name or company" />
        </Field>
        <Field label="Billing email" hint="Invoices and payment reminders go here.">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Billing address (optional)">
          <Textarea value={address} onChange={(e) => setAddress(e.target.value)} className="!min-h-[90px]" />
        </Field>
      </div>
      <p className="mt-5 rounded-xl bg-[var(--paper)] px-4 py-3 text-[13px] text-[var(--slate)]">
        We accept bank transfer and PayPal (with a service fee). Payment links, when available, appear on each open invoice.
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
