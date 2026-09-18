import { useMemo, useState } from "react";

export type Guest = {
  id: string;
  name: string | null;
  email: string | null;
  message: string | null;
  created_at: string | null;
  bringing?: string | null;
  guest_count?: number | null;
};

export default function GuestTable({ guests }: { guests: Guest[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "with" | "without">("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return guests.filter((g) => {
      if (q && !`${g.name ?? ""} ${g.email ?? ""}`.toLowerCase().includes(q)) return false;
      if (filter === "with" && !g.message) return false;
      if (filter === "without" && g.message) return false;
      return true;
    });
  }, [guests, query, filter]);

  const withMessage = guests.filter((g) => g.message).length;

  const exportCsv = () => {
    const header = ["Name", "Email", "Bringing", "Message", "Submitted"];
    const rows = filtered.map((g) => [
      g.name ?? "",
      g.email ?? "",
      g.bringing ?? "",
      (g.message ?? "").replace(/"/g, '""'),
      g.created_at ? new Date(g.created_at).toLocaleDateString() : "",
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((cell) => `"${cell}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
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
          placeholder="Search name or email..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 min-w-[220px] rounded-xl px-4 py-3 text-[15px] outline-none"
          style={{ background: "#fff", border: "1px solid var(--line)" }}
        />
        <div className="flex rounded-xl overflow-hidden" style={{ border: "1px solid var(--line)" }}>
          {(["all", "with", "without"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-4 py-3 text-[13px] font-medium transition-colors"
              style={{
                background: filter === f ? "var(--ink)" : "transparent",
                color: filter === f ? "#fff" : "var(--slate)",
              }}
            >
              {f === "all" ? "All" : f === "with" ? "With Message" : "No Message"}
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
              <th className="px-5 py-3 font-medium text-[12px] uppercase tracking-wide">Email</th>
              <th className="px-5 py-3 font-medium text-[12px] uppercase tracking-wide">Message</th>
              <th className="px-5 py-3 font-medium text-[12px] uppercase tracking-wide">Submitted</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((g) => (
              <tr key={g.id} style={{ borderTop: "1px solid var(--line)" }}>
                <td className="px-5 py-3">{g.name}</td>
                <td className="px-5 py-3" style={{ color: "var(--slate)" }}>{g.email}</td>
                <td className="px-5 py-3 italic" style={{ color: "var(--slate)" }}>{g.message || "—"}</td>
                <td className="px-5 py-3" style={{ color: "var(--slate)" }}>
                  {g.created_at ? new Date(g.created_at).toLocaleDateString() : "—"}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-8 text-center" style={{ color: "var(--slate)" }}>
                  No RSVPs match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-[13px]" style={{ color: "var(--slate)" }}>
        {withMessage} of {guests.length} left a message.
      </p>
    </div>
  );
}
