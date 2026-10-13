import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Canvas, { type CanvasHandle, type Sel } from "./Canvas";
import { getShared } from "./cloud";
import { azList, downloadPng } from "./exporting";
import type { Chart } from "./model";
import "./seating.css";

// /tools/seating-chart-maker/view/:token — a shared plan, read-only, for the coordinator,
// caterer or family. Search anyone and their table lights up; nothing can be changed.

export default function ViewPage() {
  const { token = "" } = useParams();
  const [chart, setChart] = useState<Chart | null | undefined>(undefined);
  const [q, setQ] = useState("");
  const [pulse, setPulse] = useState<{ id: string; n: number } | null>(null);
  const [sel, setSel] = useState<Sel | null>(null);
  const [list, setList] = useState(false);
  const canvas = useRef<CanvasHandle>(null);

  useEffect(() => {
    getShared(token).then(setChart);
  }, [token]);

  useEffect(() => {
    const html = document.documentElement;
    const prev = html.style.overflow;
    html.style.overflow = "hidden";
    return () => {
      html.style.overflow = prev;
    };
  }, []);

  const hits = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!chart || !s) return null;
    return new Set(chart.guests.filter((g) => g.name.toLowerCase().includes(s)).map((g) => g.id));
  }, [q, chart]);
  const matches = useMemo(() => (chart && hits ? chart.guests.filter((g) => hits.has(g.id)).slice(0, 8) : []), [chart, hits]);

  if (chart === undefined) return <div className="sp" data-look="b" />;
  if (!chart)
    return (
      <div className="spx" style={{ display: "grid", placeItems: "center", padding: 24, textAlign: "center" }}>
        <div>
          <h1 style={{ fontSize: "2rem" }}>This seating plan isn’t shared anymore.</h1>
          <p className="spx-lede" style={{ margin: "14px auto 24px" }}>Ask whoever sent the link for a new one.</p>
          <Link to="/tools/seating-chart-maker" className="sp-btn primary" style={{ textDecoration: "none" }}>
            Make your own seating plan with Mesa
          </Link>
        </div>
      </div>
    );

  const tables = new Map(chart.tables.map((t) => [t.id, t]));
  const tableName = (id: string | null) => {
    const t = id ? tables.get(id) : null;
    return t ? (/^\d+$/.test(t.label) ? `Table ${t.label}` : t.label) : "No table yet";
  };
  const show = (tableId: string | null) => {
    if (!tableId) return;
    canvas.current?.focus(tableId);
    setPulse((p) => ({ id: tableId, n: (p?.n ?? 0) + 1 }));
  };

  return (
    <div className="sp" data-look="b" data-lenis-prevent>
      <header className="sp-bar">
        <Link to="/tools/seating-chart-maker" className="sp-home" aria-label="Mesa by The RSVP Studio">
          <img src="/brand/brandmark-dark.png" alt="" />
        </Link>
        <span className="sp-title" style={{ cursor: "default" }}>
          {chart.title}
        </span>
        <span className="sp-saved sp-hide-xs">View only</span>
        <span className="sp-grow" />
        <button className="sp-btn ghost" onClick={() => setList(true)}>
          A–Z list
        </button>
        <button className="sp-btn ghost sp-hide-sm" onClick={() => downloadPng(chart)}>
          Download image
        </button>
        <Link to="/tools/seating-chart-maker" className="sp-btn primary sp-hide-sm" style={{ textDecoration: "none" }}>
          Make yours with Mesa
        </Link>
      </header>
      <div className="sp-main" style={{ gridTemplateColumns: "minmax(0, 1fr)" }}>
        <div style={{ position: "relative", minWidth: 0, minHeight: 0, display: "grid" }}>
          <Canvas
            ref={canvas}
            chart={chart}
            sel={sel}
            armedIds={null}
            hidden={new Set()}
            pulse={pulse}
            hits={hits}
            readOnly
            onSelect={(s) => setSel(s?.kind === "guest" ? s : null)}
            onTableTap={() => {}}
            onMove={() => {}}
            onRotate={() => {}}
            onGuestDrop={() => {}}
          />
          <div className="sp-float sp-viewsearch">
            <label className="sp-search">
              <svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" opacity=".55" aria-hidden>
                <circle cx="9" cy="9" r="6" />
                <path d="M14 14l4 4" />
              </svg>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a guest" aria-label="Find a guest" autoComplete="off" />
            </label>
            {matches.length ? (
              <div className="sp-who">
                {matches.map((g) => (
                  <div key={g.id}>
                    <button className="sp-link" style={{ textDecoration: "none", fontWeight: 500 }} onClick={() => show(g.tableId)}>
                      {g.name}
                    </button>
                    <b style={{ fontSize: 12.5 }}>{tableName(g.tableId)}</b>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
          {sel ? (
            <div className="sp-float sp-insp">
              <h3>{chart.guests.find((g) => g.id === sel.id)?.name}</h3>
              <p style={{ margin: 0 }}>{tableName(chart.guests.find((g) => g.id === sel.id)?.tableId ?? null)}</p>
            </div>
          ) : null}
          <div className="sp-float sp-zoom">
            <button className="sp-ib" aria-label="Zoom out" onClick={() => canvas.current?.zoomBy(1 / 1.4)}>
              −
            </button>
            <button className="sp-ib" aria-label="Zoom in" onClick={() => canvas.current?.zoomBy(1.4)}>
              +
            </button>
            <button className="sp-ib" aria-label="Fit to screen" onClick={() => canvas.current?.fit()}>
              ⤢
            </button>
          </div>
        </div>
      </div>
      {list ? (
        <div className="sp-scrim" onClick={() => setList(false)}>
          <div className="sp-dialog" role="dialog" aria-modal="true" aria-label="Find your table" onClick={(e) => e.stopPropagation()}>
            <h2>Find your table</h2>
            <div className="sp-preview" style={{ maxHeight: "60dvh" }}>
              {azList(chart).map((r, i) => (
                <div key={i}>
                  <span>{r.name}</span>
                  <em>{r.table}</em>
                </div>
              ))}
            </div>
            <div className="row">
              <button className="sp-btn soft" onClick={() => setList(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
