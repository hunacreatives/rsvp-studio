import type { ReactNode } from "react";
import { OBJ_LABEL, SHAPE_LABEL, type ObjType, type SeatPrefs, type Shape } from "./model";
import type { Look } from "./Editor";
import type { Units } from "./units";

// The editor's small panels that open from the canvas: adding a table (picture tiles), adding
// something to the room, and the View settings (names on seats, the look). Each is a
// popover; the editor decides where it opens.

/** A small drawing of a table shape, for the Add tiles and the table card's shape picker. */
export function ShapeArt({ shape, seats = 10, size = 40 }: { shape: Shape; seats?: number; size?: number }) {
  const dot = (x: number, y: number, k: string) => <circle key={k} cx={x} cy={y} r="2.6" fill="currentColor" stroke="none" />;
  let body: ReactNode;
  if (shape === "round" || shape === "cocktail") {
    const n = shape === "cocktail" ? 4 : Math.min(12, seats);
    const r = shape === "cocktail" ? 6 : 9;
    body = (
      <>
        <circle cx="20" cy="20" r={r} />
        {Array.from({ length: n }, (_, i) => {
          const a = (i / n) * Math.PI * 2 - Math.PI / 2;
          return dot(20 + Math.cos(a) * (r + 6), 20 + Math.sin(a) * (r + 6), `${i}`);
        })}
      </>
    );
  } else if (shape === "rect") {
    body = (
      <>
        <rect x="7" y="15" width="26" height="10" rx="1.5" />
        {[11, 17, 23, 29].flatMap((x) => [dot(x, 10, `t${x}`), dot(x, 30, `b${x}`)])}
      </>
    );
  } else if (shape === "head") {
    body = (
      <>
        <rect x="5" y="13" width="30" height="8" rx="1.5" />
        {[9, 15, 21, 27, 33].map((x) => dot(x - 1, 27, `${x}`))}
      </>
    );
  } else if (shape === "sweetheart") {
    body = (
      <>
        <rect x="12" y="14" width="16" height="8" rx="1.5" />
        {dot(17, 28, "a")}
        {dot(23, 28, "b")}
      </>
    );
  } else if (shape === "ushape") {
    body = (
      <>
        <path d="M8 8v24h24V8" strokeWidth="5" strokeLinejoin="round" fill="none" />
      </>
    );
  } else {
    body = <path d="M9 8v23h23" strokeWidth="5" strokeLinejoin="round" fill="none" />;
  }
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      {body}
    </svg>
  );
}

export const TABLE_TILES: { shape: Shape; seats: number; label: string; sub: string }[] = [
  { shape: "round", seats: 10, label: "Round", sub: "10 seats" },
  { shape: "round", seats: 8, label: "Round", sub: "8 seats" },
  { shape: "round", seats: 12, label: "Lauriat", sub: "12 seats" },
  { shape: "rect", seats: 10, label: "Long", sub: "10 seats" },
  { shape: "head", seats: 10, label: "Head table", sub: "One side" },
  { shape: "sweetheart", seats: 2, label: SHAPE_LABEL.sweetheart, sub: "The couple" },
  { shape: "ushape", seats: 20, label: SHAPE_LABEL.ushape, sub: "20 seats" },
  { shape: "lshape", seats: 14, label: SHAPE_LABEL.lshape, sub: "14 seats" },
  { shape: "cocktail", seats: 4, label: SHAPE_LABEL.cocktail, sub: "Standing" },
];

export function AddTablePanel({ onAdd }: { onAdd(shape: Shape, seats: number): void }) {
  return (
    <div className="sp-pop" role="menu" aria-label="Add a table">
      <p className="sp-pop-h">Add a table</p>
      <div className="sp-tiles">
        {TABLE_TILES.map((t) => (
          <button key={`${t.shape}${t.seats}`} role="menuitem" className="sp-tile" onClick={() => onAdd(t.shape, t.seats)}>
            <ShapeArt shape={t.shape} seats={t.seats} />
            <b>{t.label}</b>
            <small>{t.sub}</small>
          </button>
        ))}
      </div>
    </div>
  );
}

