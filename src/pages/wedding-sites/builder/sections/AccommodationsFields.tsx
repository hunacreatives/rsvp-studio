import type { Accommodation, EventContent } from "../../content/types";
import { createId } from "../../content/id";
import { FormField, inputStyle, textareaStyle } from "../components/FormField";
import { ListEditor } from "../components/ListEditor";

interface AccommodationsFieldsProps {
  content: EventContent;
  onChange: (next: EventContent) => void;
}

export default function AccommodationsFields({ content, onChange }: AccommodationsFieldsProps) {
  return (
    <ListEditor<Accommodation>
      items={content.accommodations}
      onChange={(accommodations) => onChange({ ...content, accommodations })}
      createItem={() => ({ id: createId("accommodation"), name: "", addressLine: "" })}
      addLabel="Add accommodation"
      emptyLabel="No accommodations listed yet."
      renderItem={(item, update) => (
        <div>
          <FormField label="Name">
            <input style={inputStyle} value={item.name} onChange={(e) => update({ name: e.target.value })} />
          </FormField>
          <FormField label="Address">
            <input
              style={inputStyle}
              value={item.addressLine}
              onChange={(e) => update({ addressLine: e.target.value })}
            />
          </FormField>
          <FormField label="Booking link (optional)">
            <input
              style={inputStyle}
              value={item.bookingUrl ?? ""}
              onChange={(e) => update({ bookingUrl: e.target.value || undefined })}
            />
          </FormField>
          <FormField label="Notes (optional)" hint="e.g. room block code or rate.">
            <textarea
              style={textareaStyle}
              value={item.notes ?? ""}
              onChange={(e) => update({ notes: e.target.value || undefined })}
            />
          </FormField>
        </div>
      )}
    />
  );
}
