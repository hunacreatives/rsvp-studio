const STATS = [
  { label: "Total RSVPs", value: "28" },
  { label: "Attending", value: "28" },
  { label: "Declined", value: "0" },
  { label: "Total Guests (incl. +1)", value: "37" },
];

const ROWS: {
  name: string;
  email: string;
  plus1: boolean;
  guest: string;
  dietary: string;
  song: string;
  submitted: string;
}[] = [
  { name: "Coleen Gonzaga", email: "coleen.g@email.com", plus1: false, guest: "—", dietary: "None", song: "Wonderwall — Oasis", submitted: "Jul 10" },
  { name: "Chaysee Belle Gonzaga", email: "chaysee@email.com", plus1: false, guest: "—", dietary: "None", song: "Always — Daniel Caesar", submitted: "Jul 10" },
  { name: "Sesenia Tampos", email: "sesenia.t@email.com", plus1: false, guest: "—", dietary: "Vegetarian", song: "Here I Am — Air Supply", submitted: "Jul 9" },
  { name: "Mario Tampos", email: "mario.t@email.com", plus1: false, guest: "—", dietary: "None", song: "Tougher Than the Rest", submitted: "Jul 9" },
  { name: "Tricia Porter", email: "tricia.p@email.com", plus1: true, guest: "Aurora Porter", dietary: "No dairy", song: "Blackbird — The Beatles", submitted: "Jul 7" },
  { name: "Niña Rica Rafaela", email: "nrica@email.com", plus1: true, guest: "Zana & Cris", dietary: "None", song: "Grow Old With You", submitted: "Jul 6" },
  { name: "Katherine Carausel Belenio", email: "kath.cb@email.com", plus1: true, guest: "Ted Tysone V.", dietary: "None", song: "Die With a Smile", submitted: "Jul 6" },
  { name: "Greg Radan", email: "greg.radan@email.com", plus1: true, guest: "Zhela Marie Radan", dietary: "Nut allergy", song: "Levels — Avicii", submitted: "Jul 5" },
];

/** Faux "RSVP Responses" dashboard — a stand-in for a live screenshot. */
export default function RsvpDashboard({ sidebar = false }: { sidebar?: boolean }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-white shadow-[0_40px_90px_-40px_rgba(0,7,39,0.3)]">
      <div className="flex">
        {sidebar && (
          <aside className="hidden w-44 shrink-0 border-r border-[var(--line)] p-4 sm:block">
            <p className="font-display text-sm font-semibold text-[var(--ink)]">
              The RSVP Studio
            </p>
            <nav className="mt-6 space-y-1 text-[13px]">
              {["Overview", "Responses", "Guests", "Exports", "Settings"].map((n, i) => (
                <p
                  key={n}
                  className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 ${
                    i === 1
                      ? "bg-[var(--paper)] font-medium text-[var(--ink)]"
                      : "text-[var(--slate)]"
                  }`}
                >
                  <i
                    className={
                      ["ri-dashboard-line", "ri-mail-open-line", "ri-group-line", "ri-download-2-line", "ri-settings-3-line"][i]
                    }
                  />
                  {n}
                </p>
              ))}
            </nav>
            <div className="mt-10 border-t border-[var(--line)] pt-4 text-[13px]">
              <p className="font-medium text-[var(--ink)]">Carla &amp; Trixia</p>
              <p className="text-[var(--slate)]">Log out</p>
            </div>
          </aside>
        )}

        <div className="min-w-0 flex-1 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-[var(--ink)]">RSVP Responses</p>
              <p className="text-xs text-[var(--slate)]">Carla &amp; Trixia · 28 November 2026</p>
            </div>
            <span className="rounded-md border border-[var(--line)] px-2.5 py-1 text-xs text-[var(--slate)]">
              Refresh
            </span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {STATS.map((s) => (
              <div key={s.label} className="rounded-lg bg-[var(--paper)] p-3">
                <p className="text-lg font-semibold text-[var(--ink)]">{s.value}</p>
                <p className="text-[10px] uppercase tracking-wide text-[var(--slate)]">
                  {s.label}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center gap-3">
            <span className="flex-1 rounded-md border border-[var(--line)] px-3 py-1.5 text-xs text-[var(--slate)]">
              Search name or email…
            </span>
            <div className="flex gap-1 text-xs">
              <span className="rounded-md bg-[var(--ink)] px-2.5 py-1 text-white">All</span>
              <span className="rounded-md px-2.5 py-1 text-[var(--slate)]">Attending</span>
              <span className="rounded-md px-2.5 py-1 text-[var(--slate)]">Declined</span>
            </div>
          </div>

          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-xs">
              <thead className="text-[var(--slate)]">
                <tr className="border-b border-[var(--line)]">
                  <th className="py-2 font-medium">Name</th>
                  <th className="py-2 font-medium">Status</th>
                  <th className="py-2 font-medium">+1</th>
                  <th className="py-2 font-medium">Guest</th>
                  <th className="py-2 font-medium">Dietary</th>
                  <th className="py-2 font-medium">Song request</th>
                  <th className="py-2 text-right font-medium">Submitted</th>
                </tr>
              </thead>
              <tbody>
                {ROWS.map((r) => (
                  <tr key={r.name} className="border-b border-[var(--line)]/70">
                    <td className="py-2.5 pr-3">
                      <span className="block text-[var(--ink)]">{r.name}</span>
                      <span className="block text-[10px] text-[var(--slate)]">{r.email}</span>
                    </td>
                    <td className="py-2.5 pr-3">
                      <span className="inline-flex items-center gap-1 rounded-full bg-[var(--acc-green)]/12 px-2 py-0.5 text-[11px] text-[var(--acc-green)]">
                        <i className="ri-check-line" />
                        Attending
                      </span>
                    </td>
                    <td className="py-2.5 pr-3 text-[var(--slate)]">{r.plus1 ? "✓" : "—"}</td>
                    <td className="py-2.5 pr-3 text-[var(--slate)]">{r.guest}</td>
                    <td className="py-2.5 pr-3 text-[var(--slate)]">{r.dietary}</td>
                    <td className="py-2.5 pr-3 text-[var(--slate)]">{r.song}</td>
                    <td className="py-2.5 text-right text-[var(--slate)]">{r.submitted}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