const ROOM_ITEMS: ObjType[] = ["stage", "dance", "buffet", "bar", "dj", "photo", "cake", "lechon", "gifts", "entrance", "exit", "restroom", "pillar", "custom"];

export function AddRoomPanel({ onAdd, onRoom, onFit, hasPlan }: { onAdd(t: ObjType): void; onRoom(): void; onFit(): void; hasPlan: boolean }) {
  return (
    <div className="sp-pop" role="menu" aria-label="Add to the room">
      {/* The venue's own floor plan first: the quickest way to a real room. */}
      <button role="menuitem" className="sp-venue-btn" onClick={onRoom}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M3 5h18v14H3zM3 10h6v9M14 5v6h7" />
        </svg>
        <span>
          <b>{hasPlan ? "The venue’s floor plan" : "Add the venue’s floor plan"}</b>
          <small>{hasPlan ? "Read it, measure it, or change the room size" : "Mesa sets up the room from it. Room size is here too"}</small>
        </span>
      </button>
      <p className="sp-pop-h">Add to the room</p>
      <div className="sp-chips">
        {ROOM_ITEMS.map((t) => (
          <button key={t} role="menuitem" className="sp-chipbtn" onClick={() => onAdd(t)}>
            {t === "custom" ? "Something else" : OBJ_LABEL[t]}
          </button>
        ))}
      </div>
      <div className="sp-pop-foot">
        <button className="sp-link soft" onClick={onFit}>
          Fit the tables to the room
        </button>
      </div>
    </div>
  );
}

const LOOKS: { k: Look; label: string; bg: string; ink: string; seat: string }[] = [
  { k: "b", label: "Paper & ink", bg: "#fbf8f0", ink: "#1f2540", seat: "#d9b45a" },
  { k: "a", label: "Blueprint", bg: "#13213f", ink: "#d8e4ff", seat: "#d9b45a" },
  { k: "c", label: "Evening", bg: "#1b1714", ink: "#f2e7d2", seat: "#c98a63" },
];
type Names = "auto" | "initials" | "first" | "full";

