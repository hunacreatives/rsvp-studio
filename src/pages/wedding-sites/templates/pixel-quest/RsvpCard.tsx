import { useEffect, useId, useState, type ReactNode } from "react";
import type { EventContent } from "../../content/types";
import { customValue } from "../../content/custom";
import { useRsvpForm } from "../../spec/runtime/useRsvpForm";
import RsvpQuestions from "../shared/RsvpQuestions";
import { Field } from "../shared/siteEdit";
import { ICON_CAKE } from "./art";
import { Pix } from "./Pix";

// The reply, the final stage: A to come, B to send regrets, the name entered like a high
// score, how many players, the host's own questions and an optional note. A "yes" clears the
// stage (and, on the live page, sets off fireworks over the cake).

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
  const who = (form.values.name ?? "").trim().split(/\s+/)[0] || "You";

  return (
    <div>
      <div className="pq-head">
        <Pix rows={ICON_CAKE} className="pq-face" />
        {done ? (
          <h2 className="pq-h2">{form.attending === "no" ? "Maybe next time" : "Stage clear"}</h2>
        ) : (
          <Field as="h2" className="pq-h2" path="custom.rsvpTitle" value={customValue(content, "rsvpTitle")} fallback="Join the party?" placeholder="" editor={editorPreview} />
        )}
      </div>
      {done ? (
        <div role="status">
          {form.attending === "no" ? (
            <p className="pq-p">Thank you for letting us know.</p>
          ) : (
            <>
              <div className="pq-score">
                <p className="pq-scorehd">New high score</p>
                <p className="pq-scorerow">
                  <span>1UP</span>
                  <b>{who}</b>
                  <span>+5000</span>
                </p>
              </div>
              <p className="pq-p">{customValue(content, "thankYou") || "See you at the party."}</p>
            </>
          )}
          {form.copyNote ? <p className="pq-small">{form.copyNote}</p> : null}
          <button type="button" className="pq-btn pq-btn--ghost" onClick={() => setDone(false)}>
            Change my reply
          </button>
        </div>
      ) : (
        <>
          {form.replyBy ? <p className="pq-line">{form.replyBy}</p> : null}
          {reserved ? <p className="pq-small">We’ve saved {reserved} {reserved === 1 ? "spot" : "spots"} for your party.</p> : null}
          {form.closed ? (
            <p className="pq-small" role="status">
              {form.closedText}
            </p>
          ) : (
            <form className="pq-form" onSubmit={form.submit} noValidate>
              <input type="text" name="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => form.setWebsite(e.target.value)} style={{ position: "absolute", left: -9999, width: 1, height: 1, opacity: 0 }} aria-hidden />
              <div className="pq-acts" role="group" aria-label="Will you come?">
                <button type="button" className={`pq-act a${going ? " is-on" : ""}`} aria-pressed={going} onClick={() => choose("yes")}>
                  <i aria-hidden>A</i>I’ll be there
                </button>
                <button type="button" className={`pq-act b${form.values.attending === "no" ? " is-on" : ""}`} aria-pressed={form.values.attending === "no"} onClick={() => choose("no")}>
                  <i aria-hidden>B</i>Can’t make it
                </button>
              </div>
              <div className="pq-pair">
                <div>
                  <label htmlFor={`${id}-name`}>Enter your name</label>
                  <input id={`${id}-name`} className="pq-field" type="text" autoComplete="name" autoCapitalize="words" enterKeyHint="next" value={form.values.name ?? ""} onChange={(e) => form.set("name", e.target.value)} />
                </div>
                <div>
                  <label htmlFor={`${id}-contact`}>{form.contactMode === "mobile" ? "Mobile number" : "Email"}</label>
                  <input id={`${id}-contact`} className="pq-field" {...form.contactProps} autoCapitalize="none" autoCorrect="off" spellCheck={false} enterKeyHint="next" value={form.values.contact ?? ""} onChange={(e) => form.set("contact", e.target.value)} />
                  <button type="button" className="pq-link" onClick={() => form.toggleContact(`${id}-contact`)}>
                    {form.contactToggleLabel}
                  </button>
                </div>
              </div>
              {going ? (
                <div className="pq-seats">
                  <span>Players</span>
                  <span className="pq-seats__ctrl">
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
              {going ? <RsvpQuestions form={form} idPrefix={id} askPartyNames={content.askPartyNames} fieldClassName="pq-field" /> : null}
              <label htmlFor={`${id}-msg`}>A note for the hosts (optional)</label>
              <textarea id={`${id}-msg`} className="pq-field" rows={3} maxLength={400} value={form.values.message ?? ""} onChange={(e) => form.set("message", e.target.value)} />
              {form.error ? (
                <p className="pq-error" role="alert">
                  {form.error}
                </p>
              ) : null}
              <button type="submit" className="pq-send" disabled={form.state === "submitting" || editorPreview} title={editorPreview ? "Guests can reply once your site is published" : undefined}>
                {form.state === "submitting" ? "Sending…" : customValue(content, "rsvpButton") || "Send reply"}
              </button>
              {editorPreview ? <p className="pq-small">Preview only. Guests can reply once your site is published.</p> : null}
            </form>
          )}
        </>
      )}
      {credit}
    </div>
  );
}
