import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { formatMoney } from "@/pages/account/portal/format";
import * as studio from "./studioApi";

// Studio → Overview: where customers came from (first visit, supabase/revenue.sql),
// and what each source turned into — sign-ups, enquiries, paying customers, money.

const LABEL: Record<string, string> = {
  partner: "Partners (planners & creators)",
  site: "Free sites (“Make your own”)",
  email: "Guest RSVP emails",
  google: "Google & search",
  social: "Social media",
  ads: "Ads",
  other: "Other websites",
  direct: "Typed in / bookmarked",
  unknown: "Before tracking started",
};

export default function SourcesCard() {
  const [days, setDays] = useState(90);
  const [rows, setRows] = useState<studio.SourceRow[] | null | undefined>(undefined);
  useEffect(() => {
    studio.loadSourceReport(days).then(setRows);
  }, [days]);
  if (rows === null) return null; // revenue.sql not run yet

  return (
    <section className="mt-8 rounded-[22px] border border-[var(--line)] bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold text-[var(--ink)]">Where customers come from</h2>
          <p className="text-[13px] text-[var(--slate)]">
            Their first visit. Partner details are on <Link to="/studio/partners" className="text-[var(--acc-blue)] hover:underline">Partners</Link>.
          </p>
        </div>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          aria-label="Period"
          className="min-h-[44px] rounded-full border border-[var(--line)] bg-white px-3 text-[16px] md:min-h-[36px] md:text-[13px]"
        >
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
          <option value={365}>Last 12 months</option>
        </select>
      </div>
      {rows === undefined ? (
        <p className="mt-4 text-[14px] text-[var(--slate)]">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="mt-4 text-[14px] text-[var(--slate)]">No sign-ups or enquiries in this period.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[520px] text-[14px] [font-variant-numeric:tabular-nums]">
            <thead>
              <tr className="text-left text-[12px] uppercase tracking-[0.06em] text-[var(--slate)]">
                <th className="pb-2 font-semibold">Source</th>
                <th className="pb-2 text-right font-semibold">Sign-ups</th>
                <th className="pb-2 text-right font-semibold">Enquiries</th>
                <th className="pb-2 text-right font-semibold">Paying</th>
                <th className="pb-2 text-right font-semibold">Brought in</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--line)]">
              {rows.map((r) => (
                <tr key={r.source}>
                  <td className="py-2.5 pr-3 text-[var(--ink)]">{LABEL[r.source] ?? r.source}</td>
                  <td className="py-2.5 text-right">{r.signups}</td>
                  <td className="py-2.5 text-right">{r.enquiries}</td>
                  <td className="py-2.5 text-right">{r.paying_customers}</td>
                  <td className="py-2.5 text-right font-semibold text-[var(--ink)]">{r.revenue > 0 ? formatMoney(r.revenue) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
