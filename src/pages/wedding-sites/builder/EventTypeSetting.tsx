import { useState } from "react";
import { templateFitsEvent, type TemplateDefinition } from "../engine/registry";
import { FormField, inputStyle } from "./components/FormField";

// Details → Settings → Event (supabase/event-type-change.sql): what kind of event this is.
// It sets the site's wording (occasionWords) and which designs fit. A type the current
// design isn't made for goes on to the design gallery; everything written stays.

const TYPES = [
  { type: "wedding", label: "Wedding", plural: "weddings" },
  { type: "birthday", label: "Birthday", plural: "birthdays" },
  { type: "anniversary", label: "Anniversary", plural: "anniversaries" },
  { type: "baby", label: "Christening & First Birthday", plural: "christenings and first birthdays" },
  { type: "engagement", label: "Engagement & Tinghun", plural: "engagements" },
  { type: "other", label: "Other Celebration", plural: "other celebrations" },
] as const;

const pluralOf = (t: string) => TYPES.find((x) => x.type === t)?.plural ?? t;
const list = (xs: string[]) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);

export default function EventTypeSetting({
  eventType,
  design,
  onChange,
  onPickDesign,
}: {
  eventType: string | null;
  design: TemplateDefinition | undefined;
  onChange: (type: string) => Promise<boolean>;
  /** After a change the design isn't made for: on to the gallery. */
  onPickDesign: () => void;
}) {
  const [pending, setPending] = useState<string | null>(null);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const current = eventType ?? "other";

  const apply = async (type: string, thenPick: boolean) => {
    setState("saving");
    const ok = await onChange(type);
    setState(ok ? "saved" : "error");
    if (!ok) return;
    setPending(null);
    if (thenPick) onPickDesign();
  };
  const pick = (type: string) => {
    if (type === current) return setPending(null);
    if (design && !templateFitsEvent(design, type)) return setPending(type);
    void apply(type, false);
  };

  return (
    <div style={{ marginBottom: 18, paddingBottom: 18, borderBottom: "1px solid var(--line)" }}>
      <FormField label="Event" htmlFor="event-type" hint="Sets the wording on your site, like “The wedding of” or “You’re invited”.">
        <select id="event-type" value={pending ?? current} onChange={(e) => pick(e.target.value)} disabled={state === "saving"} style={inputStyle}>
          {TYPES.map((t) => (
            <option key={t.type} value={t.type}>
              {t.label}
            </option>
          ))}
        </select>
      </FormField>
      {pending && design ? (
        <div style={{ margin: "-6px 0 0", padding: 14, border: "1px solid var(--line)", borderRadius: 10, background: "#fff" }}>
          <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.5, color: "var(--ink)" }}>
            {design.label} is made for {list((design.occasions ?? []).map(pluralOf))}. Pick a design for your {TYPES.find((t) => t.type === pending)?.label.toLowerCase()} next. Everything you’ve written stays.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
            <button type="button" onClick={() => void apply(pending, true)} disabled={state === "saving"} style={{ minHeight: 36, padding: "0 14px", border: 0, borderRadius: 8, background: "var(--ink)", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
              {state === "saving" ? "Changing…" : "Change and pick a design"}
            </button>
            <button type="button" onClick={() => (setPending(null), setState("idle"))} style={{ minHeight: 36, padding: "0 14px", border: "1px solid var(--line-strong)", borderRadius: 8, background: "#fff", color: "var(--ink)", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
              Keep {TYPES.find((t) => t.type === current)?.label}
            </button>
          </div>
        </div>
      ) : null}
      <p aria-live="polite" style={{ margin: pending ? "8px 0 0" : "-8px 0 0", minHeight: state === "idle" ? 0 : 18, fontSize: 13, color: state === "error" ? "#c2412d" : state === "saved" ? "#3d7a12" : "var(--slate)" }}>
        {state === "saving" ? "Saving…" : state === "saved" ? "Saved." : state === "error" ? "Couldn’t change it. Please try again." : ""}
      </p>
    </div>
  );
}
