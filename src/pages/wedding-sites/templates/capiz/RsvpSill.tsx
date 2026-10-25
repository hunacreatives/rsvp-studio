import { useId, useState, useEffect } from "react";
import type { EventContent } from "../../content/types";
import { customValue } from "../../content/custom";
import { useRsvpForm } from "../../spec/runtime/useRsvpForm";
import RsvpQuestions from "../shared/RsvpQuestions";

// The reply card, resting on a narra window sill. On a guest's personal link it says how
// many seats are reserved for them ("We've reserved 2 seats in your honour") and the count
// stops there; the sample shows the line with two seats.

export default function RsvpSill({ content, editorPreview, sample }: { content: EventContent; editorPreview: boolean; sample: boolean }) {
  const form = useRsvpForm(content, editorPreview, { asksAttending: true });
  const [done, setDone] = useState(false);
  const id = useId();
  const title = customValue(content, "rsvpTitle") || "Kindly reply";
  const thanks = customValue(content, "thankYou") || "Thank you. We can’t wait to celebrate with you.";

  useEffect(() => {
    if (form.state === "success") setDone(true);
  }, [form.state]);

  const seats = form.invitee?.seatLimit && form.invitee.seats ? form.invitee.seats : sample ? 2 : 0;
  const seatsLine = seats ? `We’ve reserved ${seats} ${seats === 1 ? "seat" : "seats"} in your honour.` : "";
  const going = form.values.attending === "yes";
  const choose = (v: "yes" | "no") => {
    form.set("attending", v);
    form.set("guests", v === "no" ? "0" : form.values.guests && form.values.guests !== "0" ? form.values.guests : "1");
  };
  const counts = Array.from({ length: Math.min(form.maxGuests, 6) }, (_, i) => i + 1);

  return (
    <section id="rsvp" className="cz-rsvp" data-reveal>
      <div className="cz-card">
        {done ? (
          <div className="cz-done" role="status">
            <p className="cz-whisper">{form.attending === "no" ? "Salamat po" : "Maraming salamat po"}</p>
            <h2 className="cz-title">{form.attending === "no" ? "We’ll miss you" : "We’ll save your seat"}</h2>
            <p className="cz-text">{form.attending === "no" ? "Thank you for letting us know." : thanks}</p>
            {form.copyNote ? <p className="cz-small">{form.copyNote}</p> : null}
            <button type="button" className="cz-btn cz-btn--line" onClick={() => setDone(false)}>
              Change my reply
            </button>
          </div>
        ) : (
          <>
            <h2 className="cz-title">{title}</h2>
            {seatsLine ? <p className="cz-text cz-seats">{seatsLine}</p> : editorPreview ? <p className="cz-small">On a guest’s personal link this reads “We’ve reserved 2 seats in your honour.”</p> : null}
            {form.replyBy ? <p className="cz-small">{form.replyBy}</p> : null}
            {form.closed ? (
              <p className="cz-text" role="status">
                {form.closedText}
              </p>
            ) : (
              <form className="cz-form" onSubmit={form.submit} noValidate>
                <input type="text" name="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => form.setWebsite(e.target.value)} style={{ position: "absolute", left: -9999, width: 1, height: 1, opacity: 0 }} aria-hidden />
                <div className="cz-choice" role="group" aria-label="Will you attend?">
                  <button type="button" className={`cz-choice__opt${going ? " is-picked" : ""}`} aria-pressed={going} onClick={() => choose("yes")}>
                    Joyfully accepts
                  </button>
                  <button type="button" className={`cz-choice__opt${form.values.attending === "no" ? " is-picked" : ""}`} aria-pressed={form.values.attending === "no"} onClick={() => choose("no")}>
                    Regretfully declines
                  </button>
                </div>
                <div>
                  <label htmlFor={`${id}-name`}>Your name</label>
                  <input id={`${id}-name`} className="cz-field" type="text" autoComplete="name" autoCapitalize="words" enterKeyHint="next" value={form.values.name ?? ""} onChange={(e) => form.set("name", e.target.value)} />
                </div>
                <div>
                  <label htmlFor={`${id}-contact`}>{form.contactMode === "mobile" ? "Mobile number" : "Email"}</label>
                  <input id={`${id}-contact`} className="cz-field" {...form.contactProps} autoCapitalize="none" autoCorrect="off" spellCheck={false} enterKeyHint="next" value={form.values.contact ?? ""} onChange={(e) => form.set("contact", e.target.value)} />
                  <button type="button" className="cz-link" onClick={() => form.toggleContact(`${id}-contact`)}>
                    {form.contactToggleLabel}
                  </button>
                </div>
                {going ? (
                  <div>
                    <label htmlFor={`${id}-guests`}>{seats > 1 ? "How many of your seats will you use?" : "How many are coming, including you?"}</label>
                    <div className="cz-count-pick" id={`${id}-guests`} role="radiogroup" aria-label="How many are coming">
                      {counts.map((n) => (
                        <button key={n} type="button" role="radio" aria-checked={(form.values.guests ?? "1") === String(n)} className={`cz-count-pick__n${(form.values.guests ?? "1") === String(n) ? " is-picked" : ""}`} onClick={() => form.set("guests", String(n))}>
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
                {going ? <RsvpQuestions form={form} idPrefix={id} askPartyNames={content.askPartyNames} fieldClassName="cz-field" /> : null}
                <div>
                  <label htmlFor={`${id}-note`}>A note for the couple (optional)</label>
                  <textarea id={`${id}-note`} className="cz-field" rows={3} maxLength={500} value={form.values.message ?? ""} onChange={(e) => form.set("message", e.target.value)} />
                </div>
                {form.error ? (
                  <p className="cz-error" role="alert">
                    {form.error}
                  </p>
                ) : null}
                <button type="submit" className="cz-btn cz-btn--block" disabled={form.state === "submitting" || editorPreview} title={editorPreview ? "Guests can reply once your site is published" : undefined}>
                  {form.state === "submitting" ? "Sending…" : customValue(content, "rsvpButton") || "Send my reply"}
                </button>
                {editorPreview ? <p className="cz-small">Preview only. Guests can reply once your site is published.</p> : null}
              </form>
            )}
          </>
        )}
      </div>
      <div className="cz-ledge cz-wood" aria-hidden />
    </section>
  );
}
