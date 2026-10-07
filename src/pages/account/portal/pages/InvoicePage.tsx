import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { usePortal } from "../PortalContext";
import { InvoicePill } from "../components/blocks";
import { formatLongDate, formatMoney, servicesLabel } from "../format";
import { PillButton } from "../ui";

/** One invoice, laid out to double as a printable receipt (Download = print to PDF). */
export default function InvoicePage() {
  const { invoiceId } = useParams();
  const { invoices, projects, profile } = usePortal();
  const navigate = useNavigate();
  const inv = invoices.find((i) => i.id === invoiceId);
  if (!inv) return <Navigate to="/account/billing" replace />;
  const project = projects.find((p) => p.id === inv.event_id);
  const paid = inv.status === "paid";

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link to="/account/billing" className="inline-flex items-center gap-1 text-[13px] font-medium uppercase tracking-[0.1em] text-[var(--slate)] hover:text-[var(--ink)]">
          <i className="ri-arrow-left-line" /> Billing
        </Link>
        <div className="flex flex-wrap gap-2">
          <PillButton onClick={() => window.print()}>
            <i className="ri-download-2-line" /> {paid ? "Download receipt" : "Download invoice"}
          </PillButton>
          {inv.status === "open" && inv.payment_url ? (
            <a href={inv.payment_url} target="_blank" rel="noreferrer">
              <PillButton tone="primary">
                Pay {formatMoney(inv.amount)} <i className="ri-external-link-line" />
              </PillButton>
            </a>
          ) : null}
        </div>
      </div>

      <article className="invoice-print rounded-[24px] border border-[rgba(0,7,39,0.16)] bg-white p-6 md:p-10">
        <header className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <img src="/brand/logotype-dark.png" alt="The RSVP Studio" className="h-9 w-auto" onError={(e) => (e.currentTarget.style.display = "none")} />
            <p className="mt-3 text-[13px] leading-relaxed text-[var(--slate)]">
              The RSVP Studio · a brand of Huna Creatives
              <br />
              hello@thersvpstudio.com · Philippines
            </p>
          </div>
          <div className="text-right">
            <p className="font-display text-[2rem] font-semibold leading-none text-[var(--ink)]">{paid ? "Receipt" : "Invoice"}</p>
            <p className="mt-2 text-[14px] text-[var(--ink)]">#{inv.number}</p>
            <div className="mt-2">
              <InvoicePill invoice={inv} />
            </div>
          </div>
        </header>

        <div className="mt-10 grid gap-6 text-[14px] sm:grid-cols-3">
          <div>
            <p className="text-[12px] uppercase tracking-[0.06em] text-[var(--slate)]">Billed to</p>
            <p className="mt-1 text-[var(--ink)]">{profile.billing_name || profile.full_name}</p>
            <p className="text-[var(--slate)]">{profile.billing_email || profile.email}</p>
            {profile.billing_address ? <p className="whitespace-pre-line text-[var(--slate)]">{profile.billing_address}</p> : null}
          </div>
          <div>
            <p className="text-[12px] uppercase tracking-[0.06em] text-[var(--slate)]">Issued</p>
            <p className="mt-1 text-[var(--ink)]">{formatLongDate(inv.issued_at)}</p>
          </div>
          <div>
            <p className="text-[12px] uppercase tracking-[0.06em] text-[var(--slate)]">{paid ? "Paid" : "Due"}</p>
            <p className="mt-1 text-[var(--ink)]">{formatLongDate(paid ? inv.paid_at : inv.due_date) || "On receipt"}</p>
          </div>
        </div>

        <table className="mt-10 w-full text-left text-[14px]">
          <thead>
            <tr className="border-b border-[rgba(0,7,39,0.16)] text-[12px] uppercase tracking-[0.06em] text-[var(--slate)]">
              <th className="pb-3 font-medium">Description</th>
              <th className="pb-3 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-[rgba(0,7,39,0.08)]">
              <td className="py-4 pr-4 text-[var(--ink)]">
                {inv.description}
                {project ? <span className="block text-[13px] text-[var(--slate)]">{project.name} · {servicesLabel(project.services, project.event_type)}</span> : null}
              </td>
              <td className="py-4 text-right text-[var(--ink)]">{formatMoney(inv.amount)}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td className="pt-5 text-right text-[13px] uppercase tracking-[0.06em] text-[var(--slate)]">{paid ? "Total paid" : "Total due"}</td>
              <td className="pt-5 text-right text-[22px] font-semibold text-[var(--ink)]">{formatMoney(inv.amount)}</td>
            </tr>
          </tfoot>
        </table>

        {inv.notes ? <p className="mt-8 whitespace-pre-line text-[14px] text-[var(--slate)]">{inv.notes}</p> : null}

        {inv.status === "open" ? (
          <div className="mt-10 rounded-2xl bg-[var(--paper)] p-5 text-[14px] text-[var(--ink)]">
            <p className="font-semibold">How to pay</p>
            <p className="mt-1 text-[var(--slate)]">
              {inv.payment_url
                ? "Use the Pay button above to pay securely online."
                : "We accept bank transfer and PayPal (with a service fee). Message us for our account details and we’ll confirm your payment here once received."}
            </p>
            <button
              onClick={() => navigate(`/account/messages?project=${inv.event_id}`)}
              className="mt-3 text-[14px] font-medium text-[var(--acc-blue)] hover:underline print:hidden"
            >
              Message us about this invoice →
            </button>
          </div>
        ) : null}
      </article>
    </>
  );
}
