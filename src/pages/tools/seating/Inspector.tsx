import { CATEGORY_LABEL, SHAPE_LABEL, defaultRectWidth, isRound, ruleBreaks, type Category, type Chart, type Shape } from "./model";
import { RuleList, describeRule } from "./Rules";
import { commit, beginGesture, live, endGesture } from "./store";
import type { Sel } from "./Canvas";

// The card for whatever is selected: a table, a venue object, or a guest.

interface Props {
  chart: Chart;
  sel: Sel;
  /** Why Seat everyone put this guest here. */
  why?: string;
  onClose(): void;
  onArm(ids: string[], label: string, key: string): void;
  onFocusTable(id: string): void;
}

const X = (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
    <path d="M4 4l8 8M12 4l-8 8" />
  </svg>
);

function Stepper({ value, min, max, onChange, label }: { value: number; min: number; max: number; onChange(n: number): void; label: string }) {
  return (
    <div className="sp-step" role="group" aria-label={label}>
      <button className="sp-ib" aria-label={`Fewer ${label}`} disabled={value <= min} onClick={() => onChange(value - 1)}>
        −
      </button>
      <b>{value}</b>
      <button className="sp-ib" aria-label={`More ${label}`} disabled={value >= max} onClick={() => onChange(value + 1)}>
        +
      </button>
    </div>
  );
}

// Typing in a field is one undo step per field focus, not one per letter.
const textProps = (value: string, apply: (c: Chart, v: string) => void, max = 40) => ({
  defaultValue: value,
  maxLength: max,
  onFocus: () => beginGesture(),
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => live((c) => apply(c, e.target.value)),
  onBlur: () => endGesture(),
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => e.key === "Enter" && (e.target as HTMLInputElement).blur(),
});

