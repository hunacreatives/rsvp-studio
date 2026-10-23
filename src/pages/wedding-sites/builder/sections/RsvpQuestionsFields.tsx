import type { EventContent, RsvpQuestion } from "../../content/types";
import { createId } from "../../content/id";
import { FormField, inputStyle } from "../components/FormField";
import { Switch } from "../GuestSettings";
import { usePageEdit } from "../pageEdit";

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
  const edit = usePageEdit();
  const small: React.CSSProperties = { fontSize: 13, lineHeight: 1.5, color: "var(--slate)", margin: 0 };
  const remove = (i: number) => {
    edit?.checkpoint();
    set(qs.filter((_, j) => j !== i));
    edit?.notify(`Removed ${qs[i].label.trim() ? `“${qs[i].label.trim()}”` : "a question"}`);
  };

  return (
    <div>
      <p style={{ margin: "22px 0 4px", fontSize: 12, fontWeight: 500, color: "var(--slate)" }}>Your questions</p>
      <p style={small}>Ask what you need to know: a meal choice, church or reception, a song for the dance floor. Answers land in your Guests tab, already counted.</p>
      {qs.map((q, i) => (
        <div key={q.id} style={{ display: "grid", gap: 10, padding: "16px 0 6px", borderBottom: "1px solid var(--line)" }}>
          <FormField label={qs.length > 1 ? `Question ${i + 1}` : "Question"}>
            <input style={inputStyle} value={q.label} maxLength={120} placeholder="Beef, fish or vegetarian?" onChange={(e) => patch(i, { label: e.target.value })} />
          </FormField>
          <div role="radiogroup" aria-label="Answer type" style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: -6 }}>
            {TYPES.map((t) => (
              <button
                key={t.id}
                type="button"
                role="radio"
                aria-checked={q.type === t.id}
                onClick={() => patch(i, { type: t.id })}
                style={{ minHeight: 32, padding: "0 12px", borderRadius: 999, fontSize: 13, cursor: "pointer", fontFamily: "inherit", border: `1px solid ${q.type === t.id ? "var(--ink)" : "var(--line-strong)"}`, background: q.type === t.id ? "var(--ink)" : "#fff", color: q.type === t.id ? "#fff" : "var(--ink)" }}
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
          <div style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 40, marginTop: -4 }}>
            <span style={{ flex: 1, fontSize: 14, color: "var(--ink)" }}>Guests must answer</span>
            <Switch on={!!q.required} onChange={(v) => patch(i, { required: v })} label="Guests must answer" />
            <button type="button" onClick={() => remove(i)} style={{ minHeight: 36, padding: "0 4px", border: "none", background: "none", color: "var(--slate)", fontSize: 13, cursor: "pointer", fontFamily: "inherit", textDecoration: "underline", textUnderlineOffset: 3 }}>
              Remove
            </button>
          </div>
        </div>
      ))}
      {qs.length < max ? (
        <button type="button" className="dp-text-btn" onClick={() => (edit?.checkpoint(), set([...qs, { id: createId("q"), label: "", type: "choice", options: [], required: false }]))}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden>
            <path d="M12 5v14M5 12h14" />
          </svg>
          Add a question
        </button>
      ) : !premium ? (
        <p style={{ ...small, marginTop: 12 }}>
          One question on the free plan. Premium gives you five.{" "}
          {onUpgrade ? (
            <button type="button" onClick={onUpgrade} style={{ padding: 0, border: "none", background: "none", color: "var(--ink)", fontWeight: 600, textDecoration: "underline", textUnderlineOffset: 3, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
              Go Premium
            </button>
          ) : null}
        </p>
      ) : null}

      <p style={{ margin: "26px 0 4px", fontSize: 12, fontWeight: 500, color: "var(--slate)" }}>Plus-ones</p>
      <div style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 44 }}>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", fontSize: 14, color: "var(--ink)" }}>Ask for everyone’s names</span>
          <span style={{ display: "block", marginTop: 2, fontSize: 12.5, lineHeight: 1.45, color: "var(--slate)" }}>Guests list who they’re bringing, so your count comes with names.</span>
        </span>
        <Switch on={!!content.askPartyNames} onChange={(v) => onChange({ ...content, askPartyNames: v || undefined })} label="Ask for everyone’s names" />
      </div>
    </div>
  );
}
