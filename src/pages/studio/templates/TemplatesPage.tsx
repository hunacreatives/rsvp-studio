import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { usePortal } from "@/pages/account/portal/PortalContext";
import { formatDate } from "@/pages/account/portal/format";
import { ErrorText, Input, PillButton, StatusPill } from "@/pages/account/portal/ui";
import { StudioHeader } from "../StudioLayout";
import { listTemplates, type TemplateRow } from "../templatesApi";
import * as studio from "../studioApi";

const STATUS_TONE = { listed: "lime", draft: "lavender", hidden: "grey", retired: "grey" } as const;
const STATUS_LABEL = { listed: "In gallery", draft: "Draft", hidden: "Hidden", retired: "Retired" } as const;

export default function TemplatesPage() {
  const { demo } = usePortal();
  const navigate = useNavigate();
  const [rows, setRows] = useState<TemplateRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (demo) return setRows([]);
    listTemplates()
      .then(setRows)
      .catch((e: Error) => setError(/relation .*templates/.test(e.message) ? "The templates tables aren't set up yet — run supabase/templates-schema.sql in Supabase." : e.message));
  }, [demo]);

  return (
    <>
      <StudioHeader
        title="Templates"
        sub="Everything in the Build Your Website gallery. Upload a design to add one — no developer needed."
        action={
          <div className="flex flex-wrap gap-2">
            <PillButton className="!px-5 !py-2.5" onClick={() => navigate("/studio/templates/new")} disabled={demo || !!error}>
              <i className="ri-file-code-line" /> Upload template file
            </PillButton>
            <PillButton tone="dark" className="!px-5 !py-2.5" onClick={() => navigate("/studio/templates/import")} disabled={demo || !!error}>
              <i className="ri-sparkling-2-line" /> Import design with AI
            </PillButton>
          </div>
        }
      />
      {error ? <p className="mb-4 rounded-2xl bg-[#fff3f0] px-5 py-4 text-[14px] text-[#c2412d]">{error}</p> : null}
      {!demo ? <SitePricesCard /> : null}
      {demo ? <p className="mb-4 text-[14px] text-[var(--slate)]">Templates aren’t part of demo data.</p> : null}

      <div className="overflow-x-auto rounded-[22px] border border-[var(--line)] bg-white">
        <table className="w-full min-w-[720px] text-left text-[14px]">
          <thead>
            <tr className="border-b border-[var(--line)] text-[12px] uppercase tracking-[0.06em] text-[var(--slate)]">
              <th className="px-5 py-3 font-medium">Template</th>
              <th className="px-5 py-3 font-medium">Type</th>
              <th className="px-5 py-3 font-medium">Tier</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">Updated</th>
            </tr>
          </thead>
          <tbody>
            {(rows ?? []).map((t) => (
              <tr key={t.id} className="border-b border-[var(--line)] last:border-0 hover:bg-[var(--paper)]">
                <td className="px-5 py-3">
                  {t.kind === "spec" ? (
                    <Link to={`/studio/templates/${t.id}`} className="font-semibold text-[var(--ink)] hover:underline">
                      {t.label}
                    </Link>
                  ) : (
                    <span className="font-semibold text-[var(--ink)]">{t.label}</span>
                  )}
                  <span className="block text-[12px] text-[var(--slate)]">{t.id}</span>
                </td>
                <td className="px-5 py-3 text-[var(--slate)]">{t.kind === "spec" ? "Uploaded" : "Built in (code)"}</td>
                <td className="px-5 py-3 capitalize text-[var(--ink)]">{t.tier}</td>
                <td className="px-5 py-3">
                  <StatusPill tone={STATUS_TONE[t.status]}>{STATUS_LABEL[t.status]}</StatusPill>
                </td>
                <td className="px-5 py-3 text-[var(--slate)]">{formatDate(t.updated_at)}</td>
              </tr>
            ))}
            {rows && !rows.length && !demo ? (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-[var(--slate)]">No templates yet.</td>
              </tr>
            ) : null}
            {!rows && !error ? (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-[var(--slate)]">Loading…</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </>
  );
}

/** What customers pay to publish a DIY website, by template tier. Studio projects never pay. */
function SitePricesCard() {
  const [prices, setPrices] = useState<{ free: string; premium: string } | null>(null);
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    studio.loadSitePrices().then((p) => setPrices(p ? { free: String(p.free), premium: String(p.premium) } : null));
  }, []);
  if (!prices) return null;
  const save = async () => {
    setError(null);
    setState("saving");
    try {
      await studio.saveSitePrices({ free: Math.max(0, Number(prices.free) || 0), premium: Math.max(0, Number(prices.premium) || 0) });
      setState("saved");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t save.");
      setState("idle");
    }
  };
  const unset = Number(prices.free) === 0 && Number(prices.premium) === 0;
  return (
    <div className="mb-5 rounded-[22px] border border-[var(--line)] bg-white p-5">
      <div className="flex flex-wrap items-end gap-4">
        <div className="min-w-[220px] flex-1">
          <p className="text-[15px] font-semibold text-[var(--ink)]">Price to publish a DIY website</p>
          <p className="text-[13px] text-[var(--slate)]">Customers pay once, by GCash, Maya, card or QR Ph, before their site goes live. ₱0 = free. Studio projects never pay.</p>
          {unset ? <p className="mt-1 text-[13px] font-medium text-[#8a5a00]">Both are ₱0 — anyone can publish for free until you set a price.</p> : null}
        </div>
        <label className="text-[13px] text-[var(--ink)]">
          Standard templates (₱)
          <Input type="number" min={0} step="1" value={prices.free} onChange={(e) => (setPrices({ ...prices, free: e.target.value }), setState("idle"))} className="mt-1 w-[150px]" />
        </label>
        <label className="text-[13px] text-[var(--ink)]">
          Premium templates (₱)
          <Input type="number" min={0} step="1" value={prices.premium} onChange={(e) => (setPrices({ ...prices, premium: e.target.value }), setState("idle"))} className="mt-1 w-[150px]" />
        </label>
        <PillButton tone="dark" onClick={save} disabled={state === "saving"}>
          {state === "saving" ? "Saving…" : state === "saved" ? "Saved" : "Save prices"}
        </PillButton>
      </div>
      <ErrorText>{error}</ErrorText>
    </div>
  );
}
