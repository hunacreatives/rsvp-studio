import type { CSSProperties } from "react";
import type { useRsvpForm } from "../../spec/runtime/useRsvpForm";

// The hosts' own RSVP questions (content.rsvpQuestions) and "names of everyone coming",
// drawn in the design's own field style. Shared by the built-in RSVP forms.

type Form = ReturnType<typeof useRsvpForm>;

export default function RsvpQuestions({
  form,
  idPrefix,
  askPartyNames,
  labelClassName,
  labelStyle,
  fieldClassName,
  fieldStyle,
}: {
  form: Form;
  idPrefix: string;
  askPartyNames?: boolean;
  labelClassName?: string;
  labelStyle?: CSSProperties;
  fieldClassName?: string;
  fieldStyle?: CSSProperties;
}) {
  if (form.attending === "no") return null;
  const guests = Number(form.values.guests ?? 1);
  const field = { className: fieldClassName, style: { width: "100%", boxSizing: "border-box" as const, fontSize: 16, ...fieldStyle } };
  return (
    <>
      {askPartyNames && guests > 1 ? (
        <div>
          <label htmlFor={`${idPrefix}-party`} className={labelClassName} style={labelStyle}>
            Names of everyone coming with you
          </label>
          <input id={`${idPrefix}-party`} value={form.values.partyNames ?? ""} onChange={(e) => form.set("partyNames", e.target.value.slice(0, 400))} autoCapitalize="words" placeholder="e.g. Jose Santos, Ana Santos" {...field} />
        </div>
      ) : null}
      {form.questions.map((q) => {
        const id = `${idPrefix}-q-${q.id}`;
        const value = form.values[`q:${q.id}`] ?? "";
        const set = (v: string) => form.set(`q:${q.id}`, v);
        return (
          <div key={q.id}>
            <label htmlFor={id} className={labelClassName} style={labelStyle}>
              {q.label}
              {q.required ? "" : " (optional)"}
            </label>
            {q.type === "text" ? (
              <input id={id} value={value} onChange={(e) => set(e.target.value.slice(0, 200))} {...field} />
            ) : (
              <select id={id} value={value} onChange={(e) => set(e.target.value)} {...field}>
                <option value="">Choose…</option>
                {(q.type === "yesno" ? ["Yes", "No"] : (q.options ?? [])).map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            )}
          </div>
        );
      })}
    </>
  );
}
