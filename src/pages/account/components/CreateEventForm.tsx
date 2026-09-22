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
  padding: "14px 16px",
  borderRadius: 12,
  border: "1px solid var(--line)",
  fontSize: 15,
  background: "#fff",
  color: "var(--ink)",
};

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-2 mt-2 cursor-pointer select-none" style={{ fontSize: 13, color: "var(--slate)" }}>
      <span
        onClick={() => onChange(!checked)}
        style={{
          width: 36,
          height: 20,
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
            left: checked ? 18 : 2,
            width: 16,
            height: 16,
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
        style={{ fontSize: 13, color: "var(--slate)", background: "none", border: "none", cursor: "pointer", marginBottom: 16 }}
      >
        &larr; Back
      </button>
      <h2 className="font-display text-2xl font-semibold mb-6" style={{ color: "var(--ink)" }}>
        Let&apos;s get ready to plan.
      </h2>

      <div className="flex flex-col gap-4">
        <input
          required
          placeholder={needsTwoHosts ? "Your First Name" : "Who's celebrating?"}
          value={hostOne}
          onChange={(e) => setHostOne(e.target.value)}
          style={inputStyle}
        />
        {needsTwoHosts ? (
          <input
            required
            placeholder="Your Partner's First Name"
            value={hostTwo}
            onChange={(e) => setHostTwo(e.target.value)}
            style={inputStyle}
          />
        ) : null}

        <div>
          <input
            placeholder="Event Venue"
            value={venueName}
            disabled={venueUndecided}
            onChange={(e) => setVenueName(e.target.value)}
            style={{ ...inputStyle, opacity: venueUndecided ? 0.5 : 1 }}
          />
          <Toggle checked={venueUndecided} onChange={setVenueUndecided} label="We're still deciding" />
        </div>

        <div>
          <input
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
