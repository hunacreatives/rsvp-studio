import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePortal } from "@/pages/account/portal/PortalContext";
import { formatDate } from "@/pages/account/portal/format";
import { ErrorText, Field, FilterTabs, Input, Modal, PillButton, Select, Toggle } from "@/pages/account/portal/ui";
import { StudioHeader } from "../StudioLayout";
import * as studio from "../studioApi";
import { downloadCsv } from "@/lib/csv";
import { compressImage } from "@/lib/compressImage";

// Studio → Costs (supabase/studio-costs.sql + cost-receipts-fx.sql): what the studio spends,
// who paid it, and the 50/50 split between the two partners. They share one login, so
// "Paid by" is a name, not an account. Dollar costs keep the peso amount they were worth
// on their date, so the balance is one peso figure. Each cost can carry receipts
// (screenshots or PDFs) in a private bucket. Settling up records the payment between the
// partners (supabase/cost-settlements.sql), with screenshots of the transfer, and closes
// the open costs; a settle-up can be undone.

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
const peso = (amount: number) => fmt(amount, "PHP");
const round2 = (n: number) => Math.round(n * 100) / 100;
const today = () => new Date().toLocaleDateString("en-CA");
const monthKey = (d: string) => d.slice(0, 7);
const sum = (rows: studio.Cost[]) => rows.reduce((t, r) => t + r.php_amount, 0);

const EMPTY: studio.CostInput = { spent_on: today(), vendor: "", category: "software", note: "", amount: 0, currency: "PHP", monthly: false, paid_by: "", php_amount: 0, fx_rate: null, receipts: [] };

