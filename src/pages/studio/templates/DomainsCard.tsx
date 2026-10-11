import { useEffect, useState } from "react";
import { domainsEnabled } from "@/pages/account/portal/api";
import { formatDate } from "@/pages/account/portal/format";
import { ErrorText, Input, PillButton, StatusPill } from "@/pages/account/portal/ui";
import * as studio from "../studioApi";

// Studio → Templates → Custom domains: switch it on, set the pricing
// (Vercel's US$ price × exchange rate × markup, rounded up to ₱__99, never below
// the minimum), Huna's registrant details, and every domain sold so far.

const CONTACT_FIELDS: { key: keyof studio.DomainContact; label: string; placeholder?: string; required?: boolean }[] = [
  { key: "firstName", label: "First name", required: true },
  { key: "lastName", label: "Last name", required: true },
  { key: "companyName", label: "Business name", placeholder: "Huna Creatives" },
  { key: "email", label: "Email", placeholder: "hello@thersvpstudio.com", required: true },
  { key: "phone", label: "Phone", placeholder: "+63.9171234567", required: true },
  { key: "address1", label: "Address", required: true },
  { key: "address2", label: "Address line 2" },
  { key: "city", label: "City", required: true },
  { key: "state", label: "Province", required: true },
  { key: "zip", label: "ZIP", required: true },
  { key: "country", label: "Country code", placeholder: "PH", required: true },
];

const example = (usd: number, s: Pick<studio.DomainSettingsRow, "fx_rate" | "multiplier" | "min_price">) =>
  Math.max(s.min_price, Math.ceil((usd * s.fx_rate * s.multiplier + 1) / 100) * 100 - 1);

