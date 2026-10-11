import type { EventContent } from "../../content/types";
import type { CustomField } from "../../engine/registry";
import { FormField, inputStyle, textareaStyle } from "../components/FormField";

// A template's OWN fields (TemplateDefinition.customFields) — things only
// that design has, like a dress code or a favorite song. Answers live in
// content.custom[key].
export default function CustomFields({ fields, content, onChange }: { fields: CustomField[]; content: EventContent; onChange: (next: EventContent) => void }) {
  const set = (key: string, value: string) => {
    const custom = { ...(content.custom ?? {}), [key]: value };
    if (!value) delete custom[key];
    onChange({ ...content, custom });
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {fields.map((f) => (
        <FormField key={f.key} label={f.label} hint={f.hint}>
          {f.multiline ? (
            <textarea
              style={{ ...textareaStyle, minHeight: 72 }}
              placeholder={f.placeholder}
              maxLength={f.maxLength}
              value={content.custom?.[f.key] ?? ""}
              onChange={(e) => set(f.key, e.target.value)}
            />
          ) : (
            <input style={inputStyle} placeholder={f.placeholder} maxLength={f.maxLength} value={content.custom?.[f.key] ?? ""} onChange={(e) => set(f.key, e.target.value)} />
          )}
        </FormField>
      ))}
    </div>
  );
}
