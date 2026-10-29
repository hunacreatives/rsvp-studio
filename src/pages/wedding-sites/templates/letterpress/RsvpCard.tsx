import { useEffect, useId, useState, type ReactNode } from "react";
import type { EventContent } from "../../content/types";
import { customValue } from "../../content/custom";
import { useRsvpForm } from "../../spec/runtime/useRsvpForm";
import RsvpQuestions from "../shared/RsvpQuestions";
import { Field } from "../shared/siteEdit";
import { coupleNames } from "./content";

// The reply card: "Joyfully accepts" or "Regretfully declines" first, as printed reply cards
// ask; then the name, a way to reach them, how many, the couple's own questions and a note, on
// printed lines. Posts to the shared RSVP endpoint (useRsvpForm).

export default function RsvpCard({ content, editorPreview, credit }: { content: EventContent; editorPreview: boolean; credit?: ReactNode }) {
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
      <div className="lp-reply" role="status">
        <p className="lp-label">{form.attending === "no" ? "With regret" : "With joy"}</p>
        <h2 className="lp-h2 lp-press">{form.attending === "no" ? "We’ll miss you" : "Thank you"}</h2>
        <p className="lp-p lp-press">{form.attending === "no" ? `Thank you for letting ${couple || "us"} know.` : customValue(content, "thankYou") || "We can’t wait to celebrate with you."}</p>
        {form.copyNote ? <p className="lp-small">{form.copyNote}</p> : null}
        <button type="button" className="lp-btn lp-btn--line" onClick={() => setDone(false)}>
          Change my reply
        </button>
        {credit}
      </div>
    );

  return (
    <div className="lp-reply">
      <Field as="h2" className="lp-h2 lp-press" path="custom.rsvpTitle" value={customValue(content, "rsvpTitle")} fallback="Kindly Reply" placeholder="" editor={E} />
      {form.replyBy ? <p className="lp-label lp-label--soft">{form.replyBy}</p> : null}
      {seats ? <p className="lp-small">We’ve saved {seats} {seats === 1 ? "seat" : "seats"} for you.</p> : null}
      {form.closed ? (
        <p className="lp-p" role="status">
          {form.closedText}
        </p>
      ) : (
        <form className="lp-form" onSubmit={form.submit} noValidate>
          <input type="text" name="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => form.setWebsite(e.target.value)} style={{ position: "absolute", left: -9999, width: 1, height: 1, opacity: 0 }} aria-hidden />
          <div className="lp-choices" role="group" aria-label="Will you attend?">
            <button type="button" className={`lp-choice${going ? " is-on" : ""}`} aria-pressed={going} onClick={() => choose("yes")}>
              <i aria-hidden />
              Joyfully accepts
            </button>
            <button type="button" className={`lp-choice${form.values.attending === "no" ? " is-on" : ""}`} aria-pressed={form.values.attending === "no"} onClick={() => choose("no")}>
              <i aria-hidden />
              Regretfully declines
            </button>
          </div>
          {open ? (
            <div className="lp-fields">
              <label className="lp-line">
                <span>Name</span>
                <input id={`${id}-name`} className="lp-field" type="text" autoComplete="name" autoCapitalize="words" enterKeyHint="next" value={form.values.name ?? ""} onChange={(e) => form.set("name", e.target.value)} />
              </label>
              <label className="lp-line">
                <span>{form.contactMode === "mobile" ? "Mobile" : "Email"}</span>
                <input id={`${id}-contact`} className="lp-field" {...form.contactProps} placeholder="" autoCapitalize="none" autoCorrect="off" spellCheck={false} enterKeyHint="next" value={form.values.contact ?? ""} onChange={(e) => form.set("contact", e.target.value)} />
              </label>
              <button type="button" className="lp-link" onClick={() => form.toggleContact(`${id}-contact`)}>
                {form.contactToggleLabel}
              </button>
              {going ? (
                <div className="lp-count">
                  <span className="lp-label">Guests, including you</span>
                  <div className="lp-counts" role="radiogroup" aria-label="Guests, including you">
                    {counts.map((n) => (
                      <button key={n} type="button" role="radio" aria-checked={(form.values.guests ?? "1") === String(n)} className={`lp-n${(form.values.guests ?? "1") === String(n) ? " is-on" : ""}`} onClick={() => form.set("guests", String(n))}>
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
              {going ? <RsvpQuestions form={form} idPrefix={id} askPartyNames={content.askPartyNames} labelClassName="lp-label lp-qlabel" fieldClassName="lp-field lp-field--box" /> : null}
              <label className="lp-line lp-line--note">
                <span>A note for {couple || "the couple"}</span>
                <textarea className="lp-field" rows={2} maxLength={500} value={form.values.message ?? ""} onChange={(e) => form.set("message", e.target.value)} />
              </label>
              {form.error ? (
                <p className="lp-error" role="alert">
                  {form.error}
                </p>
              ) : null}
              <button type="submit" className="lp-btn" disabled={form.state === "submitting" || E} title={E ? "Guests can reply once your site is published" : undefined}>
                {form.state === "submitting" ? "Sending…" : customValue(content, "rsvpButton") || "Send reply"}
              </button>
              {E ? <p className="lp-small">Preview only. Guests can reply once your site is published.</p> : null}
            </div>
          ) : null}
        </form>
      )}
      {credit}
    </div>
  );
}
