import { useCallback, useEffect, useMemo, useState } from "react";
import { usePortal } from "@/pages/account/portal/PortalContext";
import { formatDate } from "@/pages/account/portal/format";
import { ErrorText, Field, FilterTabs, Input, Modal, PillButton, Select, Toggle } from "@/pages/account/portal/ui";
import { StudioHeader } from "../StudioLayout";
import * as studio from "../studioApi";
import { downloadCsv } from "@/lib/csv";

// Studio → Costs (supabase/studio-costs.sql): what the studio spends, who paid it, and the
// 50/50 split between the two partners. They share one login, so "Paid by" is a name, not
// an account. Settling up stamps every open cost, so the balance starts again from zero.

type View = "open" | "month" | "all";
type Currency = studio.Cost["currency"];

const CATEGORIES: { id: studio.CostCategory; label: string }[] = [
  { id: "ads", label: "Ads" },
  { id: "software", label: "Software" },
  { id: "domain", label: "Domains" },
  { id: "other", label: "Other" },
];
const categoryLabel = (id: studio.CostCategory) => CATEGORIES.find((c) => c.id === id)?.label ?? id;

const formatters: Record<Currency, Intl.NumberFormat> = {
  PHP: new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" }),
  USD: new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }),
};
const fmt = (amount: number, currency: Currency) => formatters[currency].format(amount);
const today = () => new Date().toLocaleDateString("en-CA");
const monthKey = (d: string) => d.slice(0, 7);

// Totals per currency (pesos and dollars are never added together).
function byCurrency(rows: studio.Cost[]) {
  const out = new Map<Currency, number>();
  for (const r of rows) out.set(r.currency, (out.get(r.currency) ?? 0) + r.amount);
  return [...out.entries()];
}

const EMPTY: studio.CostInput = { spent_on: today(), vendor: "", category: "software", note: "", amount: 0, currency: "PHP", monthly: false, paid_by: "" };

