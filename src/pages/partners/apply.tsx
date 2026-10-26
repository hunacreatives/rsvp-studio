import { useState } from "react";
import { submitInquiry } from "@/pages/enquire/submit";
import { trackEvent } from "@/lib/analytics";
import { ErrorText, Field, Input, PrimaryButton, Select, Textarea } from "@/pages/account/portal/ui";
import { PARTNER_TIERS } from "./tiers";

// The short partner application: on /partners?type=creator (the link we advertise) and on the
// Partner page in the dashboard. No account needed: signed out, it asks for their name and email;
// signed in, those come from the account (and api/enquire marks it as theirs). Once approved,
// Studio's welcome email opens sign-up with that email, so their account is made then and lands
// on the partner dashboard. The keys are the ones Studio → Leads "Add as partner" fills in from.

export const RATES = PARTNER_TIERS.map((t) => (t.at ? `${t.rate}% after ${t.at}` : `${t.rate}% from your first paying client`)).join(", ");
const VOLUME = ["Under 10", "10 – 25", "25 – 50", "50+"];
const FOLLOWERS = ["Under 5K", "5K – 20K", "20K – 100K", "100K+"];

export type Kind = "planner" | "creator" | "vendor";
export const KIND_LABEL: Record<Kind, string> = { planner: "Planner or coordinator", creator: "Creator or influencer", vendor: "Venue or vendor" };
// The same words as the old /partners form, so Studio → Leads reads them as before.
const PARTNER_TYPE: Record<Kind, string> = { planner: "Planner or coordinator", creator: "Creator or influencer", vendor: "Venue or other vendor" };

export type Draft = { kind: Kind; brand: string; handle: string; size: string; note: string };


export async function sendApplication(d: Draft, who: { name: string; email: string }) {
  await submitInquiry(
    {
      your_name: who.name,
      email: who.email,
      partner_type: PARTNER_TYPE[d.kind],
      ...(d.brand.trim() ? { business_name: d.brand.trim() } : {}),
      ...(d.handle.trim() ? { instagram: d.handle.trim() } : {}),
      ...(d.size ? { [d.kind === "creator" ? "followers" : "volume"]: d.size } : {}),
      ...(d.note.trim() ? { about: d.note.trim() } : {}),
      looking_for: ["Referral partnership"],
    },
    [],
    { form: "partner-inquiry" },
  );
  trackEvent("generate_lead", { form: "partner" });
}

/** The form itself. `account` null (signed out): it also asks for their name and email. */
export function ApplyForm({
  kinds,
  initialKind,
  account,
  demo = false,
  onSent,
}: {
  kinds: Kind[];
  initialKind: Kind;
  account: { name: string; email: string } | null;
  demo?: boolean;
  onSent: (email: string) => void;
}) {
  const [kind, setKind] = useState<Kind>(kinds.includes(initialKind) ? initialKind : kinds[0]);
  const creator = kind === "creator";
  const [brand, setBrand] = useState("");
  const [handle, setHandle] = useState("");
  const [size, setSize] = useState("");
  const [note, setNote] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const who = account ?? { name: name.trim(), email: email.trim().toLowerCase() };
  const ready = (creator ? !!handle.trim() : !!brand.trim()) && !!who.name && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(who.email);
  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ready || busy) return;
    setBusy(true);
    setError(null);
    try {
      if (!demo) await sendApplication({ kind, brand, handle, size, note }, who);
      onSent(who.email);
    } catch (err) {
      setError(err instanceof Error ? err.message : "That didn’t send. Please try again.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <form onSubmit={send} className="space-y-5 text-left">
      {kinds.length > 1 ? (
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="I’m a">
          {kinds.map((v) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={kind === v}
              onClick={() => setKind(v)}
              className={`min-h-[40px] rounded-full border px-4 text-[14px] font-medium ${kind === v ? "border-[var(--ink)] bg-[var(--ink)] text-white" : "border-[rgba(0,7,39,0.18)] text-[var(--ink)]"}`}
            >
              {KIND_LABEL[v]}
            </button>
          ))}
        </div>
      ) : null}
      {account ? null : (
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Your name">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" autoComplete="name" autoCapitalize="words" required />
          </Field>
          <Field label="Email">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" autoComplete="email" autoCapitalize="none" spellCheck={false} required />
          </Field>
        </div>
      )}
      {creator ? (
        <Field label="Your handle">
          <Input value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="@yourname" autoCapitalize="none" autoCorrect="off" spellCheck={false} required />
        </Field>
      ) : (
        <>
          <Field label={kind === "vendor" ? "Venue or business name" : "Studio or business name"}>
            <Input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder={kind === "vendor" ? "e.g. Taal Vista Hotel" : "e.g. Joy Mendoza Events"} autoComplete="organization" required />
          </Field>
          <Field label="Instagram (optional)">
            <Input value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="@studio" autoCapitalize="none" autoCorrect="off" spellCheck={false} />
          </Field>
        </>
      )}
      <Field label={creator ? "Followers on your biggest account" : "Events a year, roughly"}>
        <Select value={size} onChange={(e) => setSize(e.target.value)}>
          <option value="">Choose one</option>
          {(creator ? FOLLOWERS : VOLUME).map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Anything we should know? (optional)">
        <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder={creator ? "What you post about, and how you’d share us" : kind === "vendor" ? "What you do, and the couples you work with" : "The events you do, and where"} />
      </Field>
      <p className="text-[13px] text-[var(--slate)]">
        {account ? (
          <>
            We’ll reply to <strong className="text-[var(--ink)]">{account.email}</strong>, the email you log in with. Your code and earnings show on your Partner page once you’re approved.
          </>
        ) : (
          "Once you’re approved, we’ll email you your code and a link to set up your partner account with this email."
        )}
      </p>
      <ErrorText>{error}</ErrorText>
      <PrimaryButton type="submit" disabled={!ready || busy}>
        {busy ? "Sending…" : "Apply"}
      </PrimaryButton>
    </form>
  );
}
