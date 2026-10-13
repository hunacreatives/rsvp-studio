import { useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import * as api from "@/pages/account/portal/api";
import "./builder.css";

// Custom domains for a site (api/_lib/domains.ts): the search box + results, the
// perks, and the "setting it up" screen after paying. Used at publish time and on
// the project's Website tab. Prices are all-in; Vercel's cost never reaches here.

export const peso = (n: number) => new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 }).format(n);

export const DOMAIN_PERKS = [
  "Easy to share and remember",
  "Looks polished on printed invitations and save-the-dates",
  "Your website stays online for as long as you keep it",
  "Set up for you in minutes — nothing technical to do",
];

/** Search a name, pick an address. `onPick` gets the chosen domain and its price. */
export function DomainPicker({ eventId, suggestion, onPick, busy }: { eventId: string; suggestion?: string; onPick: (domain: string, php: number) => void; busy?: boolean }) {
  const [query, setQuery] = useState(suggestion ?? "");
  const [state, setState] = useState<{ kind: "idle" } | { kind: "searching" } | { kind: "done"; results: api.DomainResult[]; taken: string[] } | { kind: "error"; text: string }>({ kind: "idle" });

  const search = async (e?: FormEvent) => {
    e?.preventDefault();
    if (query.replace(/[^a-z0-9]/gi, "").length < 2) return setState({ kind: "error", text: "Type at least 2 letters or numbers." });
    setState({ kind: "searching" });
    try {
      const r = await api.searchDomains(eventId, query);
      setState({ kind: "done", ...r });
    } catch (err) {
      setState({ kind: "error", text: err instanceof Error ? err.message : "Search isn’t responding — please try again." });
    }
  };

  return (
    <div>
      <form onSubmit={search} style={{ display: "flex", gap: 8 }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. gelat30"
          aria-label="Web address to search"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          style={{ flex: 1, minWidth: 0, fontSize: 16, padding: "10px 14px", borderRadius: 999, border: "1px solid #d9d9e3", outline: "none" }}
        />
        <button type="submit" disabled={state.kind === "searching"} style={{ ...pill(true), background: "#2f61d5" }}>
          {state.kind === "searching" ? "Searching…" : "Search"}
        </button>
      </form>
      {state.kind === "error" ? <p style={{ margin: "10px 0 0", fontSize: 13, color: "#c2412d" }}>{state.text}</p> : null}
      {state.kind === "done" ? (
        <div style={{ marginTop: 12 }}>
          {state.results.length ? (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, border: "1px solid #e7e7e0", borderRadius: 14, overflow: "hidden" }}>
              {state.results.map((r, i) => (
                // Wraps on narrow screens: the domain gets its own line, price + Choose
                // drop below it (on wider cards everything still fits on one line).
                <li key={r.domain} style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "6px 10px", padding: "10px 14px", borderTop: i ? "1px solid #e7e7e0" : "none" }}>
                  <span style={{ flex: "1 1 150px", minWidth: 0, fontSize: 15, fontWeight: 600, color: "#000727", overflowWrap: "anywhere" }}>{r.domain}</span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 10, marginLeft: "auto" }}>
                    <span style={{ fontSize: 13, color: "#55556a", whiteSpace: "nowrap" }}>{peso(r.php)} / year</span>
                    <button onClick={() => onPick(r.domain, r.php)} disabled={busy} className="rb-tap44" style={{ ...pill(false), padding: "6px 14px", fontSize: 13 }}>
                      Choose
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ margin: 0, fontSize: 14, color: "#55556a" }}>Nothing available for that name — try adding a word, like “{query.replace(/\..*$/, "")}wedding”.</p>
          )}
          {state.taken.length && state.results.length ? <p style={{ margin: "8px 0 0", fontSize: 13, color: "#868697" }}>Taken: {state.taken.join(", ")}</p> : null}
        </div>
      ) : null}
    </div>
  );
}

