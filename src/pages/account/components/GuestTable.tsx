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
  /** The guest asked for their message to show on the site's message wall (Under Glass). */
  message_public?: boolean | null;
  /** The host hid it from the wall. */
  message_hidden?: boolean | null;
  /** Of guest_count, how many are kids (designs that ask, e.g. Calado). */
  kid_count?: number | null;
  attending?: boolean | null;
  dietary?: string | null;
  answers?: Record<string, string> | null;
  invitee_id?: string | null;
};

/** Save a guest list as a CSV (opens in Excel/Sheets). Also used before deleting a project. */
export function downloadGuestCsv(rows: Guest[], hasDetails = rows.some((g) => g.attending !== undefined && g.attending !== null), fileName = "rsvps.csv") {
  const questions = [...new Set(rows.flatMap((g) => Object.keys(g.answers ?? {})))];
  const kids = rows.some((g) => g.kid_count != null);
  const header = ["Name", "Email", "Mobile", ...(hasDetails ? ["Coming", "Party size", ...(kids ? ["Kids"] : []), "Dietary"] : []), ...questions, "Bringing", "Message", "Submitted"];
  // Every cell quoted with its quotes doubled; a leading = + - @ is neutralised so a
  // name can't run as a spreadsheet formula.
  const cell = (v: string) => `"${(/^[=+\-@]/.test(v) ? `'${v}` : v).replace(/"/g, '""')}"`;
  const lines = rows.map((g) => [
    g.name ?? "",
    g.email ?? "",
    g.phone ?? "",
    ...(hasDetails
      ? [g.attending === true ? "Yes" : g.attending === false ? "No" : "", g.attending ? String(g.guest_count ?? 1) : "", ...(kids ? [g.attending ? String(g.kid_count ?? 0) : ""] : []), g.dietary ?? ""]
      : []),
    ...questions.map((q) => g.answers?.[q] ?? ""),
    g.bringing ?? "",
    g.message ?? "",
    g.created_at ? new Date(g.created_at).toLocaleDateString("en-PH") : "",
  ]);
  const csv = [header, ...lines].map((r) => r.map(cell).join(",")).join("\n");
  // The BOM tells Excel it's UTF-8, so names like "Ñ" come through intact.
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

/** `manage`: DIY projects — add a reply by hand, edit or remove one (supabase/host-rsvps.sql). */
export type GuestManage = { onAdd: () => void; onEdit: (g: Guest) => void; onDelete: (g: Guest) => void };

/** A message the guest shared to the wall: whether it shows, and the host's switch. */
function WallSwitch({ g, onToggle }: { g: Guest; onToggle?: (g: Guest) => void }) {
  if (!g.message_public || !g.message) return null;
  return (
    <span className="mt-1 flex flex-wrap items-center gap-x-2 text-[12.5px] not-italic" style={{ color: "var(--slate)" }}>
      {g.message_hidden ? "Hidden from your website" : "On your website’s message wall"}
      {onToggle ? (
        <button type="button" onClick={() => onToggle(g)} className="min-h-[36px] font-medium text-[var(--acc-blue)] hover:underline">
          {g.message_hidden ? "Show it" : "Hide it"}
        </button>
      ) : null}
    </span>
  );
}

export default function GuestTable({ guests, manage, onToggleWall }: { guests: Guest[]; manage?: GuestManage; onToggleWall?: (g: Guest) => void }) {
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
  const kidcount = coming.reduce((n, g) => n + (g.kid_count ?? 0), 0);
  const dietaryNotes = coming.filter((g) => g.dietary).length;

  const exportCsv = () => downloadGuestCsv(filtered, hasDetails);
  // Totals for the hosts' questions with a few set answers (e.g. 42 Beef · 18 Fish).
  const tallies = useMemo(() => {
    const by: Record<string, Record<string, number>> = {};
    for (const g of guests) {
      if (g.attending === false) continue;
      for (const [q, a] of Object.entries(g.answers ?? {})) {
        if (q === "Party") continue;
        (by[q] ??= {})[a] = (by[q][a] ?? 0) + 1;
      }
    }
    return Object.entries(by).filter(([, counts]) => Object.keys(counts).length <= 8);
  }, [guests]);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <input
          type="text"
          placeholder="Search name, email or mobile…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full flex-1 rounded-xl px-4 py-3 text-[16px] outline-none sm:w-auto sm:min-w-[220px] md:text-[15px]"
          style={{ background: "#fff", border: "1px solid rgba(0,7,39,0.16)" }}
        />
        {/* Phones: the filters share one full-width row (no buttons cut off at the edge). */}
        <div
          className="grid w-full overflow-hidden rounded-xl sm:flex sm:w-auto"
          style={{ border: "1px solid var(--line)", gridTemplateColumns: `repeat(${hasDetails ? 4 : 3}, minmax(0, 1fr))` }}
        >
          {(hasDetails ? (["all", "coming", "declined", "with"] as const) : (["all", "with", "without"] as const)).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="min-h-[48px] px-2 py-2 text-[13px] font-medium leading-tight transition-colors sm:px-4 sm:py-3"
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
        {manage ? (
          <button onClick={manage.onAdd} className="btn btn-dark !py-3 !px-5 !text-[12px]">
            Add a reply
          </button>
        ) : null}
      </div>

      {tallies.length ? (
        <div className="mb-5 grid gap-3 sm:grid-cols-2">
          {tallies.map(([q, counts]) => (
            <div key={q} className="rounded-2xl bg-white px-4 py-3" style={{ border: "1px solid var(--line)" }}>
              <p className="text-[13px] font-semibold" style={{ color: "var(--ink)" }}>{q}</p>
              <p className="mt-1 text-[14px]" style={{ color: "var(--slate)" }}>
                {Object.entries(counts)
                  .sort((x, y) => y[1] - x[1])
                  .map(([a, n]) => `${n} ${a}`)
                  .join(" · ")}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      {/* Phones: one card per guest instead of a 7-column table. */}
      <ul className="space-y-3 md:hidden">
        {filtered.map((g) => (
          <li key={g.id} className="rounded-2xl bg-white px-4 py-4" style={{ border: "1px solid var(--line)" }}>
            <div className="flex items-start justify-between gap-3">
              <p className="min-w-0 break-words text-[16px] font-semibold" style={{ color: "var(--ink)" }}>{g.name || "—"}</p>
              {hasDetails && g.attending === true ? (
                <span className="shrink-0 rounded-full px-2.5 py-1 text-[12px] font-semibold" style={{ background: "#ecfbcc", color: "#3d5a12" }}>
                  Coming{g.guest_count && g.guest_count > 1 ? ` · ${g.guest_count}` : ""}
                  {g.kid_count ? ` (${g.kid_count} ${g.kid_count === 1 ? "kid" : "kids"})` : ""}
                </span>
              ) : hasDetails && g.attending === false ? (
                <span className="shrink-0 rounded-full px-2.5 py-1 text-[12px] font-semibold" style={{ background: "#ececec", color: "#55556a" }}>Not coming</span>
              ) : null}
            </div>
            {g.email || g.phone ? (
              <p className="mt-0.5 break-all text-[14px]" style={{ color: "var(--slate)" }}>
                {[g.email, g.phone].filter(Boolean).join(" · ")}
              </p>
            ) : null}
            {hasDetails && g.dietary ? (
              <p className="mt-2 text-[14px]" style={{ color: "var(--ink)" }}>
                <span style={{ color: "var(--slate)" }}>Dietary: </span>
                {g.dietary}
              </p>
            ) : null}
            {Object.entries(g.answers ?? {}).map(([q, ans]) => (
              <p key={q} className="mt-2 text-[14px]" style={{ color: "var(--ink)" }}>
                <span style={{ color: "var(--slate)" }}>{q}: </span>
                {ans}
              </p>
            ))}
            {g.bringing ? (
              <p className="mt-2 text-[14px]" style={{ color: "var(--ink)" }}>
                <span style={{ color: "var(--slate)" }}>Bringing: </span>
                {g.bringing}
              </p>
            ) : null}
            {g.message ? (
              <p className="mt-2 text-[14px] italic" style={{ color: "var(--slate)" }}>
                “{g.message}”
                <WallSwitch g={g} onToggle={onToggleWall} />
              </p>
            ) : null}
            {g.created_at ? (
              <p className="mt-2 text-[12px]" style={{ color: "var(--slate)" }}>
                {new Date(g.created_at).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
              </p>
            ) : null}
            {manage ? (
              <div className="mt-2 flex gap-4">
                <button onClick={() => manage.onEdit(g)} className="min-h-[40px] text-[14px] font-medium text-[var(--acc-blue)]">Edit</button>
                <button onClick={() => manage.onDelete(g)} className="min-h-[40px] text-[14px] font-medium text-[#c2412d]">Remove</button>
              </div>
            ) : null}
          </li>
        ))}
        {filtered.length === 0 && (
          <li className="rounded-2xl px-5 py-8 text-center text-[14px]" style={{ border: "1px solid var(--line)", color: "var(--slate)" }}>
            No RSVPs match.
          </li>
        )}
      </ul>

      <div className="hidden overflow-x-auto rounded-2xl md:block" style={{ border: "1px solid var(--line)" }}>
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
              <th className="px-5 py-3 font-medium text-[12px] uppercase tracking-wide">{tallies.length || guests.some((g) => g.answers && Object.keys(g.answers).length) ? "Answers & message" : "Message"}</th>
              <th className="px-5 py-3 font-medium text-[12px] uppercase tracking-wide">Submitted</th>
              {manage ? <th className="px-5 py-3" /> : null}
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
                    <td className="px-5 py-3">
                      {g.attending ? g.guest_count ?? 1 : "—"}
                      {g.attending && g.kid_count ? <span style={{ color: "var(--slate)" }}>{` (${g.kid_count} ${g.kid_count === 1 ? "kid" : "kids"})`}</span> : null}
                    </td>
                    <td className="px-5 py-3" style={{ color: "var(--slate)" }}>{g.dietary || "—"}</td>
                  </>
                ) : null}
                <td className="px-5 py-3" style={{ color: "var(--slate)" }}>
                  {Object.entries(g.answers ?? {}).map(([q, ans]) => (
                    <span key={q} className="block not-italic">
                      {q}: <span style={{ color: "var(--ink)" }}>{ans}</span>
                    </span>
                  ))}
                  <span className="italic">{g.message || (g.answers && Object.keys(g.answers).length ? "" : "—")}</span>
                  <WallSwitch g={g} onToggle={onToggleWall} />
                </td>
                <td className="px-5 py-3" style={{ color: "var(--slate)" }}>
                  {g.created_at ? new Date(g.created_at).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                </td>
                {manage ? (
                  <td className="whitespace-nowrap px-5 py-3 text-right">
                    <button onClick={() => manage.onEdit(g)} className="mr-3 text-[13px] font-medium text-[var(--acc-blue)] hover:underline">Edit</button>
                    <button onClick={() => manage.onDelete(g)} className="text-[13px] font-medium text-[#c2412d] hover:underline">Remove</button>
                  </td>
                ) : null}
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={(hasDetails ? 7 : 4) + (manage ? 1 : 0)} className="px-5 py-8 text-center" style={{ color: "var(--slate)" }}>
                  No RSVPs match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-[13px]" style={{ color: "var(--slate)" }}>
        {hasDetails
          ? `${coming.length} coming (${headcount} ${headcount === 1 ? "person" : "people"} in total${kidcount ? `, ${kidcount} ${kidcount === 1 ? "kid" : "kids"}` : ""}) · ${declined} can’t make it${dietaryNotes ? ` · ${dietaryNotes} with dietary needs` : ""} · ${withMessage} left a message.`
          : `${withMessage} of ${guests.length} left a message.`}
      </p>
    </div>
  );
}
