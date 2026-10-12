import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { usePortal } from "@/pages/account/portal/PortalContext";
import { formatDate, formatMoney as money } from "@/pages/account/portal/format";
const formatMoney = (n: number) => money(Math.round(n));
import { FilterTabs } from "@/pages/account/portal/ui";
import { StudioHeader } from "../StudioLayout";
import * as studio from "../studioApi";

// Studio → Revenue (owner only, supabase/revenue-report.sql): what came in, what it
// cost (partner commissions, Vercel's domain price) and what the studio keeps — for a
// period, by source, and month by month.

type Period = "month" | "last" | "quarter" | "year" | "all";
type Source = studio.RevenueItem["source"];

const SOURCES: { id: Source; label: string; color: string }[] = [
  { id: "package", label: "Packages", color: "#000727" },
  { id: "premium", label: "Premium sites", color: "#2f61d5" },
  { id: "domain", label: "Custom domains", color: "#3fb6dc" },
  { id: "renewal", label: "Domain renewals", color: "#7540ee" },
];
const METHOD: Record<string, string> = { gcash: "GCash", paymaya: "Maya", card: "Card", qrph: "QR Ph", grab_pay: "GrabPay", billease: "BillEase", dob: "Online banking" };

function range(p: Period, now = new Date()): { from: Date; to: Date; prevFrom: Date; prevTo: Date; label: string } {
  const y = now.getFullYear();
  const m = now.getMonth();
  if (p === "month") return { from: new Date(y, m, 1), to: new Date(y, m + 1, 1), prevFrom: new Date(y, m - 1, 1), prevTo: new Date(y, m, 1), label: "last month" };
  if (p === "last") return { from: new Date(y, m - 1, 1), to: new Date(y, m, 1), prevFrom: new Date(y, m - 2, 1), prevTo: new Date(y, m - 1, 1), label: "the month before" };
  if (p === "quarter") {
    const q = Math.floor(m / 3) * 3;
    return { from: new Date(y, q, 1), to: new Date(y, q + 3, 1), prevFrom: new Date(y, q - 3, 1), prevTo: new Date(y, q, 1), label: "last quarter" };
  }
  if (p === "year") return { from: new Date(y, 0, 1), to: new Date(y + 1, 0, 1), prevFrom: new Date(y - 1, 0, 1), prevTo: new Date(y, 0, 1), label: "last year" };
  return { from: new Date(2020, 0, 1), to: new Date(y + 1, 0, 1), prevFrom: new Date(2020, 0, 1), prevTo: new Date(2020, 0, 1), label: "" };
}

// ?demo: sample payments over the last year, to see the page with numbers.
function demoItems(): studio.RevenueItem[] {
  const out: studio.RevenueItem[] = [];
  const now = new Date();
  const add = (monthsAgo: number, day: number, source: Source, amount: number, cost = 0, commission = 0, label = "", method = "gcash") =>
    out.push({ paid_at: new Date(now.getFullYear(), now.getMonth() - monthsAgo, monthsAgo ? day : Math.min(day, now.getDate()), 10).toISOString(), source, amount, cost, commission, event_id: null, label, method });
  for (let m = 0; m < 12; m++) {
    const k = 12 - m;
    add(m, 3, "package", 8000 + k * 600, 0, m % 3 === 0 ? 720 : 0, "Carlo & Trixia — Custom website", "card");
    if (k > 4) add(m, 9, "package", 3500, 0, 0, "Mia’s 18th — Semi-Custom website");
    for (let i = 0; i < Math.max(1, k - 3); i++) add(m, 10 + i, "premium", i % 2 ? 449 : 499, 0, i % 4 === 0 ? 44.9 : 0, "Premium site", i % 2 ? "gcash" : "qrph");
    if (k % 2 === 0) add(m, 20, "domain", 1499, 675, 0, "gelandmarco.com", "card");
  }
  add(1, 22, "renewal", 1499, 675, 0, "claudyat30.com", "card");
  return out;
}

const totals = (items: studio.RevenueItem[]) => {
  const t = { in: 0, commission: 0, cost: 0 };
  for (const i of items) {
    t.in += i.amount;
    t.commission += i.commission;
    t.cost += i.cost;
  }
  return { ...t, keep: t.in - t.commission - t.cost };
};

function Change({ now, before, label }: { now: number; before: number; label: string }) {
  if (!label) return null;
  if (!before) return <span className="text-[13px] text-[var(--slate)]">{now ? `nothing ${label}` : ""}</span>;
  const pct = Math.round(((now - before) / before) * 100);
  if (pct === 0) return <span className="text-[13px] text-[var(--slate)]">same as {label}</span>;
  return (
    <span className={`text-[13px] font-medium ${pct >= 0 ? "text-[#3d7a12]" : "text-[#b3382c]"}`}>
      {pct >= 0 ? "▲" : "▼"} {Math.abs(pct)}% <span className="font-normal text-[var(--slate)]">vs {label}</span>
    </span>
  );
}

