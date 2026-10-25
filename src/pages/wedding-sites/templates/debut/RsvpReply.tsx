import { useEffect, useId, useRef, useState } from "react";
import type { EventContent } from "../../content/types";
import { customValue } from "../../content/custom";
import { useRsvpForm } from "../../spec/runtime/useRsvpForm";
import RsvpQuestions from "../shared/RsvpQuestions";
import { Flourish, Paper, PetalShower } from "./art";
import { firstNames } from "./content";

// The reply card, in the language of a printed invitation: "Joyfully accepts"
// or "Regretfully declines", how many are coming, the hosts' own questions
// and a note. Posts to the shared RSVP endpoint (useRsvpForm); a yes ends in
// a shower of rose petals.

export default function RsvpReply({ content, editorPreview, reveal, motion }: { content: EventContent; editorPreview: boolean; reveal: boolean; motion: boolean }) {
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(!reveal);
  const [done, setDone] = useState(false);
  const [petals, setPetals] = useState(0);
  const form = useRsvpForm(content, editorPreview, { asksAttending: true });
  const id = useId();
  const first = firstNames(content);
  const title = customValue(content, "rsvpTitle") || "Kindly Reply";
  const thanks = customValue(content, "thankYou") || "We can’t wait to celebrate with you.";

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
    if (form.state !== "success") return;
    setDone(true);
    if (form.attending === "yes" && motion) setPetals((n) => n + 1);
  }, [form.state, form.attending, motion]);

  const going = form.values.attending === "yes";
  const choose = (v: "yes" | "no") => {
    form.set("attending", v);
    form.set("guests", v === "no" ? "0" : form.values.guests && form.values.guests !== "0" ? form.values.guests : "1");
  };
  const counts = Array.from({ length: Math.min(form.maxGuests, 6) }, (_, i) => i + 1);

  return (
    <section id="rsvp" ref={ref} className={`db-sec db-rsvp${shown ? " is-on" : ""}`}>
      {petals ? <PetalShower key={petals} /> : null}
      <Paper edge="plain" className="db-reply" seed={30}>
        {done ? (
          <div className="db-done" role="status">
            <h2 className="db-script db-sec__title">{form.attending === "no" ? "You’ll Be Missed" : "Thank You"}</h2>
            <Flourish className="db-sec__flourish" />
            <p className="db-text">{form.attending === "no" ? `Thank you for letting ${first || "us"} know.` : thanks}</p>
            {form.copyNote ? <p className="db-small">{form.copyNote}</p> : null}
            <button type="button" className="db-btn db-btn--line" onClick={() => setDone(false)}>
              Change my reply
            </button>
          </div>
        ) : (
          <>
            <h2 className="db-script db-sec__title">{title}</h2>
            <Flourish className="db-sec__flourish" />
            {form.replyBy ? <p className="db-small">{form.replyBy}</p> : null}
            {form.closed ? (
              <p className="db-text" role="status">
                {form.closedText}
              </p>
            ) : (
              <form className="db-form" onSubmit={form.submit} noValidate>
                {/* Spam trap: real guests never see or fill this. */}
                <input type="text" name="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => form.setWebsite(e.target.value)} style={{ position: "absolute", left: -9999, width: 1, height: 1, opacity: 0 }} aria-hidden />

                <div>
                  <label htmlFor={`${id}-name`}>Your name</label>
                  <input id={`${id}-name`} className="db-field" type="text" autoComplete="name" autoCapitalize="words" enterKeyHint="next" placeholder="First and last name" value={form.values.name ?? ""} onChange={(e) => form.set("name", e.target.value)} />
                </div>

                <div className="db-choice" role="group" aria-label="Will you attend?">
                  <button type="button" className={`db-choice__opt${going ? " is-picked" : ""}`} aria-pressed={going} onClick={() => choose("yes")}>
                    <span className="db-tick" aria-hidden />
                    Joyfully accepts
                  </button>
                  <button type="button" className={`db-choice__opt${form.values.attending === "no" ? " is-picked" : ""}`} aria-pressed={form.values.attending === "no"} onClick={() => choose("no")}>
                    <span className="db-tick" aria-hidden />
                    Regretfully declines
                  </button>
                </div>

                <div>
                  <label htmlFor={`${id}-contact`}>{form.contactMode === "mobile" ? "Mobile number" : "Email"}</label>
                  <input id={`${id}-contact`} className="db-field" {...form.contactProps} autoCapitalize="none" autoCorrect="off" spellCheck={false} enterKeyHint="next" value={form.values.contact ?? ""} onChange={(e) => form.set("contact", e.target.value)} />
                  <button type="button" className="db-link" onClick={() => form.toggleContact(`${id}-contact`)}>
                    {form.contactToggleLabel}
                  </button>
                </div>

                {going ? (
                  <div>
                    <label htmlFor={`${id}-guests`}>Number attending, including you</label>
                    <div className="db-count" id={`${id}-guests`} role="radiogroup" aria-label="Number attending">
                      {counts.map((n) => (
                        <button key={n} type="button" role="radio" aria-checked={(form.values.guests ?? "1") === String(n)} className={`db-count__n${(form.values.guests ?? "1") === String(n) ? " is-picked" : ""}`} onClick={() => form.set("guests", String(n))}>
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                {going ? <RsvpQuestions form={form} idPrefix={id} askPartyNames={content.askPartyNames} fieldClassName="db-field" /> : null}

                <div>
                  <label htmlFor={`${id}-note`}>A message for {first || "the debutante"} (optional)</label>
                  <textarea id={`${id}-note`} className="db-field" rows={3} maxLength={500} placeholder="Your wishes…" value={form.values.message ?? ""} onChange={(e) => form.set("message", e.target.value)} />
                </div>

                {form.error ? (
                  <p className="db-error" role="alert">
                    {form.error}
                  </p>
                ) : null}
                <button type="submit" className="db-btn db-btn--solid db-btn--wide" disabled={form.state === "submitting" || editorPreview} title={editorPreview ? "Guests can reply once your site is published" : undefined}>
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
