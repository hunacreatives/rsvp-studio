import { useEffect, useState } from "react";
import * as api from "../api";
import type { Project } from "../types";
import { DOMAIN_PERKS, DomainPicker, peso } from "@/pages/wedding-sites/builder/DomainPicker";
import { formatDate } from "../format";
import { OutlineCard, PillButton } from "../ui";

// A project's own web address, on its Website tab (api/_lib/domains.ts):
// buy one, watch it being set up, see when it expires, renew it.

export default function DomainCard({ project, slug }: { project: Project; slug: string }) {
  const [on, setOn] = useState<boolean | null>(null);
  const [status, setStatus] = useState<api.DomainStatus | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [renewed] = useState(() => new URLSearchParams(window.location.search).has("renewed"));

  useEffect(() => {
    api.domainsEnabled().then(setOn);
    api.domainStatus(project.id).then(setStatus);
  }, [project.id]);
  // Still being set up: check again every few seconds.
  useEffect(() => {
    if (!status || !["paid", "buying", "connecting"].includes(status.status)) return;
    const t = setTimeout(() => api.domainStatus(project.id).then(setStatus), 4000);
    return () => clearTimeout(t);
  }, [status, project.id]);

  if (!status || on === null) return null;
  if (status.status === "none" && !on) return null;

  const pay = async (target: { domain: string } | { renewDomain: true }) => {
    setBusy("Opening the payment page…");
    try {
      const r = await api.startCheckout({ eventId: project.id, ...target });
      if (r.checkoutUrl) window.location.href = r.checkoutUrl;
      else setBusy(null);
    } catch (e) {
      setBusy(e instanceof Error ? e.message : "Couldn’t start the payment — please try again.");
    }
  };
  const expiringSoon = status.expiresAt ? Date.parse(status.expiresAt) - Date.now() < 30 * 86_400_000 : false;

  return (
    <OutlineCard className="mt-6 p-6 md:p-8">
      <p className="eyebrow">Your own web address</p>
      {status.status === "none" || status.status === "failed" ? (
        <>
          {status.status === "failed" ? (
            <p className="mt-2 text-[14px] text-[#8a5a00]">We’re sorting out {status.domain} — our team will get in touch about another address or a refund.</p>
          ) : null}
          <ul className="mt-3 list-disc space-y-1 pl-5 text-[14px] text-[var(--slate)]">
            {DOMAIN_PERKS.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
          <div className="mt-4 max-w-[560px]">
            <DomainPicker eventId={project.id} suggestion={slug.replace(/-/g, "")} onPick={(domain) => pay({ domain })} busy={!!busy} />
          </div>
        </>
      ) : status.status === "active" ? (
        <>
          <p className="mt-2 font-display text-2xl font-semibold text-[var(--ink)]">
            <a href={`https://${status.domain}`} target="_blank" rel="noreferrer" className="hover:underline">
              {status.domain}
            </a>
          </p>
          <p className="mt-1 text-[14px] text-[var(--slate)]">
            Active until {formatDate(status.expiresAt)} — your website stays online until then.
            {renewed ? " Your renewal is being processed; the new date shows here shortly." : ""}
          </p>
          {expiringSoon && status.renewalPhp ? (
            <PillButton tone="primary" className="mt-4" onClick={() => pay({ renewDomain: true })} disabled={!!busy}>
              Renew for another year · {peso(status.renewalPhp)}
            </PillButton>
          ) : null}
        </>
      ) : status.status === "expired" ? (
        <p className="mt-2 text-[14px] text-[var(--slate)]">
          {status.domain} expired on {formatDate(status.expiresAt)}.
        </p>
      ) : (
        <p className="mt-2 text-[14px] text-[var(--ink)]">Setting up {status.domain}… this usually takes a few minutes. We’ll email you when it’s live.</p>
      )}
      {busy ? <p className={`mt-3 text-[13px] ${busy.startsWith("Opening") ? "text-[var(--slate)]" : "text-[#c2412d]"}`}>{busy}</p> : null}
    </OutlineCard>
  );
}
