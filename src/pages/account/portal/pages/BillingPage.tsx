import { useState } from "react";
import { usePortal } from "../PortalContext";
import { PageHeader } from "../PortalLayout";
import { InvoiceTable, isOverdue } from "../components/blocks";
import { formatDate, formatLongDate, formatMoney, servicesLabel } from "../format";
import { ErrorText, Field, FilterTabs, Input, Modal, OutlineCard, PillButton, PrimaryButton, Textarea } from "../ui";
import { useNavigate } from "react-router-dom";

type Filter = "all" | "open" | "paid";

export default function BillingPage() {
  const { invoices, projects } = usePortal();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<Filter>("all");
  const [detailsOpen, setDetailsOpen] = useState(false);

  const live = invoices.filter((i) => i.status !== "void");
  const open = live.filter((i) => i.status === "open").sort((a, b) => (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999"));
  const totalPaid = live.filter((i) => i.status === "paid").reduce((s, i) => s + i.amount, 0);
  const outstanding = open.reduce((s, i) => s + i.amount, 0);
  const next = open[0];
  const nextProject = next ? projects.find((p) => p.id === next.event_id) : undefined;
  const shown = live.filter((i) => filter === "all" || i.status === filter);

  return (
    <>
      <PageHeader title="Billing" sub="View your invoices, payment history, and billing details." />

      {next ? (
        <div className="px-1 md:px-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[13px] uppercase tracking-[0.04em] text-[var(--slate)]">Amount due</p>
              <p className="text-[28px] font-semibold text-[var(--ink)]">{formatMoney(next.amount)}</p>
              <p className="text-[13px] text-[var(--slate)]">{next.due_date ? `Due ${formatLongDate(next.due_date)}` : "Due on receipt"}</p>
            </div>
            <span
              className={`rounded-full border px-3 py-1 text-[14px] font-medium uppercase ${isOverdue(next) ? "border-[#c2412d] text-[#c2412d]" : "border-[var(--ink)] text-[var(--ink)]"}`}
            >
              {isOverdue(next) ? "Overdue" : "Payment due"}
            </span>
          </div>
          <div className="mt-5 flex flex-wrap items-end justify-between gap-3 border-t border-[rgba(0,7,39,0.12)] pt-4">
            <div>
              <p className="text-[16px] text-[var(--ink)]">{nextProject?.name ?? next.description}</p>
              <p className="text-[13px] text-[var(--slate)]">{nextProject ? servicesLabel(nextProject.services, nextProject.event_type) : next.description}</p>
              <p className="mt-2 text-[11px] text-[var(--slate)]">Invoice #{next.number}</p>
            </div>
            <PillButton tone="primary" onClick={() => navigate(`/account/billing/${next.id}`)}>
              {next.payment_url ? "Pay now" : "View invoice"}
            </PillButton>
          </div>
        </div>
      ) : (
        <div className="px-1 md:px-8">
          <p className="text-[13px] uppercase tracking-[0.04em] text-[var(--slate)]">Amount due</p>
          <p className="text-[28px] font-semibold text-[var(--ink)]">{formatMoney(0)}</p>
          <p className="text-[13px] text-[var(--slate)]">You’re all paid up.</p>
        </div>
      )}

      <div className="mt-8 grid gap-3 sm:grid-cols-3">
        <Stat label="Total paid" value={formatMoney(totalPaid)} sub="Across all projects" />
        <Stat label="Outstanding" value={formatMoney(outstanding)} sub={`${open.length} open invoice${open.length === 1 ? "" : "s"}`} />
        <Stat
          label="Next payment"
          value={next?.due_date ? formatDate(next.due_date, { month: "short", day: "numeric" }).toUpperCase() : "—"}
          sub={nextProject?.name ?? (next ? next.description : "Nothing scheduled")}
        />
      </div>

      <div className="mt-14 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-[2.2rem] font-semibold leading-tight text-[var(--ink)] md:text-[2.6rem]">Invoices</h2>
          <p className="text-[18px] text-[var(--ink)]">Your complete billing history.</p>
        </div>
        <FilterTabs<Filter>
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: "All" },
            { value: "open", label: "Open" },
            { value: "paid", label: "Paid" },
          ]}
        />
      </div>
      <div className="mt-8">
        <InvoiceTable invoices={shown} />
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

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <OutlineCard className="px-4 py-4">
      <p className="text-[13px] uppercase tracking-[0.04em] text-[var(--slate)]">{label}</p>
      <p className="mt-1 text-[26px] text-[var(--ink)]">{value}</p>
      <p className="truncate text-[13px] text-[var(--slate)]">{sub}</p>
    </OutlineCard>
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
