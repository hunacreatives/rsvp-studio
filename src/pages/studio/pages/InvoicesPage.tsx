import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { usePortal } from "@/pages/account/portal/PortalContext";
import { InvoicePill, isOverdue } from "@/pages/account/portal/components/blocks";
import { formatDate, formatMoney } from "@/pages/account/portal/format";
import { FilterTabs, PillButton } from "@/pages/account/portal/ui";
import InvoiceActions, { invoiceSummary } from "../InvoiceActions";
import { StudioHeader, useStudio } from "../StudioLayout";
import { downloadCsv } from "@/lib/csv";

type Filter = "all" | "open" | "overdue" | "paid" | "void";

export default function InvoicesPage() {
  const { invoices, projects } = usePortal();
  const { owners, members } = useStudio();
  // ?q= narrows to one client / project / invoice (Clients → "Invoices" links here).
  const [params, setParams] = useSearchParams();
  const query = params.get("q") ?? "";
  const setQuery = (q: string) => {
    const next = new URLSearchParams(params);
    if (q) next.set("q", q);
    else next.delete("q");
    setParams(next, { replace: true });
  };
  const [filter, setFilter] = useState<Filter>(() => (params.get("q") ? "all" : "open"));
  const project = (id: string) => projects.find((p) => p.id === id);
  const matches = (i: (typeof invoices)[number]) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    const people = [owners[i.event_id], ...(members[i.event_id] ?? [])].filter(Boolean);
    return [i.number, i.description, project(i.event_id)?.name, ...people.flatMap((p) => [p!.email, p!.full_name])].some((v) => v?.toLowerCase().includes(q));
  };

  const shown = useMemo(
    () =>
      invoices
        .filter(matches)
        .filter((i) => (filter === "all" ? true : filter === "overdue" ? isOverdue(i) : i.status === filter))
        .sort((a, b) => (filter === "paid" ? (b.paid_at ?? "").localeCompare(a.paid_at ?? "") : (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999"))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [invoices, filter, query, owners, members, projects],
  );
  const total = shown.reduce((s, i) => s + i.amount, 0);
  // Searching for one client: what they owe and have paid, across all their invoices.
  const theirs = query ? invoices.filter(matches) : [];
  const owed = theirs.filter((i) => i.status === "open").reduce((s, i) => s + i.amount, 0);
  const paidSum = theirs.filter((i) => i.status === "paid").reduce((s, i) => s + i.amount, 0);

  return (
    <>
      <StudioHeader
        title="Invoices"
        sub="Every invoice across all projects. Issue new ones from a project."
        action={
          shown.length ? (
            <PillButton
              onClick={() =>
                downloadCsv(
                  `invoices-${new Date().toISOString().slice(0, 10)}.csv`,
                  ["Number", "Client", "Email", "Project", "Description", "Amount (PHP)", "Status", "Issued", "Due", "Paid on", "Paid by", "Reference"],
                  shown.map((i) => {
                    const who = owners[i.event_id];
                    return [i.number, who?.full_name ?? "", who?.email ?? "", project(i.event_id)?.name ?? "", i.description, i.amount, i.status, i.issued_at?.slice(0, 10), i.due_date ?? "", i.paid_at?.slice(0, 10) ?? "", i.paid_method ?? "", i.paid_reference ?? ""];
                  }),
                )
              }
            >
              <i className="ri-download-2-line" /> Export CSV
            </PillButton>
          ) : null
        }
      />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search a client, email, project or invoice number"
          className="w-full max-w-md rounded-full border border-[var(--line)] bg-white px-4 py-2.5 text-[16px] outline-none focus:border-[var(--ink)] md:text-[14px]"
        />
        {query ? (
          <p className="text-[14px] text-[var(--slate)]">
            {theirs.length} invoice{theirs.length === 1 ? "" : "s"} · <span className={owed ? "font-semibold text-[#c2412d]" : ""}>{formatMoney(owed)} unpaid</span> · {formatMoney(paidSum)} paid
          </p>
        ) : null}
      </div>
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

      {/* Phones: one card per invoice. */}
      <ul className="space-y-3 md:hidden">
        {shown.map((i) => {
          const p = project(i.event_id);
          return (
            <li key={i.id} className="rounded-[20px] border border-[var(--line)] bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <span className="min-w-0">
                  <span className="block text-[15px] font-semibold text-[var(--ink)]">{formatMoney(i.amount)}</span>
                  <span className="block text-[13px] text-[var(--slate)]">{i.number}</span>
                </span>
                <InvoicePill invoice={i} />
              </div>
              <p className="mt-2 break-words text-[14px] text-[var(--ink)]">{i.description}</p>
              <p className="text-[14px]">
                <Link to={`/studio/projects?project=${i.event_id}`} className="inline-flex min-h-[40px] items-center font-medium text-[var(--ink)] underline underline-offset-2">{p?.name ?? "—"}</Link>
                <span className="block break-all text-[13px] text-[var(--slate)]">{owners[i.event_id]?.email ?? "No client linked"}</span>
              </p>
              <p className={`mt-1 text-[13px] ${isOverdue(i) ? "font-medium text-[#c2412d]" : "text-[var(--slate)]"}`}>{invoiceSummary(i)}</p>
              <div className="mt-3 flex flex-wrap gap-2 empty:hidden">
                <InvoiceActions inv={i} compact />
              </div>
            </li>
          );
        })}
        {!shown.length ? <li className="rounded-[20px] border border-[var(--line)] bg-white px-5 py-10 text-center text-[14px] text-[var(--slate)]">No invoices in this list.</li> : null}
      </ul>

      <div className="hidden overflow-x-auto rounded-[22px] border border-[var(--line)] bg-white md:block">
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
                    <span className="inline-flex flex-wrap justify-end gap-2 whitespace-nowrap">
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
