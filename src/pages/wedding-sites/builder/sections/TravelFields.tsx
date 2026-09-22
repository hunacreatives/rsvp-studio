import type { TravelInformation, EventContent } from "../../content/types";
import { createId } from "../../content/id";
import { FormField, inputStyle, textareaStyle } from "../components/FormField";
import { ListEditor } from "../components/ListEditor";

interface TravelFieldsProps {
  content: EventContent;
  onChange: (next: EventContent) => void;
}

export default function TravelFields({ content, onChange }: TravelFieldsProps) {
  return (
    <ListEditor<TravelInformation>
      items={content.travelInformation}
      onChange={(travelInformation) => onChange({ ...content, travelInformation })}
      createItem={() => ({ id: createId("travel"), title: "", body: "" })}
      addLabel="Add travel info"
      emptyLabel="No travel information yet."
      renderItem={(item, update) => (
        <div>
          <FormField label="Title">
            <input
              style={inputStyle}
              placeholder="Getting to the Venue"
              value={item.title}
              onChange={(e) => update({ title: e.target.value })}
            />
          </FormField>
          <FormField label="Details">
            <textarea style={textareaStyle} value={item.body} onChange={(e) => update({ body: e.target.value })} />
          </FormField>
        </div>
      )}
    />
  );
}
