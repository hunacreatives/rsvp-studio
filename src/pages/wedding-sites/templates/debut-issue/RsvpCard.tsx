import { useEffect, useId, useState } from "react";
import type { EventContent } from "../../content/types";
import { customValue } from "../../content/custom";
import { useRsvpForm } from "../../spec/runtime/useRsvpForm";
import RsvpQuestions from "../shared/RsvpQuestions";
import { Field } from "../shared/siteEdit";

// The reply card: the tear-out subscription card at the back of a magazine, perforated along
// the top. Coming or not, seats (personal links show what's saved), the hosts' questions and a
// note for the celebrant.

export default function RsvpCard({ content, editorPreview, sample, celebrant }: { content: EventContent; editorPreview: boolean; sample: boolean; celebrant: string }) {
  const form = useRsvpForm(content, editorPreview, { asksAttending: true });
  const [done, setDone] = useState(false);
  const id = useId();
  const going = form.values.attending === "yes";
  const seats = Number(form.values.guests ?? 1) || 1;
  const reserved = form.invitee?.seatLimit && form.invitee.seats ? form.invitee.seats : sample ? 2 : 0;

  useEffect(() => {
    if (form.state === "success") setDone(true);
  }, [form.state]);

  const choose = (v: "yes" | "no") => {
    form.set("attending", v);
    form.set("guests", v === "no" ? "0" : String(Math.max(1, seats)));
  };
  const setSeats = (n: number) => form.set("guests", String(Math.min(form.maxGuests, Math.max(1, n))));

  return (
    <div className="di-card">
      <span className="di-card__perf" aria-hidden />
      {done ? (
        <div className="di-done" role="status">
          <p className="di-kicker">{form.attending === "no" ? "Reply received" : "You’re on the list"}</p>
          <h3 className="di-card__h">{form.attending === "no" ? "You’ll be missed" : "See you there"}</h3>
          <p className="di-text">{form.attending === "no" ? "Thank you for letting us know." : customValue(content, "thankYou") || "Your seat is saved. Come ready to dance."}</p>
          {form.copyNote ? <p className="di-small">{form.copyNote}</p> : null}
          <button type="button" className="di-btn di-btn--line" onClick={() => setDone(false)}>
            Change my reply
          </button>
        </div>
      ) : (
        <>
          <div className="di-card__head">
            <Field as="h3" className="di-card__h" path="custom.rsvpTitle" value={customValue(content, "rsvpTitle")} fallback="Kindly reply" placeholder="" editor={editorPreview} />
            {reserved ? (
              <p className="di-card__seats">
                {reserved} {reserved === 1 ? "seat" : "seats"} saved for you
              </p>
            ) : null}
          </div>
          {form.replyBy ? <p className="di-small">{form.replyBy}</p> : null}
          {form.closed ? (
            <p className="di-text" role="status">
              {form.closedText}
            </p>
          ) : (
            <form className="di-form" onSubmit={form.submit} noValidate>
              <input type="text" name="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => form.setWebsite(e.target.value)} style={{ position: "absolute", left: -9999, width: 1, height: 1, opacity: 0 }} aria-hidden />
              <div className="di-choice" role="group" aria-label="Will you come?">
                <button type="button" className={`di-choice__opt${going ? " is-picked" : ""}`} aria-pressed={going} onClick={() => choose("yes")}>
                  <span className="di-box" aria-hidden />
                  Yes, save my seat
                </button>
                <button type="button" className={`di-choice__opt${form.values.attending === "no" ? " is-picked" : ""}`} aria-pressed={form.values.attending === "no"} onClick={() => choose("no")}>
                  <span className="di-box" aria-hidden />
                  Sorry, I can’t come
                </button>
              </div>
              <div className="di-row">
                <label htmlFor={`${id}-name`}>Name</label>
                <input id={`${id}-name`} className="di-field" type="text" autoComplete="name" autoCapitalize="words" enterKeyHint="next" value={form.values.name ?? ""} onChange={(e) => form.set("name", e.target.value)} />
              </div>
              <div className="di-row">
                <label htmlFor={`${id}-contact`}>{form.contactMode === "mobile" ? "Mobile number" : "Email"}</label>
                <input id={`${id}-contact`} className="di-field" {...form.contactProps} autoCapitalize="none" autoCorrect="off" spellCheck={false} enterKeyHint="next" value={form.values.contact ?? ""} onChange={(e) => form.set("contact", e.target.value)} />
                <button type="button" className="di-link" onClick={() => form.toggleContact(`${id}-contact`)}>
                  {form.contactToggleLabel}
                </button>
              </div>
              {going ? (
                <div className="di-seats">
                  <span>Seats</span>
                  <span className="di-seats__ctrl">
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
              {going ? <RsvpQuestions form={form} idPrefix={id} askPartyNames={content.askPartyNames} fieldClassName="di-field" /> : null}
              <div className="di-row">
                <label htmlFor={`${id}-msg`}>A note for {celebrant || "the celebrant"} (optional)</label>
                <textarea id={`${id}-msg`} className="di-field" rows={3} maxLength={400} value={form.values.message ?? ""} onChange={(e) => form.set("message", e.target.value)} />
              </div>
              {form.error ? (
                <p className="di-error" role="alert">
                  {form.error}
                </p>
              ) : null}
              <button type="submit" className="di-btn di-btn--block" disabled={form.state === "submitting" || editorPreview} title={editorPreview ? "Guests can reply once your site is published" : undefined}>
                {form.state === "submitting" ? (
                  "Sending…"
                ) : (
                  <Field path="custom.rsvpButton" value={customValue(content, "rsvpButton")} fallback="Send my reply" placeholder="" editor={editorPreview} />
                )}
              </button>
              {editorPreview ? <p className="di-small">Preview only. Guests can reply once your site is published.</p> : null}
            </form>
          )}
        </>
      )}
    </div>
  );
}
