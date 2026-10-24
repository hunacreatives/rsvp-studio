import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { usePortal } from "@/pages/account/portal/PortalContext";
import { formatDate } from "@/pages/account/portal/format";
import { ErrorText, Input, PillButton, StatusPill } from "@/pages/account/portal/ui";
import { StudioHeader } from "../StudioLayout";
import { listTemplates, saveTemplateOrder, TEMPLATE_OCCASIONS, updateTemplate, type TemplateRow } from "../templatesApi";
import * as studio from "../studioApi";
import DomainsCard from "./DomainsCard";
import PromoCodesCard from "./PromoCodesCard";

const STATUS_TONE = { listed: "lime", draft: "lavender", hidden: "grey", retired: "grey" } as const;
const STATUS_LABEL = { listed: "In gallery", draft: "Draft", hidden: "Hidden", retired: "Retired" } as const;

export default function TemplatesPage() {
  const { demo } = usePortal();
  const navigate = useNavigate();
  const [rows, setRows] = useState<TemplateRow[] | null>(null);
  const [owner, setOwner] = useState(false);
  useEffect(() => {
    studio.isOwner().then(setOwner);
  }, []);
  const [error, setError] = useState<string | null>(null);
  // The gallery order: drag a row (desktop) or use its arrows. Saved as it changes.
  const [orderState, setOrderState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const reorder = async (next: TemplateRow[]) => {
    const before = rows;
    setRows(next);
    setOrderState("saving");
    try {
      setRows(await saveTemplateOrder(next));
      setOrderState("saved");
    } catch {
      setRows(before);
      setOrderState("error");
    }
  };
  const move = (id: string, by: -1 | 1) => {
    if (!rows) return;
    const i = rows.findIndex((r) => r.id === id);
    const j = i + by;
    if (i < 0 || j < 0 || j >= rows.length) return;
    const next = rows.slice();
    [next[i], next[j]] = [next[j], next[i]];
    void reorder(next);
  };
  const dropOn = (targetId: string) => {
    if (!rows || !dragId || dragId === targetId) return;
    const next = rows.filter((r) => r.id !== dragId);
    const at = next.findIndex((r) => r.id === targetId);
    const from = rows.findIndex((r) => r.id === dragId);
    const to = rows.findIndex((r) => r.id === targetId);
    next.splice(from < to ? at + 1 : at, 0, rows.find((r) => r.id === dragId)!);
    void reorder(next);
  };
  const arrows = (t: TemplateRow, i: number) => (
    <span className="inline-flex gap-1">
      <button type="button" onClick={() => move(t.id, -1)} disabled={i === 0 || orderState === "saving"} aria-label={`Move ${t.label} up`} className="grid h-9 w-9 place-items-center rounded-full border border-[var(--line)] text-[var(--ink)] hover:border-[var(--ink)] disabled:opacity-30 md:h-8 md:w-8">
        <i className="ri-arrow-up-s-line" />
      </button>
      <button type="button" onClick={() => move(t.id, 1)} disabled={!rows || i === rows.length - 1 || orderState === "saving"} aria-label={`Move ${t.label} down`} className="grid h-9 w-9 place-items-center rounded-full border border-[var(--line)] text-[var(--ink)] hover:border-[var(--ink)] disabled:opacity-30 md:h-8 md:w-8">
        <i className="ri-arrow-down-s-line" />
      </button>
    </span>
  );

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
      {/* Prices and promo codes are the owner's (supabase/money-owner-only.sql). */}
      {!demo && owner ? <SitePricesCard /> : null}
      {!demo && owner ? <PromoCodesCard /> : null}
      {!demo ? <DomainsCard /> : null}
      {demo ? <p className="mb-4 text-[14px] text-[var(--slate)]">Templates aren’t part of demo data.</p> : null}
      {!demo && rows?.length ? (
        <p className="mb-3 flex flex-wrap items-center gap-x-3 text-[13px] text-[var(--slate)]">
          <span>This is the order customers see on /build and in the design picker. Drag a row or use its arrows.</span>
          <span aria-live="polite" className={orderState === "error" ? "text-[#c2412d]" : orderState === "saved" ? "text-[#3d7a12]" : ""}>
            {orderState === "saving" ? "Saving…" : orderState === "saved" ? "Order saved." : orderState === "error" ? "Couldn’t save the order. Please try again." : ""}
          </span>
        </p>
      ) : null}

      {/* Phones: one card per template. */}
      <ul className="divide-y divide-[var(--line)] rounded-[22px] border border-[var(--line)] bg-white empty:hidden md:hidden">
        {(rows ?? []).map((t, i) => (
          <li key={t.id}>
            {t.kind === "spec" ? (
              <Link to={`/studio/templates/${t.id}`} className="flex items-center gap-3 px-4 pt-3.5">
                <TemplateCardBody t={t} />
                <i className="ri-arrow-right-s-line text-[20px] text-[var(--slate)]" />
              </Link>
            ) : (
              <div className="flex items-center gap-3 px-4 pt-3.5">
                <TemplateCardBody t={t} />
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2 px-4 pb-3.5 pt-2">
              {!demo ? arrows(t, i) : null}
              {!demo ? <TemplateTags t={t} onChange={(next) => setRows((cur) => cur?.map((r) => (r.id === t.id ? next : r)) ?? cur)} /> : null}
            </div>
          </li>
        ))}
        {rows && !rows.length && !demo ? <li className="px-5 py-10 text-center text-[14px] text-[var(--slate)]">No templates yet.</li> : null}
        {!rows && !error ? <li className="px-5 py-10 text-center text-[14px] text-[var(--slate)]">Loading…</li> : null}
      </ul>

      <div className="hidden overflow-x-auto rounded-[22px] border border-[var(--line)] bg-white md:block">
        <table className="w-full min-w-[720px] text-left text-[14px]">
          <thead>
            <tr className="border-b border-[var(--line)] text-[12px] uppercase tracking-[0.06em] text-[var(--slate)]">
              <th className="w-[1%] whitespace-nowrap px-4 py-3 font-medium">Order</th>
              <th className="px-5 py-3 font-medium">Template</th>
              <th className="px-5 py-3 font-medium">Type</th>
              <th className="px-5 py-3 font-medium">Tier</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium">Occasions</th>
              <th className="px-5 py-3 font-medium">Updated</th>
            </tr>
          </thead>
          <tbody>
            {(rows ?? []).map((t, i) => (
              <tr
                key={t.id}
                draggable={!demo && orderState !== "saving"}
                onDragStart={(e) => {
                  setDragId(t.id);
                  e.dataTransfer.effectAllowed = "move";
                }}
                onDragOver={(e) => {
                  if (!dragId) return;
                  e.preventDefault();
                  setOverId(t.id);
                }}
                onDragLeave={() => setOverId((o) => (o === t.id ? null : o))}
                onDrop={(e) => {
                  e.preventDefault();
                  dropOn(t.id);
                  setDragId(null);
                  setOverId(null);
                }}
                onDragEnd={() => {
                  setDragId(null);
                  setOverId(null);
                }}
                className={`border-b border-[var(--line)] last:border-0 hover:bg-[var(--paper)] ${dragId === t.id ? "opacity-40" : ""} ${overId === t.id && dragId !== t.id ? "shadow-[inset_0_2px_0_var(--ink)]" : ""}`}
              >
                <td className="whitespace-nowrap px-4 py-3">
                  <span className="inline-flex items-center gap-2">
                    <i className="ri-draggable cursor-grab text-[18px] text-[var(--slate)]" aria-hidden title="Drag to reorder" />
                    <span className="w-5 text-right text-[13px] tabular-nums text-[var(--slate)]">{i + 1}</span>
                    {!demo ? arrows(t, i) : null}
                  </span>
                </td>
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
                <td className="px-5 py-3">
                  {!demo ? <TemplateTags t={t} onChange={(next) => setRows((cur) => cur?.map((r) => (r.id === t.id ? next : r)) ?? cur)} /> : null}
                </td>
                <td className="px-5 py-3 text-[var(--slate)]">{formatDate(t.updated_at)}</td>
              </tr>
            ))}
            {rows && !rows.length && !demo ? (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-[var(--slate)]">No templates yet.</td>
              </tr>
            ) : null}
            {!rows && !error ? (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-[var(--slate)]">Loading…</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </>
  );
}

/** Occasion chips and the Featured star, saved as they're tapped. */
function TemplateTags({ t, onChange }: { t: TemplateRow; onChange: (next: TemplateRow) => void }) {
  const [error, setError] = useState<string | null>(null);
  const save = async (patch: Partial<TemplateRow>) => {
    const prev = t;
    onChange({ ...t, ...patch });
    setError(null);
    try {
      await updateTemplate(t.id, patch);
    } catch (e) {
      onChange(prev);
      setError(/featured/.test(String(e instanceof Error ? e.message : e)) ? "Run template-tags.sql first." : "Couldn’t save.");
    }
  };
  const chip = "min-h-[36px] rounded-full border px-2.5 text-[12px] font-medium transition-colors md:min-h-[28px]";
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <button
        onClick={() => save({ featured: !t.featured })}
        aria-pressed={!!t.featured}
        title="Featured on the Build Your Website page"
        className={`${chip} ${t.featured ? "border-[var(--acc-yellow)] bg-[var(--acc-yellow)] text-[var(--ink)]" : "border-[var(--line)] bg-white text-[var(--slate)]"}`}
      >
        ★ Featured
      </button>
      {TEMPLATE_OCCASIONS.map((o) => {
        const on = t.event_types.includes(o.id);
        return (
          <button
            key={o.id}
            onClick={() => save({ event_types: on ? t.event_types.filter((x) => x !== o.id) : [...t.event_types, o.id] })}
            aria-pressed={on}
            className={`${chip} ${on ? "border-[var(--ink)] bg-[var(--ink)] text-white" : "border-[var(--line)] bg-white text-[var(--slate)]"}`}
          >
            {o.label}
          </button>
        );
      })}
      {error ? <span className="text-[12px] text-[#c2412d]">{error}</span> : null}
    </div>
  );
}

function TemplateCardBody({ t }: { t: TemplateRow }) {
  return (
    <span className="min-w-0 flex-1">
      <span className="flex flex-wrap items-center gap-2">
        <span className="font-semibold text-[var(--ink)]">{t.label}</span>
        <StatusPill tone={STATUS_TONE[t.status]}>{STATUS_LABEL[t.status]}</StatusPill>
      </span>
      <span className="mt-0.5 block break-all text-[13px] text-[var(--slate)]">{t.id}</span>
      <span className="block text-[13px] text-[var(--slate)]">
        {t.kind === "spec" ? "Uploaded" : "Built in (code)"} · <span className="capitalize">{t.tier}</span> · updated {formatDate(t.updated_at)}
      </span>
    </span>
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
        <div className="w-full sm:w-auto sm:min-w-[220px] sm:flex-1">
          <p className="text-[15px] font-semibold text-[var(--ink)]">Price to publish a DIY website</p>
          <p className="text-[13px] text-[var(--slate)]">Paid once, before going live. ₱0 = free.</p>
          {unset ? <p className="mt-1 text-[13px] font-medium text-[#8a5a00]">Both are ₱0 — anyone can publish for free until you set a price.</p> : null}
        </div>
        <label className="min-w-0 flex-1 text-[14px] text-[var(--ink)] sm:flex-none md:text-[13px]">
          Standard templates (₱)
          <Input type="number" min={0} step="1" value={prices.free} onChange={(e) => (setPrices({ ...prices, free: e.target.value }), setState("idle"))} className="mt-1 sm:w-[150px]" />
        </label>
        <label className="min-w-0 flex-1 text-[14px] text-[var(--ink)] sm:flex-none md:text-[13px]">
          Premium templates (₱)
          <Input type="number" min={0} step="1" value={prices.premium} onChange={(e) => (setPrices({ ...prices, premium: e.target.value }), setState("idle"))} className="mt-1 sm:w-[150px]" />
        </label>
        <PillButton tone="dark" onClick={save} disabled={state === "saving"}>
          {state === "saving" ? "Saving…" : state === "saved" ? "Saved" : "Save prices"}
        </PillButton>
      </div>
      <ErrorText>{error}</ErrorText>
    </div>
  );
}
