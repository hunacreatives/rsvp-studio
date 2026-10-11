import { useId, type CSSProperties } from "react";
import type { EventContent } from "../../content/types";
import { useRsvpForm } from "../../spec/runtime/useRsvpForm";
import { calendarUrl } from "../../content/calendar";

// The RSVP form for every built-in template. Each template passes a "skin"
// (its fonts, colours and CSS classes) so the design keeps its look, while
// guests always get the same plain questions: name, email OR mobile, are you
// coming, how many, food needs, a note. In the builder preview it can't submit —
// a host testing their draft must not create real RSVPs.

type Part = { className?: string; style?: CSSProperties };

export type RsvpSkin = {
  /** Body font for labels and text (class-based skins can leave it out). */
  font?: string;
  ink: string;
  muted: string;
  field: Part;
  textarea?: Part;
  button: Part;
  /** The Yes / No choice buttons. */
  choice: (selected: boolean) => Part;
  success?: Part;
  /** Space between the fields. */
  gap?: number;
};

const MAX_PARTY = 10;

export default function RsvpForm({ content, editorPreview, skin }: { content: EventContent; editorPreview?: boolean; skin: RsvpSkin }) {
  const { values, set, state, error, website, setWebsite, attending, submit, emailed } = useRsvpForm(content, editorPreview, { asksAttending: true });
  const id = useId();
  const first = (values.name ?? "").trim().split(" ")[0];

  const text: CSSProperties = { fontFamily: skin.font, color: skin.ink };
  const label: CSSProperties = { ...text, display: "block", fontSize: 14, fontWeight: 600, margin: "0 0 6px", textAlign: "left" };
  // 16px stops iPhones zooming in when a field is tapped.
  const field = (p: Part = skin.field): Part => ({ className: p.className, style: { width: "100%", boxSizing: "border-box", fontSize: 16, ...p.style } });

  if (state === "success") {
    return (
      <div className={skin.success?.className} style={{ ...text, fontSize: 17, lineHeight: 1.6, ...skin.success?.style }} role="status">
        {attending === "no" ? (
          <p style={{ margin: 0 }}>Thank you, {first}. We’ll miss you — your reply has been sent.</p>
        ) : (
          <p style={{ margin: 0 }}>Thank you, {first} — you’re on the list.{emailed ? " A copy is on its way to your email." : ""}</p>
        )}
        {attending !== "no" && calendarUrl(content) ? (
          <p style={{ margin: "12px 0 0", fontSize: 15 }}>
            <a href={calendarUrl(content)!} target="_blank" rel="noopener noreferrer" style={{ color: skin.ink, fontWeight: 600 }}>
              Add it to your calendar →
            </a>
          </p>
        ) : null}
        <p style={{ margin: "10px 0 0", fontSize: 14, color: skin.muted }}>Need to change your answer? Send this form again with the same email or mobile number.</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} style={{ display: "grid", gap: skin.gap ?? 14, textAlign: "left", position: "relative" }} noValidate>
      {/* Spam trap: hidden from guests. */}
      <div aria-hidden="true" style={{ position: "absolute", left: -10000, width: 1, height: 1, overflow: "hidden" }}>
        <input tabIndex={-1} autoComplete="off" name="website" value={website} onChange={(e) => setWebsite(e.target.value)} />
      </div>

      <div>
        <label htmlFor={`${id}-name`} style={label}>
          Your name
        </label>
        <input id={`${id}-name`} required autoComplete="name" value={values.name ?? ""} onChange={(e) => set("name", e.target.value)} {...field()} />
      </div>

      <div>
        <label htmlFor={`${id}-contact`} style={label}>
          Email or mobile number
        </label>
        <input
          id={`${id}-contact`}
          required
          inputMode="email"
          autoComplete="email"
          placeholder="you@email.com or 0917 123 4567"
          value={values.contact ?? ""}
          onChange={(e) => set("contact", e.target.value)}
          {...field()}
        />
      </div>

      <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
        <legend style={label}>Will you be there?</legend>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {(
            [
              ["yes", "Yes, I’ll be there"],
              ["no", "Sorry, I can’t"],
            ] as const
          ).map(([value, text]) => {
            const c = skin.choice(attending === value);
            return (
              <button
                key={value}
                type="button"
                aria-pressed={attending === value}
                onClick={() => set("attending", value)}
                className={c.className}
                style={{ fontSize: 16, minHeight: 48, cursor: "pointer", ...c.style }}
              >
                {text}
              </button>
            );
          })}
        </div>
      </fieldset>

      {attending === "yes" ? (
        <>
          <div>
            <label htmlFor={`${id}-guests`} style={label}>
              How many of you are coming, including you?
            </label>
            <select id={`${id}-guests`} value={values.guests ?? "1"} onChange={(e) => set("guests", e.target.value)} {...field()}>
              {Array.from({ length: MAX_PARTY }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n === 1 ? "Just me" : `${n} people`}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor={`${id}-dietary`} style={label}>
              Food allergies or diet needs <span style={{ fontWeight: 400, color: skin.muted }}>(optional)</span>
            </label>
            <input id={`${id}-dietary`} value={values.dietary ?? ""} onChange={(e) => set("dietary", e.target.value)} {...field()} />
          </div>
        </>
      ) : null}

      <div>
        <label htmlFor={`${id}-message`} style={label}>
          A message for the hosts <span style={{ fontWeight: 400, color: skin.muted }}>(optional)</span>
        </label>
        <textarea id={`${id}-message`} rows={3} value={values.message ?? ""} onChange={(e) => set("message", e.target.value)} {...field(skin.textarea ?? skin.field)} style={{ ...field(skin.textarea ?? skin.field).style, resize: "vertical" }} />
      </div>

      {editorPreview ? (
        <p style={{ ...text, fontSize: 14, margin: 0, color: skin.muted, textAlign: "center" }}>Preview only — guests can RSVP once your site is published.</p>
      ) : null}

      <button
        type="submit"
        disabled={state === "submitting" || editorPreview}
        className={skin.button.className}
        style={{ fontSize: 16, minHeight: 48, cursor: state === "submitting" || editorPreview ? "default" : "pointer", opacity: state === "submitting" || editorPreview ? 0.6 : 1, ...skin.button.style }}
      >
        {state === "submitting" ? "Sending…" : "Send my reply"}
      </button>

      <p style={{ ...text, fontSize: 12, margin: 0, color: skin.muted, textAlign: "center" }}>
        Your reply goes to the hosts.{" "}
        <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ color: skin.muted }}>
          Privacy
        </a>
      </p>

      {error ? (
        <p role="alert" style={{ ...text, color: "#b3261e", fontSize: 14, margin: 0, textAlign: "center" }}>
          {error}
        </p>
      ) : null}
    </form>
  );
}
