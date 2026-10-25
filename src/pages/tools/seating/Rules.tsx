import { useId, useMemo, useRef, useState } from "react";
import { ruleBreaks, uid, type Chart, type Guest, type Rule } from "./model";
import { commit } from "./store";

// Seating rules between two guests, written as sentences: "Keep Ana apart from Ben, always."
// Always (must) is never broken by Seat everyone; "if there's room" (prefer) is followed when
// it can be. Shown for one guest on their card, or all of them in the Rules window.

const X = (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
    <path d="M4 4l8 8M12 4l-8 8" />
  </svg>
);

const nameOf = (chart: Chart, id: string) => chart.guests.find((g) => g.id === id)?.name ?? "Someone";

export function describeRule(chart: Chart, r: Rule) {
  return `Keep ${nameOf(chart, r.a)} ${r.kind === "apart" ? "apart from" : "together with"} ${nameOf(chart, r.b)}`;
}

/** The guests whose names contain what was typed, best first (starts-with before contains). */
function matching(chart: Chart, q: string, exclude?: string) {
  const s = q.trim().toLowerCase();
  if (!s) return [];
  const hits = chart.guests.filter((g) => g.id !== exclude && g.name.toLowerCase().includes(s));
  const starts = (g: Guest) => (g.name.toLowerCase().startsWith(s) || g.name.toLowerCase().includes(` ${s}`) ? 0 : 1);
  return hits.sort((a, b) => starts(a) - starts(b) || a.name.localeCompare(b.name));
}

/** The guest a typed name means: an exact name, or the only one that matches. */
function resolve(chart: Chart, q: string, exclude?: string): Guest | "many" | null {
  const s = q.trim().toLowerCase();
  if (!s) return null;
  const exact = chart.guests.filter((g) => g.id !== exclude && g.name.toLowerCase() === s);
  if (exact.length === 1) return exact[0];
  const hits = matching(chart, q, exclude);
  if (hits.length === 1) return hits[0];
  return hits.length ? "many" : null;
}

/** A name box that suggests guests as you type, with their group, and settles on one. */
function GuestCombo({ chart, value, onChange, exclude, label }: { chart: Chart; value: string; onChange(v: string): void; exclude?: string; label: string }) {
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const id = useId();
  const groupName = useMemo(() => new Map(chart.groups.map((g) => [g.id, g.name])), [chart.groups]);
  const list = open ? matching(chart, value, exclude).slice(0, 6) : [];
  const exact = list.length === 1 && list[0].name.toLowerCase() === value.trim().toLowerCase();
  const show = list.length > 0 && !exact;
  const pick = (g: Guest) => {
    onChange(g.name);
    setOpen(false);
  };
  return (
    <span className="sp-combo">
      <input
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setHi(0);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={(e) => {
          if (!show) return;
          if (e.key === "ArrowDown") (e.preventDefault(), setHi((h) => Math.min(list.length - 1, h + 1)));
          else if (e.key === "ArrowUp") (e.preventDefault(), setHi((h) => Math.max(0, h - 1)));
          else if (e.key === "Enter") (e.preventDefault(), e.stopPropagation(), pick(list[hi]));
          else if (e.key === "Escape") (e.stopPropagation(), setOpen(false));
        }}
        placeholder="a guest"
        aria-label={label}
        role="combobox"
        aria-expanded={show}
        aria-controls={id}
        aria-autocomplete="list"
        autoComplete="off"
        enterKeyHint="next"
      />
      {show ? (
        <span className="sp-combo__list" role="listbox" id={id}>
          {list.map((g, i) => (
            <button key={g.id} type="button" role="option" aria-selected={i === hi} onMouseDown={(e) => e.preventDefault()} onClick={() => pick(g)}>
              {g.name}
              <small>{g.groupId ? groupName.get(g.groupId) : "Other guests"}</small>
            </button>
          ))}
        </span>
      ) : null}
    </span>
  );
}

