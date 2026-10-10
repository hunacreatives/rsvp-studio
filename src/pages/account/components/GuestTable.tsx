import { useMemo, useState } from "react";

export type Guest = {
  id: string;
  name: string | null;
  email: string | null;
  /** Shared `rsvps` table only: guests can answer with a mobile number instead. */
  phone?: string | null;
  message: string | null;
  created_at: string | null;
  bringing?: string | null;
  guest_count?: number | null;
  attending?: boolean | null;
  dietary?: string | null;
};

export default function GuestTable({ guests }: { guests: Guest[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "with" | "without" | "coming" | "declined">("all");
  // Only newer RSVP forms ask whether guests are coming; older event
  // tables don't have these answers, so the columns appear only when used.
  const hasDetails = guests.some((g) => g.attending !== undefined && g.attending !== null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return guests.filter((g) => {
      if (q && !`${g.name ?? ""} ${g.email ?? ""} ${g.phone ?? ""}`.toLowerCase().includes(q)) return false;
      if (filter === "with" && !g.message) return false;
      if (filter === "without" && g.message) return false;
      if (filter === "coming" && g.attending !== true) return false;
      if (filter === "declined" && g.attending !== false) return false;
      return true;
    });
  }, [guests, query, filter]);

  const withMessage = guests.filter((g) => g.message).length;
  const coming = guests.filter((g) => g.attending === true);
  const declined = guests.filter((g) => g.attending === false).length;
  const headcount = coming.reduce((n, g) => n + (g.guest_count ?? 1), 0);
  const dietaryNotes = coming.filter((g) => g.dietary).length;

  const exportCsv = () => {
    const header = ["Name", "Email", "Mobile", ...(hasDetails ? ["Coming", "Party size", "Dietary"] : []), "Bringing", "Message", "Submitted"];
    const rows = filtered.map((g) => [
      g.name ?? "",
      g.email ?? "",
      g.phone ?? "",
      ...(hasDetails
        ? [g.attending === true ? "Yes" : g.attending === false ? "No" : "", g.attending ? String(g.guest_count ?? 1) : "", (g.dietary ?? "").replace(/"/g, '""')]
        : []),
      g.bringing ?? "",
      (g.message ?? "").replace(/"/g, '""'),
      g.created_at ? new Date(g.created_at).toLocaleDateString("en-PH") : "",
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((cell) => `"${cell}"`).join(","))
      .join("\n");
    // The BOM tells Excel it's UTF-8, so names like "Ñ" come through intact.
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "rsvps.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <input
          type="text"
          placeholder="Search name, email or mobile…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 min-w-[220px] rounded-xl px-4 py-3 text-[15px] outline-none"
          style={{ background: "#fff", border: "1px solid var(--line)" }}
        />
        <div className="flex rounded-xl overflow-hidden" style={{ border: "1px solid var(--line)" }}>
          {(hasDetails ? (["all", "coming", "declined", "with"] as const) : (["all", "with", "without"] as const)).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-4 py-3 text-[13px] font-medium transition-colors"
              style={{
                background: filter === f ? "var(--ink)" : "transparent",
                color: filter === f ? "#fff" : "var(--slate)",
              }}
            >
              {f === "all" ? "All" : f === "with" ? "With Message" : f === "without" ? "No Message" : f === "coming" ? "Coming" : "Declined"}
            </button>
          ))}
        </div>
        <span className="text-[13px]" style={{ color: "var(--slate)" }}>
          {filtered.length} records
        </span>
        <button onClick={exportCsv} className="btn btn-ghost !py-3 !px-5 !text-[12px]">
          Export CSV
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl" style={{ border: "1px solid var(--line)" }}>
        <table className="w-full text-left text-[14px]">
          <thead>
            <tr style={{ background: "var(--paper)", color: "var(--slate)" }}>
              <th className="px-5 py-3 font-medium text-[12px] uppercase tracking-wide">Name</th>
              <th className="px-5 py-3 font-medium text-[12px] uppercase tracking-wide">Contact</th>
              {hasDetails ? (
                <>
                  <th className="px-5 py-3 font-medium text-[12px] uppercase tracking-wide">Coming?</th>
                  <th className="px-5 py-3 font-medium text-[12px] uppercase tracking-wide">Party</th>
                  <th className="px-5 py-3 font-medium text-[12px] uppercase tracking-wide">Dietary</th>
                </>
              ) : null}
              <th className="px-5 py-3 font-medium text-[12px] uppercase tracking-wide">Message</th>
              <th className="px-5 py-3 font-medium text-[12px] uppercase tracking-wide">Submitted</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((g) => (
              <tr key={g.id} style={{ borderTop: "1px solid var(--line)" }}>
                <td className="px-5 py-3">{g.name}</td>
                <td className="px-5 py-3" style={{ color: "var(--slate)" }}>
                  {g.email}
                  {g.email && g.phone ? <br /> : null}
                  {g.phone}
                </td>
                {hasDetails ? (
                  <>
                    <td className="px-5 py-3">
                      {g.attending === true ? (
                        <span className="rounded-full px-2.5 py-1 text-[12px] font-semibold" style={{ background: "#ecfbcc", color: "#3d5a12" }}>Yes</span>
                      ) : g.attending === false ? (
                        <span className="rounded-full px-2.5 py-1 text-[12px] font-semibold" style={{ background: "#ececec", color: "#55556a" }}>No</span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-5 py-3">{g.attending ? g.guest_count ?? 1 : "—"}</td>
                    <td className="px-5 py-3" style={{ color: "var(--slate)" }}>{g.dietary || "—"}</td>
                  </>
                ) : null}
                <td className="px-5 py-3 italic" style={{ color: "var(--slate)" }}>{g.message || "—"}</td>
                <td className="px-5 py-3" style={{ color: "var(--slate)" }}>
                  {g.created_at ? new Date(g.created_at).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={hasDetails ? 7 : 4} className="px-5 py-8 text-center" style={{ color: "var(--slate)" }}>
                  No RSVPs match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-[13px]" style={{ color: "var(--slate)" }}>
        {hasDetails
          ? `${coming.length} coming (${headcount} ${headcount === 1 ? "person" : "people"} in total) · ${declined} can’t make it${dietaryNotes ? ` · ${dietaryNotes} with dietary needs` : ""} · ${withMessage} left a message.`
          : `${withMessage} of ${guests.length} left a message.`}
      </p>
    </div>
  );
}
