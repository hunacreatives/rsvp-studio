import { useState, type FormEvent } from "react";
import type { EventContent } from "../../../content/types";
import type { EventTheme } from "../../../engine/theme";

interface RsvpSectionProps {
  content: EventContent;
  theme: EventTheme;
}

type SubmitState = "idle" | "submitting" | "success" | "error";

// Same generic /api/wedding-rsvp endpoint as every template — see
// Decision 8 in the decision log. Styling here is square/bordered rather
// than pill-shaped, matching this archetype's hairline-rule identity.
export default function RsvpSection({ content, theme }: RsvpSectionProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [state, setState] = useState<SubmitState>("idle");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name || !email) return;
    setState("submitting");
    try {
      const response = await fetch("/api/wedding-rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: content.slug, name, email, message }),
      });
      if (!response.ok) throw new Error("RSVP request failed");
      setState("success");
    } catch {
      setState("error");
    }
  }

  const inputStyle = {
    fontFamily: theme.bodyFont,
    padding: "12px 14px",
    border: `1px solid ${theme.muted}55`,
    fontSize: 14,
    background: theme.background,
    color: theme.ink,
  };

  return (
    <section style={{ background: `${theme.muted}0a`, padding: "64px 32px" }}>
      <div style={{ width: "min(440px, 92vw)", margin: "0 auto" }}>
        <p
          style={{
            fontFamily: theme.bodyFont,
            textTransform: "uppercase",
            letterSpacing: "0.14em",
            fontSize: 11,
            fontWeight: 700,
            color: theme.muted,
            margin: "0 0 20px",
          }}
        >
          RSVP
        </p>

        {state === "success" ? (
          <p style={{ fontFamily: theme.bodyFont, color: theme.ink, fontSize: 15 }}>
            Thanks, {name.split(" ")[0]} — you&apos;re on the list.
          </p>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <input required placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
            <input required type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} />
            <textarea placeholder="Message (optional)" value={message} onChange={(e) => setMessage(e.target.value)} rows={3} style={{ ...inputStyle, resize: "vertical" }} />
            <button
              type="submit"
              disabled={state === "submitting"}
              style={{
                fontFamily: theme.bodyFont,
                background: theme.ink,
                color: theme.background,
                padding: "12px 20px",
                fontSize: 13,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                border: "none",
                cursor: state === "submitting" ? "default" : "pointer",
                opacity: state === "submitting" ? 0.6 : 1,
              }}
            >
              {state === "submitting" ? "Sending…" : "Send RSVP"}
            </button>
            {state === "error" ? (
              <p style={{ fontFamily: theme.bodyFont, color: "#c0392b", fontSize: 12 }}>Something went wrong — try again.</p>
            ) : null}
          </form>
        )}
      </div>
    </section>
  );
}
