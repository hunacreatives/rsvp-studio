import { useState, type ReactNode } from "react";
import { fieldLen, parseLen, type Units } from "./units";
import type { Chart } from "./model";

// The card for several tables and things picked at once (Shift-click, a box, or Select):
// line them up, space them evenly, lock them in place, or delete them. Dragging any of them
// on the plan moves them all.

export type AlignHow = "left" | "centre" | "right" | "top" | "middle" | "bottom" | "spread-x" | "spread-y";

const X = (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
    <path d="M4 4l8 8M12 4l-8 8" />
  </svg>
);

// Small pictures of each line-up: a guide line and two boxes.
const ART: Record<AlignHow, ReactNode> = {
  left: <path d="M3 2v16M6 5h9v3H6zM6 12h6v3H6z" />,
  centre: <path d="M10 2v16M4 5h12v3H4zM6 12h8v3H6z" />,
  right: <path d="M17 2v16M5 5h9v3H5zM8 12h6v3H8z" />,
  top: <path d="M2 3h16M5 6h3v9H5zM12 6h3v6h-3z" />,
  middle: <path d="M2 10h16M5 4h3v12H5zM12 6h3v8h-3z" />,
  bottom: <path d="M2 17h16M5 5h3v9H5zM12 8h3v6h-3z" />,
  "spread-x": <path d="M2 3v14M18 3v14M7 6h2v8H7zM11 6h2v8h-2z" />,
  "spread-y": <path d="M3 2h14M3 18h14M6 7h8v2H6zM6 11h8v2H6z" />,
};
const LABEL: Record<AlignHow, string> = {
  left: "Line up left edges",
  centre: "Line up centres",
  right: "Line up right edges",
  top: "Line up tops",
  middle: "Line up middles",
  bottom: "Line up bottoms",
  "spread-x": "Space evenly across",
  "spread-y": "Space evenly down",
};

export default function GroupCard({
  chart,
  ids,
  onClose,
  onAlign,
  onArrange,
  onLock,
  onDelete,
  units = "m",
}: {
  chart: Chart;
  ids: string[];
  onClose(): void;
  onAlign(how: AlignHow): void;
  /** Tidy rows: so many across, with this much clear space between chairs (cm). */
  onArrange(perRow: number, walk: number): void;
  onLock(on: boolean): void;
  onDelete(): void;
  units?: Units;
}) {
  const touch = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;
  const tables = chart.tables.filter((t) => ids.includes(t.id));
  const objects = chart.objects.filter((o) => ids.includes(o.id));
  const all = [...tables, ...objects];
  const allFixed = all.length > 0 && all.every((x) => x.fixed);
  const movable = all.filter((x) => !x.fixed).length;
  const [perRow, setPerRow] = useState(() => Math.max(2, Math.ceil(Math.sqrt(chart.tables.filter((t) => ids.includes(t.id)).length))));
  const [walk, setWalk] = useState(() => fieldLen(90, units));
  const walkCm = parseLen(walk, units);
  const what = !objects.length ? `${tables.length} tables` : !tables.length ? `${objects.length} things` : `${all.length} selected`;
  const btn = (how: AlignHow, disabled = false) => (
    <button key={how} className="sp-ib sp-align" title={LABEL[how]} aria-label={LABEL[how]} disabled={disabled || movable < 1} onClick={() => onAlign(how)}>
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" aria-hidden>
        {ART[how]}
      </svg>
    </button>
  );
  return (
    <div className="sp-float sp-insp" role="dialog" aria-label={what}>
      <h3>
        {what}
        <button className="sp-ib" aria-label="Done" onClick={onClose}>
          {X}
        </button>
      </h3>
      <div className="sp-field">
        Line up
        <div className="sp-aligns">{(["left", "centre", "right", "top", "middle", "bottom"] as const).map((h) => btn(h))}</div>
      </div>
      <div className="sp-field">
        Space evenly
        <div className="sp-aligns">{(["spread-x", "spread-y"] as const).map((h) => btn(h, all.length < 3))}</div>
      </div>
      {tables.length >= 2 ? (
        <div className="sp-field">
          Arrange in rows
          <div className="sp-arrange">
            <label>
              <span>Across</span>
              <input type="number" min={1} max={Math.max(1, tables.length)} value={perRow} onChange={(e) => setPerRow(Math.max(1, Math.min(tables.length, Number(e.target.value) || 1)))} aria-label="Tables in each row" />
            </label>
            <label>
              <span>Walkway</span>
              <input value={walk} onChange={(e) => setWalk(e.target.value)} inputMode="decimal" aria-label="Walkway between chairs" />
            </label>
            <button className="sp-btn soft" disabled={!walkCm || movable < 2} onClick={() => walkCm && onArrange(perRow, Math.round(walkCm))}>
              Arrange
            </button>
          </div>
          <small style={{ fontWeight: 400, opacity: 0.75 }}>Walkway is the clear space between the backs of the chairs.</small>
        </div>
      ) : null}
      <label className="sp-toggle">
        <span>
          Lock in place
          <small>None of them can be moved or turned</small>
        </span>
        <input type="checkbox" className="sp-switch" checked={allFixed} onChange={(e) => onLock(e.target.checked)} />
      </label>
      <p style={{ margin: 0, fontSize: 12.5, opacity: 0.8 }}>
        Drag any of them to move them together. {touch ? "Tap one to add it or take it" : "Shift-click to add or take one"}&nbsp;off.
      </p>
      <div className="sp-acts">
        <button className="sp-btn ghost sp-danger" onClick={onDelete}>
          Delete {what}
        </button>
      </div>
    </div>
  );
}