const STEP_TEXT: Record<string, string> = {
  paid: "Payment received — getting your address…",
  buying: "Registering your address…",
  connecting: "Connecting it to your website…",
};

/** After PayMongo sends them back (?domain=…): watch the setup until it's live. */
export function useDomainReturn(eventId: string | undefined) {
  const [params, setParams] = useSearchParams();
  const [state, setState] = useState<{ kind: "closed" } | { kind: "working"; text: string } | { kind: "live"; domain: string } | { kind: "slow" } | { kind: "error"; text: string }>({ kind: "closed" });

  useEffect(() => {
    const paid = params.get("domain");
    const cancelled = params.get("domain_cancelled") === "1";
    if (!eventId || (!paid && !cancelled)) return;
    const next = new URLSearchParams(params);
    next.delete("domain");
    next.delete("domain_cancelled");
    setParams(next, { replace: true });
    if (cancelled) return setState({ kind: "error", text: "Payment cancelled — nothing was charged. Your website is still on its free link." });
    let live = true;
    (async () => {
      setState({ kind: "working", text: "Confirming your payment…" });
      for (let i = 0; i < 40 && live; i++) {
        const s = await api.domainStatus(eventId);
        if (s.status === "active" && s.domain) return live && setState({ kind: "live", domain: s.domain });
        if (s.status === "failed") return live && setState({ kind: "error", text: `We couldn’t finish setting up ${s.domain} automatically. Our team has been told and will sort it out — another address or a full refund. Your website stays live on its free link.` });
        if (STEP_TEXT[s.status]) setState({ kind: "working", text: STEP_TEXT[s.status] });
        await new Promise((r) => setTimeout(r, 3000));
      }
      if (live) setState({ kind: "slow" });
    })();
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  return { state, close: () => setState({ kind: "closed" }) };
}

export function DomainReturnDialog({ flow }: { flow: ReturnType<typeof useDomainReturn> }) {
  const { state } = flow;
  if (state.kind === "closed") return null;
  return (
    <div role="dialog" aria-modal="true" onClick={state.kind === "working" ? undefined : flow.close} style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(0,7,39,0.45)", display: "grid", gridTemplateColumns: "minmax(0, 1fr)", placeItems: "center", padding: 16, overflowY: "auto", overscrollBehavior: "contain" }}>
      <div className="rb-dialog-card" onClick={(e) => e.stopPropagation()} style={{ width: "min(440px, 100%)", background: "#fff", borderRadius: 20, padding: 28, fontFamily: "Inter, system-ui, sans-serif", color: "#000727" }}>
        {state.kind === "working" ? (
          <p style={{ margin: 0, fontSize: 16 }}>{state.text}</p>
        ) : state.kind === "live" ? (
          <>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 600 }}>You’re live at {state.domain}</h2>
            <p style={{ margin: "10px 0 0", fontSize: 15, lineHeight: 1.6, color: "#55556a" }}>Share it with your guests. Your free link keeps working too.</p>
            <div style={{ display: "flex", gap: 10, marginTop: 18, flexWrap: "wrap" }}>
              <a href={`https://${state.domain}`} target="_blank" rel="noopener noreferrer" style={pill(true)}>
                Open {state.domain}
              </a>
              <button onClick={flow.close} style={pill(false)}>
                Done
              </button>
            </div>
          </>
        ) : (
          <>
            <p style={{ margin: 0, fontSize: 15, lineHeight: 1.6 }}>
              {state.kind === "slow" ? "Your address is still being set up — it can take a few more minutes. We’ll email you the moment it’s live." : state.text}
            </p>
            <button onClick={flow.close} style={{ ...pill(false), marginTop: 18 }}>
              OK
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function pill(primary: boolean): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "10px 18px",
    borderRadius: 999,
    border: primary ? "none" : "1px solid #d9d9e3",
    background: primary ? "#000727" : "#fff",
    color: primary ? "#fff" : "#000727",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    textDecoration: "none",
    whiteSpace: "nowrap",
  };
}
