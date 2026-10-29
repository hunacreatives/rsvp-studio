import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import type { EventContent } from "../../content/types";
import { customValue } from "../../content/custom";
import { useRsvpForm } from "../../spec/runtime/useRsvpForm";
import RsvpQuestions from "../shared/RsvpQuestions";
import { Field } from "../shared/siteEdit";

// The reply: "Make the call", a line call. First just In or Out (the card is short, so the court
// shows above it); calling "In" plays the winning smash, and then the scorecard opens: the name,
// how many are playing, the host's own questions and a note. In the builder it's all open.

export default function RsvpCard({ content, editorPreview, sample, credit, won, wins, onIn, delay = 0 }: { content: EventContent; editorPreview: boolean; sample: boolean; credit?: ReactNode; won: boolean; wins: boolean; onIn?: () => void; /** ms the scorecard waits after "In" (the smash plays first) */ delay?: number }) {
  const form = useRsvpForm(content, editorPreview, { asksAttending: true });
  const [done, setDone] = useState(false);
  const [open, setOpen] = useState(editorPreview);
  const timer = useRef(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const id = useId();
  const going = form.values.attending === "yes";
  const seats = Number(form.values.guests ?? 1) || 1;
  const reserved = form.invitee?.seatLimit && form.invitee.seats ? form.invitee.seats : sample ? 2 : 0;

  useEffect(() => {
    if (form.state === "success") setDone(true);
  }, [form.state]);

  const choose = (v: "yes" | "no") => {
    if (v === "yes" && !going) onIn?.();
    window.clearTimeout(timer.current);
    if (!open) {
      if (v === "yes" && delay) timer.current = window.setTimeout(() => setOpen(true), delay);
      else setOpen(true);
    }
    form.set("attending", v);
    form.set("guests", v === "no" ? "0" : String(Math.max(1, seats)));
  };
  const setSeats = (n: number) => form.set("guests", String(Math.min(form.maxGuests, Math.max(1, n))));

  return (
    <div>
      {done ? (
        <div role="status">
          <h2 className="ra-h2">{form.attending === "no" ? "Next game, then" : wins ? "That’s game" : "Point won"}</h2>
          <p className="ra-p">{form.attending === "no" ? "Thank you for letting us know." : customValue(content, "thankYou") || "See you on court."}</p>
          {form.copyNote ? <p className="ra-small">{form.copyNote}</p> : null}
          <button type="button" className="ra-again" onClick={() => setDone(false)}>
            Change my reply
          </button>
        </div>
      ) : (
        <>
          <Field as="h2" className="ra-h2" path="custom.rsvpTitle" value={customValue(content, "rsvpTitle")} fallback="Make the call" placeholder="" editor={editorPreview} />
          <p className="ra-line">{form.replyBy || "Let the host know if you’re playing."}</p>
          {reserved ? <p className="ra-small">{`We’ve saved ${reserved} ${reserved === 1 ? "spot" : "spots"} on court for you.`}</p> : null}
          {form.closed ? (
            <p className="ra-small" role="status">
              {form.closedText}
            </p>
          ) : (
            <form className="ra-form" onSubmit={form.submit} noValidate>
              <input type="text" name="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => form.setWebsite(e.target.value)} style={{ position: "absolute", left: -9999, width: 1, height: 1, opacity: 0 }} aria-hidden />
              <div className="ra-calls" role="group" aria-label="Will you come?">
                <button type="button" className={`ra-callbtn${going ? " is-on" : ""}`} aria-pressed={going} onClick={() => choose("yes")}>
                  <b>In</b>
                  <span>I’ll be there</span>
                </button>
                <button type="button" className={`ra-callbtn is-out${form.values.attending === "no" ? " is-on" : ""}`} aria-pressed={form.values.attending === "no"} onClick={() => choose("no")}>
                  <b>Out</b>
                  <span>Can’t make it</span>
                </button>
              </div>
              {going && won ? <p className="ra-small ra-won">{wins ? "Smash. That’s game." : "Smash. Point won."} Now sign the scorecard.</p> : null}
              {open ? (
                <div className="ra-cols">
                  <div>
                    <label htmlFor={`${id}-name`}>Name on the scorecard</label>
                    <input id={`${id}-name`} className="ra-field ra-sign" type="text" autoComplete="name" autoCapitalize="words" enterKeyHint="next" value={form.values.name ?? ""} onChange={(e) => form.set("name", e.target.value)} />
                    <label htmlFor={`${id}-contact`}>{form.contactMode === "mobile" ? "Mobile number" : "Email"}</label>
                    <input id={`${id}-contact`} className="ra-field" {...form.contactProps} autoCapitalize="none" autoCorrect="off" spellCheck={false} enterKeyHint="next" value={form.values.contact ?? ""} onChange={(e) => form.set("contact", e.target.value)} />
                    <button type="button" className="ra-link" onClick={() => form.toggleContact(`${id}-contact`)}>
                      {form.contactToggleLabel}
                    </button>
                  </div>
                  <div>
                    {going || editorPreview ? (
                      <div className="ra-seats">
                        <span>Players</span>
                        <span className="ra-seats__ctrl">
                          <button type="button" aria-label="One player fewer" disabled={seats <= 1} onClick={() => setSeats(seats - 1)}>
                            −
                          </button>
                          <output aria-live="polite">{seats}</output>
                          <button type="button" aria-label="One player more" disabled={seats >= form.maxGuests} onClick={() => setSeats(seats + 1)}>
                            +
                          </button>
                        </span>
                      </div>
                    ) : null}
                    {going ? <RsvpQuestions form={form} idPrefix={id} askPartyNames={content.askPartyNames} fieldClassName="ra-field" /> : null}
                    <label htmlFor={`${id}-msg`}>A note for the host (optional)</label>
                    <textarea id={`${id}-msg`} className="ra-field" rows={3} maxLength={400} value={form.values.message ?? ""} onChange={(e) => form.set("message", e.target.value)} />
                  </div>
                </div>
              ) : null}
              {form.error ? (
                <p className="ra-error" role="alert">
                  {form.error}
                </p>
              ) : null}
              {open ? (
              <button type="submit" className="ra-send" disabled={form.state === "submitting" || editorPreview} title={editorPreview ? "Guests can reply once your site is published" : undefined}>
                {form.state === "submitting" ? "Sending…" : customValue(content, "rsvpButton") || "Send my call"}
              </button>
              ) : null}
              {editorPreview ? <p className="ra-small">Preview only. Guests can reply once your site is published.</p> : null}
            </form>
          )}
        </>
      )}
      {credit}
    </div>
  );
}
