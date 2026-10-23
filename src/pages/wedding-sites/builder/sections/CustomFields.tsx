import type { EventContent } from "../../content/types";
import type { CustomField } from "../../engine/registry";
import type { SectionVisibility } from "../../presentation/types";
import { FormField, inputStyle, textareaStyle } from "../components/FormField";
import ShowSection from "../components/ShowSection";

// A template's OWN fields (TemplateDefinition.customFields) — things only
// that design has, like a dress code or a favorite song. Answers live in
// content.custom[key]. Fields that belong to one of the design's own sections
// (field.section) sit under that section's name with its "Show on website" switch.
export default function CustomFields({
  fields,
  content,
  onChange,
  sections = [],
  visibility,
  onShowSection,
}: {
  fields: CustomField[];
  content: EventContent;
  onChange: (next: EventContent) => void;
  sections?: { key: string; label: string }[];
  visibility?: SectionVisibility;
  onShowSection?: (key: string, on: boolean) => void;
}) {
  const set = (key: string, value: string) => {
    const custom = { ...(content.custom ?? {}), [key]: value };
    if (!value) delete custom[key];
    onChange({ ...content, custom });
  };
  // `bare`: the field is its section's only one, so the section's name already labels it.
  const field = (f: CustomField, bare = false) => (
    <FormField key={f.key} label={bare ? "" : f.label} hint={f.hint}>
      {f.options ? (
        <select style={inputStyle} value={content.custom?.[f.key] || f.options[0]?.value} onChange={(e) => set(f.key, e.target.value === f.options![0]?.value ? "" : e.target.value)}>
          {f.options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : f.multiline ? (
        <textarea style={{ ...textareaStyle, minHeight: 72 }} placeholder={f.placeholder} maxLength={f.maxLength} value={content.custom?.[f.key] ?? ""} onChange={(e) => set(f.key, e.target.value)} />
      ) : (
        <input style={inputStyle} placeholder={f.placeholder} maxLength={f.maxLength} value={content.custom?.[f.key] ?? ""} onChange={(e) => set(f.key, e.target.value)} />
      )}
    </FormField>
  );
  const grouped = sections.filter((s) => fields.some((f) => f.section === s.key));
  const loose = fields.filter((f) => !f.section || !grouped.some((s) => s.key === f.section));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {loose.map((f) => field(f))}
      {grouped.map((s) => {
        const on = visibility?.[s.key] !== false;
        const own = fields.filter((f) => f.section === s.key);
        return (
          <div key={s.key} style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--line)" }}>
            <p style={{ margin: "0 0 4px", fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>{s.label}</p>
            {onShowSection ? <ShowSection on={on} onChange={(v) => onShowSection(s.key, v)} /> : null}
            <div style={{ opacity: on ? 1 : 0.55 }}>{own.map((f) => field(f, own.length === 1))}</div>
          </div>
        );
      })}
    </div>
  );
}
