import type { ScheduleItem, EventContent } from "../../content/types";
import { FormField, inputStyle, textareaStyle } from "../components/FormField";
import { ListEditor } from "../components/ListEditor";
import { LISTS } from "../pageEdit";

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
    <>
    {content.schedule.length > 1 ? <p style={{ margin: "0 0 12px", fontSize: 13, color: "var(--slate)" }}>Your site lists these in time order.</p> : null}
    <ListEditor<ScheduleItem>
      items={content.schedule}
      onChange={(schedule) => onChange({ ...content, schedule })}
      list="schedule"
      createItem={() => LISTS.schedule.create(content) as never}
      addLabel="Add schedule item"
      emptyLabel="No schedule items yet."
      renderItem={(item, update) => (
        <div>
          <FormField label="What’s happening?">
            <input
              style={inputStyle}
              placeholder="Ceremony, Dinner, Cake cutting…"
              value={item.label}
              onChange={(e) => update({ label: e.target.value })}
            />
          </FormField>
          {/* One per row: a date-and-time field is wider than half the editor,
              so side by side the End time was cut off. */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 0 }}>
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
          <FormField label="Details (optional)">
            <textarea
              style={textareaStyle}
              value={item.description ?? ""}
              onChange={(e) => update({ description: e.target.value || undefined })}
            />
          </FormField>
        </div>
      )}
    />
    </>
  );
}
