import { useEffect, useId, useState } from "react";
import type { EventContent } from "../../content/types";
import { customValue } from "../../content/custom";
import { useRsvpForm } from "../../spec/runtime/useRsvpForm";
import RsvpQuestions from "../shared/RsvpQuestions";
import { Field } from "../shared/siteEdit";
import { Corner } from "./art";

// The reply card: a porcelain-white card in the garden's fine double frame. Are you coming,
// then how many in your party (up to 10, or up to the seats reserved on a guest's personal
// link, which the card names). The send button is one of the page's two red things; 囍 is
// the other.

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
  const party = Math.max(1, Number(form.values.guests ?? 1) || 1);
  const max = form.maxGuests;
  const choose = (v: "yes" | "no") => {
    form.set("attending", v);
    form.set("guests", v === "no" ? "0" : String(Math.min(max, form.values.guests && form.values.guests !== "0" ? Number(form.values.guests) : 1)));
  };
  const setParty = (n: number) => form.set("guests", String(Math.min(max, Math.max(1, n))));

  return (
    <section id="rsvp" className="pg-rsvp" data-reveal>
      <div className="pg-card pg-frame">
        <Corner className="pg-corner--tl" />
        <Corner className="pg-corner--tr" />
        <Corner className="pg-corner--bl" />
        <Corner className="pg-corner--br" />
        {done ? (
          <div className="pg-done" role="status">
            <p className="pg-zh pg-kicker" lang="zh-Hant">
              多謝
            </p>
            <h2 className="pg-title">{form.attending === "no" ? "You will be missed" : "Until then"}</h2>
            <p className="pg-text">{form.attending === "no" ? "Thank you for letting us know." : thanks}</p>
            {form.emailed ? <p className="pg-small">A copy is on its way to your email.</p> : null}
            <button type="button" className="pg-btn pg-btn--line" onClick={() => setDone(false)}>
              Change my reply
            </button>
          </div>
        ) : (
          <>
            <p className="pg-zh pg-kicker" lang="zh-Hant">
              敬請回覆
            </p>
            <Field as="h2" className="pg-title" path="custom.rsvpTitle" value={customValue(content, "rsvpTitle")} fallback="Kindly reply" placeholder="" editor={editorPreview} />
            {seats ? (
              <p className="pg-seats">
                We have reserved {seats} {seats === 1 ? "seat" : "seats"} for you.
              </p>
            ) : editorPreview ? (
              <p className="pg-small">On a guest’s personal link this reads “We have reserved 2 seats for you.”</p>
            ) : null}
            {form.replyBy ? <p className="pg-small">{form.replyBy}</p> : null}
            {form.closed ? (
              <p className="pg-text" role="status">
                {form.closedText}
              </p>
            ) : (
              <form className="pg-form" onSubmit={form.submit} noValidate>
                <input type="text" name="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => form.setWebsite(e.target.value)} style={{ position: "absolute", left: -9999, width: 1, height: 1, opacity: 0 }} aria-hidden />
                <div className="pg-choice" role="group" aria-label="Will you attend?">
                  <button type="button" className={`pg-choice__opt${going ? " is-picked" : ""}`} aria-pressed={going} onClick={() => choose("yes")}>
                    Gladly attending
                  </button>
                  <button type="button" className={`pg-choice__opt${form.values.attending === "no" ? " is-picked" : ""}`} aria-pressed={form.values.attending === "no"} onClick={() => choose("no")}>
                    Unable to attend
                  </button>
                </div>
                <div>
                  <label htmlFor={`${id}-name`}>Your name</label>
                  <input id={`${id}-name`} className="pg-field" type="text" autoComplete="name" autoCapitalize="words" enterKeyHint="next" value={form.values.name ?? ""} onChange={(e) => form.set("name", e.target.value)} />
                </div>
                <div>
                  <label htmlFor={`${id}-contact`}>{form.contactMode === "mobile" ? "Mobile number" : "Email"}</label>
                  <input id={`${id}-contact`} className="pg-field" {...form.contactProps} autoCapitalize="none" autoCorrect="off" spellCheck={false} enterKeyHint="next" value={form.values.contact ?? ""} onChange={(e) => form.set("contact", e.target.value)} />
                  <button type="button" className="pg-link" onClick={() => form.toggleContact(`${id}-contact`)}>
                    {form.contactToggleLabel}
                  </button>
                </div>
                {going ? (
                  <div className="pg-party">
                    <span className="pg-party__label" id={`${id}-party-l`}>
                      {seats > 1 ? "How many of your seats will you use?" : "How many in your party, including you?"}
                    </span>
                    <span className="pg-party__ctrl" role="group" aria-labelledby={`${id}-party-l`}>
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
                {going ? <RsvpQuestions form={form} idPrefix={id} askPartyNames={content.askPartyNames} fieldClassName="pg-field" /> : null}
                <div>
                  <label htmlFor={`${id}-note`}>A note for the families (optional)</label>
                  <textarea id={`${id}-note`} className="pg-field" rows={3} maxLength={500} value={form.values.message ?? ""} onChange={(e) => form.set("message", e.target.value)} />
                </div>
                {form.error ? (
                  <p className="pg-error" role="alert">
                    {form.error}
                  </p>
                ) : null}
                <button type="submit" className="pg-btn pg-btn--red pg-btn--block" disabled={form.state === "submitting" || editorPreview} title={editorPreview ? "Guests can reply once your site is published" : undefined}>
                  {form.state === "submitting" ? "Sending…" : customValue(content, "rsvpButton") || "Send my reply"}
                </button>
                {editorPreview ? <p className="pg-small">Preview only. Guests can reply once your site is published.</p> : null}
              </form>
            )}
          </>
        )}
      </div>
    </section>
  );
}
