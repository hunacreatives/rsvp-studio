import { useEffect, useId, useState, type ReactNode } from "react";
import type { EventContent } from "../../content/types";
import { customValue } from "../../content/custom";
import { useRsvpForm } from "../../spec/runtime/useRsvpForm";
import RsvpQuestions from "../shared/RsvpQuestions";

// The reply, under the "Reply" heading: coming or not, the name and how to reach them, how many,
// the host's own questions and a note. A "yes" showers the screen with sprinkles (live page).

export default function RsvpCard({ content, editorPreview, sample, credit, onAccepted }: { content: EventContent; editorPreview: boolean; sample: boolean; credit?: ReactNode; onAccepted?: () => void }) {
  const form = useRsvpForm(content, editorPreview, { asksAttending: true });
  const [done, setDone] = useState(false);
  const id = useId();
  const going = form.values.attending === "yes";
  const seats = Number(form.values.guests ?? 1) || 1;
  const reserved = form.invitee?.seatLimit && form.invitee.seats ? form.invitee.seats : sample ? 2 : 0;

  useEffect(() => {
    if (form.state !== "success") return;
    setDone(true);
    if (form.attending !== "no") onAccepted?.();
  }, [form.state, form.attending, onAccepted]);

  const choose = (v: "yes" | "no") => {
    form.set("attending", v);
    form.set("guests", v === "no" ? "0" : String(Math.max(1, seats)));
  };
  const setSeats = (n: number) => form.set("guests", String(Math.min(form.maxGuests, Math.max(1, n))));

  if (done)
    return (
      <div className="sp-reply" role="status">
        <p className="sp-lead">{form.attending === "no" ? "Thank you for letting us know." : customValue(content, "thankYou") || "See you at the party."}</p>
        {form.copyNote ? <p className="sp-small">{form.copyNote}</p> : null}
        <button type="button" className="sp-btn sp-btn--quiet" onClick={() => setDone(false)}>
          Change my reply
        </button>
        {credit}
      </div>
    );

  return (
    <div className="sp-reply">
      {form.replyBy || reserved ? (
        <p className="sp-small sp-small--top">
          {form.replyBy}
          {form.replyBy && reserved ? " " : ""}
          {reserved ? `We’ve saved ${reserved} ${reserved === 1 ? "spot" : "spots"} for you.` : ""}
        </p>
      ) : null}
      {form.closed ? (
        <p className="sp-small" role="status">
          {form.closedText}
        </p>
      ) : (
        <form className="sp-form" onSubmit={form.submit} noValidate>
          <input type="text" name="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => form.setWebsite(e.target.value)} style={{ position: "absolute", left: -9999, width: 1, height: 1, opacity: 0 }} aria-hidden />
          <div className="sp-choice" role="group" aria-label="Will you come?">
            <button type="button" className={going ? "is-on" : ""} aria-pressed={going} onClick={() => choose("yes")}>
              I’ll be there
            </button>
            <button type="button" className={form.values.attending === "no" ? "is-on" : ""} aria-pressed={form.values.attending === "no"} onClick={() => choose("no")}>
              Can’t make it
            </button>
          </div>
          <div className="sp-pair">
            <div>
              <label htmlFor={`${id}-name`}>Your name</label>
              <input id={`${id}-name`} className="sp-field" type="text" autoComplete="name" autoCapitalize="words" enterKeyHint="next" value={form.values.name ?? ""} onChange={(e) => form.set("name", e.target.value)} />
            </div>
            <div>
              <label htmlFor={`${id}-contact`}>{form.contactMode === "mobile" ? "Mobile number" : "Email"}</label>
              <input id={`${id}-contact`} className="sp-field" {...form.contactProps} autoCapitalize="none" autoCorrect="off" spellCheck={false} enterKeyHint="next" value={form.values.contact ?? ""} onChange={(e) => form.set("contact", e.target.value)} />
              <button type="button" className="sp-link" onClick={() => form.toggleContact(`${id}-contact`)}>
                {form.contactToggleLabel}
              </button>
            </div>
          </div>
          {going ? (
            <div className="sp-seats">
              <span>Guests</span>
              <span className="sp-seats__ctrl">
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
          {going ? <RsvpQuestions form={form} idPrefix={id} askPartyNames={content.askPartyNames} fieldClassName="sp-field" /> : null}
          <label htmlFor={`${id}-msg`}>A note for the family (optional)</label>
          <textarea id={`${id}-msg`} className="sp-field" rows={2} maxLength={400} value={form.values.message ?? ""} onChange={(e) => form.set("message", e.target.value)} />
          {form.error ? (
            <p className="sp-error" role="alert">
              {form.error}
            </p>
          ) : null}
          <button type="submit" className="sp-btn sp-send" disabled={form.state === "submitting" || editorPreview} title={editorPreview ? "Guests can reply once your site is published" : undefined}>
            {form.state === "submitting" ? "Sending…" : customValue(content, "rsvpButton") || "Send reply"}
          </button>
          {editorPreview ? <p className="sp-small">Preview only. Guests can reply once your site is published.</p> : null}
        </form>
      )}
      {credit}
    </div>
  );
}
