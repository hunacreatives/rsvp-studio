import { useEffect, useId, useState, type ReactNode } from "react";
import type { EventContent } from "../../content/types";
import { customValue } from "../../content/custom";
import { useRsvpForm } from "../../spec/runtime/useRsvpForm";
import RsvpQuestions from "../shared/RsvpQuestions";
import { Field } from "../shared/siteEdit";

// The reply, filled in on the scorecard: the player's name, I'm in or Can't, then (once they've
// picked) how to reach them, how many are playing, the host's own questions and a note, and the
// SEND stamp. The words shrink to the card as it fills (the template fits every surface).

// inline, so the site's phone rule (typeable fields 16px) doesn't shrink the handwriting
const LINE = { fontSize: "calc(52 * var(--u))" } as const;
const FIELD_STYLE = { fontSize: "calc(44 * var(--u))", fontFamily: '"Caveat", cursive', fontWeight: 700, color: "#1d3a7a" } as const;

export default function RsvpCard({ content, editorPreview, sample, host, credit }: { content: EventContent; editorPreview: boolean; sample: boolean; host: string; credit?: ReactNode }) {
  const form = useRsvpForm(content, editorPreview, { asksAttending: true });
  const [done, setDone] = useState(false);
  const id = useId();
  const going = form.values.attending === "yes";
  const open = editorPreview || !!form.values.attending;
  const seats = Number(form.values.guests ?? 1) || 1;
  const reserved = form.invitee?.seatLimit && form.invitee.seats ? form.invitee.seats : sample ? 2 : 0;
  const first = (form.values.name ?? "").trim().split(/\s+/)[0] ?? "";

  useEffect(() => {
    if (form.state === "success") setDone(true);
  }, [form.state]);

  const choose = (v: "yes" | "no") => {
    form.set("attending", v);
    form.set("guests", v === "no" ? "0" : String(Math.max(1, seats)));
  };
  const setSeats = (n: number) => form.set("guests", String(Math.min(form.maxGuests, Math.max(1, n))));
  const title = <Field as="h2" className="h" path="custom.rsvpTitle" value={customValue(content, "rsvpTitle")} fallback="Scorecard" placeholder="" editor={editorPreview} />;

  if (done)
    return (
      <div className="pc-in" role="status">
        {title}
        <p className="done">{form.attending === "no" ? `We’ll miss you${first ? `, ${first}` : ""}.` : `See you on court${first ? `, ${first}` : ""}!`}</p>
        <p className="small">{form.attending === "no" ? "Thank you for letting us know." : customValue(content, "thankYou") || "Your spot on the court is saved."}</p>
        {form.copyNote ? <p className="small">{form.copyNote}</p> : null}
        <button type="button" className="again" onClick={() => setDone(false)}>
          Change my reply
        </button>
        {credit}
      </div>
    );

  return (
    <div className="pc-in">
      {title}
      {form.replyBy ? <p className="sub">{form.replyBy}</p> : null}
      {reserved && !form.closed ? <p className="small">We’ve saved {reserved} {reserved === 1 ? "spot" : "spots"} for you.</p> : null}
      {form.closed ? (
        <p className="sub" role="status" style={{ marginTop: "calc(40 * var(--u))" }}>
          {form.closedText}
        </p>
      ) : (
        <form onSubmit={form.submit} noValidate autoComplete="on">
          <input type="text" name="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => form.setWebsite(e.target.value)} style={{ position: "absolute", left: -9999, width: 1, height: 1, opacity: 0 }} aria-hidden />
          <label htmlFor={`${id}-name`}>Player</label>
          <input id={`${id}-name`} className="line" style={LINE} type="text" autoComplete="name" autoCapitalize="words" enterKeyHint="next" maxLength={80} value={form.values.name ?? ""} onChange={(e) => form.set("name", e.target.value)} />
          <div className="yn" role="group" aria-label="Will you come?">
            <button type="button" className={form.values.attending === "no" ? "dim" : undefined} aria-pressed={going} onClick={() => choose("yes")}>
              I’m in
            </button>
            <button type="button" className={going ? "dim" : undefined} aria-pressed={form.values.attending === "no"} onClick={() => choose("no")}>
              Can’t
            </button>
          </div>
          {open ? (
            <>
              <label htmlFor={`${id}-contact`}>{form.contactMode === "mobile" ? "Mobile number" : "Email"}</label>
              <input id={`${id}-contact`} className="line" style={LINE} {...form.contactProps} placeholder="" autoCapitalize="none" autoCorrect="off" spellCheck={false} enterKeyHint="next" value={form.values.contact ?? ""} onChange={(e) => form.set("contact", e.target.value)} />
              {going || editorPreview ? (
                <div className="seats">
                  <span>Players</span>
                  <span>
                    <button type="button" aria-label="One player fewer" disabled={seats <= 1} onClick={() => setSeats(seats - 1)}>
                      −
                    </button>
                    <output aria-live="polite">{seats}</output>
                    <button type="button" aria-label="One player more" disabled={seats >= form.maxGuests} onClick={() => setSeats(seats + 1)}>
                      +
                    </button>
                  </span>
                </div>
              ) : null}
              {going ? <RsvpQuestions form={form} idPrefix={id} askPartyNames={content.askPartyNames} fieldClassName="line" fieldStyle={FIELD_STYLE} /> : null}
              <label htmlFor={`${id}-msg`}>A note for {host || "the host"} (optional)</label>
              <textarea id={`${id}-msg`} className="line" style={LINE} rows={2} maxLength={400} value={form.values.message ?? ""} onChange={(e) => form.set("message", e.target.value)} />
            </>
          ) : null}
          {form.error ? (
            <p className="err" role="alert">
              {form.error}
            </p>
          ) : null}
          <button type="submit" className="send" disabled={form.state === "submitting" || editorPreview} title={editorPreview ? "Guests can reply once your site is published" : undefined}>
            {form.state === "submitting" ? "Sending" : customValue(content, "rsvpButton") || "Send"}
          </button>
          {editorPreview ? <p className="small">Preview only. Guests can reply once your site is published.</p> : null}
        </form>
      )}
      {credit}
    </div>
  );
}
