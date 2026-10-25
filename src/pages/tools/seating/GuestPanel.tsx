import { useMemo, useState, type ReactNode } from "react";
import { CATEGORY_LABEL, type Category, type Chart, type Guest } from "./model";
import { trackDrag, type DropTarget } from "./drag";
import { commit } from "./store";

// Guests, by group and household. Tap a group or household to seat it (then tap a table);
// with a mouse, drag it onto a table. Search finds anyone and lights up their seat.

interface Props {
  chart: Chart;
  armedKey: string | null;
  open: boolean;
  onToggle(): void;
  onArm(ids: string[], label: string, key: string): void;
  onFocusGuest(g: Guest): void;
  onDrop(ids: string[], target: DropTarget | null): void;
  onSearch(q: string): void;
  onAddGuests(): void;
  /** Under the search: Seat everyone's one-line result and the plan check chip (Editor.tsx). */
  summary: ReactNode;
  /** Right-click on a row: the guests it stands for, its name, and where the pointer is. */
  onRowMenu(ids: string[], label: string, at: { x: number; y: number }): void;
}

const RANK: Record<Category, number> = {
  vip: 0,
  court: 1,
  entourage: 2,
  bride: 3,
  groom: 4,
  family: 5,
  kids: 6,
  friends: 7,
  work: 8,
  other: 9,
};

type Tab = "all" | "no";

