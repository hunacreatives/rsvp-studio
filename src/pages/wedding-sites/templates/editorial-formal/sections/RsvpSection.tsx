import { useState, type FormEvent } from "react";
import type { EventContent } from "../../../content/types";
import type { EventTheme } from "../../../engine/theme";

interface RsvpSectionProps {
  content: EventContent;
  theme: EventTheme;
}

type SubmitState = "idle" | "submitting" | "success" | "error";

// Posts to the shared, generic RSVP endpoint (api/wedding-rsvp.ts) — see
// Decision 8 in the decision log: no new RSVP engine, the server resolves
// the event's actual RSVP table from `slug` itself.
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

  return (
    <section style={{ background: `${theme.muted}0d`, padding: "64px 24px" }}>
      <div style={{ width: "min(440px, 92vw)", margin: "0 auto", textAlign: "center" }}>
        <h2
          style={{
            fontFamily: theme.displayFont,
            fontSize: "clamp(1.5rem, 4vw, 2rem)",
            color: theme.ink,
            marginBottom: 12,
          }}
        >
          RSVP
        </h2>

        {state === "success" ? (
          <p style={{ fontFamily: theme.bodyFont, color: theme.ink, fontSize: 16 }}>
            Thank you, {name.split(" ")[0]} — we can&apos;t wait to celebrate with you!
          </p>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 24 }}>
            <input
              required
              placeholder="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{
                fontFamily: theme.bodyFont,
                padding: "12px 16px",
                borderRadius: 8,
                border: `1px solid ${theme.muted}55`,
                fontSize: 15,
              }}
            />
            <input
              required
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{
                fontFamily: theme.bodyFont,
                padding: "12px 16px",
                borderRadius: 8,
                border: `1px solid ${theme.muted}55`,
                fontSize: 15,
              }}
            />
            <textarea
              placeholder="Message (optional)"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              style={{
                fontFamily: theme.bodyFont,
                padding: "12px 16px",
                borderRadius: 8,
                border: `1px solid ${theme.muted}55`,
                fontSize: 15,
                resize: "vertical",
              }}
            />
            <button
              type="submit"
              disabled={state === "submitting"}
              style={{
                fontFamily: theme.bodyFont,
                background: theme.ink,
                color: theme.background,
                borderRadius: 999,
                padding: "12px 24px",
                fontSize: 15,
                fontWeight: 600,
                border: "none",
                cursor: state === "submitting" ? "default" : "pointer",
                opacity: state === "submitting" ? 0.6 : 1,
              }}
            >
              {state === "submitting" ? "Sending…" : "Send RSVP"}
            </button>
            {state === "error" ? (
              <p style={{ fontFamily: theme.bodyFont, color: "#c0392b", fontSize: 13 }}>
                Something went wrong — please try again.
              </p>
            ) : null}
          </form>
        )}
      </div>
    </section>
  );
}
