import { CATEGORY_LABEL, SHAPE_LABEL, canSeatInside, dims, insideSeats, isHonorific, isRound, ruleBreaks, type Category, type Chart, type GuestTag, type Shape } from "./model";
import { fieldLen, parseLen, type Units } from "./units";
import { useEffect, useRef, useState, type FocusEvent } from "react";
import { RuleList, describeRule } from "./Rules";
import { ShapeArt } from "./Tools";
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
  /** Guests went back to Not seated (fewer seats, a new shape, Clear, Delete): say so, with Undo. */
  onNotice(text: string): void;
  /** Metres or feet and inches, for the size and position fields. */
  units?: Units;
}

const TRASH = (
  <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M4 6h12M8 6V4h4v2M6 6l1 10h6l1-10" />
  </svg>
);
const TAGS: [GuestTag, string, string][] = [
  ["senior", "Lolo or lola", "Seated near the exits, away from the speakers"],
  ["access", "Easy access", "Wheelchair, walker or expecting: near the way out"],
  ["kid", "Kid", "Can sit at the kids’ table"],
  ["vip", "VIP", "Sponsor or special guest"],
];
const off = (n: number, what: string) => `${what}. ${n} ${n === 1 ? "guest is" : "guests are"} back in Not seated.`;

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

/** A length typed exactly ("1.20", "120 cm", "5' 3\""): applied on Enter or leaving the field,
 *  kept within min–max; anything unreadable goes back to what it was. */
function LenField({ label, cm, units, min, max, disabled, onSet, size = false }: { label: string; cm: number; units: Units; min: number; max: number; disabled?: boolean; onSet(cm: number): void; /** A size, not a position: "180" means 180 cm. */ size?: boolean }) {
  const shown = fieldLen(cm, units);
  const [text, setText] = useState(shown);
  const [editing, setEditing] = useState(false);
  useEffect(() => {
    if (!editing) setText(shown);
  }, [shown, editing]);
  const done = () => {
    setEditing(false);
    const v = parseLen(text, units, size);
    if (v === null) return setText(shown);
    const next = Math.round(Math.max(min, Math.min(max, v)));
    if (Math.abs(next - cm) >= 0.5) onSet(next);
    else setText(shown);
  };
  return (
    <label className="sp-field">
      {label}
      <span className="sp-unit">
        <input
          inputMode="decimal"
          value={text}
          disabled={disabled}
          onFocus={(e) => (setEditing(true), e.target.select())}
          onChange={(e) => setText(e.target.value)}
          onBlur={done}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            if (e.key === "Escape") (setText(shown), setEditing(false));
          }}
          aria-label={label}
        />
        {units === "m" ? <i>m</i> : null}
      </span>
    </label>
  );
}

/** Where it sits, exactly: its centre, measured from the room's top-left corner (across and
 *  down). Closed until someone wants it; most people drag. */
function ExactPosition({ what, x, y, units, disabled, onSet }: { what: string; x: number; y: number; units: Units; disabled?: boolean; onSet(k: "x" | "y", v: number): void }) {
  return (
    <details className="sp-exact">
      <summary>Exact position</summary>
      <p>The centre of the {what}, measured from the room’s top-left&nbsp;corner.</p>
      <div className="sp-dims">
        <LenField label="Across" cm={x} units={units} min={-5000} max={25000} disabled={disabled} onSet={(v) => onSet("x", v)} />
        <LenField label="Down" cm={y} units={units} min={-5000} max={25000} disabled={disabled} onSet={(v) => onSet("y", v)} />
      </div>
    </details>
  );
}

