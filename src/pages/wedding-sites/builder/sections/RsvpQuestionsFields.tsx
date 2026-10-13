import type { EventContent, RsvpQuestion } from "../../content/types";
import { createId } from "../../content/id";
import { FormField, inputStyle } from "../components/FormField";

// Builder → RSVP questions: the hosts' own questions on the RSVP form (meal, "attending the
// church?", song request…). Premium: up to 5; free sites: 1. Answers show in the Guests tab.

const TYPES: { id: RsvpQuestion["type"]; label: string }[] = [
  { id: "choice", label: "Pick one" },
  { id: "yesno", label: "Yes or no" },
  { id: "text", label: "Short answer" },
];

export default function RsvpQuestionsFields({ content, onChange, premium, onUpgrade }: { content: EventContent; onChange: (next: EventContent) => void; premium: boolean; onUpgrade?: () => void }) {
  const qs = content.rsvpQuestions ?? [];
  const max = premium ? 5 : 1;
  const set = (next: RsvpQuestion[]) => onChange({ ...content, rsvpQuestions: next });
  const patch = (i: number, p: Partial<RsvpQuestion>) => set(qs.map((q, j) => (j === i ? { ...q, ...p } : q)));
  const small: React.CSSProperties = { fontSize: 13, color: "var(--slate)", margin: 0 };

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <p style={small}>Ask guests anything you need, like a meal choice or whether they’ll be at the church. Answers appear in your Guests tab, with totals.</p>
      {qs.map((q, i) => (
        <div key={q.id} style={{ border: "1px solid var(--line)", borderRadius: 14, padding: 12, display: "grid", gap: 8 }}>
          <FormField label={`Question ${i + 1}`}>
            <input style={inputStyle} value={q.label} maxLength={120} placeholder="e.g. Beef, fish or vegetarian?" onChange={(e) => patch(i, { label: e.target.value })} />
          </FormField>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {TYPES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => patch(i, { type: t.id })}
                style={{ minHeight: 36, padding: "0 12px", borderRadius: 999, fontSize: 13, cursor: "pointer", border: `1px solid ${q.type === t.id ? "var(--ink)" : "var(--line)"}`, background: q.type === t.id ? "var(--ink)" : "#fff", color: q.type === t.id ? "#fff" : "var(--ink)" }}
              >
                {t.label}
              </button>
            ))}
          </div>
          {q.type === "choice" ? (
            <FormField label="Choices" hint="Separate them with commas.">
              <input style={inputStyle} value={(q.options ?? []).join(", ")} placeholder="Beef, Fish, Vegetarian" onChange={(e) => patch(i, { options: e.target.value.split(",").map((x) => x.trimStart()).slice(0, 8) })} onBlur={(e) => patch(i, { options: e.target.value.split(",").map((x) => x.trim()).filter(Boolean).slice(0, 8) })} />
            </FormField>
          ) : null}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, minHeight: 40 }}>
              <input type="checkbox" checked={!!q.required} onChange={(e) => patch(i, { required: e.target.checked })} /> Required
            </label>
            <button type="button" onClick={() => set(qs.filter((_, j) => j !== i))} style={{ minHeight: 40, border: "none", background: "none", color: "#c2412d", fontSize: 13, cursor: "pointer" }}>
              Remove
            </button>
          </div>
        </div>
      ))}
      {qs.length < max ? (
        <button
          type="button"
          onClick={() => set([...qs, { id: createId("q"), label: "", type: "choice", options: [], required: false }])}
          style={{ minHeight: 44, borderRadius: 999, border: "1px dashed var(--line)", background: "#fff", fontSize: 14, cursor: "pointer", color: "var(--ink)" }}
        >
          + Add a question
        </button>
      ) : !premium ? (
        <p style={small}>
          Free websites have 1 question. Premium has up to 5.{" "}
          {onUpgrade ? (
            <button type="button" onClick={onUpgrade} style={{ padding: 0, border: "none", background: "none", color: "#2f61d5", textDecoration: "underline", fontSize: 13, cursor: "pointer" }}>
              Upgrade this site
            </button>
          ) : null}
        </p>
      ) : null}
      <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, minHeight: 44 }}>
        <input type="checkbox" checked={!!content.askPartyNames} onChange={(e) => onChange({ ...content, askPartyNames: e.target.checked || undefined })} style={{ width: 18, height: 18 }} />
        Ask for the names of everyone they’re bringing
      </label>
    </div>
  );
}
