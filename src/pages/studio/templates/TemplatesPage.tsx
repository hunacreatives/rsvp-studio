import { useEffect, useRef, useState } from "react";
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
  // Featured, occasions and gallery status save as they're changed; a failed save puts the row back.
  const [rowError, setRowError] = useState<Record<string, string>>({});
  const saveRow = async (t: TemplateRow, patch: Partial<TemplateRow>) => {
    setRows((cur) => cur?.map((r) => (r.id === t.id ? { ...r, ...patch } : r)) ?? cur);
    setRowError((e) => ({ ...e, [t.id]: "" }));
    try {
      await updateTemplate(t.id, patch);
    } catch (e) {
      setRows((cur) => cur?.map((r) => (r.id === t.id ? t : r)) ?? cur);
      setRowError((x) => ({ ...x, [t.id]: /featured/.test(String(e instanceof Error ? e.message : e)) ? "Run template-tags.sql first." : "Couldn’t save." }));
    }
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
          <li key={t.id} className="px-4 py-3.5">
            <div className="flex items-start gap-3">
              <TemplateName t={t} error={rowError[t.id]} />
              {!demo ? <FeaturedStar t={t} save={saveRow} /> : null}
            </div>
            {!demo ? (
              <>
                <div className="mt-2">
                  <Occasions t={t} save={saveRow} />
                </div>
                <div className="mt-2 flex items-center justify-between gap-3">
                  {arrows(t, i)}
                  <GallerySwitch t={t} save={saveRow} />
                </div>
              </>
            ) : null}
          </li>
        ))}
        {rows && !rows.length && !demo ? <li className="px-5 py-10 text-center text-[14px] text-[var(--slate)]">No templates yet.</li> : null}
        {!rows && !error ? <li className="px-5 py-10 text-center text-[14px] text-[var(--slate)]">Loading…</li> : null}
      </ul>

      <div className="hidden overflow-x-auto rounded-[22px] border border-[var(--line)] bg-white md:block">
        <table className="w-full min-w-[760px] text-left text-[14px]">
          <thead>
            <tr className="border-b border-[var(--line)] text-[12px] uppercase tracking-[0.06em] text-[var(--slate)]">
              <th className="w-[1%] whitespace-nowrap px-4 py-3 font-medium">Order</th>
              <th className="px-4 py-3 font-medium">Template</th>
              <th className="px-4 py-3 font-medium">Occasions</th>
              <th className="w-[1%] whitespace-nowrap px-4 py-3 text-center font-medium">Featured</th>
              <th className="w-[1%] whitespace-nowrap px-4 py-3 font-medium">Gallery</th>
              <th className="w-[1%] whitespace-nowrap px-4 py-3 font-medium">Updated</th>
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
                <td className="whitespace-nowrap px-4 py-2.5">
                  <span className="inline-flex items-center gap-2">
                    <i className="ri-draggable cursor-grab text-[18px] text-[var(--slate)]" aria-hidden title="Drag to reorder" />
                    <span className="w-5 text-right text-[13px] tabular-nums text-[var(--slate)]">{i + 1}</span>
                    {!demo ? arrows(t, i) : null}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  <TemplateName t={t} error={rowError[t.id]} />
                </td>
                <td className="px-4 py-2.5">{!demo ? <Occasions t={t} save={saveRow} /> : null}</td>
                <td className="px-4 py-2.5 text-center">{!demo ? <FeaturedStar t={t} save={saveRow} /> : null}</td>
                <td className="px-4 py-2.5">{!demo ? <GallerySwitch t={t} save={saveRow} /> : null}</td>
                <td className="whitespace-nowrap px-4 py-2.5 text-[13px] text-[var(--slate)]">{formatDate(t.updated_at)}</td>
              </tr>
            ))}
            {rows && !rows.length && !demo ? (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-[var(--slate)]">No templates yet.</td>
              </tr>
            ) : null}
            {!rows && !error ? (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-[var(--slate)]">Loading…</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </>
  );
}

type SaveRow = (t: TemplateRow, patch: Partial<TemplateRow>) => void;

/** Name, then id · tier · kind on one quiet line. Uploaded designs open their detail page. */
function TemplateName({ t, error }: { t: TemplateRow; error?: string }) {
  const off = t.status !== "listed";
  return (
    <span className="min-w-0 flex-1">
      {t.kind === "spec" ? (
        <Link to={`/studio/templates/${t.id}`} className={`font-semibold hover:underline ${off ? "text-[var(--slate)]" : "text-[var(--ink)]"}`}>
          {t.label}
        </Link>
      ) : (
        <span className={`font-semibold ${off ? "text-[var(--slate)]" : "text-[var(--ink)]"}`}>{t.label}</span>
      )}
      <span className="block whitespace-nowrap text-[12px] text-[var(--slate)]">
        {t.id} · <span className="capitalize">{t.tier}</span> · {t.kind === "spec" ? "Uploaded" : "Built in"}
      </span>
      {error ? <span className="block text-[12px] text-[#c2412d]">{error}</span> : null}
    </span>
  );
}

