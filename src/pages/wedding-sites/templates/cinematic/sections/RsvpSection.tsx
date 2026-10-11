import { useEffect, useId, useRef, useState } from "react";
import type { EventContent } from "../../../content/types";
import { customValue } from "../../../content/custom";
import { useRsvpForm } from "../../../spec/runtime/useRsvpForm";
import { hostNames, isPlural } from "../content";
import { Heart } from "./Heart";

// RSVP.tsx from the reference: the Dress Code note, "Click here to RSVP ♥",
// the frosted "Will You Join Us?" card, the thank-you card, and "With love,".
// Posts to our shared RSVP endpoint. The reference only asked "Will you be
// bringing anyone?"; a "can't make it" answer is added to that same question
// so guests can decline. Email OR mobile, like every RSVP Studio form.

const GUEST_CHOICES = [
  { value: "1", label: "Nope, just me!" },
  { value: "2", label: "Yes, I'm bringing 1 guest" },
  { value: "3", label: "Yes, I'm bringing 2 guests" },
  { value: "no", label: "Sorry, I can't make it" },
];

/** `reveal`: fade in when scrolled to (published page). Otherwise it's simply there. */
export default function RsvpSection({ content, editorPreview, reveal }: { content: EventContent; editorPreview: boolean; reveal: boolean }) {
  const ref = useRef<HTMLElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(!reveal);
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const form = useRsvpForm(content, editorPreview, { asksAttending: true });
  const id = useId();
  const plural = isPlural(content);
  const dress = customValue(content, "dressCode");
  const title = customValue(content, "rsvpTitle") || "Will You Join Us?";
  const note = customValue(content, "rsvpNote") || `${plural ? "We" : "I"} would love to celebrate with you!`;
  const thanks = customValue(content, "thankYou") || `See you on ${plural ? "our" : "my"} special day!`;
  const names = hostNames(content);
  const choice = form.values.attending === "no" ? "no" : form.values.guests ?? "1";

  // Fade in once a fifth of it is on screen.
  useEffect(() => {
    if (!reveal) return setVisible(true);
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [reveal]);

  useEffect(() => {
    if (form.state === "success") setDone(true);
  }, [form.state]);

  const pick = (v: string) => {
    form.set("attending", v === "no" ? "no" : "yes");
    form.set("guests", v === "no" ? "0" : v);
  };
  const openForm = () => {
    if (!form.values.attending) pick("1");
    setOpen(true);
    requestAnimationFrame(() => setTimeout(() => cardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 50));
  };

  return (
    <section id="rsvp" ref={ref} className="cn-rsvp">
      <div className="cn-rsvp__fade" />
      <div className={`cn-rsvp__inner${visible ? " is-on" : ""}`}>
        {!done && (dress || editorPreview) ? (
          <div className={`cn-dress${visible ? " is-on" : ""}`}>
            <p className="cn-script">Dress Code</p>
            <p className={`cn-hand cn-hand--note${dress ? "" : " cn-hint"}`}>{dress || "Add a dress code in this template’s details, or leave it empty to hide it."}</p>
          </div>
        ) : null}

        {!done && !open ? (
          <div style={{ textAlign: "center" }}>
            <button type="button" className="cn-btn" onClick={openForm}>
              <span>Click here to RSVP</span>
              <Heart size={18} fill="currentColor" />
            </button>
          </div>
        ) : null}

        {!done && open ? (
          <div ref={cardRef} className="cn-card cn-card--form">
            <h3>{title}</h3>
            <p className="cn-card__sub">{note}</p>
            <form className="cn-form" onSubmit={form.submit} noValidate>
              {/* Spam trap: real guests never see or fill this. */}
              <input type="text" name="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => form.setWebsite(e.target.value)} style={{ position: "absolute", left: -9999, width: 1, height: 1, opacity: 0 }} aria-hidden />
              <div>
                <label htmlFor={`${id}-name`}>Your Name</label>
                <input id={`${id}-name`} className="cn-field" type="text" autoComplete="name" placeholder="Enter your name" value={form.values.name ?? ""} onChange={(e) => form.set("name", e.target.value)} />
              </div>
              <div>
                <label htmlFor={`${id}-contact`}>Email Address or Mobile Number</label>
                <input
                  id={`${id}-contact`}
                  className="cn-field"
                  type="text"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="your@email.com or 0917 123 4567"
                  value={form.values.contact ?? ""}
                  onChange={(e) => form.set("contact", e.target.value)}
                />
              </div>
              <div>
                <label htmlFor={`${id}-guests`}>Will you be bringing anyone?</label>
                <select id={`${id}-guests`} className="cn-field" value={choice} onChange={(e) => pick(e.target.value)}>
                  {GUEST_CHOICES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor={`${id}-note`}>A Sweet Note (Optional)</label>
                <textarea
                  id={`${id}-note`}
                  className="cn-field"
                  rows={3}
                  maxLength={500}
                  placeholder={`Leave a message for ${names || "the host"}...`}
                  value={form.values.message ?? ""}
                  onChange={(e) => form.set("message", e.target.value)}
                />
                <p className="cn-count">{(form.values.message ?? "").length}/500</p>
              </div>
              {form.error ? <p className="cn-error" role="alert">{form.error}</p> : null}
              <div className="cn-actions">
                <button type="submit" className="cn-btn" disabled={form.state === "submitting" || editorPreview} title={editorPreview ? "Guests can reply once your site is published" : undefined}>
                  {form.state === "submitting" ? "Sending..." : "Confirm Attendance"}
                </button>
                <button type="button" className="cn-close" onClick={() => setOpen(false)}>
                  Close
                </button>
              </div>
            </form>
          </div>
        ) : null}

        {done ? (
          <div className="cn-card cn-card--done" role="status">
            <div className="cn-done">
              <Heart size={48} fill="#B8C5B0" />
              <h3>Thank You!</h3>
              <p>{form.attending === "no" ? "We’ll miss you — thank you for letting us know." : thanks}</p>
              {form.emailed ? <p style={{ fontSize: "1rem" }}>A copy is on its way to your email.</p> : null}
              <button
                type="button"
                className="cn-close"
                onClick={() => {
                  setDone(false);
                  setOpen(false);
                }}
              >
                Close
              </button>
            </div>
          </div>
        ) : null}

        <div className="cn-sign">
          <p>With love,</p>
          <p className={names ? "" : "cn-hint"}>{names || (editorPreview ? "Your name" : "")}</p>
        </div>
      </div>
    </section>
  );
}
