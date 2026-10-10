import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { usePortal } from "../PortalContext";
import * as api from "../api";
import { InvoicePill } from "../components/blocks";
import { formatLongDate, formatMoney, paidByLabel, servicesLabel } from "../format";
import { PillButton } from "../ui";

/**
 * One invoice, laid out to double as a printable receipt. Unpaid → "Pay now" opens
 * PayMongo (GCash, Maya, card, QR Ph); PayMongo sends them back here with ?paid=…,
 * and we wait for the confirmation before showing the receipt.
 */
export default function InvoicePage() {
  const { invoiceId } = useParams();
  const { invoices, projects, profile, refresh, demo } = usePortal();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const inv = invoices.find((i) => i.id === invoiceId);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [checking, setChecking] = useState<"idle" | "checking" | "slow">("idle");
  const returnedFrom = params.get("paid");
  const cancelled = params.get("cancelled") === "1";

  // Back from PayMongo: wait (up to ~40s) for the webhook to mark it paid.
  useEffect(() => {
    if (!returnedFrom || !inv || inv.status !== "open") return;
    let live = true;
    setChecking("checking");
    (async () => {
      for (let i = 0; i < 20 && live; i++) {
        const p = await api.paymentStatus(returnedFrom);
        if (p?.status === "paid") {
          await refresh();
          if (live) setChecking("idle");
          return;
        }
        await new Promise((r) => setTimeout(r, 2000));
      }
      if (live) setChecking("slow");
    })();
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [returnedFrom, inv?.id]);

  if (!inv) return <Navigate to="/account/billing" replace />;
  const project = projects.find((p) => p.id === inv.event_id);
  const paid = inv.status === "paid";

  const pay = async () => {
    setPayError(null);
    if (demo) return setPayError("Payments are turned off in demo mode.");
    setPaying(true);
    try {
      const r = await api.startCheckout({ invoiceId: inv.id });
      if (r.checkoutUrl) window.location.href = r.checkoutUrl;
      else setPaying(false);
    } catch (e) {
      setPayError(e instanceof Error ? e.message : "Couldn’t start the payment — please try again.");
      setPaying(false);
    }
  };
  const dismiss = () => setParams({}, { replace: true });

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link to="/account/billing" className="inline-flex items-center gap-1 text-[13px] font-medium uppercase tracking-[0.1em] text-[var(--slate)] hover:text-[var(--ink)]">
          <i className="ri-arrow-left-line" /> Billing
        </Link>
        <div className="flex flex-wrap gap-2">
          <PillButton onClick={() => window.print()}>
            <i className="ri-printer-line" /> Print or save as PDF
          </PillButton>
          {inv.status === "open" ? (
            <PillButton tone="primary" onClick={pay} disabled={paying || checking === "checking"}>
              {paying ? "Opening payment…" : `Pay ${formatMoney(inv.amount)} now`}
            </PillButton>
          ) : null}
        </div>
      </div>

      {payError ? <p className="mb-4 rounded-2xl bg-[#fde4df] px-5 py-3 text-[14px] text-[#9a2f1f] print:hidden">{payError}</p> : null}
      {returnedFrom && paid ? (
        <Notice tone="good" onClose={dismiss}>
          Payment received — thank you. Your receipt is below{inv.paid_method ? ` (paid by ${paidByLabel(inv.paid_method)})` : ""}.
        </Notice>
      ) : checking === "checking" ? (
        <Notice tone="info">Checking your payment… this takes a few seconds.</Notice>
      ) : checking === "slow" ? (
        <Notice tone="info" onClose={dismiss}>
          Your payment is still being confirmed. This invoice will show <strong>Paid</strong> as soon as it is — usually within a few minutes. You don’t need to pay again.
        </Notice>
      ) : cancelled && !paid ? (
        <Notice tone="info" onClose={dismiss}>
          Payment cancelled — nothing was charged. You can try again anytime.
        </Notice>
      ) : null}

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
            <p className="mt-2 text-[14px] text-[var(--ink)]">{inv.number}</p>
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
            <p className="mt-1 text-[var(--ink)]">{formatLongDate(paid ? inv.paid_at : inv.due_date) || "Due now"}</p>
            {paid && inv.paid_method ? <p className="text-[var(--slate)]">by {paidByLabel(inv.paid_method)}</p> : null}
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
              Pay securely online with GCash, Maya, card or QR Ph (scan with any banking app). Your receipt appears here as soon as the payment goes through.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-3 print:hidden">
              <PillButton tone="primary" onClick={pay} disabled={paying || checking === "checking"}>
                {paying ? "Opening payment…" : `Pay ${formatMoney(inv.amount)} now`}
              </PillButton>
              <button
              onClick={() => navigate(`/account/messages?project=${inv.event_id}`)}
              className="text-[14px] font-medium text-[var(--acc-blue)] hover:underline print:hidden"
            >
              Message us about this invoice →
            </button>
            </div>
          </div>
        ) : null}
      </article>
    </>
  );
}

function Notice({ tone, onClose, children }: { tone: "good" | "info"; onClose?: () => void; children: React.ReactNode }) {
  return (
    <div className={`mb-4 flex items-start gap-3 rounded-2xl px-5 py-3 text-[14px] print:hidden ${tone === "good" ? "bg-[#e6f4e6] text-[#2f6b2f]" : "bg-[#e8eeff] text-[#1d4fd7]"}`}>
      <span className="flex-1">{children}</span>
      {onClose ? (
        <button onClick={onClose} aria-label="Dismiss" className="opacity-60 hover:opacity-100">
          <i className="ri-close-line" />
        </button>
      ) : null}
    </div>
  );
}
