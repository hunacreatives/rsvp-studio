import type { ScheduleItem, EventContent } from "../../content/types";
import { createId } from "../../content/id";
import { FormField, inputStyle, textareaStyle } from "../components/FormField";
import { ListEditor } from "../components/ListEditor";

interface ScheduleFieldsProps {
  content: EventContent;
  onChange: (next: EventContent) => void;
}

// V1 simplification: datetime-local inputs don't carry a timezone offset,
// so we store/read a plain "YYYY-MM-DDTHH:mm" local string here rather
// than a full offset-aware ISO string. Reversible later: swap in a
// timezone-aware picker without changing ScheduleItem's shape (it's
// still just a string).
function toDatetimeLocalValue(iso: string): string {
  return iso ? iso.slice(0, 16) : "";
}

export default function ScheduleFields({ content, onChange }: ScheduleFieldsProps) {
  return (
    <ListEditor<ScheduleItem>
      items={content.schedule}
      onChange={(schedule) => onChange({ ...content, schedule })}
      createItem={() => ({ id: createId("schedule"), startTime: "", label: "" })}
      addLabel="Add schedule item"
      emptyLabel="No schedule items yet."
      renderItem={(item, update) => (
        <div>
          <FormField label="Label">
            <input
              style={inputStyle}
              placeholder="Ceremony"
              value={item.label}
              onChange={(e) => update({ label: e.target.value })}
            />
          </FormField>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <FormField label="Start time">
              <input
                type="datetime-local"
                style={inputStyle}
                value={toDatetimeLocalValue(item.startTime)}
                onChange={(e) => update({ startTime: e.target.value })}
              />
            </FormField>
            <FormField label="End time (optional)">
              <input
                type="datetime-local"
                style={inputStyle}
                value={toDatetimeLocalValue(item.endTime ?? "")}
                onChange={(e) => update({ endTime: e.target.value || undefined })}
              />
            </FormField>
          </div>
          <FormField label="Description (optional)">
            <textarea
              style={textareaStyle}
              value={item.description ?? ""}
              onChange={(e) => update({ description: e.target.value || undefined })}
            />
          </FormField>
        </div>
      )}
    />
  );
}
