import { useEffect, useId, useState } from "react";
import type { EventContent } from "../../content/types";
import { customValue } from "../../content/custom";
import { useRsvpForm } from "../../spec/runtime/useRsvpForm";
import RsvpQuestions from "../shared/RsvpQuestions";

// The reply card (its heading is the section's): a heavier card inside a hairline vermilion border. Will you come, then how
// many in your party (up to ten, or the seats the families reserved on a personal link).

export default function RsvpCard({ content, editorPreview, sample }: { content: EventContent; editorPreview: boolean; sample: boolean }) {
  const form = useRsvpForm(content, editorPreview, { asksAttending: true });
  const [done, setDone] = useState(false);
  const id = useId();
  const thanks = customValue(content, "thankYou") || "Thank you. We look forward to welcoming you.";

  useEffect(() => {
    if (form.state === "success") setDone(true);
  }, [form.state]);

  const seats = form.invitee?.seatLimit && form.invitee.seats ? form.invitee.seats : sample ? 2 : 0;
  const seatWords = ["", "One seat has", "Two seats have", "Three seats have", "Four seats have", "Five seats have", "Six seats have", "Seven seats have", "Eight seats have", "Nine seats have", "Ten seats have"];
  const seatsLine = seats ? `${seatWords[seats] ?? `${seats} seats have`} been reserved for you.` : "";
  const going = form.values.attending === "yes";
  const party = Math.max(1, Number(form.values.guests ?? 1) || 1);
  const max = form.maxGuests;
  const choose = (v: "yes" | "no") => {
    form.set("attending", v);
    form.set("guests", v === "no" ? "0" : String(Math.min(party, max)));
  };
  const setParty = (n: number) => form.set("guests", String(Math.max(1, Math.min(max, n))));

  return (
    <div id="rsvp" className="rp-card">
      {done ? (
        <div className="rp-done" role="status">
          <h3 className="rp-card__t">{form.attending === "no" ? "With thanks" : "Received, with thanks"}</h3>
          <p className="rp-text">{form.attending === "no" ? "Thank you for letting us know. You will be missed." : thanks}</p>
          {form.emailed ? <p className="rp-small">A copy is on its way to your email.</p> : null}
          <button type="button" className="rp-btn rp-btn--line" onClick={() => setDone(false)}>
            Change my reply
          </button>
        </div>
      ) : (
        <>
          {seatsLine ? <p className="rp-seats">{seatsLine}</p> : editorPreview ? <p className="rp-small">On a guest’s personal link this reads “Two seats have been reserved for you.”</p> : null}
          {form.replyBy ? <p className="rp-small">{form.replyBy}</p> : null}
          {form.closed ? (
            <p className="rp-text" role="status">
              {form.closedText}
            </p>
          ) : (
            <form className="rp-form" onSubmit={form.submit} noValidate>
              <input type="text" name="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => form.setWebsite(e.target.value)} style={{ position: "absolute", left: -9999, width: 1, height: 1, opacity: 0 }} aria-hidden />
              <div className="rp-choice" role="group" aria-label="Will you attend?">
                <button type="button" className={`rp-choice__opt${going ? " is-picked" : ""}`} aria-pressed={going} onClick={() => choose("yes")}>
                  Will attend
                </button>
                <button type="button" className={`rp-choice__opt${form.values.attending === "no" ? " is-picked" : ""}`} aria-pressed={form.values.attending === "no"} onClick={() => choose("no")}>
                  Sends regrets
                </button>
              </div>
              <div>
                <label htmlFor={`${id}-name`}>Your name</label>
                <input id={`${id}-name`} className="rp-field" type="text" autoComplete="name" autoCapitalize="words" enterKeyHint="next" value={form.values.name ?? ""} onChange={(e) => form.set("name", e.target.value)} />
              </div>
              <div>
                <label htmlFor={`${id}-contact`}>{form.contactMode === "mobile" ? "Mobile number" : "Email"}</label>
                <input id={`${id}-contact`} className="rp-field" {...form.contactProps} autoCapitalize="none" autoCorrect="off" spellCheck={false} enterKeyHint="next" value={form.values.contact ?? ""} onChange={(e) => form.set("contact", e.target.value)} />
                <button type="button" className="rp-link" onClick={() => form.toggleContact(`${id}-contact`)}>
                  {form.contactToggleLabel}
                </button>
              </div>
              {going ? (
                <div className="rp-party">
                  <span className="rp-party__l" id={`${id}-party-l`}>
                    {seats > 1 ? "How many of your seats will you use?" : "How many in your party, including you?"}
                  </span>
                  <span className="rp-step" role="group" aria-labelledby={`${id}-party-l`}>
                    <button type="button" aria-label="One fewer" disabled={party <= 1} onClick={() => setParty(party - 1)}>
                      −
                    </button>
                    <output aria-live="polite">{party}</output>
                    <button type="button" aria-label="One more" disabled={party >= max} onClick={() => setParty(party + 1)}>
                      +
                    </button>
                  </span>
                </div>
              ) : null}
              {going ? <RsvpQuestions form={form} idPrefix={id} askPartyNames={content.askPartyNames} fieldClassName="rp-field" /> : null}
              <div>
                <label htmlFor={`${id}-note`}>A note for the families (optional)</label>
                <textarea id={`${id}-note`} className="rp-field" rows={3} maxLength={500} value={form.values.message ?? ""} onChange={(e) => form.set("message", e.target.value)} />
              </div>
              {form.error ? (
                <p className="rp-error" role="alert">
                  {form.error}
                </p>
              ) : null}
              <button type="submit" className="rp-btn rp-btn--block" disabled={form.state === "submitting" || editorPreview} title={editorPreview ? "Guests can reply once your site is published" : undefined}>
                {form.state === "submitting" ? "Sending…" : customValue(content, "rsvpButton") || "Send my reply"}
              </button>
              {editorPreview ? <p className="rp-small">Preview only. Guests can reply once your site is published.</p> : null}
            </form>
          )}
        </>
      )}
    </div>
  );
}
