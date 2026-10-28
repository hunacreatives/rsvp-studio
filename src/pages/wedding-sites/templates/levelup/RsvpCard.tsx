import { useEffect, useId, useState, type ReactNode } from "react";
import type { EventContent } from "../../content/types";
import { customValue } from "../../content/custom";
import { useRsvpForm } from "../../spec/runtime/useRsvpForm";
import RsvpQuestions from "../shared/RsvpQuestions";
import { Field } from "../shared/siteEdit";

// The reply, the final quest: accept or decline, how many, the host's own questions and an
// optional note; sending it unlocks an achievement (and, on the live page, confetti).

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

  return (
    <div>
      {done ? (
        <div role="status">
          <h2 className="lu-h2">{form.attending === "no" ? "Maybe next time" : "Quest accepted"}</h2>
          {form.attending === "no" ? (
            <p className="lu-small">Thank you for letting us know.</p>
          ) : (
            <div className="lu-ach">
              <span className="lu-star" aria-hidden>★</span>
              <div>
                <b>+100 XP</b>
                <p className="lu-small" style={{ marginTop: 2 }}>{customValue(content, "thankYou") || "See you at the party."}</p>
              </div>
            </div>
          )}
          {form.copyNote ? <p className="lu-small">{form.copyNote}</p> : null}
          <button type="button" className="lu-again" style={{ marginTop: 18 }} onClick={() => setDone(false)}>
            Change my reply
          </button>
        </div>
      ) : (
        <>
          <Field as="h2" className="lu-h2" path="custom.rsvpTitle" value={customValue(content, "rsvpTitle")} fallback="Join the party?" placeholder="" editor={editorPreview} />
          <p className="lu-qline">{[form.replyBy, "Reward +100 XP"].filter(Boolean).join(" · ")}</p>
          {reserved ? <p className="lu-small">We’ve saved {reserved} {reserved === 1 ? "spot" : "spots"} in your party.</p> : null}
          {form.closed ? (
            <p className="lu-small" role="status">
              {form.closedText}
            </p>
          ) : (
            <form className="lu-form" onSubmit={form.submit} noValidate>
              <input type="text" name="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => form.setWebsite(e.target.value)} style={{ position: "absolute", left: -9999, width: 1, height: 1, opacity: 0 }} aria-hidden />
              <div className="lu-acts" role="group" aria-label="Will you come?">
                <button type="button" className={`lu-act a${going ? " is-on" : ""}`} aria-pressed={going} onClick={() => choose("yes")}>
                  <i aria-hidden>A</i>Accept quest
                </button>
                <button type="button" className={`lu-act b${form.values.attending === "no" ? " is-on" : ""}`} aria-pressed={form.values.attending === "no"} onClick={() => choose("no")}>
                  <i aria-hidden>B</i>Decline
                </button>
              </div>
              <label htmlFor={`${id}-name`}>Player name</label>
              <input id={`${id}-name`} className="lu-field" type="text" autoComplete="name" autoCapitalize="words" enterKeyHint="next" value={form.values.name ?? ""} onChange={(e) => form.set("name", e.target.value)} />
              <label htmlFor={`${id}-contact`}>{form.contactMode === "mobile" ? "Mobile number" : "Email"}</label>
              <input id={`${id}-contact`} className="lu-field" {...form.contactProps} autoCapitalize="none" autoCorrect="off" spellCheck={false} enterKeyHint="next" value={form.values.contact ?? ""} onChange={(e) => form.set("contact", e.target.value)} />
              <button type="button" className="lu-link" onClick={() => form.toggleContact(`${id}-contact`)}>
                {form.contactToggleLabel}
              </button>
              {going ? (
                <div className="lu-seats">
                  <span>Party size</span>
                  <span className="lu-seats__ctrl">
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
              {going ? <RsvpQuestions form={form} idPrefix={id} askPartyNames={content.askPartyNames} fieldClassName="lu-field" /> : null}
              <label htmlFor={`${id}-msg`}>A note for the hosts (optional)</label>
              <textarea id={`${id}-msg`} className="lu-field" rows={3} maxLength={400} value={form.values.message ?? ""} onChange={(e) => form.set("message", e.target.value)} />
              {form.error ? (
                <p className="lu-error" role="alert">
                  {form.error}
                </p>
              ) : null}
              <button type="submit" className="lu-send" disabled={form.state === "submitting" || editorPreview} title={editorPreview ? "Guests can reply once your site is published" : undefined}>
                {form.state === "submitting" ? "Sending…" : customValue(content, "rsvpButton") || "Send reply"}
              </button>
              {editorPreview ? <p className="lu-small">Preview only. Guests can reply once your site is published.</p> : null}
            </form>
          )}
        </>
      )}
      {credit}
    </div>
  );
}
