import { useEffect, useId, useState } from "react";
import type { EventContent } from "../../content/types";
import { customValue } from "../../content/custom";
import { useRsvpForm } from "../../spec/runtime/useRsvpForm";
import RsvpQuestions from "../shared/RsvpQuestions";
import { Confetti } from "./art";
import { coupleNames } from "./content";

// The RSVP: Attending / Decline, name, contact, how many, the couple's own
// questions and a note. Posts to the shared RSVP endpoint (useRsvpForm). A yes
// ends with gold confetti and "Thank you!".

export default function RsvpBlock({ content, editorPreview, motion }: { content: EventContent; editorPreview: boolean; motion: boolean }) {
  const form = useRsvpForm(content, editorPreview, { asksAttending: true });
  const [done, setDone] = useState(false);
  const [burst, setBurst] = useState(0);
  const id = useId();
  const couple = coupleNames(content);

  useEffect(() => {
    if (form.state !== "success") return;
    setDone(true);
    if (form.attending === "yes" && motion) setBurst((n) => n + 1);
  }, [form.state, form.attending, motion]);

  const going = form.values.attending === "yes";
  const choose = (v: "yes" | "no") => {
    form.set("attending", v);
    form.set("guests", v === "no" ? "0" : form.values.guests && form.values.guests !== "0" ? form.values.guests : "1");
  };
  const counts = Array.from({ length: Math.min(form.maxGuests, 6) }, (_, i) => i + 1);

  if (done)
    return (
      <div className="pm-thanks" role="status">
        {burst ? <Confetti key={burst} /> : null}
        <p className="pm-thanks__big">{form.attending === "no" ? "We’ll miss you" : "Thank you!"}</p>
        <p className="pm-text">{form.attending === "no" ? `Thank you for letting ${couple || "us"} know.` : customValue(content, "thankYou") || "We’re looking forward to seeing you."}</p>
        {form.copyNote ? <p className="pm-text pm-text--soft">{form.copyNote}</p> : null}
        <button type="button" className="pm-btn pm-btn--line" onClick={() => setDone(false)}>
          Change my reply
        </button>
      </div>
    );

  if (form.closed)
    return (
      <p className="pm-text" role="status">
        {form.closedText}
      </p>
    );

  return (
    <form className="pm-form" onSubmit={form.submit} noValidate>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => form.setWebsite(e.target.value)} style={{ position: "absolute", left: -9999, width: 1, height: 1, opacity: 0 }} aria-hidden />
      {form.replyBy ? <p className="pm-text pm-text--soft">{form.replyBy}</p> : null}
      <div>
        <p className="pm-label">Your response</p>
        <div className="pm-pills" role="group" aria-label="Will you attend?">
          <button type="button" className={`pm-pill${going ? " is-picked" : ""}`} aria-pressed={going} onClick={() => choose("yes")}>
            Attending
          </button>
          <button type="button" className={`pm-pill${form.values.attending === "no" ? " is-picked" : ""}`} aria-pressed={form.values.attending === "no"} onClick={() => choose("no")}>
            Decline
          </button>
        </div>
      </div>
      <div>
        <label className="pm-label" htmlFor={`${id}-name`}>Name</label>
        <input id={`${id}-name`} className="pm-field" type="text" autoComplete="name" autoCapitalize="words" placeholder="Your full name" value={form.values.name ?? ""} onChange={(e) => form.set("name", e.target.value)} />
      </div>
      <div>
        <label className="pm-label" htmlFor={`${id}-contact`}>{form.contactMode === "mobile" ? "Mobile number" : "Email"}</label>
        <input id={`${id}-contact`} className="pm-field" {...form.contactProps} autoCapitalize="none" autoCorrect="off" spellCheck={false} value={form.values.contact ?? ""} onChange={(e) => form.set("contact", e.target.value)} />
        <button type="button" className="pm-link" onClick={() => form.toggleContact(`${id}-contact`)}>
          {form.contactToggleLabel}
        </button>
      </div>
      {going ? (
        <div>
          <p className="pm-label">Guests, including you</p>
          <div className="pm-pills" role="radiogroup" aria-label="Guests, including you">
            {counts.map((n) => (
              <button key={n} type="button" role="radio" aria-checked={(form.values.guests ?? "1") === String(n)} className={`pm-pill pm-pill--n${(form.values.guests ?? "1") === String(n) ? " is-picked" : ""}`} onClick={() => form.set("guests", String(n))}>
                {n}
              </button>
            ))}
          </div>
        </div>
      ) : null}
      {going ? <RsvpQuestions form={form} idPrefix={id} askPartyNames={content.askPartyNames} fieldClassName="pm-field" /> : null}
      <div>
        <label className="pm-label" htmlFor={`${id}-note`}>Message (optional)</label>
        <textarea id={`${id}-note`} className="pm-field" rows={3} maxLength={500} placeholder={`A note for ${couple || "the couple"}…`} value={form.values.message ?? ""} onChange={(e) => form.set("message", e.target.value)} />
      </div>
      {form.error ? (
        <p className="pm-error" role="alert">
          {form.error}
        </p>
      ) : null}
      <button type="submit" className="pm-btn pm-btn--wide" disabled={form.state === "submitting" || editorPreview} title={editorPreview ? "Guests can reply once your site is published" : undefined}>
        {form.state === "submitting" ? "Sending…" : "Send RSVP"}
      </button>
    </form>
  );
}
