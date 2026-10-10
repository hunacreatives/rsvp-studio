import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { usePortal } from "@/pages/account/portal/PortalContext";
import { InvoicePill, isOverdue } from "@/pages/account/portal/components/blocks";
import { formatDate, formatMoney } from "@/pages/account/portal/format";
import { FilterTabs, PillButton } from "@/pages/account/portal/ui";
import InvoiceActions, { invoiceSummary } from "../InvoiceActions";
import { StudioHeader, useStudio } from "../StudioLayout";

type Filter = "all" | "open" | "overdue" | "paid" | "void";

export default function InvoicesPage() {
  const { invoices, projects } = usePortal();
  const { owners } = useStudio();
  const [filter, setFilter] = useState<Filter>("open");
  const project = (id: string) => projects.find((p) => p.id === id);

  const shown = useMemo(
    () =>
      invoices
        .filter((i) => (filter === "all" ? true : filter === "overdue" ? isOverdue(i) : i.status === filter))
        .sort((a, b) => (filter === "paid" ? (b.paid_at ?? "").localeCompare(a.paid_at ?? "") : (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999"))),
    [invoices, filter],
  );
  const total = shown.reduce((s, i) => s + i.amount, 0);

  return (
    <>
      <StudioHeader title="Invoices" sub="Every invoice across all projects. Issue new ones from a project." />
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <FilterTabs<Filter>
          value={filter}
          onChange={setFilter}
          options={[
            { value: "open", label: "Unpaid" },
            { value: "overdue", label: "Overdue" },
            { value: "paid", label: "Paid" },
            { value: "void", label: "Cancelled" },
            { value: "all", label: "All" },
          ]}
        />
        <p className="text-[14px] text-[var(--slate)]">
          {shown.length} invoice{shown.length === 1 ? "" : "s"} · <span className="font-semibold text-[var(--ink)]">{formatMoney(total)}</span>
        </p>
      </div>

      <div className="overflow-x-auto rounded-[22px] border border-[var(--line)] bg-white">
        <table className="w-full min-w-[760px] text-left text-[14px]">
          <thead>
            <tr className="border-b border-[var(--line)] text-[12px] uppercase tracking-[0.06em] text-[var(--slate)]">
              <th className="px-5 py-3 font-medium">Invoice</th>
              <th className="px-5 py-3 font-medium">Project · client</th>
              <th className="px-5 py-3 font-medium">Amount</th>
              <th className="px-5 py-3 font-medium">Due / paid</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {shown.map((i) => {
              const p = project(i.event_id);
              return (
                <tr key={i.id} className="border-b border-[var(--line)] last:border-0">
                  <td className="px-5 py-3">
                    <span className="block text-[var(--ink)]">{i.number}</span>
                    <span className="block max-w-[220px] truncate text-[12px] text-[var(--slate)]">{i.description}</span>
                  </td>
                  <td className="px-5 py-3">
                    <Link to={`/studio/projects?project=${i.event_id}`} className="block text-[var(--ink)] hover:underline">{p?.name ?? "—"}</Link>
                    <span className="block text-[12px] text-[var(--slate)]">{owners[i.event_id]?.email ?? "No client linked"}</span>
                  </td>
                  <td className="px-5 py-3 text-[var(--ink)]">{formatMoney(i.amount)}</td>
                  <td className={`px-5 py-3 ${isOverdue(i) ? "text-[#c2412d]" : "text-[var(--ink)]"}`}>
                    {invoiceSummary(i)}
                  </td>
                  <td className="px-5 py-3"><InvoicePill invoice={i} /></td>
                  <td className="px-5 py-3 text-right">
                    <span className="inline-flex flex-wrap justify-end gap-2">
                      <InvoiceActions inv={i} compact />
                    </span>
                  </td>
                </tr>
              );
            })}
            {!shown.length ? (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-[var(--slate)]">No invoices in this list.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </>
  );
}
