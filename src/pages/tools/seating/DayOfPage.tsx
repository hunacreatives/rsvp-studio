import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import Canvas, { type CanvasHandle, type Sel } from "./Canvas";
import { dayView, households, openDay, readCache, syncDay, walkInItems, walkInSpot, writeCache, type DayCache, type DayError, type DayItem, type DayRow } from "./checkin";
import type { Guest, Table } from "./model";
import { parseChart, setBgImage } from "./store";
import "./seating.css";

// /tools/seating-chart-maker/day/:token — day-of check-in, for the welcome team's phones.
// No account; the link (and the PIN, if the couple set one) is the key. One screen: who's
// here, a big search, check a household in with one tap (or just who came), where they sit,
// and open seats for walk-ins. Works on a weak signal: check-ins wait on the phone and go when
// it can, and every phone catches up with the others every 20 seconds while it's in use.

const NONE = new Set<string>();
const SYNC_MS = 20_000;
const tableName = (t?: Table) => (t ? (/^\d+[a-z]?$/i.test(t.label) ? `Table ${t.label}` : t.label) : "No table yet");

export default function DayOfPage() {
  const { token = "" } = useParams();
  const [cache, setCache] = useState<DayCache>(() => readCache(token));
  const [error, setError] = useState<DayError | null>(null);
  const [pinTry, setPinTry] = useState("");
  const [nameTry, setNameTry] = useState("");
  const [online, setOnline] = useState(true);
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"arrive" | "open" | "plan">("arrive");
  const [open, setOpen] = useState<string | null>(null); // a household's sheet (by party)
  const [walk, setWalk] = useState<{ name: string; n: number; at?: { table: string; seats: number[] } } | null>(null);
  const [toast, setToast] = useState<{ text: string; undo?: DayItem[] } | null>(null);
  const [look, setLook] = useState<"c" | "b">(() => (localStorage.getItem("seating:day:look") === "b" ? "b" : "c"));
  const [awake, setAwake] = useState(false);
  const canvas = useRef<CanvasHandle>(null);
  const cacheRef = useRef(cache);
  cacheRef.current = cache;
  const save = useCallback(
    (next: DayCache) => {
      cacheRef.current = next;
      setCache(next);
      writeCache(token, next);
    },
    [token],
  );

  // ---- loading the plan, and keeping up with the other phones ----
  const load = useCallback(
    async (pin: string | null) => {
      const c = cacheRef.current;
      const r = await openDay(token, pin, c.chart?.bg?.key ?? null);
      if ("error" in r) {
        // Offline with a plan already on the phone: carry on with it.
        if (r.error === "network" && c.chart) return setOnline(false);
        return setError(r.error);
      }
      const chart = parseChart(r.chart);
      if (!chart) return setError("off");
      if (r.background && chart.bg) setBgImage(chart.bg.key, r.background);
      setError(null);
      save({ ...cacheRef.current, chart, chartAt: r.chart_at, pin });
    },
    [token, save],
  );
  const syncing = useRef(false);
  const sync = useCallback(async () => {
    const c = cacheRef.current;
    if (!c.chart || syncing.current) return;
    // The phone knows it has no signal: don't try, just say so (the queue waits).
    if (typeof navigator !== "undefined" && navigator.onLine === false) return setOnline(false);
    syncing.current = true;
    const sending = c.queue.slice(0, 200);
    const r = await syncDay(token, c.pin, c.since, sending);
    syncing.current = false;
    if ("error" in r) {
      if (r.error === "network") return setOnline(false);
      return setError(r.error);
    }
    setOnline(true);
    const now = cacheRef.current;
    const rows = { ...now.rows };
    for (const row of r.rows) if (!rows[row.guest_id] || rows[row.guest_id].updated_at <= row.updated_at) rows[row.guest_id] = row;
    // A little before the server's clock, so nothing written at the same moment is missed.
    const since = new Date(new Date(r.now).getTime() - 10_000).toISOString();
    save({ ...now, rows, since, queue: now.queue.slice(sending.length) });
    // The couple changed the plan on the day: fetch it again, once.
    if (r.chart_at && now.chartAt && r.chart_at !== now.chartAt) void load(now.pin);
  }, [token, save, load]);

  useEffect(() => {
    void load(cacheRef.current.pin);
  }, [load]);
  useEffect(() => {
    if (!cache.chart) return;
    void sync();
    const t = window.setInterval(() => document.visibilityState === "visible" && void sync(), SYNC_MS);
    const wake = () => document.visibilityState === "visible" && void sync();
    window.addEventListener("online", wake);
    document.addEventListener("visibilitychange", wake);
    return () => {
      window.clearInterval(t);
      window.removeEventListener("online", wake);
      document.removeEventListener("visibilitychange", wake);
    };
  }, [cache.chart, sync]);

  // Keep the screen on while it's in use (asked again whenever the page comes back).
  useEffect(() => {
    if (!awake || !("wakeLock" in navigator)) return;
    let lock: { release(): Promise<void> } | null = null;
    const ask = async () => {
      try {
        lock = await (navigator as Navigator & { wakeLock: { request(t: "screen"): Promise<{ release(): Promise<void> }> } }).wakeLock.request("screen");
      } catch {
        /* not allowed right now */
      }
    };
    void ask();
    const again = () => document.visibilityState === "visible" && void ask();
    document.addEventListener("visibilitychange", again);
    return () => {
      document.removeEventListener("visibilitychange", again);
      void lock?.release().catch(() => {});
    };
  }, [awake]);
  useEffect(() => {
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = "hidden";
    return () => {
      html.style.overflow = prev;
    };
  }, []);

  // ---- checking in ----
  const send = (items: DayItem[], text: string, undo?: DayItem[]) => {
    const c = cacheRef.current;
    const rows = { ...c.rows };
    const now = new Date().toISOString();
    for (const it of items) rows[it.guest_id] = { ...(rows[it.guest_id] ?? { arrived_at: null, table_id: null, seat: null, name: null, party: null }), guest_id: it.guest_id, state: it.state, arrived_at: it.state === "here" ? (rows[it.guest_id]?.state === "here" ? rows[it.guest_id].arrived_at : (it.at ?? now)) : null, table_id: it.table_id ?? rows[it.guest_id]?.table_id ?? null, seat: it.seat ?? rows[it.guest_id]?.seat ?? null, name: it.name ?? rows[it.guest_id]?.name ?? null, party: it.party ?? rows[it.guest_id]?.party ?? null, by: it.by ?? c.by, updated_at: now } as DayRow;
    save({ ...c, rows, queue: [...c.queue, ...items] });
    setToast({ text, undo });
    void sync();
  };
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 8000);
    return () => window.clearTimeout(t);
  }, [toast]);

  const chart = cache.chart;
  const { view, arrived } = useMemo(() => (chart ? dayView(chart, cache.rows) : { view: null, arrived: NONE }), [chart, cache.rows]);
  const tables = useMemo(() => new Map((view?.tables ?? []).map((t) => [t.id, t])), [view]);
  const homes = useMemo(() => (view ? households(view) : []), [view]);
  const expected = view?.guests.length ?? 0;
  const here = view ? view.guests.filter((g) => arrived.has(g.id)).length : 0;
  const pending = cache.queue.length;

  const checkIn = (people: Guest[]) => {
    const at = new Date().toISOString();
    const items = people.map((g): DayItem => ({ guest_id: g.id, state: "here", at, by: cache.by }));
    const t = people[0]?.tableId ? tables.get(people[0].tableId) : undefined;
    send(items, `Checked in · ${tableName(t)}`, people.map((g) => ({ guest_id: g.id, state: "none" as const, by: cache.by })));
    if (t) {
      canvas.current?.focus(t.id);
    }
    setOpen(null);
    setQ("");
  };
  const undoIn = (people: Guest[]) => send(people.map((g) => ({ guest_id: g.id, state: "none" as const, by: cache.by })), "Check-in undone");
  const markAway = (people: Guest[]) => send(people.map((g) => ({ guest_id: g.id, state: "away" as const, by: cache.by })), `${people.length === 1 ? "Seat" : "Seats"} free for walk-ins`, people.map((g) => ({ guest_id: g.id, state: "none" as const, by: cache.by })));

  // ---- not ready yet ----
  if (error === "off" || error === "premium")
    return (
      <Shell look={look}>
        <div className="sp-day__gate">
          <h1>This check-in link isn’t on.</h1>
          <p>Ask the couple or their coordinator for the current link.</p>
        </div>
      </Shell>
    );
  if (error === "pin")
    return (
      <Shell look={look}>
        <form
          className="sp-day__gate"
          onSubmit={(e) => {
            e.preventDefault();
            void load(pinTry);
          }}
        >
          <h1>Day-of check-in</h1>
          <p>Enter the 4-digit PIN from the couple.</p>
          <input className="sp-day__pin" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} autoFocus value={pinTry} onChange={(e) => setPinTry(e.target.value.replace(/\D/g, ""))} aria-label="PIN" />
          <button className="sp-btn primary" disabled={pinTry.length !== 4}>
            Open
          </button>
        </form>
      </Shell>
    );
  if (!chart || !view) return <Shell look={look}>{error === "network" ? <div className="sp-day__gate"><h1>No signal yet</h1><p>Open this page again once the phone is online. After that it works offline too.</p></div> : null}</Shell>;
  if (!cache.by)
    return (
      <Shell look={look}>
        <form
          className="sp-day__gate"
          onSubmit={(e) => {
            e.preventDefault();
            if (nameTry.trim()) save({ ...cache, by: nameTry.trim().slice(0, 40) });
          }}
        >
          <h1>{chart.names || chart.title}</h1>
          <p>Day-of check-in. Your name goes with each guest you check in, so the team knows who did.</p>
          <input className="sp-day__in" autoFocus value={nameTry} onChange={(e) => setNameTry(e.target.value)} placeholder="Your name (e.g. Ate Joy · door)" aria-label="Your name" />
          <button className="sp-btn primary" disabled={!nameTry.trim()}>
            Start checking in
          </button>
        </form>
      </Shell>
    );

  // ---- the screen ----
  const query = q.trim().toLowerCase();
  const found = query.length >= 2 ? homes.filter((h) => h.some((g) => g.name.toLowerCase().includes(query))).slice(0, 12) : [];
  const sheet = open ? homes.find((h) => h[0].party === open) : null;
  const byTable = view.tables
    .map((t) => ({ t, people: view.guests.filter((g) => g.tableId === t.id) }))
    .filter((x) => x.people.length || x.t.spare)
    .sort((a, b) => a.t.label.localeCompare(b.t.label, undefined, { numeric: true }));
  const freeAt = (t: Table) => t.seats - view.guests.filter((g) => g.tableId === t.id).length;
  const spot = walk ? (walk.at ? { table: tables.get(walk.at.table)!, seats: walk.at.seats } : walkInSpot(view, walk.n)) : null;
  const row = (h: Guest[]) => {
    const t = h[0].tableId ? tables.get(h[0].tableId) : undefined;
    const n = h.filter((g) => arrived.has(g.id)).length;
    const names = h.filter((g) => !g.tags?.includes("kid") && !g.tags?.includes("plusone")).map((g) => g.name);
    return (
      <button key={h[0].party} className="sp-day__row" onClick={() => setOpen(h[0].party)}>
        <span className="sp-day__who">
          <b>{(names.length ? names : h.map((g) => g.name)).slice(0, 2).join(" & ")}</b>
          <small>{h.length > 1 ? `${h.length} together` : "1 guest"}{n ? ` · ${n === h.length ? "here" : `${n} here`}` : ""}</small>
        </span>
        <span className={`sp-day__tbl${n === h.length ? " here" : ""}`}>{t ? t.label : "–"}</span>
      </button>
    );
  };

  return (
    <Shell look={look}>
      <header className="sp-day__top">
        <div>
          <b>{chart.names || chart.title}</b>
          <small>
            Day-of check-in · {cache.by}
            <button className="sp-link soft" onClick={() => save({ ...cache, by: "" })}>
              Change
            </button>
          </small>
        </div>
        <span className={`sp-day__net${online && !pending ? "" : " off"}`} role="status">
          {online ? (pending ? `Sending ${pending}…` : "Up to date") : pending ? `Offline · ${pending} to send` : "Offline"}
        </span>
      </header>
      <div className="sp-day__count" role="img" aria-label={`${here} of ${expected} here`}>
        <span>
          <b>{here}</b> of {expected} here
        </span>
        <span className="sp-progress__bar">
          <i style={{ width: `${expected ? Math.round((here / expected) * 100) : 0}%` }} />
        </span>
      </div>
      <label className="sp-day__search">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <circle cx="9" cy="9" r="6" />
          <path d="M14 14l4 4" />
        </svg>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a guest" autoComplete="off" enterKeyHint="search" aria-label="Find a guest" />
        {q ? (
          <button className="sp-ib" aria-label="Clear" onClick={() => setQ("")}>
            ×
          </button>
        ) : null}
      </label>

      {query.length >= 2 ? (
        <div className="sp-day__list">
          {found.length ? found.map(row) : <p className="sp-day__empty">No one by that name. Check the spelling, or seat them as a walk-in.</p>}
          {!found.length ? (
            <button className="sp-btn soft" onClick={() => (setWalk({ name: q.trim(), n: 1 }), setQ(""))}>
              Seat “{q.trim()}” as a walk-in
            </button>
          ) : null}
        </div>
      ) : (
        <>
          <div className="sp-seg sp-day__tabs" role="tablist">
            {(
              [
                ["arrive", "To arrive"],
                ["open", "Open seats"],
                ["plan", "Plan"],
              ] as const
            ).map(([k, l]) => (
              <button key={k} role="tab" aria-pressed={tab === k} onClick={() => setTab(k)}>
                {l}
              </button>
            ))}
          </div>
          {tab === "arrive" ? (
            <div className="sp-day__list">
              {byTable.map(({ t, people }) => {
                const waiting = people.filter((g) => !arrived.has(g.id));
                if (!people.length) return null;
                return (
                  <details key={t.id} className="sp-day__table">
                    <summary>
                      <b>{tableName(t)}</b>
                      <span>{waiting.length ? `${waiting.length} to arrive` : "All here"}</span>
                    </summary>
                    {households({ ...view, guests: people }).map(row)}
                  </details>
                );
              })}
            </div>
          ) : tab === "open" ? (
            <div className="sp-day__list">
              <button className="sp-btn primary sp-day__walk" onClick={() => setWalk({ name: "", n: 1 })}>
                Seat a walk-in
              </button>
              {view.tables
                .filter((t) => t.shape !== "head" && t.shape !== "sweetheart" && freeAt(t) > 0)
                .sort((a, b) => Number(!!b.spare) - Number(!!a.spare) || freeAt(b) - freeAt(a))
                .map((t) => (
                  <div key={t.id} className="sp-day__open">
                    <b>{tableName(t)}</b>
                    <span>
                      {freeAt(t)} open{t.spare ? " · spare table" : ""}
                    </span>
                  </div>
                ))}
            </div>
          ) : (
            <div className="sp-day__plan">
              <Canvas
                ref={canvas}
                chart={view}
                sel={null}
                armedIds={null}
                hidden={NONE}
                pulse={null}
                hits={null}
                readOnly
                arrived={arrived}
                onSelect={(s: Sel | null) => {
                  if (s?.kind !== "guest") return;
                  const g = view.guests.find((x) => x.id === s.id);
                  if (g) setOpen(g.party);
                }}
                onTableTap={(tableId, seat) => {
                  const t = tables.get(tableId);
                  if (!t || seat === undefined) return;
                  setWalk((w) => ({ name: w?.name ?? "", n: 1, at: { table: t.id, seats: [seat] } }));
                }}
                onMove={() => {}}
                onRotate={() => {}}
                onGuestDrop={() => {}}
              />
            </div>
          )}
        </>
      )}

      <footer className="sp-day__foot">
        <button className="sp-link soft" onClick={() => setAwake((a) => !a)}>
          {awake ? "Screen stays on" : "Keep the screen on"}
        </button>
        <button
          className="sp-link soft"
          onClick={() => {
            const next = look === "c" ? "b" : "c";
            setLook(next);
            try {
              localStorage.setItem("seating:day:look", next);
            } catch {
              /* not remembered */
            }
          }}
        >
          {look === "c" ? "Light screen" : "Dark screen"}
        </button>
      </footer>

      {sheet ? (
        <Sheet onClose={() => setOpen(null)}>
          <HouseholdCard people={sheet} table={sheet[0].tableId ? tables.get(sheet[0].tableId) : undefined} arrived={arrived} rows={cache.rows} onCheckIn={checkIn} onUndo={undoIn} onAway={markAway} />
        </Sheet>
      ) : null}
      {walk ? (
        <Sheet onClose={() => setWalk(null)}>
          <div className="sp-day__card">
            <h2>Seat a walk-in</h2>
            <input className="sp-day__in" autoFocus value={walk.name} onChange={(e) => setWalk({ ...walk, name: e.target.value })} placeholder="Their name" aria-label="Walk-in's name" />
            <div className="sp-day__party">
              <span>How many?</span>
              <button className="sp-ib" aria-label="Fewer" onClick={() => setWalk({ ...walk, n: Math.max(1, walk.n - 1), at: undefined })}>
                −
              </button>
              <b>{walk.n}</b>
              <button className="sp-ib" aria-label="More" onClick={() => setWalk({ ...walk, n: Math.min(12, walk.n + 1), at: undefined })}>
                +
              </button>
            </div>
            {spot ? (
              <p className="sp-day__spot">
                <b>{tableName(spot.table)}</b> has room{spot.table.spare ? " (the spare table)" : ""}.
              </p>
            ) : (
              <p className="sp-day__spot">No table has {walk.n} seats together. Seat them in smaller groups, or tap open seats on the plan.</p>
            )}
            <button
              className="sp-btn primary"
              disabled={!walk.name.trim() || !spot}
              onClick={() => {
                if (!spot) return;
                const items = walkInItems(walk.name, walk.n, spot.table, spot.seats, cache.by);
                send(items, `${walk.name.trim()} seated · ${tableName(spot.table)}`, items.map((i) => ({ guest_id: i.guest_id, state: "none" as const, by: cache.by })));
                setWalk(null);
              }}
            >
              Seat them
            </button>
            <button className="sp-link soft" onClick={() => (setWalk(null), setTab("plan"))}>
              Pick a seat on the plan instead
            </button>
          </div>
        </Sheet>
      ) : null}
      {toast ? (
        <div className="sp-day__toast" role="status">
          <span>{toast.text}</span>
          {toast.undo ? (
            <button
              className="sp-link"
              onClick={() => {
                send(toast.undo!, "Undone");
                setToast(null);
              }}
            >
              Undo
            </button>
          ) : null}
        </div>
      ) : null}
    </Shell>
  );
}