export default function CostsPage() {
  const { demo } = usePortal();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [costs, setCosts] = useState<studio.Cost[] | null | undefined>(undefined);
  const [view, setView] = useState<View>("open");
  const [settlements, setSettlements] = useState<studio.CostSettlement[]>([]);
  const [editing, setEditing] = useState<{ id?: string; input: studio.CostInput } | null>(null);
  const [settling, setSettling] = useState<"new" | studio.CostSettlement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (demo) return setAllowed(false);
    studio.canSeeCosts().then(setAllowed);
  }, [demo]);
  const reload = useCallback(
    () =>
      Promise.all([
        studio.loadCosts().then(setCosts),
        studio
          .loadSettlements()
          .then(setSettlements)
          .catch(() => setSettlements([])),
      ]),
    [],
  );
  useEffect(() => {
    if (allowed) void reload();
  }, [allowed, reload]);

  const list = useMemo(() => costs ?? [], [costs]);
  const payers = useMemo(() => [...new Set(list.map((c) => c.paid_by?.trim()).filter((p): p is string => Boolean(p)))], [list]);
  const open = list.filter((c) => !c.settled_on);
  const openPaid = open.filter((c) => c.paid_by?.trim());
  const noPayer = open.length - openPaid.length;
  const noReceipt = open.filter((c) => !c.receipts.length).length;
  // Names for the "Sent by" suggestions: everyone who has paid a cost or a settle-up.
  const names = useMemo(
    () => [...new Set([...payers, ...settlements.flatMap((s) => [s.from_name, s.to_name]).filter((n): n is string => Boolean(n))])],
    [payers, settlements],
  );

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
        <p className="text-[14px] text-[var(--slate)]">Run supabase/studio-costs.sql, cost-receipts-fx.sql and cost-settlements.sql on the live database to switch on Costs.</p>
      </>
    );

  const shown = view === "open" ? open : view === "month" ? list.filter((c) => monthKey(c.spent_on) === thisMonth) : list;
  const bal = balance(openPaid, payers);

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

  // A monthly bill again for this month. Dollar bills get today's rate; if the rate
  // can't be fetched, open the form so the peso amount can be typed in.
  const logAgain = async (c: studio.Cost) => {
    const base: studio.CostInput = { spent_on: today(), vendor: c.vendor, category: c.category, note: c.note, amount: c.amount, currency: c.currency, monthly: true, paid_by: c.paid_by, php_amount: c.amount, fx_rate: null, receipts: [] };
    if (c.currency === "USD") {
      const rate = await studio.usdToPhpRate(base.spent_on).catch(() => null);
      if (!rate) return setEditing({ input: { ...base, php_amount: 0 } });
      Object.assign(base, { fx_rate: rate, php_amount: round2(c.amount * rate) });
    }
    void run(() => studio.saveCost(base));
  };
  const edit = (c: studio.Cost) => {
    setError(null);
    const { id, settled_on: _s, settlement_id: _sid, ...input } = c;
    setEditing({ id, input: { ...input, note: c.note ?? "", paid_by: c.paid_by ?? "" } });
  };

  return (
    <>
      <StudioHeader
        title="Finances"
        tabs="finances"
        sub="Split 50/50 between the partners. Dollar costs are counted in pesos at the rate on the day."
        action={
          <div className="flex flex-wrap gap-2">
            {list.length ? (
              <PillButton
                onClick={() =>
                  downloadCsv(
                    `costs-${today()}.csv`,
                    ["Date", "Paid to", "Category", "Note", "Amount", "Currency", "Rate (PHP per USD)", "Pesos", "Monthly", "Paid by", "Settled on", "Receipts"],
                    list.map((c) => [c.spent_on, c.vendor, categoryLabel(c.category), c.note ?? "", c.amount, c.currency, c.fx_rate ?? "", c.php_amount, c.monthly ? "yes" : "", c.paid_by ?? "", c.settled_on ?? "", c.receipts.length]),
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

      {/* The open balance in pesos: who has paid what since the last settle-up, and who owes whom. */}
      <section className="rounded-[22px] border border-[var(--ink)] bg-white p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="text-[15px] font-semibold text-[var(--ink)]">Open balance</h2>
          {bal?.owe ? (
            <PillButton onClick={() => setSettling("new")} disabled={busy}>
              <i className="ri-check-double-line" /> Settle up
            </PillButton>
          ) : null}
        </div>
        {costs === undefined ? (
          <p className="mt-2 text-[14px] text-[var(--slate)]">Loading…</p>
        ) : !open.length ? (
          <p className="mt-2 text-[14px] text-[var(--slate)]">All settled.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {bal ? (
              <div>
                <p className="text-[24px] font-semibold text-[var(--ink)] [font-variant-numeric:tabular-nums]">{peso(bal.total)}</p>
                <p className="text-[14px] text-[var(--slate)] [font-variant-numeric:tabular-nums]">
                  {peso(bal.total / 2)} each · {bal.paid.map(([who, amt]) => `${who} paid ${peso(amt)}`).join(" · ")}
                </p>
                <p className="mt-1 text-[14px] font-medium text-[var(--ink)]">{bal.line}</p>
              </div>
            ) : null}
            {noPayer ? (
              <p className="text-[14px] text-[#9a5b00]">
                {noPayer} open cost{noPayer === 1 ? " has" : "s have"} no payer yet and {noPayer === 1 ? "isn’t" : "aren’t"} in the balance. Tap {noPayer === 1 ? "it" : "them"} below to set who paid.
              </p>
            ) : null}
            {noReceipt ? (
              <p className="text-[14px] text-[#9a5b00]">
                {noReceipt} open cost{noReceipt === 1 ? " has" : "s have"} no receipt yet.
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
                <button className="flex w-full items-center gap-3 py-3 text-left text-[14px]" onClick={() => edit(c)}>
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
                      {c.receipts.length ? (
                        <span>
                          {" · "}
                          <i className="ri-attachment-2 align-[-1px]" /> {c.receipts.length === 1 ? "Receipt" : `${c.receipts.length} receipts`}
                        </span>
                      ) : (
                        <span className="text-[#9a5b00]"> · No receipt</span>
                      )}
                    </p>
                  </div>
                  <span className="shrink-0 text-right [font-variant-numeric:tabular-nums]">
                    <span className="block font-semibold text-[var(--ink)]">{peso(c.php_amount)}</span>
                    {c.currency === "USD" ? <span className="block text-[12px] text-[var(--slate)]">{fmt(c.amount, "USD")}</span> : null}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
      {shown.length ? <p className="mt-3 text-[13px] text-[var(--slate)] [font-variant-numeric:tabular-nums]">Total: {peso(sum(shown))}</p> : null}

      {/* Past settle-ups: the payment, its proof, and undo. */}
      {settlements.length ? (
        <>
          <h2 className="mb-3 mt-8 text-[15px] font-semibold text-[var(--ink)]">Settle-ups</h2>
          <section className="rounded-[22px] border border-[var(--line)] bg-white px-5 py-2">
            <ul className="divide-y divide-[var(--line)]">
              {settlements.map((s) => (
                <li key={s.id}>
                  <button className="flex w-full items-center gap-3 py-3 text-left text-[14px]" onClick={() => (setError(null), setSettling(s))}>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-[var(--ink)]">{settlementTitle(s)}</p>
                      <p className="text-[12px] text-[var(--slate)]">
                        {formatDate(s.paid_on)} · {s.costs} cost{s.costs === 1 ? "" : "s"}
                        {s.note ? ` · ${s.note}` : ""}
                        {s.receipts.length ? (
                          <span>
                            {" · "}
                            <i className="ri-attachment-2 align-[-1px]" /> Proof
                          </span>
                        ) : s.amount > 0 ? (
                          <span className="text-[#9a5b00]"> · No proof</span>
                        ) : null}
                      </p>
                    </div>
                    {s.amount > 0 ? <span className="shrink-0 font-semibold text-[var(--ink)] [font-variant-numeric:tabular-nums]">{peso(s.amount)}</span> : null}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </>
      ) : null}

      <Modal open={!!settling} onClose={() => setSettling(null)} title={settling === "new" ? "Settle up" : "Settle-up"}>
        {settling === "new" && bal?.owe ? (
          <SettleForm
            draft={{ ids: openPaid.map((c) => c.id), total: bal.total, ...bal.owe }}
            names={names}
            onDone={async (changed) => {
              if (changed) await reload();
              setSettling(null);
            }}
          />
        ) : settling && settling !== "new" ? (
          <SettleForm
            key={settling.id}
            settlement={settling}
            names={names}
            onDone={async (changed) => {
              if (changed) await reload();
              setSettling(null);
            }}
          />
        ) : null}
      </Modal>

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? "Edit cost" : "Add a cost"}>
        {editing ? (
          <CostForm
            key={editing.id ?? "new"}
            id={editing.id}
            initial={editing.input}
            payers={payers}
            onDone={async (saved) => {
              if (saved) await reload();
              setEditing(null);
            }}
          />
        ) : null}
      </Modal>
      {!editing ? <ErrorText>{error}</ErrorText> : null}
    </>
  );
}

// Receipts on a form (a cost or a settle-up). Files upload straight away; files added and
// then abandoned (form closed without saving) are removed again, and files taken off are
// removed from storage once the change is saved.
function useReceipts(initial: studio.CostReceipt[], onError: (message: string | null) => void) {
  const [receipts, setReceipts] = useState(initial);
  const [uploading, setUploading] = useState(0);
  const added = useRef<string[]>([]);
  const finished = useRef(false);

  // Leaving without saving: drop the files uploaded in this visit.
  useEffect(
    () => () => {
      if (!finished.current) void studio.removeCostReceipts(added.current);
    },
    [],
  );

  const add = async (files: FileList | null) => {
    if (!files?.length) return;
    onError(null);
    for (const original of Array.from(files)) {
      if (!original.type.startsWith("image/") && original.type !== "application/pdf") {
        onError(`${original.name} isn’t an image or PDF.`);
        continue;
      }
      setUploading((n) => n + 1);
      try {
        const file = await compressImage(original, { maxEdge: 2400, skipUnderBytes: 1_500_000 });
        if (file.size > studio.MAX_RECEIPT_BYTES) throw new Error(`${original.name} is over 10 MB.`);
        const r = await studio.uploadCostReceipt(file);
        added.current.push(r.path);
        setReceipts((rs) => [...rs, { ...r, name: original.name }]);
      } catch (e) {
        onError(e instanceof Error ? e.message : "That file didn’t upload. Try again.");
      } finally {
        setUploading((n) => n - 1);
      }
    }
  };

  return {
    receipts,
    uploading,
    add,
    remove: (path: string) => setReceipts((rs) => rs.filter((r) => r.path !== path)),
    /** Saved: keep what's on the form, delete what was taken off. */
    saved: () => {
      finished.current = true;
      const kept = new Set(receipts.map((r) => r.path));
      void studio.removeCostReceipts(initial.map((r) => r.path).filter((p) => !kept.has(p)));
    },
    /** The record itself is gone: delete every file. */
    discarded: () => {
      finished.current = true;
      void studio.removeCostReceipts([...new Set([...initial, ...receipts].map((r) => r.path))]);
    },
  };
}

function ReceiptsField({ label, hint, rc }: { label: string; hint: string; rc: ReturnType<typeof useReceipts> }) {
  const fileInput = useRef<HTMLInputElement>(null);
  return (
    <div>
      <span className="mb-1.5 block text-[14px] font-medium text-[var(--ink)]">{label}</span>
      <div className="flex flex-wrap gap-2">
        {rc.receipts.map((r) => (
          <ReceiptTile key={r.path} receipt={r} onRemove={() => rc.remove(r.path)} />
        ))}
        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          disabled={rc.uploading > 0}
          className="flex h-[84px] w-[84px] flex-col items-center justify-center gap-1 rounded-[12px] border border-dashed border-[var(--slate)] text-[12px] text-[var(--slate)] hover:border-[var(--ink)] hover:text-[var(--ink)] disabled:opacity-60"
        >
          <i className={rc.uploading ? "ri-loader-4-line animate-spin text-[18px]" : "ri-add-line text-[18px]"} />
          {rc.uploading ? "Uploading" : "Add"}
        </button>
      </div>
      <span className="mt-1 block text-[12px] text-[var(--slate)]">{hint}</span>
      <input
        ref={fileInput}
        type="file"
        accept="image/*,application/pdf"
        multiple
        className="hidden"
        onChange={(e) => {
          void rc.add(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}

// The add/edit form for a cost.
function CostForm({ id, initial, payers, onDone }: { id?: string; initial: studio.CostInput; payers: string[]; onDone: (saved: boolean) => void | Promise<void> }) {
  const [input, setInput] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const rc = useReceipts(initial.receipts, setError);
  // Dollar costs: work the pesos out from the day's rate until someone types their own.
  const [autoPesos, setAutoPesos] = useState(!id || initial.php_amount <= 0);
  const [rate, setRate] = useState<{ date: string; value: number } | "loading" | "failed" | null>(null);

  const set = (patch: Partial<studio.CostInput>) => setInput((i) => ({ ...i, ...patch }));

  useEffect(() => {
    if (input.currency !== "USD" || !autoPesos) return;
    let live = true;
    setRate("loading");
    studio
      .usdToPhpRate(input.spent_on)
      .then((value) => {
        if (!live) return;
        setRate({ date: input.spent_on, value });
        setInput((i) => ({ ...i, fx_rate: value, php_amount: i.amount > 0 ? round2(i.amount * value) : 0 }));
      })
      .catch(() => live && setRate("failed"));
    return () => {
      live = false;
    };
  }, [input.currency, input.spent_on, input.amount, autoPesos]);

  const save = async () => {
    if (!input.vendor.trim()) return setError("Add who the cost was paid to.");
    if (!(input.amount > 0)) return setError("Add the amount.");
    const usd = input.currency === "USD";
    if (usd && !(input.php_amount > 0)) return setError("Add what it came to in pesos.");
    const clean: studio.CostInput = {
      ...input,
      vendor: input.vendor.trim(),
      note: input.note?.trim() || null,
      paid_by: input.paid_by?.trim() || null,
      receipts: rc.receipts,
      php_amount: usd ? round2(input.php_amount) : input.amount,
      fx_rate: usd ? Math.round((input.php_amount / input.amount) * 10000) / 10000 : null,
    };
    setBusy(true);
    setError(null);
    try {
      await studio.saveCost(clean, id);
      rc.saved();
      await onDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "That didn’t save. Try again.");
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!id || !window.confirm(`Delete this ${input.vendor} cost and its receipts? This can’t be undone.`)) return;
    setBusy(true);
    try {
      await studio.deleteCost(id);
      rc.discarded();
      await onDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "That didn’t delete. Try again.");
      setBusy(false);
    }
  };

  const rateHint =
    input.currency !== "USD"
      ? undefined
      : !autoPesos
        ? input.php_amount > 0 && input.amount > 0
          ? `${peso(input.php_amount / input.amount)} per $1.`
          : undefined
        : rate === "loading"
          ? "Getting the day’s rate…"
          : rate === "failed"
            ? "Couldn’t get the rate. Type the peso amount from the card statement."
            : rate
              ? `${peso(rate.value)} per $1 on ${formatDate(rate.date)}. Type the card statement’s peso amount instead if it’s different.`
              : undefined;

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <Field label="Paid to">
        <Input value={input.vendor} onChange={(e) => set({ vendor: e.target.value })} placeholder="e.g. Vercel, Meta, Google Ads" autoFocus={!id} />
      </Field>
      <div className="grid grid-cols-[1fr_110px] gap-3">
        <Field label="Amount">
          <Input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={input.amount || ""}
            onChange={(e) => {
              const amount = Number(e.target.value);
              set(input.currency === "PHP" ? { amount, php_amount: amount } : { amount });
              if (input.currency === "USD") setAutoPesos(true);
            }}
          />
        </Field>
        <Field label="Currency">
          <Select
            value={input.currency}
            onChange={(e) => {
              const currency = e.target.value as Currency;
              set(currency === "PHP" ? { currency, php_amount: input.amount, fx_rate: null } : { currency });
              setAutoPesos(true);
            }}
          >
            <option value="PHP">PHP</option>
            <option value="USD">USD</option>
          </Select>
        </Field>
      </div>
      {input.currency === "USD" ? (
        <Field label="In pesos" hint={rateHint}>
          <Input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={input.php_amount || ""}
            onChange={(e) => {
              setAutoPesos(false);
              set({ php_amount: Number(e.target.value) });
            }}
          />
        </Field>
      ) : null}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Date">
          <Input
            type="date"
            value={input.spent_on}
            onChange={(e) => {
              set({ spent_on: e.target.value });
              if (input.currency === "USD") setAutoPesos(true);
            }}
          />
        </Field>
        <Field label="Category">
          <Select value={input.category} onChange={(e) => set({ category: e.target.value as studio.CostCategory })}>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label="Paid by" hint="Whose card or wallet paid it.">
        <Input list="cost-payers" value={input.paid_by ?? ""} onChange={(e) => set({ paid_by: e.target.value })} placeholder="Name" />
        <datalist id="cost-payers">
          {payers.map((p) => (
            <option key={p} value={p} />
          ))}
        </datalist>
      </Field>
      <Field label="Note">
        <Input value={input.note ?? ""} onChange={(e) => set({ note: e.target.value })} placeholder="Optional" />
      </Field>

      <ReceiptsField label="Receipts" hint="Screenshots, photos or PDFs, up to 10 MB each." rc={rc} />

      <div className="flex items-center justify-between gap-4">
        <span className="text-[14px] font-medium text-[var(--ink)]">Monthly bill</span>
        <Toggle checked={input.monthly} onChange={(v) => set({ monthly: v })} label="Monthly bill" />
      </div>
      <ErrorText>{error}</ErrorText>
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        {id ? (
          <PillButton type="button" tone="danger" disabled={busy} onClick={() => void remove()}>
            Delete
          </PillButton>
        ) : (
          <span />
        )}
        <PillButton type="submit" tone="primary" disabled={busy || rc.uploading > 0 || rate === "loading"}>
          {busy ? "Saving…" : "Save"}
        </PillButton>
      </div>
    </form>
  );
}

// One receipt: a thumbnail (PDFs get an icon) that opens the full file in a new tab.
function ReceiptTile({ receipt, onRemove }: { receipt: studio.CostReceipt; onRemove: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    void studio.costReceiptUrl(receipt.path).then((u) => live && setUrl(u));
    return () => {
      live = false;
    };
  }, [receipt.path]);
  const image = receipt.type.startsWith("image/");
  return (
    <div className="group relative h-[84px] w-[84px] overflow-hidden rounded-[12px] border border-[var(--line)] bg-[#f6f6f8]">
      <a href={url ?? undefined} target="_blank" rel="noreferrer" title={receipt.name} className="flex h-full w-full items-center justify-center">
        {image && url ? (
          <img src={url} alt={receipt.name} className="h-full w-full object-cover object-top" />
        ) : (
          <span className="flex flex-col items-center gap-1 px-1 text-center text-[11px] text-[var(--slate)]">
            <i className={image ? "ri-image-line text-[20px]" : "ri-file-pdf-2-line text-[20px]"} />
            <span className="line-clamp-2 break-all">{receipt.name}</span>
          </span>
        )}
      </a>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${receipt.name}`}
        className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-[14px] text-[var(--ink)] shadow"
      >
        <i className="ri-close-line" />
      </button>
    </div>
  );
}

const settlementTitle = (s: studio.CostSettlement) =>
  s.amount > 0 ? `${s.from_name ?? "The other partner"} paid ${s.to_name ?? "the other partner"}` : "Settled even";

// Settle up (draft) or an earlier settle-up (settlement). A new one records the payment
// and closes the open costs; it can be undone later, and proof can be added later too.
function SettleForm({
  draft,
  settlement,
  names,
  onDone,
}: {
  draft?: { ids: string[]; total: number; from: string | null; to: string | null; amount: number };
  settlement?: studio.CostSettlement;
  names: string[];
  onDone: (changed: boolean) => void | Promise<void>;
}) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [from, setFrom] = useState(draft?.from ?? "");
  const [paidOn, setPaidOn] = useState(today());
  const [note, setNote] = useState(settlement?.note ?? "");
  const rc = useReceipts(settlement?.receipts ?? [], setError);
  const amount = draft?.amount ?? settlement?.amount ?? 0;
  const to = draft?.to ?? settlement?.to_name ?? null;
  const fromChoices = names.filter((n) => n !== to);

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      if (draft) {
        if (amount > 0 && !from.trim()) throw new Error("Add who sent the money.");
        if (amount > 0 && from.trim().toLowerCase() === to?.toLowerCase()) throw new Error(`${to} can’t pay themselves. Add who sent the money.`);
        await studio.recordSettlement(draft.ids, { paid_on: paidOn, from_name: amount > 0 ? from.trim() : null, to_name: amount > 0 ? to : null, amount, note: note.trim() || null, receipts: rc.receipts });
      } else if (settlement) {
        await studio.updateSettlement(settlement.id, { note: note.trim() || null, receipts: rc.receipts });
      }
      rc.saved();
      await onDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "That didn’t save. Try again.");
      setBusy(false);
    }
  };

  const undo = async () => {
    if (!settlement) return;
    const n = settlement.costs;
    if (!window.confirm(`Undo this settle-up? The ${n} cost${n === 1 ? " goes" : "s go"} back to open${settlement.receipts.length ? " and its proof is deleted" : ""}.`)) return;
    setBusy(true);
    try {
      await studio.undoSettlement(settlement.id);
      rc.discarded();
      await onDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "That didn’t undo. Try again.");
      setBusy(false);
    }
  };

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      {draft ? (
        <div>
          <p className="text-[24px] font-semibold text-[var(--ink)] [font-variant-numeric:tabular-nums]">{amount > 0 ? peso(amount) : "Even"}</p>
          <p className="text-[14px] text-[var(--slate)] [font-variant-numeric:tabular-nums]">
            {amount > 0 ? `To ${to}, for half of ${peso(draft.total)}` : `Nothing to send on ${peso(draft.total)}`} across {draft.ids.length} open cost{draft.ids.length === 1 ? "" : "s"}.
          </p>
          <p className="mt-2 text-[14px] text-[var(--ink)]">{amount > 0 ? "Record it once the money has been sent. You can undo it later." : "This closes the open costs. You can undo it later."}</p>
        </div>
      ) : settlement ? (
        <div>
          <p className="text-[24px] font-semibold text-[var(--ink)] [font-variant-numeric:tabular-nums]">{amount > 0 ? peso(amount) : "Even"}</p>
          <p className="text-[14px] text-[var(--slate)]">
            {settlementTitle(settlement)} on {formatDate(settlement.paid_on)} · closed {settlement.costs} cost{settlement.costs === 1 ? "" : "s"}
          </p>
        </div>
      ) : null}

      {draft && amount > 0 ? (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Sent by">
            <Input list="settle-senders" value={from} onChange={(e) => setFrom(e.target.value)} placeholder="Name" autoFocus={!from} />
            <datalist id="settle-senders">
              {fromChoices.map((n) => (
                <option key={n} value={n} />
              ))}
            </datalist>
          </Field>
          <Field label="Date sent">
            <Input type="date" value={paidOn} max={today()} onChange={(e) => setPaidOn(e.target.value || today())} />
          </Field>
        </div>
      ) : null}

      {amount > 0 ? <ReceiptsField label="Proof of payment" hint="A screenshot of the transfer (GCash, bank app). Optional, and it can be added later." rc={rc} /> : null}

      <Field label="Note">
        <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional, e.g. GCash ref no." />
      </Field>

      <ErrorText>{error}</ErrorText>
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        {settlement ? (
          <PillButton type="button" tone="danger" disabled={busy} onClick={() => void undo()}>
            Undo settle-up
          </PillButton>
        ) : (
          <span />
        )}
        <PillButton type="submit" tone="primary" disabled={busy || rc.uploading > 0}>
          {busy ? "Saving…" : draft ? (amount > 0 ? "Record payment" : "Settle up") : "Save"}
        </PillButton>
      </div>
    </form>
  );
}

// The open balance in pesos: the total, what each payer put in, and who owes whom.
// `owe` is what a settle-up would record (from is null when only one person has paid
// so far, so the form asks who's sending it); null when the payer names need fixing.
function balance(rows: studio.Cost[], payers: string[]) {
  if (!rows.length) return null;
  const total = sum(rows);
  const paid = new Map<string, number>(payers.map((p) => [p, 0]));
  for (const r of rows) if (r.paid_by) paid.set(r.paid_by.trim(), (paid.get(r.paid_by.trim()) ?? 0) + r.php_amount);
  const entries = [...paid.entries()].filter(([, amt]) => amt > 0);
  const half = total / 2;
  let line: string;
  let owe: { from: string | null; to: string | null; amount: number } | null = null;
  if (payers.length < 2) {
    const [only] = payers;
    line = only ? `${only} paid everything so far, so the other partner owes ${only} ${peso(half)}.` : `${peso(half)} each.`;
    if (only) owe = { from: null, to: only, amount: round2(half) };
  } else if (payers.length > 2) line = "More than two payers: check the names (a typo counts as a new person).";
  else {
    const [a, b] = payers;
    const diff = (paid.get(a) ?? 0) - half;
    line = Math.abs(diff) < 0.005 ? "Even." : diff > 0 ? `${b} owes ${a} ${peso(diff)}` : `${a} owes ${b} ${peso(-diff)}`;
    owe = Math.abs(diff) < 0.005 ? { from: null, to: null, amount: 0 } : diff > 0 ? { from: b, to: a, amount: round2(diff) } : { from: a, to: b, amount: round2(-diff) };
  }
  return { total, paid: entries, line, owe };
}
