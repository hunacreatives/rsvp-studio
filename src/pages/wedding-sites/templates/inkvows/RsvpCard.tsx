import { useEffect, useId, useState, type ReactNode } from "react";
import type { EventContent } from "../../content/types";
import { customValue } from "../../content/custom";
import { useRsvpForm } from "../../spec/runtime/useRsvpForm";
import RsvpQuestions from "../shared/RsvpQuestions";
import { coupleNames } from "./content";

// The reply, set on the page as a reply card is printed: "Joyfully accepts" or "Regretfully
// declines" first, then the name, a way to reach them, how many, the couple's own questions and
// a note, on ruled lines. The heading above it is written by the pen (the template's). Posts to
// the shared RSVP endpoint (useRsvpForm).

export default function RsvpCard({ content, editorPreview, credit, heading }: { content: EventContent; editorPreview: boolean; credit?: ReactNode; heading: ReactNode }) {
  const form = useRsvpForm(content, editorPreview, { asksAttending: true });
  const [done, setDone] = useState(false);
  const id = useId();
  const couple = coupleNames(content);
  const E = editorPreview;

  useEffect(() => {
    if (form.state === "success") setDone(true);
  }, [form.state]);

  const going = form.values.attending === "yes";
  const open = E || !!form.values.attending;
  const choose = (v: "yes" | "no") => {
    form.set("attending", v);
    form.set("guests", v === "no" ? "0" : form.values.guests && form.values.guests !== "0" ? form.values.guests : "1");
  };
  const counts = Array.from({ length: Math.min(form.maxGuests, 6) }, (_, i) => i + 1);
  const seats = form.invitee?.seatLimit && form.invitee.seats ? form.invitee.seats : 0;

  if (done)
    return (
      <div className="iv-reply" role="status">
        <p className="iv-kick">{form.attending === "no" ? "With regret" : "With joy"}</p>
        <h2 className="iv-done">{form.attending === "no" ? "We’ll miss you" : "Thank you"}</h2>
        <p className="iv-p">{form.attending === "no" ? `Thank you for letting ${couple || "us"} know.` : customValue(content, "thankYou") || "We can’t wait to celebrate with you."}</p>
        {form.copyNote ? <p className="iv-small">{form.copyNote}</p> : null}
        <button type="button" className="iv-btn iv-btn--line" onClick={() => setDone(false)}>
          Change my reply
        </button>
        {credit}
      </div>
    );

  return (
    <div className="iv-reply">
      {heading}
      {form.replyBy ? <p className="iv-kick iv-kick--soft">{form.replyBy}</p> : null}
      {seats ? <p className="iv-small">We’ve saved {seats} {seats === 1 ? "seat" : "seats"} for you.</p> : null}
      {form.closed ? (
        <p className="iv-p" role="status">
          {form.closedText}
        </p>
      ) : (
        <form className="iv-form" onSubmit={form.submit} noValidate>
          <input type="text" name="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => form.setWebsite(e.target.value)} style={{ position: "absolute", left: -9999, width: 1, height: 1, opacity: 0 }} aria-hidden />
          <div className="iv-choices" role="group" aria-label="Will you attend?">
            <button type="button" className={`iv-choice${going ? " is-on" : ""}`} aria-pressed={going} onClick={() => choose("yes")}>
              <i aria-hidden />
              Joyfully accepts
            </button>
            <button type="button" className={`iv-choice${form.values.attending === "no" ? " is-on" : ""}`} aria-pressed={form.values.attending === "no"} onClick={() => choose("no")}>
              <i aria-hidden />
              Regretfully declines
            </button>
          </div>
          {open ? (
            <div className="iv-fields">
              <label className="iv-line">
                <span>Name</span>
                <input id={`${id}-name`} className="iv-field" type="text" autoComplete="name" autoCapitalize="words" enterKeyHint="next" value={form.values.name ?? ""} onChange={(e) => form.set("name", e.target.value)} />
              </label>
              <label className="iv-line">
                <span>{form.contactMode === "mobile" ? "Mobile" : "Email"}</span>
                <input id={`${id}-contact`} className="iv-field" {...form.contactProps} placeholder="" autoCapitalize="none" autoCorrect="off" spellCheck={false} enterKeyHint="next" value={form.values.contact ?? ""} onChange={(e) => form.set("contact", e.target.value)} />
              </label>
              <button type="button" className="iv-link" onClick={() => form.toggleContact(`${id}-contact`)}>
                {form.contactToggleLabel}
              </button>
              {going ? (
                <div className="iv-count">
                  <span className="iv-kick">Guests, including you</span>
                  <div className="iv-counts" role="radiogroup" aria-label="Guests, including you">
                    {counts.map((n) => (
                      <button key={n} type="button" role="radio" aria-checked={(form.values.guests ?? "1") === String(n)} className={`iv-n${(form.values.guests ?? "1") === String(n) ? " is-on" : ""}`} onClick={() => form.set("guests", String(n))}>
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
              {going ? <RsvpQuestions form={form} idPrefix={id} askPartyNames={content.askPartyNames} labelClassName="iv-kick iv-qlabel" fieldClassName="iv-field iv-field--box" /> : null}
              <label className="iv-line iv-line--note">
                <span>A note for {couple || "the couple"}</span>
                <textarea className="iv-field" rows={2} maxLength={500} value={form.values.message ?? ""} onChange={(e) => form.set("message", e.target.value)} />
              </label>
              {form.error ? (
                <p className="iv-error" role="alert">
                  {form.error}
                </p>
              ) : null}
              <button type="submit" className="iv-btn" disabled={form.state === "submitting" || E} title={E ? "Guests can reply once your site is published" : undefined}>
                {form.state === "submitting" ? "Sending…" : customValue(content, "rsvpButton") || "Send reply"}
              </button>
              {E ? <p className="iv-small">Preview only. Guests can reply once your site is published.</p> : null}
            </div>
          ) : null}
        </form>
      )}
      {credit}
    </div>
  );
}
