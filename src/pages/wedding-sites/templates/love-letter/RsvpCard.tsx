import { useEffect, useId, useRef, useState } from "react";
import type { EventContent } from "../../content/types";
import { customValue } from "../../content/custom";
import { useRsvpForm } from "../../spec/runtime/useRsvpForm";
import RsvpQuestions from "../shared/RsvpQuestions";
import { Paper } from "../shared/stationery";
import { Sprig } from "./art";
import { coupleNames } from "./content";

// The printed reply card: writing lines, tick circles for "Joyfully accepts /
// Regretfully declines", how many are coming, the couple's own questions and a
// note. Posts to the shared RSVP endpoint (useRsvpForm).

export default function RsvpCard({ content, editorPreview, reveal }: { content: EventContent; editorPreview: boolean; reveal: boolean }) {
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(!reveal);
  const [done, setDone] = useState(false);
  const form = useRsvpForm(content, editorPreview, { asksAttending: true });
  const id = useId();
  const couple = coupleNames(content);
  const title = customValue(content, "rsvpTitle") || "Kindly Reply";
  const thanks = customValue(content, "thankYou") || "Thank you. We can’t wait to celebrate with you.";

  useEffect(() => {
    if (!reveal) return setShown(true);
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.1 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [reveal]);

  useEffect(() => {
    if (form.state === "success") setDone(true);
  }, [form.state]);

  const going = form.values.attending === "yes";
  const choose = (v: "yes" | "no") => {
    form.set("attending", v);
    form.set("guests", v === "no" ? "0" : form.values.guests && form.values.guests !== "0" ? form.values.guests : "1");
  };
  const counts = Array.from({ length: Math.min(form.maxGuests, 6) }, (_, i) => i + 1);

  return (
    <section id="rsvp" ref={ref} className={`ll-block ll-rsvp${shown ? " is-on" : ""}`}>
      <Paper edge="plain" className="ll-reply" seed={41}>
        {done ? (
          <div className="ll-done" role="status">
            <h2 className="ll-script ll-block__title">{form.attending === "no" ? "You’ll Be Missed" : "Thank You"}</h2>
            <Sprig />
            <p className="ll-text">{form.attending === "no" ? `Thank you for letting ${couple || "us"} know.` : thanks}</p>
            {form.emailed ? <p className="ll-text ll-text--soft">A copy is on its way to your email.</p> : null}
            <button type="button" className="ll-btn ll-btn--line" onClick={() => setDone(false)}>
              Change my reply
            </button>
          </div>
        ) : (
          <>
            <h2 className="ll-script ll-block__title">{title}</h2>
            <Sprig />
            {form.replyBy ? <p className="ll-text ll-text--soft">{form.replyBy}</p> : null}
            {form.closed ? (
              <p className="ll-text" role="status">
                {form.closedText}
              </p>
            ) : (
              <form className="ll-form" onSubmit={form.submit} noValidate>
                <input type="text" name="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => form.setWebsite(e.target.value)} style={{ position: "absolute", left: -9999, width: 1, height: 1, opacity: 0 }} aria-hidden />
                <div>
                  <label htmlFor={`${id}-name`}>Your name</label>
                  <input id={`${id}-name`} className="ll-field" type="text" autoComplete="name" autoCapitalize="words" placeholder="First and last name" value={form.values.name ?? ""} onChange={(e) => form.set("name", e.target.value)} />
                </div>
                <div className="ll-choice" role="group" aria-label="Will you attend?">
                  <button type="button" className={`ll-choice__opt${going ? " is-picked" : ""}`} aria-pressed={going} onClick={() => choose("yes")}>
                    <span className="ll-tick" aria-hidden />
                    Joyfully accepts
                  </button>
                  <button type="button" className={`ll-choice__opt${form.values.attending === "no" ? " is-picked" : ""}`} aria-pressed={form.values.attending === "no"} onClick={() => choose("no")}>
                    <span className="ll-tick" aria-hidden />
                    Regretfully declines
                  </button>
                </div>
                <div>
                  <label htmlFor={`${id}-contact`}>{form.contactMode === "mobile" ? "Mobile number" : "Email"}</label>
                  <input id={`${id}-contact`} className="ll-field" {...form.contactProps} autoCapitalize="none" autoCorrect="off" spellCheck={false} value={form.values.contact ?? ""} onChange={(e) => form.set("contact", e.target.value)} />
                  <button type="button" className="ll-link" onClick={() => form.toggleContact(`${id}-contact`)}>
                    {form.contactToggleLabel}
                  </button>
                </div>
                {going ? (
                  <div>
                    <label htmlFor={`${id}-guests`}>Number attending, including you</label>
                    <div className="ll-count2" id={`${id}-guests`} role="radiogroup" aria-label="Number attending">
                      {counts.map((n) => (
                        <button key={n} type="button" role="radio" aria-checked={(form.values.guests ?? "1") === String(n)} className={`ll-count2__n${(form.values.guests ?? "1") === String(n) ? " is-picked" : ""}`} onClick={() => form.set("guests", String(n))}>
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
                {going ? <RsvpQuestions form={form} idPrefix={id} askPartyNames={content.askPartyNames} fieldClassName="ll-field" /> : null}
                <div>
                  <label htmlFor={`${id}-note`}>A note for {couple || "the couple"} (optional)</label>
                  <textarea id={`${id}-note`} className="ll-field" rows={3} maxLength={500} placeholder="Your wishes…" value={form.values.message ?? ""} onChange={(e) => form.set("message", e.target.value)} />
                </div>
                {form.error ? (
                  <p className="ll-error" role="alert">
                    {form.error}
                  </p>
                ) : null}
                <button type="submit" className="ll-btn ll-btn--wide" disabled={form.state === "submitting" || editorPreview} title={editorPreview ? "Guests can reply once your site is published" : undefined}>
                  {form.state === "submitting" ? "Sending…" : "Send my reply"}
                </button>
              </form>
            )}
          </>
        )}
      </Paper>
    </section>
  );
}