export default function DomainsCard() {
  const [s, setS] = useState<studio.DomainSettingsRow | null | undefined>(undefined);
  const [live, setLive] = useState<boolean | null>(null);
  const [domains, setDomains] = useState<studio.DomainRow[]>([]);
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState<string | null>(null);

  const reload = () => {
    studio.loadDomainSettings().then(setS);
    studio.loadDomains().then(setDomains);
  };
  useEffect(() => {
    reload();
    domainsEnabled().then(setLive);
  }, []);
  if (s === undefined) return null;
  if (s === null) return null; // custom-domains.sql not run yet

  const c = s.contact ?? {};
  const missing = CONTACT_FIELDS.filter((f) => f.required && !String(c[f.key] ?? "").trim()).map((f) => f.label);
  const set = (patch: Partial<studio.DomainSettingsRow>) => (setS({ ...s, ...patch }), setState("idle"));
  const setC = (k: keyof studio.DomainContact, v: string) => set({ contact: { ...c, [k]: v } });
  const save = async () => {
    setError(null);
    if (s.enabled && missing.length) return setError(`Fill in ${missing.join(", ")} before switching it on.`);
    if (c.phone && !/^\+[1-9]\d{0,2}\.?\d{6,14}$/.test(String(c.phone).replace(/\s/g, ""))) return setError("Phone must look like +63.9171234567.");
    setState("saving");
    try {
      await studio.saveDomainSettings({ ...s, contact: { ...c, phone: String(c.phone ?? "").replace(/\s/g, ""), country: String(c.country ?? "").toUpperCase() } });
      setState("saved");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t save.");
      setState("idle");
    }
  };
  const retry = async (id: string) => {
    setRetrying(id);
    try {
      await studio.retryDomain(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Retry failed.");
    }
    setRetrying(null);
    reload();
  };

  return (
    <div className="mb-5 rounded-[22px] border border-[var(--line)] bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="w-full sm:w-auto sm:min-w-[220px] sm:flex-1">
          <p className="text-[15px] font-semibold text-[var(--ink)]">Custom domains</p>
          <p className="max-w-[70ch] text-[13px] text-[var(--slate)]">
            Customers search and buy their own web address when they publish, or from their project’s Website tab. It’s bought through Vercel, registered to Huna for a year, and connected automatically. They see one all-in price.
          </p>
          <p className="mt-1 text-[13px]">
            {live ? (
              <span className="font-medium text-[#3d5a12]">On — customers can buy domains.</span>
            ) : s.enabled && !missing.length ? (
              <span className="font-medium text-[#8a5a00]">Saved as on, but not live yet: add VERCEL_API_TOKEN in Vercel → Settings → Environment Variables, then redeploy.</span>
            ) : (
              <span className="text-[var(--slate)]">Off.</span>
            )}
          </p>
        </div>
        <label className="flex min-h-[44px] cursor-pointer items-center gap-2.5 text-[15px] text-[var(--ink)] md:text-[14px]">
          <input type="checkbox" checked={s.enabled} onChange={(e) => set({ enabled: e.target.checked })} className="h-5 w-5" /> Offer custom domains
        </label>
      </div>

      <div className="mt-4 grid grid-cols-3 items-end gap-3 sm:flex sm:flex-wrap sm:gap-4">
        <label className="min-w-0 text-[14px] text-[var(--ink)] md:text-[13px]">
          ₱ per US$
          <Input type="number" min={1} step="0.01" value={s.fx_rate} onChange={(e) => set({ fx_rate: Number(e.target.value) })} className="mt-1 sm:w-[120px]" />
        </label>
        <label className="min-w-0 text-[14px] text-[var(--ink)] md:text-[13px]">
          Markup (×)
          <Input type="number" min={1} step="0.1" value={s.multiplier} onChange={(e) => set({ multiplier: Number(e.target.value) })} className="mt-1 sm:w-[110px]" />
        </label>
        <label className="min-w-0 text-[14px] text-[var(--ink)] md:text-[13px]">
          Minimum (₱)
          <Input type="number" min={0} step="1" value={s.min_price} onChange={(e) => set({ min_price: Number(e.target.value) })} className="mt-1 sm:w-[130px]" />
        </label>
        <p className="col-span-3 text-[13px] text-[var(--slate)]">
          e.g. a $11.25 .com → ₱{example(11.25, s).toLocaleString("en-PH")} · a $29.99 .co → ₱{example(29.99, s).toLocaleString("en-PH")}
        </p>
      </div>

      <p className="mt-5 text-[13px] font-semibold text-[var(--ink)]">Registrant (who every domain is registered to)</p>
      <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {CONTACT_FIELDS.map((f) => (
          <label key={f.key} className="text-[14px] text-[var(--ink)] md:text-[13px]">
            {f.label}
            {f.required ? "" : " (optional)"}
            <Input value={String(c[f.key] ?? "")} placeholder={f.placeholder} onChange={(e) => setC(f.key, e.target.value)} className="mt-1 w-full" />
          </label>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-3">
        <PillButton tone="dark" onClick={save} disabled={state === "saving"}>
          {state === "saving" ? "Saving…" : state === "saved" ? "Saved" : "Save"}
        </PillButton>
      </div>
      <ErrorText>{error}</ErrorText>

      {domains.length ? (
        <ul className="mt-6 divide-y divide-[var(--line)] border-t border-[var(--line)] md:hidden">
          {domains.map((d) => (
            <li key={d.id} className="py-3 text-[14px]">
              <div className="flex items-start justify-between gap-3">
                <span className="min-w-0 break-all font-medium text-[var(--ink)]">
                  {d.status === "active" ? (
                    <a href={`https://${d.domain}`} target="_blank" rel="noreferrer" className="underline-offset-2 hover:underline">
                      {d.domain}
                    </a>
                  ) : (
                    d.domain
                  )}
                </span>
                <StatusPill tone={d.status === "active" ? "lime" : d.status === "failed" ? "coral" : "grey"}>{d.status}</StatusPill>
              </div>
              <p className="mt-1 text-[13px] text-[var(--slate)]">
                {d.events?.name ?? "—"} · ₱{Number(d.price_php).toLocaleString("en-PH")} · expires {formatDate(d.expires_at) || "—"}
              </p>
              {d.last_error ? <p className="mt-1 break-words text-[13px] text-[#c2412d]">{d.last_error}</p> : null}
              {["failed", "paid", "buying", "connecting"].includes(d.status) ? (
                <PillButton className="mt-2" onClick={() => retry(d.id)} disabled={retrying === d.id}>
                  {retrying === d.id ? "Retrying…" : "Retry"}
                </PillButton>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
      {domains.length ? (
        <div className="mt-6 hidden overflow-x-auto md:block">
          <table className="w-full min-w-[640px] text-left text-[13px]">
            <thead className="text-[var(--slate)]">
              <tr>
                <th className="py-2 font-medium">Domain</th>
                <th className="py-2 font-medium">Website</th>
                <th className="py-2 font-medium">Paid</th>
                <th className="py-2 font-medium">Status</th>
                <th className="py-2 font-medium">Expires</th>
                <th />
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--line)]">
              {domains.map((d) => (
                <tr key={d.id}>
                  <td className="py-2.5 font-medium text-[var(--ink)]">
                    {d.status === "active" ? (
                      <a href={`https://${d.domain}`} target="_blank" rel="noreferrer" className="hover:underline">
                        {d.domain}
                      </a>
                    ) : (
                      d.domain
                    )}
                  </td>
                  <td className="py-2.5 text-[var(--slate)]">{d.events?.name ?? "—"}</td>
                  <td className="py-2.5 text-[var(--slate)]">₱{Number(d.price_php).toLocaleString("en-PH")}</td>
                  <td className="py-2.5">
                    <StatusPill tone={d.status === "active" ? "lime" : d.status === "failed" ? "coral" : "grey"}>{d.status}</StatusPill>
                    {d.last_error ? <span className="mt-1 block max-w-[280px] text-[12px] text-[#c2412d]">{d.last_error}</span> : null}
                  </td>
                  <td className="py-2.5 text-[var(--slate)]">{formatDate(d.expires_at) || "—"}</td>
                  <td className="py-2.5 text-right">
                    {["failed", "paid", "buying", "connecting"].includes(d.status) ? (
                      <PillButton onClick={() => retry(d.id)} disabled={retrying === d.id}>
                        {retrying === d.id ? "Retrying…" : "Retry"}
                      </PillButton>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
