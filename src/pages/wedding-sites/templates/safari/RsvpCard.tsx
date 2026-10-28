import { useEffect, useId, useState, type ReactNode } from "react";
import type { EventContent } from "../../content/types";
import { customValue } from "../../content/custom";
import { useRsvpForm } from "../../spec/runtime/useRsvpForm";
import RsvpQuestions from "../shared/RsvpQuestions";
import { Field } from "../shared/siteEdit";

// The reply, on the safari pass: a header (the pass's name), then coming or not, how many, the
// host's own questions and an optional note.

export default function RsvpCard({ content, editorPreview, sample, credit }: { content: EventContent; editorPreview: boolean; sample: boolean; credit?: ReactNode }) {
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

  const E = editorPreview;
  return (
    <div className="sf-pass sf-paper">
      <div className="sf-head">
        <Field as="b" path="custom.passTitle" value={customValue(content, "passTitle")} fallback="Safari pass" placeholder="" editor={E} />
        <Field as="span" path="custom.passLine" value={customValue(content, "passLine")} fallback="Admits your little explorer" placeholder="" editor={E} />
      </div>
      <div className="sf-body">
      {done ? (
        <div role="status">
          <h2>{form.attending === "no" ? "We’ll miss you" : "See you on safari"}</h2>
          <p className="sf-small">{form.attending === "no" ? "Thank you for letting us know." : customValue(content, "thankYou") || "Your seat in the jeep is saved."}</p>
          {form.copyNote ? <p className="sf-small">{form.copyNote}</p> : null}
          <button type="button" className="sf-again" style={{ marginTop: 18 }} onClick={() => setDone(false)}>
            Change my reply
          </button>
        </div>
      ) : (
        <>
          <Field as="h2" path="custom.rsvpTitle" value={customValue(content, "rsvpTitle")} fallback={"Will you join the\u00a0safari?"} placeholder="" editor={E} />
          {form.replyBy ? <p className="sf-by">{form.replyBy}</p> : null}
          {reserved ? <p className="sf-small">We’ve saved {reserved} {reserved === 1 ? "seat" : "seats"} in the jeep for you.</p> : null}
          {form.closed ? (
            <p className="sf-small" role="status">
              {form.closedText}
            </p>
          ) : (
            <form className="sf-form" onSubmit={form.submit} noValidate>
              <input type="text" name="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => form.setWebsite(e.target.value)} style={{ position: "absolute", left: -9999, width: 1, height: 1, opacity: 0 }} aria-hidden />
              <div className="sf-pills" role="group" aria-label="Will you come?">
                <button type="button" className={`sf-pill${going ? " is-on" : ""}`} aria-pressed={going} onClick={() => choose("yes")}>
                  I’ll be there
                </button>
                <button type="button" className={`sf-pill${form.values.attending === "no" ? " is-on" : ""}`} aria-pressed={form.values.attending === "no"} onClick={() => choose("no")}>
                  Sadly, no
                </button>
              </div>
              <label htmlFor={`${id}-name`}>Your name</label>
              <input id={`${id}-name`} className="sf-field" type="text" autoComplete="name" autoCapitalize="words" enterKeyHint="next" value={form.values.name ?? ""} onChange={(e) => form.set("name", e.target.value)} />
              <label htmlFor={`${id}-contact`}>{form.contactMode === "mobile" ? "Mobile number" : "Email"}</label>
              <input id={`${id}-contact`} className="sf-field" {...form.contactProps} autoCapitalize="none" autoCorrect="off" spellCheck={false} enterKeyHint="next" value={form.values.contact ?? ""} onChange={(e) => form.set("contact", e.target.value)} />
              <button type="button" className="sf-link" onClick={() => form.toggleContact(`${id}-contact`)}>
                {form.contactToggleLabel}
              </button>
              {going ? (
                <div className="sf-seats">
                  <span>Guests</span>
                  <span className="sf-seats__ctrl">
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
              {going ? <RsvpQuestions form={form} idPrefix={id} askPartyNames={content.askPartyNames} fieldClassName="sf-field" /> : null}
              <label htmlFor={`${id}-msg`}>A note for the hosts (optional)</label>
              <textarea id={`${id}-msg`} className="sf-field" rows={3} maxLength={400} value={form.values.message ?? ""} onChange={(e) => form.set("message", e.target.value)} />
              {form.error ? (
                <p className="sf-error" role="alert">
                  {form.error}
                </p>
              ) : null}
              <button type="submit" className="sf-send" disabled={form.state === "submitting" || editorPreview} title={editorPreview ? "Guests can reply once your site is published" : undefined}>
                {form.state === "submitting" ? "Sending…" : customValue(content, "rsvpButton") || "Send reply"}
              </button>
              {editorPreview ? <p className="sf-small">Preview only. Guests can reply once your site is published.</p> : null}
            </form>
          )}
        </>
      )}
      {credit}
      </div>
    </div>
  );
}