export default function Inspector({ chart, sel, why, onClose, onArm, onFocusTable }: Props) {
  if (sel.kind === "table") {
    const t = chart.tables.find((x) => x.id === sel.id);
    if (!t) return null;
    const seated = chart.guests.filter((g) => g.tableId === t.id).sort((a, b) => (a.seat ?? 0) - (b.seat ?? 0));
    const setSeats = (n: number) =>
      commit((c) => {
        const tt = c.tables.find((x) => x.id === t.id)!;
        tt.seats = n;
        // Rect-like tables grow with their seats (a set length is kept only for one-side tables).
        delete tt.w;
        delete tt.h;
        // Anyone on a seat that no longer exists goes back to "not seated".
        for (const g of c.guests) if (g.tableId === t.id && (g.seat ?? 0) >= n) Object.assign(g, { tableId: null, seat: null });
      });
    const setShape = (shape: Shape) =>
      commit((c) => {
        const tt = c.tables.find((x) => x.id === t.id)!;
        tt.shape = shape;
        delete tt.w;
        delete tt.h;
        if (shape === "sweetheart" && tt.seats > 4) tt.seats = 2;
        if (shape === "cocktail" && tt.seats > 8) tt.seats = 4;
        for (const g of c.guests) if (g.tableId === t.id && (g.seat ?? 0) >= tt.seats) Object.assign(g, { tableId: null, seat: null });
      });
    return (
      <div className="sp-float sp-insp" role="dialog" aria-label={`Table ${t.label}`}>
        <h3>
          {/^\d+$/.test(t.label) ? `Table ${t.label}` : t.label}
          <button className="sp-ib" aria-label="Close" onClick={onClose}>
            {X}
          </button>
        </h3>
        <div className="sp-two">
          <label className="sp-field">
            Name
            <input key={`l${t.id}`} {...textProps(t.label, (c, v) => (c.tables.find((x) => x.id === t.id)!.label = v || "?"))} />
          </label>
          <div className="sp-field">
            Seats
            <Stepper value={t.seats} min={1} max={t.shape === "round" ? 16 : t.shape === "cocktail" ? 8 : t.shape === "sweetheart" ? 4 : 40} onChange={setSeats} label="seats" />
          </div>
        </div>
        <label className="sp-field">
          Note
          <input key={`n${t.id}`} placeholder="Sponsors, Bride’s family…" {...textProps(t.note ?? "", (c, v) => (c.tables.find((x) => x.id === t.id)!.note = v || undefined), 40)} />
        </label>
        <div className="sp-seg wrap" role="group" aria-label="Shape">
          {(Object.keys(SHAPE_LABEL) as Shape[]).map((s) => (
            <button key={s} aria-pressed={t.shape === s} onClick={() => setShape(s)}>
              {SHAPE_LABEL[s]}
            </button>
          ))}
        </div>
        {t.shape === "round" && chart.tables.some((x) => x.shape === "round" && x.id !== t.id && x.seats !== t.seats) ? (
          <button
            className="sp-link"
            style={{ alignSelf: "flex-start" }}
            onClick={() =>
              commit((c) => {
                for (const tt of c.tables) if (tt.shape === "round" && !tt.locked) tt.seats = t.seats;
                const seatsOf = new Map(c.tables.map((x) => [x.id, x.seats]));
                // Anyone whose chair is gone goes back to "not seated".
                for (const g of c.guests) if (g.tableId && (g.seat ?? 0) >= (seatsOf.get(g.tableId) ?? 0)) Object.assign(g, { tableId: null, seat: null });
              })
            }
          >
            Use {t.seats} seats on every round table
          </button>
        ) : null}
        {!isRound(t) ? (
          <div className="sp-field">
            Length {(((t.w ?? defaultRectWidth(t)) as number) / 100).toFixed(1)} m
            <div className="sp-step">
              <button className="sp-ib" aria-label="Shorter" onClick={() => commit((c) => { const tt = c.tables.find((x) => x.id === t.id)!; tt.w = Math.max(100, (tt.w ?? defaultRectWidth(tt)) - 20); })}>−</button>
              <button className="sp-ib" aria-label="Longer" onClick={() => commit((c) => { const tt = c.tables.find((x) => x.id === t.id)!; tt.w = Math.min(3000, (tt.w ?? defaultRectWidth(tt)) + 20); })}>+</button>
            </div>
          </div>
        ) : null}
        <label className="sp-toggle">
          Lock (Seat everyone won’t change it)
          <input type="checkbox" checked={!!t.locked} onChange={(e) => commit((c) => (c.tables.find((x) => x.id === t.id)!.locked = e.target.checked || undefined))} />
        </label>
        {(() => {
          const meals = new Map<string, number>();
          for (const g of seated) if (g.meal?.trim()) meals.set(g.meal.trim(), (meals.get(g.meal.trim()) ?? 0) + 1);
          return meals.size ? (
            <p style={{ margin: 0, fontSize: 12.5, opacity: 0.85 }}>
              <b>Meals:</b> {[...meals].map(([m, n]) => `${m} ${n}`).join(" · ")}
            </p>
          ) : null;
        })()}
        {ruleBreaks(chart)
          .filter(({ a, b }) => a.tableId === t.id || b.tableId === t.id)
          .map(({ rule }) => (
            <p key={rule.id} style={{ margin: 0, fontSize: 12.5, color: "var(--ring-over)" }}>
              Rule not kept: {describeRule(chart, rule)}.
            </p>
          ))}
        {seated.length ? (
          <div className="sp-who">
            {seated.map((g) => (
              <div key={g.id}>
                <span>{g.name}</span>
                <button className="sp-ib" aria-label={`Take ${g.name} off this table`} title="Take off this table" onClick={() => commit((c) => Object.assign(c.guests.find((x) => x.id === g.id)!, { tableId: null, seat: null }))}>
                  {X}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ margin: 0, fontSize: 13, opacity: 0.75 }}>No one here yet. Tap a group in the list, then this table.</p>
        )}
        <div className="sp-acts">
          <button
            className="sp-btn ghost"
            onClick={() =>
              commit((c) => {
                const tt = c.tables.find((x) => x.id === t.id)!;
                tt.rot = (tt.rot + 45) % 360;
              })
            }
          >
            Turn 45°
          </button>
          <button
            className="sp-btn ghost"
            onClick={() =>
              commit((c) => {
                const copy = { ...structuredClone(t), id: `t${Date.now().toString(36)}`, x: t.x + 60, y: t.y + 60 };
                const nums = c.tables.map((x) => Number(x.label)).filter(Number.isFinite);
                copy.label = /^\d+$/.test(t.label) ? String(Math.max(0, ...nums) + 1) : `${t.label} 2`;
                copy.locked = undefined;
                c.tables.push(copy);
              })
            }
          >
            Duplicate
          </button>
          {seated.length ? (
            <button className="sp-btn ghost" onClick={() => commit((c) => c.guests.forEach((g) => g.tableId === t.id && Object.assign(g, { tableId: null, seat: null })))}>
              Clear
            </button>
          ) : null}
          <button
            className="sp-btn ghost sp-danger"
            onClick={() => {
              commit((c) => {
                c.tables = c.tables.filter((x) => x.id !== t.id);
                for (const g of c.guests) if (g.tableId === t.id) Object.assign(g, { tableId: null, seat: null });
              });
              onClose();
            }}
          >
            Delete
          </button>
        </div>
      </div>
    );
  }

  if (sel.kind === "object") {
    const o = chart.objects.find((x) => x.id === sel.id);
    if (!o) return null;
    const size = (k: "w" | "h", d: number) => commit((c) => {
      const oo = c.objects.find((x) => x.id === o.id)!;
      oo[k] = Math.max(40, Math.min(3000, oo[k] + d));
    });
    return (
      <div className="sp-float sp-insp" role="dialog" aria-label={o.label}>
        <h3>
          {o.label}
          <button className="sp-ib" aria-label="Close" onClick={onClose}>
            {X}
          </button>
        </h3>
        <label className="sp-field">
          Label
          <input key={`o${o.id}`} {...textProps(o.label, (c, v) => (c.objects.find((x) => x.id === o.id)!.label = v))} />
        </label>
        <div className="sp-two">
          <div className="sp-field">
            Width {(o.w / 100).toFixed(1)} m
            <div className="sp-step">
              <button className="sp-ib" aria-label="Narrower" onClick={() => size("w", -50)}>−</button>
              <button className="sp-ib" aria-label="Wider" onClick={() => size("w", 50)}>+</button>
            </div>
          </div>
          <div className="sp-field">
            Depth {(o.h / 100).toFixed(1)} m
            <div className="sp-step">
              <button className="sp-ib" aria-label="Shallower" onClick={() => size("h", -50)}>−</button>
              <button className="sp-ib" aria-label="Deeper" onClick={() => size("h", 50)}>+</button>
            </div>
          </div>
        </div>
        <div className="sp-acts">
          <button className="sp-btn ghost" onClick={() => commit((c) => { const oo = c.objects.find((x) => x.id === o.id)!; oo.rot = (oo.rot + 90) % 360; })}>
            Turn 90°
          </button>
          <button
            className="sp-btn ghost sp-danger"
            onClick={() => {
              commit((c) => (c.objects = c.objects.filter((x) => x.id !== o.id)));
              onClose();
            }}
          >
            Delete
          </button>
        </div>
      </div>
    );
  }

  const g = chart.guests.find((x) => x.id === sel.id);
  if (!g) return null;
  const t = g.tableId ? chart.tables.find((x) => x.id === g.tableId) : null;
  const household = chart.guests.filter((x) => x.party === g.party && x.id !== g.id);
  return (
    <div className="sp-float sp-insp" role="dialog" aria-label={g.name}>
      <h3>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.name}</span>
        <button className="sp-ib" aria-label="Close" onClick={onClose}>
          {X}
        </button>
      </h3>
      <label className="sp-field">
        Name
        <input key={`g${g.id}`} {...textProps(g.name, (c, v) => (c.guests.find((x) => x.id === g.id)!.name = v || "Guest"), 120)} />
      </label>
      <label className="sp-field">
        Group
        <select value={g.groupId ?? ""} onChange={(e) => commit((c) => (c.guests.find((x) => x.id === g.id)!.groupId = e.target.value || null))}>
          <option value="">Other guests</option>
          {chart.groups.map((gr) => (
            <option key={gr.id} value={gr.id}>
              {gr.name}
            </option>
          ))}
        </select>
      </label>
      <label className="sp-field">
        Meal or note
        <input key={`m${g.id}`} placeholder="Fish, vegetarian, wheelchair…" {...textProps(g.meal ?? "", (c, v) => (c.guests.find((x) => x.id === g.id)!.meal = v || undefined), 60)} />
      </label>
      <p style={{ margin: 0, fontSize: 13, opacity: 0.85 }}>
        {t ? (
          <>
            Seated at <b>{/^\d+$/.test(t.label) ? `Table ${t.label}` : t.label}</b>, seat {(g.seat ?? 0) + 1}.{" "}
            <button className="sp-link" onClick={() => onFocusTable(t.id)}>
              Show
            </button>
          </>
        ) : (
          "Not seated yet."
        )}
        {household.length ? ` Comes with ${household.length === 1 ? household[0].name : `${household.length} others`}.` : ""}
      </p>
      {why && t ? (
        <p style={{ margin: 0, fontSize: 12.5, opacity: 0.8 }}>
          <b>Why here:</b> {why}.
        </p>
      ) : null}
      <div className="sp-field">
        Seating rules
        <RuleList chart={chart} guestId={g.id} />
      </div>
      <div className="sp-acts">
        <button className="sp-btn primary" onClick={() => onArm([g.id], g.name, `u:${g.id}`)}>
          {t ? "Move" : "Seat"}
        </button>
        {t ? (
          <button className="sp-btn ghost" onClick={() => commit((c) => Object.assign(c.guests.find((x) => x.id === g.id)!, { tableId: null, seat: null }))}>
            Unseat
          </button>
        ) : null}
        <button
          className="sp-btn ghost sp-danger"
          onClick={() => {
            commit((c) => (c.guests = c.guests.filter((x) => x.id !== g.id)));
            onClose();
          }}
        >
          Remove
        </button>
      </div>
    </div>
  );
}

export const CATS = Object.keys(CATEGORY_LABEL) as Category[];