/** A turn in degrees, typed exactly. */
function DegField({ deg, disabled, onSet }: { deg: number; disabled?: boolean; onSet(deg: number): void }) {
  const [text, setText] = useState(String(Math.round(deg)));
  useEffect(() => setText(String(Math.round(deg))), [deg]);
  const done = () => {
    const v = Number(text.replace("°", "").trim());
    if (!Number.isFinite(v) || text.trim() === "") return setText(String(Math.round(deg)));
    const next = ((Math.round(v) % 360) + 360) % 360;
    if (next !== Math.round(deg)) onSet(next);
    else setText(String(Math.round(deg)));
  };
  return (
    <label className="sp-field">
      Turn
      <span className="sp-unit">
        <input inputMode="numeric" value={text} disabled={disabled} onFocus={(e) => e.target.select()} onChange={(e) => setText(e.target.value)} onBlur={done} onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()} aria-label="Turn, in degrees" />
        <i>°</i>
      </span>
    </label>
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

export default function Inspector({ chart, sel, why, onClose, onArm, onFocusTable, onNotice, units = "m" }: Props) {
  const [addingRule, setAddingRule] = useState(false);
  const selKey = sel ? `${sel.kind}:${sel.id}` : "";
  // On a phone, the tap that opened the card lands on whatever field slides in under the
  // finger; for a moment after opening, that focus (and its keyboard) is ignored.
  const openedAt = useRef(0);
  useEffect(() => {
    setAddingRule(false);
    openedAt.current = performance.now();
  }, [selKey]);
  const ghost = (e: FocusEvent) => {
    if (performance.now() - openedAt.current < 600 && window.matchMedia("(pointer: coarse)").matches && e.target instanceof HTMLElement) e.target.blur();
  };
  if (sel.kind === "table") {
    const t = chart.tables.find((x) => x.id === sel.id);
    if (!t) return null;
    const seated = chart.guests.filter((g) => g.tableId === t.id).sort((a, b) => (a.seat ?? 0) - (b.seat ?? 0));
    const setSeats = (n: number) => {
      const lost = seated.filter((g) => (g.seat ?? 0) >= n).length;
      if (lost) onNotice(off(lost, `Table for ${n}`));
      commit((c) => {
        const tt = c.tables.find((x) => x.id === t.id)!;
        tt.seats = n;
        // Rect-like tables grow with their seats (a set length is kept only for one-side tables,
        // and for a U or an L seated on the inside, whose size was set when that was turned on).
        if (!tt.inside) {
          delete tt.w;
          delete tt.h;
        }
        // Anyone on a seat that no longer exists goes back to "not seated".
        for (const g of c.guests) if (g.tableId === t.id && (g.seat ?? 0) >= n) Object.assign(g, { tableId: null, seat: null });
      });
    };
    const setShape = (shape: Shape) => {
      const max = shape === "sweetheart" && t.seats > 4 ? 2 : shape === "cocktail" && t.seats > 8 ? 4 : t.seats;
      const lost = seated.filter((g) => (g.seat ?? 0) >= max).length;
      if (lost) onNotice(off(lost, "Shape changed"));
      commit((c) => {
        const tt = c.tables.find((x) => x.id === t.id)!;
        tt.shape = shape;
        delete tt.w;
        delete tt.h;
        if (shape !== "ushape" && shape !== "lshape") delete tt.inside;
        if (shape === "sweetheart" && tt.seats > 4) tt.seats = 2;
        if (shape === "cocktail" && tt.seats > 8) tt.seats = 4;
        for (const g of c.guests) if (g.tableId === t.id && (g.seat ?? 0) >= tt.seats) Object.assign(g, { tableId: null, seat: null });
      });
    };
    return (
      <div className="sp-float sp-insp" onFocusCapture={ghost} role="dialog" aria-label={`Table ${t.label}`}>
        {/* The title is the table's name: tap it to rename. */}
        <h3 className="sp-insp-title">
          {/^\d+[a-z]?$/i.test(t.label) ? <span className="pre">Table</span> : null}
          <input key={`l${t.id}`} aria-label="Table name" className="sp-title-in" {...textProps(t.label, (c, v) => (c.tables.find((x) => x.id === t.id)!.label = v || "?"))} />
          <button className="sp-ib" aria-label="Close" onClick={onClose}>
            {X}
          </button>
        </h3>
        <div className="sp-field">
          Seats
          <Stepper value={t.seats} min={1} max={t.shape === "round" ? 16 : t.shape === "cocktail" ? 8 : t.shape === "sweetheart" ? 4 : 40} onChange={setSeats} label="seats" />
        </div>
        <label className="sp-field">
          Note
          <input key={`n${t.id}`} placeholder="Sponsors, Bride’s family…" {...textProps(t.note ?? "", (c, v) => (c.tables.find((x) => x.id === t.id)!.note = v || undefined), 40)} />
        </label>
        <div className="sp-shapes" role="group" aria-label="Shape">
          {(Object.keys(SHAPE_LABEL) as Shape[]).map((s) => (
            <button key={s} aria-pressed={t.shape === s} onClick={() => setShape(s)} title={SHAPE_LABEL[s]}>
              <ShapeArt shape={s} seats={8} size={30} />
              <span>{SHAPE_LABEL[s]}</span>
            </button>
          ))}
        </div>
        {t.shape === "round" && chart.tables.some((x) => x.shape === "round" && x.id !== t.id && x.seats !== t.seats) ? (
          <button
            className="sp-link"
            style={{ alignSelf: "flex-start" }}
            onClick={() =>
              commit((c) => {
                const lost = c.guests.filter((g) => {
                  const tt = c.tables.find((x) => x.id === g.tableId);
                  return tt && tt.shape === "round" && !tt.locked && (g.seat ?? 0) >= t.seats;
                }).length;
                if (lost) onNotice(off(lost, `Every round table seats ${t.seats}`));
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
        {/* How big and how turned; where exactly sits in "Exact position", closed until wanted. */}
        <div className="sp-dims">
          {!isRound(t) ? (
            <LenField label="Length" size cm={dims(t).w} units={units} min={100} max={3000} disabled={t.fixed} onSet={(v) => commit((c) => (c.tables.find((x) => x.id === t.id)!.w = v))} />
          ) : null}
          {t.shape === "ushape" || t.shape === "lshape" ? (
            <LenField label="Depth" cm={dims(t).h} size units={units} min={152} max={3000} disabled={t.fixed} onSet={(v) => commit((c) => (c.tables.find((x) => x.id === t.id)!.h = v))} />
          ) : null}
          <DegField deg={t.rot} disabled={t.fixed} onSet={(v) => commit((c) => (c.tables.find((x) => x.id === t.id)!.rot = v))} />
        </div>
        <ExactPosition what="table" x={t.x} y={t.y} units={units} disabled={t.fixed} onSet={(k, v) => commit((c) => (c.tables.find((x) => x.id === t.id)![k] = v))} />
        <label className="sp-toggle">
          <span>
            Lock in place
            <small>Can’t be moved or turned</small>
          </span>
          <input type="checkbox" className="sp-switch" checked={!!t.fixed} onChange={(e) => commit((c) => (c.tables.find((x) => x.id === t.id)!.fixed = e.target.checked || undefined))} />
        </label>
        {t.shape === "ushape" || t.shape === "lshape" ? (
          canSeatInside(t) || t.inside ? (
            <label className="sp-toggle">
              <span>
                Seats on the inside too
                <small>Chairs along the inner edges as&nbsp;well</small>
              </span>
              <input
                type="checkbox"
                className="sp-switch"
                checked={!!t.inside}
                onChange={(e) => {
                  const on = e.target.checked;
                  const size = dims(t);
                  const extra = insideSeats({ ...t, ...size });
                  const seats = on ? t.seats + extra : Math.max(1, t.seats - extra);
                  const lost = on ? 0 : seated.filter((g) => (g.seat ?? 0) >= seats).length;
                  if (lost) onNotice(off(lost, "Inside seats removed"));
                  commit((c) => {
                    const tt = c.tables.find((x) => x.id === t.id)!;
                    // The table keeps its size; the chairs inside are added to (or taken off) its seats.
                    Object.assign(tt, { w: size.w, h: size.h, seats, inside: on || undefined });
                    for (const g of c.guests) if (g.tableId === t.id && (g.seat ?? 0) >= seats) Object.assign(g, { tableId: null, seat: null });
                  });
                }}
              />
            </label>
          ) : (
            <p style={{ margin: 0, fontSize: 12.5, opacity: 0.75 }}>Make the U wider to seat people on the inside&nbsp;too.</p>
          )
        ) : null}
        <label className="sp-toggle">
          <span>
            Keep these guests
            <small>Seat everyone won’t change who sits&nbsp;here</small>
          </span>
          <input type="checkbox" className="sp-switch" checked={!!t.locked} onChange={(e) => commit((c) => (c.tables.find((x) => x.id === t.id)!.locked = e.target.checked || undefined))} />
        </label>
        {!seated.length || t.spare ? (
          <label className="sp-toggle">
            <span>
              Spare table
              <small>Kept empty for walk-ins</small>
            </span>
            <input type="checkbox" className="sp-switch" checked={!!t.spare} onChange={(e) => commit((c) => (c.tables.find((x) => x.id === t.id)!.spare = e.target.checked || undefined))} />
          </label>
        ) : null}
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
              Not kept: {describeRule(chart, rule)}.
            </p>
          ))}
        {seated.length ? (
          <div className="sp-who">
            {seated.map((g) => (
              <div key={g.id}>
                <span>{g.name}</span>
                <button
                  className="sp-ib"
                  aria-label={`Take ${g.name} off this table`}
                  title="Take off this table"
                  onClick={() =>
                    commit((c) =>
                      Object.assign(
                        c.guests.find((x) => x.id === g.id)!,
                        { tableId: null, seat: null },
                      ),
                    )
                  }
                >
                  {X}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ margin: 0, fontSize: 13, opacity: 0.75 }}>No one here yet. Tap a group in the list, then this table.</p>
        )}
        <div className="sp-acts">
          {t.fixed ? null : (
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
          )}
          <button
            className="sp-btn ghost"
            onClick={() =>
              commit((c) => {
                const copy = {
                  ...structuredClone(t),
                  id: `t${Date.now().toString(36)}`,
                  x: t.x + 60,
                  y: t.y + 60,
                };
                const nums = c.tables.map((x) => Number(x.label)).filter(Number.isFinite);
                copy.label = /^\d+$/.test(t.label) ? String(Math.max(0, ...nums) + 1) : `${t.label} 2`;
                copy.locked = undefined;
                copy.fixed = undefined;
                c.tables.push(copy);
              })
            }
          >
            Duplicate
          </button>
          {seated.length ? (
            <button
              className="sp-btn ghost"
              onClick={() => {
                onNotice(off(seated.length, "Table cleared"));
                commit((c) => c.guests.forEach((g) => g.tableId === t.id && Object.assign(g, { tableId: null, seat: null })));
              }}
            >
              Clear
            </button>
          ) : null}
          <button
            className="sp-ib sp-danger sp-del"
            aria-label="Delete this table"
            title="Delete this table"
            onClick={() => {
              if (seated.length) onNotice(off(seated.length, "Table deleted"));
              commit((c) => {
                c.tables = c.tables.filter((x) => x.id !== t.id);
                for (const g of c.guests) if (g.tableId === t.id) Object.assign(g, { tableId: null, seat: null });
              });
              onClose();
            }}
          >
            {TRASH}
          </button>
        </div>
      </div>
    );
  }

  if (sel.kind === "object") {
    const o = chart.objects.find((x) => x.id === sel.id);
    if (!o) return null;
    const set = (fn: (oo: typeof o) => void) => commit((c) => fn(c.objects.find((x) => x.id === o.id)!));
    return (
      <div className="sp-float sp-insp" onFocusCapture={ghost} role="dialog" aria-label={o.label}>
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
        <div className="sp-dims">
          <LenField label="Width" cm={o.w} size units={units} min={40} max={3000} disabled={o.fixed} onSet={(v) => set((oo) => (oo.w = v))} />
          <LenField label="Depth" cm={o.h} size units={units} min={40} max={3000} disabled={o.fixed} onSet={(v) => set((oo) => (oo.h = v))} />
          <DegField deg={o.rot} disabled={o.fixed} onSet={(v) => set((oo) => (oo.rot = v))} />
        </div>
        <ExactPosition what={o.label.toLowerCase()} x={o.x} y={o.y} units={units} disabled={o.fixed} onSet={(k, v) => set((oo) => (oo[k] = v))} />
        <label className="sp-toggle">
          <span>
            Lock in place
            <small>Can’t be moved, turned or resized</small>
          </span>
          <input type="checkbox" className="sp-switch" checked={!!o.fixed} onChange={(e) => set((oo) => (oo.fixed = e.target.checked || undefined))} />
        </label>
        <div className="sp-acts">
          {o.fixed ? null : (
            <button className="sp-btn ghost" onClick={() => set((oo) => (oo.rot = (oo.rot + 90) % 360))}>
              Turn 90°
            </button>
          )}
          <button
            className="sp-ib sp-danger sp-del"
            aria-label={`Delete ${o.label}`}
            title="Delete"
            onClick={() => {
              commit((c) => (c.objects = c.objects.filter((x) => x.id !== o.id)));
              onClose();
            }}
          >
            {TRASH}
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
    <div className="sp-float sp-insp sp-gcard" onFocusCapture={ghost} role="dialog" aria-label={g.name}>
      {/* The title is their name: tap it to fix the spelling. Their group sits under it. */}
      <h3 className="sp-insp-title">
        <input key={`g${g.id}`} aria-label="Guest name" className="sp-title-in" {...textProps(g.name, (c, v) => (c.guests.find((x) => x.id === g.id)!.name = v || "Guest"), 120)} />
        <button className="sp-ib" aria-label="Close" onClick={onClose}>
          {X}
        </button>
      </h3>
      <div className="sp-gcard__meta">
        <label className="sp-chipsel" title="Their group">
          <select aria-label="Group" value={g.groupId ?? ""} onChange={(e) => commit((c) => (c.guests.find((x) => x.id === g.id)!.groupId = e.target.value || null))}>
            <option value="">Other guests</option>
            {chart.groups.map((gr) => (
              <option key={gr.id} value={gr.id}>
                {gr.name}
              </option>
            ))}
          </select>
        </label>
        {g.reply === "pending" ? <span className="sp-gcard__flag">Hasn’t replied</span> : g.reply === "no" ? <span className="sp-gcard__flag no">Can’t come</span> : null}
      </div>

      {/* Where they sit, and what to do about it. */}
      <div className={`sp-gcard__seat${t ? "" : " none"}`}>
        <div className="sp-gcard__where">
          <b>{t ? (/^\d+[a-z]?$/i.test(t.label) ? `Table ${t.label}` : t.label) : "Not seated yet"}</b>
          <span>
            {[t ? `Seat ${(g.seat ?? 0) + 1}` : "", household.length ? `with their household of ${household.length + 1}` : ""].filter(Boolean).join(" · ")}
          </span>
        </div>
        <div className="sp-gcard__acts">
          <button className="sp-btn primary" onClick={() => onArm([g.id], g.name, `u:${g.id}`)}>
            {t ? "Move" : "Seat"}
          </button>
          {t ? (
            <>
              <button className="sp-btn ghost" onClick={() => commit((c) => Object.assign(c.guests.find((x) => x.id === g.id)!, { tableId: null, seat: null }))}>
                Unseat
              </button>
              <button className="sp-ib" aria-label={`Show ${t.label} on the plan`} title="Show on the plan" onClick={() => onFocusTable(t.id)}>
                <svg width="17" height="17" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden>
                  <circle cx="10" cy="10" r="3" />
                  <path d="M10 2.5v3M10 14.5v3M2.5 10h3M14.5 10h3" />
                </svg>
              </button>
            </>
          ) : null}
        </div>
        {why && t ? <p className="sp-gcard__why">{why}.</p> : null}
      </div>

      <div className="sp-field">
        About {g.name.split(" ").find((w) => !isHonorific(w)) ?? g.name.split(" ")[0]}
        <div className="sp-tags" role="group" aria-label="Tags">
          {TAGS.map(([tag, label, hint]) => {
            const on = !!g.tags?.includes(tag);
            return (
              <button
                key={tag}
                aria-pressed={on}
                title={hint}
                onClick={() =>
                  commit((c) => {
                    const x = c.guests.find((y) => y.id === g.id)!;
                    const next = on ? (x.tags ?? []).filter((y) => y !== tag) : [...(x.tags ?? []), tag];
                    x.tags = next.length ? next : undefined;
                  })
                }
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>
      <label className="sp-field">
        Meal or note
        <input key={`m${g.id}`} placeholder="Fish, vegetarian, wheelchair…" {...textProps(g.meal ?? "", (c, v) => (c.guests.find((x) => x.id === g.id)!.meal = v || undefined), 60)} />
      </label>
      <div className="sp-field">
        Seating rules
        <RuleList chart={chart} guestId={g.id} composer={addingRule} onDone={() => setAddingRule(false)} />
        {!addingRule ? (
          <button className="sp-link soft" style={{ alignSelf: "flex-start" }} onClick={() => setAddingRule(true)}>
            + Keep {g.name.split(" ").find((w) => !isHonorific(w)) ?? g.name.split(" ")[0]} with or apart from someone
          </button>
        ) : null}
      </div>

      <div className="sp-gcard__foot">
        <label className="sp-toggle">
          <span>
            Not coming
            {g.reply === "no" ? <small>Their seat counts as free</small> : null}
          </span>
          <input
            type="checkbox"
            className="sp-switch"
            checked={g.reply === "no"}
            onChange={(e) => commit((c) => (c.guests.find((x) => x.id === g.id)!.reply = e.target.checked ? "no" : g.inviteeId ? "yes" : undefined))}
          />
        </label>
        <button
          className="sp-ib sp-danger sp-del"
          aria-label={`Remove ${g.name} from the list`}
          title="Remove from the guest list"
          onClick={() => {
            commit((c) => (c.guests = c.guests.filter((x) => x.id !== g.id)));
            onClose();
          }}
        >
          {TRASH}
        </button>
      </div>
    </div>
  );
}

export const CATS = Object.keys(CATEGORY_LABEL) as Category[];
