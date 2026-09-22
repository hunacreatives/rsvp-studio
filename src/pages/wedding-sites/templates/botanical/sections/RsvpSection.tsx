import { useState, type FormEvent } from "react";
import type { EventContent } from "../../../content/types";
import type { EventTheme } from "../../../engine/theme";
import { LeafDivider } from "../Ornament";

interface RsvpSectionProps {
  content: EventContent;
  theme: EventTheme;
}

type SubmitState = "idle" | "submitting" | "success" | "error";

// Same generic /api/wedding-rsvp endpoint as every template. Pill-shaped
// inputs/button here, deliberately opposite of Modern Minimal's square
// bordered form — matches this archetype's soft, rounded ornamental feel.
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
    padding: "13px 20px",
    borderRadius: 999,
    border: `1px solid ${theme.ink}33`,
    fontSize: 15,
    background: theme.background,
    color: theme.ink,
  };

  return (
    <section style={{ background: `${theme.ink}06`, padding: "72px 24px", textAlign: "center" }}>
      <div style={{ width: "min(420px, 92vw)", margin: "0 auto" }}>
        <p style={{ fontFamily: theme.displayFont, fontSize: 30, color: theme.ink, margin: 0 }}>
          Kindly Respond
        </p>
        <LeafDivider color={theme.ink} />

        {state === "success" ? (
          <p style={{ fontFamily: theme.bodyFont, color: theme.ink, fontSize: 16, fontStyle: "italic" }}>
            Thank you, {name.split(" ")[0]} — we can&apos;t wait to celebrate with you.
          </p>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12, textAlign: "left" }}>
            <input required placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
            <input required type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} />
            <textarea
              placeholder="Message (optional)"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              style={{ ...inputStyle, borderRadius: 18, resize: "vertical" }}
            />
            <button
              type="submit"
              disabled={state === "submitting"}
              style={{
                fontFamily: theme.bodyFont,
                background: theme.ink,
                color: theme.background,
                borderRadius: 999,
                padding: "13px 20px",
                fontSize: 14,
                fontWeight: 600,
                letterSpacing: "0.04em",
                border: "none",
                cursor: state === "submitting" ? "default" : "pointer",
                opacity: state === "submitting" ? 0.6 : 1,
              }}
            >
              {state === "submitting" ? "Sending…" : "Send RSVP"}
            </button>
            {state === "error" ? (
              <p style={{ fontFamily: theme.bodyFont, color: "#c0392b", fontSize: 12, textAlign: "center" }}>
                Something went wrong — try again.
              </p>
            ) : null}
          </form>
        )}
      </div>
    </section>
  );
}
