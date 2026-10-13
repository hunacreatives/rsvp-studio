import { useMemo, useState } from "react";
import { ruleBreaks, uid, type Chart, type Rule } from "./model";
import { commit } from "./store";

// Seating rules between two guests: Together or Apart, Must (never broken by Seat everyone)
// or Prefer (followed when there's room to). Shown for one guest on their card, or all of
// them in the Rules window, with any the current seating breaks marked.

const X = (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
    <path d="M4 4l8 8M12 4l-8 8" />
  </svg>
);

export function describeRule(chart: Chart, r: Rule) {
  const name = (id: string) => chart.guests.find((g) => g.id === id)?.name ?? "Someone";
  return `${name(r.a)} ${r.kind === "apart" ? "apart from" : "with"} ${name(r.b)}`;
}

/** Name box with suggestions; resolves to a guest id. */
function GuestPick({ chart, value, onChange, exclude, label, listId }: { chart: Chart; value: string; onChange(v: string): void; exclude?: string; label: string; listId: string }) {
  return (
    <>
      <input list={listId} value={value} onChange={(e) => onChange(e.target.value)} placeholder="Type a name" aria-label={label} autoComplete="off" />
      <datalist id={listId}>
        {chart.guests
          .filter((g) => g.id !== exclude)
          .slice(0, 800)
          .map((g) => (
            <option key={g.id} value={g.name} />
          ))}
      </datalist>
    </>
  );
}

export function RuleList({ chart, guestId }: { chart: Chart; guestId?: string }) {
  const rules = (chart.rules ?? []).filter((r) => !guestId || r.a === guestId || r.b === guestId);
  const broken = useMemo(() => new Set(ruleBreaks(chart).map((b) => b.rule.id)), [chart]);
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [kind, setKind] = useState<Rule["kind"]>("apart");
  const [must, setMust] = useState(true);
  const [err, setErr] = useState("");
  const byName = (n: string) => chart.guests.find((g) => g.name.toLowerCase() === n.trim().toLowerCase());

  const add = () => {
    const ga = guestId ? chart.guests.find((g) => g.id === guestId) : byName(a);
    const gb = byName(b);
    if (!ga || !gb) return setErr("Pick both people from the list of names.");
    if (ga.id === gb.id) return setErr("Pick two different people.");
    if (kind === "apart" && ga.party === gb.party) return setErr("They’re in the same household, which always sits together.");
    const clash = (chart.rules ?? []).find((r) => (r.a === ga.id && r.b === gb.id) || (r.a === gb.id && r.b === ga.id));
    commit((c) => {
      c.rules = (c.rules ?? []).filter((r) => r !== clash && r.id !== clash?.id);
      c.rules.push({ id: uid("r"), a: ga.id, b: gb.id, kind, must });
    });
    setA("");
    setB("");
    setErr("");
  };

  return (
    <div className="sp-rules">
      {rules.length ? (
        <div className="sp-who">
          {rules.map((r) => (
            <div key={r.id} className={broken.has(r.id) ? "broken" : undefined}>
              <span title={broken.has(r.id) ? "The seating right now breaks this rule" : undefined}>
                <b className={`sp-pill ${r.kind}`}>{r.must ? "Must" : "Prefer"}</b> {describeRule(chart, r)}
                {broken.has(r.id) ? " · not kept" : ""}
              </span>
              <button className="sp-ib" aria-label={`Remove rule: ${describeRule(chart, r)}`} onClick={() => commit((c) => (c.rules = (c.rules ?? []).filter((x) => x.id !== r.id)))}>
                {X}
              </button>
            </div>
          ))}
        </div>
      ) : null}
      <div className="sp-rule-add">
        {!guestId ? <GuestPick chart={chart} value={a} onChange={setA} label="First guest" listId="sp-rule-a" /> : null}
        <div className="sp-seg" role="group" aria-label="Together or apart">
          <button aria-pressed={kind === "together"} onClick={() => setKind("together")}>
            Together
          </button>
          <button aria-pressed={kind === "apart"} onClick={() => setKind("apart")}>
            Apart
          </button>
        </div>
        <GuestPick chart={chart} value={b} onChange={setB} exclude={guestId} label={kind === "apart" ? "Keep apart from" : "Seat with"} listId={`sp-rule-b-${guestId ?? "all"}`} />
        <div className="sp-seg" role="group" aria-label="How strict">
          <button aria-pressed={must} onClick={() => setMust(true)} title="Seat everyone never breaks it">
            Must
          </button>
          <button aria-pressed={!must} onClick={() => setMust(false)} title="Followed when there’s room">
            Prefer
          </button>
        </div>
        <button className="sp-btn primary" onClick={add}>
          Add rule
        </button>
        {err ? <p className="sp-err">{err}</p> : null}
      </div>
    </div>
  );
}

export default function RulesDialog({ chart, onClose, onShow }: { chart: Chart; onClose(): void; onShow(tableId: string): void }) {
  const breaks = ruleBreaks(chart);
  return (
    <div className="sp-scrim" onClick={onClose}>
      <div className="sp-dialog" role="dialog" aria-modal="true" aria-labelledby="sp-rules-h" onClick={(e) => e.stopPropagation()}>
        <h2 id="sp-rules-h">Seating rules</h2>
        <p>Who should sit together and who shouldn’t. Seat everyone never breaks a Must rule and follows Prefer rules when there’s room. If a move you make breaks one, the table turns red.</p>
        {breaks.length ? (
          <div className="sp-broken">
            {breaks.map(({ rule, a, b }) => (
              <button key={rule.id} className="sp-link" onClick={() => onShow((rule.kind === "apart" ? a.tableId : b.tableId) ?? a.tableId!)}>
                Not kept: {describeRule(chart, rule)} — show
              </button>
            ))}
          </div>
        ) : null}
        <RuleList chart={chart} />
        <div className="row">
          <button className="sp-btn soft" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
