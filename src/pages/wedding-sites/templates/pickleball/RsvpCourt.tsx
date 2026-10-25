import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { EventContent } from "../../content/types";
import { customValue } from "../../content/custom";
import { useRsvpForm } from "../../spec/runtime/useRsvpForm";
import RsvpQuestions from "../shared/RsvpQuestions";
import { Ball } from "./art";
import { hostNames, isPlural } from "./content";

// The RSVP panel: "Are you in?" as two big choices, how many are coming,
// the hosts' own questions and a note. Posts to our shared RSVP endpoint
// (useRsvpForm). A yes ends in a burst of pickleballs.

/** Pickleballs flying out of the card: random angles, spins and sizes, made once. */
function Burst() {
  const balls = useMemo(
    () =>
      Array.from({ length: 22 }, (_, i) => {
        const angle = (-160 + Math.random() * 140) * (Math.PI / 180);
        const dist = 120 + Math.random() * 220;
        return {
          i,
          size: 14 + Math.random() * 18,
          dx: Math.cos(angle) * dist,
          dy: Math.sin(angle) * dist,
          rot: (Math.random() < 0.5 ? -1 : 1) * (180 + Math.random() * 360),
          delay: Math.random() * 0.12,
        };
      }),
    [],
  );
  return (
    <div className="pb-burst" aria-hidden>
      {balls.map((b) => (
        <span
          key={b.i}
          style={{ ["--dx" as string]: `${b.dx}px`, ["--dy" as string]: `${b.dy}px`, ["--rot" as string]: `${b.rot}deg`, animationDelay: `${b.delay}s`, ...(b.i % 2 ? { ["--pb-ink" as string]: "var(--pb-pink)" } : {}) }}
        >
          <Ball size={b.size * 1.5} />
        </span>
      ))}
    </div>
  );
}

export default function RsvpCourt({ content, editorPreview, reveal, motion }: { content: EventContent; editorPreview: boolean; reveal: boolean; motion: boolean }) {
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(!reveal);
  const [done, setDone] = useState(false);
  const [burst, setBurst] = useState(0);
  const form = useRsvpForm(content, editorPreview, { asksAttending: true });
  const id = useId();
  const plural = isPlural(content);
  const names = hostNames(content);
  const title = customValue(content, "rsvpTitle") || "Are You In?";
  const thanks = customValue(content, "thankYou") || "Game on! See you on the court.";

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
      { threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [reveal]);

  useEffect(() => {
    if (form.state !== "success") return;
    setDone(true);
    if (form.attending === "yes" && motion) setBurst((n) => n + 1);
  }, [form.state, form.attending, motion]);

  const going = form.values.attending === "yes";
  const choose = (v: "yes" | "no") => {
    form.set("attending", v);
    form.set("guests", v === "no" ? "0" : form.values.guests && form.values.guests !== "0" ? form.values.guests : "1");
  };
  const counts = Array.from({ length: Math.min(form.maxGuests, 6) }, (_, i) => i + 1);

  return (
    <section id="rsvp" ref={ref} className={`pb-c pb-rsvp${shown ? " is-on" : ""}`}>
      {burst ? <Burst key={burst} /> : null}
      <div>
        {done ? (
          <div className="pb-done" role="status">
            <div className="pb-done__ball">
              <Ball size={96} spin />
            </div>
            <h2 className="pb-serif pb-c__title">{form.attending === "no" ? "We’ll Miss You" : "You’re In!"}</h2>
            <p className="pb-text">{form.attending === "no" ? `Thank you for letting ${plural ? "us" : names || "us"} know.` : thanks}</p>
            {form.copyNote ? <p className="pb-small">{form.copyNote}</p> : null}
            <button type="button" className="pb-btn pb-btn--line" onClick={() => setDone(false)}>
              Change my reply
            </button>
          </div>
        ) : (
          <>
            <p className="pb-kicker">Kindly reply</p>
            <h2 className="pb-serif pb-c__title">{title}</h2>
            {form.replyBy ? <p className="pb-small">{form.replyBy}</p> : null}
            {form.closed ? (
              <p className="pb-text" role="status">
                {form.closedText}
              </p>
            ) : (
              <form className="pb-form" onSubmit={form.submit} noValidate>
                {/* Spam trap: real guests never see or fill this. */}
                <input type="text" name="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => form.setWebsite(e.target.value)} style={{ position: "absolute", left: -9999, width: 1, height: 1, opacity: 0 }} aria-hidden />

                <div className="pb-choice" role="group" aria-label="Can you come?">
                  <button type="button" className={`pb-choice__opt${going ? " is-picked" : ""}`} aria-pressed={going} onClick={() => choose("yes")}>
                    <Ball size={34} />
                    <span>I’m in!</span>
                  </button>
                  <button type="button" className={`pb-choice__opt${form.values.attending === "no" ? " is-picked" : ""}`} aria-pressed={form.values.attending === "no"} onClick={() => choose("no")}>
                    <span>Sitting this one out</span>
                  </button>
                </div>

                <div>
                  <label htmlFor={`${id}-name`}>Your name</label>
                  <input id={`${id}-name`} className="pb-field" type="text" autoComplete="name" autoCapitalize="words" enterKeyHint="next" placeholder="First and last name" value={form.values.name ?? ""} onChange={(e) => form.set("name", e.target.value)} />
                </div>
                <div>
                  <label htmlFor={`${id}-contact`}>{form.contactMode === "mobile" ? "Mobile number" : "Email"}</label>
                  <input id={`${id}-contact`} className="pb-field" {...form.contactProps} autoCapitalize="none" autoCorrect="off" spellCheck={false} enterKeyHint="next" value={form.values.contact ?? ""} onChange={(e) => form.set("contact", e.target.value)} />
                  <button type="button" className="pb-link" onClick={() => form.toggleContact(`${id}-contact`)}>
                    {form.contactToggleLabel}
                  </button>
                </div>

                {going ? (
                  <div>
                    <label htmlFor={`${id}-guests`}>How many are coming, including you?</label>
                    <div className="pb-count" id={`${id}-guests`} role="radiogroup" aria-label="How many are coming">
                      {counts.map((n) => (
                        <button key={n} type="button" role="radio" aria-checked={(form.values.guests ?? "1") === String(n)} className={`pb-count__n${(form.values.guests ?? "1") === String(n) ? " is-picked" : ""}`} onClick={() => form.set("guests", String(n))}>
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                {going ? <RsvpQuestions form={form} idPrefix={id} askPartyNames={content.askPartyNames} fieldClassName="pb-field" /> : null}

                <div>
                  <label htmlFor={`${id}-note`}>A note for {names || "the host"} (optional)</label>
                  <textarea id={`${id}-note`} className="pb-field" rows={3} maxLength={500} placeholder="Trash talk welcome." value={form.values.message ?? ""} onChange={(e) => form.set("message", e.target.value)} />
                </div>

                {form.error ? (
                  <p className="pb-error" role="alert">
                    {form.error}
                  </p>
                ) : null}
                <button type="submit" className="pb-btn pb-btn--solid pb-btn--wide" disabled={form.state === "submitting" || editorPreview} title={editorPreview ? "Guests can reply once your site is published" : undefined}>
                  {form.state === "submitting" ? "Sending…" : "Send my RSVP"}
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </section>
  );
}