export default function CostsPage() {
  const { demo } = usePortal();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [costs, setCosts] = useState<studio.Cost[] | null | undefined>(undefined);
  const [view, setView] = useState<View>("open");
  const [editing, setEditing] = useState<{ id?: string; input: studio.CostInput } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (demo) return setAllowed(false);
    studio.canSeeCosts().then(setAllowed);
  }, [demo]);
  const reload = useCallback(() => studio.loadCosts().then(setCosts), []);
  useEffect(() => {
    if (allowed) void reload();
  }, [allowed, reload]);

  const list = useMemo(() => costs ?? [], [costs]);
  const payers = useMemo(() => [...new Set(list.map((c) => c.paid_by?.trim()).filter((p): p is string => Boolean(p)))], [list]);
  const open = list.filter((c) => !c.settled_on);
  const openPaid = open.filter((c) => c.paid_by?.trim());
  const noPayer = open.length - openPaid.length;

  // Monthly bills not logged yet this month (their latest entry is from an earlier month).
  const thisMonth = monthKey(today());
  const due = useMemo(() => {
    const latest = new Map<string, studio.Cost>();
    for (const c of list) if (c.monthly && !latest.has(c.vendor)) latest.set(c.vendor, c);
    return [...latest.values()].filter((c) => monthKey(c.spent_on) < thisMonth);
  }, [list, thisMonth]);

  if (allowed === null) return <StudioHeader title="Finances" tabs="finances" sub="Loading…" />;
  if (!allowed)
    return (
      <>
        <StudioHeader title="Finances" tabs="finances" />
        <p className="text-[14px] text-[var(--slate)]">Only the owner and the partners’ shared account can see costs.</p>
      </>
    );
  if (costs === null)
    return (
      <>
        <StudioHeader title="Finances" tabs="finances" />
        <p className="text-[14px] text-[var(--slate)]">Run supabase/studio-costs.sql on the live database to switch on Costs.</p>
      </>
    );

  const shown = view === "open" ? open : view === "month" ? list.filter((c) => monthKey(c.spent_on) === thisMonth) : list;

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await reload();
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "That didn’t save. Try again.");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    if (!editing) return;
    const i = editing.input;
    if (!i.vendor.trim()) return setError("Add who the cost was paid to.");
    if (!(i.amount > 0)) return setError("Add the amount.");
    const input = { ...i, vendor: i.vendor.trim(), note: i.note?.trim() || null, paid_by: i.paid_by?.trim() || null };
    if (await run(() => studio.saveCost(input, editing.id))) setEditing(null);
  };
  const logAgain = (c: studio.Cost) => run(() => studio.saveCost({ spent_on: today(), vendor: c.vendor, category: c.category, note: c.note, amount: c.amount, currency: c.currency, monthly: true, paid_by: c.paid_by }));
  const settle = () => {
    const lines = balance(openPaid, payers).map((b) => b.line).join("\n");
    if (!window.confirm(`Mark ${openPaid.length} cost${openPaid.length === 1 ? "" : "s"} as settled?\n\n${lines}`)) return;
    void run(() => studio.settleCosts(openPaid.map((c) => c.id)));
  };
  const set = (patch: Partial<studio.CostInput>) => setEditing((e) => (e ? { ...e, input: { ...e.input, ...patch } } : e));

  return (
    <>
      <StudioHeader
        title="Finances"
        tabs="finances"
        sub="Split 50/50 between the partners."
        action={
          <div className="flex flex-wrap gap-2">
            {list.length ? (
              <PillButton
                onClick={() =>
                  downloadCsv(
                    `costs-${today()}.csv`,
                    ["Date", "Paid to", "Category", "Note", "Amount", "Currency", "Monthly", "Paid by", "Settled on"],
                    list.map((c) => [c.spent_on, c.vendor, categoryLabel(c.category), c.note ?? "", c.amount, c.currency, c.monthly ? "yes" : "", c.paid_by ?? "", c.settled_on ?? ""]),
                  )
                }
              >
                <i className="ri-download-2-line" /> Export CSV
              </PillButton>
            ) : null}
            <PillButton tone="primary" onClick={() => (setError(null), setEditing({ input: { ...EMPTY, spent_on: today() } }))}>
              <i className="ri-add-line" /> Add cost
            </PillButton>
          </div>
        }
      />

      {/* The open balance: who has paid what since the last settle-up, and who owes whom. */}
      <section className="rounded-[22px] border border-[var(--ink)] bg-white p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-[15px] font-semibold text-[var(--ink)]">Open balance</h2>
          {openPaid.length ? (
            <PillButton onClick={settle} disabled={busy}>
              <i className="ri-check-double-line" /> Settle up
            </PillButton>
          ) : null}
        </div>
        {costs === undefined ? (
          <p className="mt-2 text-[14px] text-[var(--slate)]">Loading…</p>
        ) : !open.length ? (
          <p className="mt-2 text-[14px] text-[var(--slate)]">All settled.</p>
        ) : (
          <div className="mt-3 space-y-4">
            {balance(openPaid, payers).map((b) => (
              <div key={b.currency}>
                <p className="text-[24px] font-semibold text-[var(--ink)] [font-variant-numeric:tabular-nums]">{fmt(b.total, b.currency)}</p>
                <p className="text-[14px] text-[var(--slate)] [font-variant-numeric:tabular-nums]">
                  {fmt(b.total / 2, b.currency)} each · {b.paid.map(([who, amt]) => `${who} paid ${fmt(amt, b.currency)}`).join(" · ")}
                </p>
                <p className="mt-1 text-[14px] font-medium text-[var(--ink)]">{b.line}</p>
              </div>
            ))}
            {noPayer ? (
              <p className="text-[14px] text-[#9a5b00]">
                {noPayer} open cost{noPayer === 1 ? " has" : "s have"} no payer yet and {noPayer === 1 ? "isn’t" : "aren’t"} in the balance. Tap {noPayer === 1 ? "it" : "them"} below to set who paid.
              </p>
            ) : null}
          </div>
        )}
      </section>

      {due.length ? (
        <section className="mt-4 rounded-[22px] border border-[var(--line)] bg-white p-5">
          <h2 className="text-[15px] font-semibold text-[var(--ink)]">Monthly bills to log for {new Date().toLocaleDateString("en-PH", { month: "long" })}</h2>
          <ul className="mt-2 divide-y divide-[var(--line)]">
            {due.map((c) => (
              <li key={c.vendor} className="flex items-center gap-3 py-2.5 text-[14px]">
                <span className="min-w-0 flex-1 truncate text-[var(--ink)]">{c.vendor}</span>
                <span className="text-[var(--slate)] [font-variant-numeric:tabular-nums]">{fmt(c.amount, c.currency)}</span>
                <PillButton onClick={() => void logAgain(c)} disabled={busy}>
                  Log it
                </PillButton>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="mb-4 mt-6">
        <FilterTabs<View>
          value={view}
          onChange={setView}
          options={[
            { value: "open", label: "Open" },
            { value: "month", label: "This month" },
            { value: "all", label: "All" },
          ]}
        />
      </div>

      <section className="rounded-[22px] border border-[var(--line)] bg-white px-5 py-2">
        {!shown.length ? (
          <p className="py-3 text-[14px] text-[var(--slate)]">{costs === undefined ? "Loading…" : view === "open" ? "Nothing open." : "No costs here yet."}</p>
        ) : (
          <ul className="divide-y divide-[var(--line)]">
            {shown.map((c) => (
              <li key={c.id}>
                <button
                  className="flex w-full items-center gap-3 py-3 text-left text-[14px]"
                  onClick={() => (setError(null), setEditing({ id: c.id, input: { spent_on: c.spent_on, vendor: c.vendor, category: c.category, note: c.note ?? "", amount: c.amount, currency: c.currency, monthly: c.monthly, paid_by: c.paid_by ?? "" } }))}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-[var(--ink)]">
                      {c.vendor}
                      {c.note ? <span className="font-normal text-[var(--slate)]"> · {c.note}</span> : null}
                    </p>
                    <p className="text-[12px] text-[var(--slate)]">
                      {formatDate(c.spent_on)} · {categoryLabel(c.category)}
                      {c.monthly ? " · Monthly" : ""}
                      {c.paid_by ? ` · ${c.paid_by} paid` : <span className="text-[#9a5b00]"> · Who paid?</span>}
                      {c.settled_on ? ` · Settled ${formatDate(c.settled_on)}` : ""}
                    </p>
                  </div>
                  <span className="shrink-0 font-semibold text-[var(--ink)] [font-variant-numeric:tabular-nums]">{fmt(c.amount, c.currency)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
      {shown.length ? (
        <p className="mt-3 text-[13px] text-[var(--slate)] [font-variant-numeric:tabular-nums]">
          Total: {byCurrency(shown).map(([cur, amt]) => fmt(amt, cur)).join(" + ")}
        </p>
      ) : null}

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? "Edit cost" : "Add a cost"}>
        {editing ? (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void save();
            }}
          >
            <Field label="Paid to">
              <Input value={editing.input.vendor} onChange={(e) => set({ vendor: e.target.value })} placeholder="e.g. Vercel, Meta, Google Ads" autoFocus={!editing.id} />
            </Field>
            <div className="grid grid-cols-[1fr_110px] gap-3">
              <Field label="Amount">
                <Input type="number" inputMode="decimal" min="0" step="0.01" value={editing.input.amount || ""} onChange={(e) => set({ amount: Number(e.target.value) })} />
              </Field>
              <Field label="Currency">
                <Select value={editing.input.currency} onChange={(e) => set({ currency: e.target.value as Currency })}>
                  <option value="PHP">PHP</option>
                  <option value="USD">USD</option>
                </Select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Date">
                <Input type="date" value={editing.input.spent_on} onChange={(e) => set({ spent_on: e.target.value })} />
              </Field>
              <Field label="Category">
                <Select value={editing.input.category} onChange={(e) => set({ category: e.target.value as studio.CostCategory })}>
                  {CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
            <Field label="Paid by" hint="Whose card or wallet paid it.">
              <Input list="cost-payers" value={editing.input.paid_by ?? ""} onChange={(e) => set({ paid_by: e.target.value })} placeholder="Name" />
              <datalist id="cost-payers">
                {payers.map((p) => (
                  <option key={p} value={p} />
                ))}
              </datalist>
            </Field>
            <Field label="Note">
              <Input value={editing.input.note ?? ""} onChange={(e) => set({ note: e.target.value })} placeholder="Optional" />
            </Field>
            <div className="flex items-center justify-between gap-4">
              <span className="text-[14px] font-medium text-[var(--ink)]">Monthly bill</span>
              <Toggle checked={editing.input.monthly} onChange={(v) => set({ monthly: v })} label="Monthly bill" />
            </div>
            <ErrorText>{error}</ErrorText>
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              {editing.id ? (
                <PillButton
                  type="button"
                  tone="danger"
                  disabled={busy}
                  onClick={async () => {
                    if (!window.confirm(`Delete this ${editing.input.vendor} cost? This can’t be undone.`)) return;
                    const id = editing.id;
                    if (id && (await run(() => studio.deleteCost(id)))) setEditing(null);
                  }}
                >
                  Delete
                </PillButton>
              ) : (
                <span />
              )}
              <PillButton type="submit" tone="primary" disabled={busy}>
                {busy ? "Saving…" : "Save"}
              </PillButton>
            </div>
          </form>
        ) : null}
      </Modal>
      {!editing ? <ErrorText>{error}</ErrorText> : null}
    </>
  );
}

// Per currency: the total, what each payer put in, and one line saying who owes whom.
function balance(rows: studio.Cost[], payers: string[]) {
  return byCurrency(rows).map(([currency, total]) => {
    const paid = new Map<string, number>(payers.map((p) => [p, 0]));
    for (const r of rows) if (r.currency === currency && r.paid_by) paid.set(r.paid_by.trim(), (paid.get(r.paid_by.trim()) ?? 0) + r.amount);
    const entries = [...paid.entries()].filter(([, amt]) => amt > 0);
    const half = total / 2;
    let line: string;
    if (payers.length < 2) line = `Add the other partner as a payer to see who owes whom (${fmt(half, currency)} each).`;
    else if (payers.length > 2) line = "More than two payers: check the names (a typo counts as a new person).";
    else {
      const [a, b] = payers;
      const diff = (paid.get(a) ?? 0) - half;
      line = Math.abs(diff) < 0.005 ? "Even." : diff > 0 ? `${b} owes ${a} ${fmt(diff, currency)}` : `${a} owes ${b} ${fmt(-diff, currency)}`;
    }
    return { currency, total, paid: entries, line };
  });
}
