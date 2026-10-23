import { useEffect, useId, useState } from "react";
import type { EventContent } from "../../content/types";
import { customValue } from "../../content/custom";
import { useRsvpForm } from "../../spec/runtime/useRsvpForm";
import RsvpQuestions from "../shared/RsvpQuestions";

// The reply card: coming or not, how many seats, and a message for the celebrant, which the
// guest can let show on the message wall (first name only). Relatives who can't come can
// still write.

export default function RsvpCard({ content, editorPreview, sample, honoree }: { content: EventContent; editorPreview: boolean; sample: boolean; honoree: string }) {
  const form = useRsvpForm(content, editorPreview, { asksAttending: true });
  const [done, setDone] = useState(false);
  const id = useId();
  const going = form.values.attending === "yes";
  const seats = Number(form.values.guests ?? 1) || 1;
  const reserved = form.invitee?.seatLimit && form.invitee.seats ? form.invitee.seats : sample ? 2 : 0;

  useEffect(() => {
    if (form.values.share === undefined) form.set("share", "1");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (form.state === "success") setDone(true);
  }, [form.state]);

  const choose = (v: "yes" | "no") => {
    form.set("attending", v);
    form.set("guests", v === "no" ? "0" : String(Math.max(1, seats)));
  };
  const setSeats = (n: number) => form.set("guests", String(Math.min(form.maxGuests, Math.max(1, n))));

  return (
    <div id="rsvp" className="ug-reply" data-reveal>
      {done ? (
        <div className="ug-done" role="status">
          <h2 className="ug-title">{form.attending === "no" ? "We’ll miss you" : "See you there"}</h2>
          <p className="ug-text">{form.attending === "no" ? "Thank you for letting us know, and for your message." : customValue(content, "thankYou") || "Salamat po. Your seat is saved."}</p>
          {form.emailed ? <p className="ug-small">A copy is on its way to your email.</p> : null}
          <button type="button" className="ug-btn ug-btn--line" onClick={() => setDone(false)}>
            Change my reply
          </button>
        </div>
      ) : (
        <>
          <h2 className="ug-title">{customValue(content, "rsvpTitle") || "Kindly reply"}</h2>
          {reserved ? <p className="ug-text ug-reply__seats">We’ve saved {reserved} {reserved === 1 ? "seat" : "seats"} for you.</p> : null}
          {form.replyBy ? <p className="ug-small">{form.replyBy}</p> : null}
          {form.closed ? (
            <p className="ug-text" role="status">
              {form.closedText}
            </p>
          ) : (
            <form className="ug-form" onSubmit={form.submit} noValidate>
              <input type="text" name="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => form.setWebsite(e.target.value)} style={{ position: "absolute", left: -9999, width: 1, height: 1, opacity: 0 }} aria-hidden />
              <div className="ug-choice" role="group" aria-label="Will you come?">
                <button type="button" className={`ug-choice__opt${going ? " is-picked" : ""}`} aria-pressed={going} onClick={() => choose("yes")}>
                  I’ll be there
                </button>
                <button type="button" className={`ug-choice__opt${form.values.attending === "no" ? " is-picked" : ""}`} aria-pressed={form.values.attending === "no"} onClick={() => choose("no")}>
                  I can’t make it
                </button>
              </div>
              <div>
                <label htmlFor={`${id}-name`}>Your name</label>
                <input id={`${id}-name`} className="ug-field" type="text" autoComplete="name" autoCapitalize="words" enterKeyHint="next" value={form.values.name ?? ""} onChange={(e) => form.set("name", e.target.value)} />
              </div>
              <div>
                <label htmlFor={`${id}-contact`}>{form.contactMode === "mobile" ? "Mobile number" : "Email"}</label>
                <input id={`${id}-contact`} className="ug-field" {...form.contactProps} autoCapitalize="none" autoCorrect="off" spellCheck={false} enterKeyHint="next" value={form.values.contact ?? ""} onChange={(e) => form.set("contact", e.target.value)} />
                <button type="button" className="ug-link" onClick={() => form.toggleContact(`${id}-contact`)}>
                  {form.contactToggleLabel}
                </button>
              </div>
              {going ? (
                <div className="ug-seats">
                  <span>Seats</span>
                  <span className="ug-seats__ctrl">
                    <button type="button" aria-label="One seat fewer" disabled={seats <= 1} onClick={() => setSeats(seats - 1)}>
                      −
                    </button>
                    <output aria-live="polite">{seats}</output>
                    <button type="button" aria-label="One seat more" disabled={seats >= form.maxGuests} onClick={() => setSeats(seats + 1)}>
                      +
                    </button>
                  </span>
                </div>
              ) : null}
              {going ? <RsvpQuestions form={form} idPrefix={id} askPartyNames={content.askPartyNames} fieldClassName="ug-field" /> : null}
              <div>
                <label htmlFor={`${id}-msg`}>A message for {honoree || "the family"} (optional)</label>
                <textarea id={`${id}-msg`} className="ug-field" rows={4} maxLength={400} value={form.values.message ?? ""} onChange={(e) => form.set("message", e.target.value)} />
                <label className="ug-share">
                  <input type="checkbox" checked={form.values.share !== "0"} onChange={(e) => form.set("share", e.target.checked ? "1" : "0")} />
                  <span>Show my message on the website (with my first name)</span>
                </label>
              </div>
              {form.error ? (
                <p className="ug-error" role="alert">
                  {form.error}
                </p>
              ) : null}
              <button type="submit" className="ug-btn ug-btn--block" disabled={form.state === "submitting" || editorPreview} title={editorPreview ? "Guests can reply once your site is published" : undefined}>
                {form.state === "submitting" ? "Sending…" : customValue(content, "rsvpButton") || "Send my reply"}
              </button>
              {editorPreview ? <p className="ug-small">Preview only. Guests can reply once your site is published.</p> : null}
            </form>
          )}
        </>
      )}
    </div>
  );
}
