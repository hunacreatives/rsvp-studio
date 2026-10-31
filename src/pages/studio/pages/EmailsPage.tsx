import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatDate } from "@/pages/account/portal/format";
import { usePortal } from "@/pages/account/portal/PortalContext";
import { StudioHeader } from "../StudioLayout";

// Emails: the newsletter list, everyone who left their email with "Notify me"
// (launch_signups, written by the server; staff read it: supabase/launch-signups-staff.sql).
type Signup = { id: string; email: string; source: string | null; created_at: string };

export default function EmailsPage() {
  const { demo } = usePortal();
  const [rows, setRows] = useState<Signup[] | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (demo) return setRows([]);
    supabase
      .from("launch_signups")
      .select("id, email, source, created_at")
      .order("created_at", { ascending: false })
      .then(({ data, error: e }) => {
        if (e) setError("Couldn’t load the list. If this is new, run supabase/launch-signups-staff.sql first.");
        setRows((data as Signup[]) ?? []);
      });
  }, [demo]);

  const q = query.trim().toLowerCase();
  const shown = (rows ?? []).filter((r) => !q || `${r.email} ${r.source ?? ""}`.toLowerCase().includes(q));
  const today = (rows ?? []).filter((r) => new Date(r.created_at).toDateString() === new Date().toDateString()).length;

  const copyAll = async () => {
    await navigator.clipboard.writeText(shown.map((r) => r.email).join(", ")).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };
  const download = () => {
    const csv = ["email,source,signed up", ...shown.map((r) => [r.email, r.source ?? "", r.created_at].map((v) => `"${v.replace(/"/g, '""')}"`).join(","))].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "rsvp-studio-emails.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <>
      <StudioHeader
        title="Emails"
        sub={rows ? `The newsletter list: ${rows.length} ${rows.length === 1 ? "person" : "people"}${today ? `, ${today} today` : ""}.` : "The newsletter list: everyone who signed up with their email."}
      />
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search emails or where they came from"
          className="w-full max-w-md flex-1 rounded-full border border-[var(--line)] bg-white px-4 py-2.5 text-[16px] outline-none focus:border-[var(--ink)] md:text-[14px]"
        />
        <button onClick={copyAll} disabled={!shown.length} className="btn btn-ghost min-h-11 !px-5 disabled:opacity-40">
          {copied ? "Copied" : "Copy emails"}
        </button>
        <button onClick={download} disabled={!shown.length} className="btn btn-ghost min-h-11 !px-5 disabled:opacity-40">
          Download CSV
        </button>
      </div>
      {error ? <p className="mb-4 text-[14px] text-[#c2412d]">{error}</p> : null}
      {demo ? <p className="mb-4 text-[13px] text-[var(--slate)]">Emails aren’t included in demo data.</p> : null}

      {/* Phones: one line each. */}
      <ul className="divide-y divide-[var(--line)] rounded-[20px] border border-[var(--line)] bg-white md:hidden">
        {shown.map((r) => (
          <li key={r.id} className="px-4 py-3">
            <span className="block break-all text-[15px] text-[var(--ink)]">{r.email}</span>
            <span className="block text-[13px] text-[var(--slate)]">
              {r.source || "direct"} · {formatDate(r.created_at)}
            </span>
          </li>
        ))}
        {rows && !shown.length ? <li className="px-5 py-10 text-center text-[14px] text-[var(--slate)]">{q ? "No matches." : "No one yet."}</li> : null}
      </ul>

      <div className="hidden overflow-x-auto rounded-[22px] border border-[var(--line)] bg-white md:block">
        <table className="w-full min-w-[560px] text-left text-[14px]">
          <thead>
            <tr className="border-b border-[var(--line)] text-[12px] uppercase tracking-[0.06em] text-[var(--slate)]">
              <th className="px-5 py-3 font-medium">Email</th>
              <th className="px-5 py-3 font-medium">From</th>
              <th className="px-5 py-3 font-medium">Signed up</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.id} className="border-b border-[var(--line)] last:border-0">
                <td className="px-5 py-3 text-[var(--ink)]">{r.email}</td>
                <td className="px-5 py-3 text-[var(--slate)]">{r.source || "direct"}</td>
                <td className="px-5 py-3 text-[var(--slate)]">{formatDate(r.created_at)}</td>
              </tr>
            ))}
            {rows && !shown.length ? (
              <tr>
                <td colSpan={3} className="px-5 py-10 text-center text-[var(--slate)]">{q ? "No matches." : "No one yet."}</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </>
  );
}
