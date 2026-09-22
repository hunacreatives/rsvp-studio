import type { EventContent } from "../../content/types";
import { FormField, inputStyle } from "../components/FormField";

interface DateVenueFieldsProps {
  content: EventContent;
  onChange: (next: EventContent) => void;
}

export default function DateVenueFields({ content, onChange }: DateVenueFieldsProps) {
  return (
    <div>
      <FormField label="Event date">
        <input
          type="date"
          style={inputStyle}
          value={content.eventDate}
          onChange={(e) => onChange({ ...content, eventDate: e.target.value })}
        />
      </FormField>
      <FormField label="Venue name">
        <input
          style={inputStyle}
          value={content.primaryLocation.name}
          onChange={(e) =>
            onChange({ ...content, primaryLocation: { ...content.primaryLocation, name: e.target.value } })
          }
        />
      </FormField>
      <FormField label="Venue address">
        <input
          style={inputStyle}
          value={content.primaryLocation.addressLine}
          onChange={(e) =>
            onChange({ ...content, primaryLocation: { ...content.primaryLocation, addressLine: e.target.value } })
          }
        />
      </FormField>
      <FormField label="Map link (optional)">
        <input
          style={inputStyle}
          value={content.primaryLocation.mapUrl ?? ""}
          onChange={(e) =>
            onChange({
              ...content,
              primaryLocation: { ...content.primaryLocation, mapUrl: e.target.value || undefined },
            })
          }
        />
      </FormField>
    </div>
  );
}
