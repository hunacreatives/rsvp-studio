import { useEffect, useState } from "react";
import { formatDate } from "@/pages/account/portal/format";
import { ErrorText, Input, PillButton, StatusPill } from "@/pages/account/portal/ui";
import * as studio from "../studioApi";

// Studio → Templates → Promo codes: a % off website fees (Premium / publishing) for a
// sale or a campaign. Customers type it in the builder's "Have a code?" box. It never
// adds to another discount: they get whichever is biggest (partner, first payment, promo).

const blank = { code: "", percent_off: 10, note: "", starts_on: "", ends_on: "", max_uses: "" };

export default function PromoCodesCard() {
  const [rows, setRows] = useState<studio.PromoCode[] | null | undefined>(undefined);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(blank);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const reload = () => studio.loadPromoCodes().then(setRows);
  useEffect(() => {
    reload();
  }, []);
  if (rows === null || rows === undefined) return null;

  const today = new Date(Date.now() + 8 * 3_600_000).toISOString().slice(0, 10);
  const status = (r: studio.PromoCode) =>
    !r.active ? { tone: "grey" as const, text: "Off" }
    : r.ends_on && r.ends_on < today ? { tone: "grey" as const, text: "Ended" }
    : r.starts_on && r.starts_on > today ? { tone: "grey" as const, text: `Starts ${formatDate(r.starts_on)}` }
    : r.max_uses !== null && r.uses >= r.max_uses ? { tone: "grey" as const, text: "Used up" }
    : { tone: "lime" as const, text: "Live" };

  const create = async () => {
    setError(null);
    const code = form.code.trim().toUpperCase();
    if (!/^[A-Z0-9]{3,20}$/.test(code)) return setError("Codes are 3–20 letters or numbers, no spaces.");
    if (!(form.percent_off >= 1 && form.percent_off <= 90)) return setError("Between 1% and 90% off.");
    if (form.starts_on && form.ends_on && form.ends_on < form.starts_on) return setError("The end date is before the start date.");
    setBusy(true);
    try {
      await studio.savePromoCode({
        code,
        percent_off: Math.round(form.percent_off),
        note: form.note.trim() || null,
        starts_on: form.starts_on || null,
        ends_on: form.ends_on || null,
        max_uses: form.max_uses ? Math.max(1, Math.round(Number(form.max_uses))) : null,
      });
      setForm(blank);
      setAdding(false);
      reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t save the code.");
    }
    setBusy(false);
  };

  return (
    <div className="mb-5 rounded-[22px] border border-[var(--line)] bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[15px] font-semibold text-[var(--ink)]">Promo codes</p>
          <p className="mt-1 text-[13px] text-[var(--slate)]">% off website fees. Never added to another discount: the biggest one applies.</p>
        </div>
        <PillButton tone={adding ? undefined : "dark"} onClick={() => (setAdding((v) => !v), setError(null))}>
          {adding ? "Cancel" : "New code"}
        </PillButton>
      </div>

      {adding ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <label className="text-[14px] text-[var(--ink)] md:text-[13px]">
            Code
            <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 20) })} placeholder="BRIDAL15" className="mt-1 w-full" />
          </label>
          <label className="text-[14px] text-[var(--ink)] md:text-[13px]">
            % off
            <Input type="number" min={1} max={90} value={form.percent_off} onChange={(e) => setForm({ ...form, percent_off: Number(e.target.value) })} className="mt-1 w-full" />
          </label>
          <label className="text-[14px] text-[var(--ink)] md:text-[13px]">
            Max uses (optional)
            <Input type="number" min={1} value={form.max_uses} onChange={(e) => setForm({ ...form, max_uses: e.target.value })} placeholder="No limit" className="mt-1 w-full" />
          </label>
          <label className="text-[14px] text-[var(--ink)] md:text-[13px]">
            Starts (optional)
            <Input type="date" value={form.starts_on} onChange={(e) => setForm({ ...form, starts_on: e.target.value })} className="mt-1 w-full" />
          </label>
          <label className="text-[14px] text-[var(--ink)] md:text-[13px]">
            Last day (optional)
            <Input type="date" value={form.ends_on} onChange={(e) => setForm({ ...form, ends_on: e.target.value })} className="mt-1 w-full" />
          </label>
          <label className="text-[14px] text-[var(--ink)] md:text-[13px]">
            Note for the team (optional)
            <Input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value.slice(0, 120) })} placeholder="Wedding season 2027" className="mt-1 w-full" />
          </label>
          <div className="sm:col-span-3">
            <PillButton tone="dark" onClick={create} disabled={busy}>
              {busy ? "Saving…" : "Create code"}
            </PillButton>
          </div>
        </div>
      ) : null}
      <ErrorText>{error}</ErrorText>

      {rows.length ? (
        <ul className="mt-4 divide-y divide-[var(--line)] border-t border-[var(--line)]">
          {rows.map((r) => {
            const s = status(r);
            return (
              <li key={r.code} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3 text-[14px]">
                <span className="font-mono font-semibold tracking-[0.04em] text-[var(--ink)]">{r.code}</span>
                <span className="text-[var(--ink)]">{r.percent_off}% off</span>
                <StatusPill tone={s.tone}>{s.text}</StatusPill>
                <span className="min-w-0 flex-1 text-[13px] text-[var(--slate)]">
                  {[
                    `${r.uses}${r.max_uses !== null ? ` of ${r.max_uses}` : ""} used`,
                    r.starts_on || r.ends_on ? `${r.starts_on ? formatDate(r.starts_on) : "now"} – ${r.ends_on ? formatDate(r.ends_on) : "no end"}` : "",
                    r.note ?? "",
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
                <button
                  onClick={async () => {
                    await studio.setPromoActive(r.code, !r.active).catch((e) => setError(e.message));
                    reload();
                  }}
                  className="min-h-[44px] px-2 text-[13px] text-[var(--acc-blue)] md:min-h-0"
                >
                  {r.active ? "Turn off" : "Turn on"}
                </button>
              </li>
            );
          })}
        </ul>
      ) : !adding ? (
        <p className="mt-3 text-[13px] text-[var(--slate)]">No codes yet.</p>
      ) : null}
    </div>
  );
}
