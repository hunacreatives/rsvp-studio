import { useEffect, useId, useState } from "react";
import type { EventContent } from "../../content/types";
import { customValue } from "../../content/custom";
import { useRsvpForm } from "../../spec/runtime/useRsvpForm";
import RsvpQuestions from "../shared/RsvpQuestions";
import { coupleNames } from "./content";

// The reply, at the altar: the two lines of an engraved reply card first (accepts / declines), so
// the card stays short and the retablo shows above it; then the name, contact, how many, the
// couple's own questions and a note. Posts to the shared RSVP endpoint (useRsvpForm).

export default function RsvpCard({ content, editorPreview }: { content: EventContent; editorPreview: boolean }) {
  const form = useRsvpForm(content, editorPreview, { asksAttending: true });
  const [done, setDone] = useState(false);
  const id = useId();
  const couple = coupleNames(content);

  useEffect(() => {
    if (form.state === "success") setDone(true);
  }, [form.state]);

  const going = form.values.attending === "yes";
  const open = editorPreview || !!form.values.attending;
  const choose = (v: "yes" | "no") => {
    form.set("attending", v);
    form.set("guests", v === "no" ? "0" : form.values.guests && form.values.guests !== "0" ? form.values.guests : "1");
  };
  const counts = Array.from({ length: Math.min(form.maxGuests, 6) }, (_, i) => i + 1);

  if (done)
    return (
      <div className="sb-thanks" role="status">
        <p className="sb-thanks__big">{form.attending === "no" ? "You will be missed" : "Thank you"}</p>
        <p className="sb-p">{form.attending === "no" ? `Thank you for letting ${couple || "us"} know.` : customValue(content, "thankYou") || "We look forward to seeing you at the church."}</p>
        {form.copyNote ? <p className="sb-small">{form.copyNote}</p> : null}
        <button type="button" className="sb-btn sb-btn--line" onClick={() => setDone(false)}>
          Change my reply
        </button>
      </div>
    );

  if (form.closed)
    return (
      <p className="sb-p" role="status">
        {form.closedText}
      </p>
    );

  return (
    <form className="sb-form" onSubmit={form.submit} noValidate>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => form.setWebsite(e.target.value)} style={{ position: "absolute", left: -9999, width: 1, height: 1, opacity: 0 }} aria-hidden />
      {form.replyBy ? <p className="sb-replyby">{form.replyBy}</p> : null}
      <div className="sb-choices" role="group" aria-label="Will you attend?">
        <button type="button" className={`sb-choice${going ? " is-picked" : ""}`} aria-pressed={going} onClick={() => choose("yes")}>
          <i aria-hidden />
          Joyfully accepts
        </button>
        <button type="button" className={`sb-choice${form.values.attending === "no" ? " is-picked" : ""}`} aria-pressed={form.values.attending === "no"} onClick={() => choose("no")}>
          <i aria-hidden />
          Regretfully declines
        </button>
      </div>
      {open ? (
        <div className="sb-open">
          <div>
            <label className="sb-label" htmlFor={`${id}-name`}>Name</label>
            <input id={`${id}-name`} className="sb-field" type="text" autoComplete="name" autoCapitalize="words" placeholder="Your full name" value={form.values.name ?? ""} onChange={(e) => form.set("name", e.target.value)} />
          </div>
          <div>
            <label className="sb-label" htmlFor={`${id}-contact`}>{form.contactMode === "mobile" ? "Mobile number" : "Email"}</label>
            <input id={`${id}-contact`} className="sb-field" {...form.contactProps} autoCapitalize="none" autoCorrect="off" spellCheck={false} value={form.values.contact ?? ""} onChange={(e) => form.set("contact", e.target.value)} />
            <button type="button" className="sb-link" onClick={() => form.toggleContact(`${id}-contact`)}>
              {form.contactToggleLabel}
            </button>
          </div>
          {going || editorPreview ? (
            <div>
              <p className="sb-label">Guests, including you</p>
              <div className="sb-counts" role="radiogroup" aria-label="Guests, including you">
                {counts.map((n) => (
                  <button key={n} type="button" role="radio" aria-checked={(form.values.guests ?? "1") === String(n)} className={`sb-count${(form.values.guests ?? "1") === String(n) ? " is-picked" : ""}`} onClick={() => form.set("guests", String(n))}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          {going ? <RsvpQuestions form={form} idPrefix={id} askPartyNames={content.askPartyNames} fieldClassName="sb-field" /> : null}
          <div>
            <label className="sb-label" htmlFor={`${id}-note`}>A note for the couple (optional)</label>
            <textarea id={`${id}-note`} className="sb-field" rows={3} maxLength={500} value={form.values.message ?? ""} onChange={(e) => form.set("message", e.target.value)} />
          </div>
          {form.error ? (
            <p className="sb-error" role="alert">
              {form.error}
            </p>
          ) : null}
          <button type="submit" className="sb-btn" disabled={form.state === "submitting" || editorPreview} title={editorPreview ? "Guests can reply once your site is published" : undefined}>
            {form.state === "submitting" ? "Sending…" : customValue(content, "rsvpButton") || "Send my reply"}
          </button>
        </div>
      ) : null}
    </form>
  );
}
