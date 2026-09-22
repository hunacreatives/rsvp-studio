import { useState, type FormEvent } from "react";
import type { EventContent } from "../../../content/types";
import { HeartDoodle } from "../Ornament";
import { hostNames } from "../content";

interface Props {
  content: EventContent;
  editorPreview?: boolean;
}

type SubmitState = "idle" | "submitting" | "success" | "error";

/**
 * Same submission contract as every other template's RSVP form
 * (POST /api/wedding-rsvp with { slug, name, email, message}) — only the
 * surface differs, matching the reference's always-visible glass card
 * rather than a dialog, since Cinematic has no collage to protect.
 */
export default function RsvpSection({ content, editorPreview = false }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [state, setState] = useState<SubmitState>("idle");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (editorPreview) return;
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

  const names = hostNames(content);

  return (
    <section className="cn-rsvp">
      <div className="cn-rsvp__fade" />
      <div className="cn-rsvp__inner">
        <div className="cn-rsvp__card">
          <p className="cn-script cn-script--lg">Kindly RSVP</p>

          {state === "success" ? (
            <p className="cn-hand cn-hand--md" style={{ marginTop: 14 }}>
              Thank you, {name.split(" ")[0]} &mdash; we can&apos;t wait to celebrate with you.
            </p>
          ) : (
            <form onSubmit={handleSubmit}>
              <input
                className="cn-field"
                required
                placeholder="Full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <input
                className="cn-field"
                required
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <textarea
                className="cn-field"
                placeholder="Message (optional)"
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
              <button type="submit" className="cn-submit" disabled={state === "submitting"}>
                {state === "submitting" ? "Sending…" : "Send RSVP"}
              </button>
              {state === "error" ? (
                <p className="cn-hand cn-hand--sm" style={{ color: "#a3372f", marginTop: 10 }}>
                  Something went wrong — please try again.
                </p>
              ) : null}
            </form>
          )}
        </div>

        {names ? (
          <div className="cn-signature">
            <HeartDoodle size={18} color="#C9A0A0" filled />
            <p className="cn-script cn-script--lg" style={{ marginTop: 8 }}>
              With love,
              <br />
              {names}
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
