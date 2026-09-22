import { useEffect, useState, type FormEvent } from "react";
import { Flourish } from "../components";

interface Props {
  slug: string;
  onClose: () => void;
}

type SubmitState = "idle" | "submitting" | "success" | "error";

/**
 * Presentation-only change: the submission contract is identical to
 * every other template's RSVP form (POST /api/wedding-rsvp with
 * { slug, name, email, message }). Only the surface is different — a
 * stationery panel instead of a large permanent app form, so the
 * published page keeps the collage composition intact.
 */
export default function RsvpDialog({ slug, onClose }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [state, setState] = useState<SubmitState>("idle");

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name || !email) return;
    setState("submitting");
    try {
      const response = await fetch("/api/wedding-rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, name, email, message }),
      });
      if (!response.ok) throw new Error("RSVP request failed");
      setState("success");
    } catch {
      setState("error");
    }
  }

  return (
    <div className="sb-dialog" role="dialog" aria-modal="true" aria-label="RSVP" onClick={onClose}>
      <div className="sb-dialog__panel" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="sb-dialog__close" onClick={onClose} aria-label="Close">
          &times;
        </button>

        <div style={{ textAlign: "center" }}>
          <p className="sb-script sb-script--md">Kindly Respond</p>
          <Flourish />
        </div>

        {state === "success" ? (
          <p className="sb-body" style={{ textAlign: "center", marginTop: 8 }}>
            Thank you, {name.split(" ")[0]} &mdash; we can&apos;t wait to celebrate with you.
          </p>
        ) : (
          <form onSubmit={handleSubmit}>
            <input className="sb-field" required placeholder="Full name" value={name} onChange={(e) => setName(e.target.value)} />
            <input className="sb-field" required type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <textarea className="sb-field" placeholder="Message (optional)" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} />
            <button type="submit" className="sb-submit" disabled={state === "submitting"}>
              {state === "submitting" ? "Sending…" : "Send RSVP"}
            </button>
            {state === "error" ? (
              <p className="sb-body" style={{ color: "#a3372f", marginTop: 10, fontSize: 12 }}>
                Something went wrong — please try again.
              </p>
            ) : null}
          </form>
        )}
      </div>
    </div>
  );
}