export default function RevenuePage() {
  const { invoices, demo } = usePortal();
  const [owner, setOwner] = useState<boolean | null>(null);
  const [period, setPeriod] = useState<Period>("month");
  const r = useMemo(() => range(period), [period]);
  const [items, setItems] = useState<studio.RevenueItem[] | null | undefined>(undefined);
  const [prev, setPrev] = useState<studio.RevenueItem[]>([]);
  const [year, setYear] = useState<studio.RevenueItem[]>([]);
  const [payouts, setPayouts] = useState<{ amount: number }[]>([]);

  useEffect(() => {
    if (demo) return setOwner(true);
    studio.isOwner().then(setOwner);
  }, [demo]);

  useEffect(() => {
    if (owner && demo) {
      const all = demoItems();
      const within = (a: Date, b: Date) => all.filter((i) => new Date(i.paid_at) >= a && new Date(i.paid_at) < b);
      setItems(within(r.from, r.to));
      setPrev(within(r.prevFrom, r.prevTo));
      return;
    }
    if (!owner || demo) return;
    setItems(undefined);
    studio.loadRevenue(r.from, r.to).then(setItems);
    studio.loadRevenue(r.prevFrom, r.prevTo).then((x) => setPrev(x ?? []));
    studio.loadPayouts(r.from, r.to).then(setPayouts);
  }, [owner, demo, r]);

  // The last 12 months, for the chart (loaded once).
  const months = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 12 }, (_, i) => new Date(now.getFullYear(), now.getMonth() - 11 + i, 1));
  }, []);
  useEffect(() => {
    if (owner && demo) return setYear(demoItems());
    if (!owner || demo) return;
    studio.loadRevenue(months[0], new Date(months[11].getFullYear(), months[11].getMonth() + 1, 1)).then((x) => setYear(x ?? []));
  }, [owner, demo, months]);

  if (owner === null) return <StudioHeader title="Revenue" sub="Loading…" />;
  if (!owner)
    return (
      <>
        <StudioHeader title="Revenue" />
        <p className="text-[14px] text-[var(--slate)]">Only the studio owner can see revenue.</p>
      </>
    );
  if (items === null)
    return (
      <>
        <StudioHeader title="Revenue" />
        <p className="text-[14px] text-[var(--slate)]">Run supabase/revenue-report.sql on the live database to switch on the revenue report.</p>
      </>
    );

  const list = items ?? [];
  const t = totals(list);
  const p = totals(prev);
  const open = invoices.filter((i) => i.status === "open");
  const outstanding = open.reduce((s, i) => s + Number(i.amount), 0);
  const overdue = open.filter((i) => i.due_date && new Date(i.due_date) < new Date());

  const bySource = SOURCES.map((s) => {
    const rows = list.filter((i) => i.source === s.id);
    const x = totals(rows);
    return { ...s, count: rows.length, ...x };
  });
  const monthly = months.map((d) => {
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const rows = year.filter((i) => {
      const pd = new Date(i.paid_at);
      return `${pd.getFullYear()}-${pd.getMonth()}` === key;
    });
    return { d, total: rows.reduce((s, i) => s + i.amount, 0), parts: SOURCES.map((s) => rows.filter((i) => i.source === s.id).reduce((a, i) => a + i.amount, 0)) };
  });
  const peak = Math.max(1, ...monthly.map((m) => m.total));

  const tiles = [
    { label: "Money in", value: t.in, before: p.in },
    { label: "Partner commissions", value: t.commission, before: p.commission },
    { label: "Domain costs", value: t.cost, before: p.cost },
    { label: "You keep", value: t.keep, before: p.keep, strong: true },
  ];

  return (
    <>
      <StudioHeader title="Revenue" />

      <div className="mb-5">
        <FilterTabs<Period>
          value={period}
          onChange={setPeriod}
          options={[
            { value: "month", label: "This month" },
            { value: "last", label: "Last month" },
            { value: "quarter", label: "This quarter" },
            { value: "year", label: "This year" },
            { value: "all", label: "All time" },
          ]}
        />
      </div>

      {/* Totals */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {tiles.map((x) => (
          <div key={x.label} className={`min-w-0 rounded-[20px] border px-4 py-3.5 sm:px-5 sm:py-4 ${x.strong ? "border-[var(--ink)] bg-white" : "border-[var(--line)] bg-white"}`}>
            <p className="text-[12px] font-semibold uppercase tracking-[0.06em] text-[var(--slate)] sm:tracking-[0.08em]">{x.label}</p>
            <p className="mt-1 break-words text-[22px] font-semibold text-[var(--ink)] [font-variant-numeric:tabular-nums] sm:text-[28px]">{items === undefined ? "…" : formatMoney(x.value)}</p>
            <Change now={x.value} before={x.before} label={r.label} />
          </div>
        ))}
      </div>

      {/* By source */}
      <section className="mt-6 rounded-[22px] border border-[var(--line)] bg-white p-5">
        <h2 className="text-[15px] font-semibold text-[var(--ink)]">By source</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[560px] text-[14px] [font-variant-numeric:tabular-nums]">
            <thead>
              <tr className="text-left text-[12px] uppercase tracking-[0.06em] text-[var(--slate)]">
                <th className="pb-2 font-semibold">Source</th>
                <th className="pb-2 text-right font-semibold">Payments</th>
                <th className="pb-2 text-right font-semibold">Money in</th>
                <th className="pb-2 text-right font-semibold">Costs</th>
                <th className="pb-2 text-right font-semibold">You keep</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--line)]">
              {bySource.map((s) => (
                <tr key={s.id}>
                  <td className="py-2.5 pr-3 text-[var(--ink)]">
                    <span className="mr-2 inline-block h-2.5 w-2.5 rounded-full align-middle" style={{ background: s.color }} aria-hidden />
                    {s.label}
                  </td>
                  <td className="py-2.5 text-right">{s.count}</td>
                  <td className="py-2.5 text-right">{s.in ? formatMoney(s.in) : "—"}</td>
                  <td className="py-2.5 text-right text-[var(--slate)]">{s.commission + s.cost ? `−${formatMoney(s.commission + s.cost)}` : "—"}</td>
                  <td className="py-2.5 text-right font-semibold text-[var(--ink)]">{s.in ? formatMoney(s.keep) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Month by month */}
      <section className="mt-6 rounded-[22px] border border-[var(--line)] bg-white p-5">
        <h2 className="text-[15px] font-semibold text-[var(--ink)]">Last 12 months</h2>
        <div className="mt-4 flex h-[180px] items-end gap-1.5 sm:gap-3" role="img" aria-label="Money in for each of the last 12 months">
          {monthly.map((m) => (
            <div key={m.d.toISOString()} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5">
              <div className="flex w-full max-w-[44px] flex-col-reverse overflow-hidden rounded-t-md" style={{ height: `${(m.total / peak) * 100}%`, minHeight: m.total ? 3 : 0 }} title={`${m.d.toLocaleDateString("en-PH", { month: "long", year: "numeric" })}: ${formatMoney(m.total)}`}>
                {m.parts.map((v, i) => (v ? <div key={i} style={{ height: `${(v / m.total) * 100}%`, background: SOURCES[i].color }} /> : null))}
              </div>
              <span className="text-[11px] text-[var(--slate)] sm:text-[12px]">{m.d.toLocaleDateString("en-PH", { month: "short" })}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-[var(--slate)]">
          {SOURCES.map((s) => (
            <span key={s.id} className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} aria-hidden />
              {s.label}
            </span>
          ))}

        </div>
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        {/* Coming in */}
        <section className="rounded-[22px] border border-[var(--line)] bg-white p-5">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-[15px] font-semibold text-[var(--ink)]">Coming in</h2>
            <Link to="/studio/invoices" className="text-[14px] text-[var(--acc-blue)] hover:underline">
              Invoices →
            </Link>
          </div>
          <p className="mt-2 text-[28px] font-semibold text-[var(--ink)] [font-variant-numeric:tabular-nums]">{formatMoney(outstanding)}</p>
          <p className="text-[14px] text-[var(--slate)]">
            {open.length} open invoice{open.length === 1 ? "" : "s"}
            {overdue.length ? <span className="text-[#b3382c]"> · {overdue.length} overdue</span> : null}
          </p>
        </section>

        {/* Recent payments */}
        <section className="rounded-[22px] border border-[var(--line)] bg-white p-5">
          <h2 className="text-[15px] font-semibold text-[var(--ink)]">Payments</h2>
          {!list.length ? (
            <p className="mt-2 text-[14px] text-[var(--slate)]">{items === undefined ? "Loading…" : "None yet."}</p>
          ) : (
            <ul className="mt-2 max-h-[320px] divide-y divide-[var(--line)] overflow-y-auto" data-lenis-prevent>
              {[...list]
                .sort((a, b) => b.paid_at.localeCompare(a.paid_at))
                .map((i, n) => (
                  <li key={n} className="flex items-center gap-3 py-2.5 text-[14px]">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: SOURCES.find((s) => s.id === i.source)?.color }} aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[var(--ink)]">{i.label || SOURCES.find((s) => s.id === i.source)?.label}</p>
                      <p className="text-[12px] text-[var(--slate)]">
                        {formatDate(i.paid_at)}
                        {i.method ? ` · ${METHOD[i.method] ?? i.method}` : ""}
                      </p>
                    </div>
                    <span className="shrink-0 font-semibold text-[var(--ink)] [font-variant-numeric:tabular-nums]">{formatMoney(i.amount)}</span>
                  </li>
                ))}
            </ul>
          )}
        </section>
      </div>
      <p className="mt-6 text-[12px] text-[var(--slate)]">Before PayMongo fees.</p>
    </>
  );
}