/** The occasions a design is tagged for, short. Click to change them in a checklist. */
function Occasions({ t, save }: { t: TemplateRow; save: SaveRow }) {
  const [at, setAt] = useState<{ left: number; top?: number; bottom?: number } | null>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!at) return;
    const close = (e: Event) => {
      if (e.type === "keydown" && (e as KeyboardEvent).key !== "Escape") return;
      if (e.type === "mousedown" && (panel.current?.contains(e.target as Node) || btn.current?.contains(e.target as Node))) return;
      setAt(null);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [at]);
  const open = () => {
    if (at) return setAt(null);
    const r = btn.current!.getBoundingClientRect();
    const left = Math.max(8, Math.min(r.left, window.innerWidth - 288));
    // Opens below, or above when the row sits low on the screen.
    setAt(window.innerHeight - r.bottom > 400 ? { left, top: r.bottom + 4 } : { left, bottom: window.innerHeight - r.top + 4 });
  };
  const picked = TEMPLATE_OCCASIONS.filter((o) => t.event_types.includes(o.id));
  return (
    <>
      <button
        ref={btn}
        type="button"
        onClick={open}
        aria-expanded={!!at}
        aria-label={`Occasions for ${t.label}`}
        className="group -mx-1.5 flex min-h-[36px] flex-wrap items-center gap-1 rounded-lg px-1.5 py-1 text-left hover:bg-white md:min-h-[32px]"
      >
        {picked.length ? (
          picked.map((o) => (
            <span key={o.id} className="whitespace-nowrap rounded-full border border-[var(--line)] bg-white px-2.5 py-0.5 text-[12px] font-medium text-[var(--ink)]">
              {o.short}
            </span>
          ))
        ) : (
          <span className="text-[13px] text-[var(--slate)]">All occasions</span>
        )}
        <i className="ri-pencil-line ml-0.5 text-[14px] text-[var(--slate)] md:opacity-0 md:group-hover:opacity-100" aria-hidden />
      </button>
      {at ? (
        <div ref={panel} role="group" aria-label={`Occasions for ${t.label}`} style={{ position: "fixed", ...at }} className="z-50 w-[280px] rounded-xl border border-[var(--line)] bg-white p-1.5 shadow-lg">
          {TEMPLATE_OCCASIONS.map((o) => {
            const on = t.event_types.includes(o.id);
            return (
              <label key={o.id} className="flex min-h-[40px] cursor-pointer items-start gap-2.5 rounded-lg px-2.5 py-2 hover:bg-[var(--paper)]">
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => save(t, { event_types: on ? t.event_types.filter((x) => x !== o.id) : [...t.event_types, o.id] })}
                  className="mt-[3px] h-4 w-4 accent-[var(--ink)]"
                />
                <span>
                  <span className="block text-[14px] text-[var(--ink)]">{o.short}</span>
                  {o.hint ? <span className="block text-[12px] text-[var(--slate)]">{o.hint}</span> : null}
                </span>
              </label>
            );
          })}
          <p className="px-2.5 pb-1 pt-1.5 text-[12px] text-[var(--slate)]">None ticked = offered for every occasion.</p>
        </div>
      ) : null}
    </>
  );
}

function FeaturedStar({ t, save }: { t: TemplateRow; save: SaveRow }) {
  return (
    <button
      type="button"
      onClick={() => save(t, { featured: !t.featured })}
      aria-pressed={!!t.featured}
      aria-label={`Feature ${t.label} on the Build Your Website page`}
      title="Featured on the Build Your Website page"
      className="inline-grid h-9 w-9 shrink-0 place-items-center rounded-full hover:bg-white"
    >
      <i className={t.featured ? "ri-star-fill text-[19px] text-[#e0a800]" : "ri-star-line text-[19px] text-[#c9c9d3]"} aria-hidden />
    </button>
  );
}

/** Listed ↔ hidden. Hidden designs leave the gallery but keep rendering the sites made with them.
 *  An uploaded design can only be shown once it has a published version; drafts and retired designs just say so. */
function GallerySwitch({ t, save }: { t: TemplateRow; save: SaveRow }) {
  const canShow = t.kind === "code" || !!t.current_version_id;
  if (t.status === "draft" || t.status === "retired" || (t.status === "hidden" && !canShow)) {
    return <StatusPill tone={STATUS_TONE[t.status]}>{STATUS_LABEL[t.status]}</StatusPill>;
  }
  const on = t.status === "listed";
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={`${t.label} in the gallery`}
      title={on ? "In the gallery. Switch off to hide it; sites already using it keep working." : "Hidden from the gallery. Sites already using it keep working."}
      onClick={() => save(t, { status: on ? "hidden" : "listed" })}
      className="flex min-h-[36px] items-center gap-2 whitespace-nowrap text-[13px]"
    >
      <span className={`relative h-[22px] w-[38px] shrink-0 rounded-full transition-colors ${on ? "bg-[var(--ink)]" : "bg-[#d6d6de]"}`}>
        <span className={`absolute left-0 top-[3px] h-4 w-4 rounded-full bg-white shadow transition-transform ${on ? "translate-x-[19px]" : "translate-x-[3px]"}`} />
      </span>
      <span className={on ? "text-[var(--ink)]" : "text-[var(--slate)]"}>{on ? "Shown" : "Hidden"}</span>
    </button>
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
