import { useState, type CSSProperties, type FormEvent } from "react";
import type { CreateEventInput, EventType } from "../useCreateEvent";

interface CreateEventFormProps {
  eventType: EventType;
  onSubmit: (input: CreateEventInput) => void;
  onBack: () => void;
  submitting: boolean;
}

const inputStyle: CSSProperties = {
  width: "100%",
  minHeight: 52,
  padding: "14px 16px",
  borderRadius: 12,
  border: "1px solid var(--line)",
  // 16px+: iPhones zoom the page in on anything smaller.
  fontSize: 16,
  background: "#fff",
  color: "var(--ink)",
};

function Label({ htmlFor, children }: { htmlFor: string; children: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-[14px] font-medium" style={{ color: "var(--ink)" }}>
      {children}
    </label>
  );
}

/** A real (visually hidden) checkbox, so the whole row — switch and words — is one big tap target. */
function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="mt-1 flex min-h-[44px] cursor-pointer select-none items-center gap-2.5" style={{ fontSize: 14, color: "var(--slate)" }}>
      <input type="checkbox" role="switch" className="sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span
        aria-hidden
        style={{
          width: 44,
          height: 24,
          borderRadius: 999,
          background: checked ? "var(--acc-blue)" : "var(--line)",
          position: "relative",
          transition: "background 0.15s",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 2,
            left: checked ? 22 : 2,
            width: 20,
            height: 20,
            borderRadius: "50%",
            background: "#fff",
            transition: "left 0.15s",
          }}
        />
      </span>
      {label}
    </label>
  );
}

// Host fields adapt to event type: wedding/anniversary ask for two names
// (matching the "hosts as a list" model — here always exactly 2, but the
// canonical EventContent.hosts happily holds any count); birthday/other
// ask for one. Venue and date each have a "still deciding" skip toggle,
// which just leaves that field blank — Hero.tsx already renders that
// gracefully.
export default function CreateEventForm({ eventType, onSubmit, onBack, submitting }: CreateEventFormProps) {
  const needsTwoHosts = eventType === "wedding" || eventType === "anniversary";
  const [hostOne, setHostOne] = useState("");
  const [hostTwo, setHostTwo] = useState("");
  const [venueName, setVenueName] = useState("");
  const [venueUndecided, setVenueUndecided] = useState(false);
  const [eventDate, setEventDate] = useState("");
  const [dateUndecided, setDateUndecided] = useState(false);

  const canSubmit = needsTwoHosts ? hostOne && hostTwo : Boolean(hostOne);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit({
      eventType,
      hostNames: needsTwoHosts ? [hostOne, hostTwo] : [hostOne],
      venueName: venueUndecided ? undefined : venueName || undefined,
      eventDate: dateUndecided ? undefined : eventDate || undefined,
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      <button
        type="button"
        onClick={onBack}
        className="-ml-1 inline-flex min-h-[44px] items-center px-1"
        style={{ fontSize: 14, color: "var(--slate)", background: "none", border: "none", cursor: "pointer", marginBottom: 8 }}
      >
        &larr; Back
      </button>
      <h2 className="font-display text-2xl font-semibold mb-6" style={{ color: "var(--ink)" }}>
        Let&apos;s get ready to plan.
      </h2>

      <div className="flex flex-col gap-4">
        <div>
          <Label htmlFor="ce-host-one">{needsTwoHosts ? "Your first name" : eventType === "baby" ? "Baby’s name" : "Who's celebrating?"}</Label>
          <input
            id="ce-host-one"
            required
            placeholder={needsTwoHosts ? "First name" : eventType === "baby" ? "e.g. Frances Jash" : "Name"}
            autoComplete={needsTwoHosts ? "given-name" : "off"}
            autoCapitalize="words"
            enterKeyHint="next"
            value={hostOne}
            onChange={(e) => setHostOne(e.target.value)}
            style={inputStyle}
          />
        </div>
        {needsTwoHosts ? (
          <div>
            <Label htmlFor="ce-host-two">Your partner&apos;s first name</Label>
            <input
              id="ce-host-two"
              required
              placeholder="First name"
              autoComplete="off"
              autoCapitalize="words"
              enterKeyHint="next"
              value={hostTwo}
              onChange={(e) => setHostTwo(e.target.value)}
              style={inputStyle}
            />
          </div>
        ) : null}

        <div>
          <Label htmlFor="ce-venue">Event venue</Label>
          <input
            id="ce-venue"
            placeholder="Venue name"
            autoComplete="off"
            autoCapitalize="words"
            enterKeyHint="next"
            value={venueName}
            disabled={venueUndecided}
            onChange={(e) => setVenueName(e.target.value)}
            style={{ ...inputStyle, opacity: venueUndecided ? 0.5 : 1 }}
          />
          <Toggle checked={venueUndecided} onChange={setVenueUndecided} label="We're still deciding" />
        </div>

        <div>
          <Label htmlFor="ce-date">Event date</Label>
          <input
            id="ce-date"
            type="date"
            value={eventDate}
            disabled={dateUndecided}
            onChange={(e) => setEventDate(e.target.value)}
            style={{ ...inputStyle, opacity: dateUndecided ? 0.5 : 1 }}
          />
          <Toggle checked={dateUndecided} onChange={setDateUndecided} label="We're still deciding" />
        </div>

        <button
          type="submit"
          disabled={!canSubmit || submitting}
          className="mt-2"
          style={{
            padding: "14px 24px",
            borderRadius: 999,
            border: "none",
            background: "var(--ink)",
            color: "#fff",
            fontSize: 15,
            fontWeight: 600,
            cursor: canSubmit && !submitting ? "pointer" : "default",
            opacity: canSubmit && !submitting ? 1 : 0.5,
          }}
        >
          {submitting ? "Creating…" : "Create Event"}
        </button>
      </div>
    </form>
  );
}
