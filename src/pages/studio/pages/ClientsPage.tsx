import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { usePortal } from "@/pages/account/portal/PortalContext";
import { formatDate, formatMoney } from "@/pages/account/portal/format";
import { Avatar } from "@/pages/account/portal/ui";
import { StudioHeader, useStudio } from "../StudioLayout";

export default function ClientsPage() {
  const { projects, invoices, demo } = usePortal();
  const { directory, owners, members } = useStudio();
  const [query, setQuery] = useState("");

  // project ids per client (owner or member)
  const projectsOf = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const p of projects) {
      const ids = [owners[p.id]?.id ?? p.owner_id, ...(members[p.id] ?? []).map((m) => m.id)].filter(Boolean) as string[];
      for (const id of ids) (map[id] ??= []).push(p.id);
    }
    return map;
  }, [projects, owners, members]);

  const q = query.trim().toLowerCase();
  const shown = directory.filter((c) => !q || `${c.full_name ?? ""} ${c.email ?? ""} ${c.phone ?? ""}`.toLowerCase().includes(q));

  return (
    <>
      <StudioHeader title="Clients" sub="Everyone with a client account. To link someone to a project, open the project and send them an invite code." />
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by name, email, or phone"
        className="mb-5 w-full max-w-md rounded-full border border-[var(--line)] bg-white px-4 py-2.5 text-[16px] outline-none focus:border-[var(--ink)] md:text-[14px]"
      />
      {demo ? <p className="mb-4 text-[13px] text-[var(--slate)]">Client accounts aren’t included in demo data.</p> : null}
      {/* Phones: one card per client. */}
      <ul className="space-y-3 md:hidden">
        {shown.map((c) => {
          const ids = projectsOf[c.id] ?? [];
          return (
            <li key={c.id} className="rounded-[20px] border border-[var(--line)] bg-white p-4">
              <div className="flex items-center gap-3">
                <Avatar name={c.full_name} seed={c.id} url={c.avatar_url} size={40} />
                <span className="min-w-0">
                  <span className="block text-[15px] font-semibold text-[var(--ink)]">{c.full_name || "—"}</span>
                  <span className="block break-all text-[13px] text-[var(--slate)]">{c.email}</span>
                </span>
              </div>
              <p className="mt-3 text-[13px] text-[var(--slate)]">
                {[c.phone, c.location].filter(Boolean).join(" · ") || "No phone or location"} · joined {formatDate(c.created_at)}
              </p>
              {ids.length ? (
                <span className="mt-2 flex flex-wrap gap-1.5">
                  {ids.slice(0, 3).map((id) => (
                    <Link key={id} to={`/studio/projects?project=${id}`} className="inline-flex min-h-[36px] items-center rounded-full bg-[var(--paper)] px-3 text-[13px] text-[var(--ink)]">
                      {projects.find((p) => p.id === id)?.name}
                    </Link>
                  ))}
                  {ids.length > 3 ? <span className="self-center text-[13px] text-[var(--slate)]">+{ids.length - 3} more</span> : null}
                </span>
              ) : (
                <p className="mt-2 text-[13px] text-[var(--slate)]">Not linked to a project</p>
              )}
              <ClientInvoices ids={ids} who={c.email ?? c.full_name ?? ""} />
            </li>
          );
        })}
        {!shown.length ? <li className="rounded-[20px] border border-[var(--line)] bg-white px-5 py-10 text-center text-[14px] text-[var(--slate)]">No clients yet.</li> : null}
      </ul>

      <div className="hidden overflow-x-auto rounded-[22px] border border-[var(--line)] bg-white md:block">
        <table className="w-full min-w-[720px] text-left text-[14px]">
          <thead>
            <tr className="border-b border-[var(--line)] text-[12px] uppercase tracking-[0.06em] text-[var(--slate)]">
              <th className="px-5 py-3 font-medium">Client</th>
              <th className="px-5 py-3 font-medium">Phone · location</th>
              <th className="px-5 py-3 font-medium">Projects</th>
              <th className="px-5 py-3 font-medium">Invoices</th>
              <th className="px-5 py-3 font-medium">Joined</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((c) => {
              const ids = projectsOf[c.id] ?? [];
              return (
                <tr key={c.id} className="border-b border-[var(--line)] last:border-0">
                  <td className="px-5 py-3">
                    <span className="flex items-center gap-3">
                      <Avatar name={c.full_name} seed={c.id} url={c.avatar_url} size={36} />
                      <span>
                        <span className="block text-[var(--ink)]">{c.full_name || "—"}</span>
                        <span className="block text-[12px] text-[var(--slate)]">{c.email}</span>
                      </span>
                    </span>
                  </td>
                  <td className="px-5 py-3 text-[var(--slate)]">{[c.phone, c.location].filter(Boolean).join(" · ") || "—"}</td>
                  <td className="px-5 py-3">
                    {ids.length ? (
                      <span className="flex flex-wrap gap-1.5">
                        {ids.slice(0, 3).map((id) => (
                          <Link key={id} to={`/studio/projects?project=${id}`} className="rounded-full bg-[var(--paper)] px-2.5 py-0.5 text-[12px] text-[var(--ink)] hover:bg-[#ececee]">
                            {projects.find((p) => p.id === id)?.name}
                          </Link>
                        ))}
                        {ids.length > 3 ? <span className="text-[12px] text-[var(--slate)]">+{ids.length - 3} more</span> : null}
                      </span>
                    ) : (
                      <span className="text-[13px] text-[var(--slate)]">Not linked</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    {(() => {
                      const mine = invoices.filter((i) => ids.includes(i.event_id) && i.status !== "void");
                      if (!mine.length) return <span className="text-[13px] text-[var(--slate)]">None</span>;
                      const owed = mine.filter((i) => i.status === "open").reduce((s, i) => s + i.amount, 0);
                      return (
                        <Link to={`/studio/invoices?q=${encodeURIComponent(c.email ?? c.full_name ?? "")}`} className="text-[13px] text-[var(--acc-blue)] hover:underline">
                          {mine.length} invoice{mine.length === 1 ? "" : "s"}
                          {owed ? <span className="text-[#c2412d]"> · {formatMoney(owed)} unpaid</span> : null} →
                        </Link>
                      );
                    })()}
                  </td>
                  <td className="px-5 py-3 text-[var(--slate)]">{formatDate(c.created_at)}</td>
                </tr>
              );
            })}
            {!shown.length ? (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-[var(--slate)]">No clients yet.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </>
  );
}

/** Phones: the client's invoice total, linking to their invoices. */
function ClientInvoices({ ids, who }: { ids: string[]; who: string }) {
  const { invoices } = usePortal();
  const mine = invoices.filter((i) => ids.includes(i.event_id) && i.status !== "void");
  if (!mine.length) return null;
  const owed = mine.filter((i) => i.status === "open").reduce((s, i) => s + i.amount, 0);
  return (
    <Link to={`/studio/invoices?q=${encodeURIComponent(who)}`} className="mt-2 inline-flex min-h-[44px] items-center text-[14px] text-[var(--acc-blue)]">
      {mine.length} invoice{mine.length === 1 ? "" : "s"}
      {owed ? <span className="text-[#c2412d]">&nbsp;· {formatMoney(owed)} unpaid</span> : null}&nbsp;→
    </Link>
  );
}
