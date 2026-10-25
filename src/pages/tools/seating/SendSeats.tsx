import { useEffect, useMemo, useState } from "react";
import type { Chart } from "./model";
import { commit } from "./store";
import { loadInvitees, matchSeats, myEvents, sendSeats, type Invitee, type SiteEvent } from "./website";
import { otherPlans } from "./cloud";

// Send seats to your website: pick the event, see how the plan's households line up with
// its invite list, then send. Guests then find their table on the site's "Find your table"
// page (Premium) and on their personal invite links.

const when = (d: string | null) => (d ? new Date(`${d}T00:00:00`).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" }) : "");

export default function SendSeats({ chart, userId, onClose, onSent }: { chart: Chart; userId: string; onClose(): void; onSent(text: string): void }) {
  const [events, setEvents] = useState<SiteEvent[] | null>(null);
  const [pick, setPick] = useState<string | null>(chart.site?.eventId ?? null);
  const [invitees, setInvitees] = useState<Invitee[] | null>(null);
  const [add, setAdd] = useState(true);
  const [clear, setClear] = useState(true);
  const [finder, setFinder] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState<string | null>(null);
  // Someone else on the event (the couple, or their coordinator) may have a plan of their own.
  const [others, setOthers] = useState<{ owner_name: string; updated_at: string }[]>([]);

  useEffect(() => {
    myEvents(userId).then((e) => {
      setEvents(e);
      if (e.length === 1) setPick((p) => p ?? e[0].id);
    });
  }, [userId]);
  useEffect(() => {
    if (!pick) return;
    setOthers([]);
    otherPlans(pick).then(setOthers);
    setInvitees(null);
    loadInvitees(pick).then((l) => (l ? setInvitees(l) : setErr("Couldn’t open that event’s invite list.")));
  }, [pick]);

  const ev = events?.find((e) => e.id === pick) ?? null;
  const m = useMemo(() => (invitees ? matchSeats(chart, invitees) : null), [chart, invitees]);
  const stale = m ? m.unseated.filter((x) => x.table_label).length : 0;
  const finderUrl = ev?.slug ? `${window.location.origin}/invite/${ev.slug}/table` : null;

  const send = async () => {
    if (!ev || !m) return;
    setBusy(true);
    setErr("");
    try {
      const r = await sendSeats(ev.id, chart.id, m, { add, clear, finder: finder && ev.premium });
      const on = ev.premium && (finder || ev.finder);
      commit((c) => {
        c.site = { ...(c.site?.eventId === ev.id ? c.site : {}), eventId: ev.id, slug: ev.slug, finder: on };
        // Every member of a household gets its invite-list line, for replies later.
        for (const g of c.guests) if (r.links[g.party]) g.inviteeId = r.links[g.party];
      });
      const n = m.matched.length + r.added;
      const text = `Seats sent to ${ev.name}: ${n} ${n === 1 ? "household has" : "households have"} their table.`;
      setDone(text);
      onSent(text);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn’t send the seats. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="sp-scrim" onClick={onClose}>
      <div className="sp-dialog sp-send" role="dialog" aria-modal="true" aria-labelledby="sp-send-h" onClick={(e) => e.stopPropagation()}>
        <h2 id="sp-send-h">Send seats to your website</h2>
        {done ? (
          <>
            <p>{done}</p>
            {finderUrl && ev?.premium ? (
              <div className="sp-send__link">
                <span>Guests type their name here to find their table:</span>
                <input readOnly value={finderUrl} onFocus={(e) => e.target.select()} aria-label="Find your table link" />
                <small>The QR codes on your table numbers open this page.</small>
              </div>
            ) : (
              <p>Each guest’s personal invite link now shows their table.</p>
            )}
            <div className="row">
              <button className="sp-btn primary" onClick={onClose}>
                Done
              </button>
            </div>
          </>
        ) : (
          <>
            <p>Each household’s table goes onto your event’s invite list. Guests see it on their personal invite link and on your site’s “Find your table” page.</p>
            {!events ? (
              <p>Looking for your events…</p>
            ) : !events.length ? (
              <>
                <p>Seats go to an RSVP Studio website. Make yours free, then come back to send them.</p>
                <div className="row">
                  <a className="sp-btn primary" href="/build">
                    Build your website
                  </a>
                </div>
              </>
            ) : (
              <>
                <div className="sp-send__events" role="radiogroup" aria-label="Event">
                  {events.map((e) => (
                    <button key={e.id} role="radio" aria-checked={pick === e.id} onClick={() => setPick(e.id)}>
                      <b>{e.name}</b>
                      <span>{[when(e.date), e.live ? "Website live" : "Website not published yet"].filter(Boolean).join(" · ")}</span>
                    </button>
                  ))}
                </div>
                {pick && !m && !err ? <p>Reading the invite list…</p> : null}
                {others.length ? (
                  <p className="sp-warnline">
                    <b>{others[0].owner_name}</b> also has a seating plan for this event (edited {new Date(others[0].updated_at).toLocaleDateString("en-PH", { month: "short", day: "numeric" })}). Plans aren’t shared, so sending yours replaces the tables guests see. Agree on one plan first.
                  </p>
                ) : null}
                {m && ev ? (
                  <ul className="sp-read__list">
                    <li>
                      <b>
                        {m.matched.length} {m.matched.length === 1 ? "household" : "households"} on your invite list
                      </b>
                      <span>{m.matched.length ? "They get the table you gave them here." : "None of the names here are on the invite list yet."}</span>
                    </li>
                    {m.missing.length ? (
                      <li>
                        <label className="sp-toggle">
                          <span>
                            Add {m.missing.length} {m.missing.length === 1 ? "household" : "households"} to the invite list
                            <small>
                              {m.missing
                                .slice(0, 3)
                                .map((x) => x.line)
                                .join(", ")}
                              {m.missing.length > 3 ? ` and ${m.missing.length - 3} more` : ""}. Not on the list yet, so they can’t look up their table
                            </small>
                          </span>
                          <input type="checkbox" className="sp-switch" checked={add} onChange={(e) => setAdd(e.target.checked)} />
                        </label>
                      </li>
                    ) : null}
                    {stale ? (
                      <li>
                        <label className="sp-toggle">
                          <span>
                            Clear the old table from {stale} {stale === 1 ? "guest" : "guests"}
                            <small>On the invite list with a table, but not seated in this plan</small>
                          </span>
                          <input type="checkbox" className="sp-switch" checked={clear} onChange={(e) => setClear(e.target.checked)} />
                        </label>
                      </li>
                    ) : null}
                    <li>
                      {ev.premium ? (
                        ev.finder ? (
                          <>
                            <b>Find your table is on</b>
                            <span>Guests look up their table on your website.</span>
                          </>
                        ) : (
                          <label className="sp-toggle">
                            <span>
                              Turn on Find your table
                              <small>Guests type their name on your website and see their table</small>
                            </span>
                            <input type="checkbox" className="sp-switch" checked={finder} onChange={(e) => setFinder(e.target.checked)} />
                          </label>
                        )
                      ) : (
                        <>
                          <b>Find your table comes with Premium</b>
                          <span>Personal invite links show each guest’s table either way.</span>
                        </>
                      )}
                    </li>
                  </ul>
                ) : null}
              </>
            )}
            {err ? <p className="sp-err">{err}</p> : null}
            <div className="row">
              <button className="sp-btn soft" onClick={onClose}>
                Cancel
              </button>
              {events?.length ? (
                <button className="sp-btn primary" disabled={!m || busy || (!m.matched.length && !(add && m.missing.length))} onClick={send}>
                  {busy ? "Sending…" : "Send seats"}
                </button>
              ) : null}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
