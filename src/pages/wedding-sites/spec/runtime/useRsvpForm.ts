import { useState, type FormEvent } from "react";
import type { EventContent } from "../../content/types";

export type SubmitState = "idle" | "submitting" | "success" | "error";

/**
 * A design's own RSVP form (website section or traced canvas): the values
 * guests type, and the POST to /api/wedding-rsvp. `website` is the hidden
 * spam trap — real guests never fill it.
 */
export function useRsvpForm(content: EventContent, editorPreview: boolean | undefined, opts: { asksAttending: boolean }) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [state, setState] = useState<SubmitState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [website, setWebsite] = useState("");
  // True only when the server actually sent the guest a confirmation email.
  const [emailed, setEmailed] = useState(false);
  const set = (k: string, v: string) => setValues((cur) => ({ ...cur, [k]: v }));
  const attending = values.attending === "yes" ? "yes" : values.attending === "no" ? "no" : null;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (editorPreview) return;
    if (!(values.name ?? "").trim()) {
      setError("Please enter your name.");
      return;
    }
    if (opts.asksAttending && !attending) {
      setError("Please let us know if you can come.");
      return;
    }
    setState("submitting");
    setError(null);
    try {
      const res = await fetch("/api/wedding-rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: content.slug,
          name: values.name ?? "",
          // One "Email or mobile number" field (built-in templates), or a design's own email field.
          contact: values.contact ?? "",
          email: values.email ?? "",
          message: values.message ?? "",
          website,
          attending,
          // No "are you coming?" question in the design: a reply means yes.
          guests: attending === "yes" ? Number(values.guests ?? 1) : attending === "no" ? 0 : Number(values.guests ?? 1),
          dietary: attending !== "no" ? values.dietary ?? "" : "",
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; emailed?: boolean };
      if (!res.ok) throw new Error(data.error ?? "Something went wrong — please try again.");
      setEmailed(data.emailed === true);
      setState("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong — please try again.");
      setState("error");
    }
  }

  return { values, set, state, error, website, setWebsite, attending, submit, emailed };
}