export function ViewPanel({
  names,
  setNames,
  look,
  setLook,
  units,
  setUnits,
  grid,
  setGrid,
  rulers,
  setRulers,
  snap,
  setSnap,
  walkways,
  setWalkways,
}: {
  names: Names;
  setNames(n: Names): void;
  look: Look;
  setLook(l: Look): void;
  units: Units;
  setUnits(u: Units): void;
  grid: "off" | "half" | "m";
  setGrid(g: "off" | "half" | "m"): void;
  rulers: boolean;
  setRulers(on: boolean): void;
  snap: boolean;
  setSnap(on: boolean): void;
  walkways: boolean;
  setWalkways(on: boolean): void;
}) {
  return (
    <div className="sp-pop" role="dialog" aria-label="View">
      <p className="sp-pop-h">Names on seats</p>
      <div className="sp-seg" role="group" aria-label="Names on seats">
        {(
          [
            ["auto", "Auto"],
            ["initials", "Initials"],
            ["first", "First"],
            ["full", "Full"],
          ] as const
        ).map(([k, l]) => (
          <button key={k} aria-pressed={names === k} onClick={() => setNames(k)}>
            {l}
          </button>
        ))}
      </div>
      <p className="sp-pop-note">{names === "auto" ? "Initials, and names as you zoom in." : names === "initials" ? "Initials only." : "Shown once you zoom in a little."}</p>
      <p className="sp-pop-h">Measurements</p>
      <div className="sp-seg" role="group" aria-label="Measurements">
        {(
          [
            ["m", "Metres"],
            ["ft", "Feet"],
          ] as const
        ).map(([k, l]) => (
          <button key={k} aria-pressed={units === k} onClick={() => setUnits(k)}>
            {l}
          </button>
        ))}
      </div>
      <p className="sp-pop-note">Walkways, sizes and positions. Your plan stays the same either way.</p>
      <p className="sp-pop-h">Grid</p>
      <div className="sp-seg" role="group" aria-label="Grid">
        {(
          [
            ["off", "Off"],
            ["half", units === "ft" ? "Fine" : "50 cm"],
            ["m", units === "ft" ? "Normal" : "1 m"],
          ] as const
        ).map(([k, l]) => (
          <button key={k} aria-pressed={grid === k} onClick={() => setGrid(k)}>
            {l}
          </button>
        ))}
      </div>
      <label className="sp-toggle">
        <span>
          Rulers
          <small>Along the top and left</small>
        </span>
        <input type="checkbox" className="sp-switch" checked={rulers} onChange={(e) => setRulers(e.target.checked)} />
      </label>
      <label className="sp-toggle">
        <span>
          Walkways
          <small>Every gap measured, tight ones in&nbsp;red</small>
        </span>
        <input type="checkbox" className="sp-switch" checked={walkways} onChange={(e) => setWalkways(e.target.checked)} />
      </label>
      <label className="sp-toggle">
        <span>
          Snap to line up
          <small>{typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches ? "Turn off to place things freely" : "Hold Ctrl or ⌘ to move freely"}</small>
        </span>
        <input type="checkbox" className="sp-switch" checked={snap} onChange={(e) => setSnap(e.target.checked)} />
      </label>
      <p className="sp-pop-h">Look</p>
      <div className="sp-looks">
        {LOOKS.map((l) => (
          <button key={l.k} className="sp-look" aria-pressed={look === l.k} onClick={() => setLook(l.k)}>
            <span className="sp-look__pv" style={{ background: l.bg }}>
              <svg viewBox="0 0 40 26" width="100%" height="100%" aria-hidden>
                <rect x="3" y="3" width="34" height="20" rx="2" fill="none" stroke={l.ink} strokeOpacity=".7" strokeWidth="1" />
                {[11, 20, 29].map((x) => (
                  <g key={x}>
                    <circle cx={x} cy="13" r="3.2" fill="none" stroke={l.ink} strokeWidth="1" />
                    <circle cx={x} cy="7.6" r="1.1" fill={l.seat} />
                    <circle cx={x} cy="18.4" r="1.1" fill={l.seat} />
                  </g>
                ))}
              </svg>
            </span>
            <span>{l.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/** How Seat everyone seats people: under its arrow. Saved with the plan. */
export function SeatPrefsPanel({ prefs, onChange }: { prefs: SeatPrefs; onChange(p: SeatPrefs): void }) {
  const seg = <K extends keyof SeatPrefs>(key: K, label: string, opts: [SeatPrefs[K], string][], cur: SeatPrefs[K]) => (
    <div className="sp-pref">
      <span>{label}</span>
      <div className="sp-seg" role="group" aria-label={label}>
        {opts.map(([v, l]) => (
          <button key={String(v)} aria-pressed={cur === v} onClick={() => onChange({ ...prefs, [key]: v })}>
            {l}
          </button>
        ))}
      </div>
    </div>
  );
  return (
    <div className="sp-prefs">
      <p className="sp-pop-h">How to seat</p>
      {seg("spare", "Spare seats at each table", [[0, "None"], [1, "1"], [2, "2"]], prefs.spare ?? 0)}
      {seg("kids", "Kids", [["parents", "With their family"], ["table", "Kids’ table"]], prefs.kids ?? "parents")}
      {seg("sides", "Bride’s and groom’s guests", [["apart", "Own sides"], ["mix", "Mixed"]], prefs.sides ?? "apart")}
      <label className="sp-toggle">
        <span>
          Lolos, lolas and easy access
          <small>Near the exits, away from the speakers</small>
        </span>
        <input type="checkbox" className="sp-switch" checked={prefs.care !== false} onChange={(e) => onChange({ ...prefs, care: e.target.checked ? undefined : false })} />
      </label>
    </div>
  );
}
