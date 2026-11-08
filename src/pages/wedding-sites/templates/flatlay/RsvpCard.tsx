import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import type { EventContent } from "../../content/types";
import { customValue } from "../../content/custom";
import { useRsvpForm } from "../../spec/runtime/useRsvpForm";
import RsvpQuestions from "../shared/RsvpQuestions";
import { Field } from "../shared/siteEdit";

// The reply, painted on the court: lines to write your name on, and two painted boxes, IN and
// OUT. Picking one sends the ball into it (court.ts); the chosen box is filled and underlined,
// the other fades. Then how many are coming, the host's own questions and a note.

export default function RsvpCard({ content, editorPreview, sample, name, onPick, onLayout }: { content: EventContent; editorPreview: boolean; sample: boolean; name: string; onPick: (box: HTMLElement) => void; /** the card changed shape (sent, reopened): the court re-places the ball */ onLayout: () => void }) {
  const form = useRsvpForm(content, editorPreview, { asksAttending: true });
  const [done, setDone] = useState(false);
  const id = useId();
  const going = form.values.attending === "yes";
  const out = form.values.attending === "no";
  const seats = Number(form.values.guests ?? 1) || 1;
  const reserved = form.invitee?.seatLimit && form.invitee.seats ? form.invitee.seats : sample ? 2 : 0;
  const first = name.split(/\s*[&,]\s*|\s+/)[0] || "";

  useEffect(() => {
    if (form.state === "success") setDone(true);
  }, [form.state]);
  // the stop keeps the height the form gave it once the reply is sent, so the page doesn't shrink
  // under the guest (the phone's snap marks would leave a blank strip past the court's end)
  const mark = useRef<HTMLSpanElement>(null);
  const tall = useRef(0);
  useLayoutEffect(() => {
    const stop = mark.current?.closest<HTMLElement>("[data-stop]");
    if (!stop) return;
    if (!done) {
      stop.style.minHeight = "";
      tall.current = stop.offsetHeight;
    } else if (tall.current) stop.style.minHeight = `${tall.current}px`;
  });
  useLayoutEffect(() => {
    onLayout();
    // only when the card swaps between the form and the thank-you
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  const choose = (v: "yes" | "no", el: HTMLElement) => {
    form.set("attending", v);
    form.set("guests", v === "no" ? "0" : String(Math.max(1, seats)));
    onPick(el);
  };
  const setSeats = (n: number) => form.set("guests", String(Math.min(form.maxGuests, Math.max(1, n))));

  if (done)
    return (
      <div role="status">
        <span ref={mark} hidden />
        <h2 className="fl-thanks fl-stencil fl-paint">{form.attending === "no" ? "We’ll miss you" : "See you on the court"}</h2>
        <p className="fl-body fl-paint">{form.attending === "no" ? "Thank you for letting us know." : customValue(content, "thankYou") || `Your reply is in.${first ? ` ${first} will see it right away.` : ""}`}</p>
        {form.copyNote ? <p className="fl-small" style={{ marginTop: 10 }}>{form.copyNote}</p> : null}
        <button type="button" className="fl-again" onClick={() => setDone(false)}>
          Change my reply
        </button>
      </div>
    );

  return (
    <>
      <span ref={mark} hidden />
      <Field as="h2" className="fl-h2 fl-stencil fl-paint" path="custom.rsvpTitle" value={customValue(content, "rsvpTitle")} fallback="Are you in?" placeholder="" editor={editorPreview} />
      <p className="fl-body fl-paint">{form.replyBy ?? (first ? `Let ${first} know if you’re coming.` : "Let us know if you’re coming.")}</p>
      {reserved ? <p className="fl-small" style={{ marginTop: 8 }}>{`We’ve saved ${reserved} ${reserved === 1 ? "spot" : "spots"} on court for you.`}</p> : null}
      {form.closed ? (
        <p className="fl-body fl-paint" role="status">
          {form.closedText}
        </p>
      ) : (
        <form className="fl-form" onSubmit={form.submit} noValidate>
          <input type="text" name="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => form.setWebsite(e.target.value)} style={{ position: "absolute", left: -9999, width: 1, height: 1, opacity: 0 }} aria-hidden />
          <div className="fl-field">
            <label htmlFor={`${id}-name`}>Your name</label>
            <input id={`${id}-name`} className="fl-input" type="text" autoComplete="name" autoCapitalize="words" enterKeyHint="next" placeholder="Type it here" value={form.values.name ?? ""} onChange={(e) => form.set("name", e.target.value)} />
          </div>
          <div className="fl-field">
            <label htmlFor={`${id}-contact`}>{form.contactMode === "mobile" ? "Mobile number" : "Email"}</label>
            <input id={`${id}-contact`} className="fl-input" {...form.contactProps} autoCapitalize="none" autoCorrect="off" spellCheck={false} enterKeyHint="next" value={form.values.contact ?? ""} onChange={(e) => form.set("contact", e.target.value)} />
          </div>
          <div className={`fl-boxes${going || out ? " is-chosen" : ""}`} role="group" aria-label="Are you coming?">
            <button type="button" className="fl-box" aria-pressed={going} onClick={(e) => choose("yes", e.currentTarget)}>
              <b className="fl-paint">In</b>
            </button>
            <button type="button" className="fl-box" aria-pressed={out} onClick={(e) => choose("no", e.currentTarget)}>
              <b className="fl-paint">Out</b>
            </button>
          </div>
          {going || editorPreview ? (
            <div className="fl-seats">
              <span className="fl-lab">How many of you</span>
              <span className="fl-seats__ctrl">
                <button type="button" aria-label="One fewer" disabled={seats <= 1} onClick={() => setSeats(seats - 1)}>
                  −
                </button>
                <output aria-live="polite">{seats}</output>
                <button type="button" aria-label="One more" disabled={seats >= form.maxGuests} onClick={() => setSeats(seats + 1)}>
                  +
                </button>
              </span>
            </div>
          ) : null}
          {going ? <RsvpQuestions form={form} idPrefix={id} askPartyNames={content.askPartyNames} fieldClassName="fl-input" fieldStyle={{ fontSize: undefined }} /> : null}
          <div className="fl-field">
            <label htmlFor={`${id}-msg`}>{first ? `Note for ${first}` : "A note for the host"}</label>
            <textarea id={`${id}-msg`} className="fl-input" rows={2} maxLength={400} placeholder="Optional" value={form.values.message ?? ""} onChange={(e) => form.set("message", e.target.value)} />
          </div>
          {form.error ? (
            <p className="fl-error" role="alert">
              {form.error}
            </p>
          ) : null}
          <button type="submit" className="fl-send" disabled={form.state === "submitting" || editorPreview} title={editorPreview ? "Guests can reply once your site is published" : undefined}>
            {form.state === "submitting" ? "Sending…" : customValue(content, "rsvpButton") || "Send reply"}
          </button>
          {editorPreview ? <p className="fl-small">Preview only. Guests can reply once your site is published.</p> : null}
        </form>
      )}
    </>
  );
}
