import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { Chart } from "./model";
import { saveCloud } from "./cloud";
import { checkinLink, dayUrl, emailCoordinator, linkState, type LinkState } from "./checkin";
import { downloadTeamCard } from "./exporting";

// The host's side of day-of check-in (Premium): make the link for the welcome team, an
// optional PIN, the printable team card, a new link (locks out old phones), or turn it off.

export default function DayOfDialog({ chart, premium, onClose, onLink }: { chart: Chart; premium: boolean | null; onClose(): void; onLink(): void }) {
  const [state, setState] = useState<LinkState | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [pin, setPin] = useState("");
  const [copied, setCopied] = useState(false);
  const [sure, setSure] = useState<"new" | "off" | null>(null);
  const [coord, setCoord] = useState("");
  const [sent, setSent] = useState<string | null>(null);
  const linked = !!chart.site?.eventId;

  useEffect(() => {
    if (!linked || !premium) return;
    let alive = true;
    // The plan has to be saved to the account before it can have a link.
    saveCloud(chart).then(() => linkState(chart.id).then((s) => alive && setState(s ?? { token: null, until: null, has_pin: false })));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linked, premium, chart.id]);

  const act = async (action: "make" | "new" | "off" | "pin", p?: string | null) => {
    setBusy(true);
    setErr("");
    try {
      if (action === "make") await saveCloud(chart);
      const next = await checkinLink(chart.id, action, p);
      setState((s) => ({ ...next, contact: s?.contact ?? null }));
      setSure(null);
      if (action === "pin") setPin("");
    } catch (e) {
      const m = e instanceof Error ? e.message : "";
      setErr(m === "premium" ? "Day-of check-in comes with Premium." : m === "pin" ? "Use 4 numbers." : m === "saved" ? "Save the plan to your account first (it does this by itself in a moment)." : "Couldn’t do that just now. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const url = state?.token ? dayUrl(state.token) : null;
  const until = state?.until ? new Date(state.until).toLocaleDateString("en-PH", { month: "long", day: "numeric" }) : null;

  return (
    <div className="sp-scrim" onClick={onClose}>
      <div className="sp-dialog sp-dayof" role="dialog" aria-modal="true" aria-labelledby="sp-dayof-h" onClick={(e) => e.stopPropagation()}>
        <h2 id="sp-dayof-h">Day-of check-in</h2>
        {!linked ? (
          <>
            <p>Your welcome team checks guests in on their phones and sees who’s still to arrive and which seats are open. It works from your RSVP Studio event.</p>
            <div className="row">
              <button className="sp-btn soft" onClick={onClose}>
                Not now
              </button>
              <button className="sp-btn primary" onClick={onLink}>
                Link this plan to my event
              </button>
            </div>
          </>
        ) : premium === false ? (
          <>
            <p>Your welcome team checks guests in on their phones, sees who’s still to arrive, and seats walk-ins in open seats. It comes with Premium.</p>
            <div className="row">
              <button className="sp-btn soft" onClick={onClose}>
                Not now
              </button>
              <Link className="sp-btn primary" to={`/account/projects/${chart.site!.eventId}?tab=website`}>
                See Premium
              </Link>
            </div>
          </>
        ) : !state ? (
          <p>Opening…</p>
        ) : !url ? (
          <>
            <ul className="sp-dayof__how">
              <li>Your team opens one link on their phones. No accounts.</li>
              <li>They search a guest, check in the household, and point them to their table.</li>
              <li>Everyone sees who’s here, who’s still to arrive, and the open seats for walk-ins.</li>
              <li>It keeps working on a weak signal, and never changes your seating plan.</li>
            </ul>
            <div className="row">
              <button className="sp-btn soft" onClick={onClose}>
                Not now
              </button>
              <button className="sp-btn primary" disabled={busy} onClick={() => act("make")}>
                {busy ? "Making it…" : "Make the check-in link"}
              </button>
            </div>
          </>
        ) : (
          <>
            <p>For your coordinator and welcome team only. {until ? `It works until ${until}.` : ""}</p>
            <input className="sp-dayof__url" readOnly value={url} onFocus={(e) => e.target.select()} aria-label="Check-in link" />
            <div className="row" style={{ justifyContent: "flex-start" }}>
              <button
                className="sp-btn primary"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(url);
                    setCopied(true);
                    window.setTimeout(() => setCopied(false), 2000);
                  } catch {
                    /* select it instead */
                  }
                }}
              >
                {copied ? "Copied" : "Copy link"}
              </button>
              {"share" in navigator ? (
                <button className="sp-btn soft" onClick={() => navigator.share?.({ title: "Day-of check-in", url }).catch(() => {})}>
                  Send…
                </button>
              ) : null}
              <button
                className="sp-btn soft"
                disabled={busy}
                onClick={async () => {
                  const QR = await import("qrcode");
                  const qr = await QR.toString(url, { type: "svg", margin: 0, color: { dark: "#000727", light: "#ffffff" } });
                  await downloadTeamCard(chart, url, qr, state.has_pin);
                }}
              >
                Print team card
              </button>
            </div>
            <form
              className="sp-dayof__pin"
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                setErr("");
                const problem = await emailCoordinator(chart.id, coord.trim());
                setBusy(false);
                if (problem) return setErr(problem);
                setSent(coord.trim());
                setState((s) => (s ? { ...s, contact: coord.trim() } : s));
                setCoord("");
              }}
            >
              <label>
                <span>
                  <b>Email it to your coordinator.</b> {sent || state.contact ? `Sent to ${sent ?? state.contact}; they also get a reminder the day before.` : "They also get a reminder the day before."}
                </span>
                <input type="email" inputMode="email" value={coord} onChange={(e) => setCoord(e.target.value)} placeholder="coordinator@email.com" aria-label="Coordinator’s email" style={{ width: "100%", letterSpacing: "normal" }} />
              </label>
              <button className="sp-btn soft" disabled={busy || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(coord.trim())}>
                Send
              </button>
            </form>
            <div className="sp-dayof__pin">
              {state.has_pin ? (
                <>
                  <span>
                    <b>PIN is on.</b> Phones ask for it once. Mesa can’t show it again, so tell your team yourself.
                  </span>
                  <button className="sp-link soft" disabled={busy} onClick={() => act("pin", null)}>
                    Remove PIN
                  </button>
                </>
              ) : (
                <>
                  <label>
                    <span>
                      <b>PIN</b> (optional), so a forwarded link alone isn’t enough
                    </span>
                    <input inputMode="numeric" maxLength={4} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))} placeholder="4 numbers" aria-label="PIN" />
                  </label>
                  <button className="sp-btn soft" disabled={busy || pin.length !== 4} onClick={() => act("pin", pin)}>
                    Add PIN
                  </button>
                </>
              )}
            </div>
            {sure ? (
              <div className="row">
                <p style={{ marginRight: "auto" }}>{sure === "new" ? "Phones with the old link stop working." : "No phone can check guests in until you make a link again."}</p>
                <button className="sp-btn soft" onClick={() => setSure(null)}>
                  Keep it
                </button>
                <button className="sp-btn primary" disabled={busy} onClick={() => act(sure)}>
                  {sure === "new" ? "Make a new link" : "Turn it off"}
                </button>
              </div>
            ) : (
              <div className="row" style={{ justifyContent: "space-between" }}>
                <span style={{ display: "inline-flex", gap: 16 }}>
                  <button className="sp-link soft" onClick={() => setSure("new")}>
                    New link
                  </button>
                  <button className="sp-link soft" style={{ color: "var(--warn)" }} onClick={() => setSure("off")}>
                    Turn off
                  </button>
                </span>
                <button className="sp-btn soft" onClick={onClose}>
                  Done
                </button>
              </div>
            )}
          </>
        )}
        {err ? <p className="sp-err">{err}</p> : null}
      </div>
    </div>
  );
}
