import { useEffect, useId, useState } from "react";
import type { EventContent } from "../../content/types";
import { customValue } from "../../content/custom";
import { useRsvpForm } from "../../spec/runtime/useRsvpForm";
import RsvpQuestions from "../shared/RsvpQuestions";
import { Field } from "../shared/siteEdit";
import { Corners } from "./art";

// The reply card: a paper card in a cinnabar rule. Will you come, then how many (up to ten,
// or the seats reserved on a guest's personal link: "We have reserved 2 seats for your
// family"). The sample shows the line with two seats.

export default function RsvpCard({ content, editorPreview, sample }: { content: EventContent; editorPreview: boolean; sample: boolean }) {
  const form = useRsvpForm(content, editorPreview, { asksAttending: true });
  const [done, setDone] = useState(false);
  const id = useId();
  const thanks = customValue(content, "thankYou") || "Thank you. We look forward to celebrating with you.";

  useEffect(() => {
    if (form.state === "success") setDone(true);
  }, [form.state]);

  const seats = form.invitee?.seatLimit && form.invitee.seats ? form.invitee.seats : sample ? 2 : 0;
  const going = form.values.attending === "yes";
  const count = Math.max(1, Math.min(form.maxGuests, Number(form.values.guests ?? 1) || 1));
  const choose = (v: "yes" | "no") => {
    form.set("attending", v);
    form.set("guests", v === "no" ? "0" : String(count));
  };

  return (
    <section id="rsvp" className="lq-rsvp" data-reveal>
      <div className="lq-card">
        <Corners />
        {done ? (
          <div className="lq-done" role="status">
            <p className="lq-zh lq-card__zh" lang="zh-Hant">
              {form.attending === "no" ? "謝謝" : "多謝"}
            </p>
            <h2 className="lq-card__title">{form.attending === "no" ? "We will miss you" : "Received with thanks"}</h2>
            <p className="lq-text">{form.attending === "no" ? "Thank you for letting us know." : thanks}</p>
            {form.emailed ? <p className="lq-small">A copy is on its way to your email.</p> : null}
            <button type="button" className="lq-btn lq-btn--line" onClick={() => setDone(false)}>
              Change my reply
            </button>
          </div>
        ) : (
          <>
            <p className="lq-zh lq-card__zh" lang="zh-Hant">
              敬請回覆
            </p>
            <Field as="h2" className="lq-card__title" path="custom.rsvpTitle" value={customValue(content, "rsvpTitle")} fallback="Kindly reply" placeholder="" editor={editorPreview} />
            {seats ? (
              <p className="lq-seats">
                We have reserved {seats} {seats === 1 ? "seat" : "seats"} for your family.
              </p>
            ) : editorPreview ? (
              <p className="lq-small">On a guest’s personal link this reads “We have reserved 2 seats for your family.”</p>
            ) : null}
            {form.replyBy ? <p className="lq-small">{form.replyBy}</p> : null}
            {form.closed ? (
              <p className="lq-text" role="status">
                {form.closedText}
              </p>
            ) : (
              <form className="lq-form" onSubmit={form.submit} noValidate>
                <input type="text" name="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => form.setWebsite(e.target.value)} style={{ position: "absolute", left: -9999, width: 1, height: 1, opacity: 0 }} aria-hidden />
                <div className="lq-choice" role="group" aria-label="Will you attend?">
                  <button type="button" className={`lq-choice__opt${going ? " is-picked" : ""}`} aria-pressed={going} onClick={() => choose("yes")}>
                    Will attend
                  </button>
                  <button type="button" className={`lq-choice__opt${form.values.attending === "no" ? " is-picked" : ""}`} aria-pressed={form.values.attending === "no"} onClick={() => choose("no")}>
                    With regrets
                  </button>
                </div>
                <div>
                  <label htmlFor={`${id}-name`}>Your name</label>
                  <input id={`${id}-name`} className="lq-field" type="text" autoComplete="name" autoCapitalize="words" enterKeyHint="next" value={form.values.name ?? ""} onChange={(e) => form.set("name", e.target.value)} />
                </div>
                <div>
                  <label htmlFor={`${id}-contact`}>{form.contactMode === "mobile" ? "Mobile number" : "Email"}</label>
                  <input id={`${id}-contact`} className="lq-field" {...form.contactProps} autoCapitalize="none" autoCorrect="off" spellCheck={false} enterKeyHint="next" value={form.values.contact ?? ""} onChange={(e) => form.set("contact", e.target.value)} />
                  <button type="button" className="lq-link" onClick={() => form.toggleContact(`${id}-contact`)}>
                    {form.contactToggleLabel}
                  </button>
                </div>
                {going ? (
                  <div className="lq-party">
                    <span className="lq-party__label" id={`${id}-count`}>
                      {seats > 1 ? "How many of your seats will you use?" : "How many will come, including you?"}
                    </span>
                    <span className="lq-step" role="group" aria-labelledby={`${id}-count`}>
                      <button type="button" aria-label="One fewer" disabled={count <= 1} onClick={() => form.set("guests", String(count - 1))}>
                        −
                      </button>
                      <output aria-live="polite">{count}</output>
                      <button type="button" aria-label="One more" disabled={count >= form.maxGuests} onClick={() => form.set("guests", String(count + 1))}>
                        +
                      </button>
                    </span>
                  </div>
                ) : null}
                {going ? <RsvpQuestions form={form} idPrefix={id} askPartyNames={content.askPartyNames} fieldClassName="lq-field" /> : null}
                <div>
                  <label htmlFor={`${id}-note`}>A note for the families (optional)</label>
                  <textarea id={`${id}-note`} className="lq-field" rows={3} maxLength={500} value={form.values.message ?? ""} onChange={(e) => form.set("message", e.target.value)} />
                </div>
                {form.error ? (
                  <p className="lq-error" role="alert">
                    {form.error}
                  </p>
                ) : null}
                <button type="submit" className="lq-btn lq-btn--block" disabled={form.state === "submitting" || editorPreview} title={editorPreview ? "Guests can reply once your site is published" : undefined}>
                  {form.state === "submitting" ? "Sending…" : customValue(content, "rsvpButton") || "Send my reply"}
                </button>
                {editorPreview ? <p className="lq-small">Preview only. Guests can reply once your site is published.</p> : null}
              </form>
            )}
          </>
        )}
      </div>
    </section>
  );
}
