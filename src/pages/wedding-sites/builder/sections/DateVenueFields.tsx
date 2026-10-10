import type { EventContent } from "../../content/types";
import { FormField, inputStyle } from "../components/FormField";

interface DateVenueFieldsProps {
  content: EventContent;
  onChange: (next: EventContent) => void;
}

export default function DateVenueFields({ content, onChange }: DateVenueFieldsProps) {
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <FormField label="Event date">
          <input
            type="date"
            style={inputStyle}
            value={content.eventDate.slice(0, 10)}
            onChange={(e) => onChange({ ...content, eventDate: e.target.value + (content.eventDate.length > 10 ? content.eventDate.slice(10) : "") })}
          />
        </FormField>
        <FormField label="Start time (optional)">
          <input
            type="time"
            style={inputStyle}
            value={content.eventDate.length > 10 ? content.eventDate.slice(11, 16) : ""}
            disabled={!content.eventDate}
            onChange={(e) => onChange({ ...content, eventDate: content.eventDate.slice(0, 10) + (e.target.value ? `T${e.target.value}` : "") })}
          />
        </FormField>
      </div>
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
      <FormField label="Google Maps link (optional)" hint="Open the place in Google Maps, tap Share, copy the link and paste it here.">
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
