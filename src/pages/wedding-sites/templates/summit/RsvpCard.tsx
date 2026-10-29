import { useEffect, useId, useState, type ReactNode } from "react";
import type { EventContent } from "../../content/types";
import { customValue } from "../../content/custom";
import { useRsvpForm } from "../../spec/runtime/useRsvpForm";
import RsvpQuestions from "../shared/RsvpQuestions";
import { Field } from "../shared/siteEdit";

// The reply, at the summit: coming or not, how many, the host's own
// questions and an optional note. Until the guest picks yes or no the card is just the question
// and the two buttons, so the climber at the summit stays in view (the builder shows it all).

export default function RsvpCard({ content, editorPreview, sample, credit, height }: { content: EventContent; editorPreview: boolean; sample: boolean; credit?: ReactNode; height: string }) {
  const form = useRsvpForm(content, editorPreview, { asksAttending: true });
  const [done, setDone] = useState(false);
  const id = useId();
  const going = form.values.attending === "yes";
  const open = editorPreview || !!form.values.attending;
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
    <div>
      {done ? (
        <div role="status">
          <h2>{form.attending === "no" ? "We’ll miss you" : "See you at the top"}</h2>
          <p className="sm-small">{form.attending === "no" ? "Thank you for letting us know." : customValue(content, "thankYou") || "Your spot on the trail is saved."}</p>
          {form.copyNote ? <p className="sm-small">{form.copyNote}</p> : null}
          <button type="button" className="sm-again" style={{ marginTop: 18 }} onClick={() => setDone(false)}>
            Change my reply
          </button>
        </div>
      ) : (
        <>
          <p className="sm-k">
            <span>{height} m</span>
            {form.replyBy ? (
              <>
                {" · "}
                {form.replyBy}
              </>
            ) : null}
          </p>
          <Field as="h2" path="custom.rsvpTitle" value={customValue(content, "rsvpTitle")} fallback={"Will you climb with\u00a0us?"} placeholder="" editor={editorPreview} />
          {reserved ? <p className="sm-small">We’ve saved {reserved} {reserved === 1 ? "spot" : "spots"} on the trail for you.</p> : null}
          {form.closed ? (
            <p className="sm-small" role="status">
              {form.closedText}
            </p>
          ) : (
            <form className="sm-form" onSubmit={form.submit} noValidate>
              <input type="text" name="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => form.setWebsite(e.target.value)} style={{ position: "absolute", left: -9999, width: 1, height: 1, opacity: 0 }} aria-hidden />
              <div className="sm-pills" role="group" aria-label="Will you come?">
                <button type="button" className={`sm-pill${going ? " is-on" : ""}`} aria-pressed={going} onClick={() => choose("yes")}>
                  I’ll be there
                </button>
                <button type="button" className={`sm-pill${form.values.attending === "no" ? " is-on" : ""}`} aria-pressed={form.values.attending === "no"} onClick={() => choose("no")}>
                  Sadly, no
                </button>
              </div>
              {open ? (
                <div className="sm-open">
              <label htmlFor={`${id}-name`}>Your name</label>
              <input id={`${id}-name`} className="sm-field" type="text" autoComplete="name" autoCapitalize="words" enterKeyHint="next" value={form.values.name ?? ""} onChange={(e) => form.set("name", e.target.value)} />
              <label htmlFor={`${id}-contact`}>{form.contactMode === "mobile" ? "Mobile number" : "Email"}</label>
              <input id={`${id}-contact`} className="sm-field" {...form.contactProps} autoCapitalize="none" autoCorrect="off" spellCheck={false} enterKeyHint="next" value={form.values.contact ?? ""} onChange={(e) => form.set("contact", e.target.value)} />
              <button type="button" className="sm-link" onClick={() => form.toggleContact(`${id}-contact`)}>
                {form.contactToggleLabel}
              </button>
              {going ? (
                <div className="sm-seats">
                  <span>Guests</span>
                  <span className="sm-seats__ctrl">
                    <button type="button" aria-label="One guest fewer" disabled={seats <= 1} onClick={() => setSeats(seats - 1)}>
                      −
                    </button>
                    <output aria-live="polite">{seats}</output>
                    <button type="button" aria-label="One guest more" disabled={seats >= form.maxGuests} onClick={() => setSeats(seats + 1)}>
                      +
                    </button>
                  </span>
                </div>
              ) : null}
              {going ? <RsvpQuestions form={form} idPrefix={id} askPartyNames={content.askPartyNames} fieldClassName="sm-field" /> : null}
              <label htmlFor={`${id}-msg`}>A note for the hosts (optional)</label>
              <textarea id={`${id}-msg`} className="sm-field" rows={3} maxLength={400} value={form.values.message ?? ""} onChange={(e) => form.set("message", e.target.value)} />
              {form.error ? (
                <p className="sm-error" role="alert">
                  {form.error}
                </p>
              ) : null}
              <button type="submit" className="sm-send" disabled={form.state === "submitting" || editorPreview} title={editorPreview ? "Guests can reply once your site is published" : undefined}>
                {form.state === "submitting" ? "Sending…" : customValue(content, "rsvpButton") || "Send reply"}
              </button>
              {editorPreview ? <p className="sm-small">Preview only. Guests can reply once your site is published.</p> : null}
                </div>
              ) : null}
            </form>
          )}
        </>
      )}
      {credit}
    </div>
  );
}