export default function GuestPanel({ chart: all, armedKey, open, onToggle, onArm, onFocusGuest, onDrop, onSearch, onAddGuests, summary, onRowMenu }: Props) {
  const menu = (ids: string[], label: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    onRowMenu(ids, label, { x: e.clientX, y: e.clientY });
  };
  const [q, setQ] = useState("");
  const [tabSet, setTab] = useState<Tab>("all");
  const [keyOpen, setKeyOpen] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  // Guests who replied they can't come are listed on their own at the bottom, not counted.
  const chart = useMemo(() => ({ ...all, guests: all.guests.filter((g) => g.reply !== "no") }), [all]);
  const gone = useMemo(() => {
    const by = new Map<string, Guest[]>();
    for (const g of all.guests) if (g.reply === "no") (by.get(g.party) ?? by.set(g.party, []).get(g.party)!).push(g);
    return [...by.values()];
  }, [all.guests]);
  const [goneOpen, setGoneOpen] = useState(false);
  const tables = useMemo(() => new Map(chart.tables.map((t) => [t.id, t])), [chart.tables]);

  const total = chart.guests.length;
  const seated = chart.guests.filter((g) => g.tableId).length;
  // "Only not seated" ends by itself once everyone has a seat.
  const tab: Tab = tabSet === "no" && total - seated > 0 ? "no" : "all";

  const groups = useMemo(() => {
    const out: {
      key: string;
      name: string;
      cat: Category;
      parties: Guest[][];
    }[] = [];
    const byGroup = new Map<string, Map<string, Guest[]>>();
    for (const g of chart.guests) {
      const k = g.groupId ?? "_";
      if (!byGroup.has(k)) byGroup.set(k, new Map());
      const m = byGroup.get(k)!;
      if (!m.has(g.party)) m.set(g.party, []);
      m.get(g.party)!.push(g);
    }
    for (const gr of chart.groups) {
      const m = byGroup.get(gr.id);
      if (m)
        out.push({
          key: gr.id,
          name: gr.name,
          cat: gr.cat,
          parties: [...m.values()],
        });
    }
    out.sort((a, b) => RANK[a.cat] - RANK[b.cat]);
    const loose = byGroup.get("_");
    if (loose)
      out.push({
        key: "_",
        name: "Other guests",
        cat: "other",
        parties: [...loose.values()],
      });
    return out;
  }, [chart.guests, chart.groups]);

  const where = (people: Guest[]) => {
    const n = people.filter((g) => g.tableId).length;
    if (!n) return { txt: "Not seated", no: true, labels: [] as string[] };
    const labels = [...new Set(people.filter((g) => g.tableId).map((g) => tables.get(g.tableId!)?.label ?? "?"))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    if (n < people.length)
      return {
        txt: `${n} of ${people.length} seated`,
        no: true,
        labels: [] as string[],
      };
    return { txt: "", no: false, labels };
  };
  /** Where they sit: the tables as small pills (two, then "+2"), or why not. */
  const at = (w: ReturnType<typeof where>) =>
    w.no ? (
      <span className="sp-st no">{w.txt}</span>
    ) : (
      <span className="sp-tbls">
        {w.labels.slice(0, 2).map((l) => (
          <span key={l} className="sp-tbl">
            {l}
          </span>
        ))}
        {w.labels.length > 2 ? <span className="sp-tbl more">+{w.labels.length - 2}</span> : null}
      </span>
    );

  const partyName = (p: Guest[]) => {
    if (p.length === 1) return p[0].name;
    const named = p.filter((g) => !g.tags?.includes("kid") && !g.tags?.includes("plusone"));
    const extra = p.length - named.length;
    const base = named.length <= 2 ? named.map((g) => g.name).join(" & ") : `${named[0].name} & ${named.length - 1} more`;
    return (base || p[0].name) + (extra ? ` +${extra}` : "");
  };

  const drag = (e: React.PointerEvent, ids: string[], label: string) => {
    if (e.pointerType === "touch" || e.button !== 0) return;
    e.preventDefault();
    trackDrag(e, label, { onDrop: (t) => onDrop(ids, t), threshold: 6 });
  };

  const setQuery = (v: string) => {
    setQ(v);
    onSearch(v);
  };

  const query = q.trim().toLowerCase();
  const matches = query ? all.guests.filter((g) => g.name.toLowerCase().includes(query)).slice(0, 80) : [];
  const groupName = new Map(chart.groups.map((g) => [g.id, g.name]));
  const catsShown = [...new Set(groups.map((g) => g.cat))];

  const rows: ReactNode[] = [];
  if (query) {
    for (const g of matches) {
      const w = where([g]);
      rows.push(
        <button key={g.id} className="sp-row party" onClick={() => onFocusGuest(g)} onPointerDown={(e) => drag(e, [g.id], g.name)} onContextMenu={menu([g.id], g.name)}>
          <span />
          <span className="sp-nm">
            {g.name}
            <small>{g.groupId ? groupName.get(g.groupId) : "Other guests"}</small>
          </span>
          {g.reply === "no" ? <span className="sp-st no">Can’t come</span> : at(w)}
        </button>,
      );
    }
  } else {
    for (const gr of groups) {
      const people = gr.parties.flat();
      const unseated = people.filter((g) => !g.tableId);
      if (tab === "no" && !unseated.length) continue;
      const w = where(people);
      const isOpen = expanded.has(gr.key) || tab !== "all";
      const ids = (unseated.length ? unseated : people).map((g) => g.id);
      const key = `g:${gr.key}`;
      rows.push(
        <div key={gr.key}>
          <button
            className={`sp-row${armedKey === key ? " armed" : ""}`}
            onClick={() => (unseated.length ? onArm(ids, `${gr.name} · ${ids.length}`, key) : onFocusGuest(people[0]))}
            onPointerDown={(e) => drag(e, ids, `${gr.name} · ${ids.length}`)}
            onContextMenu={menu(
              people.map((g) => g.id),
              gr.name,
            )}
          >
            <span
              className={`sp-caret${isOpen ? " open" : ""}`}
              role="button"
              aria-label={isOpen ? "Hide households" : "Show households"}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                setExpanded((s) => {
                  const n = new Set(s);
                  if (n.has(gr.key)) n.delete(gr.key);
                  else n.add(gr.key);
                  return n;
                });
              }}
            >
              <svg width="10" height="10" viewBox="0 0 10 10">
                <path d="M3 1.5L7 5 3 8.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </span>
            <i className="sp-dot" style={{ background: `var(--c-${gr.cat})` }} />
            <span className="sp-nm">
              {gr.name}
              <small>
                {people.length} {people.length === 1 ? "person" : "people"}
              </small>
            </span>
            {at(w)}
          </button>
          {isOpen
            ? gr.parties
                .filter((p) => (tab === "no" ? p.some((g) => !g.tableId) : true))
                .map((p) => {
                  const pw = where(p);
                  const free = p.filter((g) => !g.tableId);
                  const pids = (free.length ? free : p).map((g) => g.id);
                  const pkey = `p:${p[0].party}`;
                  return (
                    <button
                      key={p[0].party}
                      className={`sp-row party${armedKey === pkey ? " armed" : ""}`}
                      onClick={() => (free.length ? onArm(pids, `${partyName(p)}`, pkey) : onFocusGuest(p[0]))}
                      onPointerDown={(e) => drag(e, pids, partyName(p))}
                      onContextMenu={menu(
                        p.map((g) => g.id),
                        partyName(p),
                      )}
                    >
                      <span />
                      <span className="sp-nm">
                        {partyName(p)}
                        {p.length > 1 ? <small>{p.length} together</small> : null}
                      </span>
                      {at(pw)}
                    </button>
                  );
                })
            : null}
        </div>,
      );
    }
  }

  return (
    <aside className={`sp-panel${open ? " open" : ""}`} aria-label="Guests">
      <button className="sp-grab" aria-label={open ? "Close guest list" : "Open guest list"} onClick={onToggle} />
      <div className="sp-panel-top">
        <div className="sp-gp-head">
          <h2>Guests</h2>
          <button className="sp-add" onClick={onAddGuests}>
            <svg width="13" height="13" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
              <path d="M10 4v12M4 10h12" />
            </svg>
            Add
          </button>
        </div>
        {total ? (
          <div className={`sp-progress${seated === total ? " done" : ""}`} role="img" aria-label={`${seated} of ${total} guests seated`}>
            <span className="sp-progress__bar">
              <i style={{ width: `${Math.round((seated / total) * 100)}%` }} />
            </span>
            <span className="sp-progress__n">{seated === total ? "Everyone has a seat" : `${seated} of ${total} seated`}</span>
          </div>
        ) : null}
        <label className="sp-search">
          <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" opacity=".55" aria-hidden>
            <circle cx="9" cy="9" r="6" />
            <path d="M14 14l4 4" />
          </svg>
          <input
            value={q}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => !open && onToggle()}
            placeholder="Find a guest"
            autoComplete="off"
            enterKeyHint="search"
            aria-label="Find a guest"
          />
          {q ? (
            <button className="sp-ib" style={{ width: 24, height: 24 }} aria-label="Clear search" onClick={() => setQuery("")}>
              ×
            </button>
          ) : null}
        </label>
        {!query && total - seated > 0 ? (
          <button className={`sp-filter${tab === "no" ? " on" : ""}`} aria-pressed={tab === "no"} onClick={() => setTab(tab === "no" ? "all" : "no")}>
            Only not seated <b>{total - seated}</b>
          </button>
        ) : null}
      </div>
      {summary}
      <div className="sp-list">
        {rows.length ? (
          rows
        ) : (
          <p className="sp-empty">
            {query
              ? "No one by that name yet."
              : !total
                ? "No guests yet. Tap Add and paste your list; they’ll appear here, grouped."
                : "No one seated yet. Press Seat everyone, or tap a group and then a table."}
          </p>
        )}
        {gone.length && !query ? (
          <div className="sp-gone">
            <button className="sp-gone__h" aria-expanded={goneOpen} onClick={() => setGoneOpen((o) => !o)}>
              <span className={`sp-caret${goneOpen ? " open" : ""}`} aria-hidden>
                <svg width="10" height="10" viewBox="0 0 10 10">
                  <path d="M3 1.5L7 5 3 8.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </span>
              Can’t come <b>{gone.reduce((n, p) => n + p.length, 0)}</b>
            </button>
            {goneOpen
              ? gone.map((p) => (
                  <div key={p[0].party} className="sp-gone__row">
                    <span className="sp-nm">
                      {partyName(p)}
                      {p.length > 1 ? <small>{p.length} together</small> : null}
                    </span>
                    <button className="sp-link soft" onClick={() => commit((c) => c.guests.forEach((g) => g.party === p[0].party && g.reply === "no" && (g.reply = "yes")))}>
                      Coming after all
                    </button>
                  </div>
                ))
              : null}
          </div>
        ) : null}
      </div>
      {catsShown.length ? (
        <div className="sp-panel-foot">
          <button className="sp-keybtn" aria-expanded={keyOpen} onClick={() => setKeyOpen((o) => !o)}>
            <span className="sp-keydots" aria-hidden>
              {catsShown.slice(0, 4).map((c) => (
                <i key={c} style={{ background: `var(--c-${c})` }} />
              ))}
            </span>
            Colour key
          </button>
          {keyOpen ? (
            <div className="sp-legend" title="Each colour is a group of guests; seats on the plan use the same colours.">
              {catsShown.map((c) => (
                <span key={c}>
                  <i style={{ background: `var(--c-${c})` }} />
                  {CATEGORY_LABEL[c]}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </aside>
  );
}