function Shell({ look, children }: { look: "b" | "c"; children: React.ReactNode }) {
  return (
    <div className="sp sp-day" data-look={look} data-lenis-prevent>
      {children}
    </div>
  );
}

function Sheet({ onClose, children }: { onClose(): void; children: React.ReactNode }) {
  return (
    <div className="sp-scrim sp-day__scrim" onClick={onClose}>
      <div className="sp-day__sheet" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <button className="sp-ib sp-day__x" aria-label="Close" onClick={onClose}>
          ×
        </button>
        {children}
      </div>
    </div>
  );
}

/** One household: where they sit, who's here, and check them in (all, or just who came). */
function HouseholdCard({ people, table, arrived, rows, onCheckIn, onUndo, onAway }: { people: Guest[]; table?: Table; arrived: Set<string>; rows: Record<string, DayRow>; onCheckIn(p: Guest[]): void; onUndo(p: Guest[]): void; onAway(p: Guest[]): void }) {
  const waiting = people.filter((g) => !arrived.has(g.id));
  const [pick, setPick] = useState<Set<string>>(() => new Set(waiting.map((g) => g.id)));
  const hereRows = people.filter((g) => arrived.has(g.id)).map((g) => rows[g.id]).filter(Boolean);
  const first = hereRows[0];
  const chosen = waiting.filter((g) => pick.has(g.id));
  return (
    <div className="sp-day__card">
      <p className="sp-day__where">{table ? (/^\d+[a-z]?$/i.test(table.label) ? <>Table <b>{table.label}</b></> : <b>{table.label}</b>) : "No table yet"}</p>
      <ul className="sp-day__people">
        {people.map((g) => {
          const isHere = arrived.has(g.id);
          return (
            <li key={g.id}>
              <label>
                <input type="checkbox" checked={isHere || pick.has(g.id)} disabled={isHere} onChange={(e) => setPick((s) => { const n = new Set(s); if (e.target.checked) n.add(g.id); else n.delete(g.id); return n; })} />
                <span>{g.name}</span>
                {isHere ? <small>Here</small> : null}
              </label>
            </li>
          );
        })}
      </ul>
      {waiting.length ? (
        <button className="sp-btn primary sp-day__go" disabled={!chosen.length} onClick={() => onCheckIn(chosen)}>
          {chosen.length === waiting.length && waiting.length > 1 ? `Check in all ${waiting.length}` : chosen.length === 1 ? `Check in ${chosen[0].name.split(" ")[0]}` : `Check in ${chosen.length}`}
        </button>
      ) : (
        <p className="sp-day__done">Everyone’s here{first?.arrived_at ? ` · ${new Date(first.arrived_at).toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" })}` : ""}{first?.by ? ` by ${first.by}` : ""}</p>
      )}
      <div className="sp-day__acts">
        {hereRows.length ? (
          <button className="sp-link soft" onClick={() => onUndo(people.filter((g) => arrived.has(g.id)))}>
            Undo check-in
          </button>
        ) : null}
        {waiting.length ? (
          <button className="sp-link soft" onClick={() => onAway(waiting)}>
            Not coming · free {waiting.length === 1 ? "the seat" : "their seats"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