/** The sentence you fill in to add a rule. With a guest, it starts with their name. */
function Composer({ chart, guestId, onDone }: { chart: Chart; guestId?: string; onDone?(): void }) {
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [kind, setKind] = useState<Rule["kind"]>("apart");
  const [must, setMust] = useState(true);
  const [err, setErr] = useState("");
  const first = useRef<HTMLSpanElement>(null);
  const me = guestId ? chart.guests.find((g) => g.id === guestId) : undefined;

  const add = () => {
    const ga = me ?? resolve(chart, a);
    const gb = resolve(chart, b, ga && ga !== "many" ? ga.id : undefined);
    if (ga === "many" || gb === "many") return setErr("More than one guest has that name. Pick one from the list.");
    if (!ga || !gb) return setErr("We couldn’t find that guest. Type part of a name and pick from the list.");
    if (ga.id === gb.id) return setErr("Pick two different people.");
    if (kind === "apart" && ga.party === gb.party) return setErr("They’re in the same household, which always sits together.");
    const clash = (chart.rules ?? []).find((r) => (r.a === ga.id && r.b === gb.id) || (r.a === gb.id && r.b === ga.id));
    commit((c) => {
      c.rules = (c.rules ?? []).filter((r) => r.id !== clash?.id);
      c.rules.push({ id: uid("r"), a: ga.id, b: gb.id, kind, must });
    });
    setA("");
    setB("");
    setErr("");
    if (onDone) onDone();
    else first.current?.querySelector("input")?.focus();
  };

  return (
    <form
      className="sp-compose"
      onSubmit={(e) => {
        e.preventDefault();
        add();
      }}
    >
      <p className="sp-sentence">
        Keep{" "}
        {me ? (
          <b>{me.name}</b>
        ) : (
          <span ref={first}>
            <GuestCombo chart={chart} value={a} onChange={setA} label="First guest" />
          </span>
        )}{" "}
        <select className="sp-word" value={kind} onChange={(e) => setKind(e.target.value as Rule["kind"])} aria-label="Together or apart">
          <option value="apart">apart from</option>
          <option value="together">together with</option>
        </select>{" "}
        <GuestCombo chart={chart} value={b} onChange={setB} exclude={guestId} label={kind === "apart" ? "Keep apart from" : "Keep together with"} />{" "}
        <select className="sp-word" value={must ? "must" : "prefer"} onChange={(e) => setMust(e.target.value === "must")} aria-label="How strict">
          <option value="must">always</option>
          <option value="prefer">if there’s room</option>
        </select>
      </p>
      {err ? <p className="sp-err">{err}</p> : null}
      <div className="sp-compose__acts">
        {onDone ? (
          <button type="button" className="sp-btn ghost" onClick={onDone}>
            Cancel
          </button>
        ) : null}
        <button type="submit" className="sp-btn primary">
          Add rule
        </button>
      </div>
    </form>
  );
}

/**
 * The rules, as sentences, each with whether the seating keeps it. `composer` shows the
 * sentence to add one (always on in the Rules window; on the guest card, on request).
 */
export function RuleList({ chart, guestId, composer = !guestId, onDone, onShow }: { chart: Chart; guestId?: string; composer?: boolean; onDone?(): void; onShow?(tableId: string): void }) {
  const rules = (chart.rules ?? []).filter((r) => !guestId || r.a === guestId || r.b === guestId);
  const broken = useMemo(() => new Map(ruleBreaks(chart).map((b) => [b.rule.id, b])), [chart]);
  const byId = useMemo(() => new Map(chart.guests.map((g) => [g.id, g])), [chart.guests]);
  // On a guest's card, their own name goes first so the sentence reads from them.
  const other = (r: Rule) => (guestId && r.b === guestId ? r.a : r.b);
  const self = (r: Rule) => (guestId && r.b === guestId ? r.b : r.a);

  return (
    <div className="sp-rules">
      {rules.length ? (
        <ul className="sp-rule-list">
          {rules.map((r) => {
            const br = broken.get(r.id);
            const a = byId.get(r.a);
            const b = byId.get(r.b);
            const placed = !!(a?.tableId && b?.tableId);
            const at = br ? ((r.kind === "apart" ? br.a.tableId : br.b.tableId) ?? br.a.tableId) : null;
            return (
              <li key={r.id} className={br ? "broken" : undefined}>
                <span className="sp-rule-txt">
                  Keep <b>{nameOf(chart, self(r))}</b> {r.kind === "apart" ? "apart from" : "together with"} <b>{nameOf(chart, other(r))}</b>
                  <small>
                    {r.must ? "Always" : "If there’s room"}
                    {br ? " · Not kept" : placed ? " · Kept" : ""}
                    {br && at && onShow ? (
                      <>
                        {" · "}
                        <button className="sp-link" onClick={() => onShow(at)}>
                          Show
                        </button>
                      </>
                    ) : null}
                  </small>
                </span>
                <button className="sp-ib" aria-label={`Remove rule: ${describeRule(chart, r)}`} title="Remove" onClick={() => commit((c) => (c.rules = (c.rules ?? []).filter((x) => x.id !== r.id)))}>
                  {X}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
      {composer ? <Composer chart={chart} guestId={guestId} onDone={onDone} /> : null}
    </div>
  );
}

export default function RulesDialog({ chart, onClose, onShow }: { chart: Chart; onClose(): void; onShow(tableId: string): void }) {
  const none = !chart.rules?.length;
  return (
    <div className="sp-scrim" onClick={onClose}>
      <div className="sp-dialog sp-rules-dlg" role="dialog" aria-modal="true" aria-labelledby="sp-rules-h" onClick={(e) => e.stopPropagation()}>
        <h2 id="sp-rules-h">Seating rules</h2>
        <p>Seat everyone never breaks an “always” rule, and keeps the others when there’s room.</p>
        {none ? <p className="sp-rules-eg">For example: Keep Tito Ramon apart from Tita Cora, always.</p> : null}
        <RuleList chart={chart} onShow={onShow} />
        <div className="row">
          <button className="sp-btn soft" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
