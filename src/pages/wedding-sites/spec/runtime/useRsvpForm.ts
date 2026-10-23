import { useState, type FormEvent } from "react";
import type { EventContent } from "../../content/types";
import { rsvpWindow } from "../../content/rsvpDeadline";
import { getSitePassword } from "../../public/sitePassword";
import { useInvitee } from "../../engine/invitee";

export type SubmitState = "idle" | "submitting" | "success" | "error";

/**
 * A design's own RSVP form (website section or traced canvas): the values
 * guests type, and the POST to /api/wedding-rsvp. `website` is the hidden
 * spam trap — real guests never fill it.
 * `closed` / `closedText`: past the hosts' "reply by" date (forms show closedText
 * instead of their fields); `replyBy`: the line to show above an open form.
 */
export function useRsvpForm(content: EventContent, editorPreview: boolean | undefined, opts: { asksAttending: boolean }) {
  // A personal link: their name already in, and (Premium) their seats as the most they can bring.
  const invitee = useInvitee();
  const [values, setValues] = useState<Record<string, string>>(() => (invitee ? { name: invitee.name } : {}));
  const maxGuests = invitee?.seatLimit && invitee.seats ? Math.max(1, invitee.seats) : 10;
  // The hosts' own questions (answers go in as q:<id>; party names as "partyNames").
  const questions = content.rsvpQuestions ?? [];
  const [state, setState] = useState<SubmitState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [website, setWebsite] = useState("");
  // True only when the server actually sent the guest a confirmation email.
  const [emailed, setEmailed] = useState(false);
  const set = (k: string, v: string) => setValues((cur) => ({ ...cur, [k]: v }));
  const attending = values.attending === "yes" ? "yes" : values.attending === "no" ? "no" : null;
  const { closed, replyBy, closedText } = rsvpWindow(content);
  // "Email or mobile": one field, but the right keyboard. Phones open a number pad for a
  // mobile number (lolos and lolas without email) and an email keyboard otherwise.
  const [contactMode, setContactMode] = useState<"email" | "mobile">("email");
  const contactProps =
    contactMode === "mobile"
      ? ({ type: "tel", inputMode: "tel", autoComplete: "tel", placeholder: "0917 123 4567" } as const)
      : ({ type: "email", inputMode: "email", autoComplete: "email", placeholder: "you@email.com" } as const);
  const toggleContact = (inputId?: string) => {
    setContactMode((m) => (m === "email" ? "mobile" : "email"));
    set("contact", "");
    // Re-focus so the phone swaps keyboards straight away.
    if (inputId) setTimeout(() => document.getElementById(inputId)?.focus(), 0);
  };
  const contactToggleLabel = contactMode === "email" ? "Use a mobile number instead" : "Use an email instead";

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (editorPreview) return;
    if (closed) {
      setError(closedText);
      setState("error");
      return;
    }
    if (!(values.name ?? "").trim()) {
      setError("Please enter your name.");
      return;
    }
    if (opts.asksAttending && !attending) {
      setError("Please let us know if you can come.");
      return;
    }
    const missing = attending !== "no" ? questions.find((q) => q.required && !(values[`q:${q.id}`] ?? "").trim()) : undefined;
    if (missing) {
      setError(`Please answer: ${missing.label}`);
      return;
    }
    setState("submitting");
    setError(null);
    try {
      // A busy moment (the link just went to a big group chat): wait and try again, quietly.
      const post = () => fetch("/api/wedding-rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: content.slug,
          // A password-protected site: the password the guest unlocked it with.
          password: getSitePassword(content.slug),
          name: values.name ?? "",
          // One "Email or mobile number" field (built-in templates), or a design's own email field.
          contact: values.contact ?? "",
          email: values.email ?? "",
          message: values.message ?? "",
          website,
          attending,
          // No "are you coming?" question in the design: a reply means yes.
          guests: attending === "no" ? 0 : Math.min(maxGuests, Number(values.guests ?? 1) || 1),
          // Designs that ask how many of the party are kids (Calado): sent only then.
          ...(values.kids !== undefined && attending !== "no" ? { kids: Math.max(0, Number(values.kids) || 0) } : {}),
          // Designs with a message wall: whether the guest wants their message shown there.
          ...(values.share !== undefined ? { share: values.share === "1" } : {}),
          dietary: attending !== "no" ? values.dietary ?? "" : "",
          // A personal link ties the reply to that guest.
          g: invitee?.token ?? "",
          answers:
            attending === "no"
              ? {}
              : {
                  ...Object.fromEntries(questions.map((q) => [q.id, (values[`q:${q.id}`] ?? "").trim()]).filter(([, v]) => v)),
                  ...(content.askPartyNames && (values.partyNames ?? "").trim() ? { _party: values.partyNames.trim() } : {}),
                },
        }),
      });
      let res = await post();
      let data = (await res.json().catch(() => ({}))) as { error?: string; emailed?: boolean; retry?: boolean };
      for (let attempt = 0; res.status === 429 && data.retry && attempt < 3; attempt++) {
        await new Promise((r) => setTimeout(r, 4000 + attempt * 3000));
        res = await post();
        data = (await res.json().catch(() => ({}))) as typeof data;
      }
      if (!res.ok) throw new Error(data.error ?? "Something went wrong — please try again.");
      setEmailed(data.emailed === true);
      setState("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong — please try again.");
      setState("error");
    }
  }

  return { values, set, state, error, website, setWebsite, attending, submit, emailed, closed: closed && !editorPreview, replyBy, closedText, contactMode, contactProps, toggleContact, contactToggleLabel, invitee, maxGuests, questions };
}
