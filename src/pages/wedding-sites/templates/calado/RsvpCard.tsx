import { useEffect, useId, useState } from "react";
import type { EventContent } from "../../content/types";
import { customValue } from "../../content/custom";
import { useRsvpForm } from "../../spec/runtime/useRsvpForm";
import RsvpQuestions from "../shared/RsvpQuestions";

// The reply card: are you coming, then how many grown-ups and how many little ones (venues
// count both, so the family needs both). The party total goes in as the guest count and
// the kids ride along with it (api/wedding-rsvp.ts kid_count). On a guest's personal link
// the total stops at the seats reserved for them.

function Stepper({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (n: number) => void }) {
  return (
    <div className="cl-step">
      <span className="cl-step__label">{label}</span>
      <span className="cl-step__ctrl">
        <button type="button" aria-label={`Fewer ${label.toLowerCase()}`} disabled={value <= min} onClick={() => onChange(value - 1)}>
          −
        </button>
        <output aria-live="polite">{value}</output>
        <button type="button" aria-label={`More ${label.toLowerCase()}`} disabled={value >= max} onClick={() => onChange(value + 1)}>
          +
        </button>
      </span>
    </div>
  );
}

export default function RsvpCard({ content, editorPreview, sample }: { content: EventContent; editorPreview: boolean; sample: boolean }) {
  const form = useRsvpForm(content, editorPreview, { asksAttending: true });
  const [done, setDone] = useState(false);
  const id = useId();
  const adults = Math.max(1, Number(form.values.guests ?? 1) - Number(form.values.kids ?? 0));
  const kids = Number(form.values.kids ?? 0);
  const max = form.maxGuests;
  const going = form.values.attending === "yes";

  useEffect(() => {
    if (form.state === "success") setDone(true);
  }, [form.state]);

  const setCounts = (a: number, k: number) => {
    form.set("guests", String(a + k));
    form.set("kids", String(k));
  };
  const choose = (v: "yes" | "no") => {
    form.set("attending", v);
    if (v === "no") {
      form.set("guests", "0");
      form.set("kids", "0");
    } else setCounts(adults, kids);
  };

  const seats = form.invitee?.seatLimit && form.invitee.seats ? form.invitee.seats : sample ? 3 : 0;
  const title = customValue(content, "rsvpTitle") || "Kindly reply";
  const thanks = customValue(content, "thankYou") || "Salamat po. We can’t wait to celebrate with you.";

  return (
    <div id="rsvp" className="cl-card cl-rsvp" data-reveal>
      {done ? (
        <div className="cl-done" role="status">
          <h2 className="cl-title">{form.attending === "no" ? "We’ll miss you" : "See you there"}</h2>
          <p className="cl-text">{form.attending === "no" ? "Thank you for letting us know." : thanks}</p>
          {form.emailed ? <p className="cl-small">A copy is on its way to your email.</p> : null}
          <button type="button" className="cl-btn cl-btn--line" onClick={() => setDone(false)}>
            Change our reply
          </button>
        </div>
      ) : (
        <>
          <h2 className="cl-title">{title}</h2>
          {seats ? <p className="cl-text cl-seats">We’ve reserved {seats} {seats === 1 ? "seat" : "seats"} for your family.</p> : null}
          {form.replyBy ? <p className="cl-small">{form.replyBy}</p> : null}
          {form.closed ? (
            <p className="cl-text" role="status">
              {form.closedText}
            </p>
          ) : (
            <form className="cl-form" onSubmit={form.submit} noValidate>
              <input type="text" name="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => form.setWebsite(e.target.value)} style={{ position: "absolute", left: -9999, width: 1, height: 1, opacity: 0 }} aria-hidden />
              <div className="cl-choice" role="group" aria-label="Will you come?">
                <button type="button" className={`cl-choice__opt${going ? " is-picked" : ""}`} aria-pressed={going} onClick={() => choose("yes")}>
                  We’ll be there
                </button>
                <button type="button" className={`cl-choice__opt${form.values.attending === "no" ? " is-picked" : ""}`} aria-pressed={form.values.attending === "no"} onClick={() => choose("no")}>
                  Can’t make it
                </button>
              </div>
              <div>
                <label htmlFor={`${id}-name`}>Your name</label>
                <input id={`${id}-name`} className="cl-field" type="text" autoComplete="name" autoCapitalize="words" enterKeyHint="next" value={form.values.name ?? ""} onChange={(e) => form.set("name", e.target.value)} />
              </div>
              <div>
                <label htmlFor={`${id}-contact`}>{form.contactMode === "mobile" ? "Mobile number" : "Email"}</label>
                <input id={`${id}-contact`} className="cl-field" {...form.contactProps} autoCapitalize="none" autoCorrect="off" spellCheck={false} enterKeyHint="next" value={form.values.contact ?? ""} onChange={(e) => form.set("contact", e.target.value)} />
                <button type="button" className="cl-link" onClick={() => form.toggleContact(`${id}-contact`)}>
                  {form.contactToggleLabel}
                </button>
              </div>
              {going ? (
                <div className="cl-steps">
                  <Stepper label="Adults" value={adults} min={1} max={Math.max(1, max - kids)} onChange={(a) => setCounts(a, kids)} />
                  <Stepper label="Kids" value={kids} min={0} max={Math.max(0, max - adults)} onChange={(k) => setCounts(adults, k)} />
                </div>
              ) : null}
              {going ? <RsvpQuestions form={form} idPrefix={id} askPartyNames={content.askPartyNames} fieldClassName="cl-field" /> : null}
              <div>
                <label htmlFor={`${id}-note`}>A note for the family (optional)</label>
                <textarea id={`${id}-note`} className="cl-field" rows={3} maxLength={500} value={form.values.message ?? ""} onChange={(e) => form.set("message", e.target.value)} />
              </div>
              {form.error ? (
                <p className="cl-error" role="alert">
                  {form.error}
                </p>
              ) : null}
              <button type="submit" className="cl-btn cl-btn--block" disabled={form.state === "submitting" || editorPreview} title={editorPreview ? "Guests can reply once your site is published" : undefined}>
                {form.state === "submitting" ? "Sending…" : customValue(content, "rsvpButton") || "Send our reply"}
              </button>
              {editorPreview ? <p className="cl-small">Preview only. Guests can reply once your site is published.</p> : null}
            </form>
          )}
        </>
      )}
    </div>
  );
}
